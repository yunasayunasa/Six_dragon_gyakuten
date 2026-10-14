# SIX DRAGON GYAKUTEN — モーショングラフィックスMV

ウィルナス（`assets/character/`）をベクターのパペットとして描き直し、映像・音楽ともすべてコードで生成した約91秒のMVです。

- 映像: Python + pycairo（1920×1080 / 30fps）
- 音楽: numpy + scipy のシンセ（150BPM、D→Eの転調、`timeline.py` の小節で映像と同期）
- リポジトリ素材: 歩行スプライト25コマ（ブレイクのフィルムストリップ）と小物PNG（紙のステッカー）

## 再生成

```bash
pip install pycairo scipy numpy pillow
# 見出しフォント（Google Fonts、OFL）: Dela Gothic One / Mochiy Pop One / Zen Kaku Gothic New Black を ~/.fonts へ
MV_WAV=mv/out/soundtrack.wav python3 mv/audio.py   # 音源
python3 mv/render.py sheet                          # 確認用コンタクトシート
python3 mv/render.py video                          # mv/out/six_dragon_mv.mp4（紙の粒子入りマスター）
MV_GRAIN=0 python3 mv/render.py video 0 91.6 mv/out/nograin_master.mp4   # 粒子なし（共有用の元）
```

リポジトリには共有用の `out/six_dragon_mv_share.mp4`（1080p・約28MB、粒子なしマスターから2パスで圧縮）だけを含めています。粒子入りマスターは約130MBでGitHubの100MB制限を超えるため、上のコマンドで再生成してください。

## ファイル

|ファイル|内容|
|---|---|
|`timeline.py`|BPM・小節・セクション位置（映像と音の共通クロック）|
|`audio.py`|作曲データと音源合成（ドラム・和太鼓・ベース・スーパーソウ・琴風Karplus-Strong・リード）|
|`wilnas.py`|ウィルナスのリグ（ポーズ、歩き/走りサイクル、髪・縄・帯の揺れ、表情）|
|`dragon.py`|飛行軌跡を追従する龍（胴・鱗・背びれ・頭・ひげ）|
|`gfx.py` / `common.py`|図形・和柄（亀甲・青海波）・集中線・文字・コラージュパネル|
|`scenes1-3.py`|16シーン（目のアップ→名乗り→疾走→カウント→逆転→龍に騎乗→紙→反転→六龍→ロゴ）|
|`render.py`|並列レンダリングとffmpegでの書き出し|
