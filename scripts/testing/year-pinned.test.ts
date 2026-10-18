import { test } from "bun:test";
import { assert, assertEquals } from "@std/assert";
import { dirname } from "node:path";
import { fileURLToPath as fromFileUrl } from "node:url";
import {
  applyYearBaseline,
  readYearBaseline,
  shrunkYearBaseline,
  stripComments,
  yearHits,
  YearPattern,
  yearReport,
  yearScanned,
} from "./year-pinned.ts";

const root = dirname(dirname(dirname(fromFileUrl(import.meta.url))));
const node = "forms/f1040/nodes/inputs/adjustments/education/educator_expenses/index.ts";

const patterns = (text: string) =>
  yearHits(node, text).map((hit) => hit.pattern);

test("each year-pinning form is recognised, in code but not in comments", () => {
  assertEquals(patterns("const c = CONFIG_BY_YEAR[2025];"), [
    YearPattern.ConfigIndex,
  ]);
  assertEquals(patterns("if (ctx.taxYear === 2025) return;"), [
    YearPattern.YearComparison,
  ]);
  assertEquals(patterns("if (2026 !== taxYear) return;"), [
    YearPattern.YearComparison,
  ]);
  assertEquals(patterns("run({ taxYear: 2025, formType })"), [
    YearPattern.YearValue,
  ]);
  assertEquals(patterns("const s = { year: 2026 };"), [YearPattern.YearValue]);
  assertEquals(patterns("tax_year: z.literal(2025),"), [
    YearPattern.ZodLiteral,
  ]);
  assertEquals(patterns('const due = "2025-04-15";'), [YearPattern.DatePinned]);
  assertEquals(patterns("const d = /^2025-\\d{2}-\\d{2}$/;"), [
    YearPattern.DatePinned,
  ]);
  assertEquals(patterns("const made_in_2026_for_2025 = 0;"), [
    YearPattern.YearIdentifier,
  ]);
  assertEquals(patterns("input.issued_in_2025 ?? false"), [
    YearPattern.YearIdentifier,
  ]);
  assertEquals(patterns("// CONFIG_BY_YEAR[2025] and taxYear === 2025"), []);
  assertEquals(patterns("/* z.literal(2025) */ const x = 1;"), []);
  assertEquals(patterns("const url = 'https://irs.gov/x'; // 2025-04-15"), []);
});

test("onset gates, the year from the context and statute dates are not pins", () => {
  assertEquals(patterns("if (ctx.taxYear >= 2026) return floor(input);"), []);
  assertEquals(patterns("CONFIG_BY_YEAR[ctx.taxYear].educatorExpenseLimit"), []);
  assertEquals(patterns('const tcja = "2017-12-22";'), []);
  assertEquals(patterns('const schema = "2025v5.4";'), []);
});

test("comment stripping keeps strings, regexes and line numbers", () => {
  const text =
    "const a = \"//no\";\nconst r = /[\"']\\/\\//; // gone\n/* x\ny */z";
  const stripped = stripComments(text);
  assertEquals(stripped.split("\n").length, text.split("\n").length);
  assert(stripped.includes('"//no"'));
  assert(stripped.includes("/[\"']\\/\\//;"));
  assert(!stripped.includes("gone"));
  assert(stripped.endsWith("z"));
});

test("shared code is scanned; tests, fixtures and the year config are not", () => {
  assert(yearScanned(node));
  assert(yearScanned("forms/f1040/2025/mef/forms/income/wages/w2.ts"));
  assert(yearScanned("forms/f1040/2025/pdf/forms/income/wages/w2.ts"));
  assert(yearScanned("forms/f1040/2025/domains/income/wages/w2/source.ts"));
  assert(yearScanned("forms/f1040/2025/return-processing/pending.ts"));
  assert(yearScanned("forms/f1040/nodes/config/types.ts"));
  assert(!yearScanned("forms/f1040/nodes/config/2025.ts"));
  assert(!yearScanned("forms/f1040/nodes/config/2026.ts"));
  assert(!yearScanned(node.replace("index.ts", "index.test.ts")));
  assert(
    !yearScanned("forms/f1040/2025/domains/credits/business/form3800/form8911_bonus_fixture.ts"),
  );
  assert(!yearScanned("forms/f1040/2026/index.ts"));
  assert(!yearScanned("forms/f1040/e2e/ats/ty2026-ats.ts"));
});

test("the checkout passes on its baseline", async () => {
  const report = await yearReport(root);
  assertEquals(report.problems, []);
  assert(report.baseline.length > 0);
});

test("a CONFIG_BY_YEAR[2025] planted in a node fails with file:line and the fix", async () => {
  const report = await yearReport(root);
  const planted = yearHits(
    node,
    "import { CONFIG_BY_YEAR } from '../config/index.ts';\nconst cap = CONFIG_BY_YEAR[2025].educatorExpenseLimit;",
  );
  const problems = applyYearBaseline(
    [...report.hits, ...planted],
    report.baseline,
  );
  assertEquals(problems.map((p) => [p.kind, p.path, p.pattern, p.lines]), [[
    "year-pinned",
    node,
    YearPattern.ConfigIndex,
    [2],
  ]]);
  assert(problems[0].message.includes(`${node}:2 CONFIG_BY_YEAR[2025]`));
  assertEquals(
    problems[0].fix,
    "read the year from ctx.taxYear / CONFIG_BY_YEAR[ctx.taxYear]",
  );
});

test("a fixed baseline entry is reported as removable, and shrinking drops it", async () => {
  const baseline = await readYearBaseline(root);
  const report = await yearReport(root, baseline);
  const fixed = baseline[0];
  const remaining = report.hits.filter((hit) =>
    !(hit.path === fixed.path && hit.pattern === fixed.pattern)
  );
  const problems = applyYearBaseline(remaining, baseline);
  assertEquals(problems.map((p) => [p.kind, p.path, p.pattern]), [[
    "stale-year-baseline",
    fixed.path,
    fixed.pattern,
  ]]);
  assert(problems[0].fix.startsWith("Remove it from"));
  const shrunk = shrunkYearBaseline(remaining, baseline);
  assertEquals(shrunk.length, baseline.length - 1);
  assertEquals(applyYearBaseline(remaining, shrunk), []);
});

test("one more occurrence in a baselined file fails; one fewer asks to lower the count", () => {
  const hit = yearHits(node, "const c = CONFIG_BY_YEAR[2025];")[0];
  const baseline = [{ path: node, pattern: YearPattern.ConfigIndex, count: 1 }];
  assertEquals(applyYearBaseline([hit], baseline), []);
  assertEquals(
    applyYearBaseline([hit, { ...hit, line: 9 }], baseline).map((p) => p.kind),
    ["year-pinned"],
  );
  const lower = applyYearBaseline([hit], [{ ...baseline[0], count: 2 }]);
  assertEquals(lower.map((p) => p.kind), ["stale-year-baseline"]);
  assert(lower[0].fix.startsWith("Lower its count to 1"));
});
