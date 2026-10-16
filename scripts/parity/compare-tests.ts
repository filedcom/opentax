/**
 * Compare a Bun JUnit report with the Deno golden outcome of every test,
 * test by test. Every changed outcome is listed; totals alone prove nothing.
 *
 * Usage: bun scripts/parity/compare-tests.ts <bun-junit.xml> [--json]
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { XMLParser } from "fast-xml-parser";

type Outcome = "passed" | "ignored" | `failed:${string}`;
type Golden = { tests: [module: string, name: string, outcome: Outcome][] };

const GOLDEN = join(
  dirname(fileURLToPath(import.meta.url)),
  "golden/tests/full-suite.json",
);
/** Deno reports tests under the file that calls Deno.test; Bun under the test file. */
const REGISTERED_BY: Record<string, string> = {
  "forms/f1040/2025/domains/deductions/business/form8995a/form8995a_sstb_financial.test.ts":
    "forms/f1040/2025/domains/deductions/business/form8995a/form8995a_sstb_service_checks.ts",
  "forms/f1040/2025/domains/deductions/business/form8995a/form8995a_sstb_identity.test.ts":
    "forms/f1040/2025/domains/deductions/business/form8995a/form8995a_sstb_service_checks.ts",
  "forms/f1040/2025/domains/deductions/business/form8995a/form8995a_sstb_professional.test.ts":
    "forms/f1040/2025/domains/deductions/business/form8995a/form8995a_sstb_service_checks.ts",
  "forms/f1040/2025/domains/deductions/business/form8995a/form8995a_sstb_services.test.ts":
    "forms/f1040/2025/domains/deductions/business/form8995a/form8995a_sstb_service_checks.ts",
};

type Case = Record<string, unknown> & { "@_name": string };
type Suite = {
  "@_name": string;
  testcase?: Case | Case[];
  testsuite?: Suite | Suite[];
};
const list = <T>(v: T | T[] | undefined): T[] =>
  Array.isArray(v) ? v : v === undefined ? [] : [v];

function bunOutcome(test: Case): Outcome {
  if ("skipped" in test) return "ignored";
  const failure = (test.failure ?? test.error) as
    | { "@_message"?: string; "#text"?: string }
    | string
    | undefined;
  if (failure === undefined) return "passed";
  const text = typeof failure === "string"
    ? failure
    : `${failure["@_message"] ?? ""} ${failure["#text"] ?? ""}`;
  if (/\.state\/research|IMF_Series|complete local XSD/.test(text)) {
    return "failed:research-docs";
  }
  return "failed:other";
}

function bunTests(xml: string): [string, string, Outcome][] {
  const parsed = new XMLParser({ ignoreAttributes: false }).parse(xml) as {
    testsuites: { testsuite: Suite | Suite[] };
  };
  const out: [string, string, Outcome][] = [];
  const visit = (file: string, suite: Suite) => {
    for (const test of list(suite.testcase)) {
      out.push([REGISTERED_BY[file] ?? file, test["@_name"], bunOutcome(test)]);
    }
    for (const child of list(suite.testsuite)) visit(file, child);
  };
  for (const suite of list(parsed.testsuites.testsuite)) {
    visit(suite["@_name"].replace(/^\.\//, ""), suite);
  }
  return out;
}

/** Pairs equal (module, name) keys in order, so repeated names still compare one to one. */
export function compareTests(
  golden: Golden["tests"],
  bun: [string, string, Outcome][],
) {
  const key = (module: string, name: string) => JSON.stringify([module, name]);
  const remaining = new Map<string, Outcome[]>();
  for (const [module, name, outcome] of bun) {
    const k = key(module, name);
    remaining.set(k, [...(remaining.get(k) ?? []), outcome]);
  }
  const changes: {
    module: string;
    name: string;
    deno: Outcome;
    bun: Outcome | "missing";
  }[] = [];
  for (const [module, name, deno] of golden) {
    const queue = remaining.get(key(module, name)) ?? [];
    const found = queue.shift();
    if (found === undefined) {
      changes.push({ module, name, deno, bun: "missing" });
    } else if (found !== deno) changes.push({ module, name, deno, bun: found });
  }
  let added = [...remaining].flatMap(([k, outcomes]) =>
    outcomes.map((bun) => {
      const [module, name] = JSON.parse(k) as [string, string];
      return { module, name, bun };
    })
  );
  // A test file that imports another test file runs its tests too; Deno files
  // them under the defining module, Bun under the importing one. Pair such
  // leftovers by name, and keep them visible as moved rather than matched.
  const moved: { name: string; deno: string; bun: string; outcome: Outcome }[] =
    [];
  for (const change of changes.filter((c) => c.bun === "missing")) {
    const index = added.findIndex((a) =>
      a.name === change.name && a.bun === change.deno
    );
    if (index < 0) continue;
    moved.push({
      name: change.name,
      deno: change.module,
      bun: added[index].module,
      outcome: change.deno,
    });
    added = added.filter((_, i) => i !== index);
    changes.splice(changes.indexOf(change), 1);
  }
  return { changes, added, moved };
}

if (import.meta.main) {
  const [junit] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const golden = JSON.parse(readFileSync(GOLDEN, "utf8")) as Golden;
  const bun = bunTests(readFileSync(junit, "utf8"));
  const { changes, added, moved } = compareTests(golden.tests, bun);
  const tally = (outcomes: string[]) =>
    outcomes.reduce<Record<string, number>>(
      (t, o) => ({ ...t, [o]: (t[o] ?? 0) + 1 }),
      {},
    );
  const transitions = tally(changes.map((c) => `${c.deno} -> ${c.bun}`));
  if (process.argv.includes("--json")) {
    console.log(
      JSON.stringify({ transitions, changes, added, moved }, null, 2),
    );
  } else {
    console.log(
      `Deno golden: ${golden.tests.length} tests; Bun: ${bun.length}`,
    );
    console.log("Bun totals:", tally(bun.map(([, , o]) => o)));
    console.log("Changed outcomes:", transitions);
    console.log(
      `Tests only in Bun: ${added.length}`,
      tally(added.map((a) => a.bun)),
    );
    console.log(
      `Same test and outcome, filed under another module: ${moved.length}`,
    );
  }
}
