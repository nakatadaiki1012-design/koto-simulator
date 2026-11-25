import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw, X } from 'lucide-react';
import { KotoTuning, LabelMode, Song } from '../types/koto';
import { REST_STRING_ID } from '../utils/songText';
import { soundEngine } from '../utils/soundEngine';
import { publicImage, songImage } from '../data/songImages';

/** リズム練習（太鼓の達人のように、弦の上を音符が流れてくる）の1回分の設定 */
export interface RhythmSession {
  song: Song;
  speed: number; // 1 = 楽譜どおりの速さ。0.5 なら半分の速さ
  guideSound: boolean; // 判定の線に来たときに、お手本の音を小さく鳴らす
}

interface RhythmOverlayProps {
  session: RhythmSession;
  boardRef: React.RefObject<HTMLDivElement | null>;
  orientation: 'horizontal' | 'vertical';
  tuning: KotoTuning;
  labelMode: LabelMode;
  lastPluck: { stringId: number; seq: number } | null;
  onExit: () => void;
}

// 音符が流れ始めてから判定の線に着くまでの時間（ミリ秒）
const TRAVEL_MS = 2400;
// 判定の線の位置（弦の左端を0、右端を1としたとき）。琴柱より右の、弾く場所に置く
const JUDGE_RATIO = 0.88;
// 判定の幅（ミリ秒）。初心者でも楽しめるように少し広め
const GREAT_MS = 90;
const GOOD_MS = 170;

type Judge = 'great' | 'good' | 'miss';
const JUDGE_TEXT: Record<Judge, string> = { great: '良', good: '可', miss: '不可' };
const JUDGE_COLOR: Record<Judge, string> = {
  great: 'text-amber-300',
  good: 'text-stone-100',
  miss: 'text-sky-300',
};

interface Lane {
  sx: number; // 音符が出てくる場所
  sy: number;
  jx: number; // 判定の線
  jy: number;
  size: number; // 音符の大きさ
}

export const RhythmOverlay: React.FC<RhythmOverlayProps> = ({
  session,
  boardRef,
  orientation,
  tuning,
  labelMode,
  lastPluck,
  onExit,
}) => {
  const { song, speed, guideSound } = session;

  // 休みを除いた音符と、それぞれを弾く時刻（スタートからのミリ秒）
  const notes = useMemo(() => {
    const beatMs = 60000 / (song.bpm * speed);
    let beat = 0;
    const list: { stringId: number; time: number }[] = [];
    for (const n of song.notes) {
      if (n.stringId !== REST_STRING_ID) {
        list.push({ stringId: n.stringId, time: TRAVEL_MS + 600 + beat * beatMs });
      }
      beat += n.duration;
    }
    return list;
  }, [song, speed]);

  const label = useCallback(
    (stringId: number) => {
      const s = tuning.strings.find((x) => x.id === stringId);
      if (!s) return '';
      return labelMode === 'kanji' ? s.kanji : labelMode === 'doremi' ? s.doremi : s.westernPitch;
    },
    [tuning, labelMode]
  );

  // ---- 弦の位置を測る（画面の大きさや向きが変わったら測り直す）----
  const [lanes, setLanes] = useState<Record<number, Lane>>({});
  const lanesRef = useRef(lanes);
  lanesRef.current = lanes;

  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const measure = () => {
      const b = board.getBoundingClientRect();
      const next: Record<number, Lane> = {};
      board.querySelectorAll<HTMLElement>('[data-string-id]').forEach((row) => {
        const id = Number(row.dataset.stringId);
        const track = (row.querySelector('[data-track]') as HTMLElement | null) ?? row;
        const r = track.getBoundingClientRect();
        if (orientation === 'horizontal') {
          const y = r.top - b.top + r.height / 2;
          next[id] = {
            sx: r.left - b.left,
            sy: y,
            jx: r.left - b.left + r.width * JUDGE_RATIO,
            jy: y,
            size: Math.max(18, Math.min(38, r.height * 0.95)),
          };
        } else {
          const x = r.left - b.left + r.width / 2;
          next[id] = {
            sx: x,
            sy: r.top - b.top,
            jx: x,
            jy: r.top - b.top + r.height * JUDGE_RATIO,
            size: Math.max(18, Math.min(38, r.width * 0.95)),
          };
        }
      });
      setLanes(next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(board);
    return () => ro.disconnect();
  }, [boardRef, orientation, tuning]);

  // ---- ゲームの進み具合 ----
  const [runId, setRunId] = useState(0); // 「もう一度」で増やす
  const startRef = useRef(0);
  const judgedRef = useRef<(Judge | null)[]>([]);
  const guidePlayedRef = useRef<boolean[]>([]);
  const chipRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [stats, setStats] = useState({ great: 0, good: 0, miss: 0, combo: 0, maxCombo: 0 });
  const [popup, setPopup] = useState<{ judge: Judge; stringId: number; key: number } | null>(null);
  const [finished, setFinished] = useState(false);
  const [showStart, setShowStart] = useState(true);
  const handledSeq = useRef<number>(lastPluck?.seq ?? 0);

  const record = useCallback((judge: Judge, stringId: number) => {
    setStats((s) => {
      const combo = judge === 'miss' ? 0 : s.combo + 1;
      return { ...s, [judge]: s[judge] + 1, combo, maxCombo: Math.max(s.maxCombo, combo) };
    });
    setPopup((p) => ({ judge, stringId, key: (p?.key ?? 0) + 1 }));
  }, []);

  // スタート（または、もう一度）
  useEffect(() => {
    startRef.current = performance.now();
    judgedRef.current = notes.map(() => null);
    guidePlayedRef.current = notes.map(() => false);
    setStats({ great: 0, good: 0, miss: 0, combo: 0, maxCombo: 0 });
    setPopup(null);
    setFinished(false);
    setShowStart(true);
    const t = setTimeout(() => setShowStart(false), 1200);
    return () => clearTimeout(t);
  }, [runId, notes]);

  // 毎フレーム、音符の位置を動かす（React の再描画を使わず直接動かして軽くする）
  useEffect(() => {
    if (finished) return;
    let raf = 0;
    const lastTime = notes.length ? notes[notes.length - 1].time : 0;
    const tick = () => {
      const now = performance.now() - startRef.current;
      const L = lanesRef.current;
      notes.forEach((n, i) => {
        const el = chipRefs.current[i];
        const lane = L[n.stringId];
        if (!el || !lane) return;
        const judged = judgedRef.current[i];
        const dt = n.time - now;

        // 判定の線を過ぎても弾かれなかったら「不可」
        if (!judged && dt < -GOOD_MS) {
          judgedRef.current[i] = 'miss';
          record('miss', n.stringId);
        }
        // お手本の音
        if (guideSound && !guidePlayedRef.current[i] && dt <= 0) {
          guidePlayedRef.current[i] = true;
          const s = tuning.strings.find((x) => x.id === n.stringId);
          if (s) soundEngine.playString(n.stringId, s.frequency, 0.4, 'normal');
        }

        const p = 1 - dt / TRAVEL_MS; // 0 = 出てきたところ、1 = 判定の線
        if (p < 0 || p > 1.25 || (judged && judged !== 'miss')) {
          el.style.opacity = '0';
          return;
        }
        const x = lane.sx + (lane.jx - lane.sx) * p;
        const y = lane.sy + (lane.jy - lane.sy) * p;
        el.style.width = el.style.height = `${lane.size}px`;
        el.style.fontSize = `${lane.size * 0.55}px`;
        el.style.transform = `translate(${x - lane.size / 2}px, ${y - lane.size / 2}px)`;
        // 出てくるときはふわっと、通り過ぎたら薄くなる
        el.style.opacity = String(p < 0.08 ? p / 0.08 : p > 1 ? Math.max(0, 1 - (p - 1) * 4) : 1);
      });
      if (now > lastTime + 1200) {
        setFinished(true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [notes, runId, finished, guideSound, tuning, record]);

  // 弦を弾いたら、その弦でいちばん近い音符で判定する
  useEffect(() => {
    if (!lastPluck || lastPluck.seq === handledSeq.current) return;
    handledSeq.current = lastPluck.seq;
    if (finished) return;
    const now = performance.now() - startRef.current;
    let best = -1;
    let bestDiff = Infinity;
    notes.forEach((n, i) => {
      if (n.stringId !== lastPluck.stringId || judgedRef.current[i]) return;
      const diff = Math.abs(n.time - now);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = i;
      }
    });
    if (best === -1 || bestDiff > GOOD_MS) return; // 早すぎ・関係ない弦は数えない
    const judge: Judge = bestDiff <= GREAT_MS ? 'great' : 'good';
    judgedRef.current[best] = judge;
    record(judge, lastPluck.stringId);
  }, [lastPluck, notes, finished, record]);

  const total = notes.length;
  const accuracy = total ? Math.round(((stats.great + stats.good * 0.5) / total) * 100) : 0;
  const fullCombo = finished && stats.miss === 0 && total > 0;
  const stars = accuracy >= 95 ? 3 : accuracy >= 75 ? 2 : accuracy >= 50 ? 1 : 0;

  const laneList = tuning.strings.map((s) => lanes[s.id]).filter(Boolean) as Lane[];
  const first = laneList[0];
  const last = laneList[laneList.length - 1];
  const popupLane = popup ? lanes[popup.stringId] : null;

  return (
    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
      {/* 判定の線と、弦ごとの的 */}
      {first && last && (
        <svg className="absolute inset-0 w-full h-full">
          <line
            x1={first.jx}
            y1={first.jy}
            x2={last.jx}
            y2={last.jy}
            stroke="rgba(252, 211, 77, 0.55)"
            strokeWidth={3}
            strokeLinecap="round"
          />
          {laneList.map((l, i) => (
            <circle
              key={i}
              cx={l.jx}
              cy={l.jy}
              r={l.size / 2}
              fill="rgba(0,0,0,0.25)"
              stroke="rgba(252, 211, 77, 0.8)"
              strokeWidth={2}
            />
          ))}
        </svg>
      )}

      {/* 流れてくる音符 */}
      {notes.map((n, i) => (
        <div
          key={`${runId}-${i}`}
          ref={(el) => {
            chipRefs.current[i] = el;
          }}
          className="absolute left-0 top-0 rounded-full flex items-center justify-center font-serif-jp font-bold text-white bg-rose-600 border-2 border-white shadow-[0_0_10px_rgba(225,29,72,0.8)] will-change-transform"
          style={{ opacity: 0 }}
        >
          {label(n.stringId)}
        </div>
      ))}

      {/* 判定の文字（良・可・不可）を、弾いた弦の的の上に出す */}
      {popup && popupLane && (
        <div
          key={popup.key}
          className={`rhythm-pop absolute font-serif-jp font-black ${JUDGE_COLOR[popup.judge]}`}
          style={{
            left: popupLane.jx,
            top: popupLane.jy,
            fontSize: Math.max(18, popupLane.size * 0.9),
            textShadow: '0 0 6px rgba(0,0,0,0.9), 0 2px 0 rgba(0,0,0,0.8)',
          }}
        >
          {JUDGE_TEXT[popup.judge]}
        </div>
      )}

      {/* コンボと成績 */}
      {/* 縦向きのときは弦の名前と重ならないよう下に出す */}
      <div className={`absolute ${orientation === 'horizontal' ? 'top-2' : 'bottom-3'} left-1/2 -translate-x-1/2 flex items-center gap-3 px-3 py-1 rounded-full bg-stone-950/80 border border-amber-500/40 text-xs font-serif-jp whitespace-nowrap`}>
        {stats.combo >= 2 && (
          <span className="text-amber-300 font-bold text-sm">{stats.combo}コンボ</span>
        )}
        <span className="text-amber-300">良 {stats.great}</span>
        <span className="text-stone-200">可 {stats.good}</span>
        <span className="text-sky-300">不可 {stats.miss}</span>
      </div>

      {showStart && (
        <div className="rhythm-pop absolute left-1/2 top-1/2 font-serif-jp font-black text-4xl sm:text-5xl text-amber-200 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
          はじめ！
        </div>
      )}

      {/* 結果 */}
      {finished &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="relative w-full max-w-sm rounded-2xl overflow-hidden border border-amber-500/50 shadow-2xl bg-stone-950 text-stone-100">
              <div className="relative">
                <img
                  src={fullCombo ? publicImage('celebrate.webp') : songImage(song)}
                  alt=""
                  className="w-full h-40 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 to-transparent" />
                <p className="absolute bottom-2 inset-x-0 text-center font-serif-jp text-3xl font-black text-amber-300 drop-shadow">
                  {fullCombo ? 'フルコンボ！' : '演奏おわり'}
                </p>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-center font-serif-jp text-sm text-stone-300">「{song.title}」</p>
                <p className="text-center text-2xl text-amber-400 tracking-widest">
                  {'★'.repeat(stars)}
                  <span className="text-stone-700">{'★'.repeat(3 - stars)}</span>
                </p>
                <div className="grid grid-cols-3 gap-2 text-center font-serif-jp">
                  <div className="rounded-lg bg-stone-900 py-1.5">
                    <p className="text-amber-300 text-xs">良</p>
                    <p className="text-lg font-bold">{stats.great}</p>
                  </div>
                  <div className="rounded-lg bg-stone-900 py-1.5">
                    <p className="text-stone-200 text-xs">可</p>
                    <p className="text-lg font-bold">{stats.good}</p>
                  </div>
                  <div className="rounded-lg bg-stone-900 py-1.5">
                    <p className="text-sky-300 text-xs">不可</p>
                    <p className="text-lg font-bold">{stats.miss}</p>
                  </div>
                </div>
                <p className="text-center text-xs text-stone-400">
                  正確さ {accuracy}%　・　最大コンボ {stats.maxCombo}
                </p>
                <div className="flex justify-center gap-2 pt-1">
                  <button
                    onClick={() => setRunId((r) => r + 1)}
                    className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold"
                  >
                    <RotateCcw className="w-4 h-4" />
                    もう一度
                  </button>
                  <button
                    onClick={onExit}
                    className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm"
                  >
                    <X className="w-4 h-4" />
                    おわる
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
