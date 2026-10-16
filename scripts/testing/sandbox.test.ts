import { test } from "bun:test";
import * as fs from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { assertEquals } from "@std/assert";
import { inspectSandbox } from "./sandbox.ts";

async function fixture(files: Record<string, string>) {
  const root = await fs.mkdtemp(join(tmpdir(), "sandbox-"));
  for (const [name, text] of Object.entries(files)) {
    await fs.mkdir(join(root, name, ".."), { recursive: true });
    await fs.writeFile(join(root, name), text);
  }
  return root;
}

test("sandbox check follows imports and rejects every escape from fetch", async () => {
  const root = await fixture({
    "cli/main.ts": [
      'import { helper } from "./helper.ts";',
      'import { readFile } from "node:fs/promises";',
      "export const run = () => helper(readFile);",
    ].join("\n"),
    "cli/helper.ts": [
      'import { spawn } from "node:child_process";',
      'import "node:net";',
      'import ffi from "bun:ffi";',
      'export const helper = (f: unknown) => [f, spawn, ffi, Bun.spawn, eval("1")];',
      "const name = 'x'; export const lazy = () => import(name);",
    ].join("\n"),
  });
  const { modules, problems } = inspectSandbox(root, "cli/main.ts");
  assertEquals(modules, ["cli/helper.ts", "cli/main.ts"]);
  assertEquals(problems.map((p) => `${p.module}: ${p.problem}`).sort(), [
    "cli/helper.ts: has a non-literal import()",
    "cli/helper.ts: imports bun:ffi",
    "cli/helper.ts: imports node:child_process",
    "cli/helper.ts: imports node:net",
    "cli/helper.ts: uses \\bBun\\.(spawn|spawnSync|\\$|connect|listen|serve|udpSocket|dlopen|plugin|Worker)\\b",
    "cli/helper.ts: uses \\beval\\s*\\(",
  ]);
  await fs.rm(root, { recursive: true });
});

test("the shipped binary passes its own sandbox", () => {
  const { modules, problems } = inspectSandbox();
  assertEquals(problems, []);
  assertEquals(modules.includes("cli/network.ts"), true);
});
