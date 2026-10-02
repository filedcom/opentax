import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import {
  DependentRelationship,
  general,
} from "../../../nodes/inputs/general/index.ts";
import { f1095a } from "../../../nodes/inputs/f1095a/index.ts";
import {
  form8962 as calculate8962,
  inputSchema as calculationSchema,
} from "../../../nodes/intermediate/forms/form8962/index.ts";
import { form8962Pdf } from "../../pdf/forms/f8962.ts";
import { form8962 } from "./f8962.ts";

const nodeContext = { taxYear: 2025, formType: "f1040" } as const;
const filer = {
  primarySSN: "123456789",
  nameLine1: "TAXPAYER TEST",
  nameControl: "TAXP",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
};

function sharedFamilyCase() {
  const generalSource = {
    filing_status: "single" as const,
    taxpayer_ssn: "123456789",
    taxpayer_can_be_claimed_as_dependent: false,
    address_state: "TX",
    dependents: [{
      first_name: "Casey",
      last_name: "Test",
      ssn: "987654321",
      dob: "2010-06-15",
      relationship: DependentRelationship.Daughter,
      months_in_home: 12,
      ptc_tax_return: {
        filing: "required" as const,
        filed_form1040: {
          source_document_id: "casey-filed-2025-1040",
          taxpayer_ssn: "987654321",
          tax_year: 2025 as const,
          filing_status: "single" as const,
          blind: false,
          line1z_wages: 0 as const,
          line2a_tax_exempt_interest: 0,
          line2b_taxable_interest: 13_000,
          line3b_dividends: 0 as const,
          line4b_ira: 0 as const,
          line5b_pensions: 0 as const,
          line6b_social_security: 0 as const,
          line7a_capital_gain: 0 as const,
          line8_additional_income: 0 as const,
          line10_adjustments: 0 as const,
          line11b_agi: 13_000,
        },
        interest_forms1099: [{
          source_document_id: "casey-2025-1099-int",
          recipient_ssn: "987654321",
          box1_taxable_interest: 13_000,
          box8_tax_exempt_interest: 0,
        }],
      },
    }],
  };
  const policy = {
    issuer_name: "Texas Marketplace",
    policy_number: "SHARED-FAMILY-2025",
    recipient_ssn: "123456789",
    coverage_state: "TX",
    covered_individual_ssns: ["123456789", "987654321", "222334444"],
    monthly_premiums: Array<number>(12).fill(1_000),
    monthly_slcsps: Array<number>(12).fill(1_200),
    monthly_aptcs: Array<number>(12).fill(200),
    shared_policy_periods: [{
      basis: "other_agreed" as const,
      situations_1_to_3_reviewed_and_inapplicable: true as const,
      other_taxpayer_ssn: "222334444",
      start_month: 1,
      end_month: 12,
      allocation_pct: 0.5,
      agreement_review: {
        tax_year: 2025 as const,
        policy_number: "SHARED-FAMILY-2025",
        filer_ssn: "123456789",
        other_taxpayer_ssn: "222334444",
        start_month: 1,
        end_month: 12,
        filer_allocation_pct: 0.5,
        both_taxpayers_agreed: true as const,
        agreement_reference: "both-families-2025-allocation",
        agreement_sha256: "a".repeat(64),
      },
    }],
  };
  const dependentFields = general.compute(
    nodeContext,
    general.inputSchema.parse(generalSource),
  ).outputs.find((row) => row.nodeType === "form8962")?.fields;
  const policyFields = f1095a.compute(
    nodeContext,
    { f1095as: [policy] },
  ).outputs.find((row) => row.nodeType === "form8962")?.fields;
  const fields = calculate8962.compute(
    nodeContext,
    calculationSchema.parse({
      ...policyFields,
      taxpayer_modified_agi: 20_000,
      dependents_modified_agi: dependentFields?.dependents_modified_agi,
      dependent_income_complete: dependentFields?.dependent_income_complete,
      household_size: 2,
      fpl_region: "contiguous",
      filing_status: "single" as const,
    }),
  ).outputs.find((row) => row.nodeType === "form8962")!.fields;
  const credit = fields.net_premium_tax_credit as number;
  const pending = {
    general: generalSource,
    f1095a: { f1095as: [policy] },
    schedule3: { line9_premium_tax_credit: credit },
    f1040: { line11_agi: 20_000, line31_additional_payments: credit },
  };
  return { fields, pending, policy, credit };
}

function nonenrolledOtherFamilyCase(taxpayerIncome: number) {
  const base = sharedFamilyCase();
  const { agreement_review: _enrolledAgreement, ...sourcePeriod } =
    base.policy.shared_policy_periods[0];
  const policy = {
    ...base.policy,
    covered_individual_ssns: ["123456789", "987654321", "333445555"],
    shared_policy_periods: [{
      ...sourcePeriod,
      other_family_claim_review: {
        covered_individual_ssn: "333445555",
        other_taxpayer_ssn: "222334444",
        policy_number: "SHARED-FAMILY-2025",
        tax_year: 2025 as const,
        other_taxpayer_claims_covered_individual: true as const,
        marketplace_enrollment_reference: "2025 Marketplace family enrollment",
        tax_family_review_reference: "2025 other-family claim review",
        tax_family_review_sha256: "b".repeat(64),
        allocation_agreement_reference: "2025 two-family allocation agreement",
        allocation_agreement_sha256: "c".repeat(64),
        filer_allocation_pct: 0.5,
      },
    }],
  };
  const policyFields = f1095a.compute(
    nodeContext,
    { f1095as: [policy] },
  ).outputs.find((row) => row.nodeType === "form8962")?.fields;
  const fields = calculate8962.compute(
    nodeContext,
    calculationSchema.parse({
      ...policyFields,
      taxpayer_modified_agi: taxpayerIncome,
      dependents_modified_agi: 13_000,
      dependent_income_complete: true,
      household_size: 2,
      fpl_region: "contiguous",
      filing_status: "single" as const,
    }),
  ).outputs.find((row) => row.nodeType === "form8962")!.fields;
  const credit = (fields.net_premium_tax_credit as number | undefined) ?? 0;
  const repayment = (fields.excess_advance_premium as number | undefined) ?? 0;
  const pending = {
    general: base.pending.general,
    f1095a: { f1095as: [policy] },
    schedule2: { line1a_excess_advance_premium: repayment },
    schedule3: { line9_premium_tax_credit: credit },
    f1040: {
      line11_agi: taxpayerIncome,
      line17_additional_taxes: repayment,
      line31_additional_payments: credit,
    },
  };
  return { fields, pending, policy, credit, repayment };
}

Deno.test("Situation 4 shared policy joins a claimed dependent and the nonenrolled other taxpayer's covered child through native, PDF and final credit", () => {
  const { fields, pending, credit } = nonenrolledOtherFamilyCase(20_000);
  assertEquals(fields.dependents_modified_agi, 13_000);
  assertEquals(fields.household_income, 33_000);
  assertEquals(credit, 4_800);
  assertEquals(pending.schedule3.line9_premium_tax_credit, credit);
  assertEquals(pending.f1040.line31_additional_payments, credit);
  const xml = form8962.build(fields, { filer, pending });
  assertStringIncludes(xml, "<SSN>222334444</SSN>");
  assertStringIncludes(
    xml,
    "<TotalDependentsModifiedAGIAmt>13000</TotalDependentsModifiedAGIAmt>",
  );
  assertStringIncludes(
    xml,
    "<ReconciledPremiumTaxCreditAmt>4800</ReconciledPremiumTaxCreditAmt>",
  );
  const projected = form8962Pdf.projectFields?.(fields, pending) ?? {};
  assertEquals(projected.pdf_month_1_premium, "500");
  assertEquals(projected.pdf_allocation_1_other_taxpayer_ssn, "222334444");
  assertEquals(form8962Pdf.instances?.(projected, filer, pending)?.length, 1);
});

Deno.test("Situation 4 nonenrolled other-family case reaches repayment and rejects claim, allocation, dependent and return drift", () => {
  const { fields, pending, policy, repayment } = nonenrolledOtherFamilyCase(
    75_000,
  );
  assertEquals(repayment, 1_200);
  assertEquals(pending.schedule2.line1a_excess_advance_premium, repayment);
  assertEquals(pending.f1040.line17_additional_taxes, repayment);
  const xml = form8962.build(fields, { filer, pending });
  assertStringIncludes(
    xml,
    "<PremiumTaxCreditTaxLiabAmt>1200</PremiumTaxCreditTaxLiabAmt>",
  );
  const projected = form8962Pdf.projectFields?.(fields, pending) ?? {};
  assertEquals(form8962Pdf.instances?.(projected, filer, pending)?.length, 1);
  const period = policy.shared_policy_periods[0];
  const changedClaim = {
    ...pending,
    f1095a: {
      f1095as: [{
        ...policy,
        shared_policy_periods: [{
          ...period,
          other_family_claim_review: {
            ...period.other_family_claim_review,
            covered_individual_ssn: "987654321",
          },
        }],
      }],
    },
  };
  assertThrows(
    () => form8962.build(fields, { filer, pending: changedClaim }),
    Error,
  );
  assertThrows(
    () => form8962Pdf.instances?.(projected, filer, changedClaim),
    Error,
  );
  assertThrows(() =>
    form8962.build(fields, {
      filer,
      pending: {
        ...pending,
        f1095a: {
          f1095as: [{
            ...policy,
            shared_policy_periods: [{
              ...period,
              other_family_claim_review: {
                ...period.other_family_claim_review,
                filer_allocation_pct: 0.6,
              },
            }],
          }],
        },
      },
    }), Error);
  assertThrows(() =>
    form8962.build(fields, {
      filer,
      pending: {
        ...pending,
        general: {
          ...pending.general,
          dependents: [{
            ...pending.general.dependents[0],
            ssn: "999887777",
          }],
        },
      },
    }), Error);
  assertThrows(() =>
    form8962.build(fields, {
      filer,
      pending: {
        ...pending,
        schedule2: { line1a_excess_advance_premium: repayment - 1 },
      },
    }), Error);
});

Deno.test("shared Situation 4 family policy binds the dependent return and both tax families through Form 8962 and PDF", () => {
  const { fields, pending, credit } = sharedFamilyCase();
  assertEquals(fields.household_size, 2);
  assertEquals(fields.dependents_modified_agi, 13_000);
  assertEquals(
    (fields.monthly_ptc_rows as Array<{ premium: number }>)[0].premium,
    500,
  );
  const xml = form8962.build(fields, { filer, pending });
  assertStringIncludes(
    xml,
    "<TotalDependentsModifiedAGIAmt>13000</TotalDependentsModifiedAGIAmt>",
  );
  assertStringIncludes(xml, "<SSN>222334444</SSN>");
  assertStringIncludes(
    xml,
    `<ReconciledPremiumTaxCreditAmt>${credit}</ReconciledPremiumTaxCreditAmt>`,
  );
  const projected = form8962Pdf.projectFields?.(fields, pending) ?? {};
  assertEquals(projected.pdf_month_1_premium, "500");
  assertEquals(projected.pdf_allocation_1_other_taxpayer_ssn, "222334444");
  assertEquals(form8962Pdf.instances?.(projected, filer, pending)?.length, 1);
});

Deno.test("shared Situation 4 family policy rejects dependent, agreement, covered-person, and final-return drift", () => {
  const { fields, pending, policy, credit } = sharedFamilyCase();
  const changedDependent = {
    ...pending,
    general: {
      ...pending.general,
      dependents: [{
        ...pending.general.dependents[0],
        ptc_tax_return: {
          ...pending.general.dependents[0].ptc_tax_return,
          interest_forms1099: [{
            ...pending.general.dependents[0].ptc_tax_return
              .interest_forms1099[0],
            box1_taxable_interest: 12_999,
          }],
        },
      }],
    },
  };
  assertThrows(
    () => form8962.build(fields, { filer, pending: changedDependent }),
    Error,
  );
  const changedAgreement = {
    ...pending,
    f1095a: {
      f1095as: [{
        ...policy,
        shared_policy_periods: [{
          ...policy.shared_policy_periods[0],
          agreement_review: {
            ...policy.shared_policy_periods[0].agreement_review,
            filer_allocation_pct: 0.6,
          },
        }],
      }],
    },
  };
  assertThrows(
    () => form8962.build(fields, { filer, pending: changedAgreement }),
    Error,
  );
  const changedCoverage = {
    ...pending,
    f1095a: {
      f1095as: [{
        ...policy,
        covered_individual_ssns: ["123456789", "999887777", "222334444"],
      }],
    },
  };
  assertThrows(
    () => form8962.build(fields, { filer, pending: changedCoverage }),
    Error,
  );
  assertThrows(() =>
    form8962.build(fields, {
      filer,
      pending: {
        ...pending,
        schedule3: { line9_premium_tax_credit: credit - 1 },
      },
    }), Error);
});
