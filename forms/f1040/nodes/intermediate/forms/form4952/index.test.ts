import { assertEquals, assertThrows } from "@std/assert";
import { calculateAmtForm4952, calculateForm4952, form4952 } from "./index.ts";
import { form4952 as mef4952 } from "../../../../2025/mef/forms/f4952.ts";

function compute(input: Record<string, unknown>) {
  return form4952.compute({ taxYear: 2025, formType: "f1040" }, input);
}

function sameAmtFacts(priorYearDisallowedInterest = 0) {
  return {
    prior_year_disallowed_interest: priorYearDisallowedInterest,
    interest_on_private_activity_bonds: 0,
    other_gross_income_adjustment: 0,
    qualified_dividends_adjustment: 0,
    net_disposition_gain_adjustment: 0,
    net_capital_gain_adjustment: 0,
    investment_expenses_adjustment: 0,
  };
}

Deno.test("Form 4952 has no attachment without interest expense", () => {
  assertEquals(
    compute({ other_investment_property_gross_income: 5_000 }).outputs,
    [],
  );
});

Deno.test("Form 4952 computes all lines, deduction, and carryforward", () => {
  const lines = calculateForm4952({
    investment_interest_expense: 7_000,
    prior_year_carryforward: 1_000,
    other_investment_property_gross_income: 5_000,
    other_investment_property_qualified_dividends: 500,
    other_investment_property_net_disposition_gain: 1_000,
    other_investment_property_net_capital_gain: 600,
    investment_expenses: 100,
  });
  assertEquals(lines, {
    line1: 7_000,
    line2: 1_000,
    line3: 8_000,
    line4a: 5_000,
    line4b: 500,
    line4c: 4_500,
    line4d: 1_000,
    line4e: 600,
    line4f: 400,
    line4g: 0,
    line4h: 4_900,
    line5: 100,
    line6: 4_800,
    line7: 3_200,
    line8: 4_800,
  });
  const result = compute({
    investment_interest_expense: 7_000,
    prior_year_carryforward: 1_000,
    amt_refigure: sameAmtFacts(1_000),
    other_investment_property_gross_income: 5_000,
    other_investment_property_qualified_dividends: 500,
    other_investment_property_net_disposition_gain: 1_000,
    other_investment_property_net_capital_gain: 600,
    investment_expenses: 100,
  });
  assertEquals(
    result.outputs.find((o) => o.nodeType === "schedule_a")?.fields,
    {
      line_9_investment_interest: 4_800,
    },
  );
  assertEquals(
    result.outputs.find((o) => o.nodeType === "form4952")?.fields,
    { ...lines },
  );
  assertEquals(result.carryforwards?.investment_interest_excess_4952, 3_200);
});

Deno.test("Form 8814 child amounts stay separate from parent line 4 source facts", () => {
  const lines = calculateForm4952({
    investment_interest_expense: 2_000,
    other_investment_property_gross_income: 700,
    other_investment_property_qualified_dividends: 100,
    form8814_line9_qualified_dividends: 200,
    form8814_line10_capital_gain: 300,
    form8814_line12_investment_income: 500,
  });
  assertEquals(lines.line4a, 1_400);
  assertEquals(lines.line4b, 300);
  assertEquals(lines.line4c, 1_100);
  assertEquals(lines.line4d, 300);
  assertEquals(lines.line4e, 300);
  assertEquals(lines.line6, 1_100);
  assertEquals(lines.line8, 1_100);
});

Deno.test("Form 4952 combines explicit other income with multiple affirmed 1099 sources", () => {
  const lines = calculateForm4952({
    investment_interest_expense: 2_000,
    other_investment_property_gross_income: 100,
    other_investment_property_qualified_dividends: 20,
    source_1099_interest: [300, 400],
    source_1099_dividends: [500, 600],
    source_1099_qualified_dividends: [100, 200],
    source_1099_capital_gain_distributions: [50, 75],
    source_k1_interest: [25, 25],
    source_k1_dividends: 80,
    source_k1_qualified_dividends: 30,
  });
  assertEquals(lines.line4a, 2_030);
  assertEquals(lines.line4b, 350);
  assertEquals(lines.line4d, 125);
  assertEquals(lines.line4e, 125);
  assertEquals(lines.line6, 1_680);
  assertEquals(lines.line8, 1_680);
});

Deno.test("Form 4952 carries forward interest when net investment income is zero", () => {
  const result = compute({
    investment_interest_expense: 5_000,
    amt_refigure: sameAmtFacts(),
  });
  assertEquals(result.outputs.some((o) => o.nodeType === "form4952"), true);
  assertEquals(result.outputs.some((o) => o.nodeType === "schedule_a"), false);
  assertEquals(result.carryforwards?.investment_interest_excess_4952, 5_000);
});

Deno.test("Form 4952 requires and calculates a separate AMT interest refigure", () => {
  assertThrows(
    () => compute({ investment_interest_expense: 1_000 }),
    Error,
    "explicit AMT refigure facts",
  );
  const input = {
    investment_interest_expense: 1_000,
    prior_year_carryforward: 500,
    other_investment_property_gross_income: 100,
    source_private_activity_bond_interest: 300,
    amt_refigure: {
      ...sameAmtFacts(800),
      interest_on_private_activity_bonds: 200,
    },
  };
  const amt = calculateAmtForm4952(input);
  assertEquals(amt.lines.line1, 1_200);
  assertEquals(amt.lines.line2, 800);
  assertEquals(amt.lines.line4a, 400);
  assertEquals(amt.lines.line8, 400);
  const result = compute(input);
  assertEquals(
    result.outputs.find((o) => o.nodeType === "income_tax_calculation")?.fields,
    {
      form4952_election: 0,
      form4952_elected_capital_gain: 0,
      form4952_amt_election: 0,
      form4952_amt_elected_capital_gain: 0,
      form4952_amt_line2c_difference: -300,
    },
  );
  assertEquals(result.carryforwards?.investment_interest_excess_4952, 1_400);
  assertEquals(
    result.carryforwards?.amt_investment_interest_excess_4952,
    1_600,
  );
});

Deno.test("AMT Form 4952 caps line 4g by refigured eligible investment income", () => {
  const amt = calculateAmtForm4952({
    investment_interest_expense: 100,
    other_investment_property_gross_income: 1_000,
    other_investment_property_qualified_dividends: 500,
    investment_income_election: 500,
    amt_refigure: {
      ...sameAmtFacts(),
      qualified_dividends_adjustment: -400,
    },
  });
  assertEquals(amt.lines.line4b, 100);
  assertEquals(amt.lines.line4g, 100);
  assertEquals(amt.electedCapitalGain, 0);
});

Deno.test("AMT-only private-activity-bond interest reaches Form 6251 without a regular Form 4952", () => {
  const result = compute({
    source_private_activity_bond_interest: 500,
    amt_refigure: {
      ...sameAmtFacts(),
      interest_on_private_activity_bonds: 200,
    },
  });
  assertEquals(
    result.outputs.some((output) => output.nodeType === "form4952"),
    false,
  );
  assertEquals(
    result.outputs.find((output) =>
      output.nodeType === "income_tax_calculation"
    )
      ?.fields.form4952_amt_line2c_difference,
    -200,
  );
});

Deno.test("Form 4952 validates qualified dividends and line 4g attribution", () => {
  assertThrows(
    () =>
      calculateForm4952({
        other_investment_property_gross_income: 100,
        other_investment_property_qualified_dividends: 200,
      }),
    Error,
    "line 4b",
  );
  assertThrows(
    () =>
      calculateForm4952({
        other_investment_property_gross_income: 100,
        investment_income_election: 101,
      }),
    Error,
    "line 4g exceeds",
  );
  assertThrows(
    () =>
      compute({
        other_investment_property_gross_income: 100,
        other_investment_property_qualified_dividends: 100,
        investment_income_election: 100,
      }),
    Error,
    "without investment interest expense",
  );
  const elected = compute({
    investment_interest_expense: 100,
    amt_refigure: sameAmtFacts(),
    other_investment_property_gross_income: 300,
    other_investment_property_qualified_dividends: 100,
    other_investment_property_net_disposition_gain: 200,
    other_investment_property_net_capital_gain: 200,
    investment_income_election: 150,
  });
  assertEquals(
    elected.outputs.find((o) => o.nodeType === "income_tax_calculation")
      ?.fields,
    {
      form4952_election: 150,
      form4952_elected_capital_gain: 150,
      form4952_amt_election: 150,
      form4952_amt_elected_capital_gain: 150,
    },
  );
  assertThrows(
    () =>
      calculateForm4952({
        other_investment_property_gross_income: 300,
        other_investment_property_qualified_dividends: 100,
        other_investment_property_net_disposition_gain: 200,
        other_investment_property_net_capital_gain: 200,
        investment_income_election: 150,
        elected_capital_gain_portion: 40,
      }),
    Error,
    "must reconcile",
  );
  const alternate = compute({
    investment_interest_expense: 100,
    amt_refigure: sameAmtFacts(),
    other_investment_property_gross_income: 300,
    other_investment_property_qualified_dividends: 100,
    other_investment_property_net_disposition_gain: 200,
    other_investment_property_net_capital_gain: 200,
    investment_income_election: 150,
    elected_capital_gain_portion: 50,
  });
  assertEquals(
    alternate.outputs.find((o) => o.nodeType === "income_tax_calculation")
      ?.fields,
    {
      form4952_election: 150,
      form4952_elected_capital_gain: 50,
      form4952_amt_election: 150,
      form4952_amt_elected_capital_gain: 150,
    },
  );
});

Deno.test("Form 4952 XML uses the 2025 schema line tags", () => {
  const xml = mef4952.build({
    line1: 5_000,
    line2: 100,
    line3: 5_100,
    line4a: 2_000,
    line4b: 100,
    line4c: 1_900,
    line4d: 0,
    line4e: 0,
    line4f: 0,
    line4g: 0,
    line4h: 1_900,
    line5: 0,
    line6: 1_900,
    line7: 3_200,
    line8: 1_900,
  });
  assertEquals(
    xml.includes(
      "<PriorYrDisallowInvsmtIntExpAmt>100</PriorYrDisallowInvsmtIntExpAmt>",
    ),
    true,
  );
  assertEquals(
    xml.includes(
      "<InvestmentInterestExpDeductAmt>1900</InvestmentInterestExpDeductAmt>",
    ),
    true,
  );
});
