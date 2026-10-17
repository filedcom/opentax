import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  affectedTests,
  changedModules,
  closure,
  importGraph,
} from "./affected.ts";
import { benchInputs } from "./bench-cached.ts";
import { failingCases, plan, regressions } from "./changed.ts";

function repo(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "affected-"));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

const files = {
  "core/a.ts": `export const a = 1;`,
  "core/b.ts": `import { a } from "./a.ts"; export const b = a;`,
  "core/table.ts": `export const t = new URL("./rates.json", import.meta.url);`,
  "core/rates.json": `{}`,
  "core/a.test.ts": `import { a } from "./a.ts";`,
  "core/b.test.ts": `import { b } from "./b.ts";`,
  "core/table.test.ts": `import { t } from "./table.ts";`,
  "cli/main.ts":
    `import { b } from "../core/b.ts"; import "./commands/return.ts"; import "./commands/validate.ts";`,
  "cli/commands/return.ts": `import { a } from "../../core/a.ts";`,
  "cli/commands/validate.ts": `import { r } from "../../core/rules.ts";`,
  "core/rules.ts": `export const r = 1;`,
};
const root = repo(files);
const graph = importGraph(root, Object.keys(files));
const tests = Object.keys(files).filter((path) => path.endsWith(".test.ts"));
const exists = (path: string) => path in files;

test("a change selects the tests whose imports reach it", () => {
  const seeds = changedModules(root, graph, ["core/a.ts"], exists);
  expect(affectedTests(graph, tests, seeds)).toEqual([
    "core/a.test.ts",
    "core/b.test.ts",
  ]);
  const leaf = changedModules(root, graph, ["core/b.ts"], exists);
  expect(affectedTests(graph, tests, leaf)).toEqual(["core/b.test.ts"]);
});

test("a data file selects the tests reaching the modules that name it", () => {
  const seeds = changedModules(root, graph, ["core/rates.json"], exists);
  expect(affectedTests(graph, tests, seeds)).toEqual(["core/table.test.ts"]);
});

test("untraceable, deleted or shared inputs select every test", () => {
  expect(changedModules(root, graph, ["core/unnamed.json"], exists)).toBe(
    "everything",
  );
  expect(changedModules(root, graph, ["core/gone.ts"], exists)).toBe(
    "everything",
  );
  expect(changedModules(root, graph, ["package.json"], exists)).toBe(
    "everything",
  );
  expect(affectedTests(graph, tests, "everything")).toEqual(tests);
});

test("documentation selects nothing", () => {
  expect(
    affectedTests(
      graph,
      tests,
      changedModules(root, graph, ["docs/x.md"], exists),
    ),
  ).toEqual([]);
});

test("bench inputs cover the CLI closure, runtime data and the year's cases only", () => {
  const all = [
    ...Object.keys(files),
    "benchmark/run_benchmark.ts",
    "benchmark/cases/f1040/2025/x/input.json",
    "benchmark/cases/f1040/2024/y/input.json",
    "docs/x.md",
    "package.json",
  ];
  const inputs = benchInputs(all, graph, "f1040", "2025");
  expect(inputs).toContain("core/a.ts");
  expect(inputs).toContain("core/rates.json");
  expect(inputs).toContain("benchmark/cases/f1040/2025/x/input.json");
  expect(inputs).toContain("package.json");
  expect(inputs).not.toContain("benchmark/cases/f1040/2024/y/input.json");
  expect(inputs).not.toContain("core/a.test.ts");
  expect(inputs).not.toContain("docs/x.md");
  // Rules load with the CLI but only validate and export run them.
  expect(closure(graph, "cli/main.ts").has("core/rules.ts")).toBe(true);
  expect(inputs).not.toContain("core/rules.ts");
});

test("runtime changes add the MeF, CLI and bench gates", () => {
  const names = (gates: string[][]) => gates.map((gate) => gate[0]);
  expect(names(plan("origin/main", ["docs/x.md"], false))).not.toContain(
    "check:cli",
  );
  expect(names(plan("origin/main", ["cli/main.ts"], true))).toEqual(
    expect.arrayContaining([
      "check:sandbox",
      "check:mef",
      "check:cli",
    ]),
  );
});

test("bench fails only on a case that passes at the base", () => {
  const summary = (failing: string[]) => ({
    stdout: `table\n${JSON.stringify({ failing })}\n`,
  });
  const base = failingCases(summary(["a", "b"]))!,
    head = failingCases(summary(["b", "c"]))!;
  expect(regressions(base, head)).toEqual(["c"]);
  expect(failingCases({ stdout: "crashed" })).toBeNull();
});
