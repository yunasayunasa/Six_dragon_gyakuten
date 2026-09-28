# Tartman Donor Plan — Engine v1移植状況

母体は現在のThree MVP、TartmanはDonor / Referenceです。
監査対象: Tartman main `204292c`、Three MVP threejs-ab `d329b25`。
Phase 1–8は現Engineの境界に沿って実装しました。Tartmanのコード・素材はコピーしていません。
音源と8方向シートは同梱しないため、それぞれの実機再生・表示は今後Game側で確認します。

|Phase|予定|境界・完了条件|
|---|---|---|
|1|Lifecycle / Mobile Input|実装済み。解除、停止、復帰の時刻管理。4方向UIは維持|
|2|World / Collision|実装済み。Grid原点・サイズ・半径を外部化。池の配置はdemo側|
|3|Grid Navigation / LOS|実装済み。小規模BFS、通行と視界maskを分離|
|4|8-direction SpriteAnimator|実装済み。方向行・clipをProfile化。デモは従来の5×5シート|
|5|Occlusion|実装済み。画面重なり判定、CrossPlane、DOF深度回避|
|6|SceneryBatch|実装済み。静的遠景樹木9本のみ。StagePropは個別Object|
|7|AudioDirector|実装済み。音源登録・Bus管理・Pause。デモ音源なし|
|8|Optional Adaptive Quality|実装済み。既定OFF、DPRのみ、Benchmark停止|

鍵、手帳、固定4エリア、AREAS/POINTS/STORIES/BALANCE、鬼AI、難度、HUD、
鳥居/祠固定生成は移植しません。将来のTartman再移植ではgame側に置きます。
既存Paper/Stage/DOF/Waterは置き換えません。
ゲームのBalance Simulationや通し検証はEngineテストに含めず、Tartman再移植時に使います。
Three.js優位/Godot優位の自動判定は行わず、測定条件・結果だけを比較します。
