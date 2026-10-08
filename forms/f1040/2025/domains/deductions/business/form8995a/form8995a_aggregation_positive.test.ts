import type { MefFormsPending } from "../../../../mef/types.ts";
import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import {
  calculateTwoBusinessAggregationLines,
  inputSchema,
} from "../../../../../nodes/intermediate/forms/deductions/business/form8995a/index.ts";

const fixture = pdfReviewFixtures.find((f) =>
  f.id === "single-form8995a-two-business-aggregation"
)!;
function prepared() {
  const result = f1040_2025.executeReturn({ ...fixture.inputs });
  assertEquals(result.diagnostics, []);
  return buildPending(result.pending) as Record<
    string,
    Record<string, unknown>
  >;
}
Deno.test("sourced aggregation reaches filed SE adjustments, wage limit and full native packet", async () => {
  const pending = prepared();
  assertEquals(pending.schedule1.line3_schedule_c, 180000);
  assertEquals(pending.schedule1.line15_se_deduction, 2411);
  assertEquals(pending.f1040.line13_qbi_deduction, 15000);
  assertEquals(pending.f1040.line15_taxable_income, 446839);
  assertEquals(pending.f1040.line24_total_tax, 133158);
  const lines = calculateTwoBusinessAggregationLines(
    inputSchema.parse(pending.form8995a),
  );
  assertEquals(lines.parent.line3, 35518);
  assertEquals(lines.parent.line36, 92368);
  const bundle = await buildMefBundle(pending as MefFormsPending, {
    filer: fixture.filer,
    year: 2025,
    returnType: "1040",
    schemaVersion: "2025v5.4",
    attachments: [],
  });
  assertStringIncludes(bundle.xml, "<AggregatedInd>X</AggregatedInd>");
  assertStringIncludes(
    bundle.xml,
    "<TotQlfyBusinessIncomeOrLossAmt>177589</TotQlfyBusinessIncomeOrLossAmt>",
  );
  assertEquals(bundle.xml.includes("<IRS8995 "), false);
  const bytes = await buildPdfBytes(
    pending,
    fixture.filer,
    ".pdf-cache",
    bundle,
  );
  assertEquals(bytes.length > 1000, true);
});
Deno.test("aggregation native and PDF exports reject detached members, owner, adjustment and companion", async () => {
  const base = prepared();
  const variants = [
    { ...base, form8995a_schedule_b: undefined },
    { ...base, form8995: { ...base.form8995, qbi_deduction: 15000 } },
    { ...base, schedule1: { ...base.schedule1, line15_se_deduction: 2410 } },
    {
      ...base,
      general: {
        ...base.general,
        qbi_no_prior_loss_or_suspended_loss_confirmed: undefined,
      },
    },
    {
      ...base,
      schedule_c: {
        ...base.schedule_c,
        schedule_cs: (base.schedule_c.schedule_cs as Record<string, unknown>[])
          .map((c, i) => i === 0 ? { ...c, line_1_gross_receipts: 120001 } : c),
      },
    },
    { ...base, f1040: { ...base.f1040, line13_qbi_deduction: 15001 } },
    { ...base, f1040: { ...base.f1040, line3a_qualified_dividends: 1 } },
  ];
  for (const pending of variants) {
    await assertRejects(() =>
      buildMefBundle(pending as MefFormsPending, {
        filer: fixture.filer,
        year: 2025,
        returnType: "1040",
        schemaVersion: "2025v5.4",
        attachments: [],
      })
    );
    await assertRejects(() =>
      buildPdfBytes(pending, fixture.filer, ".pdf-cache")
    );
  }
  const filer = { ...fixture.filer, primarySSN: "222334444" };
  await assertRejects(() =>
    buildMefBundle(base, {
      filer,
      year: 2025,
      returnType: "1040",
      schemaVersion: "2025v5.4",
      attachments: [],
    })
  );
  await assertRejects(() => buildPdfBytes(base, filer, ".pdf-cache"));
});
