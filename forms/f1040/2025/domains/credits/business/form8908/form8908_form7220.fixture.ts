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

export function form7220StatementFixture(
  index: number,
  street = `${index} Main Street`,
  acquisition = `SALE-${index}`,
  form7220Review = `PWA-REVIEW-${index}`,
) {
  return {
    review_reference: `STATEMENT-REVIEW-${index}`,
    form7220_review_reference: form7220Review,
    acquisition_record_reference: acquisition,
    residence: {
      street,
      city: "Albany",
      state: "NY",
      zip: "12207",
      acquired_on: "2025-06-01",
    },
    owner_name: "Residence Owner",
    pdf_file_name: `Form7220Statement-${index}.pdf`,
    pdf_sha256: "b".repeat(63) + String(index),
    signer_name: "Sample Contractor",
    signed_on: "2026-01-20",
    signature_present_reviewed: true as const,
    no_alterations_declaration_reviewed: true as const,
    perjury_declaration_reviewed: true as const,
  };
}
