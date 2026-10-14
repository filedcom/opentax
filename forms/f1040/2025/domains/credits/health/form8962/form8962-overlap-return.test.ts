import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import fixtures from "./form8962-overlap.fixture.json" with { type: "json" };
import expected from "./form8962-overlap.expected.json" with { type: "json" };
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { form8962Pdf } from "../../../../pdf/forms/credits/health/f8962.ts";
import { inputSchema as policySchema } from "../../../../../nodes/inputs/credits/health/f1095a/index.ts";

// Expected amounts come from the independent source/Decimal and IRS Tax Table
// replay documented in the policy-month gap, not the return under test.
for (const id of Object.keys(fixtures) as Array<keyof typeof fixtures>) {
  Deno.test(`Overlapping/shared-policy public return reconciles source and final tax: ${id}`, async () => {
    const input = fixtures[id], held = structuredClone(input);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const p = buildPending(result.pending), ptc = p.form8962!, f = p.f1040!;
    const e = expected[id];
    assertEquals(ptc.dependents_modified_agi, e.dependent_magi);
    assertEquals(ptc.federal_poverty_pct, e.pct);
    assertEquals(ptc.monthly_applicable_contribution, e.monthly_contribution);
    assertEquals(ptc.total_premium_tax_credit, e.ptc);
    assertEquals(ptc.total_advance_ptc, e.aptc);
    assertEquals(ptc.net_premium_tax_credit ?? 0, e.net);
    assertEquals(ptc.excess_advance_premium ?? 0, e.repayment);
    assertEquals(p.schedule2?.line1a_excess_advance_premium ?? 0, e.repayment);
    assertEquals(p.schedule3?.line9_premium_tax_credit ?? 0, e.net);
    assertEquals(f.line16_income_tax, e.regular_tax);
    assertEquals(f.line17_additional_taxes ?? 0, e.repayment);
    assertEquals(f.line19_child_tax_credit ?? 0, e.ctc);
    assertEquals(f.line31_additional_payments ?? 0, e.net);
    assertEquals(f.line24_total_tax, e.tax);
    assertEquals(f.line35a_refund ?? 0, e.refund);
    assertEquals(f.line37_amount_owed ?? 0, e.owed);
    const filer = extractFilerIdentity(f)!;
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    assertEquals(
      (prepared.bundle.xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length,
      12,
    );
    const all = normalizeAllPending(prepared.bundle.pending);
    const projected = form8962Pdf.projectFields!(ptc, all);
    assertEquals(form8962Pdf.instances!(projected, filer, all).length, 1);
    assertEquals(input, held);
  });
}

Deno.test("Complete overlap/shared returns reject policy, coverage and final-return drift in native and PDF", async () => {
  for (const id of Object.keys(fixtures) as Array<keyof typeof fixtures>) {
    const result = f1040_2025.executeReturn(fixtures[id]);
    assertEquals(result.diagnostics, []);
    const p = {
      ...buildPending(result.pending),
      f1095a: policySchema.parse(result.pending.f1095a),
    };
    const filer = extractFilerIdentity(p.f1040!)!;
    const changes: Array<(x: typeof p) => void> = [
      (x) => {
        x.f1095a.f1095as[0].monthly_aptcs![0] += 1;
      },
      (x) => {
        x.f1095a.f1095as[0].covered_individual_ssns = ["999887777"];
      },
      (x) => {
        x.form8962!.total_premium_tax_credit! += 1;
      },
      (x) => {
        if (expected[id].net > 0) x.f1040!.line31_additional_payments! += 1;
        else x.f1040!.line17_additional_taxes! += 1;
      },
    ];
    for (const change of changes) {
      const changed = structuredClone(p);
      change(changed);
      await assertRejects(
        () => buildMefBundle(changed, { filer, attachments: [] }),
        Error,
      );
      assertThrows(() => {
        const all = normalizeAllPending(changed);
        const projected = form8962Pdf.projectFields!(changed.form8962!, all);
        form8962Pdf.instances!(projected, filer, all);
      }, Error);
    }
  }
});
