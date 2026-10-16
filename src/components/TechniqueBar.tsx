import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PlayingTechnique } from '../types/koto';
import { Hand, Waves, VolumeX, Sparkles, ArrowUpRight, ArrowDownRight, Activity, Zap, Layers } from 'lucide-react';

interface TechniqueBarProps {
  currentTechnique: PlayingTechnique;
  onChangeTechnique: (tech: PlayingTechnique) => void;
}

/** 特殊奏法の使い方：押している間だけ（実際の演奏に近い）／押したら固定 */
export type TechniqueMode = 'hold' | 'latch';

/** 画面表示用の奏法名（箏の上に出す表示などで使う） */
export const TECHNIQUE_LABELS: Record<PlayingTechnique, string> = {
  normal: '本手',
  oshide: '押し手',
  hikiiro: '引き色',
  tsukiiro: '突き色',
  sukui: 'スクイ爪',
  tremolo: '割爪',
  awase: '合わせ爪',
  pizzicato: '消音',
  urabiki: '裏弾き',
};

/**
 * PCのキーボード：押している間だけ発動するキー（キーの位置で判定するのでJIS配列でも同じ）
 * スペース＝押し手（いちばんよく使うので親指で押せるキー）
 */
const TECHNIQUE_KEYS: { code: string; tech: PlayingTechnique; label: string }[] = [
  { code: 'Space', tech: 'oshide', label: 'Space' },
  { code: 'KeyQ', tech: 'oshide', label: 'Q' },
  { code: 'KeyW', tech: 'hikiiro', label: 'W' },
  { code: 'KeyE', tech: 'tsukiiro', label: 'E' },
  { code: 'KeyR', tech: 'sukui', label: 'R' },
  { code: 'KeyT', tech: 'tremolo', label: 'T' },
  { code: 'KeyY', tech: 'awase', label: 'Y' },
  { code: 'KeyU', tech: 'pizzicato', label: 'U' },
  { code: 'KeyI', tech: 'urabiki', label: 'I' },
];

interface TechniqueItem {
  id: PlayingTechnique;
  name: string;
  subname: string;
  description: string;
  icon: React.ReactNode;
}

export const TechniqueBar: React.FC<TechniqueBarProps> = ({
  currentTechnique,
  onChangeTechnique,
}) => {
  // 使い方モード（ブラウザに保存）
  const [mode, setMode] = useState<TechniqueMode>(() => {
    try {
      return localStorage.getItem('koto_technique_mode') === 'latch' ? 'latch' : 'hold';
    } catch {
      return 'hold';
    }
  });

  // いま押さえられているボタン・キー（複数同時もOK。最後に押したものが優先）
  const heldRef = useRef<{ src: string; tech: PlayingTechnique }[]>([]);
  const onChangeRef = useRef(onChangeTechnique);
  onChangeRef.current = onChangeTechnique;

  const applyHeld = useCallback(() => {
    const top = heldRef.current[heldRef.current.length - 1];
    onChangeRef.current(top ? top.tech : 'normal');
  }, []);

  const press = useCallback(
    (src: string, tech: PlayingTechnique) => {
      heldRef.current = heldRef.current.filter((h) => h.src !== src);
      heldRef.current.push({ src, tech });
      applyHeld();
    },
    [applyHeld]
  );

  const release = useCallback(
    (src: string) => {
      const before = heldRef.current.length;
      heldRef.current = heldRef.current.filter((h) => h.src !== src);
      if (heldRef.current.length !== before) applyHeld();
    },
    [applyHeld]
  );

  const releaseAll = useCallback(() => {
    if (heldRef.current.length > 0) {
      heldRef.current = [];
      applyHeld();
    }
  }, [applyHeld]);

  const changeMode = (next: TechniqueMode) => {
    setMode(next);
    try {
      localStorage.setItem('koto_technique_mode', next);
    } catch {}
    heldRef.current = [];
    onChangeTechnique('normal');
  };

  // PCキーボード：押している間だけ発動（固定モードでは押したキーの奏法に切り替え）
  useEffect(() => {
    const isTyping = (t: EventTarget | null) =>
      (t instanceof HTMLInputElement && t.type !== 'range') ||
      t instanceof HTMLTextAreaElement ||
      t instanceof HTMLSelectElement;

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      const hit = TECHNIQUE_KEYS.find((k) => k.code === e.code);
      if (!hit) return;
      e.preventDefault(); // スペースでボタンが押されたり画面が動いたりしないように
      if (e.repeat) return;
      if (mode === 'hold') press(`k${e.code}`, hit.tech);
      else onChangeRef.current(hit.tech);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (mode === 'hold') release(`k${e.code}`);
    };
    const onHidden = () => releaseAll();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') releaseAll();
    };

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', onHidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', onHidden);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [mode, press, release, releaseAll]);

  const keyLabelOf = (tech: PlayingTechnique) =>
    TECHNIQUE_KEYS.filter((k) => k.tech === tech && k.code !== 'Space')
      .map((k) => k.label)
      .join('');

  const techniques: TechniqueItem[] = [
    {
      id: 'normal',
      name: '本手',
      subname: '通常',
      description: '角爪による伝統的な澄んだ標準の撥弦音',
      icon: <Hand className="w-3.5 h-3.5" />,
    },
    {
      id: 'oshide',
      name: '押し手',
      subname: '+半音',
      description: '左手で柱の左側を押し込み、音程を滑らかに上げる技法（弦の左側タップでも可能）',
      icon: <ArrowUpRight className="w-3.5 h-3.5" />,
    },
    {
      id: 'hikiiro',
      name: '引き色',
      subname: '引き下げ',
      description: 'あらかじめ押した弦を弾き、左手を静かに離して音程を滑らかに落とす余韻の美',
      icon: <ArrowDownRight className="w-3.5 h-3.5" />,
    },
    {
      id: 'tsukiiro',
      name: '突き色',
      subname: '突色',
      description: '弾いた直後に左手を軽く突いて音の張りに独特のアクセントを加える技法',
      icon: <Activity className="w-3.5 h-3.5" />,
    },
    {
      id: 'sukui',
      name: 'スクイ爪',
      subname: 'すくい',
      description: '人差し指の爪の角で下から素早くすくい上げる、軽快で鋭いアタック音',
      icon: <Zap className="w-3.5 h-3.5" />,
    },
    {
      id: 'tremolo',
      name: '割爪',
      subname: 'トレモロ',
      description: '親指と人差し指による軽やかな連続連打',
      icon: <Waves className="w-3.5 h-3.5" />,
    },
    {
      id: 'awase',
      name: '合わせ爪',
      subname: '重音',
      description: '親指と中指で八度（オクターブ）や五度の二弦を同時に弾く重厚な和音',
      icon: <Layers className="w-3.5 h-3.5" />,
    },
    {
      id: 'pizzicato',
      name: '消音',
      subname: 'ピチカート',
      description: '手のひらで弦の振動を抑えながら弾く乾いた短音',
      icon: <VolumeX className="w-3.5 h-3.5" />,
    },
    {
      id: 'urabiki',
      name: '裏弾き',
      subname: '柱の左側',
      description: '琴柱の左側を弾く、現代曲で多用される幻想的な高域金属音',
      icon: <Sparkles className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="koto-techbar shrink-0 w-full bg-stone-950/85 border-b border-amber-950/40 px-2 sm:px-6 py-1.5 z-20 select-none backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
        {/* 使い方の切り替え：押している間だけ ／ 固定 */}
        <div
          className="flex items-center p-0.5 bg-stone-900 border border-stone-800 rounded-lg shrink-0 mr-1"
          role="group"
          aria-label="特殊奏法の使い方"
        >
          <button
            onClick={() => changeMode('hold')}
            aria-pressed={mode === 'hold'}
            className={`px-2 py-1 rounded text-[11px] font-serif-jp whitespace-nowrap transition-colors ${
              mode === 'hold' ? 'bg-amber-600 text-stone-950 font-bold' : 'text-stone-400 hover:text-stone-200'
            }`}
            title="ボタン（またはキー）を押している間だけ特殊奏法になります。左手で押さえながら右手で弦を弾きます。"
          >
            押す間
          </button>
          <button
            onClick={() => changeMode('latch')}
            aria-pressed={mode === 'latch'}
            className={`px-2 py-1 rounded text-[11px] font-serif-jp whitespace-nowrap transition-colors ${
              mode === 'latch' ? 'bg-amber-600 text-stone-950 font-bold' : 'text-stone-400 hover:text-stone-200'
            }`}
            title="押したボタンの奏法に切り替わったままになります（片手で操作するとき向け）"
          >
            固定
          </button>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap">
          {techniques.map((tech) => {
            const isActive = currentTechnique === tech.id;
            const keyLabel = keyLabelOf(tech.id);
            return (
              <button
                key={tech.id}
                data-technique={tech.id}
                onPointerDown={(e) => {
                  if (mode !== 'hold') return;
                  if (e.pointerType === 'mouse' && e.button !== 0) return;
                  e.preventDefault();
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  } catch {}
                  press(`p${e.pointerId}`, tech.id);
                }}
                onPointerUp={(e) => release(`p${e.pointerId}`)}
                onPointerCancel={(e) => release(`p${e.pointerId}`)}
                onLostPointerCapture={(e) => release(`p${e.pointerId}`)}
                onClick={() => {
                  if (mode === 'latch') onChangeTechnique(tech.id);
                }}
                onContextMenu={(e) => e.preventDefault()}
                style={{ touchAction: mode === 'hold' ? 'pan-x' : undefined }}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-xs transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-600 text-stone-950 font-bold shadow-md shadow-amber-950 scale-[1.02]'
                    : 'bg-stone-900/90 text-stone-400 hover:text-stone-200 border border-stone-800/80'
                }`}
                title={tech.description}
              >
                {tech.icon}
                <span className="font-serif-jp">{tech.name}</span>
                <span
                  className={`text-[10px] hidden lg:inline ${
                    isActive ? 'text-stone-900 font-normal' : 'text-stone-500'
                  }`}
                >
                  ({tech.subname})
                </span>
                {keyLabel && (
                  <kbd
                    className={`hidden lg:inline ml-0.5 px-1 rounded text-[9px] font-mono border ${
                      isActive ? 'border-stone-900/40 text-stone-900' : 'border-stone-700 text-stone-500'
                    }`}
                  >
                    {keyLabel}
                  </kbd>
                )}
              </button>
            );
          })}
        </div>

        <div className="text-[11px] text-stone-500 hidden xl:block font-serif-jp truncate ml-2">
          {mode === 'hold'
            ? '※ 左手でボタンを押したまま右手で弾く（PC：スペース＝押し手）'
            : '※ 琴柱の左側を直接タップで「裏弾き」'}
        </div>
      </div>
    </div>
  );
};
