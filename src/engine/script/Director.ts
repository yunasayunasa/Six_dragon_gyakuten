import { parseScript, type ScriptCommand } from './parser';

export type CommandHandler = (args: string[], cmd: ScriptCommand) => Promise<void> | void;

export interface DirectorHooks {
  say(speaker: string | null, expr: string | null, text: string): Promise<void>;
}

/**
 * 台本を上から順に実行する係。
 * 命令は register() で後から足せる。エンジン共通の命令（カメラ・効果音など）と、
 * ジャンル固有の命令（証拠を渡す等）を同じ台本に混ぜられる。
 */
export class Director {
  private handlers = new Map<string, CommandHandler>();
  private cache = new Map<string, ScriptCommand[]>();
  running = 0;
  /** 台本の中で知らない命令が出たら例外にする（開発中に誤字を見つけるため） */
  strict = true;

  constructor(private hooks: DirectorHooks) {}

  register(name: string, fn: CommandHandler): this {
    this.handlers.set(name, fn);
    return this;
  }

  has(name: string): boolean {
    return this.handlers.has(name);
  }

  compile(source: string): ScriptCommand[] {
    let c = this.cache.get(source);
    if (!c) {
      c = parseScript(source);
      this.cache.set(source, c);
    }
    return c;
  }

  /** 使われている命令がすべて登録済みか確認する（テスト用） */
  unknownCommands(source: string): string[] {
    return [...new Set(this.compile(source).filter((c) => c.op === 'cmd' && !this.handlers.has(c.name)).map((c) => (c as { name: string }).name))];
  }

  async play(source: string): Promise<void> {
    this.running++;
    try {
      for (const cmd of this.compile(source)) {
        if (cmd.op === 'say') {
          await this.hooks.say(cmd.speaker, cmd.expr, cmd.text);
          continue;
        }
        const h = this.handlers.get(cmd.name);
        if (!h) {
          if (this.strict) throw new Error(`${cmd.line}行目: 知らない命令 @${cmd.name}`);
          continue;
        }
        await h(cmd.args, cmd);
      }
    } finally {
      this.running--;
    }
  }
}
