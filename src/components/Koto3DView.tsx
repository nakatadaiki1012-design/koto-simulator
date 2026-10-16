/**
 * 箏の3D表示（おまけ機能）
 * - 箏の形（胴・竜角・雲角・13本の弦・琴柱）を three.js で立体的に描く
 * - ドラッグで回転、ピンチ／ホイールで拡大縮小
 * - 弦をタップすると音が鳴る（指を滑らせるとグリッサンド）
 * - 調弦・一弦8va・特殊奏法・練習ガイドは2Dの画面と同じように連動する
 *
 * 寸法の単位は cm。座標：x＝箏の幅方向（一が奥＝マイナス、巾が手前＝プラス）、
 * y＝上、z＝長さ方向（竜角＝マイナス側、雲角＝プラス側）
 */
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { KotoTuning, PlayingTechnique, LabelMode } from '../types/koto';
import { soundEngine } from '../utils/soundEngine';
import { TECHNIQUE_LABELS } from './TechniqueBar';

interface Koto3DViewProps {
  activeTuning: KotoTuning;
  currentTechnique: PlayingTechnique;
  labelMode: LabelMode;
  currentGuideStringId: number | null;
  onStringPlucked?: (stringId: number) => void;
}

// ---------- 箏の寸法（cm）
const L = 182; // 全長
const W = 25; // 幅
const HW = W / 2;
const Z_HEAD = -L / 2; // 竜角側の端（奏者の右手側）
const Z_RYUKAKU = Z_HEAD + 6; // 竜角
const Z_KUMOKAKU = L / 2 - 17; // 雲角
const Z_TAIL = L / 2 - 3; // 弦を留める位置
const RYUKAKU_H = 1.5;
const KUMOKAKU_H = 1.2;
const JI_H = 5.4; // 琴柱の高さ
const LABEL_SIZE = 3.6; // 名札の大きさ

const surfaceY = (x: number) => 3 + 3.3 * (1 - (x / HW) * (x / HW)); // 甲（上面）のふくらみ
const stringX = (index: number) => -10.2 + index * (20.4 / 12); // 一（奥）→ 巾（手前）
// 琴柱の位置：bridgePositionPercent は 竜角=100%、雲角=0%
const jiZOf = (percent: number) => Z_KUMOKAKU + (Z_RYUKAKU - Z_KUMOKAKU) * (percent / 100);

type ViewPreset = 'diagonal' | 'player' | 'side' | 'top';
/**
 * 視点：dir＝カメラの向き（注視点からカメラへの方向）、span＝画面の横幅に収める長さ(cm)
 * 距離は画面の縦横比に合わせて自動で計算する（スマホでもPCでも箏が画面いっぱいに映る）
 */
const VIEW_PRESETS: Record<ViewPreset, { label: string; dir: [number, number, number]; target: [number, number, number]; span: number }> = {
  diagonal: { label: '斜め', dir: [0.62, 0.55, 0.56], target: [0, 4, -2], span: 205 },
  player: { label: '奏者', dir: [0.78, 0.66, -0.42], target: [0, 5, -64], span: 150 },
  side: { label: '横', dir: [1, 0.28, 0.02], target: [0, 5, 0], span: 196 },
  top: { label: '真上', dir: [0.001, 1, 0], target: [0, 0, 0], span: 200 },
};

function presetPose(v: ViewPreset, camera: THREE.PerspectiveCamera) {
  const pr = VIEW_PRESETS[v];
  const vfov = (camera.fov * Math.PI) / 180;
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
  // 真上と横は箏の長さが画面の横方向、縦長画面では縦方向にも収まるようにする
  const fitH = pr.span / 2 / Math.tan(hfov / 2);
  const fitV = (v === 'top' || v === 'side' ? 40 : pr.span * 0.55) / 2 / Math.tan(vfov / 2);
  const dist = Math.min(520, Math.max(55, Math.max(fitH, fitV)));
  const dir = new THREE.Vector3(...pr.dir).normalize();
  const target = new THREE.Vector3(...pr.target);
  return { pos: target.clone().addScaledVector(dir, dist), target };
}

// ---------- 質感（画像ファイルを使わず、その場で描く）
function makeWoodTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, '#a4612a');
  grad.addColorStop(0.5, '#c27a38');
  grad.addColorStop(1, '#9a5824');
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
  // 桐の木目：長さ方向にゆるく波打つ筋
  for (let i = 0; i < 140; i++) {
    const y0 = Math.random() * c.height;
    const amp = 2 + Math.random() * 6;
    const freq = 0.002 + Math.random() * 0.004;
    const phase = Math.random() * Math.PI * 2;
    g.strokeStyle = `rgba(${Math.random() < 0.5 ? '70,30,6' : '255,215,160'},${0.05 + Math.random() * 0.12})`;
    g.lineWidth = 0.6 + Math.random() * 1.6;
    g.beginPath();
    for (let x = 0; x <= c.width; x += 16) {
      const y = y0 + Math.sin(x * freq + phase) * amp;
      if (x === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeTatamiTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#7d7a4c';
  g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 4) {
    g.fillStyle = `rgba(${x % 8 === 0 ? '40,38,20' : '200,196,140'},${0.18 + Math.random() * 0.1})`;
    g.fillRect(x, 0, 2, 256);
  }
  for (let y = 0; y < 256; y += 32) {
    g.fillStyle = 'rgba(30,28,14,0.18)';
    g.fillRect(0, y, 256, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(30, 30);
  return tex;
}

function makeLabelTexture(text: string, sub: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.beginPath();
  g.arc(64, 64, 58, 0, Math.PI * 2);
  g.fillStyle = 'rgba(24,16,10,0.9)';
  g.fill();
  g.lineWidth = 5;
  g.strokeStyle = 'rgba(232,188,104,0.95)';
  g.stroke();
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `bold ${text.length > 2 ? 34 : 56}px "Shippori Mincho","Noto Serif JP","Noto Serif CJK JP",serif`;
  g.fillText(text, 64, sub ? 56 : 66);
  if (sub) {
    g.font = '22px "Plus Jakarta Sans",sans-serif';
    g.fillStyle = 'rgba(240,210,150,0.95)';
    g.fillText(sub, 64, 98);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------- 形
/** 甲（上面）：幅方向にふくらんだ曲面 */
function makeTopGeometry(): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(L, W, 120, 24);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const along = pos.getX(i); // -L/2..L/2
    const across = pos.getY(i); // -W/2..W/2
    pos.setXYZ(i, across, surfaceY(across), along);
  }
  geo.index && geo.index.array.reverse(); // 面の向きを上に
  geo.computeVertexNormals();
  return geo;
}

/** 断面（幅方向）の形：両端のふた用 */
function makeEndShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-HW, 0);
  s.lineTo(HW, 0);
  for (let i = 0; i <= 24; i++) {
    const x = HW - (i / 24) * W;
    s.lineTo(x, surfaceY(x));
  }
  s.lineTo(-HW, 0);
  return s;
}

/** 竜角・雲角：甲のふくらみに沿った白い横木 */
function makeHornGeometry(height: number, depth: number, widthRatio: number): THREE.BufferGeometry {
  const s = new THREE.Shape();
  const hw = HW * widthRatio;
  const steps = 20;
  s.moveTo(-hw, surfaceY(-hw) - 0.3);
  for (let i = 0; i <= steps; i++) {
    const x = -hw + (i / steps) * hw * 2;
    s.lineTo(x, surfaceY(x) + height);
  }
  for (let i = steps; i >= 0; i--) {
    const x = -hw + (i / steps) * hw * 2;
    s.lineTo(x, surfaceY(x) - 0.3);
  }
  const geo = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.15,
    bevelSize: 0.15,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

/** 琴柱：脚が二股に分かれた山形 */
function makeJiGeometry(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-2.2, 0);
  s.lineTo(-1.0, 0);
  s.quadraticCurveTo(0, 1.9, 1.0, 0);
  s.lineTo(2.2, 0);
  s.lineTo(0.5, JI_H - 0.25);
  s.lineTo(0.15, JI_H);
  s.lineTo(-0.15, JI_H);
  s.lineTo(-0.5, JI_H - 0.25);
  s.lineTo(-2.2, 0);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.8,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.1,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.4);
  return geo;
}

const UP = new THREE.Vector3(0, 1, 0);
/** 単位円柱を2点の間に置く（長さ・向き・太さ） */
function placeSegment(mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3, thickness = 1) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.scale.set(thickness, len, thickness);
  mesh.quaternion.setFromUnitVectors(UP, dir.normalize());
}

interface StringParts {
  id: number;
  x: number;
  material: THREE.MeshStandardMaterial;
  segs: THREE.Mesh[]; // 0:端→竜角, 1:竜角→琴柱（よく鳴る側）, 2:琴柱→雲角, 3:雲角→留め
  hits: THREE.Mesh[]; // 当たり判定（見えない太い円柱）0:竜角側, 1:雲角側
  ji: THREE.Mesh;
  jiZ: number;
  jiTargetZ: number;
  label: THREE.Sprite;
  pluckedAt: number;
  pluckedLeft: boolean;
}

export const Koto3DView: React.FC<Koto3DViewProps> = ({
  activeTuning,
  currentTechnique,
  labelMode,
  currentGuideStringId,
  onStringPlucked,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const stringsRef = useRef<StringParts[]>([]);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const tweenRef = useRef<{ from: THREE.Vector3; to: THREE.Vector3; tFrom: THREE.Vector3; tTo: THREE.Vector3; start: number } | null>(null);
  const [view, setView] = useState<ViewPreset>('diagonal');
  const viewRef = useRef<ViewPreset>('diagonal');
  const userMovedRef = useRef<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [webglError, setWebglError] = useState<boolean>(false);

  // 最新の値をアニメーションやイベントから参照するための入れ物
  const latest = useRef({ activeTuning, currentTechnique, currentGuideStringId, onStringPlucked });
  latest.current = { activeTuning, currentTechnique, currentGuideStringId, onStringPlucked };

  /** 弦を鳴らす（音＋光） */
  const pluck = (stringId: number, isLeft: boolean, velocity: number) => {
    const { activeTuning: tuning, currentTechnique: tech, onStringPlucked: cb } = latest.current;
    const data = tuning.strings.find((s) => s.id === stringId);
    if (!data) return;
    const effective: PlayingTechnique = isLeft && tech === 'normal' ? 'urabiki' : tech;
    soundEngine.playString(stringId, data.frequency, velocity, effective);
    flash(stringId, isLeft);
    if (cb) cb(stringId);
    window.dispatchEvent(new CustomEvent('koto:played', { detail: { stringId, technique: effective, view: '3d' } }));
  };

  /** 弦を光らせ、震わせるだけ（音は鳴らさない） */
  const flash = (stringId: number, isLeft = false) => {
    const s = stringsRef.current.find((p) => p.id === stringId);
    if (s) {
      s.pluckedAt = performance.now();
      s.pluckedLeft = isLeft;
    }
  };

  // ---------- シーンを作る（最初の1回）
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch {
      setWebglError(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0806);
    scene.fog = new THREE.Fog(0x0b0806, 280, 700);

    const camera = new THREE.PerspectiveCamera(38, 1, 1, 2000);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 45;
    controls.maxDistance = 420;
    controls.maxPolarAngle = Math.PI * 0.49; // 床の下には回り込まない
    controls.enablePan = true;
    controls.autoRotateSpeed = 1.4;
    controlsRef.current = controls;
    // 自分で回したかどうか（回していなければ、画面の大きさが変わったとき自動で合わせ直す）
    controls.addEventListener('start', () => {
      userMovedRef.current = true;
    });

    // 光：部屋の柔らかい光＋斜め上からの暖かい光（影付き）
    scene.add(new THREE.HemisphereLight(0xfff1d6, 0x2a1a0e, 0.75));
    const sun = new THREE.DirectionalLight(0xffe2b8, 2.1);
    sun.position.set(70, 140, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536);
    sun.shadow.camera.left = -120;
    sun.shadow.camera.right = 120;
    sun.shadow.camera.top = 120;
    sun.shadow.camera.bottom = -120;
    sun.shadow.camera.near = 20;
    sun.shadow.camera.far = 400;
    sun.shadow.bias = -0.0005;
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0xffc27a, 0.6);
    rim.position.set(-90, 60, -120);
    scene.add(rim);

    // 床（畳）
    const tatami = makeTatamiTexture();
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(1400, 1400),
      new THREE.MeshStandardMaterial({ map: tatami, color: 0x8a8660, roughness: 1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 胴
    const wood = makeWoodTexture();
    const topMat = new THREE.MeshPhysicalMaterial({
      map: wood,
      roughness: 0.55,
      clearcoat: 0.35,
      clearcoatRoughness: 0.45,
      side: THREE.DoubleSide,
    });
    const top = new THREE.Mesh(makeTopGeometry(), topMat);
    top.castShadow = true;
    top.receiveShadow = true;
    scene.add(top);

    const sideMat = new THREE.MeshStandardMaterial({ color: 0x4a2208, roughness: 0.6, side: THREE.DoubleSide });
    for (const sx of [-HW, HW]) {
      const side = new THREE.Mesh(new THREE.PlaneGeometry(L, 3), sideMat);
      side.rotation.y = Math.PI / 2;
      side.position.set(sx, 1.5, 0);
      side.castShadow = true;
      scene.add(side);
    }
    const lacquer = new THREE.MeshPhysicalMaterial({ color: 0x1a0c05, roughness: 0.3, clearcoat: 0.8, side: THREE.DoubleSide });
    const endShape = makeEndShape();
    for (const ez of [Z_HEAD, L / 2]) {
      const cap = new THREE.Mesh(new THREE.ShapeGeometry(endShape), lacquer);
      cap.position.z = ez;
      scene.add(cap);
    }
    // 竜角の側の端に金の細い線（縁飾り）
    const gold = new THREE.MeshStandardMaterial({ color: 0xd9a548, metalness: 0.8, roughness: 0.35 });
    const goldLine = new THREE.Mesh(new THREE.BoxGeometry(W + 0.3, 0.35, 0.35), gold);
    goldLine.position.set(0, 3.05, Z_HEAD + 0.2);
    scene.add(goldLine);

    // 竜角・雲角
    const ivory = new THREE.MeshPhysicalMaterial({ color: 0xf2e5c4, roughness: 0.35, clearcoat: 0.6 });
    const ryukaku = new THREE.Mesh(makeHornGeometry(RYUKAKU_H, 1.8, 0.9), ivory);
    ryukaku.position.z = Z_RYUKAKU;
    ryukaku.castShadow = true;
    scene.add(ryukaku);
    const kumokaku = new THREE.Mesh(makeHornGeometry(KUMOKAKU_H, 1.6, 0.9), ivory);
    kumokaku.position.z = Z_KUMOKAKU;
    kumokaku.castShadow = true;
    scene.add(kumokaku);

    // 弦と琴柱
    const jiGeo = makeJiGeometry();
    const jiMat = new THREE.MeshPhysicalMaterial({ color: 0xf6ebd2, roughness: 0.3, clearcoat: 0.7 });
    const hitMat = new THREE.MeshBasicMaterial();
    const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
    const parts: StringParts[] = [];
    latest.current.activeTuning.strings.forEach((sd, i) => {
      const x = stringX(i);
      const radius = 0.19 - i * 0.005;
      const material = new THREE.MeshStandardMaterial({
        color: 0xf5e9cc,
        roughness: 0.45,
        emissive: 0x000000,
      });
      const segs = [0, 1, 2, 3].map(() => {
        const m = new THREE.Mesh(unitCyl, material);
        m.userData.radius = radius;
        scene.add(m);
        return m;
      });
      const hits = [0, 1].map((k) => {
        const m = new THREE.Mesh(unitCyl, hitMat);
        m.visible = false;
        m.userData = { stringId: sd.id, isLeft: k === 1 };
        scene.add(m);
        return m;
      });
      const ji = new THREE.Mesh(jiGeo, jiMat);
      ji.castShadow = true;
      const z = jiZOf(sd.bridgePositionPercent);
      ji.position.set(x, surfaceY(x) - 0.15, z);
      scene.add(ji);

      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeLabelTexture(sd.kanji, ''), depthWrite: false }));
      label.scale.set(LABEL_SIZE, LABEL_SIZE, 1);
      // 弦の間隔より札が大きいので、扇形に広げて並べる
      label.position.set(x * 2.25, surfaceY(x) + 2.4, Z_HEAD - 8 - (1 - Math.abs(x) / 10.2) * 3);
      scene.add(label);

      parts.push({ id: sd.id, x, material, segs, hits, ji, jiZ: z, jiTargetZ: z, label, pluckedAt: -1e9, pluckedLeft: false });
    });
    stringsRef.current = parts;

    // 大きさを合わせる
    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = `${w}px`;
      renderer.domElement.style.height = `${h}px`;
      camera.aspect = w / h;
      // 縦長の画面では少し引いて全体が入るように
      camera.fov = w / h < 1 ? 55 : 38;
      camera.updateProjectionMatrix();
      if (!userMovedRef.current) {
        const pose = presetPose(viewRef.current, camera);
        camera.position.copy(pose.pos);
        controls.target.copy(pose.target);
        controls.update();
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    // ---------- 弦をタップして弾く（それ以外のドラッグは回転）
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const hitTargets = parts.flatMap((p) => p.hits);
    const activePointers = new Map<number, number>();

    const pick = (e: PointerEvent): { id: number; isLeft: boolean } | null => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(hitTargets, false)[0];
      return hit ? { id: hit.object.userData.stringId, isLeft: hit.object.userData.isLeft } : null;
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const res = pick(e);
      if (!res) return; // 弦以外 → 回転・拡大の操作に任せる
      e.stopPropagation();
      e.preventDefault();
      activePointers.set(e.pointerId, res.id);
      pluck(res.id, res.isLeft, 0.88);
    };
    const onMove = (e: PointerEvent) => {
      if (!activePointers.has(e.pointerId)) return;
      e.stopPropagation();
      const res = pick(e);
      if (res && res.id !== activePointers.get(e.pointerId)) {
        activePointers.set(e.pointerId, res.id);
        pluck(res.id, res.isLeft, 0.82);
      }
    };
    const onUp = (e: PointerEvent) => {
      if (activePointers.delete(e.pointerId)) e.stopPropagation();
    };
    // 回転の操作より先に受け取るため「キャプチャ」で登録する
    mount.addEventListener('pointerdown', onDown, true);
    mount.addEventListener('pointermove', onMove, true);
    mount.addEventListener('pointerup', onUp, true);
    mount.addEventListener('pointercancel', onUp, true);

    // カーソルが弦の上にあるときは指の形に
    const onHover = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.buttons) return;
      renderer.domElement.style.cursor = pick(e) ? 'pointer' : 'grab';
    };
    renderer.domElement.addEventListener('pointermove', onHover);

    // ---------- 毎フレームの描画
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const d = new THREE.Vector3();
    const e0 = new THREE.Vector3();
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = performance.now();

      // 視点の切り替えをなめらかに
      const tw = tweenRef.current;
      if (tw) {
        const t = Math.min(1, (now - tw.start) / 800);
        const k = 1 - Math.pow(1 - t, 3);
        camera.position.lerpVectors(tw.from, tw.to, k);
        controls.target.lerpVectors(tw.tFrom, tw.tTo, k);
        if (t >= 1) tweenRef.current = null;
      }
      controls.update();

      const guideId = latest.current.currentGuideStringId;
      for (const p of stringsRef.current) {
        // 琴柱を目標の位置へすべらせる（調弦を変えたとき）
        p.jiZ += (p.jiTargetZ - p.jiZ) * 0.12;
        p.ji.position.z = p.jiZ;

        const sy = surfaceY(p.x);
        e0.set(p.x, sy * 0.85, Z_HEAD + 0.4);
        a.set(p.x, sy + RYUKAKU_H, Z_RYUKAKU);
        b.set(p.x, sy + JI_H + 0.05, p.jiZ);
        c.set(p.x, sy + KUMOKAKU_H, Z_KUMOKAKU);
        d.set(p.x, sy + 0.3, Z_TAIL);

        // 弾いた直後は太く揺れて見え、金色に光る
        const age = (now - p.pluckedAt) / 1000;
        const env = age < 1.8 ? Math.exp(-age * 2.6) : 0;
        const wobble = 1 + 2.4 * env * Math.abs(Math.sin(now * 0.06));
        const r = p.segs[0].userData.radius as number;
        placeSegment(p.segs[0], e0, a, r);
        placeSegment(p.segs[1], a, b, r * (p.pluckedLeft ? 1 : wobble));
        placeSegment(p.segs[2], b, c, r * (p.pluckedLeft ? wobble : 1));
        placeSegment(p.segs[3], c, d, r);
        placeSegment(p.hits[0], a, b, 0.85);
        placeSegment(p.hits[1], b, c, 0.85);

        let glow = env;
        if (p.id === guideId && env < 0.3) glow = 0.25 + 0.2 * (0.5 + 0.5 * Math.sin(now * 0.008));
        p.material.emissive.setRGB(glow * 1.0, glow * 0.62, glow * 0.18);
        const lm = p.label.material as THREE.SpriteMaterial;
        const hot = env > 0.15 || p.id === guideId;
        lm.color.setRGB(1, hot ? 0.82 : 1, hot ? 0.45 : 1);
        const ls = hot ? LABEL_SIZE * 1.18 : LABEL_SIZE;
        p.label.scale.set(ls, ls, 1);
      }

      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mount.removeEventListener('pointerdown', onDown, true);
      mount.removeEventListener('pointermove', onMove, true);
      mount.removeEventListener('pointerup', onUp, true);
      mount.removeEventListener('pointercancel', onUp, true);
      renderer.domElement.removeEventListener('pointermove', onHover);
      controls.dispose();
      scene.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = (m as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else if (mat) {
          const anyMat = mat as THREE.Material & { map?: THREE.Texture };
          if (anyMat.map) anyMat.map.dispose();
          mat.dispose();
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      stringsRef.current = [];
      controlsRef.current = null;
      cameraRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- 調弦が変わったら琴柱を動かす
  useEffect(() => {
    for (const p of stringsRef.current) {
      const sd = activeTuning.strings.find((s) => s.id === p.id);
      if (sd) p.jiTargetZ = jiZOf(sd.bridgePositionPercent);
    }
  }, [activeTuning]);

  // ---------- 名札の文字（漢数字／ドレミ／音名）
  useEffect(() => {
    for (const p of stringsRef.current) {
      const sd = activeTuning.strings.find((s) => s.id === p.id);
      if (!sd) continue;
      const up = sd.octaveUp ? '↑' : '';
      const main = labelMode === 'kanji' ? sd.kanji : labelMode === 'doremi' ? sd.doremi : sd.westernNote;
      const sub = labelMode === 'kanji' ? '' : sd.kanji;
      const mat = p.label.material as THREE.SpriteMaterial;
      if (mat.map) mat.map.dispose();
      mat.map = makeLabelTexture(main + (labelMode === 'kanji' ? up : ''), sub + (labelMode === 'kanji' ? '' : up));
      mat.needsUpdate = true;
    }
  }, [activeTuning, labelMode]);

  // ---------- 自動回転
  useEffect(() => {
    if (controlsRef.current) controlsRef.current.autoRotate = autoRotate;
  }, [autoRotate]);

  // ---------- キーボードで弾く（2Dの画面と同じキー）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toUpperCase();
      const target = activeTuning.strings.find(
        (s) => s.keyBindDesktop.toUpperCase() === key || s.keyBindSub.toUpperCase() === key
      );
      if (target) {
        e.preventDefault();
        pluck(target.id, false, 0.88);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTuning.strings]);

  // ---------- 引連・お手本再生などの合図で光らせる（音は送り手が鳴らす）
  useEffect(() => {
    const onVisual = (e: Event) => {
      const id = (e as CustomEvent<{ stringId: number }>).detail?.stringId;
      if (id) flash(id);
    };
    window.addEventListener('koto:pluck', onVisual);
    return () => window.removeEventListener('koto:pluck', onVisual);
  }, []);

  const goToView = (v: ViewPreset) => {
    const cam = cameraRef.current;
    const ctl = controlsRef.current;
    if (!cam || !ctl) return;
    setView(v);
    viewRef.current = v;
    userMovedRef.current = false;
    setAutoRotate(false);
    const pose = presetPose(v, cam);
    tweenRef.current = {
      from: cam.position.clone(),
      to: pose.pos,
      tFrom: ctl.target.clone(),
      tTo: pose.target,
      start: performance.now(),
    };
  };

  if (webglError) {
    return (
      <div className="w-full h-full flex items-center justify-center text-sm text-stone-300 font-serif-jp p-6 text-center">
        この端末では3D表示が使えません。「立体」ボタンをもう一度押すと、元の表示に戻ります。
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-amber-900/50 shadow-2xl select-none">
      <div ref={mountRef} className="absolute inset-0 touch-none" />

      {/* いま発動している特殊奏法 */}
      {currentTechnique !== 'normal' && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none px-3 py-0.5 rounded-full bg-stone-950/85 border border-amber-400/60 text-amber-200 text-xs font-serif-jp font-bold shadow-lg">
          {TECHNIQUE_LABELS[currentTechnique]}
        </div>
      )}

      {/* 視点の切り替え・自動回転 */}
      <div className="absolute left-2 bottom-2 sm:left-3 sm:bottom-3 z-10 flex flex-wrap items-center gap-1.5">
        <div className="flex items-center p-0.5 rounded-lg bg-stone-950/85 border border-amber-900/60">
          {(Object.keys(VIEW_PRESETS) as ViewPreset[]).map((v) => (
            <button
              key={v}
              onClick={() => goToView(v)}
              aria-pressed={view === v}
              className={`px-2 py-1 rounded text-[11px] font-serif-jp whitespace-nowrap transition-colors ${
                view === v ? 'bg-amber-600 text-stone-950 font-bold' : 'text-stone-300 hover:text-white'
              }`}
            >
              {VIEW_PRESETS[v].label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          aria-pressed={autoRotate}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-serif-jp border whitespace-nowrap transition-colors ${
            autoRotate
              ? 'bg-amber-600 text-stone-950 border-amber-400 font-bold'
              : 'bg-stone-950/85 text-stone-300 border-amber-900/60 hover:text-white'
          }`}
        >
          自動回転
        </button>
      </div>

      <div className="absolute right-2 top-2 sm:right-3 sm:top-3 z-10 pointer-events-none text-[10px] sm:text-[11px] text-stone-400 font-serif-jp bg-stone-950/70 rounded-md px-2 py-1 text-right leading-relaxed">
        弦をタップで演奏
        <br className="sm:hidden" />
        <span className="hidden sm:inline">　／　</span>ドラッグで回転・ピンチで拡大
      </div>
    </div>
  );
};

export default Koto3DView;
