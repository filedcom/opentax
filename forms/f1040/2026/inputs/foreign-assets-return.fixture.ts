import { foreignAssetsFixture2026 } from "./foreign-assets.fixture.ts";
import { foreignBankInvestmentFixture2026 } from "./foreign-bank-interest.fixture.ts";
import { investmentGraphInput2026 } from "../investment-assembly.fixture.ts";

export function foreignAssetReturnFixture2026() {
  const { filing_status: _status, taxpayer_ssn: _tin, ...investment } =
    foreignBankInvestmentFixture2026();
  const source = foreignAssetsFixture2026();
  for (const review of Object.values(source.claim.eligibility_evidence)) {
    review.subject_ssn = "123456789";
  }
  const asset = source.claim.assets[0];
  asset.asset_identifier = "foreign-account-1";
  asset.institution_or_issuer_name = "SYNTHETIC SWISS BANK";
  investment.foreign_account_review.accounts[0].iso_country_code = "CH";
  asset.tax_items = investment.foreign_bank_interest[0].receipts.map((
    receipt,
    index,
  ) => ({
    record_reference: `asset-tax-item-${index}`,
    return_source_reference: receipt.record_reference,
    kind: "interest" as const,
    amount_usd: [1100.28, 450.23][index],
    source_document: receipt.source_document,
  }));
  return {
    ...investmentGraphInput2026(180000),
    investment_income: investment,
    f8938: {
      claim: source.claim,
      account_bindings: [{
        asset_reference: asset.asset_id,
        foreign_account_references: ["synthetic-swiss-account"],
      }],
    },
  };
}
