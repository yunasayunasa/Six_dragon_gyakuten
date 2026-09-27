# Performance / Validation Notes

## 実測

2026-09-27、Windows、Godot 4.7.2、NVIDIA RTX 4060 Ti、Vulkan Forward+、1280×720。`validation/tour-report.json`の59サンプル。起動直後のウォームアップは除外し、描画場面の移動・演出・画像保存を含みます。

|項目|結果|
|---|---|
|ガイド再生|PASS / 30.045秒、森から宝箱まで完走|
|FPS|最小91 / 中央値120 / 最大120|
|平均Frame Time換算|約8.33〜10.99 ms（1000/FPS）|
|Draw Calls|50〜188 / 中央値128|
|Visible Objects|294〜481 / 中央値399（Godotの描画モニター値）|
|SE Hook|6種類すべて実際の進行で発火|
|DOF|Forward+で有効、実描画6場面を保存|

Frame Time表示はFPSから求める平均換算で、GPU単体の計測値ではありません。VSync上限・画面保存等の影響があり、安定した最大処理能力のベンチマークではありません。

## 検証判定

- **PASS**: Phase 1〜10の段階検証。Godotのパース・型・実行エラーを検査。歩行、Idle、接地、Paper構成、Rise/Fall/Wire、Focus補間、照明切替、屋内遷移、宝箱、輪郭キャッシュ、遮蔽物の透過と復帰、衝突境界を確認。
- **PASS**: 共通 `tools/ai-harness/verify.ps1`。`package.json`の入口からGodot専用検証を呼び、最終結果はerrors=0、warnings=0。npm依存はありません。
- **PASS**: Forward+でガイド完走、スクリーンショット確認。粒子のBillboard拡大と地面の縮小時ノイズは確認中に修正済み。
- **PASS**: Windows上のCompatibility起動、ログエラーなし。これはWebのE2E検証ではありません。
- **PASS**: `demo/forest/paper_gallery.tscn` のEditorロード、@tool実行エラーなし。
- **PASS**: 単一スレッドWeb書き出し。PCのEdgeでHTTPS起動、森の描画、タッチ画面エミュレーションで方向・操作ボタンの表示とガイド再生ボタンの入力を確認（`validation/web-running.png`、`web-mobile-emulation.png`、`web-after-tap.png`）。
- **PASS**: ローカルCA署名のHTTPSで証明書チェーンとIPアドレスを検証し、`/connection`、CA公開証明書、WASMのMIMEを確認。Windowsの受信許可はPrivate / LocalSubnet / TCP 8769 / 専用Node実行ファイルのみ。
- **FAIL**: LANのHTTP配信ではGodotのSecure Contextエラーで起動できません。端末が信頼するHTTPS配信が必要です。
- **SKIPPED**: スマートフォン/iPhone実機、端末のタッチ操作、発熱・電池・端末別FPS。実機検証は行っていません。
- **SKIPPED**: 実音源の再生。音源未提供のためHookのみ。
- **SKIPPED**: Git diff/status。新規フォルダでGitリポジトリではありません。代わりに成果物一覧・ファイル参照・秘密候補・生成物を検査しています。
- **SKIPPED**: 外部formatter/linter。未導入。Godotのパーサーと実行検証を使用しています。

未解決の必須実装FAILはありません。美術の完成度・素材の最終採用はユーザーの画面レビュー対象です。家、室内家具、遠山は差し替え前提の簡易素材です。

## 負荷を抑える方針

- 地面は少数のMesh。局所的な苔Decalは3枚。全面をDecalで覆いません。
- 草は影なし、主要木と看板のみ影。影付きライトはDirectional 1個。Local/Window/Eventライトは影なし。
- Dustは各エリア28粒、Treasureは24粒・one-shot。非表示エリアの粒子は描画されません。
- 紙フチはビルド済み画像。色/幅変更時も初回CPU生成をメモリキャッシュし、毎フレームの多サンプル輪郭Shaderを避けています。
- 不透明部分はAlpha Scissor。遮蔽回避中、水、粒子、接地影だけ必要な透明描画を使用。
- ミップマップ、有効な地面用リピート、控えめなDOF。MSAA 2×、影マップ2048。
- 水はUV Scrollと解析的な小波、ライト由来のSpecular。SSR、反射Probe、流体シミュレーションなし。
- GI、SSAO、SSR、Volumetric Fog、重いポスト処理、物理的なStage Motionは不使用。
- 素材コピーは合計約18.2 MB（PNG/SVG/Resource/インポート設定）。Godotキャッシュは提出ZIPから除外。

## Web / Mobile

Godot 4.7の[CameraAttributesPractical公式仕様](https://docs.godotengine.org/en/4.7/classes/class_cameraattributespractical.html)では、ネイティブDOFはForward+ / Mobile対応、Compatibility非対応です。

本プロジェクトはPCをForward+、Mobile設定をMobile、Web設定をCompatibilityとしています。CompatibilityではDOFを無効化しHUDにも表示し、Decalは小さい透過地面Planeへ切り替えます。Webへ同品質のDOFを提供する独自ポスト処理は今回作っていません。Godotの[Web書き出し公式ガイド](https://docs.godotengine.org/en/4.7/tutorials/export/exporting_for_web.html)に沿って単一スレッド版を使用しています。

ブラウザのタッチ画面エミュレーションはUIと入力配線の検査に限ります。実機Safari、GPU負荷、入力遅延、モバイル回線からの接続は未確認です。ローカルCAはiPhoneにまだインストールされていません。

実機を対象にするときは、まずMobile rendererで720p・30fpsを計測し、影解像度、草の数、前景の重なり、DOF量を端末に合わせて調整してください。今回のPC測定からスマートフォンが軽いとは断定しません。
