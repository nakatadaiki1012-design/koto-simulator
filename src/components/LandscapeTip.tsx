import React, { useState, useEffect } from 'react';
import { Smartphone, X } from 'lucide-react';

interface LandscapeTipProps {
  orientation: 'horizontal' | 'vertical';
  setOrientation: (val: 'horizontal' | 'vertical') => void;
}

export const LandscapeTip: React.FC<LandscapeTipProps> = ({
  orientation,
  setOrientation,
}) => {
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isPortraitMobile, setIsPortraitMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => {
      const isMobile = window.innerWidth <= 768;
      const isPortrait = window.innerHeight > window.innerWidth;
      setIsPortraitMobile(isMobile && isPortrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isPortraitMobile || isDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-3 inset-x-3 sm:inset-x-auto sm:right-4 z-40 max-w-md bg-stone-900/95 border border-amber-500/40 rounded-xl p-3 shadow-xl backdrop-blur-md flex items-center justify-between gap-3 text-xs animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center gap-2.5 text-stone-200">
        <Smartphone className="w-5 h-5 text-amber-400 rotate-90 shrink-0" />
        <div>
          <span className="font-semibold text-amber-200 block">
            横画面での操作がおすすめ
          </span>
          <span className="text-stone-400 text-[11px]">
            本体を横向きにするか、縦置きモードに切り替えて演奏できます
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {orientation === 'horizontal' && (
          <button
            onClick={() => setOrientation('vertical')}
            className="px-2 py-1 bg-amber-600/80 hover:bg-amber-600 text-stone-950 font-bold rounded text-[11px] whitespace-nowrap"
          >
            縦置きに変更
          </button>
        )}
        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 text-stone-400 hover:text-stone-200"
          title="閉じる"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
