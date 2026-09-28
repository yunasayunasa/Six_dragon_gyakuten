# Paper HD2D — 比較記録

公開URL: https://yunasayunasa.github.io/Six_dragon_gyakuten/

## Phase 2 — iPhone Safari実機記録（未計測）

同じ端末・横画面・同じ場面でDOFを切り替えてください。URLパラメータでDPRとDOF画質を独立指定できます（手順はREADME）。各設定で10秒のWarm-up後、5分Benchmarkを実行します。FPSはブラウザの値であり、ソフトウェア描画の自動テスト値をここへ転記しません。

|設定|DOF|FPS 平均 / 最低|Frame Time 平均 / 最大 ms|Draw Calls|Triangles|Geometries / Textures|メモ|
|---|---|---|---|---|---|---|---|
|MobileLow: DPR 0.85 / DOF Low|ON|—|—|—|—|—|—|
|MobileLow: DPR 0.85 / DOF Low|OFF|—|—|—|—|—|—|
|独立比較: DPR 1.00 / DOF Low|ON|—|—|—|—|—|—|
|MobileMedium: DPR 1.00 / DOF Medium|ON|—|—|—|—|—|—|

|Benchmark 5分（条件を記入）|値|
|---|---|
|端末 / OS / Safari版 / コミット|—|
|DPR / DOF Quality / DOF ON/OFF|—|
|Average FPS / Minimum FPS（1秒区間）|— / —|
|Average Frame Time / Maximum Frame Time|— / — ms|
|Draw Calls / Triangles|— / —|
|Geometries / Textures|— / —|
|Visible Stutter|未確認|
|Crash|未確認|
|Heat（None / Mild / Warm / Hot）|未記録|
|Safari（Stable / Reload / Crash）|未記録|
|Input（Good / Slight delay / Bad）|未記録|

5分・10分時点で温度体感、FPS低下、遅延、Safari再読み込み・クラッシュを手動記録します。Safariの実メモリ量と端末温度は取得しません。途中で設定を切り替えたBenchmarkは`MIXED`となるため、比較表に使う際は再実行してください。

### Water + DOF深度の確認

半透明の水面をBokehの深度プリパスから外し、約0.03m下にある不透明な楕円の底がDepthを提供します。水面が透明でも背景地面の深度を全面に書き換えません。ローカルのChromiumソフトウェアWebGL・MobileLow設定で4条件の画像を目視確認し、描画エラー0、四角い深度境界やPlayerの不自然な切り抜きは見られませんでした。これはiPhone Safariの確認を代替しません。

同じローカルブラウザでDPR 0.85 / DOF LOW、DPR 1.00 / DOF LOW、DPR 1.00 / DOF MEDIUMの独立設定も確認しました。ここで表示されたソフトウェア描画FPSはiPhone性能の比較値に使いません。

|Player位置|Focus位置|ローカル画像確認|iPhone実機|
|---|---|---|---|
|池より手前|池より手前|PASS|未確認|
|池より手前|池より奥|PASS|未確認|
|池より奥|池より手前|PASS|未確認|
|池より奥|池より奥|PASS|未確認|

### Godotとの比較欄

|環境|表示・DOF|FPS / Frame Time|長時間安定性|記録の出所|
|---|---|---|---|---|
|Godot PC Forward+|—|—|—|—|
|Godot Web / iPhone|—|—|—|—|
|Three.js Web / iPhone|—|—|—|—|

現フェーズの実機値が揃うまで優劣を判定しません。Phase 1のiPhone約60fpsはユーザー報告であり、下の旧記録欄には端末条件と数値が保存されていません。

## Phase 1 — 以前の記録

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
|GitHub Pages|PASS|[Actions build/deploy成功](https://github.com/yunasayunasa/Six_dragon_gyakuten/actions/runs/36362730420)。公開HTTPS URLからブラウザSmokeもPASS（2026-09-28、実装commit `f46dd41`）|
|iPhone Safari実機|SKIPPED|接続された実機を操作できないため、ユーザーによる確認が必要|
|PCハードウェアGPU性能|SKIPPED|自動テストはSwiftShader。実機性能値として転記しない|
|PCとiPhoneの見た目の差|SKIPPED|同じ初期構図で両実機のスクリーンショットが必要|

公開URLの自動検証では、JavaScriptエラー0、Rise時の焦点移動17.38→18.77m、終了時Stage blend=0 / 木の角度=0を確認しました。静止画ではDOF ONで前景と遠景がぼけ、OFFで鮮明になることを目視確認しています。初期画面はDOF ONが107 draw calls / 284 triangles、OFFが54 / 143でした。これは複数Passの合計であり、ソフトウェア描画のFPSは上の実機欄へ転記していません。

共通ai-harnessはPASS（テスト4件、build、差分整形、秘密候補0、生成物・デバッグ検査）。自動ゲートの差分範囲・依存レビューSKIPPEDは手動で確認し、追加依存はThree.jsとViteのみ、既存Godotコードとmainは変更していません。Viteの500KB chunk warningはThree.jsを含む初期JS約568KB / gzip約143KBによるもので、ビルドエラーではありません。

## 判断時の注意

Three.js側はWebGL2＋標準Bokehを使用し、DOFを最初から削っていません。Godot Web（Compatibility）とはDOFの対応条件が異なります。Godot PC Forward+と比較する場合は解像度、構図、照明も差として記録してください。

画質設定を変えてもBokehのサンプル数は同じです。低解像度の独自DOF、Bloom、動的影、室内や宝箱は今回の範囲に含めません。実機結果が揃うまでは「iPhoneで十分軽い」「PCとの差が小さい」「共通基盤へ採用すべき」と断定しません。
