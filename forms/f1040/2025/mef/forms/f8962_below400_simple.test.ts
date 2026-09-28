import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import { FilingStatus as SourceFilingStatus } from "../../../nodes/types.ts";
import { f1095a } from "../../../nodes/inputs/f1095a/index.ts";
import { form8962 as calculation } from "../../../nodes/intermediate/forms/form8962/index.ts";
import { form8962Pdf } from "../../pdf/forms/f8962.ts";
import { form8962 } from "./f8962.ts";

const filer = {
  primarySSN: "123456789",
  nameLine1: "TAXPAYER TEST",
  nameControl: "TAXP",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
};
const policy = {
  issuer_name: "Texas Marketplace",
  policy_number: "POLICY-1",
  coverage_state: "TX",
  covered_individual_ssns: ["123456789"],
  monthly_premiums: Array<number>(12).fill(800),
  monthly_slcsps: Array<number>(12).fill(600),
  monthly_aptcs: Array<number>(12).fill(700),
  annual_premium: 9_600,
  annual_slcsp: 7_200,
  annual_aptc: 8_400,
};
const nodeContext = { taxYear: 2025, formType: "f1040" as const };

function caseFor(income: number, annual: boolean) {
  const source = f1095a.compute(nodeContext, { f1095as: [policy] });
  const routed = source.outputs.find((item) => item.nodeType === "form8962");
  assertEquals(routed?.fields.monthly_premiums, policy.monthly_premiums);
  const result = calculation.compute(nodeContext, {
    household_size: 1,
    fpl_region: "contiguous",
    filing_status: SourceFilingStatus.Single,
    taxpayer_modified_agi: income,
    dependent_income_complete: true,
    monthly_premiums: policy.monthly_premiums,
    monthly_slcsps: policy.monthly_slcsps,
    monthly_aptcs: policy.monthly_aptcs,
    annual_line11_eligible: annual,
  });
  const fields = result.outputs.find((item) => item.nodeType === "form8962")
    ?.fields;
  if (!fields) throw new Error("Missing Form 8962 calculated fields");
  const repayment = fields.excess_advance_premium as number;
  const pending = {
    f1095a: { f1095as: [policy] },
    f1040: { line11_agi: income, line17_additional_taxes: repayment },
    schedule2: { line1a_excess_advance_premium: repayment },
  };
  return { fields, pending, repayment };
}

Deno.test("Form 8962 one-policy annual Table 2/5 tiers reconcile through MeF and PDF", () => {
  for (
    const [income, pct, figure, cap] of [
      [22_590, 150, 0, 375],
      [37_650, 250, 0.04, 975],
      [52_710, 350, 0.0725, 1_625],
    ]
  ) {
    const { fields, pending, repayment } = caseFor(income, true);
    assertEquals(fields.federal_poverty_pct, pct);
    assertEquals(fields.applicable_figure, figure);
    assertEquals(fields.repayment_limitation, cap);
    assertEquals(repayment, cap);
    const xml = form8962.build(fields, { filer, pending });
    assertStringIncludes(
      xml,
      `<AdditionalTaxLimitationAmt>${cap}</AdditionalTaxLimitationAmt>`,
    );
    assertStringIncludes(
      xml,
      `<PremiumTaxCreditTaxLiabAmt>${cap}</PremiumTaxCreditTaxLiabAmt>`,
    );
    const projected = form8962Pdf.projectFields?.(fields, pending) ?? {};
    assertEquals(projected.pdf_applicable_figure, figure.toFixed(4));
    assertEquals(form8962Pdf.instances?.(projected, filer, pending)?.length, 1);
  }
});

Deno.test("Form 8962 one-policy monthly below-400% repayment cap reconciles", () => {
  const { fields, pending } = caseFor(45_180, false);
  assertEquals(fields.federal_poverty_pct, 300);
  assertEquals(fields.monthly_applicable_contribution, 226);
  assertEquals(fields.repayment_limitation, 1_625);
  const xml = form8962.build(fields, { filer, pending });
  assertEquals((xml.match(/<MonthlyPTCCalculationGrp>/g) ?? []).length, 12);
  assertStringIncludes(
    xml,
    "<AdditionalTaxLimitationAmt>1625</AdditionalTaxLimitationAmt>",
  );
  assertEquals(
    form8962Pdf.instances?.(
      form8962Pdf.projectFields?.(fields, pending) ?? {},
      filer,
      pending,
    )?.length,
    1,
  );
});

Deno.test("Form 8962 below-400% route rejects altered cap, filing amount, and wider family", () => {
  const { fields, pending } = caseFor(52_710, true);
  assertThrows(
    () =>
      form8962.build({ ...fields, repayment_limitation: 975 }, {
        filer,
        pending,
      }),
    Error,
    "lines 24 through 29 differ",
  );
  assertThrows(
    () =>
      form8962.build(fields, {
        filer,
        pending: {
          ...pending,
          schedule2: { line1a_excess_advance_premium: 975 },
        },
      }),
    Error,
    "finalized Schedule 2/3",
  );
  assertThrows(
    () =>
      form8962.build(fields, {
        filer,
        pending: {
          ...pending,
          f1095a: {
            f1095as: [policy, { ...policy, policy_number: "POLICY-2" }],
          },
        },
      }),
    Error,
    "one filer and one identified policy",
  );
});
