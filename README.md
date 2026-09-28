# Paper HD2D — Three.js A/B Test

**現在の公開版: [Three.jsデモ](https://yunasayunasa.github.io/Six_dragon_gyakuten/)**

`threejs-ab` ブランチの `three/` が比較用の最小版です。Godot版は `main` と既存ファイルに保持しています。森＋家の1画面で、透過PNGと3D地面、距離ベースDOF、Rise演出の成立を確認します。戦闘・室内・宝箱・PWAは追加していません。

## Three.js版の起動

Node.js 22.12以降（CIは22）、npmを使用します。

```sh
npm ci --prefix three
npm run dev --prefix three
# 表示されたURLの /Six_dragon_gyakuten/ を開く
npm run verify --prefix three
```

`verify` は焦点距離・補間・Stage順序・透過深度の復元テストとVite本番ビルドを実行します。ビルド出力は `three/dist/`。`npm run preview --prefix three` で本番出力を確認できます。

## 操作と比較

|操作|PC|iPhone / タッチ|
|---|---|---|
|移動|矢印キー（W/A/Sも補助対応）|左下の4方向ボタン|
|DOF ON/OFF|D / 上部ボタン|上部DOFボタン|
|HIGH → MEDIUM → LOW|Q / 上部ボタン|上部画質ボタン|
|Rise再演|E / Space / 舞台ボタン|右下の舞台ボタン|
|性能表示の表示・非表示|F3 / 計測ボタン|計測ボタン|

指定のDキーをDOF専用とするため、完全なWASD操作ではなく矢印操作を採用しました。看板近くに歩くと最初のRiseが自動開始します。イベント中は移動を止め、焦点を舞台へ寄せ、木が起き、短く保持してプレイヤーへ戻ります。舞台ボタンで同じ演出を再比較できます。

iPhoneはSafariでURLを開き、横向きで確認してください。MEDIUMから開始します。重ければLOWへ下げ、最後にDOFをOFFにしてください。固定URLは通常のHTTPSなのでローカル証明書の信頼操作は不要です。iPhone実機の起動・FPS・発熱・PCとの見た目の差は未検証で、[COMPARISON.md](COMPARISON.md) に記録欄を用意しています。

## 描画と調整箇所

- `three/src/demo/profiles.js`: DOF、画質、カメラ、移動、Stageの数値。
- `three/src/core/`: 足元Pivotの紙Plane、CrossPlane、Sprite SheetのIdle/Walk、移動と接地影。
- `three/src/presentation/`: Camera / DOF / Lighting / Stage。`EffectComposer → RenderPass → PaperBokehPass → OutputPass`。
- `PaperBokehPass` は標準 `BokehPass` のぼかしシェーダーをそのまま使用します。深度プリパスのみ、PNGのalphaTestとアニメーションUVを反映する材質へ交換します。これにより透明な四角形を誤って深度へ書きません。接地影は深度から除外します。
- Focusはカメラの視線方向の距離です。初期描画を除き指数補間し、Stageの対象切替もsmoothstepで補間します。CSS blurは使用していません。
- HIGH / MEDIUM / LOWは描画解像度と最大ぼけ量を変更します。Bokehのサンプル数は同一です。DPR上限はPC 2 / 1.25 / 0.85、タッチ端末1.5 / 1.25 / 0.85です。標準Bokehを先に評価するため独自低解像度ぼかしパイプラインは未追加です。
- リアルタイム影なし、Hemisphere＋Directional、標準Fog。地面は繰り返しTexture、道は独立Overlay Meshです。
- 元の `assets/` を直接再利用し、Viteが参照素材をハッシュ付きファイルにします。Service Workerなし。背景等の小さなSVGはViteによりバンドルへ埋め込まれます。
- 性能表示は全描画Passを合計した `renderer.info` と約0.5秒平均のFPS/frame intervalです。GPU処理時間ではありません。Three.js本体を含むJSの500KB警告は残しています（gzip約143KB）。

## GitHub Pages自動公開

`.github/workflows/three-pages.yml` が `threejs-ab`（または将来mainへ取り込んだ後のmain）の対象ファイルへのpushで、npm ci → テスト＋Vite build → Pages deployを行います。PagesはGitHub Actions方式です。`vite.config.js` のbaseは `/Six_dragon_gyakuten/`。現在のmainに変更は加えていません。

公開先はリポジトリにつき1つのため、このブランチのデプロイで固定URLの内容がThree.js版になります。Godotへ戻す場合はGitHub Settings → PagesでDeploy from a branch、`main` / `docs`へ戻します。Three版を再公開する場合はSourceをGitHub Actionsへ戻し、このworkflowを実行します。

検証用 `three/tests/browser-smoke.mjs` は既に起動したChromiumのCDP（既定localhost:9231）に接続します。通常利用には不要です。画質撮影・矢印移動・Rise復帰・タッチ入力・横縦リサイズを確認し、結果をGit対象外の `three/test-results/` に保存します。ソフトウェア描画結果を端末性能として扱わないでください。

---

## 既存Godot版の説明（mainの構成）

# PaperHD2D — MVP / Vertical Slice

2Dの紙素材を3D空間へ置き、カメラ・被写界深度・照明・軽量な舞台演出を検証するGodotプロジェクトです。完成ゲームではありません。1 unit = 1 m。

GodotのWeb出力は `main` の `docs/` に保持しています。現在の固定URLは上記Three.js版です。Godot WebはCompatibility描画のため、PCのForward+版と比べてDOFなど一部の表現が省略されます。

## 起動

1. Godot **4.7.2**で、このフォルダの `project.godot` をインポートします。
2. 初回の画像インポート完了後、F6ではなく **F5**で起動します。
3. **T**を押すと、約30〜40秒のガイド再生が森→起き上がる木→ワイヤー看板→家→扉→室内→宝箱を通ります。再生中もTで自動歩行を解除できます。演出中は一時的に移動を止めます。

Windowsでインストール済みのGodotから直接実行する例：

```powershell
& "$env:LOCALAPPDATA\Programs\Godot\Godot_v4.7.2-stable_win64_console.exe" --path .
```

標準はForward+。PCで表現を確認する構成です。重いGI、SSAO、SSR、Volumetric Fogは使いません。Web版はCompatibilityで書き出し、PCのHTTPSブラウザで起動とタッチ操作を確認しました。スマートフォン実機の起動・性能は未検証です。CompatibilityではネイティブDOFが使えず、地面Decalを小さな透過Planeへ置き換えます。同じ画質を保証するWeb版ではありません。

## 操作

|キー|動作|
|---|---|
|WASD / 矢印|3D地面を移動|
|E / Space|近くの扉へ入る・宝箱を開ける|
|T|ガイド再生の自動歩行ON/OFF|
|R|デモ全体を初期状態からやり直す|
|F3|FPS・平均Frame Time・Draw Calls・Visible Objects表示|

タッチ画面では左下の方向ボタンで移動、右下の手ボタンで操作、再生ボタンでガイド再生を開始・停止します。最初から見直すにはページを再読み込みしてください。

## スマートフォンから開く場合

公開版は [GitHub Pages](https://yunasayunasa.github.io/Six_dragon_gyakuten/) から開けます。ローカルCAのインストールは不要です。

このリポジトリのWeb書き出しは `docs/` にあります。再書き出しは `export_presets.cfg` の単一スレッドWeb設定を使用します。別のHTTPS静的ホストへ置く場合は、`index.html` と同じ階層に他の書き出しファイルを配置し、`.wasm` を `application/wasm` として配信します。スマートフォンから遊ぶには**端末が信頼するHTTPS**が必要です。同じWi-Fi上の単純なHTTP配信ではGodotがSecure Contextエラーで起動しません。

同じWi-Fiのローカル配信で使ったサーバーとFirewall規則は停止・削除済みです。公開リポジトリにローカルCAの証明書・秘密鍵は含めていません。iPhone実機の表示・性能は [PerformanceNotes.md](PerformanceNotes.md) のとおり未確認です。

室内からの逆移動や永続化は今回の範囲外です。再確認はRを使用します。効果音の音源は未収録のため無音です。

## 機能を確認する場所

|場面|確認点|
|---|---|
|開始地点|25フレームの主人公、Idle、接地影、草Billboard、木CrossPlane、前景透過、DOF、Fog、Wind|
|道を右へ、x ≈ -4.2|倒れた木がRise。カメラ・Focus・Spot・StageRise Hookが連動|
|さらに右へ、x ≈ 3|看板がワイヤー降下して揺れる。WireMove Hook|
|家の前でE|3Dの仮家とPaperMeshの扉。Fallして室内へフェード遷移|
|室内|木床、壁、紙の家具・窓、暖色Pointと窓Spot、微細Dust|
|宝箱の近くでE|Push In、焦点移動、減光、開封、3D光粒、2D Flash、Paper Item PopUp、通常状態へ復帰|
|道の中盤、奥側|UV Scrollする浅い池、岩、苔Decal|

主要パラメータは `presentation/*/*.tres` と `game/demo_profile.tres` から編集できます。素材・Pivot・高さ・厚み・影・風反応は各PaperノードのInspectorで変更できます。

## EditorでPNGを配置する

`demo/forest/paper_gallery.tscn` を開くと、Billboard / CrossPlane / PaperMeshをEditor上で確認できます。

1. Node3Dへ `core/paper/paper_object_3d.gd`、または各派生Scriptを付ける（登録済みクラスから追加しても可）。
2. InspectorのTextureへ透過PNGを指定し、Paper Heightをメートルで指定する。
3. Pivotは通常 `(0.5, 1)`。必要に応じてEdge、Cast Shadow、Wind Reactionを指定する。
4. 厚い側面が必要ならPaperMeshを使う。StageDirectorの `play("Rise", target)` 等で演出する。

共通の`Scale`はNode3DのTransform。Paper ThicknessはPaperMeshに適用します。CrossPlane/PaperMeshはBillboardをNoneに固定します。輪郭色・幅を変えると初回だけCPUキャッシュを生成します。通常のデモ素材では生成済み輪郭を使用します。

メインデモは段階検証しやすいよう実行時に世界を組み立てます。Editorのメインシーンは空のルートに見えますが、F5で構築されます。PaperGalleryは配置・Inspector編集のための独立した見本です。

## 検証

`validation/` にPhase記録、6場面のPNG、`tour-report.json`を保存します。画像をGodotアセットとして再インポートしないため `.gdignore` を置いています。

```powershell
# 全機能のヘッドレス検証（パースエラーもログ検査）
python tools/phase_check.py 10
# 実描画のガイド再生・6場面保存・統計
& "$env:LOCALAPPDATA\Programs\Godot\Godot_v4.7.2-stable_win64_console.exe" --path . -- --capture-tour
```

Pythonは検証補助と素材加工時だけ使用します。ゲームの実行にPython・追加プラグインは不要です。素材再生成にはPillowが必要です。`GODOT_EXE`環境変数で検証用Godotパスを変更できます。

Pythonなしでも `pwsh -NoProfile -File tools/verify.ps1` で同じGodot検証を実行できます。`package.json`は既存ai-harnessの`npm run verify`からこのスクリプトを呼ぶための入口だけで、npm依存やインストール工程はありません。

実装状況は [MVPChecklist.md](MVPChecklist.md)、検証の限界と性能は [PerformanceNotes.md](PerformanceNotes.md)、責務は [Architecture.md](Architecture.md)、素材契約は [AssetStandard.md](AssetStandard.md) を参照してください。

## 保全と戻し方

新規の`PaperHD2D`フォルダ内のみで実装しました。元ZIP、既存ゲーム、全体設定を変更していません。Gitリポジトリの作成・commit・pushは行っていません。戻す場合はGodotを閉じ、この新規フォルダを移動または削除してください。Knowledge/Vaultへの書き込みは行っていません。
