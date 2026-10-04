import type { CaseData } from '../genres/investigation/types';

/** 作品名 */
export const GAME_TITLE = '逆転六竜';
export const GAME_SUBTITLE = '〜活劇奇譚〜';
/** 作品名のロゴ（public/assets からの相対） */
export const GAME_LOGO = 'ui/title_logo.webp';
/** ホーム画面の曲（ユーザー提供のファンファーレ。音量はエンディング曲と聞こえる大きさをそろえた） */
export const TITLE_BGM = { url: 'audio/fanfare.mp3', volume: 0.37 };

export interface Episode {
  id: string;
  /** 例: 第一話 */
  number: string;
  title: string;
  /** 扉絵（public/assets からの相対） */
  cover?: string;
  /** 事件データの読み込み（無ければ準備中） */
  load?: () => Promise<CaseData>;
}

/** 全5話。前の話を解決すると次の話が遊べる（第一話は最初から） */
export const EPISODES: Episode[] = [
  { id: 'case01', number: '第一話', title: '夕凪の空港と消えた灯晶', cover: 'ui/cover_case01.webp', load: () => import('./case01/case').then((m) => m.CASE01) },
  { id: 'case02', number: '第二話', title: '雲市場と二つの灯晶', cover: 'ui/cover_case02.webp', load: () => import('./case02/case').then((m) => m.CASE02) },
  { id: 'case03', number: '第三話', title: '霧の工房と鐘の鳴らない夜' },
  { id: 'case04', number: '第四話', title: '嵐の監獄船とルオーの罪' },
  { id: 'case05', number: '第五話', title: '暁の空に、六竜の逆転' },
];
