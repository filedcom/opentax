import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { join } from "@std/path";
import {
  applyCaseBaseline,
  benchmarkExitCode,
  benchmarkExpectedSchema,
  benchmarkReturnSchema,
  caseProduct,
  checkedCommandOutput,
  createdReturnSchema,
  discoverBenchmarkCases,
  inspectBenchmarkCases,
} from "./harness.ts";

async function caseDirectory(root: string, name: string) {
  const directory = join(root, name);
  await Deno.mkdir(directory, { recursive: true });
  await Deno.writeTextFile(
    join(directory, "input.json"),
    JSON.stringify({ year: 2025, forms: [{ node_type: "start", data: {} }] }),
  );
  await Deno.writeTextFile(
    join(directory, "correct.json"),
    JSON.stringify({
      correct: {
        line24_total_tax: 0,
        line35a_refund: 0,
        line37_amount_owed: 0,
      },
    }),
  );
  return directory;
}

Deno.test("benchmark recursively discovers form/year cases and rejects incomplete or empty inventories", async () => {
  const root = await Deno.makeTempDir();
  const one = await caseDirectory(root, "f1040/2025/01");
  const two = await caseDirectory(root, "f1040/2025/02");
  assertEquals(await discoverBenchmarkCases(root), [one, two]);
  await Deno.mkdir(join(root, "f1040/2025/03"));
  await assertRejects(
    () => discoverBenchmarkCases(root),
    Error,
    "Incomplete benchmark",
  );
  await assertRejects(async () =>
    discoverBenchmarkCases(await Deno.makeTempDir())
  );
});

Deno.test("benchmark rejects missing expected results, nonfinite ground truth and zero-case success", async () => {
  const root = await Deno.makeTempDir();
  await Deno.writeTextFile(
    join(root, "input.json"),
    JSON.stringify({ year: 2025, forms: [{ node_type: "start", data: {} }] }),
  );
  await assertRejects(() => discoverBenchmarkCases(root));
  assertThrows(() =>
    benchmarkExpectedSchema.parse({
      line24_total_tax: Infinity,
      line35a_refund: 0,
      line37_amount_owed: 0,
    })
  );
  assertEquals(benchmarkExitCode(0, 0), 1);
  assertEquals(benchmarkExitCode(3, 1), 1);
  assertEquals(benchmarkExitCode(3, 0), 0);
});

Deno.test("benchmark refuses valid-looking stdout from failed child process", async () => {
  const result = await new Deno.Command("deno", {
    args: [
      "eval",
      'console.log("{\\"returnId\\":\\"pretend\\"}"); Deno.exit(7);',
    ],
    stdout: "piped",
    stderr: "piped",
  }).output();
  assertThrows(
    () => checkedCommandOutput(result, "fixture"),
    Error,
    "exited 7",
  );
});

Deno.test("benchmark rejects successful but missing malformed or string-valued CLI output", () => {
  const valid = {
    returnId: "case",
    year: 2025,
    forms: ["f1040"],
    summary: {
      line11_agi: 0,
      line15_taxable_income: 0,
      line24_total_tax: 0,
      line33_total_payments: 0,
    },
    lines: { line15_taxable_income: 0 },
    warnings: [],
  };
  assertEquals(
    benchmarkReturnSchema.parse(valid).summary.line35a_refund,
    undefined,
  );
  for (
    const invalid of [
      {},
      [],
      { ...valid, summary: undefined },
      { ...valid, summary: { ...valid.summary, line24_total_tax: "0" } },
      { ...valid, forms: [] },
      { ...valid, lines: {} },
      { ...valid, lines: { unrelated_only: 123 } },
      { ...valid, lines: { line24_total_tax: undefined, unrelated_only: 123 } },
      { ...valid, lines: { line24_total_tax: "0" } },
      { ...valid, lines: { line24_total_tax: [] } },
    ]
  ) assertThrows(() => benchmarkReturnSchema.parse(invalid));
  for (const invalid of [{}, { returnId: "" }, { returnId: 3 }]) {
    assertThrows(() => createdReturnSchema.parse(invalid));
  }
});

Deno.test("benchmark accepts computed zero-tax output from the actual CLI return command", async () => {
  const { createReturnCommand, getReturnCommand } = await import(
    "../cli/commands/return.ts"
  );
  const directory = await Deno.makeTempDir();
  try {
    const created = await createReturnCommand({
      year: 2025,
      baseDir: directory,
    });
    const result = await getReturnCommand({
      returnId: created.returnId,
      baseDir: directory,
    });
    const parsed = benchmarkReturnSchema.parse(result);
    assertEquals(parsed.summary.line24_total_tax, 0);
    assertEquals(parsed.summary.line35a_refund, undefined);
    assertEquals(parsed.summary.line37_amount_owed, undefined);
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

async function caseWith(
  root: string,
  name: string,
  forms: unknown[],
  expectedExtra: Record<string, unknown> = {},
) {
  const directory = join(root, name);
  await Deno.mkdir(directory, { recursive: true });
  await Deno.writeTextFile(
    join(directory, "input.json"),
    JSON.stringify({ year: 2025, forms }),
  );
  await Deno.writeTextFile(
    join(directory, "correct.json"),
    JSON.stringify({
      ...expectedExtra,
      correct: {
        line24_total_tax: 0,
        line35a_refund: 0,
        line37_amount_owed: 0,
      },
    }),
  );
  return directory;
}

const start = { node_type: "start", data: {} };

Deno.test("discovery reads the product from <form>/<year>/<case> and requires the year to match", async () => {
  assertEquals(caseProduct("/x/benchmark/cases/f1040/2025/01-minimal"), {
    form: "f1040",
    year: 2025,
  });
  assertEquals(caseProduct("/x/cases/01-minimal"), undefined);
  const root = await Deno.makeTempDir();
  await caseWith(root, "f1040/2026/01", [start]);
  await assertRejects(
    () => discoverBenchmarkCases(root),
    Error,
    "matching year",
  );
  await caseWith(await Deno.makeTempDir(), "f1041/2025/01", [start]);
});

Deno.test("discovery rejects the recorded case-authoring mistakes with the field named", async () => {
  const bare = await Deno.makeTempDir();
  await caseWith(bare, "f1040/2025/01", [start, {
    node_type: "sep_retirement",
    data: [{ contribution: 1000 }],
  }]);
  await assertRejects(
    () => discoverBenchmarkCases(bare),
    Error,
    "input.json: forms.1.data: Expected object, received array",
  );

  const wrapped = await Deno.makeTempDir();
  await caseWith(wrapped, "f1040/2025/01", [start, {
    node_type: "sep_retirement",
    data: { sep_retirement: [{ contribution: 1000 }] },
  }]);
  await assertRejects(
    () => discoverBenchmarkCases(wrapped),
    Error,
    "sep_retirement: Validation error: Unrecognized field: sep_retirement",
  );

  const renamed = await Deno.makeTempDir();
  await caseWith(renamed, "f1040/2025/01", [start, {
    node_type: "f1099int",
    data: { box1_interest: 250 },
  }]);
  await assertRejects(
    () => discoverBenchmarkCases(renamed),
    Error,
    "f1099int: Validation error: Unrecognized field: box1_interest",
  );

  const missing = await Deno.makeTempDir();
  await caseWith(missing, "f1040/2025/01", [start, {
    node_type: "f1099r",
    data: { box1_gross_distribution: 5000 },
  }]);
  await assertRejects(
    () => discoverBenchmarkCases(missing),
    Error,
    "payer_ein: Required",
  );

  const unknown = await Deno.makeTempDir();
  await caseWith(unknown, "f1040/2025/01", [start, {
    node_type: "alimony_paid",
    data: {},
  }]);
  await assertRejects(
    () => discoverBenchmarkCases(unknown),
    Error,
    "alimony_paid is not a valid input",
  );
});

Deno.test("discovery rejects an expected file whose source is the engine, and accepts an IRS citation", async () => {
  const engine = await Deno.makeTempDir();
  await caseWith(engine, "f1040/2025/01", [start], {
    source: "engine-computed from output.json after the fix",
  });
  await assertRejects(
    () => discoverBenchmarkCases(engine),
    Error,
    "cites the engine",
  );
  const blank = await Deno.makeTempDir();
  await caseWith(blank, "f1040/2025/01", [start], { source: " " });
  await assertRejects(
    () => discoverBenchmarkCases(blank),
    Error,
    "non-empty citation",
  );
  const cited = await Deno.makeTempDir();
  const directory = await caseWith(cited, "f1040/2025/01", [start], {
    source:
      "IRS Pub 17 TY2025, Chapter 8, p. 68. All values IRS-stated, none computed by agent.",
  });
  assertEquals(await discoverBenchmarkCases(cited), [directory]);
});

Deno.test("discovery reports every invalid case in one error, not just the first", async () => {
  const root = await Deno.makeTempDir();
  await caseWith(root, "f1040/2025/01", [start, {
    node_type: "f1099int",
    data: { box1_interest: 1 },
  }]);
  await caseWith(root, "f1040/2025/02", [start], { source: "" });
  await caseWith(root, "f1040/2025/03", [start]);
  const error = await assertRejects(() => discoverBenchmarkCases(root), Error);
  assertEquals(error.message.startsWith("2 invalid benchmark cases:\n"), true);
  assertEquals(error.message.includes("box1_interest"), true);
  assertEquals(error.message.includes("non-empty citation"), true);
});

Deno.test("known-invalid cases are allowed by the baseline until it expires, and a stale entry is reported", async () => {
  const root = await Deno.makeTempDir();
  await caseWith(root, "f1040/2025/01", [start, {
    node_type: "f1099int",
    data: { box1_interest: 1 },
  }]);
  await caseWith(root, "f1040/2025/02", [start]);
  const { found, problems } = await inspectBenchmarkCases(root);
  assertEquals(found.length, 1);
  assertEquals(problems.length, 1);
  const entry = {
    case: "f1040/2025/01",
    reason: "renamed field",
    expires: "2027-01-31",
    approvedBy: "a7ul",
  };
  assertEquals(
    applyCaseBaseline(root, problems, [], "2026-10-16").open,
    problems,
  );
  assertEquals(applyCaseBaseline(root, problems, [entry], "2026-10-16"), {
    open: [],
    allowed: 1,
  });
  const expired = applyCaseBaseline(root, problems, [entry], "2027-02-01");
  assertEquals(expired.open.length, 1);
  assertEquals(expired.open[0].message.includes("expired on 2027-01-31"), true);
  const stale = applyCaseBaseline(root, problems, [{
    ...entry,
    case: "f1040/2025/02",
  }], "2026-10-16");
  assertEquals(stale.open.map((p) => p.message.includes("no longer matches")), [
    false,
    true,
  ]);
  assertEquals(stale.allowed, 0);
});
