import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  calculateCareEarnedIncome2026,
  type CareAnnualEarnings2026,
  type CareEarnedIncomeReview2026,
} from "./dependent-care-earned.ts";
const elections = {
  benefits: { taxpayer: false, spouse: false },
  credit: { taxpayer: false, spouse: false },
};
function monthly() {
  return {
    method: "monthly" as const,
    taxpayer: {
      record_reference: "payroll-months-2026",
      school_meets_full_time_student_definition: true,
      enrollment_record_reference: "enrollment-2026",
      incapacity_record_reference: "medical-2026",
      months: Array.from(
        { length: 12 },
        (_, i) => ({
          month: i + 1,
          w2_wages: 0,
          nontaxable_combat_pay: 0,
          taxable_care_benefits: 0,
          full_time_student: false,
          incapable_of_self_care: false,
        }),
      ),
    },
    both_eligible_month_choices: [] as {
      month: number;
      owner: "taxpayer" | "spouse";
    }[],
  };
}
function annual(
  wages = 0,
  combat = 0,
  taxable_care = 0,
): CareAnnualEarnings2026 {
  return {
    taxpayer: { wages, combat, taxable_care },
    spouse: { wages: 0, combat: 0, taxable_care: 0 },
  };
}
Deno.test("Care monthly income compares actual earnings with the floor in each of five nonconsecutive school months", () => {
  const review = monthly();
  for (const month of [1, 2, 3, 5, 9]) {
    review.taxpayer.months[month - 1].full_time_student = true;
  }
  review.taxpayer.months[0].w2_wages = 100;
  review.taxpayer.months[1].w2_wages = 400;
  review.taxpayer.months[4].w2_wages = 300;
  const r = calculateCareEarnedIncome2026(
    review,
    elections,
    annual(800),
    1,
    false,
    "benefits",
  );
  assertEquals(r.taxpayer, 1450);
  assert(r.deemed_income_used);
  assertEquals(r.monthly?.slice(0, 3).map((m) => m.taxpayer), [250, 400, 250]);
  assertEquals(
    calculateCareEarnedIncome2026(
      review,
      elections,
      annual(800),
      2,
      false,
      "benefits",
    ).taxpayer,
    2500,
  );
  review.taxpayer.months[8].full_time_student = false;
  const four = calculateCareEarnedIncome2026(
    review,
    elections,
    annual(800),
    1,
    false,
    "benefits",
  );
  assertEquals(four.taxpayer, 800);
  assertEquals(four.deemed_income_used, false);
  review.taxpayer.months[3].incapable_of_self_care = true;
  assertEquals(
    calculateCareEarnedIncome2026(
      review,
      elections,
      annual(800),
      1,
      false,
      "benefits",
    ).taxpayer,
    1050,
  );
});
Deno.test("Care school definition and actual higher wages determine whether deemed income was used", () => {
  const review = monthly();
  review.taxpayer.months.forEach((m) => {
    m.full_time_student = true;
    m.w2_wages = 300;
  });
  let r = calculateCareEarnedIncome2026(
    review,
    elections,
    annual(3600),
    1,
    false,
    "credit",
  );
  assertEquals(r.taxpayer, 3600);
  assertEquals(r.deemed_income_used, false);
  review.taxpayer.school_meets_full_time_student_definition = false;
  r = calculateCareEarnedIncome2026(
    review,
    elections,
    annual(3600),
    2,
    false,
    "credit",
  );
  assertEquals(r.taxpayer, 3600);
  assertEquals(r.deemed_income_used, false);
});
Deno.test("Both eligible spouses share one deemed-income allowance per month", () => {
  const base = monthly();
  base.taxpayer.months.forEach((m) => {
    m.incapable_of_self_care = true;
  });
  const review = { ...base, spouse: structuredClone(base.taxpayer) };
  assertThrows(
    () =>
      calculateCareEarnedIncome2026(
        review,
        elections,
        annual(),
        1,
        true,
        "benefits",
      ),
    Error,
    "choose one",
  );
  review.both_eligible_month_choices = Array.from(
    { length: 12 },
    (_, i) => ({ month: i + 1, owner: i % 2 ? "spouse" : "taxpayer" }),
  );
  const r = calculateCareEarnedIncome2026(
    review,
    elections,
    annual(),
    1,
    true,
    "benefits",
  );
  assertEquals(r.taxpayer, 1500);
  assertEquals(r.spouse, 1500);
  assert(r.monthly!.every((m) => m.taxpayer + m.spouse === 250));
  review.both_eligible_month_choices[1] = { month: 1, owner: "taxpayer" };
  assertThrows(() =>
    calculateCareEarnedIncome2026(
      review,
      elections,
      annual(),
      1,
      true,
      "benefits",
    )
  );
});
Deno.test("Care combat elections and taxable benefits enter the monthly maximum in the applicable part only", () => {
  const r = monthly();
  r.taxpayer.months[0].incapable_of_self_care = true;
  r.taxpayer.months[0].w2_wages = 100.25;
  r.taxpayer.months[0].nontaxable_combat_pay = 300.25;
  r.taxpayer.months[0].taxable_care_benefits = 200;
  const e = structuredClone(elections);
  e.credit.taxpayer = true;
  const source = annual(100.25, 300.25, 200);
  assertEquals(
    calculateCareEarnedIncome2026(r, e, source, 1, false, "benefits").taxpayer,
    250,
  );
  const credit = calculateCareEarnedIncome2026(
    r,
    e,
    source,
    1,
    false,
    "credit",
  );
  assertEquals(credit.taxpayer, 601);
  assertEquals(credit.deemed_income_used, false);
  e.credit.taxpayer = false;
  assertEquals(
    calculateCareEarnedIncome2026(r, e, source, 1, false, "credit").taxpayer,
    300,
  );
});
Deno.test("Monthly care income rejects missing, repeated or unreconciled sources and invalid choices", () => {
  for (
    const change of [
      (r: ReturnType<typeof monthly>) => {
        r.taxpayer.months[1].month = 1;
      },
      (r: ReturnType<typeof monthly>) => {
        r.taxpayer.months[0].w2_wages = 1;
      },
      (r: ReturnType<typeof monthly>) => {
        r.taxpayer.months[0].nontaxable_combat_pay = 1;
      },
      (r: ReturnType<typeof monthly>) => {
        r.taxpayer.months[0].taxable_care_benefits = 1;
      },
      (r: ReturnType<typeof monthly>) => {
        r.both_eligible_month_choices.push({ month: 1, owner: "taxpayer" });
      },
    ]
  ) {
    const r = monthly();
    change(r);
    assertThrows(() =>
      calculateCareEarnedIncome2026(r, elections, annual(), 1, false, "credit")
    );
  }
  const r = monthly();
  r.taxpayer.months[0].incapable_of_self_care = true;
  const { incapacity_record_reference: _record, ...taxpayer } = r.taxpayer;
  assertThrows(
    () =>
      calculateCareEarnedIncome2026(
        { ...r, taxpayer },
        elections,
        annual(),
        1,
        false,
        "credit",
      ),
    Error,
    "incapacity records",
  );
  const annualReview: CareEarnedIncomeReview2026 = {
    method: "annual_w2",
    no_student_or_disability_deemed_income: true,
  };
  assertThrows(
    () =>
      calculateCareEarnedIncome2026(
        annualReview,
        { ...elections, credit: { taxpayer: false, spouse: true } },
        annual(),
        1,
        false,
        "credit",
      ),
    Error,
    "joint return",
  );
});

Deno.test("Each spouse elects all combat pay independently for benefits and credit", () => {
  const source = {
    taxpayer: { wages: 100, combat: 500, taxable_care: 0 },
    spouse: { wages: 200, combat: 600, taxable_care: 0 },
  };
  const review = {
    method: "annual_w2" as const,
    no_student_or_disability_deemed_income: true as const,
  };
  const election = {
    benefits: { taxpayer: true, spouse: false },
    credit: { taxpayer: false, spouse: true },
  };
  const b = calculateCareEarnedIncome2026(
    review,
    election,
    source,
    1,
    true,
    "benefits",
  );
  const c = calculateCareEarnedIncome2026(
    review,
    election,
    source,
    1,
    true,
    "credit",
  );
  assertEquals([b.taxpayer, b.spouse], [600, 200]);
  assertEquals([c.taxpayer, c.spouse], [100, 800]);
  const m = monthly();
  m.taxpayer.months[0].full_time_student = true;
  const { enrollment_record_reference: _enrollment, ...taxpayer } = m.taxpayer;
  assertThrows(
    () =>
      calculateCareEarnedIncome2026(
        { ...m, taxpayer },
        elections,
        annual(),
        1,
        false,
        "credit",
      ),
    Error,
    "enrollment records",
  );
});
