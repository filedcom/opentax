import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  interstateCases,
  interstateInputs,
} from "./form8962-interstate.fixture.ts";
import expected from "./form8962-interstate.expected.json" with {
  type: "json",
};
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { form8962Pdf } from "../../../../pdf/forms/credits/health/f8962.ts";
import { inputSchema as policySchema } from "../../../../../nodes/inputs/credits/health/f1095a/index.ts";

for (const c of interstateCases) {
  Deno.test(`Interstate public return reconciles poverty region, PTC and final tax: ${c.id}`, async () => {
    const input = interstateInputs(c), held = structuredClone(input);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const p = buildPending(result.pending), ptc = p.form8962!, f = p.f1040!;
    const e = expected[c.id as keyof typeof expected];
    assertEquals(ptc.federal_poverty_line, e.poverty);
    assertEquals(ptc.federal_poverty_pct, e.pct);
    assertEquals(ptc.monthly_applicable_contribution, e.monthly);
    assertEquals(ptc.total_premium_tax_credit, e.ptc);
    assertEquals(ptc.total_advance_ptc, e.advance);
    assertEquals(ptc.repayment_limitation, e.cap ?? undefined);
    assertEquals(ptc.excess_advance_premium, e.repay);
    assertEquals(p.schedule2!.line1a_excess_advance_premium, e.repay);
    assertEquals(f.line17_additional_taxes, e.repay);
    assertEquals(f.line24_total_tax, e.tax);
    assertEquals(f.line35a_refund ?? 0, e.refund);
    assertEquals(f.line37_amount_owed ?? 0, e.owed);
    const filer = extractFilerIdentity(f)!;
    assertEquals(filer.address.state, "TX");
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    assertEquals(
      (prepared.bundle.xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length,
      c.gap ? 11 : 12,
    );
    const all = normalizeAllPending(prepared.bundle.pending),
      projected = form8962Pdf.projectFields!(ptc, all);
    assertEquals(form8962Pdf.instances!(projected, filer, all).length, 1);
    assertEquals(projected.pdf_fpl_alaska, e.poverty === 18810);
    assertEquals(projected.pdf_fpl_hawaii, e.poverty === 17310);
    assertEquals(input, held);
  });
}

Deno.test("Interstate public-return native and PDF gates reject missing review, wrong person, source, region and repayment", async () => {
  for (
    const id of [
      "twelve-reported",
      "two-unreported-corrected",
      "alaska-cap",
      "hawaii-cap",
    ]
  ) {
    const c = interstateCases.find((c) => c.id === id)!;
    const result = f1040_2025.executeReturn(interstateInputs(c));
    assertEquals(result.diagnostics, []);
    const p = {
      ...buildPending(result.pending),
      f1095a: policySchema.parse(result.pending.f1095a),
    };
    const filer = extractFilerIdentity(p.f1040!)!;
    const changes: Array<(x: typeof p) => void> = [
      (x) => {
        x.f1095a.f1095as[1].slcsp_review_periods = undefined;
      },
      (x) => {
        x.f1095a.f1095as[1].covered_individual_ssns = ["999887777"];
      },
      (x) => {
        x.f1095a.f1095as[0].monthly_aptcs![0] += 1;
      },
      (x) => {
        x.form8962!.federal_poverty_line = 15060;
      },
      (x) => {
        x.form8962!.excess_advance_premium = 1;
      },
      (x) => {
        x.f1040!.line17_additional_taxes = 1;
      },
    ];
    if (c.corrected) {
      changes.push((x) => {
        x.f1095a.f1095as[1].slcsp_corrections!.pop();
      });
    }
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
