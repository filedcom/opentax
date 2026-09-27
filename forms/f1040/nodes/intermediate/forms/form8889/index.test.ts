import { assertEquals, assertThrows } from "@std/assert";
import { CoverageType, form8889, inputSchema } from "./index.ts";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import { form5329 } from "../form5329/index.ts";
import { schedule1 } from "../../../outputs/schedule1/index.ts";
import { schedule2 } from "../../aggregation/schedule2/index.ts";

const uniformSelfOnly = {
  eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.SelfOnly),
  age_55_or_older: false,
  last_month_rule_elected: false,
};
const uniformFamily = {
  ...uniformSelfOnly,
  eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.Family),
  married_at_year_end: false,
};

function compute(input: Record<string, unknown>) {
  return form8889.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(input),
  );
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Smoke test ───────────────────────────────────────────────────────────────

Deno.test("smoke: no contributions, no distributions → no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

// ─── Part I: Contribution Deduction ──────────────────────────────────────────

Deno.test("part1: self_only personal contribution → schedule1 line13_hsa_deduction", () => {
  const result = compute({
    ...uniformSelfOnly,
    taxpayer_hsa_contributions: 3000,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_hsa_deduction, 3000);
});

Deno.test("part1: family personal contribution → schedule1 line13_hsa_deduction", () => {
  const result = compute({
    ...uniformFamily,
    taxpayer_hsa_contributions: 5000,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_hsa_deduction, 5000);
});

Deno.test("part1: total contributions capped at annual limit (self_only 4300)", () => {
  // employer 2000 + taxpayer 2500 = total 4500 > limit 4300 → excess = 200.
  // Line 13 deduction covers only the taxpayer's own contributions, capped at
  // the limit remaining after employer contributions: min(2500, 4300-2000) = 2300.
  // (IRC §223(a); employer contributions are already excluded from W-2 box 1.)
  const result = compute({
    ...uniformSelfOnly,
    taxpayer_hsa_contributions: 2500,
    employer_hsa_contributions: 2000,
    hsa_december_31_value: 4500,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_hsa_deduction, 2300);
  assertEquals(fieldsOf(result.outputs, form5329)!.excess_hsa, 200);
});

Deno.test("part1: employer fills entire limit → no taxpayer deduction, taxpayer excess to form5329", () => {
  // employer 4300 fills the self_only limit entirely; taxpayer adds 500 on top → excess = 500.
  // No limit remains for the taxpayer's own contributions → line 13 deduction = 0.
  // (Employer contributions are excluded from W-2 box 1, not deducted again.)
  const result = compute({
    ...uniformSelfOnly,
    taxpayer_hsa_contributions: 500,
    employer_hsa_contributions: 4300,
    hsa_december_31_value: 4800,
  });
  assertEquals(fieldsOf(result.outputs, schedule1), undefined);
  assertEquals(fieldsOf(result.outputs, form5329)!.excess_hsa, 500);
});

Deno.test("part1: age 55+ catch-up adds $1000 to self_only limit", () => {
  // limit = 4300 + 1000 = 5300; contribute 5300 → fully deductible
  const result = compute({
    ...uniformSelfOnly,
    taxpayer_hsa_contributions: 5300,
    age_55_or_older: true,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_hsa_deduction, 5300);
});

Deno.test("part1: age 55+ catch-up adds $1000 to family limit", () => {
  // limit = 8550 + 1000 = 9550; contribute 9550 → fully deductible
  const result = compute({
    ...uniformFamily,
    taxpayer_hsa_contributions: 9550,
    age_55_or_older: true,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_hsa_deduction, 9550);
});

Deno.test("part1: contribution at exact limit → fully deductible, no excess", () => {
  const result = compute({
    ...uniformSelfOnly,
    taxpayer_hsa_contributions: 4300,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_hsa_deduction, 4300);
  const f5329 = findOutput(result, "form5329");
  assertEquals(f5329, undefined);
});

// ─── Part I: Excess Contributions → form5329 ─────────────────────────────────

Deno.test("part1: excess contributions route to form5329 excess_hsa", () => {
  // self_only limit 4300; taxpayer contributes 5000 → excess = 700
  const result = compute({
    ...uniformSelfOnly,
    taxpayer_hsa_contributions: 5000,
    hsa_december_31_value: 5000,
  });
  assertEquals(fieldsOf(result.outputs, form5329)!.excess_hsa, 700);
});

Deno.test("part1: combined employer+taxpayer excess routes to form5329", () => {
  // family limit 8550; employer 4000, taxpayer 5000 → total 9000, excess = 450
  const result = compute({
    ...uniformFamily,
    taxpayer_hsa_contributions: 5000,
    employer_hsa_contributions: 4000,
    hsa_december_31_value: 9000,
  });
  assertEquals(fieldsOf(result.outputs, form5329)!.excess_hsa, 450);
});

Deno.test("part1: direct IRA-to-HSA funding transfer reduces line 12 contribution room", () => {
  const result = compute({
    ...uniformSelfOnly,
    taxpayer_hsa_contributions: 2500,
    employer_hsa_contributions: 1000,
    hsa_december_31_value: 4500,
    qualified_hsa_funding_distribution: {
      amount: 1000,
      transfer_month: 6,
      ira_type: "traditional",
      direct_trustee_transfer: true,
      no_prior_qualified_funding_distribution: true,
      source_reference: "2025 IRA trustee transfer confirmation",
    },
  });
  const printed = findOutput(result, "form8889")?.fields;
  assertEquals(printed?.print_line10, 1000);
  assertEquals(printed?.print_line11, 2000);
  assertEquals(printed?.print_line12, 2300);
  assertEquals(printed?.print_line13_deduction, 2300);
  assertEquals(fieldsOf(result.outputs, form5329)?.excess_hsa, 200);
});

Deno.test("part1: a funding transfer needs eligible coverage in its transfer month", () => {
  assertThrows(
    () =>
      compute({
        ...uniformSelfOnly,
        eligible_hdhp_coverage_by_month: [
          ...Array(5).fill(CoverageType.SelfOnly),
          null,
          ...Array(6).fill(CoverageType.SelfOnly),
        ],
        qualified_hsa_funding_distribution: {
          amount: 1000,
          transfer_month: 6,
          ira_type: "roth",
          direct_trustee_transfer: true,
          no_prior_qualified_funding_distribution: true,
          source_reference: "Roth IRA trustee transfer confirmation",
        },
      }),
    Error,
    "needs HDHP eligibility in its transfer month",
  );
});

Deno.test("part1: a funding-only Form 8889 prints line 10 without a deduction", () => {
  const result = compute({
    ...uniformSelfOnly,
    qualified_hsa_funding_distribution: {
      amount: 1000,
      transfer_month: 3,
      ira_type: "roth",
      direct_trustee_transfer: true,
      no_prior_qualified_funding_distribution: true,
      source_reference: "Roth IRA trustee transfer confirmation",
    },
  });
  assertEquals(findOutput(result, "form8889")?.fields.print_line10, 1000);
  assertEquals(findOutput(result, "form8889")?.fields.print_line12, 3300);
  assertEquals(fieldsOf(result.outputs, schedule1), undefined);
});

Deno.test("part1: employer funding above the contribution limit needs income treatment", () => {
  assertThrows(
    () =>
      compute({
        ...uniformSelfOnly,
        employer_hsa_contributions: 5000,
      }),
    Error,
    "employer HSA contributions above the limit",
  );
});

Deno.test("part1: retained employer excess omitted from W-2 box 1 reaches other income and Form 5329", () => {
  const result = compute({
    ...uniformSelfOnly,
    employer_hsa_contributions: 5000,
    employer_excess_treatment: {
      included_in_w2_box1: false,
      retained_through_return_due_date: true,
    },
    hsa_december_31_value: 300,
  });
  assertEquals(
    fieldsOf(result.outputs, schedule1)?.line8z_hsa_excess_employer,
    700,
  );
  assertEquals(
    findOutput(result, "agi_aggregator")?.fields.line8z_hsa_excess_employer,
    700,
  );
  assertEquals(fieldsOf(result.outputs, form5329)?.excess_hsa, 700);
  assertEquals(fieldsOf(result.outputs, form5329)?.hsa_value, 300);
  assertEquals(
    findOutput(result, "form8889")?.fields.print_line9_employer,
    5000,
  );
});

Deno.test("part1: retained employer excess already in W-2 box 1 is not other income again", () => {
  const result = compute({
    ...uniformSelfOnly,
    employer_hsa_contributions: 5000,
    employer_excess_treatment: {
      included_in_w2_box1: true,
      retained_through_return_due_date: true,
    },
    hsa_december_31_value: 700,
  });
  assertEquals(fieldsOf(result.outputs, schedule1), undefined);
  assertEquals(fieldsOf(result.outputs, form5329)?.excess_hsa, 700);
});

Deno.test("part1: an excess HSA needs its December 31 value", () => {
  assertThrows(
    () => compute({ ...uniformSelfOnly, taxpayer_hsa_contributions: 5000 }),
    Error,
    "December 31 HSA value",
  );
});

// ─── Part II: Distributions ───────────────────────────────────────────────────

Deno.test("part2: fully qualified distribution → no income, no penalty", () => {
  const result = compute({
    hsa_distributions: 2000,
    qualified_medical_expenses: 2000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1, undefined);
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2, undefined);
});

Deno.test("part2: non-qualified distribution → schedule1 line8f HSA income", () => {
  // distribute 3000, qualified 1000 → taxable 2000
  const result = compute({
    hsa_distributions: 3000,
    qualified_medical_expenses: 1000,
    exception_qualified_taxable_amount: 0,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line8f_hsa_income, 2000);
});

Deno.test("part2: taxable distribution needs an explicit penalty exception amount", () => {
  assertThrows(
    () =>
      compute({ hsa_distributions: 3000, qualified_medical_expenses: 1000 }),
    Error,
    "needs an explicit additional-tax exception amount",
  );
});

Deno.test("part2: non-qualified distribution → 20% penalty on schedule2 line17c_hsa_penalty", () => {
  // distribute 3000, qualified 1000 → taxable 2000 → penalty 400
  const result = compute({
    hsa_distributions: 3000,
    qualified_medical_expenses: 1000,
    exception_qualified_taxable_amount: 0,
  });
  assertEquals(fieldsOf(result.outputs, schedule2)!.line17c_hsa_penalty, 400);
});

Deno.test("part2: fully non-qualified distribution → income + 20% penalty", () => {
  // distribute 1000, no qualified expenses → taxable 1000 → penalty 200
  const result = compute({
    hsa_distributions: 1000,
    exception_qualified_taxable_amount: 0,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line8f_hsa_income, 1000);
  assertEquals(fieldsOf(result.outputs, schedule2)!.line17c_hsa_penalty, 200);
});

Deno.test("part2: line 14b rollover reduces taxable net distributions", () => {
  const result = compute({
    hsa_distributions: 5000,
    hsa_excluded_distributions: { rollover_amount: 3000 },
    qualified_medical_expenses: 1500,
    exception_qualified_taxable_amount: 0,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)?.line8f_hsa_income, 500);
  assertEquals(fieldsOf(result.outputs, schedule2)?.line17c_hsa_penalty, 100);
  assertEquals(
    findOutput(result, "form8889")?.fields.print_line14b_excluded_distributions,
    3000,
  );
  assertEquals(findOutput(result, "form8889")?.fields.print_line14c, 2000);
});

Deno.test("part2: line 14b and line 15 cannot exceed their source distribution", () => {
  assertThrows(
    () =>
      compute({
        hsa_distributions: 1000,
        hsa_excluded_distributions: { rollover_amount: 1001 },
      }),
    Error,
    "line 14b cannot exceed",
  );
  assertThrows(
    () =>
      compute({
        hsa_distributions: 1000,
        hsa_excluded_distributions: { rollover_amount: 600 },
        qualified_medical_expenses: 500,
      }),
    Error,
    "line 15 qualified expenses cannot exceed",
  );
});

Deno.test("part2: timely excess-withdrawal earnings reach Schedule 1 other income", () => {
  const result = compute({
    ...uniformSelfOnly,
    taxpayer_hsa_contributions: 5200,
    hsa_distributions: 3000,
    hsa_excluded_distributions: {
      timely_excess_withdrawal: {
        source: "current_year_personal",
        amount_including_earnings: 1000,
        included_earnings: 100,
        withdrawn_by_return_due_date: true,
      },
    },
    qualified_medical_expenses: 2000,
  });
  assertEquals(
    findOutput(result, "form8889")?.fields.print_line14b_excluded_distributions,
    1000,
  );
  assertEquals(findOutput(result, "form8889")?.fields.print_line14c, 2000);
  assertEquals(
    fieldsOf(result.outputs, schedule1)?.line8z_hsa_excess_earnings,
    100,
  );
  assertEquals(
    findOutput(result, "agi_aggregator")?.fields.line8z_hsa_excess_earnings,
    100,
  );
  assertEquals(fieldsOf(result.outputs, schedule2), undefined);
  assertEquals(fieldsOf(result.outputs, form5329), undefined);
});

Deno.test("part2: timely personal withdrawal cannot exceed its 2025 contribution excess", () => {
  assertThrows(
    () =>
      compute({
        ...uniformSelfOnly,
        taxpayer_hsa_contributions: 5000,
        hsa_distributions: 900,
        hsa_excluded_distributions: {
          timely_excess_withdrawal: {
            source: "current_year_personal",
            amount_including_earnings: 900,
            included_earnings: 0,
            withdrawn_by_return_due_date: true,
          },
        },
      }),
    Error,
    "exceeds excess personal contributions",
  );
});

Deno.test("part2: excluded withdrawal earnings cannot exceed its distribution", () => {
  assertThrows(
    () =>
      compute({
        hsa_distributions: 1000,
        hsa_excluded_distributions: {
          timely_excess_withdrawal: {
            source: "current_year_personal",
            amount_including_earnings: 500,
            included_earnings: 501,
            withdrawn_by_return_due_date: true,
          },
        },
      }),
    Error,
    "earnings cannot exceed the withdrawal",
  );
});

Deno.test("part2: fully excepted distribution keeps income but has no 20% tax", () => {
  // distribute 2000, qualified 500 → taxable 1500; exception → no penalty
  const result = compute({
    hsa_distributions: 2000,
    qualified_medical_expenses: 500,
    exception_qualified_taxable_amount: 1500,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line8f_hsa_income, 1500);
  const s2 = findOutput(result, "schedule2");
  assertEquals(s2, undefined); // no penalty
});

Deno.test("part2: a partly excepted distribution taxes only the remaining amount", () => {
  const result = compute({
    hsa_distributions: 3000,
    qualified_medical_expenses: 1000,
    exception_qualified_taxable_amount: 750,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)?.line8f_hsa_income, 2000);
  assertEquals(fieldsOf(result.outputs, schedule2)?.line17c_hsa_penalty, 250);
  assertEquals(
    findOutput(result, "form8889")?.fields.print_line17a_exception,
    true,
  );
  assertEquals(
    findOutput(result, "form8889")?.fields.print_line17b_penalty,
    250,
  );
});

Deno.test("part2: the excepted portion cannot exceed taxable distributions", () => {
  assertThrows(
    () =>
      compute({
        hsa_distributions: 1000,
        qualified_medical_expenses: 400,
        exception_qualified_taxable_amount: 601,
      }),
    Error,
    "exception amount cannot exceed taxable distributions",
  );
});

// ─── Combined: contributions + distributions ──────────────────────────────────

Deno.test("combined: deduction + non-qualified distribution both present", () => {
  // self_only, contribute 3000, distribute 1000 non-qualified
  const result = compute({
    ...uniformSelfOnly,
    taxpayer_hsa_contributions: 3000,
    hsa_distributions: 1000,
    exception_qualified_taxable_amount: 0,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)!.line13_hsa_deduction, 3000);
  assertEquals(fieldsOf(result.outputs, schedule1)!.line8f_hsa_income, 1000);
  assertEquals(fieldsOf(result.outputs, schedule2)!.line17c_hsa_penalty, 200);
});

Deno.test("part3: prior-year testing-period failure reaches Schedule 1 line 8f and Schedule 2 line 17d", () => {
  const result = compute({
    testing_period_failure: {
      last_month_rule_excess_amount: 1200,
      qualified_funding_distribution_amount: 800,
      not_death_or_disability: true,
      prior_year_source:
        "2024 Form 8889 line 3 worksheet and IRA-to-HSA transfer",
    },
  });
  assertEquals(fieldsOf(result.outputs, schedule1)?.line8f_hsa_income, 2000);
  assertEquals(
    fieldsOf(result.outputs, schedule2)?.line17d_hsa_eligibility_tax,
    200,
  );
  assertEquals(findOutput(result, "form8889")?.fields.print_line18, 1200);
  assertEquals(findOutput(result, "form8889")?.fields.print_line19, 800);
  assertEquals(findOutput(result, "form8889")?.fields.print_line20, 2000);
  assertEquals(findOutput(result, "form8889")?.fields.print_line21, 200);
});

Deno.test("part3: distribution and testing-period income share line 8f but keep both taxes", () => {
  const result = compute({
    hsa_distributions: 1000,
    qualified_medical_expenses: 400,
    exception_qualified_taxable_amount: 0,
    testing_period_failure: {
      last_month_rule_excess_amount: 500,
      qualified_funding_distribution_amount: 0,
      not_death_or_disability: true,
      prior_year_source: "2024 HSA contribution worksheet",
    },
  });
  assertEquals(fieldsOf(result.outputs, schedule1)?.line8f_hsa_income, 1100);
  assertEquals(fieldsOf(result.outputs, schedule2)?.line17c_hsa_penalty, 120);
  assertEquals(
    fieldsOf(result.outputs, schedule2)?.line17d_hsa_eligibility_tax,
    50,
  );
});

Deno.test("part1: married family catch-up prints on line 7, not line 3", () => {
  const result = compute({
    ...uniformFamily,
    married_at_year_end: true,
    spouse_has_separate_hsa: false,
    age_55_or_older: true,
    taxpayer_hsa_contributions: 9550,
  });
  assertEquals(fieldsOf(result.outputs, schedule1)?.line13_hsa_deduction, 9550);
  assertEquals(findOutput(result, "form8889")?.fields.print_line3_limit, 8550);
  assertEquals(
    findOutput(result, "form8889")?.fields.print_line7_catchup,
    1000,
  );
});

Deno.test("part1: separate spouses allocate the full-year family limit on line 6", () => {
  const result = compute({
    ...uniformFamily,
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    spouse_allocated_family_limit: 4275,
    taxpayer_hsa_contributions: 5000,
    hsa_december_31_value: 5000,
  });
  const printed = findOutput(result, "form8889")?.fields;
  assertEquals(printed?.print_line5, 8550);
  assertEquals(printed?.print_line6, 4275);
  assertEquals(printed?.print_line8, 4275);
  assertEquals(fieldsOf(result.outputs, schedule1)?.line13_hsa_deduction, 4275);
  assertEquals(fieldsOf(result.outputs, form5329)?.excess_hsa, 725);
});

Deno.test("part1: a partial-year family limit allocates only the family portion", () => {
  const result = compute({
    ...uniformFamily,
    eligible_hdhp_coverage_by_month: [
      ...Array(6).fill(CoverageType.Family),
      ...Array(6).fill(null),
    ],
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    spouse_allocated_family_limit: 2000,
    taxpayer_hsa_contributions: 2000,
  });
  const printed = findOutput(result, "form8889")?.fields;
  assertEquals(printed?.print_line5, 4275);
  assertEquals(printed?.print_line6, 2275);
  assertEquals(printed?.print_line8, 2275);
});

Deno.test("part1: the spouse family allocation follows the Archer-adjusted limit", () => {
  const result = compute({
    ...uniformFamily,
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    archer_msa_distributions: 1000,
    spouse_allocated_family_limit: 3775,
    taxpayer_hsa_contributions: 3000,
  });
  const printed = findOutput(result, "form8889")?.fields;
  assertEquals(printed?.print_line5, 7550);
  assertEquals(printed?.print_line6, 3775);
  assertEquals(printed?.print_line13_deduction, 3000);
});

Deno.test("part1: separate spouses need an agreed allocation within the family limit", () => {
  assertThrows(
    () =>
      compute({
        ...uniformFamily,
        married_at_year_end: true,
        spouse_has_separate_hsa: true,
        taxpayer_hsa_contributions: 1000,
      }),
    Error,
    "need the agreed family-limit allocation",
  );
  assertThrows(
    () =>
      compute({
        ...uniformFamily,
        married_at_year_end: true,
        spouse_has_separate_hsa: true,
        spouse_allocated_family_limit: 8551,
        taxpayer_hsa_contributions: 1000,
      }),
    Error,
    "exceeds the refigured family limit",
  );
});

Deno.test("part1: missing monthly coverage and last-month-rule answers stop", () => {
  assertThrows(
    () =>
      compute({
        age_55_or_older: false,
        taxpayer_hsa_contributions: 1000,
      }),
    Error,
    "twelve monthly HDHP eligibility/coverage facts",
  );
  assertThrows(
    () =>
      compute({
        ...uniformSelfOnly,
        last_month_rule_elected: undefined,
        taxpayer_hsa_contributions: 1000,
      }),
    Error,
    "last-month-rule answer",
  );
});

Deno.test("part1: mixed full-year coverage uses the larger worksheet or December limit", () => {
  const result = compute({
    ...uniformFamily,
    eligible_hdhp_coverage_by_month: [
      ...Array(6).fill(CoverageType.SelfOnly),
      ...Array(6).fill(CoverageType.Family),
    ],
    taxpayer_hsa_contributions: 8000,
  });
  assertEquals(findOutput(result, "form8889")?.fields.print_line3_limit, 8550);
  assertEquals(
    findOutput(result, "form8889")?.fields.print_line1_coverage,
    "family",
  );
  assertEquals(fieldsOf(result.outputs, schedule1)?.line13_hsa_deduction, 8000);
});

Deno.test("part1: mixed coverage with December self-only keeps the larger worksheet", () => {
  const result = compute({
    ...uniformFamily,
    eligible_hdhp_coverage_by_month: [
      ...Array(7).fill(CoverageType.Family),
      ...Array(5).fill(CoverageType.SelfOnly),
    ],
    taxpayer_hsa_contributions: 6500,
  });
  assertEquals(findOutput(result, "form8889")?.fields.print_line3_limit, 6779);
  assertEquals(
    findOutput(result, "form8889")?.fields.print_line1_coverage,
    "family",
  );
});

Deno.test("part1: partial-year coverage uses the twelve-month worksheet", () => {
  const result = compute({
    ...uniformSelfOnly,
    eligible_hdhp_coverage_by_month: [
      ...Array(6).fill(CoverageType.SelfOnly),
      ...Array(6).fill(null),
    ],
    taxpayer_hsa_contributions: 2000,
  });
  assertEquals(findOutput(result, "form8889")?.fields.print_line3_limit, 2150);
});

Deno.test("part1: elected last-month rule uses December family coverage for the year", () => {
  const result = compute({
    ...uniformFamily,
    eligible_hdhp_coverage_by_month: [
      ...Array(11).fill(null),
      CoverageType.Family,
    ],
    last_month_rule_elected: true,
    taxpayer_hsa_contributions: 8000,
  });
  assertEquals(findOutput(result, "form8889")?.fields.print_line3_limit, 8550);
  assertEquals(fieldsOf(result.outputs, schedule1)?.line13_hsa_deduction, 8000);
});

Deno.test("part1: elected last-month rule prints December self-only coverage", () => {
  const result = compute({
    ...uniformFamily,
    eligible_hdhp_coverage_by_month: [
      ...Array(10).fill(CoverageType.Family),
      null,
      CoverageType.SelfOnly,
    ],
    last_month_rule_elected: true,
    taxpayer_hsa_contributions: 4000,
  });
  assertEquals(
    findOutput(result, "form8889")?.fields.print_line1_coverage,
    "self_only",
  );
  assertEquals(findOutput(result, "form8889")?.fields.print_line3_limit, 4300);
});

Deno.test("part1: married age-55 family catch-up uses eligible months on line 7", () => {
  const result = compute({
    ...uniformFamily,
    eligible_hdhp_coverage_by_month: [
      ...Array(6).fill(CoverageType.Family),
      ...Array(6).fill(null),
    ],
    married_at_year_end: true,
    spouse_has_separate_hsa: false,
    age_55_or_older: true,
    taxpayer_hsa_contributions: 4700,
  });
  assertEquals(findOutput(result, "form8889")?.fields.print_line3_limit, 4275);
  assertEquals(findOutput(result, "form8889")?.fields.print_line7_catchup, 500);
});

Deno.test("part1: last-month rule requires December eligibility", () => {
  assertThrows(
    () =>
      compute({
        ...uniformSelfOnly,
        eligible_hdhp_coverage_by_month: [
          ...Array(11).fill(CoverageType.SelfOnly),
          null,
        ],
        last_month_rule_elected: true,
        taxpayer_hsa_contributions: 1000,
      }),
    Error,
    "requires December 1 HDHP eligibility",
  );
});

// ─── Input validation ─────────────────────────────────────────────────────────

Deno.test("validation: a W-2 HSA contribution does not imply self-only coverage", () => {
  assertThrows(
    () => compute({ employer_hsa_contributions: 1000 }),
    Error,
    "twelve monthly HDHP eligibility/coverage facts",
  );
});

Deno.test("validation: negative contributions throw", () => {
  assertThrows(() =>
    compute({
      taxpayer_hsa_contributions: -100,
    })
  );
});

Deno.test("validation: negative distributions throw", () => {
  assertThrows(() =>
    compute({
      hsa_distributions: -500,
    })
  );
});
