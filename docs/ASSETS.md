# 素材

ゲームで使う素材は `public/assets/` にあり、`tools/prepare_assets.py` で作ります（元ファイルは変更しません）。

| 出力 | 元素材（コウセイ/総合アセット） | 処理 |
|---|---|---|
| `cast/<ポーズ>/base.webp` ほか目口パーツ | `ADV_目口パーツ_20ポーズ_修正版` | 透明余白を切り詰め、72%に縮小、紙の白フチを焼き込み。`manifest.json` に立ち位置（中央・足元）とパーツ位置を記録 |
| `props/*.webp` | `Billboard_Assets_55` / `Cross_Plane_Priority12` / `HD2D_Decals_Priority18` | 切り詰め・縮小・白フチ |
| `stage/cloudsea.webp` | `Billboard_Assets_55/54_window_outside_cloudsea.png` | 空の帯を切り出し（色は実行時にLookで夕景・対決色へ変える） |
| `stage/wood.webp` | GitHub `main` の `assets/ground/wood.png` | 縮小、彩度を下げて明るく |
| `audio/bgm_harbor.mp3` | `音声/stage_bgm1.mp3` | 112kbpsへ再圧縮 |

```sh
python tools/prepare_assets.py <素材を展開したフォルダ> public/assets <wood.pngのあるフォルダ>
```

効果音は素材ファイルを使わず、WebAudioで合成しています（`src/engine/audio/Sound.ts`）。
立ち絵はAI生成の差分のため、手指や装飾の細部はポーズ間で完全には一致しません。
