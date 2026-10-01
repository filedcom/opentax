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
