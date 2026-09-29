import * as THREE from 'three';

/**
 * 舞台カメラ。「どこを見るか(look)」と「そこからどれだけ離れるか(offset)」で構図を決める。
 * 追従・寄り・引き・揺れを滑らかにつなぐ。被写界深度の焦点距離もここから出す。
 */
export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  readonly look = new THREE.Vector3(0, 1.1, 0);
  readonly offset = new THREE.Vector3(0, 2.4, 9.5);
  private goalLook = new THREE.Vector3(0, 1.1, 0);
  private goalOffset = new THREE.Vector3(0, 2.4, 9.5);
  private goalFov = 32;
  private follow: THREE.Object3D | null = null;
  private followHeight = 1.1;
  bounds = { minX: -Infinity, maxX: Infinity };
  /** 追従の滑らかさ（大きいほど速く追いつく） */
  stiffness = 3.2;
  private shakeTime = 0;
  private shakeAmp = 0;
  /** 焦点を合わせたい点（無ければ look） */
  focusPoint: THREE.Vector3 | null = null;

  static readonly DEFAULT_OFFSET = new THREE.Vector3(0, 2.05, 8.4);

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(32, aspect, 0.3, 160);
    this.apply();
  }

  /** 対象を追いかける探索用の構図 */
  followTarget(obj: THREE.Object3D, offset = CameraRig.DEFAULT_OFFSET, height = 1.1, fov = 32): void {
    this.follow = obj;
    this.followHeight = height;
    this.goalOffset.copy(offset);
    this.goalFov = fov;
    this.focusPoint = null;
  }

  /** 決まった点を見る構図。追従は解除 */
  shot(look: THREE.Vector3, offset: THREE.Vector3, fov = 32): void {
    this.follow = null;
    this.goalLook.copy(look);
    this.goalOffset.copy(offset);
    this.goalFov = fov;
  }

  snap(): void {
    this.update(0, true);
  }

  shake(amount: number, seconds: number): void {
    this.shakeAmp = amount;
    this.shakeTime = seconds;
  }

  /** カメラから焦点までの距離（被写界深度用） */
  focusDistance(): number {
    return this.camera.position.distanceTo(this.focusPoint ?? this.look);
  }

  update(dt: number, instant = false): void {
    if (this.follow) {
      this.follow.getWorldPosition(this.goalLook);
      this.goalLook.y += this.followHeight;
      // 舞台の端より外は映さない（追従中だけ。演出の構図は制限しない）
      this.goalLook.x = THREE.MathUtils.clamp(this.goalLook.x, this.bounds.minX, this.bounds.maxX);
    }
    const k = instant ? 1 : 1 - Math.exp(-this.stiffness * dt);
    this.look.lerp(this.goalLook, k);
    this.offset.lerp(this.goalOffset, k);
    this.camera.fov += (this.goalFov - this.camera.fov) * k;
    this.camera.updateProjectionMatrix();
    this.apply();
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const a = this.shakeAmp * Math.max(0, this.shakeTime) * 4;
      this.camera.position.x += (Math.random() - 0.5) * a;
      this.camera.position.y += (Math.random() - 0.5) * a;
    }
  }

  private apply(): void {
    this.camera.position.copy(this.look).add(this.offset);
    this.camera.lookAt(this.look);
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
