# Paper HD2D Engine v1 — Phase 1

3D World + 2D Paper Assets + HD2D Presentation を組み合わせる共通基盤です。
完成ゲームではなく、モバイルWeb上で表現と性能を検証するための小さなEngineです。

今回のユーザー指定により、新Repositoryは作らず、既存 `Six_dragon_gyakuten` の
`threejs-ab` ブランチ・`three/` をEngineパッケージとして維持します。
Godot側、Tartman、元素材は変更しません。依存はThree.js **0.186.1**、Vite **8.3.1**固定です。

## 起動

Node.js 22.12以降、npmを使用します。Repositoryルートから：

```sh
npm ci --prefix three
npm run dev --prefix three
npm run verify --prefix three
```

`three/` 内では通常の `npm ci`、`npm run dev`、`npm run verify` が使えます。
開くパスは `/Six_dragon_gyakuten/`。verifyはNodeテスト＋Vite buildを実行します。
成果物は `three/dist/`。ローカルサーバーは作業後にCtrl+Cで停止してください。

公開URL: https://yunasayunasa.github.io/Six_dragon_gyakuten/

既存の `.github/workflows/three-pages.yml` を維持します。対象ファイルの
threejs-abへのpush → npm ci → verify（buildを含む）→ Pages deploy。
mainでも同Workflowが存在する場合に動きますが、現作業はthreejs-ab上です。
新Repository用のURLやbaseへは変更していません。

## 責務

|領域|役割|
|---|---|
|Core|Scene生成の基礎、Paper、Character。特定のゲームやdemoを知らない|
|Presentation|Camera、DOF、Lighting、Water、Stage、Audio Hook|
|Runtime|Qualityの既定ProfileとLifecycle。適応品質は未実装|
|Performance|Rendererの計測とBenchmark集計。Scene進行を知らない|
|UI|Mobile ControlsとStatsの表示|
|Optional|Paper Gameplayの予約領域。実行コードなし|
|Genre|ADV/RPG/Actionの予約領域。実行コードなし|
|Demo|素材、森の配置、イベント進行、自動Benchmark、起動時の組み立て|

実装済み: Paper Object、Cross Plane、Player、Camera、DOF、Lighting/Fog、Water、
Rise/Fall/DropFromWire、Thin Cylinder Wire、Mobile Controls、画面離脱時の停止、性能表示・計測。

今後予定: Collision、Navigation、8方向Character、Occlusion、Batching、Audio本実装、
適応Quality管理。Tartman由来のWorld/AI/Audio/描画コードはまだ追加していません。

## Regression Demo

`src/main.js` → `src/demo/startDemo.js` が既存の森＋家＋池を起動します。
配置は `createForest.js`、イベント進行は `StageEvents.js`、設定は `demoProfiles.js`、
素材読込は `demoAssets.js`。素材は従来どおりRepositoryルートの `assets/` を参照し、
Viteでハッシュ付きURLになります。素材の複製・生成はありません。

|操作|PC|スマホ|
|---|---|---|
|移動|矢印、補助W/A/S|左下4方向ボタン|
|DOF切替|D|DOFボタン|
|Quality切替|Q|Qualityボタン|
|Stage再演|E / Space|舞台ボタン|
|Stats表示|F3|通常表示|
|Benchmark開始/中止|B|5分計測ボタン|

Dは既存どおりDOFに割り当てています。WASD全方向へは変更していません。
看板Rise、吊り物DropFromWire、扉Fallの構図・時間・Focus Tweenは従来と同じです。
操作感・iPhone実機の最終確認はユーザーが担当します。

ブラウザのblur・tab非表示・pagehideでゲーム更新とBenchmark計測を停止します。
focus・再表示・pageshow後の最初のフレームは経過時間0として再開します。
手動pauseも同じ時計を使います。停止時にはキーとタッチ入力を解除します。
移動ボタンの複数同時押し、pointercancel、lostpointercapture、長押し時のメニュー抑止を維持。
入力欄を編集しているときのゲーム用キー操作は無視します。
AudioはまだHookのみなので、再生・停止する音源はありません。

## Profile

EngineはDefaultを持ち、constructor/引数から設定を受け取ります。
Core / Presentation / Runtime / Performanceからdemoをimportしません。

- `core/character/defaultProfiles.js`: 単一画像・無制限移動の既定値。デモ用5×5シートと範囲はdemoから注入。
- `presentation/camera/defaultProfiles.js`: 従来のカメラ既定値。
- `presentation/dof/defaultProfiles.js`: Exploration / StageEvent。
- `runtime/quality/defaultProfiles.js`: LOW / MEDIUM / HIGH。
- `presentation/lighting/defaultProfiles.js`: 従来の照明・Fog既定値。
- Stage Motion / Water Profileは従来の各Presentationディレクトリに維持。

```js
new PlayerController(textures, playerProfile);
new CameraDirector(cameraProfile);
new DOFDirector(renderer, scene, camera, { mobile, profiles, qualityProfiles });
createLighting(scene, lightingProfile);
```

DOF profileはExploration / StageEvent、Quality profileはLOW / MEDIUM / HIGHのキーを使います。
DOFの旧boolean第4引数はoptionsオブジェクトへ変更し、demo側も更新しています。

## 性能比較

`?dpr=0.85&dofQuality=LOW`、`?dpr=1&dofQuality=LOW`、
`?dpr=1&dofQuality=MEDIUM` で比較できます。Mobile既定はLOW/DPR上限0.85。
Qualityの差は既存どおりblur強度で、Bokehサンプル数を減らすものではありません。

`PerformanceMonitor` は全Render Pass後のカウンターと約0.5秒のFPSを取得します。
`BenchmarkRecorder` はWarm-up **10秒**を除き、本計測 **300秒**を集計します。
Player移動、Stage、Focusの22秒サイクルは `demo/DemoBenchmarkScenario.js` が担当します。
計測途中にDOF/DPR/Qualityを変えた結果はMIXED表示です。
Frame Timeはフレーム間隔でGPU時間ではなく、Geometries/Texturesもメモリのバイト数ではありません。

|iPhone実機|5分|10分|
|---|---|---|
|設定 / FPS / Frame Time|未測定|未測定|
|本体温度体感 None/Mild/Warm/Hot|未確認|未確認|
|操作遅延 Good/Slight delay/Bad|未確認|未確認|
|Safari Stable/Reload/Crash|未確認|未確認|

## 検証と限界

既存5テスト、Engine依存境界・Scene非依存Recorderの2テストに加え、
LifecycleとMobile Inputの停止・解除を確認する2テストを追加しています。
今回、5分実時間計測や全操作の自動巡回は行いません。公開後は起動確認のみです。
DOF、水、Stage等の実機操作は従来のRegression Demoで確認してください。

維持する技術的制約：PaperBokehPassはThree Addon内部フィールドを使用。
水面はDOF深度から除外し、約0.029m下の不透明な池底で代替。
Scene破棄・Material所有権・Audio停止・適応品質は将来の作業です。
Engineコードはdemo非依存ですが、デモ素材は同Repositoryの `../assets/` へ依存します。

設計は [ARCHITECTURE.md](ARCHITECTURE.md)、移植予定は
[TARTMAN_MIGRATION.md](docs/TARTMAN_MIGRATION.md) を参照してください。
Phase 1の変更だけ戻す場合は当該コミットに `git revert <commit>` を使用します。
