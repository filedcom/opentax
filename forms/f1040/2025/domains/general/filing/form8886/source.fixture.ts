import { EntityType, ReportableCategory, TaxBenefit } from "./source.ts";
export const disclosureFixture = {
  disclosure_id: "loss-disclosure-2025",
  taxpayer_ssn: "111223333",
  tax_year: 2025 as const,
  initial_year_filer: true,
  protective_disclosure: false,
  transactions: [{
    transaction_id: "asset-loss-2025",
    name: "Reviewed asset loss",
    initial_participation_year: 2024,
    reportable_transaction_numbers: ["MA123456789"],
    source_reference: "transaction records",
  }],
  categories: [ReportableCategory.Loss],
  category_review_reference: "section 165 and published exception review",
  loss_basis_description:
    "Reviewed purchase basis, salvage and insurance amounts.",
  parties: [{
    party_id: "advisor",
    name: "Advisor Example",
    individual: true,
    identity: { kind: "ssn" as const, value: "222334444" },
    address: {
      kind: "us" as const,
      line1: "2 Example Way",
      city: "Austin",
      state: "TX",
      zip: "78701",
    },
    tax_exempt: false,
    foreign: false,
    related: false,
    involvement_description: "Provided tax advice on the asset loss.",
    source_reference: "advisor engagement",
  }],
  through_entities: [],
  fee_recipients: [{
    party_id: "advisor",
    approximate_fees_paid: 2500,
    source_reference: "fee invoice",
  }],
  benefits: [{
    kind: TaxBenefit.CapitalLoss,
    description:
      "Loss over the anticipated transaction life, before tax limits.",
    anticipated_amount: 2_000_000,
    affected_tax_years: [2025, 2026],
    source_reference: "loss workpaper",
    current_return_source_references: [
      "broker source transaction asset-loss-2025",
    ],
  }],
  anticipated_benefit_year_count: 2,
  total_investment_or_basis: 2_100_000,
  investment_basis_source_reference: "purchase records",
  transaction_steps: "Purchased the asset in 2024 and sold it in 2025.",
  expected_tax_treatment:
    "Capital loss subject to the return's loss limitations.",
  economic_business_reasons:
    "Investment subsequently disposed of after its value declined.",
  tax_result_protection:
    "No tax result insurance or contractual fee refund was provided.",
  disclosure_review_reference: "reviewed disclosure facts",
};
