import { sstbInvestmentFixture } from "./form8995a_sstb_investments.fixture.ts";

export const sstbProfessionalCases = [
  {
    name: "actuary-single",
    field: "actuarial_science",
    code: "541990",
    base: "single-payroll",
  },
  {
    name: "actor-mfs",
    field: "performing_arts",
    role: "actor",
    code: "711510",
    base: "mfs-payroll",
  },
  {
    name: "athlete-hoh",
    field: "athletics",
    role: "athlete",
    code: "711210",
    base: "hoh-owner-only",
  },
  {
    name: "singer-company-qss",
    field: "performing_arts",
    role: "singer",
    code: "711100",
    base: "qss-payroll",
  },
  {
    name: "actuary-primary-partial",
    field: "actuarial_science",
    code: "541990",
    base: "primary-partial-payroll",
  },
  {
    name: "coach-spouse-partial",
    field: "athletics",
    role: "coach",
    code: "711210",
    base: "spouse-partial-owner-only",
  },
  {
    name: "director-primary-capped",
    field: "performing_arts",
    role: "director",
    code: "711510",
    base: "primary-capped-owner-only",
  },
  {
    name: "manager-spouse-capped",
    field: "athletics",
    role: "team_manager",
    code: "711210",
    base: "spouse-capped-payroll",
  },
  {
    name: "actuary-income-cap",
    field: "actuarial_science",
    code: "541990",
    base: "single-income-cap",
  },
] as const;

export function sstbProfessionalFixture(
  c: typeof sstbProfessionalCases[number],
) {
  const input = sstbInvestmentFixture(c.base);
  const business = input.schedule_c[0];
  const review = business.qbi_sstb_filing_review;
  delete review.accounting_sstb_confirmed;
  const activity = c.field === "actuarial_science"
    ? "Professional actuarial services"
    : c.field === "performing_arts"
    ? `Performing arts ${c.role} services`
    : `Athletic competition ${c.role.replaceAll("_", " ")} services`;
  business.line_a_principal_business = activity;
  business.line_b_business_code = c.code;
  business.line_c_business_name = c.field === "actuarial_science"
    ? "Example Actuarial Services"
    : c.field === "performing_arts"
    ? "Example Performing Arts"
    : "Example Athletic Services";
  review.business_activity_description = activity;
  review.classification_source_reference =
    `Synthetic ${c.name} service records`;
  review.service_classification_review = {
    field: c.field,
    engagement_records_reference: `Synthetic ${c.name} engagements`,
    all_receipts_from_reviewed_services_confirmed: true,
    revenue_records: [
      {
        invoice_reference: `${c.name}-service-1`,
        service_description: activity,
        amount: 10000,
      },
      {
        invoice_reference: `${c.name}-service-2`,
        service_description: activity,
        amount: business.line_1_gross_receipts - 10000,
      },
    ],
    ...(c.field === "actuarial_science"
      ? {
        actuarial_services_by_actuary_confirmed: true,
        no_non_actuarial_services_confirmed: true,
      }
      : c.field === "performing_arts"
      ? {
        professional_role: c.role,
        unique_performing_arts_skills_confirmed: true,
        no_equipment_facility_operation_or_broadcasting_confirmed: true,
      }
      : {
        professional_role: c.role,
        unique_athletic_competition_skills_confirmed: true,
        no_equipment_facility_operation_or_broadcasting_confirmed: true,
      }),
  };
  return input;
}
