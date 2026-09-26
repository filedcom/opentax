import { assertEquals, assertStringIncludes } from "@std/assert";
import { dirname, fromFileUrl, join } from "@std/path";

const root = dirname(fromFileUrl(import.meta.url));
const validForms = [
  {
    node_type: "general",
    data: {
      filing_status: "single",
      taxpayer_first_name: "Synthetic",
      taxpayer_last_name: "Example",
    },
  },
  { node_type: "f2441", data: {} },
  { node_type: "w2", data: { box1_wages: 85000, box2_fed_withheld: 10000 } },
];

for (
  const scenario of [
    "mismatch",
    "command-error",
    "executor-error",
    "missing-case",
    "unsupported",
  ] as const
) {
  Deno.test(`benchmark process fails closed: ${scenario}`, async () => {
    const form = `__integrity_${crypto.randomUUID()}`;
    const caseRoot = join(root, "cases", form);
    const caseDir = join(caseRoot, "2025", "synthetic");
    const runtime = await Deno.makeTempDir();
    try {
      await Deno.mkdir(caseDir, { recursive: true });
      const forms = scenario === "command-error"
        ? [{ node_type: "__nonexistent_node", data: {} }]
        : scenario === "executor-error"
        ? [validForms[2]]
        : validForms;
      await Deno.writeTextFile(
        join(caseDir, "input.json"),
        JSON.stringify({ year: 2025, forms }),
      );
      const correct = scenario === "mismatch"
        ? { line11_agi: 1, line33_total_payments: 1 }
        : scenario === "unsupported"
        ? { line1a_wages: 85000, ordinary_taxable: 123 }
        : { line1a_wages: 85000 };
      await Deno.writeTextFile(
        join(caseDir, "correct.json"),
        JSON.stringify({ correct }),
      );
      if (scenario === "missing-case") {
        await Deno.mkdir(join(caseRoot, "2025", "incomplete"));
      }
      const { code, stdout } = await new Deno.Command("deno", {
        args: [
          "run",
          "--allow-read",
          "--allow-write",
          "--allow-run=deno",
          join(root, "run_benchmark.ts"),
          "--form",
          form,
          "--json",
        ],
        cwd: runtime,
        stdout: "piped",
        stderr: "piped",
      }).output();
      assertEquals(code, 1);
      const jsonLine = new TextDecoder().decode(stdout).split("\n").find(
        (line) => line.startsWith('{"total":'),
      );
      if (!jsonLine) throw new Error("Benchmark omitted JSON summary");
      const report = JSON.parse(jsonLine);
      if (scenario === "missing-case") {
        assertEquals(report.skipped, 1);
        assertEquals(report.pass, 1);
      } else {
        assertEquals(report.fail, 1);
        assertEquals(report.failing, ["synthetic"]);
        if (scenario === "mismatch") {
          assertEquals(
            report.failures[0].lineFailures.map((failure: { line: string }) =>
              failure.line
            ),
            ["line11_agi", "line33_total_payments"],
          );
        } else if (scenario === "unsupported") {
          assertEquals(report.failures[0].lineFailures, []);
          assertEquals(report.failures[0].errors, []);
          assertEquals(report.failures[0].unsupportedChecks, [{
            field: "ordinary_taxable",
            expected: 123,
            kind: "unmapped_oracle",
          }]);
        } else {
          assertStringIncludes(
            report.failures[0].errors.join("\n"),
            scenario === "command-error"
              ? "opentax command failed"
              : "[EXECUTOR_",
          );
        }
      }
    } finally {
      await Deno.remove(caseRoot, { recursive: true });
      await Deno.remove(runtime, { recursive: true });
    }
  });
}
