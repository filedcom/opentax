import { assertThrows } from "@std/assert";
import { assertForm8962JointIncomeReview } from "./form8962-joint-income.ts";
function source() {
  const empty = {
    wages: 0,
    taxable_interest: 0,
    tax_exempt_interest: 0,
    ordinary_dividends: 0,
    taxable_ira_distributions: 0,
    taxable_pensions: 0,
    social_security_total: 0,
    social_security_taxable: 0,
    capital_gain: 0,
    additional_income: 0,
    adjustments: 0,
    foreign_earned_income_exclusion: 0,
  };
  const rows = [{
    employee_ssn: "123456789",
    source_document_reference: "T-W2",
    tax_year: 2025,
    employer_name: "Employer T",
    employer_ein: "123456780",
    box1_wages: 30000,
  }, {
    employee_ssn: "234567890",
    source_document_reference: "S-W2",
    tax_year: 2025,
    employer_name: "Employer S",
    employer_ein: "123456781",
    box1_wages: 20000,
  }];
  for (const r of rows) {
    Object.assign(r, {
      box2_fed_withheld: 1500,
      box3_ss_wages: r.box1_wages,
      box4_ss_withheld: r.box1_wages * .062,
      box5_medicare_wages: r.box1_wages,
      box6_medicare_withheld: r.box1_wages * .0145,
    });
  }
  const review = {
    tax_year: 2025,
    review_reference: "complete-owned-inventory",
    reviewed_on: "2026-02-01",
    reviewer_name: "Reviewer",
    owners: rows.map((r) => ({
      owner_ssn: r.employee_ssn,
      income_amounts: { ...empty, wages: r.box1_wages },
      income_source_references: [r.source_document_reference],
    })),
    sources: rows.map((r, i) => ({
      input_key: "w2",
      source_index: i,
      source_document_reference: r.source_document_reference,
      owner_ssn: r.employee_ssn,
      tax_year: 2025,
      source_record: structuredClone(r),
    })),
  };
  const general = {
    filing_status: "mfj",
    taxpayer_ssn: "123456789",
    spouse_ssn: "234567890",
    ptc_joint_income_review: review,
  };
  return {
    general,
    start: { general: structuredClone(general), w2: structuredClone(rows) },
    w2: { w2s: structuredClone(rows) },
    f1040: { line1z_total_wages: 50000, line11_agi: 50000 },
  };
}
Deno.test("Joint inventory reconciles two actual owners and rejects substituted or omitted sources", () => {
  const valid = source();
  assertForm8962JointIncomeReview(valid.general, valid);
  const mutations: Array<(p: any) => void> = [
    (p) => {
      p.start.w2[1].employee_ssn = "345678901";
    },
    (p) => {
      p.start.w2[1].tax_year = 2024;
    },
    (p) => {
      p.general.ptc_joint_income_review.sources.pop();
      p.start.general = structuredClone(p.general);
    },
    (p) => {
      p.general.ptc_joint_income_review.owners[1].income_amounts.wages = 0;
      p.start.general = structuredClone(p.general);
    },
    (p) => {
      p.w2.w2s[1].box1_wages = 19999;
    },
    (p) => {
      p.f1040.line11_agi = 49999;
    },
    (p) => {
      p.start.f1099r = [{ box1_gross_distribution: 100 }];
    },
    (p) => {
      p.general.ptc_joint_income_review.reviewed_on = "2025-12-30";
    },
    (p) => {
      p.general.ptc_joint_income_review.sources[1].source_record.box1_wages =
        19999;
      p.start.general = structuredClone(p.general);
    },
    (p) => {
      p.general.ptc_joint_income_review.sources.push(
        structuredClone(p.general.ptc_joint_income_review.sources[1]),
      );
      p.start.general = structuredClone(p.general);
    },
  ];
  for (const edit of mutations) {
    const p = source();
    edit(p);
    assertThrows(
      () => assertForm8962JointIncomeReview(p.general, p),
      Error,
      "Form 8962 joint income",
    );
  }
});
Deno.test("Joint inventory totals spouse interest separately and binds the complete collection", () => {
  const p: any = source(),
    r = {
      recipient_tin: "234567890",
      source_document_reference: "S-INT",
      tax_year: 2025,
      payer_name: "Bank",
      payer_tin: "345678901",
      box1: 1200,
      box8: 200,
    };
  p.start.f1099int = [structuredClone(r)];
  p.f1099int = { f1099ints: [structuredClone(r)] };
  const review = p.general.ptc_joint_income_review;
  review.sources.push({
    input_key: "f1099int",
    source_index: 0,
    source_document_reference: r.source_document_reference,
    owner_ssn: r.recipient_tin,
    tax_year: 2025,
    source_record: structuredClone(r),
  });
  review.owners[1].income_source_references.push(r.source_document_reference);
  review.owners[1].income_amounts.taxable_interest = 1200;
  review.owners[1].income_amounts.tax_exempt_interest = 200;
  p.start.general = structuredClone(p.general);
  p.f1040.line2b_taxable_interest = 1200;
  p.f1040.line2a_tax_exempt = 200;
  p.f1040.line11_agi = 51200;
  assertForm8962JointIncomeReview(p.general, p);
  delete p.start.f1099int;
  assertThrows(
    () => assertForm8962JointIncomeReview(p.general, p),
    Error,
    "Form 8962 joint income",
  );
});
