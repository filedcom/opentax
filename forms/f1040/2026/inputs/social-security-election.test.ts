import { assertEquals, assertThrows } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import { calculateSocialSecuritySources2026 } from "./social-security-source.ts";
import { calculatePriorBenefitWorksheet2026 } from "./social-security-election.ts";
import {
  lumpSumGraphFixture2026,
  syntheticPriorBenefitReturn2026,
} from "./social-security-election.fixture.ts";
import { studentLoanGraphFixture2026 } from "./student-loan.fixture.ts";
const plan = buildExecutionPlan(sourceRegistry2026);
const context = { taxYear: 2026, formType: "f1040" };
function run(input: Record<string, unknown>) {
  const r = execute(plan, sourceRegistry2026, input, context);
  assertEquals(r.diagnostics, []);
  return r;
}
function sources(input = lumpSumGraphFixture2026()) {
  return calculateSocialSecuritySources2026({
    ...input.ssa1099,
    filing_status: input.general.filing_status,
    taxpayer_ssn: input.general.taxpayer_ssn,
    spouse_ssn: input.general.spouse_ssn,
  });
}
function prior(input: ReturnType<typeof lumpSumGraphFixture2026>) {
  const election = input.ssa1099.lump_sum_election;
  if (election?.method !== "use_if_lower") {
    throw new Error("Expected comparison fixture");
  }
  return election.prior_returns[0];
}
function election(r: ReturnType<typeof run>) {
  const w = r.pending.agi_aggregator.social_security_worksheet_2026 as {
    lump_sum_election: Record<string, unknown>;
  };
  return w.lump_sum_election;
}
Deno.test("2026 lump-sum comparison reproduces Pub 915 Terry Jackson's ordinary and election amounts", () => {
  const input = lumpSumGraphFixture2026();
  const s = sources(input);
  assertEquals(s.net_benefits, 11000);
  assertEquals(
    s.lump_sum_election?.prior_year_worksheets[0].additional_taxable_benefits,
    0,
  );
  const r = run(input);
  assertEquals(election(r).ordinary_taxable_benefits, 3000);
  assertEquals(election(r).election_taxable_benefits, 2500);
  assertEquals(r.pending.f1040.line6a_ss_gross, 11000);
  assertEquals(r.pending.f1040.line6b_ss_taxable, 2500);
  assertEquals(r.pending.f1040.line6c_lump_sum_election, true);
  assertEquals(r.pending.f1040.line11b_agi, 28000);
  assertEquals(r.pending.f1040.line25b_withheld_1099, 900);
  // PTC must still count the full net benefits received this year, including
  // the portion removed from taxable income by the election.
  assertEquals(r.pending.form8962.taxpayer_modified_agi, 36500);
});
Deno.test("2026 lump-sum method retains ordinary taxation when it is lower, equal or explicitly selected", () => {
  const higher = lumpSumGraphFixture2026(0);
  prior(higher).adjusted_gross_income = 100000;
  let r = run(higher);
  assertEquals(election(r).election_taxable_benefits, 1700);
  assertEquals(r.pending.f1040.line6b_ss_taxable, 0);
  assertEquals(r.pending.f1040.line6c_lump_sum_election, false);
  const equal = lumpSumGraphFixture2026(100000);
  prior(equal).adjusted_gross_income = 100000;
  r = run(equal);
  assertEquals(election(r).ordinary_taxable_benefits, 9350);
  assertEquals(election(r).election_taxable_benefits, 9350);
  assertEquals(r.pending.f1040.line6c_lump_sum_election, false);
  const declined = lumpSumGraphFixture2026();
  declined.ssa1099.lump_sum_election = {
    method: "regular_method",
    election_review_reference: "regular-method-review",
  };
  r = run(declined);
  assertEquals(r.pending.f1040.line6b_ss_taxable, 3000);
  assertEquals(r.pending.f1040.line6c_lump_sum_election, false);
});
Deno.test("2026 lump-sum worksheets use the original taxable amount for AGI and the refigured amount only for prior taxation", () => {
  const p = syntheticPriorBenefitReturn2026();
  p.tax_year = 2024;
  p.adjusted_gross_income = 20000;
  p.net_benefits_received_in_year = 10000;
  p.previous_lump_sum_payments = [{
    received_in_year: 2025,
    amount: 10000,
    source_record_reference: "previous-payment",
  }];
  p.taxable_benefits_previously_reported_or_refigured = 2500;
  const w = calculatePriorBenefitWorksheet2026(p, 10000);
  assertEquals(w.net_benefits_with_lump_sums, 30000);
  assertEquals(w.provisional_income, 35000);
  assertEquals(w.refigured_taxable_benefits, 5350);
  assertEquals(w.additional_taxable_benefits, 2850);
  p.previous_lump_sum_payments[0].received_in_year = 2024;
  assertThrows(
    () => calculatePriorBenefitWorksheet2026(p, 10000),
    Error,
    "later-year receipts",
  );
});
Deno.test("2026 lump-sum historical years use their own status, residence, 50 percent rules and exclusions", () => {
  const p = syntheticPriorBenefitReturn2026();
  p.adjusted_gross_income = 0;
  p.filing_status = FilingStatus.MFS;
  assertThrows(
    () => calculatePriorBenefitWorksheet2026(p, 10000),
    Error,
    "residence",
  );
  p.mfs_lived_with_spouse = true;
  assertEquals(
    calculatePriorBenefitWorksheet2026(p, 10000).additional_taxable_benefits,
    4250,
  );
  p.tax_year = 1993;
  assertEquals(
    calculatePriorBenefitWorksheet2026(p, 10000).additional_taxable_benefits,
    2500,
  );
  p.mfs_lived_with_spouse = false;
  assertEquals(
    calculatePriorBenefitWorksheet2026(p, 10000).additional_taxable_benefits,
    0,
  );
  p.filing_status = FilingStatus.Single;
  p.adjusted_gross_income = 30000;
  assertEquals(
    calculatePriorBenefitWorksheet2026(p, 10000).additional_taxable_benefits,
    5000,
  );
  p.tax_year = 2020;
  p.adjusted_gross_income = 15000;
  p.adjustments.unemployment_compensation_exclusion = 10200;
  p.adjustments.student_loan_interest_deduction = 2500;
  p.tax_exempt_interest = 1000;
  assertEquals(
    calculatePriorBenefitWorksheet2026(p, 10000).additional_taxable_benefits,
    4350,
  );
  p.tax_year = 2021;
  assertThrows(
    () => calculatePriorBenefitWorksheet2026(p, 10000),
    Error,
    "tax year",
  );
  p.tax_year = 1983;
  assertThrows(() => calculatePriorBenefitWorksheet2026(p, 10000));
});
Deno.test("2026 lump-sum allocation combines spouses on the same prior joint return and distinguishes prior separate returns", () => {
  const input = lumpSumGraphFixture2026(100000, FilingStatus.MFJ);
  const s = input.ssa1099.statements[0];
  s.box3_gross_benefits = 10000;
  s.box5_net_benefits = 10000;
  s.prior_year_payments![0].amount_in_box3 = 10000;
  input.ssa1099.statements.push({
    ...s,
    recipient: "spouse",
    recipient_tin: "987654321",
    claim_number: "spouse-claim",
    source_document_reference: "spouse-copy",
    prior_year_payments: [{ ...s.prior_year_payments![0] }],
  });
  const p = prior(input);
  p.filing_status = FilingStatus.MFJ;
  p.spouse_tin = "987654321";
  let calculated = sources(input);
  assertEquals(calculated.lump_sum_election?.prior_year_worksheets.length, 1);
  assertEquals(
    calculated.lump_sum_election?.prior_year_worksheets[0]
      .additional_taxable_benefits,
    500,
  );
  assertEquals(run(input).pending.f1040.line6b_ss_taxable, 500);
  p.filing_status = FilingStatus.Single;
  p.spouse_tin = undefined;
  const other = {
    ...p,
    taxpayer_tin: "987654321",
    return_id: "spouse-prior-return",
  };
  if (input.ssa1099.lump_sum_election?.method !== "use_if_lower") {
    throw new Error("fixture");
  }
  input.ssa1099.lump_sum_election.prior_returns.push(other);
  input.ssa1099.statements[1].prior_year_payments![0].prior_return_id =
    other.return_id;
  calculated = sources(input);
  assertEquals(
    calculated.lump_sum_election?.prior_year_worksheets.map((w) =>
      w.additional_taxable_benefits
    ),
    [1500, 1500],
  );
  assertEquals(run(input).pending.f1040.line6b_ss_taxable, 3000);
});
Deno.test("2026 RRB prior-year boxes reconcile to year allocations without adding benefits a second time", () => {
  const input = lumpSumGraphFixture2026();
  const s = input.ssa1099.statements[0];
  s.is_rrb = true;
  s.box6_federal_withheld = undefined;
  s.rrb_box10_federal_withheld = 900.25;
  s.rrb_box7_prior_year_benefits = 2000;
  s.rrb_box8_second_prior_year_benefits = 0;
  s.rrb_box9_earlier_year_benefits = 0;
  assertEquals(run(input).pending.f1040.line6a_ss_gross, 11000);
  s.rrb_box7_prior_year_benefits = 1999;
  assertThrows(() => sources(input), Error, "boxes 7, 8 and 9");
});
Deno.test("2026 lump-sum intake rejects missing, duplicate, wrong-owner and unmatched prior-year records", () => {
  const input = lumpSumGraphFixture2026();
  const s = input.ssa1099.statements[0];
  s.no_prior_year_lump_sum_payments = true;
  assertThrows(() => sources(input), Error, "consistent");
  s.no_prior_year_lump_sum_payments = false;
  const p = prior(input);
  p.taxpayer_tin = "999999999";
  assertThrows(() => sources(input), Error, "recipient");
  p.taxpayer_tin = "123456789";
  p.tax_year = 2024;
  assertThrows(() => sources(input), Error, "benefit-year return");
  p.tax_year = 2025;
  s.prior_year_payments!.push({ ...s.prior_year_payments![0] });
  assertThrows(() => sources(input), Error, "repeats a prior-year");
  s.prior_year_payments!.pop();
  s.prior_year_payments![0].amount_in_box3 = 12000;
  assertThrows(() => sources(input), Error, "included in box 3");
  s.prior_year_payments![0].amount_in_box3 = 2000;
  input.ssa1099.lump_sum_election = undefined;
  assertThrows(() => sources(input), Error, "explicit election");
});
Deno.test("2026 elected taxable benefits feed student-loan phaseout and all current benefits still feed PTC MAGI", () => {
  const input = lumpSumGraphFixture2026(90000);
  const s = input.ssa1099.statements[0];
  s.box3_gross_benefits = 50000;
  s.box5_net_benefits = 50000;
  s.prior_year_payments![0].amount_in_box3 = 50000;
  prior(input).adjusted_gross_income = 0;
  const r = run({
    ...input,
    student_loan_interest:
      studentLoanGraphFixture2026(90000).student_loan_interest,
  });
  assertEquals(r.pending.f1040.line6a_ss_gross, 50000);
  assertEquals(r.pending.f1040.line6b_ss_taxable, 0);
  assertEquals(r.pending.f1040.line6c_lump_sum_election, true);
  assertEquals(r.pending.f1040.line10_adjustments, 1667);
  assertEquals(r.pending.f1040.line11b_agi, 88333);
  assertEquals(r.pending.form8962.taxpayer_modified_agi, 138333);
});
Deno.test("2026 lump-sum worksheet combines cents before rounding each current printed operand", () => {
  const input = lumpSumGraphFixture2026();
  const s = input.ssa1099.statements[0];
  s.box3_gross_benefits = 11000.49;
  s.box5_net_benefits = 11000.49;
  s.prior_year_payments![0].amount_in_box3 = 2000.99;
  const r = run(input);
  assertEquals(r.pending.f1040.line6a_ss_gross, 11000);
  assertEquals(election(r).current_year_benefits_excluding_lump_sums, 9000);
  assertEquals(r.pending.f1040.line6b_ss_taxable, 2500);
});
Deno.test("2026 RRB multiple prior years reconcile boxes 7 through 9 and sum historical worksheet results once", () => {
  const input = lumpSumGraphFixture2026();
  const s = input.ssa1099.statements[0];
  s.is_rrb = true;
  s.box6_federal_withheld = undefined;
  s.rrb_box10_federal_withheld = 900.25;
  s.rrb_box7_prior_year_benefits = 1000;
  s.rrb_box8_second_prior_year_benefits = 500;
  s.rrb_box9_earlier_year_benefits = 500;
  s.prior_year_payments = [2025, 2024, 2023].map((year) => ({
    benefit_year: year,
    amount_in_box3: year === 2025 ? 1000 : 500,
    allocation_record_reference: `allocation-${year}`,
    prior_return_id: `return-${year}`,
  }));
  input.ssa1099.lump_sum_election = {
    method: "use_if_lower",
    election_review_reference: "three-years-review",
    prior_returns: [2025, 2024, 2023].map((year) => ({
      ...syntheticPriorBenefitReturn2026(),
      tax_year: year,
      return_id: `return-${year}`,
      adjusted_gross_income: year === 2025 ? 23000 : year === 2024 ? 40000 : 0,
    })),
  };
  assertEquals(
    sources(input).lump_sum_election?.prior_year_worksheets.map((w) =>
      w.additional_taxable_benefits
    ),
    [0, 425, 0],
  );
  const r = run(input);
  assertEquals(r.pending.f1040.line6b_ss_taxable, 2925);
  assertEquals(r.pending.f1040.line6c_lump_sum_election, true);
  s.rrb_box9_earlier_year_benefits = 501;
  assertThrows(() => sources(input), Error, "boxes 7, 8 and 9");
});
Deno.test("2026 lump-sum worksheets handle current repayments that exhaust the current-year benefit portion", () => {
  const input = lumpSumGraphFixture2026(100000);
  const s = input.ssa1099.statements[0];
  s.box3_gross_benefits = 2000;
  s.box4_repaid = 800;
  s.box5_net_benefits = 1200;
  const r = run(input);
  assertEquals(r.pending.f1040.line6a_ss_gross, 1200);
  assertEquals(r.pending.f1040.line6b_ss_taxable, 0);
  assertEquals(election(r).ordinary_taxable_benefits, 1020);
  assertEquals(election(r).current_year_benefits_excluding_lump_sums, 0);
  assertEquals(r.pending.f1040.line6c_lump_sum_election, true);
});
Deno.test("2026 lump-sum history rejects impossible prior taxable amounts and duplicated prior filer years", () => {
  const p = syntheticPriorBenefitReturn2026();
  p.taxable_benefits_previously_reported_or_refigured = 100;
  assertThrows(
    () => calculatePriorBenefitWorksheet2026(p, 2000),
    Error,
    "Previously taxed",
  );
  p.taxable_benefits_previously_reported_or_refigured = 0;
  p.previous_lump_sum_payments = [{
    received_in_year: 2026,
    amount: 1000,
    source_record_reference: "same-year",
  }];
  assertThrows(() => calculatePriorBenefitWorksheet2026(p, 2000));
  const input = lumpSumGraphFixture2026();
  const e = input.ssa1099.lump_sum_election;
  if (e?.method !== "use_if_lower") throw new Error("fixture");
  e.prior_returns.push({
    ...e.prior_returns[0],
    return_id: "duplicate-owner-year",
  });
  assertThrows(() => sources(input), Error, "filer across returns");
  e.prior_returns[1].taxpayer_tin = "987654321";
  assertThrows(() => sources(input), Error, "Unused prior benefit return");
});
