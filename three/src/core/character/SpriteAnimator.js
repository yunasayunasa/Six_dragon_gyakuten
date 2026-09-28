// Atlas state is per character. A cloned texture prevents one actor's UV offset
// from changing every other actor that uses the same source image.
export class SpriteAnimator {
  constructor(texture, { columns, rows, clips, directionRows = null }) {
    if (!Number.isInteger(columns) || columns < 1 || !Number.isInteger(rows) || rows < 1) throw Error('Invalid sprite atlas');
    this.texture = texture;
    this.columns = columns; this.rows = rows;
    this.clips = clips;
    this.directionRows = directionRows;
    this.state = 'Idle'; this.time = 0; this.direction = 0; this.frame = 0;
    texture.repeat.set(1 / columns, 1 / rows);
    this.show(0);
  }

  setState(name) {
    if (!this.clips[name]) throw Error(`Unknown sprite state: ${name}`);
    if (this.state !== name) { this.state = name; this.time = 0; this.show(0); }
  }

  setFacing(x, z, cameraYaw = 0) {
    if (!this.directionRows || (x === 0 && z === 0)) return;
    this.direction = ((Math.round((Math.atan2(x, z) - cameraYaw) / (Math.PI / 4)) % 8) + 8) % 8;
    this.show(this.frame);
  }

  show(frame) {
    const clip = this.clips[this.state];
    const index = (clip.start ?? 0) + frame;
    const row = this.directionRows ? this.directionRows[this.direction] + (clip.rowOffset ?? 0) : Math.floor(index / this.columns);
    const column = this.directionRows ? index : index % this.columns;
    if (row < 0 || row >= this.rows || column < 0 || column >= this.columns) throw Error('Sprite frame outside atlas');
    this.frame = frame;
    this.texture.offset.set(column / this.columns, 1 - (row + 1) / this.rows);
  }

  update(dt) {
    const clip = this.clips[this.state];
    this.time += dt;
    const count = clip.frames ?? 1;
    const index = Math.floor(this.time * (clip.fps ?? 0));
    this.show(clip.loop === false ? Math.min(count - 1, index) : index % count);
  }
}
