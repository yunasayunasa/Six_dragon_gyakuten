# MVP Checklist

チェックは実装済みかつPC上で機能確認した範囲です。ヘッドレス検証と実描画の証拠は`validation/`。実機別の制約はPerformanceNotes.mdを参照してください。

- [x] Player Sprite Sheet — 提供5×5シートから25フレーム
- [x] Sprite animation — Walk / Idle（Idleは静止保持）
- [x] Paper Edge — 事前生成＋初回生成キャッシュ
- [x] Contact Shadow — 軽量な透過Plane
- [x] Billboard — 草・花・小物、Y / Full / None
- [x] Cross Plane — 2枚交差の木・茂み
- [x] Paper Mesh — Front / Back / Side / 厚み
- [x] Stage Rise — 最初の木
- [x] Stage Fall — 扉と自動テスト
- [x] Drop From Wire — 吊り看板と収束する揺れ
- [x] 3D Ground — 衝突付きMesh
- [x] Seamless Ground Texture — 草・土・木床、ミップマップ
- [x] Decal — 苔3枚。Compatibilityは代替Plane
- [x] 3D Building — 低ポリ仮家＋PackedScene差し替え口
- [x] Paper Door — 薄板とFall
- [x] 3D Water — UV Scroll、透明、Specular
- [x] Foreground — 葉を含む手前の木、DOFと遮蔽回避
- [x] Background — 森のPlane群
- [x] Far Background — 山と空のPlane
- [x] DOF — 前景/背景のBlurとGameplayのSharp範囲
- [x] Focus Transition — カメラ移動を含めTweenで補間
- [x] Fog — 薄い距離Fog
- [x] Lighting Outdoor — Directional＋Ambient＋影
- [x] Lighting Indoor — Warm Point＋Window Spot
- [x] Dramatic Lighting — 基準照明から減光しSpot、終了時復帰
- [x] Wind — 草・看板・木の微小な揺れ
- [x] Particle3D — Dust / Treasure Light
- [x] Camera Director — Exploration / Indoor / Event
- [x] Stage Director — 軽量Tween
- [x] DOF Director — Exploration / Indoor / StageEvent
- [x] Lighting Director — OutdoorDay / IndoorWarm / StageEvent
- [x] Basic Audio Hooks — 6種類、ガイド実行でも発火
- [x] Indoor / Outdoor Transition — 扉から室内へのFadeと照明補間

追加のMVP確認:

- [x] 遮蔽物のAlpha低下と復帰
- [x] 2D Graphic FlashとPaper Item PopUp
- [x] FPS / Frame Time / Draw Calls / Visible Objects
- [x] Profile / Inspector / Editor配置見本
- [x] Optional / Genreは空の拡張先のみ
- [x] 30〜60秒のガイド再生 — 約30秒
- [ ] スマートフォン実機 / Webの性能 — SKIPPED、今回のPC検証と区別
- [ ] 音源付きSEの聴取 — SKIPPED、音源未提供
