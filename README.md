# PaperHD2D — MVP / Vertical Slice

2Dの紙素材を3D空間へ置き、カメラ・被写界深度・照明・軽量な舞台演出を検証するGodotプロジェクトです。完成ゲームではありません。1 unit = 1 m。

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

Web書き出しは `exports/web/` と、親フォルダの `PaperHD2D-Web.zip` にあります。ZIPをHTTPS対応の静的ホストへ展開する場合は、`index.html` が公開URLのルートに来るように置き、`.wasm` を `application/wasm` として配信します。`export_presets.cfg` は単一スレッドのWeb設定です。スマートフォンから遊ぶには、この書き出しを**端末が信頼するHTTPS**で配信する必要があります。同じWi-Fi上の単純なHTTP配信ではGodotがSecure Contextエラーで起動しません。

同じWi-FiのiPhoneで試すためのローカルCAとHTTPSサーバーも用意しています。2026-09-28のローカルテスト後、サーバーとFirewall規則は停止・削除しました。**iPhone実機の表示・性能は未確認です。** ローカル配信を再開する場合は、管理者PowerShellでこのフォルダから次を実行します（Privateネットワーク・ローカルサブネット・TCP 8769・専用Node実行ファイルに限定）。

```powershell
pwsh -NoProfile -File tools/lan_firewall.ps1 -Action Enable
```

次に通常のPowerShellでサーバーを起動し、確認中はウィンドウを開いたままにします。現在の証明書は `192.168.0.148` 用です。PCのIPv4アドレスが変わった場合は、証明書の再発行とiPhoneへの再インストールが必要です。中止は **Ctrl+C** です。

```powershell
pwsh -NoProfile -File tools/serve_lan.ps1 -LanIp 192.168.0.148
```

Safariで `https://192.168.0.148:8769/iphone-ca.cer` へアクセスし、このPCの「PaperHD2D Local CA」の公開証明書だけをダウンロードします。証明書の警告を通過できない場合は、同じファイル `.godot/tls/iphone-ca.cer` を別の信頼できる方法でiPhoneへ転送してください。Appleの[プロファイルのインストール手順](https://support.apple.com/ja-jp/102400)に従い、設定の「プロファイルがダウンロードされました」からインストールします。その後、[証明書信頼設定](https://support.apple.com/ja-jp/102390)でこのローカルCAのSSL/TLS完全信頼を有効にします。**秘密鍵（`.key`）は転送しません。**

ローカル接続URLは `https://192.168.0.148:8769/` です。バックグラウンドで起動した場合は `pwsh -NoProfile -File tools/stop_lan.ps1`、上記の通常PowerShellで起動した場合はCtrl+Cで止めます。管理者PowerShellで `pwsh -NoProfile -File tools/lan_firewall.ps1 -Action Disable` を実行すると、このプロジェクトの受信規則だけを削除できます。iPhoneからローカルCAプロファイルも削除できます。証明書は30日で期限切れになります。ローカルURLは現在稼働していません。

PCだけで確認する場合は、`tools/serve-web.cjs` で書き出しを配信できます。`PAPERHD2D_HOST` / `PAPERHD2D_PORT` と、HTTPS用の `PAPERHD2D_TLS_CERT` / `PAPERHD2D_TLS_KEY` を環境変数で指定します。開発用証明書・秘密鍵は `.godot/tls/` に置き、公開用ファイルには含めません。端末接続を始める前に証明書と受信規則を個別に設定・検証してください。実機性能は [PerformanceNotes.md](PerformanceNotes.md) のとおり未測定です。

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
