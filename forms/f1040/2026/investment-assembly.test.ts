import { investmentGraphInput2026 } from "./investment-assembly.fixture.ts";
import { assertEquals, assertMatch } from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "./source-registry.ts";
import { syntheticPabReview2026 } from "./inputs/investment.fixture.ts";
import { syntheticMedical2026 } from "./schedule-a.fixture.ts";
import { FilingStatus } from "../nodes/types.ts";
import { foreignAccountReviewFixture2026 } from "./inputs/foreign-accounts.fixture.ts";
import type { calculateForm8960_2026 } from "./nodes/form8960.ts";
import type { calculateForm6251_2026 } from "./nodes/form6251.ts";
import type { calculateInvestmentClaim2026 } from "./inputs/investment-claim.ts";
const plan = buildExecutionPlan(sourceRegistry2026);

Deno.test("2026 foreign account disclosure changes no income, AGI, NIIT or final tax", () => {
  const base = investmentGraphInput2026(180000);
  const before = run(base);
  const raw = {
    ...base,
    investment_income: {
      ...base.investment_income,
      foreign_accounts_question: true,
      foreign_account_review: foreignAccountReviewFixture2026(),
    },
  };
  const after = run(raw);
  assertEquals(after.return, before.return);
  assertEquals(after.niit.tax, before.niit.tax);
  assertEquals(after.investment.schedule_b.required, true);
  raw.investment_income.f1099ints = [];
  raw.investment_income.f1099divs = [];
  const disclosureOnly = run(raw);
  assertEquals(disclosureOnly.return.line11b_agi, 180000);
  assertEquals(disclosureOnly.investment.schedule_b.required, true);
});

function run(input: Record<string, unknown>) {
  const result = execute(plan, sourceRegistry2026, input, {
    taxYear: 2026,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  return {
    result,
    return: result.pending.f1040,
    niit: result.pending.form8960.calculation_2026 as ReturnType<
      typeof calculateForm8960_2026
    >,
    amt: result.pending.form6251.calculation_2026 as ReturnType<
      typeof calculateForm6251_2026
    >,
    investment: result.pending.investment_income.calculation_2026 as ReturnType<
      typeof calculateInvestmentClaim2026
    >,
  };
}
Deno.test("2026 investment sources reach AGI, tax, withholding and settlement once", () => {
  const input = investmentGraphInput2026(180000);
  Object.assign(input.investment_income.f1099ints[0], {
    box1: 15000,
    box2: 2000,
    box4: 1000.25,
  });
  Object.assign(input.investment_income.f1099divs[0], {
    box1a: 10000,
    box2a: 5000,
    box4: 1000.25,
  });
  const r = run(input);
  assertEquals(r.return.line2b_taxable_interest, 15000);
  assertEquals(r.return.line3b_ordinary_dividends, 10000);
  assertEquals(r.return.line3a_qualified_dividends, 500);
  assertEquals(r.return.line7a_capital_gain, 5000);
  assertEquals(r.return.line7b_schedule_d_not_required, true);
  assertEquals(r.return.line11b_agi, 208000);
  assertEquals(r.return.line10_adjustments, 2000);
  assertEquals(r.return.line25b_withheld_1099, 2001);
  assertEquals(r.return.line25d_total_withholding, 32001);
  assertEquals(r.niit.lines?.line8_total_investment_income, 30000);
  assertEquals(r.niit.lines?.line10_additional_modifications, 2000);
  assertEquals(r.niit.lines?.line12_net_investment_income, 28000);
  assertEquals(r.niit.tax, 304);
  assertEquals(r.result.pending.schedule2.line6_niit, 304);
  assertEquals(r.return.line23_other_taxes, 304);
  assertEquals(r.investment.schedule_b.required, true);
  assertEquals(r.amt.lines.line2g, 0);
  assertEquals(
    Number(r.return.line24c_total_tax),
    Number(r.return.line16_income_tax) + 304,
  );
  assertEquals(
    Number(r.return.line37_amount_owed),
    Number(r.return.line24c_total_tax) - 32001,
  );
});

Deno.test("2026 investment-only return does not need a fabricated W-2", () => {
  const input = investmentGraphInput2026(0);
  input.investment_income.f1099ints[0].box1 = 300000;
  input.investment_income.f1099divs = [];
  const r = run(input);
  assertEquals(r.return.line1a_wages, undefined);
  assertEquals(r.return.line11b_agi, 300000);
  assertEquals(r.niit.tax, 3800);
  assertEquals(r.return.line23_other_taxes, 3800);
});

Deno.test("2026 PAB-only investment preference reaches AMT without becoming NIIT income", () => {
  const input = investmentGraphInput2026(150000);
  Object.assign(input.investment_income.f1099ints[0], {
    box1: 0,
    box8: 100000,
    box9: 100000,
    pab_review: syntheticPabReview2026(),
  });
  input.investment_income.f1099divs = [];
  const r = run(input);
  assertEquals(r.return.line2a_tax_exempt, 100000);
  assertEquals(r.return.line11b_agi, 150000);
  assertEquals(r.amt.lines.line2g, 100000);
  assertEquals(r.amt.lines.line4, 250000);
  assertEquals(r.amt.lines.line11, 16840);
  assertEquals(r.return.line17_additional_taxes, 16840);
  assertEquals(r.niit.tax, 0);
  assertEquals(r.niit.file_form8960, false);
});

Deno.test("2026 investment state withholding joins W-2 taxes and NIIT allocation after deduction selection", () => {
  const input = investmentGraphInput2026(250000);
  Object.assign(input.w2s![0], { box17_state_withheld: 10000 });
  Object.assign(input.investment_income.f1099ints[0], {
    box1: 50000,
    box17: 20000,
    box15: "CA",
    box16: "CA-payer",
  });
  input.investment_income.f1099divs = [];
  const r = run(input);
  assertEquals(r.return.deduction_method, "itemized");
  assertEquals(r.return.line12e_standard_or_itemized, 30000);
  assertEquals(r.niit.source_input.schedule_a_tax_facts?.income_taxes, 30000);
  assertEquals(r.niit.lines?.line9b_state_local_tax, 5000);
  assertEquals(r.niit.tax, 1710);
  assertEquals(r.return.line23_other_taxes, 2160); // $450 additional wage Medicare.
});

Deno.test("2026 NIIT tax allocation applies the SALT cap and current overall itemized limit", () => {
  const input = investmentGraphInput2026(100000);
  Object.assign(input.investment_income.f1099ints[0], {
    box1: 900000,
    box17: 100000,
    box15: "CA",
    box16: "CA-payer",
  });
  input.investment_income.f1099divs = [];
  const medical = {
    ...syntheticMedical2026(),
    payer_ssn: "123456789",
    patient_ssn: "123456789",
    amount_paid: 103000,
  };
  const r = run({
    ...input,
    schedule_a: { ...input.schedule_a, medical_payments: [medical] },
  });
  assertEquals(r.niit.source_input.schedule_a_tax_facts?.allowed_taxes, 10000);
  assertEquals(r.niit.source_input.itemized_before_overall_limit, 34500);
  assertEquals(r.niit.source_input.itemized_after_overall_limit, 32637);
  assertEquals(r.niit.lines?.line9b_state_local_tax, 9000);
});

Deno.test("2026 no-income-tax-allocation deduction for standard deduction or elected sales taxes", () => {
  const input = investmentGraphInput2026(250000);
  Object.assign(input.investment_income.f1099ints[0], {
    box1: 50000,
    box17: 10000,
    box15: "CA",
    box16: "CA-payer",
  });
  input.investment_income.f1099divs = [];
  const standard = run(input);
  assertEquals(standard.return.deduction_method, "standard");
  assertEquals(standard.niit.lines?.line9b_state_local_tax, 0);
  assertEquals(standard.niit.tax, 1900);
  const sales = run({
    ...input,
    schedule_a: { ...input.schedule_a, tax_election: "actual_sales" },
  });
  assertEquals(sales.niit.lines?.line9b_state_local_tax, 0);
});

Deno.test("2026 investment graph rejects missing inventory, allocation or duplicate state sources", () => {
  const input = investmentGraphInput2026(250000);
  Object.assign(input.investment_income.f1099ints[0], {
    box1: 50000,
    box17: 30000,
    box15: "CA",
    box16: "CA-payer",
  });
  for (
    const patch of [
      { source_scope_review: undefined },
      { state_income_tax_allocation_review: undefined },
      {
        f1099divs: [{ ...input.investment_income.f1099divs[0], box2a: 1000 }],
        capital_gain_inventory_review: undefined,
      },
    ]
  ) {
    const result = execute(plan, sourceRegistry2026, {
      ...input,
      investment_income: { ...input.investment_income, ...patch },
    }, { taxYear: 2026, formType: "f1040" });
    assertMatch(JSON.stringify(result.diagnostics), /required|review/i);
  }
  const injected = execute(plan, sourceRegistry2026, {
    ...input,
    schedule_a: { ...input.schedule_a, information_return_tax_sources: [] },
  }, { taxYear: 2026, formType: "f1040" });
  assertMatch(JSON.stringify(injected.diagnostics), /Unrecognized|unexpected/i);
});

Deno.test("2026 joint investment sources use both owners and the joint NIIT threshold", () => {
  const input = investmentGraphInput2026(0);
  Object.assign(input.general, {
    filing_status: FilingStatus.MFJ,
    spouse_ssn: "987654321",
    spouse_first_name: "Joint",
    spouse_last_name: "Investor",
    spouse_dob: "1981-01-01",
    spouse_blind: false,
    spouse_can_be_claimed_as_dependent: false,
    spouse_citizen_national_or_work_authorized: true,
    spouse_ssn_valid_for_employment: true,
    spouse_ssn_issued_before_due_date: true,
    spouse_tin_issued_by_due_date: true,
  });
  Object.assign(input.investment_income.f1099ints[0], {
    recipient_tin: "987654321",
    box1: 300000,
  });
  const r = run(input);
  assertEquals(r.return.line11b_agi, 300800);
  assertEquals(r.niit.lines?.line14_threshold, 250000);
  assertEquals(r.niit.tax, 1930);
});
