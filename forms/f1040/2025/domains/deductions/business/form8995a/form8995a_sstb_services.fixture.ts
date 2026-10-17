import {
  sstbInvestmentCases,
  sstbInvestmentFixture,
} from "./form8995a_sstb_investments.fixture.ts";

export const sstbServiceCases = [
  { name: "law-single", field: "law", code: "541100", base: "single-payroll" },
  {
    name: "consulting-mfs",
    field: "consulting",
    code: "541600",
    base: "mfs-payroll",
  },
  ...[
    "621111",
    "621112",
    "621210",
    "621310",
    "621320",
    "621330",
    "621340",
    "621391",
    "621399",
    "541940",
  ].map((code, i) => ({
    name: `health-${code}`,
    field: "health",
    code,
    base: sstbInvestmentCases[i % sstbInvestmentCases.length],
  })),
] as const;
export function sstbServiceFixture(c: typeof sstbServiceCases[number]) {
  const input = sstbInvestmentFixture(
    c.base as typeof sstbInvestmentCases[number],
  );
  const business = input.schedule_c[0];
  const review = business.qbi_sstb_filing_review;
  delete review.accounting_sstb_confirmed;
  business.line_b_business_code = c.code;
  business.line_a_principal_business = c.field === "law"
    ? "Legal advice and representation"
    : c.field === "consulting"
    ? "Management advice and counsel"
    : c.code === "541940"
    ? "Veterinary medical services"
    : "Professional medical services";
  business.line_c_business_name = c.field === "health"
    ? `Example Medical ${c.code}`
    : c.field === "law"
    ? "Example Legal"
    : "Example Consulting";
  review.business_activity_description = business.line_a_principal_business;
  review.classification_source_reference =
    `Synthetic ${c.name} service engagements and classification`;
  review.service_classification_review = {
    field: c.field,
    engagement_records_reference: `Synthetic ${c.name} engagements`,
    all_receipts_from_reviewed_services_confirmed: true,
    revenue_records: [
      {
        invoice_reference: `${c.name}-invoice-1`,
        service_description: business.line_a_principal_business,
        amount: 10000,
      },
      {
        invoice_reference: `${c.name}-invoice-2`,
        service_description: business.line_a_principal_business,
        amount: business.line_1_gross_receipts - 10000,
      },
    ],
    ...(c.field === "law"
      ? {
        unique_legal_skills_confirmed: true,
        no_printing_delivery_stenography_confirmed: true,
      }
      : c.field === "health"
      ? {
        medical_services_in_professional_capacity_confirmed: true,
        no_health_club_processing_research_manufacturing_sales_confirmed: true,
      }
      : {
        professional_advice_counsel_for_separate_fee_confirmed: true,
        no_sales_training_or_unpaid_ancillary_advice_confirmed: true,
      }),
  };
  return input;
}
