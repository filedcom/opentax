/** Authored wage review fixture used by staged Form 8908 projections. */
export function form7220ReviewedFixture(taxpayerTin = "111223333") {
  return {
    taxpayer_name: "Sample Contractor",
    taxpayer_tin: taxpayerTin,
    facility_description: "Energy efficient multifamily residence",
    construction_began_on: "2024-01-15",
    project_labor_agreement: false,
    no_prevailing_wage_corrections: true as const,
    apprenticeship_not_applicable: true as const,
    no_alterations_or_repairs: true as const,
    signed_no_alterations_statement_reference: "SIGNED-STATEMENT-1",
    wage_rows: [{
      employer_name: "Sample Contractor",
      employer_ein: "123456789",
      work_classification: "Carpenter",
      laborers_and_mechanics: 2,
      hours_worked: 80,
      hourly_wages_paid: 3000,
      fringe_benefits_paid: 500,
      prevailing_rate_compliance_verified: true as const,
      payroll_record_reference: "PAYROLL-1",
    }],
  };
}
