import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../scripts/support/sys.ts";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { dirname, join } from "node:path";
import { fileURLToPath as fromFileUrl } from "node:url";

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
  { node_type: "w2", data: { box1_wages: 120000, box2_fed_withheld: 10000 } },
];

for (
  const scenario of [
    "mismatch",
    "command-error",
    "executor-error",
    "missing-case",
    "unsupported",
    "source-gap",
  ] as const
) {
  test(`benchmark process fails closed: ${scenario}`, async () => {
    const form = `__integrity_${crypto.randomUUID()}`;
    const caseRoot = join(root, "cases", form);
    const caseDir = join(caseRoot, "2025", "synthetic");
    const runtime = await sys.makeTempDir();
    try {
      await fs.mkdir(caseDir, { recursive: true });
      const forms = scenario === "command-error"
        ? [{ node_type: "__nonexistent_node", data: {} }]
        : scenario === "executor-error"
        ? [validForms[1]]
        : validForms;
      await fs.writeFile(
        join(caseDir, "input.json"),
        JSON.stringify({ year: 2025, forms }),
      );
      // Synthetic Single return: 120,000 wages - 15,750 standard deduction;
      // 1,192.50 + 4,386 + 12,072.50 + 216 = 17,867 tax, less 10,000 paid.
      const correct = scenario === "mismatch"
        ? { line11_agi: 1, line33_total_payments: 1 }
        : scenario === "unsupported"
        ? { line1a_wages: 120000, ordinary_taxable: 123 }
        : { line1a_wages: 120000 };
      await fs.writeFile(
        join(caseDir, "correct.json"),
        JSON.stringify({
          ...(scenario === "source-gap"
            ? {
              reconciliation: {
                source_limitations: ["W-2 spouse owner absent"],
              },
            }
            : {}),
          correct: {
            line24_total_tax: 17867,
            line35a_refund: 0,
            line37_amount_owed: 7867,
            ...correct,
          },
        }),
      );
      if (scenario === "missing-case") {
        await fs.mkdir(join(caseRoot, "2025", "incomplete"));
      }
      const { code, stdout, stderr } = await new sys.Command(process.execPath, {
        args: [
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
      if (scenario === "missing-case") {
        assertStringIncludes(
          new TextDecoder().decode(stderr),
          "Incomplete benchmark directory:",
        );
        assertEquals(
          new TextDecoder().decode(stdout).includes('{"total":'),
          false,
        );
        return;
      }
      const jsonLine = new TextDecoder().decode(stdout).split("\n").find(
        (line) => line.startsWith('{"total":'),
      );
      if (!jsonLine) throw new Error("Benchmark omitted JSON summary");
      const report = JSON.parse(jsonLine);
      {
        assertEquals(report.fail, 1);
        assertEquals(report.failing, ["synthetic"]);
        if (scenario === "mismatch") {
          assertEquals(
            report.failures[0].lineFailures.filter((
              failure: { line: string },
            ) => ["line11_agi", "line33_total_payments"].includes(failure.line))
              .map((failure: { line: string }) => failure.line),
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
        } else if (scenario === "source-gap") {
          assertEquals(report.failures[0].lineFailures, []);
          assertEquals(report.failures[0].unsupportedChecks, []);
          assertEquals(report.failures[0].errors, [
            "Unresolved fixture source: W-2 spouse owner absent",
          ]);
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
      await sys.remove(caseRoot, { recursive: true });
      await sys.remove(runtime, { recursive: true });
    }
  });
}
