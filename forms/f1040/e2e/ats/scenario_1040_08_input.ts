import { DistributionCode } from "../../nodes/inputs/f1099r/index.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { SCENARIO_1040_08_FACTS } from "./ty2025_cases.ts";

/**
 * Source-backed calculation fixture for TY2025 Form 1040 ATS Scenario 8.
 *
 * The code-Q 1099-R is a qualified Roth IRA distribution, not proof of the
 * printed QCD election; no direct charitable payment or QCD amount is given.
 * The code-G 1099-R supports the printed direct-rollover checkbox. The source
 * facts retain both marks without inventing a QCD or a rollover destination.
 * It is not an IRS-accepted ATS transmission.
 */
export function scenario104008Input(): Record<string, unknown> {
  const facts = SCENARIO_1040_08_FACTS;
  return {
    general: {
      taxpayer_first_name: facts.taxpayer.firstName,
      taxpayer_last_name: facts.taxpayer.lastName,
      taxpayer_ssn: facts.taxpayer.ssn,
      taxpayer_dob: facts.taxpayer.dateOfBirth,
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
    // The cover sheet reports this 1099-DIV amount but the PDF contains no
    // payer copy, so only the amount and no invented payer identity are used.
    f1099div: [{
      isNominee: false,
      box11: false,
      box1a: 0,
      box2a: facts.realEstateInvestmentTrustCapitalGainDistribution,
    }],
    ssa1099: [{
      box3_gross_benefits: facts.socialSecurityBenefits.gross,
      box5_net_benefits: facts.socialSecurityBenefits.gross,
    }],
  };
}
