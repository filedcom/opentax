import {
  type F8863Item,
  itemSchema,
} from "../../../../../nodes/inputs/credits/individual/f8863/index.ts";

export function schools(item: F8863Item, count: number, credit: "aoc" | "llc") {
  const original = item.education_expense_workpaper!;
  const institutions = Array.from({ length: count }, (_, i) => ({
    ...item.filing_details!.institutions[0],
    name: `${item.filing_details!.first_name} College ${i + 1}`,
    current_year_1098t_received: !(count === 3 && i === 2),
    ein: `33-${String(1000000 + Number(item.student_ssn!.slice(-4)) * 10 + i)}`,
    us_address: {
      line1: `${i + 1} College Road`,
      city: "Austin",
      state: "TX",
      zip: "78701",
    },
  }));
  const sources = institutions.map((institution, i) => {
    const prefix = `${item.student_ssn}-school-${i + 1}`;
    return {
      institution_ein: institution.ein,
      institution_name: institution.name,
      workpaper: {
        ...original,
        form1098t_document_id: `${prefix}-1098T`,
        form1098t_box1_payments: 3000,
        form1098t_box5_scholarships: 500,
        issued_form1098t_source: {
          ...original.issued_form1098t_source!,
          institution_name: institution.name,
          institution_ein: institution.ein,
          document_id: `${prefix}-1098T`,
          box1_payments: 3000,
        },
        paid_tuition_required_fees: 3000,
        payment_record_ids: [`${prefix}-tuition`],
        payment_sources: original.payment_sources!.map((p) => ({
          ...p,
          institution_name: institution.name,
          payment_record_id: `${prefix}-tuition`,
          amount: 3000,
        })),
        assistance_sources: original.assistance_sources!.map((a) => ({
          ...a,
          institution_name: institution.name,
          source_document_reference: `${prefix}-scholarship`,
        })),
        ...(!institution.current_year_1098t_received
          ? {
            form1098t_document_id: undefined,
            form1098t_box1_payments: undefined,
            form1098t_box5_scholarships: undefined,
            issued_form1098t_source: undefined,
            missing_1098t_exception: {
              student_ssn: item.student_ssn,
              institution_name: institution.name,
              eligible_educational_institution: true,
              eligible_institution_record_id: `${prefix}-eligibility`,
              student_enrolled: true,
              enrolled_in_degree_or_credential_program: true,
              enrollment_record_id: `${prefix}-enrollment`,
              academic_period_start_date: "2025-09-01",
              payment_tax_year: 2025,
              assistance_record_id: `${prefix}-assistance-review`,
              nonreceipt_basis_record_id: `${prefix}-nonreceipt`,
              reason: "required_but_not_received",
              institution_required_to_furnish_1098t: true,
              requested_1098t_date: "2026-02-02",
              request_record_id: `${prefix}-request`,
              fully_cooperated: true,
              cooperation_record_id: `${prefix}-cooperation`,
              return_filing_date: "2026-04-01",
            },
          }
          : {}),
      },
    };
  });
  return itemSchema.parse({
    ...item,
    credit_type: credit,
    aoc_adjusted_expenses: credit === "aoc" ? count * 2500 : undefined,
    llc_adjusted_expenses: credit === "llc" ? count * 2500 : undefined,
    // A fourth prior claim takes the LLC route directly to line 31.
    aoc_claimed_4_prior_years: credit === "llc",
    enrolled_half_time: credit === "aoc" ? true : undefined,
    completed_4_years_postsec: credit === "aoc" ? false : undefined,
    felony_drug_conviction: credit === "aoc" ? false : undefined,
    education_expense_workpaper: undefined,
    institution_expense_workpapers: sources,
    filing_details: { ...item.filing_details!, institutions },
  });
}
