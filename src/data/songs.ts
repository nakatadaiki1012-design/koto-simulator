import { Song } from '../types/koto';

/**
 * 1. さくらさくら (Sakura Sakura)
 * 調弦: 平調子 / 難易度: 初級
 */
export const SAKURA_SONG: Song = {
  id: 'sakura',
  title: 'さくらさくら',
  subtitle: '日本古謡・文部省唱歌',
  description: '音楽の授業や箏の入門で最初に学ぶ最も有名な伝統曲。七（G4）と八（A4）を中心とした情緒あふれる都節音階を味わえます。',
  bpm: 64,
  tuningId: 'hirajoshi',
  tuningName: '平調子',
  difficulty: '初級',
  notes: [
    // 1. さくら さくら
    { stringId: 7, duration: 1, lyric: 'さ', section: '1. さくら さくら' },
    { stringId: 7, duration: 1, lyric: 'く' },
    { stringId: 8, duration: 2, lyric: 'ら' },
    { stringId: 7, duration: 1, lyric: 'さ' },
    { stringId: 7, duration: 1, lyric: 'く' },
    { stringId: 8, duration: 2, lyric: 'ら' },

    // 2. やよいの空は
    { stringId: 7, duration: 1, lyric: 'や', section: '2. やよいの空は' },
    { stringId: 8, duration: 1, lyric: 'よ' },
    { stringId: 9, duration: 1, lyric: 'い' },
    { stringId: 8, duration: 1, lyric: 'の' },
    { stringId: 7, duration: 1, lyric: 'そ' },
    { stringId: 8, duration: 1, lyric: 'ら' },
    { stringId: 7, duration: 2, lyric: 'は' },
    { stringId: 5, duration: 4, lyric: '―' },

    // 3. 見渡す限り
    { stringId: 7, duration: 1, lyric: 'み', section: '3. 見渡す限り' },
    { stringId: 8, duration: 1, lyric: 'わ' },
    { stringId: 9, duration: 1, lyric: 'た' },
    { stringId: 8, duration: 1, lyric: 'す' },
    { stringId: 7, duration: 1, lyric: 'か' },
    { stringId: 8, duration: 1, lyric: 'ぎ' },
    { stringId: 7, duration: 2, lyric: 'り' },
    { stringId: 5, duration: 4, lyric: '―' },

    // 4. かすみか雲か
    { stringId: 3, duration: 1, lyric: 'か', section: '4. かすみか雲か' },
    { stringId: 4, duration: 1, lyric: 'す' },
    { stringId: 4, duration: 1, lyric: 'み' },
    { stringId: 3, duration: 1, lyric: 'か' },
    { stringId: 4, duration: 1, lyric: 'く' },
    { stringId: 8, duration: 1, lyric: 'も' },
    { stringId: 7, duration: 1, lyric: 'か' },
    { stringId: 4, duration: 1, lyric: 'ー' },
    { stringId: 3, duration: 4, lyric: '―' },

    // 5. 匂いぞ出づる
    { stringId: 7, duration: 1, lyric: 'に', section: '5. 匂いぞ出づる' },
    { stringId: 8, duration: 1, lyric: 'お' },
    { stringId: 9, duration: 1, lyric: 'い' },
    { stringId: 8, duration: 1, lyric: 'ぞ' },
    { stringId: 7, duration: 1, lyric: 'い' },
    { stringId: 8, duration: 1, lyric: 'づ' },
    { stringId: 7, duration: 2, lyric: 'る' },
    { stringId: 5, duration: 4, lyric: '―' },

    // 6. いざや見にゆかん
    { stringId: 7, duration: 1, lyric: 'い', section: '6. いざや見にゆかん' },
    { stringId: 7, duration: 1, lyric: 'ざ' },
    { stringId: 8, duration: 2, lyric: 'や' },
    { stringId: 7, duration: 1, lyric: 'い' },
    { stringId: 7, duration: 1, lyric: 'ざ' },
    { stringId: 8, duration: 2, lyric: 'や' },
    { stringId: 9, duration: 2, lyric: 'み' },
    { stringId: 8, duration: 2, lyric: 'に' },
    { stringId: 7, duration: 2, lyric: 'ゆ' },
    { stringId: 8, duration: 2, lyric: 'か' },
    { stringId: 7, duration: 4, lyric: 'ん' },
  ],
};

/**
 * 2. 六段の調 - 初段抜粋 (Rokudan no Shirabe)
 * 調弦: 平調子 / 難易度: 中級
 * 近世箏曲の最高峰。八橋検校作曲。
 */
export const ROKUDAN_SONG: Song = {
  id: 'rokudan',
  title: '六段の調（初段抜粋）',
  subtitle: '八橋検校 作曲',
  description: '近世箏曲の最高峰にして国宝級の名曲。一から五への雅な導入から、重厚な陰旋法、押し手の技法まで、箏の神髄が詰まった名作です。',
  bpm: 52,
  tuningId: 'hirajoshi',
  tuningName: '平調子',
  difficulty: '中級',
  notes: [
    // 序奏：一から五への静寂な立ち上がり
    { stringId: 1, duration: 2, lyric: '一', section: '1. 序奏' },
    { stringId: 2, duration: 2, lyric: '二' },
    { stringId: 3, duration: 2, lyric: '三' },
    { stringId: 4, duration: 2, lyric: '四' },
    { stringId: 5, duration: 4, lyric: '五' },

    // 初段本旋律
    { stringId: 7, duration: 2, lyric: '七', section: '2. 初段本手' },
    { stringId: 8, duration: 2, lyric: '八' },
    { stringId: 7, duration: 2, lyric: '七' },
    { stringId: 6, duration: 2, lyric: '六' },
    { stringId: 5, duration: 4, lyric: '五' },

    // 押し手の登場（四の押し手で五と同じ音を出す古典の技）
    { stringId: 4, duration: 2, lyric: '四(押)', technique: 'oshide', section: '3. 押し手旋律' },
    { stringId: 5, duration: 2, lyric: '五' },
    { stringId: 4, duration: 2, lyric: '四' },
    { stringId: 3, duration: 2, lyric: '三' },
    { stringId: 2, duration: 4, lyric: '二' },

    // 初段の結び
    { stringId: 7, duration: 1.5, lyric: '七', section: '4. 初段の結び' },
    { stringId: 8, duration: 0.5, lyric: '八' },
    { stringId: 9, duration: 2, lyric: '九' },
    { stringId: 8, duration: 2, lyric: '八' },
    { stringId: 7, duration: 2, lyric: '七' },
    { stringId: 5, duration: 2, lyric: '五' },
    { stringId: 2, duration: 2, lyric: '二' },
    { stringId: 1, duration: 4, lyric: '一' },
  ],
};

/**
 * 3. 荒城の月 (Kōjō no Tsuki)
 * 調弦: 平調子 / 難易度: 初級
 * 滝廉太郎 作曲 / 土井晩翠 作詞
 */
export const KOJO_NO_TSUKI: Song = {
  id: 'kojo',
  title: '荒城の月',
  subtitle: '滝廉太郎 作曲 / 日本名曲',
  description: '日本の伝統的な平調子の音階と西洋音楽の調和が見事な名曲。ゆったりとした情緒あふれる旋律を練習できます。',
  bpm: 58,
  tuningId: 'hirajoshi',
  tuningName: '平調子',
  difficulty: '初級',
  notes: [
    // 春高楼の花の宴
    { stringId: 7, duration: 2, lyric: 'は', section: '1. 春高楼の花の宴' },
    { stringId: 8, duration: 1, lyric: 'る' },
    { stringId: 7, duration: 1, lyric: 'こ' },
    { stringId: 6, duration: 2, lyric: 'う' },
    { stringId: 5, duration: 2, lyric: 'ろ' },
    { stringId: 4, duration: 2, lyric: 'う' },
    { stringId: 5, duration: 1, lyric: 'の' },
    { stringId: 6, duration: 1, lyric: 'は' },
    { stringId: 7, duration: 4, lyric: 'な' },

    // めぐる盃かげさして
    { stringId: 8, duration: 2, lyric: 'め', section: '2. めぐる盃' },
    { stringId: 9, duration: 1, lyric: 'ぐ' },
    { stringId: 8, duration: 1, lyric: 'る' },
    { stringId: 7, duration: 2, lyric: 'さ' },
    { stringId: 6, duration: 2, lyric: 'か' },
    { stringId: 5, duration: 2, lyric: 'づ' },
    { stringId: 6, duration: 1, lyric: 'き' },
    { stringId: 7, duration: 1, lyric: 'か' },
    { stringId: 8, duration: 4, lyric: 'げ' },

    // 千代の松が枝わけいでし
    { stringId: 9, duration: 2, lyric: 'ち', section: '3. 千代の松が枝' },
    { stringId: 8, duration: 1, lyric: 'よ' },
    { stringId: 7, duration: 1, lyric: 'の' },
    { stringId: 8, duration: 2, lyric: 'ま' },
    { stringId: 9, duration: 2, lyric: 'つ' },
    { stringId: 10, duration: 2, lyric: 'が' },
    { stringId: 9, duration: 1, lyric: 'え' },
    { stringId: 8, duration: 1, lyric: 'わ' },
    { stringId: 7, duration: 4, lyric: 'け' },

    // むかしの光いまいづこ
    { stringId: 8, duration: 2, lyric: 'む', section: '4. 昔の光' },
    { stringId: 7, duration: 1, lyric: 'か' },
    { stringId: 6, duration: 1, lyric: 'し' },
    { stringId: 5, duration: 2, lyric: 'の' },
    { stringId: 4, duration: 2, lyric: 'ひ' },
    { stringId: 3, duration: 2, lyric: 'か' },
    { stringId: 2, duration: 2, lyric: 'り' },
    { stringId: 1, duration: 4, lyric: '―' },
  ],
};

/**
 * 4. 千鳥の曲 - 前奏抜粋 (Chidori no Kyoku)
 * 調弦: 雲井調子 / 難易度: 中級
 * 吉沢検校 作曲。雲井調子（くもいぢょうし）を代表する名作。
 */
export const CHIDORI_SONG: Song = {
  id: 'chidori',
  title: '千鳥の曲（前奏）',
  subtitle: '吉沢検校 作曲（雲井調子）',
  description: '波打ち際を群れ飛ぶ千鳥の鳴き声と優美な波の情景を描いた、雲井調子（三・八・巾下げ）の代表的古典名曲です。',
  bpm: 50,
  tuningId: 'kumoi',
  tuningName: '雲井調子',
  difficulty: '中級',
  notes: [
    // 雲井調子の静寂な波音
    { stringId: 5, duration: 2, lyric: '五', section: '1. 潮騒の調べ' },
    { stringId: 7, duration: 1, lyric: '七' },
    { stringId: 8, duration: 1, lyric: '八' },
    { stringId: 9, duration: 2, lyric: '九' },
    { stringId: 8, duration: 2, lyric: '八' },
    { stringId: 7, duration: 2, lyric: '七' },
    { stringId: 6, duration: 2, lyric: '六' },
    { stringId: 5, duration: 4, lyric: '五' },

    // 千鳥の鳴き交わす風情
    { stringId: 4, duration: 2, lyric: '四', section: '2. 千鳥の羽ばたき' },
    { stringId: 5, duration: 2, lyric: '五' },
    { stringId: 7, duration: 2, lyric: '七' },
    { stringId: 8, duration: 2, lyric: '八' },
    { stringId: 10, duration: 2, lyric: '十' },
    { stringId: 9, duration: 2, lyric: '九' },
    { stringId: 8, duration: 2, lyric: '八' },
    { stringId: 7, duration: 4, lyric: '七' },

    // 波の返し
    { stringId: 6, duration: 2, lyric: '六', section: '3. 波の返し' },
    { stringId: 5, duration: 2, lyric: '五' },
    { stringId: 4, duration: 2, lyric: '四' },
    { stringId: 3, duration: 2, lyric: '三' },
    { stringId: 2, duration: 4, lyric: '二' },
    { stringId: 1, duration: 4, lyric: '一' },
  ],
};

/**
 * 5. 春の海 - 主旋律冒頭 (Haru no Umi)
 * 調弦: 平調子 / 難易度: 上級
 * 宮城道雄 作曲。お正月の象徴曲。
 */
export const HARU_NO_UMI: Song = {
  id: 'harunoumi',
  title: '春の海（主旋律冒頭）',
  subtitle: '宮城道雄 作曲',
  description: '日本の新春を彩る世界的名曲。尺八との合奏で親しまれるきらびやかなアルペジオと美しい主題を体験できます。',
  bpm: 60,
  tuningId: 'hirajoshi',
  tuningName: '平調子',
  difficulty: '上級',
  notes: [
    // 静かな海面の光
    { stringId: 5, duration: 1, lyric: '五', section: '1. 水面の輝き' },
    { stringId: 7, duration: 1, lyric: '七' },
    { stringId: 8, duration: 2, lyric: '八' },
    { stringId: 10, duration: 2, lyric: '十' },
    { stringId: 9, duration: 1, lyric: '九' },
    { stringId: 8, duration: 1, lyric: '八' },
    { stringId: 7, duration: 4, lyric: '七' },

    // 春風のアルペジオ
    { stringId: 2, duration: 1, lyric: '二', section: '2. 春風の調べ' },
    { stringId: 5, duration: 1, lyric: '五' },
    { stringId: 7, duration: 1, lyric: '七' },
    { stringId: 8, duration: 1, lyric: '八' },
    { stringId: 10, duration: 2, lyric: '十' },
    { stringId: 12, duration: 2, lyric: '為' },
    { stringId: 10, duration: 1, lyric: '十' },
    { stringId: 8, duration: 1, lyric: '八' },
    { stringId: 7, duration: 4, lyric: '七' },

    // 押し手を含む宮城節の抒情
    { stringId: 8, duration: 1.5, lyric: '八', section: '3. 押し手の余韻' },
    { stringId: 9, duration: 0.5, lyric: '九' },
    { stringId: 8, duration: 1, lyric: '八' },
    { stringId: 7, duration: 1, lyric: '七' },
    { stringId: 6, duration: 2, lyric: '六(押)', technique: 'oshide' },
    { stringId: 5, duration: 4, lyric: '五' },
  ],
};

/**
 * 6. うさぎ（うさぎ うさぎ）
 * 調弦: 平調子 / 難易度: 入門
 * 日本のわらべうた。
 */
export const USAGI_SONG: Song = {
  id: 'usagi',
  title: 'うさぎ',
  subtitle: '日本わらべうた',
  description: '音数が少なく初心者やお子様が最初に弾くのに最適な童歌。「七・八・九」の弦を行き来しながら平調子の響きを覚えられます。',
  bpm: 68,
  tuningId: 'hirajoshi',
  tuningName: '平調子',
  difficulty: '入門',
  notes: [
    // うさぎ うさぎ
    { stringId: 7, duration: 1, lyric: 'う', section: '1. うさぎ うさぎ' },
    { stringId: 7, duration: 1, lyric: 'さ' },
    { stringId: 8, duration: 2, lyric: 'ぎ' },
    { stringId: 7, duration: 1, lyric: 'う' },
    { stringId: 7, duration: 1, lyric: 'さ' },
    { stringId: 8, duration: 2, lyric: 'ぎ' },

    // 何見て跳ねる
    { stringId: 7, duration: 1, lyric: 'な', section: '2. 何見て跳ねる' },
    { stringId: 8, duration: 1, lyric: 'に' },
    { stringId: 9, duration: 1, lyric: 'み' },
    { stringId: 8, duration: 1, lyric: 'て' },
    { stringId: 7, duration: 2, lyric: 'は' },
    { stringId: 8, duration: 2, lyric: 'ね' },
    { stringId: 7, duration: 4, lyric: 'る' },

    // 十五夜お月さま
    { stringId: 9, duration: 1, lyric: 'じゅう', section: '3. 十五夜お月さま' },
    { stringId: 9, duration: 1, lyric: 'ご' },
    { stringId: 8, duration: 2, lyric: 'や' },
    { stringId: 7, duration: 1, lyric: 'お' },
    { stringId: 8, duration: 1, lyric: 'つ' },
    { stringId: 9, duration: 1, lyric: 'き' },
    { stringId: 8, duration: 1, lyric: 'さ' },
    { stringId: 7, duration: 4, lyric: 'ま' },

    // 見て跳ねる
    { stringId: 8, duration: 2, lyric: 'み' },
    { stringId: 7, duration: 2, lyric: 'て' },
    { stringId: 5, duration: 2, lyric: 'は' },
    { stringId: 7, duration: 2, lyric: 'ね' },
    { stringId: 5, duration: 4, lyric: 'る' },
  ],
};

/**
 * 7. 江戸子守唄 (Edo Lullaby)
 * 調弦: 平調子 / 難易度: 入門
 */
export const KOMORIUTA_SONG: Song = {
  id: 'komoriuta',
  title: '江戸子守唄',
  subtitle: '日本古謡',
  description: '「ねんねんころりよ」でおなじみの江戸時代の伝統子守唄。情緒ある穏やかな五音音階で優しく奏でられます。',
  bpm: 60,
  tuningId: 'hirajoshi',
  tuningName: '平調子',
  difficulty: '入門',
  notes: [
    // ねんねんころりよ
    { stringId: 7, duration: 2, lyric: 'ね', section: '1. ねんねんころりよ' },
    { stringId: 8, duration: 1, lyric: 'ん' },
    { stringId: 7, duration: 1, lyric: 'ね' },
    { stringId: 5, duration: 4, lyric: 'ん' },
    { stringId: 4, duration: 2, lyric: 'こ' },
    { stringId: 5, duration: 2, lyric: 'ろ' },
    { stringId: 4, duration: 2, lyric: 'り' },
    { stringId: 3, duration: 4, lyric: 'よ' },

    // おころりよ
    { stringId: 4, duration: 2, lyric: 'お', section: '2. おころりよ' },
    { stringId: 5, duration: 2, lyric: 'こ' },
    { stringId: 7, duration: 2, lyric: 'ろ' },
    { stringId: 8, duration: 2, lyric: 'り' },
    { stringId: 7, duration: 4, lyric: 'よ' },

    // 坊やはよい子だ
    { stringId: 8, duration: 2, lyric: 'ぼ', section: '3. 坊やはよい子だ' },
    { stringId: 9, duration: 1, lyric: 'う' },
    { stringId: 8, duration: 1, lyric: 'や' },
    { stringId: 7, duration: 4, lyric: 'は' },
    { stringId: 5, duration: 2, lyric: 'よ' },
    { stringId: 7, duration: 1, lyric: 'い' },
    { stringId: 8, duration: 1, lyric: 'こ' },
    { stringId: 7, duration: 4, lyric: 'だ' },

    // ねんねしな
    { stringId: 5, duration: 2, lyric: 'ね' },
    { stringId: 4, duration: 2, lyric: 'ん' },
    { stringId: 3, duration: 2, lyric: 'ね' },
    { stringId: 2, duration: 2, lyric: 'し' },
    { stringId: 1, duration: 4, lyric: 'な' },
  ],
};

export const ALL_PRACTICE_SONGS: Song[] = [
  SAKURA_SONG,
  USAGI_SONG,
  KOMORIUTA_SONG,
  ROKUDAN_SONG,
  KOJO_NO_TSUKI,
  CHIDORI_SONG,
  HARU_NO_UMI,
];
