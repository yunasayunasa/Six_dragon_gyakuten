# Architecture — Engine v1

依存方向は **Game / Demo → Engine**。Engineからdemoへの逆依存は禁止です。
現在のEngineパッケージは既存Repositoryの `three/` です。Godotルートとは別物です。

```text
main.js → demo/startDemo.js
             ├─ demoAssets / demoProfiles / createForest
             ├─ StageEvents → StageDirector / DOFDirector
             ├─ DemoBenchmarkScenario → BenchmarkRecorder
             ├─ Core / Presentation / Runtime defaults
             ├─ Grid Collision / Occlusion / SceneryBatch
             ├─ Audio Hook → AudioDirector
             └─ UI → PerformanceMonitor / 計測結果
```

- Core: Paper、Character、Renderer、静的SceneryBatch、WalkableGrid/Collision/Navigation/LOS。ゲーム進行を持たない。
- Presentation: Camera、DOF、Lighting、Stage、Water、Occlusion、Audio Hook/Director。
- Runtime: Quality既定値、既定OFFのQualityManager、ApplicationLifecycle。
- Performance: カウンター読込・時間集計だけ。Player、Forest、Stage、DOMを知らない。
- UI: 入力Adapterと表示。今回操作や配置を変えない。
- Demo: Forest、トリガー、Stage進行、計測中の自動走行、具象設定。

ApplicationLifecycleはブラウザのblur/focus、visibilitychange、pagehide/pageshow、
手動pauseと経過時間を扱います。描画自体は継続しても、更新dtとBenchmark sampleは
停止中に進めません。Demoが入力resetをcallbackで接続し、RuntimeからUIへはimportしません。
再開直後の最初のframeはdt=0です。AudioDirectorの停止・再開もcallbackで接続します。
デモに音源は同梱しません。

Mobile Inputは既存の4方向ボタンとキー割当を維持します。押下したpointerごとに方向と
capture元を保持し、cancel/blur/非表示/手動pauseで解除します。編集可能な要素へ
入力している間はゲームのショートカットを処理しません。入力側もdisposeできます。
- Optional / Genre: READMEだけ。Coreからの依存・実行コードを追加しない。

`tests/boundaries.test.js` がCore / Presentation / Runtime / Performance内の
静的import、再export、文字列literalのdynamic importを調べ、demo/UIへの依存を禁止します。
現在の相対ES Module importを対象とする簡易検査です。計算で作るimportや新たなaliasを
導入する場合は検査も見直してください。Lint環境は追加していません。

## 設定注入

Camera、DOF、Quality、LightingのEngine Defaultは各機能配下にあります。
Playerの素材固有の縦横比、シート構造、開始座標・移動範囲はdemoが渡します。
Camera/Player/Lightingは既定値へ渡された値を重ねます。
DOF/Qualityは名前付きProfile集合を受け取ります。
Stage/Waterは既存Profileを維持し、数値・Shader・Tweenを変更していません。

## Benchmarkの責務

- PerformanceMonitor: renderer.info、FPS、Frame Time、稼働時間。
- BenchmarkRecorder: advanceで経過時間、sampleでフレーム結果を受け取り集計。
  Warm-up 10秒、本計測300秒、1秒窓のMinimum FPS、設定変更時MIXED。
- DemoBenchmarkScenario: Player/Stage/DOF/StageEventsを知る。
  開始準備、22秒サイクル、自動移動、終了時の探索復帰を担当。
- Stats: 集計器の結果とDOFの設定を文字列化するだけ。

## 維持する境界

StageDirectorはCamera/DOFやゲーム進行を知らず、渡されたPropを動かします。
StageEventsはdemo側でFocus→Motion→Hold→復帰を進行します。
StageのCueは既存AudioHooksを介してAudioDirectorへ渡します。Clip登録はGame/Demo側です。
DOFはCamera-space depthを使い、PaperBokehPassはPNG/Atlasの深度を保持します。
Occlusion中は透過Objectを深度プレパスから外します。Waterの半透明深度回避、
ワイヤーの再利用、Quality/DPR独立指定も維持します。QualityManagerは既定OFFで
DPRだけを変更し、Benchmark中は調整しません。

## 移植した汎用機能

- `core/world`: 座標付きWalkableGrid、半径付き移動、独立した視界mask。
- `core/navigation`: 4方向BFSとGrid LOS。敵AI・マップ固有定数は持たない。
- `core/character/SpriteAnimator`: Idle/Walkを含む任意clipと8方向行に対応。
- `presentation/occlusion`: 個別のPaper/CrossPlaneだけを登録し、Materialは登録時に1回clone。
- `core/scene/SceneryBatch`: 静的な遠景樹木を1 draw callへまとめる。動的/個別透過Objectは対象外。
- `presentation/audio`: Cue Hookと、音源登録・4 Bus・Master・Mute・Pauseの再生層。
- `runtime/quality`: 任意のDPR調整。手動Quality/DOFを上書きしない。

これらはTartmanの実戦知見を参照して新EngineのAPIで実装しました。
Tartmanのコード、4エリア、AI、固有アセットは含みません。

## 今回の対象外

ゲームシステム、AI、Tartman固有世界、見た目の改善、依存更新、Repository新設。

独立したCollision階層等の細分化は、必要になるまで増やしません。
デモ素材の `../assets/` 参照は現Repository構成を維持する意図的な依存です。
