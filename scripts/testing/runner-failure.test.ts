import { z } from "zod";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { dirname, fromFileUrl, join } from "@std/path";

Deno.test("runner retains terminal failure when a tracked runtime file is missing before discovery", async () => {
  const root = await Deno.makeTempDir();
  const source = dirname(fromFileUrl(import.meta.url));
  const tooling = join(root, "scripts/testing");
  await Deno.mkdir(tooling, { recursive: true });
  for (
    const name of [
      "./run.ts",
      "./contracts.ts",
      "./repository.ts",
      "./permissions.ts",
      "./full-lock.ts",
      "./skip-policy.json",
    ]
  ) {
    await Deno.copyFile(join(source, name), join(tooling, name));
  }
  await Deno.copyFile(join(source, "../../deno.json"), join(root, "deno.json"));
  await Deno.copyFile(join(source, "../../deno.lock"), join(root, "deno.lock"));
  await Deno.writeTextFile(join(root, ".gitignore"), ".state/research/\n");
  await Deno.writeTextFile(
    join(root, "missing.ts"),
    "export const original = true;\n",
  );
  const initialized = await new Deno.Command("git", {
    args: ["init", "-q"],
    cwd: root,
  }).output();
  assertEquals(initialized.code, 0);
  const staged = await new Deno.Command("git", {
    args: ["add", "missing.ts"],
    cwd: root,
  }).output();
  assertEquals(staged.code, 0);
  await Deno.remove(join(root, "missing.ts"));
  const result = await new Deno.Command("deno", {
    args: [
      "run",
      "--allow-read",
      "--allow-write",
      "--allow-run=git,deno",
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
    const entry of Deno.readDir(join(root, ".state/research/testing"))
  ) if (entry.isDirectory) runs.push(entry.name);
  assertEquals(runs.length, 1);
  const evidence = join(root, ".state/research/testing", runs[0]);
  const failure = z.object({
    code: z.literal(1),
    mode: z.literal("preflight"),
    error: z.string(),
  }).parse(JSON.parse(await Deno.readTextFile(join(evidence, "failure.json"))));
  const final = z.object({ code: z.literal(1), endedAt: z.string().min(1) })
    .parse(
      JSON.parse(await Deno.readTextFile(join(evidence, "final-status.json"))),
    );
  assertStringIncludes(failure.error, "missing.ts");
  assertEquals(final.code, 1);
  await Deno.writeFile(join(evidence, "runner.stdout.log"), result.stdout, {
    createNew: true,
    mode: 0o600,
  });
  await Deno.writeFile(join(evidence, "runner.stderr.log"), result.stderr, {
    createNew: true,
    mode: 0o600,
  });
});
