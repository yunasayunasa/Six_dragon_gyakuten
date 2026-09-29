/**
 * 横長のゲーム画面を、縦持ちのスマホでも遊べるようにする。
 * スマホが縦向きのとき（Discord のアプリ内ブラウザなど横向きにできない環境を含む）は、
 * ゲーム画面ごと90度回して表示し、スマホを横に持って遊んでもらう。
 * 回したときのゲーム画面の上は、スマホの画面の右側になる。
 */

export function isRotated(): boolean {
  return document.documentElement.classList.contains('rotated');
}

/** 縦向きのタッチ端末なら画面を回す。回したかどうかを返す */
export function updateRotation(): boolean {
  const on = matchMedia('(orientation: portrait) and (pointer: coarse)').matches;
  document.documentElement.classList.toggle('rotated', on);
  return on;
}

/** ゲーム画面の大きさ（CSSピクセル） */
export function gameSize(): { w: number; h: number } {
  return isRotated() ? { w: innerHeight, h: innerWidth } : { w: innerWidth, h: innerHeight };
}

/** 画面上の座標（clientX/Y）→ ゲーム画面上の座標 */
export function toGame(x: number, y: number): { x: number; y: number } {
  return isRotated() ? { x: y, y: innerWidth - x } : { x, y };
}
