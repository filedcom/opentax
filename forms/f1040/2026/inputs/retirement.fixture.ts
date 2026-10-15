import { DistributionCode } from "../../nodes/inputs/income/retirement/f1099r/distribution-code.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { refundAllocationGraph2026 } from "./refund-allocation.fixture.ts";
import type {
  RetirementCopy2026,
  RetirementSource2026,
} from "./retirement-source.ts";
export function retirementCopy2026(
  reference = "retirement-copy",
  ira = false,
): RetirementCopy2026 {
  return {
    tax_year: 2026,
    source_document_reference: reference,
    statement_identifier: reference,
    current_copy_review_reference: `${reference}-current`,
    corrected: false,
    payer_name: "Synthetic Retirement Trust",
    payer_tin: "123456789",
    recipient: "taxpayer",
    recipient_name: "Sam Wheat",
    recipient_tin: "400001037",
    recipient_identity_review_reference: `${reference}-identity`,
    account_number: `${reference}-account`,
    box1_gross_distribution: 12000.25,
    box2a_taxable_amount: 12000.25,
    box2b_taxable_amount_not_determined: false,
    box2b_total_distribution: false,
    box4_federal_withheld: 1000.25,
    box7a_distribution_codes: [DistributionCode.Code7],
    box7b_ira_sep_simple: ira,
    box7c_trump_account: false,
  };
}
export function retirementSource2026(
  copies = [retirementCopy2026()],
): RetirementSource2026 {
  return {
    filing_status: FilingStatus.Single,
    taxpayer_ssn: "400001037",
    taxpayer_dob: "1966-01-01",
    claim: {
      tax_year: 2026,
      record_reference: "complete-retirement-inventory",
      reviewed_on: "2027-03-01",
      reviewer_name: "Example Reviewer",
      complete_retirement_statement_and_correction_inventory_verified: true,
      copies,
      reviews: copies.map((c) => ({
        source_document_reference: c.source_document_reference,
        record_reference: `${c.source_document_reference}-taxability`,
        reviewed_on: "2027-02-28",
        reviewer_name: "Example Reviewer",
        plan_type: c.box7b_ira_sep_simple
          ? "traditional_ira"
          : "qualified_employer_plan",
        no_qcd_hsa_funding_pso_exclusion_disaster_or_corrective_treatment_verified:
          true,
        no_roth_ira_or_designated_roth_distribution_or_ira_conversion_verified:
          true,
        no_form4972_nua_election_or_other_tax_method_verified: true,
        no_unreported_excess_contributions_or_rmd_shortfall_verified: true,
        no_ira_basis_or_current_nondeductible_contributions_verified: true,
        no_indirect_rollover_repayment_or_recharacterization_verified: true,
        payer_determined_pension_taxability_verified: true,
      })),
    },
  };
}
export function retirementGraph2026(
  copies = [retirementCopy2026()],
  wages = 30000,
) {
  const base = refundAllocationGraph2026(),
    source = retirementSource2026(copies);
  const w2 = {
    ...base.w2s[0],
    box1_wages: wages,
    box3_ss_wages: Math.min(wages, 184500),
    box5_medicare_wages: wages,
    box4_ss_withheld: Math.round(Math.min(wages, 184500) * .062 * 100) / 100,
    box6_medicare_withheld: Math.round(wages * .0145 * 100) / 100,
  };
  return {
    general: { ...base.general, taxpayer_dob: source.taxpayer_dob },
    w2s: [w2],
    f1099r: { claim: source.claim },
  };
}
