# Paper HD2D — 比較記録

公開URL: https://yunasayunasa.github.io/Six_dragon_gyakuten/

## 計測方法

1. 端末型番、OS、ブラウザ、表示サイズ、コミット、電源状態を記録。横画面で初期位置から動かず、読み込み後10秒待つ。
2. まず両端末をMEDIUMにそろえる。FPSだけでなく表示中のPixel Ratioも記録（上限内では端末DPRに依存）。
3. DOF ONで30秒観察し、FPS / frame timeの代表値と最悪値を記録。同じ構図でOFFへ切り替え、30秒観察。
4. DOF ONのまま舞台ボタンを押し、焦点が木へ滑らかに移動し、Rise後にPlayerへ戻ることを確認。
5. 重い場合LOWで再計測。Safariの縦横回転、UIの高さ変化、2方向同時タッチも確認。

Frame TimeはrequestAnimationFrame間隔の平均で、GPUタイマーではありません。Draw Calls / Trianglesは深度・色・ポスト処理を含む全Pass合計です。DOF ONで数値が増えるのは深度プリパスがあるためです。タブ切替直後の値は捨ててください。

## 実機記録欄

|端末 / OS / Browser / Commit|DOF|Quality|Viewport / DPR|FPS 平均 / 最低|Frame Time 平均 / 最大 ms|Draw Calls|Triangles|見た目・発熱|
|---|---|---|---|---|---|---|---|---|
|Desktop（未計測）|ON|MEDIUM|—|—|—|—|—|—|
|Desktop（未計測）|OFF|MEDIUM|—|—|—|—|—|—|
|iPhone（未計測）|ON|MEDIUM|—|—|—|—|—|—|
|iPhone（未計測）|OFF|MEDIUM|—|—|—|—|—|—|
|iPhone（必要時）|ON|LOW|—|—|—|—|—|—|

## 実装と検証の状態

|項目|状態|確認内容|
|---|---|---|
|DOF実装|PASS|標準BokehShaderがDepth Textureからview-space距離を復元。透過材質にも深度対応|
|補間・順序・深度復元|PASS|Nodeテスト4件（焦点の軸距離、フレーム独立補間、Stage順序、エラー時材質復元）|
|PCブラウザ / 操作 / Rise|PASS|Chromiumで起動、DOF ON/OFF画像、矢印移動、Rise終了と焦点復帰を確認|
|Mobileエミュレーション|PASS|844×390 / DPR3端末設定でMEDIUM・描画DPR1.25、タッチ移動、390×844への回転を確認。実機Safariとは別の検証|
|GitHub Pages|確認中|Actionsと公開URLで確認|
|iPhone Safari実機|SKIPPED|接続された実機を操作できないため、ユーザーによる確認が必要|
|PCハードウェアGPU性能|SKIPPED|自動テストはSwiftShader。実機性能値として転記しない|
|PCとiPhoneの見た目の差|SKIPPED|同じ初期構図で両実機のスクリーンショットが必要|

## 判断時の注意

Three.js側はWebGL2＋標準Bokehを使用し、DOFを最初から削っていません。Godot Web（Compatibility）とはDOFの対応条件が異なります。Godot PC Forward+と比較する場合は解像度、構図、照明も差として記録してください。

画質設定を変えてもBokehのサンプル数は同じです。低解像度の独自DOF、Bloom、動的影、室内や宝箱は今回の範囲に含めません。実機結果が揃うまでは「iPhoneで十分軽い」「PCとの差が小さい」「共通基盤へ採用すべき」と断定しません。
