import benefitCases from "./form8962-joint-benefits.fixture.json" with {
  type: "json",
};
import { aptcMonthlyEvidenceSchema } from "./form8962-family-eligibility.ts";

/** Synthetic reviewed ordinary records; no issuer or payment authentication. */
export function jointAptcInputs(
  wages: number,
  advance: number | "equal",
  firstMonth = 1,
  benefits = false,
) {
  const base = structuredClone(benefitCases.half.inputs);
  const w2 = base.w2.map((row) => ({
    ...row,
    box1_wages: wages / 2,
    box3_ss_wages: wages / 2,
    box4_ss_withheld: Math.round(wages / 2 * .062 * 100) / 100,
    box5_medicare_wages: wages / 2,
    box6_medicare_withheld: Math.round(wages / 2 * .0145 * 100) / 100,
  }));
  const ssas = benefits ? base.ssa1099 : [];
  const sources = [
    ...w2.map((row, i) => ({
      input_key: "w2",
      source_index: i,
      source_document_reference: row.source_document_reference,
      owner_ssn: row.employee_ssn,
      tax_year: 2025,
      source_record: structuredClone(row),
    })),
    ...ssas.map((row, i) => ({
      input_key: "ssa1099",
      source_index: i,
      source_document_reference: row.source_document_reference,
      owner_ssn: row.recipient_tin,
      tax_year: 2025,
      source_record: structuredClone(row),
    })),
  ];
  const general = {
    ...base.general,
    ptc_joint_income_review: {
      ...base.general.ptc_joint_income_review,
      owners: base.general.ptc_joint_income_review.owners.map((owner) => ({
        ...owner,
        income_amounts: {
          ...owner.income_amounts,
          wages: wages / 2,
          social_security_total: benefits ? 10000 : 0,
          social_security_taxable: benefits ? 2000 : 0,
        },
        income_source_references: sources.filter((row) =>
          row.owner_ssn === owner.owner_ssn
        ).map((row) => row.source_document_reference),
      })),
      sources,
    },
  };
  const {
    no_aptc_monthly_evidence: oldReviews,
    slcsp_corrections: _corrections,
    ...original
  } = base.f1095a[0];
  // The monthly benchmark changes midyear, requiring Form 8962 lines12–23.
  const monthly_premiums = Array.from(
    { length: 12 },
    (_, i) => i + 1 >= firstMonth ? 900 : 0,
  );
  const monthly_slcsps = Array.from(
    { length: 12 },
    (_, i) => i + 1 < firstMonth ? 0 : i < 6 ? 700 : 800,
  );
  const monthly_aptcs = monthly_slcsps.map((slcsp, i) =>
    i + 1 < firstMonth ? 0 : advance === "equal" ? slcsp - 104 : advance
  );
  const policy = {
    ...original,
    monthly_premiums,
    monthly_slcsps,
    monthly_aptcs,
    annual_premium: monthly_premiums.reduce<number>((a, b) => a + b, 0),
    annual_slcsp: monthly_slcsps.reduce<number>((a, b) => a + b, 0),
    annual_aptc: monthly_aptcs.reduce((a, b) => a + b, 0),
    aptc_monthly_evidence: oldReviews.filter((row) => row.month >= firstMonth)
      .map((row) =>
        aptcMonthlyEvidenceSchema.parse({
          month: row.month,
          coverage_eligibility_review: {
            ...row.coverage_eligibility_review,
            reviewed_on: "2026-03-02",
          },
          premium_payment: {
            amount: 900 - monthly_aptcs[row.month - 1],
            paid_on: "2026-03-01",
            reference: `JOINT-APTC-BALANCE-${row.month}`,
          },
        })
      ),
  };
  return {
    general,
    w2,
    f1095a: [policy],
    ...(benefits ? { ssa1099: ssas } : {}),
  };
}

export const jointAptcCases = {
  "below-200": { wages: 26880, advance: 900, firstMonth: 1, benefits: false },
  "at-200": { wages: 30000, advance: 900, firstMonth: 1, benefits: false },
  "at-300": { wages: 61200, advance: 900, firstMonth: 1, benefits: false },
  "at-399": { wages: 92088, advance: 900, firstMonth: 1, benefits: false },
  "at-400": { wages: 92400, advance: 900, firstMonth: 1, benefits: false },
  "net-credit": { wages: 30000, advance: 100, firstMonth: 1, benefits: false },
  "equal-credit": {
    wages: 30000,
    advance: "equal",
    firstMonth: 1,
    benefits: false,
  },
  "partial-year": {
    wages: 30000,
    advance: 900,
    firstMonth: 4,
    benefits: false,
  },
  "joint-benefits": {
    wages: 30000,
    advance: 900,
    firstMonth: 1,
    benefits: true,
  },
} as const;
