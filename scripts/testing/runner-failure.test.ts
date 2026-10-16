import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../support/sys.ts";
import { z } from "zod";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { dirname, join } from "node:path";
import { fileURLToPath as fromFileUrl } from "node:url";

test("runner retains terminal failure when a tracked runtime file is missing before discovery", async () => {
  const root = await sys.makeTempDir();
  const source = dirname(fromFileUrl(import.meta.url));
  const tooling = join(root, "scripts/testing");
  await fs.mkdir(tooling, { recursive: true });
  for (
    const name of [
      "./run.ts",
      "./contracts.ts",
      "./repository.ts",
      "./full-lock.ts",
      "./skip-policy.json",
    ]
  ) {
    await fs.copyFile(join(source, name), join(tooling, name));
  }
  await fs.mkdir(join(root, "scripts/support"), { recursive: true });
  await fs.copyFile(
    join(source, "../support/sys.ts"),
    join(root, "scripts/support/sys.ts"),
  );
  for (const name of ["package.json", "bun.lock", "tsconfig.json"]) {
    await fs.copyFile(join(source, "../..", name), join(root, name));
  }
  await fs.symlink(
    join(source, "../../node_modules"),
    join(root, "node_modules"),
  );
  await fs.writeFile(
    join(root, ".gitignore"),
    ".state/research/\nnode_modules\n",
  );
  await fs.writeFile(
    join(root, "missing.ts"),
    "export const original = true;\n",
  );
  const initialized = await new sys.Command("git", {
    args: ["init", "-q"],
    cwd: root,
  }).output();
  assertEquals(initialized.code, 0);
  const staged = await new sys.Command("git", {
    args: ["add", "missing.ts"],
    cwd: root,
  }).output();
  assertEquals(staged.code, 0);
  await sys.remove(join(root, "missing.ts"));
  const result = await new sys.Command(process.execPath, {
    args: [
      join(tooling, "./run.ts"),
      "preflight",
    ],
    cwd: root,
    stdout: "piped",
    stderr: "piped",
  }).output();
  assertEquals(result.code, 1);
  const runs = [];
  for await (
    const entry of sys.readDir(join(root, ".state/research/testing"))
  ) if (entry.isDirectory) runs.push(entry.name);
  assertEquals(runs.length, 1);
  const evidence = join(root, ".state/research/testing", runs[0]);
  const failure = z.object({
    code: z.literal(1),
    mode: z.literal("preflight"),
    error: z.string(),
  }).parse(
    JSON.parse(await fs.readFile(join(evidence, "failure.json"), "utf8")),
  );
  const final = z.object({ code: z.literal(1), endedAt: z.string().min(1) })
    .parse(
      JSON.parse(
        await fs.readFile(join(evidence, "final-status.json"), "utf8"),
      ),
    );
  assertStringIncludes(failure.error, "missing.ts");
  assertEquals(final.code, 1);
  await sys.writeBytes(join(evidence, "runner.stdout.log"), result.stdout, {
    createNew: true,
    mode: 0o600,
  });
  await sys.writeBytes(join(evidence, "runner.stderr.log"), result.stderr, {
    createNew: true,
    mode: 0o600,
  });
});
