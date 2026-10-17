import { sstbInvestmentFixture } from "./form8995a_sstb_investments.fixture.ts";

export const sstbIdentityCases = [
  { name: "endorsement-single", kind: "endorsement", base: "single-payroll" },
  { name: "licensing-mfs", kind: "identity_licensing", base: "mfs-payroll" },
  { name: "appearance-hoh", kind: "appearance", base: "hoh-owner-only" },
  { name: "endorsement-qss", kind: "endorsement", base: "qss-payroll" },
  {
    name: "licensing-primary-partial",
    kind: "identity_licensing",
    base: "primary-partial-payroll",
  },
  {
    name: "appearance-spouse-partial",
    kind: "appearance",
    base: "spouse-partial-owner-only",
  },
  {
    name: "endorsement-primary-capped",
    kind: "endorsement",
    base: "primary-capped-owner-only",
  },
  {
    name: "licensing-spouse-capped",
    kind: "identity_licensing",
    base: "spouse-capped-payroll",
  },
  {
    name: "appearance-income-cap",
    kind: "appearance",
    base: "single-income-cap",
  },
].map((c) => ({ ...c, code: "711510" })) as readonly {
  name: string;
  kind: "endorsement" | "identity_licensing" | "appearance";
  base: Parameters<typeof sstbInvestmentFixture>[0];
  code: string;
}[];

export function sstbIdentityFixture(c: typeof sstbIdentityCases[number]) {
  const input = sstbInvestmentFixture(c.base);
  const business = input.schedule_c[0];
  const review = business.qbi_sstb_filing_review;
  delete review.accounting_sstb_confirmed;
  const activity = {
    endorsement: "Independent performer product endorsement fees",
    identity_licensing: "Independent performer name and likeness licensing",
    appearance: "Independent performer paid event appearances",
  }[c.kind];
  business.line_a_principal_business = activity;
  business.line_b_business_code = c.code;
  business.line_c_business_name = "Example Performer Identity Services";
  review.business_activity_description = activity;
  review.classification_source_reference =
    `Synthetic ${c.name} signed engagement review`;
  review.service_classification_review = {
    field: "reputation_or_skill",
    income_kind: c.kind,
    individual_ssn: review.owner_ssn,
    independent_artist_writer_or_performer_confirmed: true,
    receipts_for_individual_identity_activity_confirmed: true,
    no_other_revenue_categories_confirmed: true,
    engagement_records_reference: `Synthetic ${c.name} engagement records`,
    all_receipts_from_reviewed_services_confirmed: true,
    revenue_records: [
      {
        invoice_reference: `${c.name}-1`,
        service_description: activity,
        amount: 10000,
      },
      {
        invoice_reference: `${c.name}-2`,
        service_description: activity,
        amount: business.line_1_gross_receipts - 10000,
      },
    ],
  };
  return input;
}
