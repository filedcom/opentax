import { FilingStatus } from "../../../../../nodes/types.ts";
import { DependentRelationship } from "../../../../../nodes/inputs/general/filing/general/index.ts";
const dependent = {
  first_name: "Casey",
  last_name: "Taxpayer",
  name_control: "TAXP",
  ssn: "987654321",
  dob: "2007-06-15",
  relationship: DependentRelationship.Daughter,
  irs_relationship_code: "DAUGHTER",
  months_in_home: 12,
  months_lived_with_you_in_us: 12,
  lived_in_us_over_half_year: true,
  us_citizen_national_or_resident: true,
  filed_joint_return_except_refund_only: false,
  provided_over_half_own_support: false,
  ptc_tax_return: {
    filing: "required" as const,
    filed_form1040: {
      source_document_id: "casey-filed-2025-form1040",
      taxpayer_ssn: "987654321",
      tax_year: 2025 as const,
      filing_status: "single" as const,
      blind: false,
      line1z_wages: 16_000,
      line2a_tax_exempt_interest: 0,
      line2b_taxable_interest: 0,
      line3b_dividends: 0 as const,
      line4b_ira: 0 as const,
      line5b_pensions: 0 as const,
      line6b_social_security: 0 as const,
      line7a_capital_gain: 0 as const,
      line8_additional_income: 0 as const,
      line10_adjustments: 0 as const,
      line11b_agi: 16_000,
    },
    interest_forms1099: [],
    wage_forms_w2: [{
      source_document_id: "casey-issued-2025-w2",
      employer_name: "Summer Employer",
      employer_ein: "112233445",
      employee_ssn: "987654321",
      box1_wages: 16_000,
    }],
  },
};

const policy = {
  issuer_name: "Texas Marketplace",
  policy_number: "TX-FAMILY-NO-APTC-2025",
  coverage_state: "TX",
  covered_individual_ssns: ["123456789", "987654321"],
  monthly_premiums: Array(12).fill(900),
  monthly_slcsps: Array(12).fill(0),
  monthly_aptcs: Array(12).fill(0),
  annual_premium: 10_800,
  annual_slcsp: 0,
  annual_aptc: 0,
  slcsp_corrections: Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    basis: "no_aptc" as const,
    corrected_slcsp: index < 6 ? 700 : 800,
    determination_source: "marketplace_tool" as const,
  })),
  no_aptc_monthly_evidence: Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    marketplace_slcsp: index < 6 ? 700 : 800,
    marketplace_method: "marketplace_tool" as const,
    marketplace_reference: `TX-FAMILY-SLCSP-${index + 1}`,
    marketplace_determined_on: "2026-02-01",
    marketplace_record_sha256: (index + 1).toString(16).padStart(2, "0")
      .repeat(32),
    premium_payment: {
      status: "paid_in_full" as const,
      amount: 900,
      paid_on: "2026-03-01",
      reference: `TX-FAMILY-PAID-${index + 1}`,
      record_sha256: "a".repeat(64),
    },
  })),
};

export function dependentMultipleIncomeSource(
  blind = false,
  grossOnly = false,
) {
  const d = structuredClone(dependent);
  const ssn = d.ssn;
  return {
    ...d,
    ptc_tax_return: {
      filing: "required" as const,
      filed_form1040: {
        ...d.ptc_tax_return.filed_form1040,
        blind,
        line1z_wages: grossOnly ? 13_000 : blind ? 12_000 : 14_000,
        line2a_tax_exempt_interest: 200,
        line2b_taxable_interest: grossOnly ? 1_500 : blind ? 2_000 : 1_000,
        line3b_dividends: grossOnly ? 1_500 : blind ? 2_000 : 1_000,
        line11b_agi: 16_000,
      },
      wage_forms_w2: [
        {
          source_document_id: "casey-w2-school",
          employer_name: "School Office",
          employer_ein: "112233445",
          employee_ssn: ssn,
          box1_wages: grossOnly ? 5_000 : blind ? 4_000 : 6_000,
        },
        {
          source_document_id: "casey-w2-library",
          employer_name: "Local Library",
          employer_ein: "223344556",
          employee_ssn: ssn,
          box1_wages: 5_000,
        },
        {
          source_document_id: "casey-w2-store",
          employer_name: "General Store",
          employer_ein: "334455667",
          employee_ssn: ssn,
          box1_wages: 3_000,
        },
      ],
      interest_forms1099: [
        {
          source_document_id: "casey-int-first",
          recipient_ssn: ssn,
          box1_taxable_interest: grossOnly ? 750 : blind ? 1_000 : 500,
          box8_tax_exempt_interest: 100,
        },
        {
          source_document_id: "casey-int-second",
          recipient_ssn: ssn,
          box1_taxable_interest: grossOnly ? 750 : blind ? 1_000 : 500,
          box8_tax_exempt_interest: 100,
        },
      ],
      dividend_forms1099: [
        {
          source_document_id: "casey-div-first",
          payer_ein: "445566778",
          recipient_ssn: ssn,
          box1a_ordinary_dividends: grossOnly ? 900 : blind ? 1_200 : 600,
          box1b_qualified_dividends: 0 as const,
          box2a_capital_gain_distributions: 0 as const,
          box12_exempt_interest_dividends: 0 as const,
        },
        {
          source_document_id: "casey-div-second",
          payer_ein: "556677889",
          recipient_ssn: ssn,
          box1a_ordinary_dividends: grossOnly ? 600 : blind ? 800 : 400,
          box1b_qualified_dividends: 0 as const,
          box2a_capital_gain_distributions: 0 as const,
          box12_exempt_interest_dividends: 0 as const,
        },
      ],
    },
  };
}

export function form8962MultipleSourceInputs(blind = false, grossOnly = false) {
  return {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1985-06-15",
      taxpayer_can_be_claimed_as_dependent: false,
      digital_assets: false,
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
      dependents: [dependentMultipleIncomeSource(blind, grossOnly)],
    },
    w2: [{
      employer_ein: "12-3456789",
      employer_name: "Parent Employer",
      employer_address_line1: "10 Work St",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      employee_ssn: "123-45-6789",
      box1_wages: 24_680,
      box2_fed_withheld: 3_000,
    }],
    f1095a: [structuredClone(policy)],
  };
}
