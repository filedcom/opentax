import { assertEquals, assertThrows } from "@std/assert";
import tables from "./reference/2025/irs-tables.json" with { type: "json" };
import changes from "./reference/2025/issue77-changes.json" with {
  type: "json",
};
import { FilingStatus } from "../forms/f1040/nodes/types.ts";
import {
  qualifiedDividendTax2025,
  taxTable2025,
} from "../forms/f1040/nodes/intermediate/worksheets/taxes/calculation/tax_table_2025.ts";
import { lookupEic2025 } from "../forms/f1040/nodes/intermediate/forms/credits/earned-income/eitc/table_2025.ts";
import { benchmarkExpectedSchema, benchmarkSourceIssues } from "./harness.ts";

Deno.test("issue 77: all 8248 published Tax Table cells match engine at both interval ends", () => {
  assertEquals(tables.tax_year, 2025);
  assertEquals(tables.tax_table.length, 2062);
  const statuses = [
    FilingStatus.Single,
    FilingStatus.MFJ,
    FilingStatus.MFS,
    FilingStatus.HOH,
  ];
  for (const [low, high, ...taxes] of tables.tax_table) {
    statuses.forEach((status, column) => {
      assertEquals(
        taxTable2025(low, status),
        taxes[column],
        `${low} ${status}`,
      );
      assertEquals(
        taxTable2025(high - 1, status),
        taxes[column],
        `${high - 1} ${status}`,
      );
    });
  }
});

Deno.test("issue 77: published nonterminal EIC rows agree at both interval ends", () => {
  assertEquals(tables.eic_nonterminal_rows.length, 1362);
  for (const [low, high, ...credits] of tables.eic_nonterminal_rows) {
    for (let column = 0; column < 8; column++) {
      assertEquals(
        lookupEic2025(low, column % 4, column >= 4),
        credits[column],
      );
      assertEquals(
        lookupEic2025(high - 1, column % 4, column >= 4),
        credits[column],
      );
    }
  }
});

Deno.test("issue 77: high-income proposed correction must satisfy IRS worksheet", () => {
  // Case 95: ordinary $883,805 x .37 - $42,979.75 = $284,028.10;
  // preferential $73,283 x .20 = $14,656.60; sum rounds to $298,685.
  assertEquals(
    qualifiedDividendTax2025(957088, 43237, 30046, FilingStatus.Single),
    298685,
  );
  assertEquals(
    qualifiedDividendTax2025(458371, 0, 1867, FilingStatus.MFJ),
    100487,
  );
});

Deno.test("issue 77: corrected fixture balances and audit amounts stay consistent", async () => {
  for (const record of changes) {
    const fixture = JSON.parse(
      await Deno.readTextFile(
        new URL(
          `./cases/f1040/2025/${record.case}/correct.json`,
          import.meta.url,
        ),
      ),
    );
    const values = benchmarkExpectedSchema.parse(fixture);
    assertEquals(
      values.line35a_refund,
      Math.max(0, values.line33_total_payments - values.line24_total_tax),
      record.case,
    );
    assertEquals(
      values.line37_amount_owed,
      Math.max(0, values.line24_total_tax - values.line33_total_payments),
      record.case,
    );
    if (values.line18_tax_before_credits !== undefined) {
      assertEquals(
        values.line18_tax_before_credits,
        values.income_tax + (values.ptc_repayment ?? 0),
        record.case,
      );
    }
    for (const [key, change] of Object.entries(record.changes)) {
      assertEquals(values[key], change.after, `${record.case} ${key}`);
    }
  }
});

Deno.test("issue 77: unresolved source facts cannot become successful oracles", () => {
  assertEquals(benchmarkSourceIssues({ correct: {} }), []);
  assertEquals(
    benchmarkSourceIssues({
      reconciliation: { source_limitations: ["W-2 owner absent"] },
    }),
    ["Unresolved fixture source: W-2 owner absent"],
  );
  assertThrows(() =>
    benchmarkSourceIssues({ reconciliation: { source_limitations: "unknown" } })
  );
});
