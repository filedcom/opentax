/**
 * Record the CLI's observable behaviour on every benchmark case, so a runtime
 * migration can prove it changed nothing: capture once on the old runtime,
 * once on the new, and `diff -r` the two directories.
 *
 * Only `node:` built-ins are used, so the same file recorded the golden set
 * under Deno and replays it under Bun.
 *
 * Usage: bun scripts/parity/capture.ts <out-dir> -- <cli command...>
 *   bun scripts/parity/capture.ts /tmp/candidate -- bun cli/main.ts
 *   bun scripts/parity/capture.ts /tmp/candidate -- ./opentax
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { availableParallelism, tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

type Step = {
  readonly argv: readonly string[];
  readonly exit: number | null;
  readonly stdout: string;
  readonly stderr: string;
};
type CaseInput = {
  readonly year: number;
  readonly forms: readonly { node_type: string; data: unknown }[];
};

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const CASES = join(ROOT, "benchmark/cases");
const RETURN_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function parseArgs(argv: readonly string[]) {
  const split = argv.indexOf("--");
  if (split !== 1 || argv.length < 3) {
    throw new Error(
      "Usage: capture.ts <out-dir> -- <cli command...>",
    );
  }
  return { out: resolve(argv[0]), cli: argv.slice(2) };
}

function run(cli: readonly string[], args: readonly string[], cwd: string) {
  return new Promise<Omit<Step, "argv">>((done, fail) => {
    const child = spawn(cli[0], [...cli.slice(1), ...args], {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NO_COLOR: "1" },
    });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => out.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => err.push(chunk));
    child.on("error", fail);
    child.on("close", (exit) =>
      done({
        exit,
        stdout: Buffer.concat(out).toString("utf8"),
        stderr: Buffer.concat(err).toString("utf8"),
      }));
  });
}

/** Leaf directories holding input.json, in byte order of their path. */
async function discover(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  if (entries.some((entry) => entry.name === "input.json")) return [directory];
  const children = entries.filter((entry) => entry.isDirectory())
    .map((entry) => join(directory, entry.name)).sort();
  const nested = await Promise.all(children.map(discover));
  return nested.flat();
}

/**
 * The return ID is random, the working directory temporary and the MeF
 * timestamp the clock; nothing else is masked. The timestamp is masked only
 * in its expected shape, so a differently formatted one is still a difference.
 */
function normalize(text: string, returnId: string | undefined, cwd: string) {
  const masked = text.split(cwd).join("<cwd>").replace(
    /<ReturnTs>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-05:00<\/ReturnTs>/g,
    "<ReturnTs>YYYY-MM-DDThh:mm:ss-05:00</ReturnTs>",
  );
  return returnId ? masked.split(returnId).join("<returnId>") : masked;
}

async function captureCase(cli: readonly string[], caseDir: string) {
  const input = JSON.parse(
    await readFile(join(caseDir, "input.json"), "utf8"),
  ) as CaseInput;
  const cwd = await mkdtemp(join(tmpdir(), "opentax-parity-"));
  const steps: Step[] = [];
  let returnId: string | undefined;
  const step = async (args: readonly string[]) => {
    const result = await run(cli, args, cwd);
    steps.push({ argv: args, ...result });
    return result;
  };
  try {
    const created = await step([
      "return",
      "create",
      "--year",
      String(input.year),
      "--json",
    ]);
    const id = created.exit === 0
      ? (JSON.parse(created.stdout) as { returnId?: unknown }).returnId
      : undefined;
    if (typeof id === "string" && RETURN_ID.test(id)) {
      returnId = id;
      for (const form of input.forms) {
        await step([
          "form",
          "add",
          "--returnId",
          id,
          "--node_type",
          form.node_type,
          JSON.stringify(form.data),
          "--json",
        ]);
      }
      await step(["return", "get", "--returnId", id, "--json"]);
      await step(["return", "validate", "--returnId", id]);
      await step(["return", "export", "--returnId", id, "--type", "mef"]);
    }
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
  return steps.map((s) => ({
    argv: s.argv.map((a) => normalize(a, returnId, cwd)),
    exit: s.exit,
    stdout: normalize(s.stdout, returnId, cwd),
    stderr: normalize(s.stderr, returnId, cwd),
  }));
}

async function pool<T, R>(
  items: readonly T[],
  width: number,
  work: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const lane = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await work(items[index]);
    }
  };
  await Promise.all(Array.from({ length: width }, lane));
  return results;
}

const { out, cli } = parseArgs(process.argv.slice(2));
const cases = await discover(CASES);
await rm(out, { recursive: true, force: true });
const index = await pool(cases, availableParallelism(), async (caseDir) => {
  const steps = await captureCase(cli, caseDir);
  const name = relative(CASES, caseDir);
  const body = JSON.stringify({ case: name, steps }, null, 2) + "\n";
  const file = join(out, `${name}.json`);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, body);
  const failed = steps.filter((s) => s.exit !== 0).length;
  console.log(
    `${
      failed === 0 ? "ok  " : "exit"
    } ${name} (${steps.length} steps, ${failed} non-zero)`,
  );
  return {
    case: name,
    steps: steps.length,
    nonZero: failed,
    sha256: createHash("sha256").update(body).digest("hex"),
  };
});
await writeFile(join(out, "index.json"), JSON.stringify(index, null, 2) + "\n");
const nonZero = index.filter((entry) => entry.nonZero > 0).length;
console.log(
  `${index.length} cases captured to ${out}; ${nonZero} with a non-zero step`,
);
