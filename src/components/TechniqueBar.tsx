import React from 'react';
import { PlayingTechnique } from '../types/koto';
import { Hand, Waves, VolumeX, Sparkles, ArrowUpRight, ArrowDownRight, Activity, Zap, Layers } from 'lucide-react';

interface TechniqueBarProps {
  currentTechnique: PlayingTechnique;
  onChangeTechnique: (tech: PlayingTechnique) => void;
}

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
        <div className="flex items-center gap-1.5 text-xs text-amber-500/80 font-serif-jp shrink-0 mr-1 hidden md:flex">
          <span>特殊奏法:</span>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap">
          {techniques.map((tech) => {
            const isActive = currentTechnique === tech.id;
            return (
              <button
                key={tech.id}
                onClick={() => onChangeTechnique(tech.id)}
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
              </button>
            );
          })}
        </div>

        <div className="text-[11px] text-stone-500 hidden xl:block font-serif-jp truncate ml-2">
          ※ 琴柱の左側を直接タップで「裏弾き／押し手」
        </div>
      </div>
    </div>
  );
};
