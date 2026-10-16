import { assertEquals, assertThrows } from "@std/assert";
import { agi_2026 } from "./agi.ts";
import { f1040_2026_node } from "./f1040.ts";
import { adoptionSource2026 } from "../inputs/adoption.fixture.ts";
import type { calculateAdoptionExclusion2026 } from "../inputs/adoption-settlement.ts";
import { FilingStatus } from "../../nodes/types.ts";
const ctx = { taxYear: 2026, formType: "f1040" };
function source(wages = 100000, special = false) {
  const s = adoptionSource2026();
  s.wage_sources[0].box1_wages = wages;
  if (special) {
    Object.assign(s.claim.children[0], {
      special_needs: {
        record_reference: "state-determination",
        authority: "state",
        determined_on: "2026-06-01",
        cannot_or_should_not_return_to_birth_parents_verified: true,
        cannot_be_placed_without_assistance_verified: true,
      },
      special_needs_program_reference: "adoption-program",
      expenses: [],
      current_benefits: [],
    });
    s.wage_sources[0].box12_entries = [];
  }
  return s;
}
function run(
  s = source(),
  extra: Partial<Parameters<typeof agi_2026.compute>[1]> = {},
) {
  const input = {
    filing_status: s.filing_status,
    line1a_wages: s.wage_sources.reduce((n, w) => n + w.box1_wages, 0),
    adoption_sources_2026: s,
    ...extra,
  };
  const before = structuredClone(input);
  const outputs = agi_2026.compute(ctx, input).outputs;
  assertEquals(input, before);
  const fields = (node: string): Record<string, unknown> =>
    Object.assign(
      {},
      ...outputs.filter((r) => r.nodeType === node).map((r) => r.fields),
    );
  return {
    income: fields("f1040") as Record<string, number>,
    schedule1: fields("schedule1") as Record<string, number>,
    exclusion: fields("agi_aggregator").adoption_exclusion_2026 as ReturnType<
      typeof calculateAdoptionExclusion2026
    >,
    ss: fields("agi_aggregator").social_security_worksheet_2026 as Record<
      string,
      number
    >,
    childCredit: fields("f8812") as Record<string, number>,
  };
}
Deno.test("2026 adoption exclusion derives MAGI from AGI income and adjustments before credit settlement", () => {
  const r = run(source(), {
    line1b_household_wages: 1000,
    line2b_taxable_interest: 300,
    line3b_ordinary_dividends: [200.25, 100.25],
    line7_capital_gain: -1000,
    line7a_cap_gain_distrib: 100,
    line2a_alimony_received: 500,
    line18_early_withdrawal: 100,
    line24f_501c18d: 200,
    line21_student_loan_interest: 2500,
  });
  assertEquals(r.exclusion.income, {
    wages_if_all_line23_benefits_excluded: 101000,
    taxable_interest: 300,
    ordinary_dividends: 301,
    taxable_ira: 0,
    taxable_pensions: 0,
    taxable_social_security: 0,
    capital_gain_or_loss: -900,
    schedule1_line10: 500,
    schedule1_adjustments_excluding_student_loan_interest: 100,
    magi_additions: {
      form2555_line45: 0,
      form2555_line50: 0,
      puerto_rico_excluded_income: 0,
      form4563_line15: 0,
    },
  });
  assertEquals(r.exclusion.lines.line25, 105101);
  assertEquals(r.income.line1f_taxable_adoption_benefits, 0);
  assertEquals(r.income.line9_total_income, 101201);
  assertEquals(r.income.line10_adjustments, 300);
  assertEquals(r.childCredit.auto_agi, 100901);
});
Deno.test("2026 adoption exclusion and credit income differ across the exclusion phaseout", () => {
  for (
    const [wages, taxable] of [[261080, 0], [281080, 2000], [301080, 4000]]
  ) {
    const r = run(source(wages));
    assertEquals(r.exclusion.lines.line25, wages + 4000);
    assertEquals(r.income.line1f_taxable_adoption_benefits, taxable);
    assertEquals(r.childCredit.auto_agi, wages + taxable);
  }
});
Deno.test("2026 special-needs negative line 1f reaches 1040 and student-loan income after exclusion", () => {
  const r = run(source(100000, true), { line21_student_loan_interest: 2500 });
  assertEquals(r.exclusion.lines.line25, 100000);
  assertEquals(r.income.line1f_taxable_adoption_benefits, -17670);
  assertEquals(r.income.line9_total_income, 82330);
  assertEquals(r.schedule1.line21_student_loan_interest_from_agi, 2500);
  assertEquals(r.childCredit.auto_agi, 79830);
  const result = f1040_2026_node.compute(ctx, {
    filing_status: FilingStatus.Single,
    deduction_method: "standard",
    line1a_wages: 100000,
    line9_total_income: 82330,
    line10_adjustments: 2500,
    line1f_taxable_adoption_benefits: r.income.line1f_taxable_adoption_benefits,
  }).outputs.find((o) => o.nodeType === "f1040")!.fields;
  assertEquals(result.line1f_taxable_adoption_benefits, -17670);
  assertEquals(result.line1z_total_wages, 82330);
  assertEquals(result.line11b_agi, 79830);
});
Deno.test("2026 adoption SSA worksheet adds exclusion back without a circular AGI calculation", () => {
  for (const special of [false, true]) {
    const r = run(source(26000, special), { line6a_ss_gross: 20000 });
    const taxable = special ? 6200 : 9600;
    assertEquals(r.ss.taxable_benefits, taxable);
    assertEquals(r.exclusion.income.taxable_social_security, taxable);
    assertEquals(r.ss.adoption_benefits_exclusion, special ? 17670 : 4000);
    assertEquals(
      r.ss.other_income + r.ss.adoption_benefits_exclusion,
      special ? 26000 : 30000,
    );
    assertEquals(r.exclusion.lines.line25, special ? 32200 : 39600);
    assertEquals(r.childCredit.auto_agi, special ? 14530 : 35600);
  }
});
Deno.test("2026 pending foreign benefits stay taxable in both the SSA and exclusion worksheets", () => {
  const s = source(26000);
  s.claim.children[0].origin = "foreign";
  s.claim.children[0].finalization = {
    kind: "not_final",
    status_record_reference: "pending",
  };
  const r = run(s, { line6a_ss_gross: 20000 });
  assertEquals(r.exclusion.lines.line23, 0);
  assertEquals(r.exclusion.income.wages_if_all_line23_benefits_excluded, 30000);
  assertEquals(r.income.line1f_taxable_adoption_benefits, 4000);
  assertEquals(r.ss.taxable_benefits, 9600);
  assertEquals(r.childCredit.auto_agi, 39600);
});
Deno.test("2026 adoption exclusion preserves foreign earned income addback and excludes line 24 adjustments", () => {
  const r = run(source(281080), {
    line8d_foreign_earned_income_exclusion: 50000,
    line24f_501c18d: 500,
  });
  assertEquals(r.exclusion.income.schedule1_line10, -50000);
  assertEquals(r.exclusion.income.magi_additions.form2555_line45, 50000);
  assertEquals(
    r.exclusion.income.schedule1_adjustments_excluding_student_loan_interest,
    0,
  );
  assertEquals(r.exclusion.lines.line25, 285080);
  assertEquals(r.income.line1f_taxable_adoption_benefits, 2000);
  assertEquals(r.childCredit.auto_agi, 232580);
});
Deno.test("2026 adoption AGI rejects conflicting wages, status and entered taxable amounts", () => {
  assertThrows(
    () => run(source(), { line1a_wages: 99999 }),
    Error,
    "W-2 wages",
  );
  assertThrows(
    () => run(source(), { filing_status: FilingStatus.HOH }),
    Error,
    "filing status",
  );
  assertThrows(
    () => run(source(), { line1f_taxable_adoption_benefits: 0 }),
    Error,
    "must own",
  );
  assertThrows(
    () => run(source(), { line6b_ss_taxable: 0 }),
    Error,
    "calculated Social Security",
  );
  assertThrows(
    () =>
      agi_2026.compute(ctx, {
        filing_status: FilingStatus.Single,
        line1f_taxable_adoption_benefits: 1000,
      }),
    Error,
    "reconciled source records",
  );
  assertThrows(
    () => run(source(), { adoption_magi: 0 } as never),
    Error,
    "Unrecognized key",
  );
});

Deno.test("2026 adoption exclusion uses the elected Social Security amount after its current-income comparison", () => {
  const r = run(source(26000), {
    line6a_ss_gross: 20000,
    social_security_lump_sum: {
      method: "use_if_lower",
      election_review_reference: "retained-prior-worksheet",
      net_benefits_before_rounding: 20000,
      lump_sum_payments: 10000,
      additional_taxable_benefits: 1000,
    },
  });
  // Current-year benefits: 85% * (30000 + 5000 - 34000) + 4500 = 5350.
  // Add the historical worksheet's $1000; ordinary current-year taxability is $9600.
  assertEquals(r.ss.ordinary_taxable_benefits, 9600);
  assertEquals(r.ss.taxable_benefits, 6350);
  assertEquals(r.exclusion.lines.line25, 36350);
  assertEquals(r.childCredit.auto_agi, 32350);
});
Deno.test("2026 adoption AGI keeps prior foreign recovery blocked instead of adding it to current income", () => {
  const s = source(), ch = s.claim.children[0];
  ch.origin = "foreign";
  if (ch.finalization.kind !== "final") throw Error();
  ch.finalization.foreign_finality_election_reference = "reviewed-finality";
  ch.expenses[0].incurred_on = "2024-03-01";
  ch.expenses[0].paid_on = "2024-03-02";
  ch.prior_foreign_benefits = [{
    record_reference: "benefit-2024",
    paid_on: "2024-04-01",
    amount: 6000,
    expense_allocations: [{ expense_reference: "expense-1", amount: 6000 }],
    tax_year: 2024,
    filed_return_reference: "filed-2024",
    wage_statement_reference: "w2-2024",
    actual_return_owner_tin: s.taxpayer_ssn,
    benefits_previously_included_in_taxable_wages_and_not_excluded_verified:
      true,
    qualified_employer_program_verified: true,
  }];
  assertThrows(() => run(s), Error, "affected-year recovery reconciliation");
});
