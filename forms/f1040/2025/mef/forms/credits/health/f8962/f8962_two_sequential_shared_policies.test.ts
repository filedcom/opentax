import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../../../../mef/header.ts";
import { f1095a } from "../../../../../../nodes/inputs/credits/health/f1095a/index.ts";
import {
  form8962 as calculate8962,
  inputSchema as calculationSchema,
} from "../../../../../../nodes/intermediate/forms/credits/health/form8962/index.ts";
import { form8962Pdf } from "../../../../../pdf/forms/credits/health/f8962.ts";
import { form8962 } from "./f8962.ts";

const nodeContext = { taxYear: 2025, formType: "f1040" } as const;
const filer = {
  primarySSN: "123456789",
  nameLine1: "TAXPAYER TEST",
  nameControl: "TAXP",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
};

function caseForIncome(income: number, advance: number) {
  const policies = [
    { id: "SHARED-JUN-2025", start: 1, end: 6, ref: "jan-jun" },
    { id: "SHARED-DEC-2025", start: 7, end: 12, ref: "jul-dec" },
  ].map(({ id, start, end, ref }) => ({
    issuer_name: "Texas Marketplace",
    policy_number: id,
    recipient_ssn: "123456789",
    coverage_state: "TX",
    covered_individual_ssns: ["123456789", "222334444"],
    monthly_premiums: Array.from(
      { length: 12 },
      (_, index) => index + 1 >= start && index + 1 <= end ? 1_000 : 0,
    ),
    monthly_slcsps: Array.from(
      { length: 12 },
      (_, index) => index + 1 >= start && index + 1 <= end ? 1_200 : 0,
    ),
    monthly_aptcs: Array.from(
      { length: 12 },
      (_, index) => index + 1 >= start && index + 1 <= end ? advance : 0,
    ),
    shared_policy_periods: [{
      basis: "other_agreed" as const,
      situations_1_to_3_reviewed_and_inapplicable: true as const,
      other_taxpayer_ssn: "222334444",
      start_month: start,
      end_month: end,
      allocation_pct: 0.5,
      agreement_review: {
        tax_year: 2025 as const,
        policy_number: id,
        filer_ssn: "123456789",
        other_taxpayer_ssn: "222334444",
        start_month: start,
        end_month: end,
        filer_allocation_pct: 0.5,
        both_taxpayers_agreed: true as const,
        agreement_reference: `${ref}-allocation-agreement`,
        agreement_sha256: (start === 1 ? "a" : "b").repeat(64),
      },
    }],
  }));
  const source = { f1095as: policies };
  const policyFields = f1095a.compute(nodeContext, source).outputs.find((row) =>
    row.nodeType === "form8962"
  )?.fields;
  const fields = calculate8962.compute(
    nodeContext,
    calculationSchema.parse({
      ...policyFields,
      taxpayer_modified_agi: income,
      dependents_modified_agi: 0,
      household_size: 1,
      fpl_region: "contiguous",
      filing_status: "single" as const,
      dependent_income_complete: true,
    }),
  ).outputs.find((row) => row.nodeType === "form8962")!.fields;
  const credit = (fields.net_premium_tax_credit as number | undefined) ?? 0;
  const repayment = (fields.excess_advance_premium as number | undefined) ?? 0;
  const pending = {
    general: {
      filing_status: "single" as const,
      taxpayer_ssn: "123456789",
      address_state: "TX",
    },
    f1095a: source,
    schedule2: { line1a_excess_advance_premium: repayment },
    schedule3: { line9_premium_tax_credit: credit },
    f1040: {
      line11_agi: income,
      line17_additional_taxes: repayment,
      line31_additional_payments: credit,
    },
  };
  return { fields, pending, policies, credit, repayment };
}

Deno.test("two sequential Situation 4 policies reconcile source, Part IV, credit, and PDF", () => {
  const { fields, pending, credit } = caseForIncome(30_000, 200);
  const allocations = fields.shared_policy_allocations as Array<{
    policy_number: string;
  }>;
  assertEquals(allocations.length, 2);
  assertEquals(credit > 0, true);
  const xml = form8962.build(fields, { filer, pending });
  assertStringIncludes(xml, "<PolicyNum>SHARED-JUN-2025</PolicyNum>");
  assertStringIncludes(xml, "<PolicyNum>SHARED-DEC-2025</PolicyNum>");
  assertStringIncludes(
    xml,
    `<ReconciledPremiumTaxCreditAmt>${credit}</ReconciledPremiumTaxCreditAmt>`,
  );
  assertEquals(pending.schedule3.line9_premium_tax_credit, credit);
  assertEquals(pending.f1040.line31_additional_payments, credit);
  const projected = form8962Pdf.projectFields?.(fields, pending) ?? {};
  assertEquals(projected.pdf_allocation_1_policy_number, "SHARED-JUN-2025");
  assertEquals(projected.pdf_allocation_2_policy_number, "SHARED-DEC-2025");
  assertEquals(form8962Pdf.instances?.(projected, filer, pending)?.length, 1);
});

Deno.test("two sequential Situation 4 policies reconcile repayment and reject source or return drift", () => {
  const { fields, pending, policies, repayment } = caseForIncome(75_000, 800);
  assertEquals(repayment > 0, true);
  const xml = form8962.build(fields, { filer, pending });
  assertStringIncludes(
    xml,
    `<PremiumTaxCreditTaxLiabAmt>${repayment}</PremiumTaxCreditTaxLiabAmt>`,
  );
  assertEquals(pending.schedule2.line1a_excess_advance_premium, repayment);
  assertEquals(pending.f1040.line17_additional_taxes, repayment);
  const projected = form8962Pdf.projectFields?.(fields, pending) ?? {};
  assertEquals(form8962Pdf.instances?.(projected, filer, pending)?.length, 1);
  const changedPolicy = {
    ...pending,
    f1095a: {
      f1095as: [
        policies[0],
        {
          ...policies[1],
          monthly_aptcs: policies[1].monthly_aptcs.map(Number),
        },
      ],
    },
  };
  changedPolicy.f1095a.f1095as[1].monthly_aptcs[6] = 0;
  assertThrows(
    () => form8962.build(fields, { filer, pending: changedPolicy }),
    Error,
  );
  const overlapping = {
    ...pending,
    f1095a: {
      f1095as: [
        policies[0],
        {
          ...policies[1],
          shared_policy_periods: [{
            ...policies[1].shared_policy_periods[0],
            start_month: 6,
          }],
        },
      ],
    },
  };
  assertThrows(
    () => form8962.build(fields, { filer, pending: overlapping }),
    Error,
  );
  assertThrows(
    () =>
      form8962Pdf.instances?.(projected, filer, {
        ...pending,
        schedule2: { line1a_excess_advance_premium: repayment - 1 },
      }),
    Error,
  );
});
