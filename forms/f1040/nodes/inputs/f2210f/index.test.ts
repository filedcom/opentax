import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f2210f } from "./index.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { FilingStatus } from "../../types.ts";
import { form2210FBoxBInputSchema } from "../../../2025/form2210f_box_b.ts";
import { calculateForm2210FBoxB } from "../../../2025/form2210f_box_b.ts";
import { form2210f } from "../../../2025/mef/forms/f2210f_box_b.ts";
import { form2210fPdf } from "../../../2025/pdf/forms/f2210f.ts";

function source() {
  return form2210FBoxBInputSchema.parse({
    gross_income_years: [
      {
        tax_year: 2024,
        total_gross_income: 100_000,
        farming_fishing_gross_income: 70_000,
        reviewed_source_reference: "gross-2024",
      },
      {
        tax_year: 2025,
        total_gross_income: 100_000,
        farming_fishing_gross_income: 0,
        reviewed_source_reference: "gross-2025",
      },
    ],
    prior_separate_returns: [
      {
        owner: "taxpayer",
        filing_status: "single",
        full_twelve_months: true,
        filed_return_reference: "taxpayer-2024",
        line22_tax_after_credits: 4_000,
        included_schedule2_taxes: 0,
        line4_refundable_credits_excluding_schedule3_line11: 0,
      },
      {
        owner: "spouse",
        filing_status: "head_of_household",
        full_twelve_months: true,
        filed_return_reference: "spouse-2024",
        line22_tax_after_credits: 5_000,
        included_schedule2_taxes: 0,
        line4_refundable_credits_excluding_schedule3_line11: 0,
      },
    ],
    current_return_reference: "joint-2025",
    current_filing_status: "married_filing_jointly",
    current_line22_tax_after_credits: 15_000,
    current_included_schedule2_taxes: 0,
    current_line4_refundable_credits_excluding_schedule3_line11: 0,
    current_withholding: 1_000,
    current_excess_social_security_or_rrta_withholding: 0,
    estimated_payments_by_2026_01_15: 0,
    full_underpayment_paid_on: null,
  });
}

Deno.test("Form 2210-F box B public source reaches finalized Form 1040 line 38", () => {
  const routed = f2210f.compute({} as never, { source: source() });
  const routedSource =
    (routed.outputs[0].fields as { f2210f_box_b_source: unknown })
      .f2210f_box_b_source;
  const result = f1040.compute({} as never, {
    filing_status: FilingStatus.MFJ,
    line16_income_tax: 15_000,
    line25a_w2_withheld: 1_000,
    f2210f_box_b_source: form2210FBoxBInputSchema.parse(routedSource),
  });
  const filed = result.outputs[0].fields as Record<string, number>;
  assertEquals(filed.line22_tax_after_credits, 15_000);
  assertEquals(filed.line38_underpayment_penalty, 138);
  const form = result.finalizations?.find((item) => item.nodeType === "f2210f");
  assertEquals(
    (form?.fields as { filed_lines: { line16: number } }).filed_lines.line16,
    138,
  );
});

Deno.test("Form 2210-F box B includes sourced Schedule 2 tax in Form 1040 and both documents", () => {
  const facts = form2210FBoxBInputSchema.parse({
    ...source(),
    current_included_schedule2_taxes: 1_500,
  });
  const routed = f2210f.compute({} as never, { source: facts });
  const routedSource = (routed.outputs[0].fields as {
    f2210f_box_b_source: unknown;
  }).f2210f_box_b_source;
  assertEquals(routedSource, facts);
  const result = f1040.compute({} as never, {
    filing_status: FilingStatus.MFJ,
    line16_income_tax: 15_000,
    line23_other_taxes: 1_500,
    line25a_w2_withheld: 1_000,
    f2210f_box_b_source: facts,
  });
  const filed = result.outputs[0].fields as Record<string, number>;
  const lines = calculateForm2210FBoxB(facts);
  assertEquals(filed.line23_other_taxes, 1_500);
  assertEquals(filed.line38_underpayment_penalty, lines.line16);
  const finalized = result.finalizations?.find((item) =>
    item.nodeType === "f2210f"
  );
  assertEquals(finalized?.fields, { source: facts, filed_lines: lines });
  const fields = { source: facts, filed_lines: lines };
  const pending = { f1040: filed };
  const xml = form2210f.build(fields, { pending });
  assertStringIncludes(xml, "<OtherTaxesAmt>1500</OtherTaxesAmt>");
  assertStringIncludes(xml, `<PenaltyAmt>${lines.line16}</PenaltyAmt>`);
  const pdf = form2210fPdf.projectFields?.(fields, pending);
  assertEquals(pdf?.line2, 1_500);
  assertEquals(pdf?.line16, lines.line16);
  const changed = {
    f1040: { ...filed, line23_other_taxes: 1_499 },
  };
  assertThrows(
    () => form2210f.build(fields, { pending: changed }),
    Error,
    "does not match finalized Form 1040",
  );
  assertThrows(
    () => form2210fPdf.projectFields?.(fields, changed),
    Error,
    "does not match finalized Form 1040",
  );
  assertThrows(
    () =>
      f1040.compute({} as never, {
        filing_status: FilingStatus.MFJ,
        line16_income_tax: 15_000,
        line23_other_taxes: 1_499,
        line25a_w2_withheld: 1_000,
        f2210f_box_b_source: facts,
      }),
    Error,
    "Schedule 2 tax",
  );
});

Deno.test("Form 2210-F rejects mismatched final tax, unsupported payments, and competing Form 2210", () => {
  const base = {
    filing_status: FilingStatus.MFJ,
    line16_income_tax: 15_000,
    line25a_w2_withheld: 1_000,
    f2210f_box_b_source: source(),
  };
  assertThrows(() =>
    f1040.compute({} as never, { ...base, line16_income_tax: 14_999 })
  );
  assertThrows(() =>
    f1040.compute({} as never, { ...base, line26_estimated_tax: 1 })
  );
  assertThrows(() =>
    f1040.compute({} as never, { ...base, f2210_active: true })
  );
  assertThrows(() =>
    f1040.compute({} as never, { ...base, line38_underpayment_penalty: 1 })
  );
});
