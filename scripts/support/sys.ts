/**
 * The few file and process operations that have no 1:1 `node:` call,
 * implemented on `node:` built-ins for tests, fixtures and scripts.
 * Product code under `cli/`, `core/` and `forms/` uses `node:` directly.
 *
 * Each function keeps the behaviour the callers were written against:
 * byte reads return a plain `Uint8Array` (not a `Buffer`), stat results carry
 * boolean `isFile`/`isDirectory`/`isSymlink`, and a removed empty directory
 * needs no `recursive` flag.
 */
import {
  type ChildProcess,
  spawn,
  spawnSync,
  type StdioOptions,
} from "node:child_process";
import {
  appendFile,
  lstat as nodeLstat,
  mkdtemp,
  open,
  readdir,
  readFile,
  rm,
  rmdir,
  stat as nodeStat,
  writeFile,
} from "node:fs/promises";
import {
  lstatSync as nodeLstatSync,
  readFileSync,
  type Stats,
  statSync as nodeStatSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { Readable, Writable } from "node:stream";

type WriteOptions = {
  readonly append?: boolean;
  readonly createNew?: boolean;
  readonly mode?: number;
};

export type FileInfo = {
  readonly isFile: boolean;
  readonly isDirectory: boolean;
  readonly isSymlink: boolean;
  readonly size: number;
  readonly mtime: Date | null;
  readonly mode: number | null;
};

export type DirEntry = {
  readonly name: string;
  readonly isFile: boolean;
  readonly isDirectory: boolean;
  readonly isSymlink: boolean;
};

function errorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : undefined;
}

export function isNotFound(error: unknown): boolean {
  return errorCode(error) === "ENOENT";
}

export function isAlreadyExists(error: unknown): boolean {
  return errorCode(error) === "EEXIST";
}

function writeFlag(options: WriteOptions | undefined): string {
  if (options?.createNew) return options.append ? "ax" : "wx";
  return options?.append ? "a" : "w";
}

export async function readBytes(
  path: string | URL,
): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await readFile(path));
}

export function readBytesSync(path: string | URL): Uint8Array<ArrayBuffer> {
  return new Uint8Array(readFileSync(path));
}

export async function writeText(
  path: string | URL,
  text: string,
  options?: WriteOptions,
): Promise<void> {
  if (options?.append && !options.createNew && options.mode === undefined) {
    return await appendFile(path, text);
  }
  await writeFile(path, text, {
    flag: writeFlag(options),
    mode: options?.mode,
  });
}

export async function writeBytes(
  path: string | URL,
  data: Uint8Array | ReadableStream<Uint8Array>,
  options?: WriteOptions,
): Promise<void> {
  const bytes = data instanceof Uint8Array
    ? data
    : new Uint8Array(await new Response(data).arrayBuffer());
  await writeFile(path, bytes, {
    flag: writeFlag(options),
    mode: options?.mode,
  });
}

/** Removes a file, or a directory: an empty one plainly, a full one only when recursive. */
export async function remove(
  path: string | URL,
  options?: { readonly recursive?: boolean },
): Promise<void> {
  if (options?.recursive) return await rm(path, { recursive: true });
  try {
    await rm(path);
  } catch (error) {
    if (errorCode(error) !== "ERR_FS_EISDIR" && errorCode(error) !== "EISDIR") {
      throw error;
    }
    await rmdir(path);
  }
}

type TempOptions = {
  readonly dir?: string;
  readonly prefix?: string;
  readonly suffix?: string;
};

export async function makeTempDir(options?: TempOptions): Promise<string> {
  // mkdtemp appends to its argument, so the directory needs its separator:
  // join("/tmp", "") is "/tmp", which would create "/tmpXXXXXX" beside it.
  const made = await mkdtemp(
    join(options?.dir ?? tmpdir(), sep) + (options?.prefix ?? ""),
  );
  if (!options?.suffix) return made;
  const { rename } = await import("node:fs/promises");
  await rename(made, made + options.suffix);
  return made + options.suffix;
}

export async function makeTempFile(options?: TempOptions): Promise<string> {
  const random = crypto.randomUUID().replaceAll("-", "").slice(0, 16);
  const path = join(
    options?.dir ?? tmpdir(),
    `${options?.prefix ?? ""}${random}${options?.suffix ?? ""}`,
  );
  const handle = await open(path, "wx", 0o600);
  await handle.close();
  return path;
}

function info(stats: Stats): FileInfo {
  return {
    isFile: stats.isFile(),
    isDirectory: stats.isDirectory(),
    isSymlink: stats.isSymbolicLink(),
    size: stats.size,
    mtime: stats.mtime,
    mode: stats.mode,
  };
}

export async function stat(path: string | URL): Promise<FileInfo> {
  return info(await nodeStat(path));
}

export async function lstat(path: string | URL): Promise<FileInfo> {
  return info(await nodeLstat(path));
}

export function statSync(path: string | URL): FileInfo {
  return info(nodeStatSync(path));
}

export function lstatSync(path: string | URL): FileInfo {
  return info(nodeLstatSync(path));
}

export async function* readDir(path: string | URL): AsyncIterable<DirEntry> {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    yield {
      name: entry.name,
      isFile: entry.isFile(),
      isDirectory: entry.isDirectory(),
      isSymlink: entry.isSymbolicLink(),
    };
  }
}

type Stdio = "piped" | "inherit" | "null";

export type CommandOptions = {
  readonly args?: readonly string[];
  readonly cwd?: string | URL;
  readonly env?: Readonly<Record<string, string>>;
  readonly clearEnv?: boolean;
  readonly stdin?: Stdio;
  readonly stdout?: Stdio;
  readonly stderr?: Stdio;
};

export type CommandStatus = {
  readonly success: boolean;
  readonly code: number;
  readonly signal: string | null;
};

export type CommandOutput = CommandStatus & {
  readonly stdout: Uint8Array;
  readonly stderr: Uint8Array;
};

export type ChildHandle = {
  readonly pid: number;
  readonly stdin: WritableStream<Uint8Array>;
  readonly stdout: ReadableStream<Uint8Array>;
  readonly stderr: ReadableStream<Uint8Array>;
  readonly status: Promise<CommandStatus>;
  output(): Promise<CommandOutput>;
  kill(signal?: NodeJS.Signals): void;
};

function stdio(
  value: Stdio | undefined,
  fallback: Stdio,
): "pipe" | "inherit" | "ignore" {
  const chosen = value ?? fallback;
  return chosen === "piped" ? "pipe" : chosen === "null" ? "ignore" : "inherit";
}

function status(code: number | null, signal: string | null): CommandStatus {
  const exit = code ?? (signal ? 1 : 0);
  return { success: exit === 0 && !signal, code: exit, signal };
}

const EMPTY = new Uint8Array();

/** A subprocess: output() pipes stdout and stderr, spawn() inherits them. */
export class Command {
  readonly #command: string;
  readonly #options: CommandOptions;

  constructor(command: string | URL, options: CommandOptions = {}) {
    this.#command = command instanceof URL ? command.pathname : command;
    this.#options = options;
  }

  #spawnOptions(io: StdioOptions) {
    const { cwd, env, clearEnv } = this.#options;
    return {
      cwd: cwd instanceof URL ? cwd.pathname : cwd,
      env: clearEnv ? { ...env } : { ...process.env, ...env },
      stdio: io,
    };
  }

  async output(): Promise<CommandOutput> {
    const child = this.#start("null", "piped", "piped");
    return await child.output();
  }

  outputSync(): CommandOutput {
    const { stdin, stdout, stderr } = this.#options;
    const result = spawnSync(
      this.#command,
      [...(this.#options.args ?? [])],
      this.#spawnOptions([
        stdio(stdin, "null"),
        stdio(stdout, "piped"),
        stdio(stderr, "piped"),
      ]),
    );
    if (result.error) throw result.error;
    return {
      ...status(result.status, result.signal),
      stdout: result.stdout ? new Uint8Array(result.stdout) : EMPTY,
      stderr: result.stderr ? new Uint8Array(result.stderr) : EMPTY,
    };
  }

  spawn(): ChildHandle {
    return this.#start("inherit", "inherit", "inherit");
  }

  #start(inDefault: Stdio, outDefault: Stdio, errDefault: Stdio): ChildHandle {
    const { stdin, stdout, stderr } = this.#options;
    const child: ChildProcess = spawn(
      this.#command,
      [...(this.#options.args ?? [])],
      this.#spawnOptions([
        stdio(stdin, inDefault),
        stdio(stdout, outDefault),
        stdio(stderr, errDefault),
      ]),
    );
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    let streamed = false;
    const done = new Promise<CommandStatus>((resolve, reject) => {
      child.once("error", reject);
      child.once("close", (code, signal) => resolve(status(code, signal)));
    });
    const collect = () => {
      if (!streamed) {
        child.stdout?.on("data", (chunk: Buffer) => out.push(chunk));
        child.stderr?.on("data", (chunk: Buffer) => err.push(chunk));
      }
    };
    queueMicrotask(collect);
    const web = (stream: Readable | null) => {
      streamed = true;
      return stream
        ? Readable.toWeb(stream) as unknown as ReadableStream<Uint8Array>
        : new ReadableStream<Uint8Array>({ start: (c) => c.close() });
    };
    let stdoutWeb: ReadableStream<Uint8Array> | undefined;
    let stderrWeb: ReadableStream<Uint8Array> | undefined;
    let stdinWeb: WritableStream<Uint8Array> | undefined;
    return {
      pid: child.pid ?? -1,
      get stdin() {
        stdinWeb ??= child.stdin
          ? Writable.toWeb(child.stdin) as WritableStream<Uint8Array>
          : new WritableStream<Uint8Array>();
        return stdinWeb;
      },
      get stdout() {
        stdoutWeb ??= web(child.stdout);
        return stdoutWeb;
      },
      get stderr() {
        stderrWeb ??= web(child.stderr);
        return stderrWeb;
      },
      status: done,
      async output() {
        const result = await done;
        return {
          ...result,
          stdout: new Uint8Array(Buffer.concat(out)),
          stderr: new Uint8Array(Buffer.concat(err)),
        };
      },
      kill(signal?: NodeJS.Signals) {
        child.kill(signal ?? "SIGTERM");
      },
    };
  }
}
