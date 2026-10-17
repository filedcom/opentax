import { DistributionCode } from "../../nodes/inputs/income/retirement/f1099r/index.ts";
import { FilingStatus, TS } from "../../nodes/types.ts";
import { SCENARIO_1040_08_FACTS } from "./ty2025_cases.ts";

const ASSUMED = {
  dividendPayerName: "Real Estate Investment Trust",
  ssaCopyReference: "irs-ty2025-ats-1040-08-ssa1099-cover",
  priorYearAgi: 0,
} as const;

/** Facts export requires that the packet does not print; none changes tax. */
export const SCENARIO_1040_08_ASSUMPTIONS = [
  {
    field: "ssa1099[0].source_document_reference / recipient_tin",
    value: `${ASSUMED.ssaCopyReference} / taxpayer SSN`,
    why:
      "The cover says the taxpayer received the $1,000 benefits but issues no SSA-1099 copy.",
  },
  {
    field: "f1099div[0].payerName",
    value: ASSUMED.dividendPayerName,
    why:
      "The cover names the payer only as a Real Estate Investment Trust and issues no 1099-DIV copy.",
  },
  {
    field: "general.taxpayer_prior_year_agi",
    value: String(ASSUMED.priorYearAgi),
    why: "The packet gives no 2024 AGI for the Self-Select PIN.",
  },
] as const;

/**
 * Source-backed calculation fixture for TY2025 Form 1040 ATS Scenario 8.
 *
 * The code-Q 1099-R is a qualified Roth IRA distribution, not proof of the
 * printed QCD election; no direct charitable payment or QCD amount is given.
 * The code-G 1099-R supports the printed direct-rollover checkbox. The source
 * facts retain both marks without inventing a QCD or a rollover destination.
 */
export function scenario104008Input(): Record<string, unknown> {
  const facts = SCENARIO_1040_08_FACTS;
  return {
    general: {
      ats_test_submission: true,
      taxpayer_first_name: facts.taxpayer.firstName,
      taxpayer_last_name: facts.taxpayer.lastName,
      taxpayer_ssn: facts.taxpayer.ssn,
      taxpayer_dob: facts.taxpayer.dateOfBirth,
      taxpayer_prior_year_agi: ASSUMED.priorYearAgi,
      address_line1: facts.taxpayer.address.line1,
      address_city: facts.taxpayer.address.city,
      address_state: facts.taxpayer.address.state,
      address_zip: facts.taxpayer.address.zip,
      filing_status: FilingStatus.MFS,
      spouse_first_name: facts.spouse.firstName,
      spouse_last_name: facts.spouse.lastName,
      spouse_ssn: facts.spouse.ssn,
      digital_assets: facts.form1040.digitalAssets,
      presidential_campaign_fund_taxpayer:
        facts.form1040.presidentialCampaignFundTaxpayer,
      mfs_spouse_lived_with_taxpayer: !facts.taxpayer
        .livedApartFromSpouseAllYear,
    },
    f1099r: facts.form1099R.map((form) => ({
      // Recipient and unmarked boxes visually verified on issued Copy B.
      recipient_ssn: facts.taxpayer.ssn,
      ts: TS.T,
      box2b_not_determined: false,
      box2b_total_dist: false,
      box7_ira_simple_indicator: false,
      payer_name: form.payerName,
      payer_ein: form.payerEin,
      payer_address_line1: form.payerAddress.line1,
      payer_address_city: form.payerAddress.city,
      payer_address_state: form.payerAddress.state,
      payer_address_zip: form.payerAddress.zip,
      recipient_address_line1: form.recipientAddress.line1,
      recipient_address_city: form.recipientAddress.city,
      recipient_address_state: form.recipientAddress.state,
      recipient_address_zip: form.recipientAddress.zip,
      box1_gross_distribution: form.grossDistribution,
      box2a_taxable_amount: form.taxableAmount,
      box4_federal_withheld: form.federalWithholding,
      box7_distribution_code: form.distributionCode === "Q"
        ? DistributionCode.CodeQ
        : DistributionCode.CodeG,
      direct_rollover_confirmed: form.distributionCode === "G" &&
        facts.form1040.line5cRolloverChecked,
    })),
    // The cover sheet reports this 1099-DIV amount without a payer copy.
    f1099div: [{
      payerName: ASSUMED.dividendPayerName,
      isNominee: false,
      recipient_tin: facts.taxpayer.ssn.replace(/\D/g, ""),
      box11: false,
      box1a: 0,
      box2a: facts.realEstateInvestmentTrustCapitalGainDistribution,
    }],
    ssa1099: [{
      source_document_reference: ASSUMED.ssaCopyReference,
      recipient_tin: facts.taxpayer.ssn,
      box3_gross_benefits: facts.socialSecurityBenefits.gross,
      box5_net_benefits: facts.socialSecurityBenefits.gross,
    }],
  };
}

/** Current export state and the documented packet conflict. */
export const SCENARIO_1040_08_RECONCILIATION = {
  missing: [
    "Exports without --force once the shared ATS header and test-EIN mode land. The XML validates against the TY2025 v5.4 XSD.",
    "Answer-key conflict: Form 1040 p. 2 leaves line 4a blank and checks QCD on line 4c, but the only IRA source is a $35,800 code-Q Roth distribution. The return files 35,800 on line 4a, 0 on line 4b and no QCD box; IRS clarification is requested.",
    "The SSA-1099 copy reference and 1099-DIV payer name are recorded assumptions; the cover gives only the amounts.",
  ],
} as const;
