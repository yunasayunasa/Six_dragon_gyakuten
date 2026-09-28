# Architecture — Phase 0

依存方向は **Game / Demo → Engine**。Engineからdemoへの逆依存は禁止です。
現在のEngineパッケージは既存Repositoryの `three/` です。Godotルートとは別物です。

```text
main.js → demo/startDemo.js
             ├─ demoAssets / demoProfiles / createForest
             ├─ StageEvents → StageDirector / DOFDirector
             ├─ DemoBenchmarkScenario → BenchmarkRecorder
             ├─ Core / Presentation / Runtime defaults
             └─ UI → PerformanceMonitor / 計測結果
```

- Core: Paper、Character、Rendererの基礎。ゲーム進行を持たない。
- Presentation: Camera、DOF、Lighting、Stage、Water、Audio Hook。
- Runtime: Quality既定値のみ。Lifecycle/Adaptive Qualityはまだ追加しない。
- Performance: カウンター読込・時間集計だけ。Player、Forest、Stage、DOMを知らない。
- UI: 入力Adapterと表示。今回操作や配置を変えない。
- Demo: Forest、トリガー、Stage進行、計測中の自動走行、具象設定。
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
StageのCueは既存AudioHooksを介します。Audio本実装は行いません。
DOFはCamera-space depthを使い、PaperBokehPassはPNG/Atlasの深度を保持します。
Waterの半透明深度回避、ワイヤーの再利用、Quality/DPR独立指定も維持します。

## 今回の対象外

Collision、Navigation、8方向Sprite、Occlusion、Batch、AudioDirector、Lifecycle、
Adaptive Quality、ゲームシステム、見た目の改善、依存更新、Repository新設。

`src/core/world`等の予約先はREADMEのみです。独立したCollision階層などは、
実装が必要になるまで増やしません。デモ素材の `../assets/` 参照は現Repository構成を維持する意図的な依存です。
