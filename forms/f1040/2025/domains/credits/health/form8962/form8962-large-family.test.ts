import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import fixtures from "./form8962-large-family.fixture.json" with {
  type: "json",
};
import expected from "./form8962-large-family.expected.json" with {
  type: "json",
};
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { form8962Pdf } from "../../../../pdf/forms/credits/health/f8962.ts";
import { inputSchema as generalSchema } from "../../../../../nodes/inputs/general/filing/general/index.ts";
import { inputSchema as policySchema } from "../../../../../nodes/inputs/credits/health/f1095a/index.ts";

// Expected amounts come from the independent source/Decimal and IRS Tax Table
// replay documented in the family source proof, not the return under test.
for (const id of Object.keys(fixtures) as Array<keyof typeof fixtures>) {
  Deno.test(`Larger-family public return reconciles PTC, ODC and final tax: ${id}`, async () => {
    const input = fixtures[id], held = structuredClone(input);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const p = buildPending(result.pending), ptc = p.form8962!, f = p.f1040!;
    const e = expected[id];
    assertEquals(ptc.dependents_modified_agi, e.dependent_magi);
    assertEquals(ptc.household_income, e.household_income);
    assertEquals(ptc.annual_applicable_contribution, e.annual_contribution);
    assertEquals(ptc.federal_poverty_pct, e.pct);
    assertEquals(ptc.federal_poverty_line, e.poverty);
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
    assertEquals(f.line28_actc ?? 0, e.actc);
    assertEquals(f.line27_eitc ?? 0, e.eic);
    assertEquals(f.line31_additional_payments ?? 0, e.net);
    assertEquals(f.line24_total_tax, e.tax);
    assertEquals(f.line35a_refund ?? 0, e.refund);
    assertEquals(f.line37_amount_owed ?? 0, e.owed);
    assertEquals(f.line23_other_taxes ?? 0, e.additional_medicare_tax);
    assertEquals(f.line25c_total ?? 0, e.additional_medicare_withheld);
    assertEquals(f.dependent_details?.length, e.dependents);
    const filer = extractFilerIdentity(f)!;
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    assertEquals(
      (prepared.bundle.xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length,
      e.covered_months,
    );
    assertEquals(
      (prepared.bundle.xml.match(/<DependentDetail>/g) ?? []).length,
      e.dependents,
    );
    const all = normalizeAllPending(prepared.bundle.pending);
    const projected = form8962Pdf.projectFields!(ptc, all);
    assertEquals(form8962Pdf.instances!(projected, filer, all).length, 1);
    assertEquals(input, held);
  });
}

Deno.test("Larger-family returns reject changed source, review and final totals in native and PDF", async () => {
  let variants = 0;
  for (const id of Object.keys(fixtures) as Array<keyof typeof fixtures>) {
    const result = f1040_2025.executeReturn(fixtures[id]);
    assertEquals(result.diagnostics, []);
    const p = {
      ...buildPending(result.pending),
      f1095a: policySchema.parse(result.pending.f1095a),
      general: generalSchema.parse(result.pending.general),
    };
    const filer = extractFilerIdentity(p.f1040!)!;
    const changes: Array<(x: typeof p) => void> = [
      (x) => {
        x.f1095a.f1095as[0].no_aptc_monthly_evidence![0].marketplace_slcsp += 1;
      },
      (x) => {
        x.f1095a.f1095as[0].no_aptc_monthly_evidence![0].premium_payment
          .amount = 1;
      },
      (x) => {
        x.form8962!.dependents_modified_agi! += 1;
      },
      (x) => {
        x.f1040!.line31_additional_payments! += 1;
      },
      (x) => {
        const r = x.general.dependents![0].ptc_tax_return!;
        if (r.filing === "required") r.filed_form1040.line11b_agi += 1;
        else if (r.filing === "not_required") {
          r.filing_requirement_review.dependent_ssn = "999887777";
        } else throw new Error("unexpected fixture filing category");
      },
      (x) => {
        const r = x.general.dependents![0].ptc_tax_return!;
        if (r.filing === "required") {
          if (r.wage_forms_w2?.length) r.wage_forms_w2[0].box1_wages! += 1;
          else if (r.dividend_form1099) {
            r.dividend_form1099.box1a_ordinary_dividends! += 1;
          } else {throw new Error(
              "required dependent must retain wages or dividends",
            );}
        } else if (r.filing === "not_required") {
          if ("wage_form_w2" in r) r.wage_form_w2.box1_wages = 15751;
          else if ("interest_form1099" in r) {
            r.interest_form1099.box1_taxable_interest = 1351;
          } else {throw new Error(
              "excluded dependent must retain wages or interest",
            );}
        } else throw new Error("unexpected fixture filing category");
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
      variants += 1;
    }
  }
  assertEquals(variants, 24);
});
