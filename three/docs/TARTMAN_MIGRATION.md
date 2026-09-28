# Tartman Donor Plan — Phase 1開始

母体は現在のThree MVP、TartmanはDonor / Referenceです。
監査対象: Tartman main `204292c`、Three MVP threejs-ab `d329b25`。
Phase 1ではTartmanの入力解除・ブラウザ停止で有効だった動作だけを
現Engineの構造へ実装しました。Tartmanのコード・素材はコピーしていません。
以降のPhaseは未実装です。

|Phase|予定|境界・完了条件|
|---|---|---|
|1|Lifecycle / Mobile Input|実装済み。解除、停止、復帰の時刻管理。4方向UIは維持|
|2|World / Collision|Grid原点・サイズ・半径を外部化。AREASや池固定値に依存しない|
|3|Grid Navigation / LOS|小規模BFS。移動不可と視界遮断を区別。Enemy依存なし|
|4|8-direction SpriteAnimator|方向行・clipをProfile化。少女/鬼固有データを持たない|
|5|Occlusion|Camera空間で判定。CrossPlaneとDOF深度の整合を保つ|
|6|SceneryBatch|静的・個別Fade不要の景観のみ。StagePropは個別Object|
|7|AudioDirector|再生・Bus管理のみ。心拍、恐怖、鬼AIを持ち込まない|
|8|Optional Adaptive Quality|既定OFF。手動設定とBenchmark条件を勝手に変えない|

鍵、手帳、固定4エリア、AREAS/POINTS/STORIES/BALANCE、鬼AI、難度、HUD、
鳥居/祠固定生成は移植しません。将来のTartman再移植ではgame側に置きます。
既存Paper/Stage/DOF/Waterは置き換えません。
ゲームのBalance Simulationや通し検証はEngineテストに含めず、Tartman再移植時に使います。
Three.js優位/Godot優位の自動判定は行わず、測定条件・結果だけを比較します。
