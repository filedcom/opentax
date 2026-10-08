import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { join } from "@std/path";
import {
  benchmarkExitCode,
  benchmarkExpectedSchema,
  benchmarkReturnSchema,
  checkedCommandOutput,
  createdReturnSchema,
  discoverBenchmarkCases,
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
  const two = await caseDirectory(root, "f1040/2026/02");
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
    const created = await createReturnCommand({ year: 2025, baseDir: directory });
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
