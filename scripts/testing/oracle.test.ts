import { assert, assertEquals } from "@std/assert";
import { join } from "@std/path";
import {
  caseChanges,
  caseKey,
  type Ledger,
  ledgerProblems,
  oracleReport,
} from "./oracle.ts";

const product = "f1040/2025";
const name = "124-mfj-1099r-rrb1099-interest";
const expected = (agi: number) => ({
  source: "IRS Pub 17 TY2025 Ch. 7 Example 3, p. 64",
  correct: {
    line11_agi: agi,
    line24_total_tax: 0,
    line35a_refund: 0,
    line37_amount_owed: 0,
  },
});
const entry = (source: string): Ledger[number] => ({
  case: name,
  line: "line11_agi",
  before: 31000,
  after: 31500,
  source,
  approvedBy: "a7ul",
  on: "2026-10-16",
});

Deno.test("a case is identified by its product and directory", () => {
  assertEquals(
    caseKey("benchmark/cases/f1040/2025/01-single/correct.json"),
    { product: "f1040/2025", case: "01-single" },
  );
  assertEquals(
    caseKey("benchmark/cases/f1040/2025/01-single/input.json"),
    undefined,
  );
  assertEquals(caseKey("benchmark/reference/2025/x.json"), undefined);
});

Deno.test("changes are the scored lines that differ, plus added and removed cases", () => {
  assertEquals(
    caseChanges(product, name, expected(31000), expected(31000)),
    [],
  );
  assertEquals(caseChanges(product, name, expected(31000), expected(31500)), [{
    kind: "value",
    product,
    case: name,
    line: "line11_agi",
    before: 31000,
    after: 31500,
  }]);
  assertEquals(caseChanges(product, name, undefined, expected(1)), [{
    kind: "added",
    product,
    case: name,
    cited: true,
  }]);
  assertEquals(
    caseChanges(product, name, undefined, { correct: expected(1).correct }),
    [{ kind: "added", product, case: name, cited: false }],
  );
  assertEquals(caseChanges(product, name, expected(1), undefined), [{
    kind: "removed",
    product,
    case: name,
  }]);
});

Deno.test("an expected value changed to what the engine computes is refused unless a publication is cited", () => {
  const change = caseChanges(product, name, expected(31000), expected(31500));
  const uncited = ledgerProblems(change, new Map());
  assertEquals(uncited.map((p) => [p.kind, p.line]), [[
    "uncited-change",
    "line11_agi",
  ]]);
  assert(uncited[0].fix.includes("benchmark/cases/f1040/2025/ledger.json"));
  assertEquals(
    ledgerProblems(
      change,
      new Map([[product, [entry("engine-computed SSA taxability")]]]),
    ).map((p) => p.kind),
    ["engine-source"],
  );
  assertEquals(
    ledgerProblems(
      change,
      new Map([[product, [entry("IRS Pub 915 worksheet 1, p. 16")]]]),
    ),
    [],
  );
  assertEquals(
    ledgerProblems(
      change,
      new Map([[product, [{ ...entry("IRS Pub 915"), after: 31400 }]]]),
    ).map((p) => p.kind),
    ["uncited-change"],
  );
});

Deno.test("a new case needs a source and a removed case needs a ledger entry", () => {
  assertEquals(
    ledgerProblems(
      [{ kind: "added", product, case: name, cited: false }],
      new Map(),
    )
      .map((p) => p.kind),
    ["missing-source"],
  );
  assertEquals(
    ledgerProblems(
      [{ kind: "added", product, case: name, cited: true }],
      new Map(),
    ),
    [],
  );
  const removed = [{ kind: "removed" as const, product, case: name }];
  assertEquals(ledgerProblems(removed, new Map()).map((p) => p.kind), [
    "uncited-removal",
  ]);
  assertEquals(
    ledgerProblems(
      removed,
      new Map([[product, [{
        case: name,
        source: "Duplicate of Pub 17 Example 2",
        approvedBy: "a7ul",
        on: "2026-10-16",
      }]]]),
    ),
    [],
  );
});

async function run(root: string, args: string[]) {
  const result = await new Deno.Command("git", { args, cwd: root }).output();
  assert(result.success, args.join(" "));
}

Deno.test("against a git base, an uncommitted edit to an expected value is caught until the ledger cites it", async () => {
  const root = await Deno.makeTempDir();
  const dir = join(root, "benchmark/cases", product, name);
  await Deno.mkdir(dir, { recursive: true });
  await Deno.writeTextFile(join(dir, "input.json"), "{}");
  await Deno.writeTextFile(
    join(dir, "correct.json"),
    JSON.stringify(expected(31000)),
  );
  await run(root, ["init", "-q"]);
  await run(root, ["-c", "user.email=t@t", "-c", "user.name=t", "add", "."]);
  await run(root, [
    "-c",
    "user.email=t@t",
    "-c",
    "user.name=t",
    "commit",
    "-q",
    "-m",
    "case",
  ]);
  assertEquals((await oracleReport(root, "HEAD")).problems, []);

  await Deno.writeTextFile(
    join(dir, "correct.json"),
    JSON.stringify(expected(31500)),
  );
  const caught = await oracleReport(root, "HEAD");
  assertEquals(caught.changes.length, 1);
  assertEquals(caught.problems.map((p) => p.kind), ["uncited-change"]);

  await Deno.writeTextFile(
    join(root, "benchmark/cases", product, "ledger.json"),
    JSON.stringify([entry("IRS Pub 915 worksheet 1, p. 16")]),
  );
  assertEquals((await oracleReport(root, "HEAD")).problems, []);
});
