import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FilePlus2, Trash2, Copy, Check } from 'lucide-react';
import { Song } from '../types/koto';
import { ALL_TUNINGS } from '../data/tunings';
import { isValidSong } from '../data/customSongs';
import { parseSongText, songToText } from '../utils/songText';

interface SongImportModalProps {
  onClose: () => void;
  customSongs: Song[];
  onAdd: (songs: Song[]) => void;
  onDelete: (id: string) => void;
  currentSong: Song;
}

const SAMPLE = `# さくら さくら
七 七 八ー 七 七 八ー
# やよいの空は
七 八 九 八 七 八七 六ー`;

/**
 * 自分で練習曲を追加する画面。
 * 「七 七 八ー」のような文字の楽譜を書くか、共有された曲データ（JSON）を貼り付ける。
 */
export const SongImportModal: React.FC<SongImportModalProps> = ({
  onClose,
  customSongs,
  onAdd,
  onDelete,
  currentSong,
}) => {
  const [title, setTitle] = useState('');
  const [tuningId, setTuningId] = useState('hirajoshi');
  const [bpm, setBpm] = useState(64);
  const [text, setText] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const isJson = /^\s*[[{]/.test(text);

  // 書いている途中から、読めているかをその場で確認する
  const preview = useMemo(() => {
    if (!text.trim()) return null;
    if (isJson) {
      try {
        const data = JSON.parse(text);
        const list = (Array.isArray(data) ? data : [data]).filter(isValidSong);
        if (list.length === 0) return { errors: ['曲データとして読めませんでした'], count: 0, songs: [] as Song[] };
        return { errors: [], count: list.length, songs: list as Song[] };
      } catch {
        return { errors: ['JSONの形がくずれています'], count: 0, songs: [] as Song[] };
      }
    }
    const r = parseSongText(text);
    return { errors: r.errors, count: r.notes.length, songs: [] as Song[], notes: r.notes };
  }, [text, isJson]);

  const canSave =
    !!preview && preview.errors.length === 0 && preview.count > 0 && (isJson || title.trim().length > 0);

  const handleSave = () => {
    if (!preview || !canSave) return;
    const stamp = Date.now();
    if (isJson) {
      onAdd(
        preview.songs.map((s, i) => ({
          ...s,
          id: `custom-${stamp}-${i}`,
          subtitle: s.subtitle || '読み込んだ曲',
          description: s.description || '',
          bpm: s.bpm || 64,
          tuningId: s.tuningId || 'hirajoshi',
          tuningName: ALL_TUNINGS.find((t) => t.id === s.tuningId)?.name || s.tuningName || '平調子',
          difficulty: '自作',
          custom: true,
        }))
      );
    } else {
      const tuning = ALL_TUNINGS.find((t) => t.id === tuningId) ?? ALL_TUNINGS[0];
      onAdd([
        {
          id: `custom-${stamp}`,
          title: title.trim(),
          subtitle: '自分で追加した曲',
          description: '',
          bpm: Math.min(200, Math.max(30, bpm || 64)),
          tuningId: tuning.id,
          tuningName: tuning.name,
          difficulty: '自作',
          notes: preview.notes!,
          custom: true,
        },
      ]);
    }
    onClose();
  };

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  // 画面いっぱいに表示するため、ページのいちばん外側に出す
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[92vh] bg-stone-900 border border-rose-900/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-stone-200">
        <div className="flex items-center justify-between px-5 py-3 border-b border-stone-800 bg-stone-950/60">
          <div className="flex items-center gap-2">
            <FilePlus2 className="w-5 h-5 text-rose-400" />
            <h2 className="font-serif-jp text-lg font-bold text-rose-200">練習曲を追加する</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
          {/* 書き方 */}
          <div className="p-3 rounded-xl bg-stone-950/70 border border-stone-800 text-xs leading-relaxed text-stone-300">
            <p className="font-bold text-amber-200 mb-1">書き方</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>弦の名前（一 二 三 … 十 斗 為 巾）をスペースで区切って書きます。1つが1拍です。</li>
              <li>「ー」を付けると1拍ずつ伸びます（八ー ＝ 2拍）。</li>
              <li>続けて書くと1拍を分け合います（八七 ＝ 半拍ずつ）。</li>
              <li>弦名の後ろに「オ」で押し手、「○」で休みです。</li>
              <li>1行が縦譜の1列になります。「#」で始まる行はその部分の名前（歌詞など）です。</li>
            </ul>
            <button
              onClick={() => {
                setText(SAMPLE);
                if (!title) setTitle('さくらさくら（練習用）');
              }}
              className="mt-2 text-[11px] px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-amber-200"
            >
              例を入れてみる
            </button>
          </div>

          {!isJson && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className="flex flex-col gap-1 sm:col-span-1">
                <span className="text-xs text-stone-400">曲名</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例: 部活の課題曲"
                  className="bg-stone-950 border border-stone-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-rose-500"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-stone-400">調弦</span>
                <select
                  value={tuningId}
                  onChange={(e) => setTuningId(e.target.value)}
                  className="bg-stone-950 border border-stone-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-rose-500"
                >
                  {ALL_TUNINGS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-stone-400">速さ（1分あたりの拍）</span>
                <input
                  type="number"
                  min={30}
                  max={200}
                  value={bpm}
                  onChange={(e) => setBpm(parseInt(e.target.value, 10))}
                  className="bg-stone-950 border border-stone-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-rose-500"
                />
              </label>
            </div>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-xs text-stone-400">楽譜（または共有された曲データを貼り付け）</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={7}
              placeholder={SAMPLE}
              className="bg-stone-950 border border-stone-700 rounded px-2 py-1.5 font-serif-jp text-base leading-relaxed focus:outline-none focus:border-rose-500"
            />
          </label>

          {preview && (
            <div className="text-xs">
              {preview.errors.length > 0 ? (
                <ul className="text-amber-300 space-y-0.5">
                  {preview.errors.slice(0, 5).map((e, i) => (
                    <li key={i}>⚠ {e}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-emerald-300">
                  ✓ {isJson ? `${preview.count}曲を読み込めます` : `${preview.count}音を読み込めました`}
                </p>
              )}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={!canSave}
            className="w-full py-2 rounded-lg font-bold bg-rose-600 text-white hover:bg-rose-500 disabled:bg-stone-700 disabled:text-stone-400 disabled:cursor-not-allowed"
          >
            練習曲に追加する
          </button>

          {/* 今の曲を文字の楽譜でコピー（共有やお手本に） */}
          <div className="pt-2 border-t border-stone-800 flex flex-wrap gap-2 items-center">
            <span className="text-xs text-stone-400">いま選んでいる「{currentSong.title}」を</span>
            <button
              onClick={() => copy('text', songToText(currentSong))}
              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-stone-800 hover:bg-stone-700"
            >
              {copied === 'text' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              楽譜の文字でコピー
            </button>
            <button
              onClick={() => copy('json', JSON.stringify(currentSong))}
              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-stone-800 hover:bg-stone-700"
              title="友達や部員に送ると、この画面に貼り付けるだけで同じ曲を追加できます"
            >
              {copied === 'json' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              共有用データでコピー
            </button>
          </div>

          {customSongs.length > 0 && (
            <div className="pt-2 border-t border-stone-800">
              <p className="text-xs text-stone-400 mb-1.5">追加した曲（このブラウザに保存されています）</p>
              <ul className="space-y-1">
                {customSongs.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between px-2 py-1 rounded bg-stone-950/60 border border-stone-800"
                  >
                    <span className="font-serif-jp text-sm">
                      {s.title} <span className="text-[10px] text-stone-500">（{s.tuningName}・{s.notes.length}音）</span>
                    </span>
                    <button
                      onClick={() => {
                        if (window.confirm(`「${s.title}」を削除しますか？`)) onDelete(s.id);
                      }}
                      className="p-1 rounded text-stone-400 hover:text-rose-300 hover:bg-stone-800"
                      title="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
