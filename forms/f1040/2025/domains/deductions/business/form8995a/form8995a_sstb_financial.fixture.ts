import { sstbInvestmentFixture } from "./form8995a_sstb_investments.fixture.ts";

export const sstbFinancialCases = [
  {
    name: "advice-single",
    field: "financial_services",
    kind: "financial_advice",
    code: "523900",
    base: "single-payroll",
  },
  {
    name: "banking-mfs",
    field: "financial_services",
    kind: "investment_banking",
    code: "523150",
    base: "mfs-payroll",
  },
  {
    name: "loan-hoh",
    field: "financial_services",
    kind: "loan_arrangement",
    code: "522300",
    base: "hoh-owner-only",
  },
  {
    name: "management-qss",
    field: "investment_management",
    code: "523900",
    base: "qss-payroll",
  },
  {
    name: "broker-primary-partial",
    field: "securities_brokerage",
    code: "523150",
    base: "primary-partial-payroll",
  },
  {
    name: "management-spouse-partial",
    field: "investment_management",
    code: "523900",
    base: "spouse-partial-owner-only",
  },
  {
    name: "advice-primary-capped",
    field: "financial_services",
    kind: "financial_advice",
    code: "523900",
    base: "primary-capped-owner-only",
  },
  {
    name: "broker-spouse-capped",
    field: "securities_brokerage",
    code: "523150",
    base: "spouse-capped-payroll",
  },
  {
    name: "management-income-cap",
    field: "investment_management",
    code: "523900",
    base: "single-income-cap",
  },
] as const;

export function sstbFinancialFixture(c: typeof sstbFinancialCases[number]) {
  const input = sstbInvestmentFixture(c.base);
  const business = input.schedule_c[0];
  const review = business.qbi_sstb_filing_review;
  delete review.accounting_sstb_confirmed;
  const activity = c.field === "financial_services"
    ? c.kind === "financial_advice"
      ? "Client financial advice"
      : c.kind === "investment_banking"
      ? "Client investment banking services"
      : "Arranging client lending transactions"
    : c.field === "securities_brokerage"
    ? "Client securities brokerage for fees"
    : "Client investment management for fees";
  business.line_a_principal_business = activity;
  business.line_b_business_code = c.code;
  business.line_c_business_name = c.field === "financial_services"
    ? "Example Financial Services"
    : c.field === "securities_brokerage"
    ? "Example Securities Brokerage"
    : "Example Investment Management";
  review.business_activity_description = activity;
  review.classification_source_reference =
    `Synthetic ${c.name} client engagements`;
  review.service_classification_review = {
    field: c.field,
    engagement_records_reference: `Synthetic ${c.name} engagement records`,
    all_receipts_from_reviewed_services_confirmed: true,
    revenue_records: [
      {
        invoice_reference: `${c.name}-fee-1`,
        service_description: activity,
        amount: 10000,
      },
      {
        invoice_reference: `${c.name}-fee-2`,
        service_description: activity,
        amount: business.line_1_gross_receipts - 10000,
      },
    ],
    ...(c.field === "financial_services"
      ? {
        service_kind: c.kind,
        client_financial_services_confirmed: true,
        no_deposits_or_direct_loans_confirmed: true,
      }
      : c.field === "securities_brokerage"
      ? {
        securities_buyer_seller_transactions_for_fee_confirmed: true,
        no_real_estate_or_insurance_brokerage_confirmed: true,
      }
      : {
        client_investing_asset_management_for_fee_confirmed: true,
        no_direct_real_property_management_confirmed: true,
      }),
  };
  return input;
}
