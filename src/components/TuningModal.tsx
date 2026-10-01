import React from 'react';
import { X, Sparkles, BookOpen, Globe, SlidersHorizontal, Hand } from 'lucide-react';
import { ALL_TUNINGS } from '../data/tunings';

interface TuningModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TuningModal: React.FC<TuningModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-stone-900 border border-amber-900/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/60">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h2 className="font-serif-jp text-lg font-bold text-amber-200">
              箏（十三弦）の調弦・琴柱・特殊奏法の解説
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm leading-relaxed">
          {/* Section 1: 調弦一覧 */}
          <div>
            <h3 className="font-serif-jp text-base font-semibold text-amber-300 mb-2 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-amber-400" />
              収録している伝統調弦（6種類）
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ALL_TUNINGS.map((t) => (
                <div key={t.id} className="p-3 bg-stone-950/70 border border-stone-800 rounded-xl text-xs">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="font-serif-jp font-bold text-amber-200 text-sm">{t.name}</span>
                    <span className="text-[10px] text-amber-500/80 font-mono">({t.reading})</span>
                  </div>
                  <span className="inline-block px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 text-[10px] font-semibold mb-1.5">
                    {t.mood}
                  </span>
                  <p className="text-stone-400 text-[11px] leading-snug">{t.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: 琴柱（じ）の物理と位置 */}
          <div>
            <h3 className="font-serif-jp text-base font-semibold text-amber-300 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              琴柱（ことじ）の物理的配置
            </h3>
            <p className="text-stone-300 text-xs leading-relaxed mb-2">
              箏の音高は、糸の張力と<strong>琴柱（じ）と竜角（右端の固定橋）の間の振動弦長</strong>によって物理的に決定されます。
            </p>
            <ul className="space-y-1 text-stone-300 text-xs list-disc list-inside">
              <li>
                <strong className="text-amber-200">低音（一〜三）:</strong> 振動長を長く取るため、琴柱は左側（雲角側）に寄っています。
              </li>
              <li>
                <strong className="text-amber-200">高音（十〜巾）:</strong> 振動長を短くするため、琴柱は右側（竜角側）へ進み、全体として美しいS字曲線を形成します。
              </li>
              <li>
                <strong className="text-amber-200">調弦切り替え時の移動:</strong> 調弦を変更すると（例: 平調子 → 雲井調子）、実機の調弦作業と同様に、該当する弦の琴柱が滑らかに実機位置へスライドします。
              </li>
            </ul>
          </div>

          {/* Section 3: 特殊奏法の解説 */}
          <div>
            <h3 className="font-serif-jp text-base font-semibold text-amber-300 mb-2 flex items-center gap-2">
              <Hand className="w-4 h-4 text-amber-400" />
              特殊奏法の演奏方法
            </h3>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-stone-950/60 rounded-lg border border-stone-800">
                <span className="font-bold text-amber-200 block font-serif-jp">① 押し手（押手 / Oshi-de）</span>
                <span className="text-stone-300">
                  左手で琴柱の左側を強く押し込んで弦の張力を高め、音程を半音滑らかにベンドアップする伝統技法です。「押し手」ボタンを選択して弾くか、弦の左側をタップすることで発動します。
                </span>
              </div>
              <div className="p-2.5 bg-stone-950/60 rounded-lg border border-stone-800">
                <span className="font-bold text-amber-200 block font-serif-jp">② 割爪・トレモロ（Tremolo）</span>
                <span className="text-stone-300">
                  親指と人差し指を素早く往復させて弦を連打し、水面が揺らめくような持続音を作り出します。
                </span>
              </div>
              <div className="p-2.5 bg-stone-950/60 rounded-lg border border-stone-800">
                <span className="font-bold text-amber-200 block font-serif-jp">③ 消音・ピチカート（Pizzicato）</span>
                <span className="text-stone-300">
                  手のひらを弦に軽く当てながら爪で弾くことで、余韻を止めた「ポク、ポク」という乾いた木の音色を出します。
                </span>
              </div>
              <div className="p-2.5 bg-stone-950/60 rounded-lg border border-stone-800">
                <span className="font-bold text-amber-200 block font-serif-jp">④ 裏弾き（柱の左側を弾く）</span>
                <span className="text-stone-300">
                  通常弾くことのない琴柱の左側をあえて爪で弾くことで、現代曲で多用される幻想的で硬質な高音倍音を鳴らします。
                </span>
              </div>
              <div className="p-2.5 bg-stone-950/60 rounded-lg border border-stone-800">
                <span className="font-bold text-amber-200 block font-serif-jp">⑤ 引連（ひきれん・上り）＆ 流し爪（下り）</span>
                <span className="text-stone-300">
                  親指で一気に十三弦を駆け上がる「引連」と、人差し指で高音から滑り降りる「流し爪」の両方に対応しています。
                </span>
              </div>
              <div className="p-2.5 bg-stone-950/60 rounded-lg border border-stone-800">
                <span className="font-bold text-amber-200 block font-serif-jp">⑥ 空間残響効果（ConvolverNode リバーブ）</span>
                <span className="text-stone-300">
                  ヘッダーの残響メニューから「スタジオ（タイトな直接音）」「能舞台（檜と畳の温かい響き）」「大本堂（寺院の壮大なロングリバーブ）」「残響なし（完全ドライ音）」を瞬時に切り替えられます。
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: GitHub Pagesへの公開手順 */}
          <div className="bg-stone-950 p-4 rounded-xl border border-stone-800">
            <h3 className="font-serif-jp text-sm font-semibold text-sky-300 mb-2 flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-400" />
              GitHub Pages で公開する方法
            </h3>
            <p className="text-xs text-stone-400 mb-3">
              このプロジェクトは外部サーバーやAPIキーを一切必要とせず、完全な静的Webアプリケーションとして動作するため、GitHub Pagesに無料で簡単にホスティングできます。
            </p>
            <ol className="space-y-1.5 text-xs text-stone-300 list-decimal list-inside font-mono bg-stone-900/80 p-3 rounded border border-stone-800">
              <li>
                <span className="text-stone-400 font-sans">ビルドを実行:</span> <code className="text-amber-300">npm run build</code>
              </li>
              <li>
                <span className="text-stone-400 font-sans">生成された <code className="text-emerald-300">dist/</code> フォルダをリポジトリの gh-pages ブランチにプッシュ、または GitHub Actions を有効化</span>
              </li>
              <li>
                <span className="text-stone-400 font-sans">Viteの設定 (<code className="text-stone-300">base: './'</code>) 設定済みのため、サブディレクトリ環境でも正常に動作します。</span>
              </li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-800 bg-stone-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-lg text-xs transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
