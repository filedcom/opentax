import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { buildMefXml } from "../2025/mef/builder.ts";
import {
  type FilerIdentity,
  FilingStatus as MefFilingStatus,
  type MefFormsPending,
} from "../2025/mef/types.ts";

const plan = buildExecutionPlan(registry);
const ctx = { taxYear: 2025, formType: "f1040" };
const filer: FilerIdentity = {
  primarySSN: "123456789",
  fullName: "Alex Taxpayer",
  nameLine1: "TAXPAYER ALEX",
  nameControl: "TAXP",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: MefFilingStatus.Single,
  softwareId: "12345678",
  originator: { efin: "123456", originatorType: "ERO" },
};
const amtRefigure = {
  prior_year_disallowed_interest: 0,
  interest_on_private_activity_bonds: 0,
  other_gross_income_adjustment: 0,
  qualified_dividends_adjustment: 0,
  net_disposition_gain_adjustment: 0,
  net_capital_gain_adjustment: 0,
  investment_expenses_adjustment: 0,
};

function run(inputs: Record<string, unknown>) {
  return execute(plan, registry, {
    general: { filing_status: "single" },
    schedule_b_part_iii: {
      foreign_accounts_question: false,
      foreign_trust_question: false,
    },
    w2: [{
      box1_wages: 300_000,
      box2_fed_withheld: 60_000,
      employer_ein: "123456789",
      employer_name: "Example Employer",
      employer_address_line1: "10 Payroll Way",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
    }],
    ...inputs,
  }, ctx);
}

Deno.test("Form 4952 limits the reported Schedule A deduction and carries excess", () => {
  const result = run({
    f1099int: [{
      payer_name: "Example Bank",
      box1: 2_000,
      investment_property_for_form4952: true,
    }],
    form4952: {
      investment_interest_expense: 50_000,
      amt_refigure: amtRefigure,
    },
    schedule_a: {
      line_8a_mortgage_interest_1098: 20_000,
    },
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_a.line_9_investment_interest, 2_000);
  assertEquals(result.pending.f1040.line12c_deduction_total, 22_000);
  assertEquals(result.pending.form4952.line8, 2_000);
  assertEquals(result.carryforwards.investment_interest_excess_4952, 48_000);
  const xml = buildMefXml(
    result.pending as unknown as MefFormsPending,
    filer,
  );
  assertStringIncludes(xml, "<IRS4952");
  assertStringIncludes(
    xml,
    "<InvestmentInterestExpenseAmt>50000</InvestmentInterestExpenseAmt>",
  );
  assertStringIncludes(
    xml,
    "<NetInvestmentIncomeAmt>2000</NetInvestmentIncomeAmt>",
  );
});

Deno.test("Form 8960 receives allowed interest and taxpayer-allocated state tax", () => {
  const result = run({
    w2: [{
      box1_wages: 300_000,
      box2_fed_withheld: 60_000,
      box15_state: "CA",
      box17_state_withheld: 25_000,
    }],
    f1099div: [{
      payerName: "Broker",
      box1a: 50_000,
      investment_property_for_form4952: true,
      box1b: 0,
      box11: false,
      isNominee: false,
    }],
    f1099m: [{
      payer_name: "Broker",
      payer_tin: "123456789",
      recipient_tin: "987654321",
      box3_other_income: 1_000,
      box3_other_income_routing: "other_income",
      box3_niit_applicable: true,
    }],
    form4952: {
      investment_interest_expense: 5_000,
      amt_refigure: amtRefigure,
    },
    schedule_a: {
      line_8a_mortgage_interest_1098: 20_000,
      niit_allocable_state_local_tax: 3_000,
    },
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8960.line7_other_modifications, 1_000);
  assertEquals(
    result.pending.form8960.line9a_investment_interest_expense,
    5_000,
  );
  assertEquals(result.pending.form8960.line9b_state_local_tax, 3_000);
  assertEquals(result.pending.form8960.line12_net_investment_income, 43_000);
  assertEquals(result.pending.form8960.line17_niit, 1_634);
  const xml = buildMefXml(
    { form8960: result.pending.form8960 } as unknown as MefFormsPending,
    filer,
  );
  assertStringIncludes(
    xml,
    "<InvestmentInterestAmt>5000</InvestmentInterestAmt>",
  );
  assertStringIncludes(
    xml,
    "<StateLocalForeignIncomeTaxAmt>3000</StateLocalForeignIncomeTaxAmt>",
  );
});

Deno.test("Form 8960 does not deduct investment interest when standard deduction wins", () => {
  const result = run({
    f1099int: [{
      payer_name: "Example Bank",
      box1: 2_000,
      investment_property_for_form4952: true,
    }],
    schedule_a: { line_9_investment_interest: 1_000 },
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8960.line9a_investment_interest_expense, 0);
  assertEquals(result.pending.form8960.line17_niit, 76);
});

Deno.test("Form 4952 uses prior carryforward and an explicit qualified-dividend election", () => {
  const result = run({
    f1099div: [{
      payerName: "Broker",
      box1a: 10_000,
      investment_property_for_form4952: true,
      box1b: 10_000,
      box11: false,
      isNominee: false,
    }],
    form4952: {
      investment_interest_expense: 3_000,
      prior_year_carryforward: 2_000,
      investment_income_election: 5_000,
      amt_refigure: amtRefigure,
    },
    schedule_a: {
      line_8a_mortgage_interest_1098: 20_000,
    },
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form4952.line8, 5_000);
  assertEquals(result.pending.form4952.line4g, 5_000);
  assertEquals(result.pending.schedule_a.line_9_investment_interest, 5_000);
  assertEquals(result.carryforwards.investment_interest_excess_4952, undefined);
  assertEquals(result.pending.form6251.qualified_dividends, 10_000);
});

Deno.test("Form 4952 subtracts investment expenses before limiting interest", () => {
  const result = run({
    f1099int: [{
      payer_name: "Example Bank",
      box1: 2_000,
      investment_property_for_form4952: true,
    }],
    form4952: {
      investment_interest_expense: 5_000,
      investment_expenses: 1_500,
      amt_refigure: amtRefigure,
    },
    schedule_a: {
      line_8a_mortgage_interest_1098: 20_000,
    },
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form4952.line4h, 2_000);
  assertEquals(result.pending.form4952.line6, 500);
  assertEquals(result.pending.form4952.line8, 500);
  assertEquals(result.carryforwards.investment_interest_excess_4952, 4_500);
});

Deno.test("Form 4952 pools interest and nonqualified dividends without counting qualified amounts", () => {
  const result = run({
    f1099int: [{
      payer_name: "Bank",
      box1: 1_000,
      investment_property_for_form4952: true,
    }],
    f1099div: [{
      payerName: "Broker",
      box1a: 2_000,
      investment_property_for_form4952: true,
      box1b: 500,
      box11: false,
      isNominee: false,
    }],
    k1_partnership: [{
      partnership_name: "Partnership",
      investment_property_for_form4952: true,
      box5_interest: 1_000,
      box6a_ordinary_dividends: 1_000,
      box6b_qualified_dividends: 500,
    }],
    form4952: {
      investment_interest_expense: 5_000,
      amt_refigure: amtRefigure,
    },
    schedule_a: {
      line_8a_mortgage_interest_1098: 20_000,
    },
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form4952.line6, 4_000);
  assertEquals(result.pending.form4952.line8, 4_000);
  assertEquals(result.carryforwards.investment_interest_excess_4952, 1_000);
});

Deno.test("Form 8960 rejects a tax allocation above the deductible tax", () => {
  const result = run({
    w2: [{
      box1_wages: 300_000,
      box2_fed_withheld: 60_000,
      box15_state: "CA",
      box17_state_withheld: 5_000,
    }],
    schedule_a: { niit_allocable_state_local_tax: 6_000 },
  });
  assertEquals(
    result.diagnostics.some((d) =>
      d.nodeType === "schedule_a" &&
      d.message.includes("allocation exceeds deductible")
    ),
    true,
  );
});

Deno.test("Form 8960 line 9b cannot be backed by property tax", () => {
  const result = run({
    schedule_a: {
      line_5b_real_estate_tax: 10_000,
      niit_allocable_state_local_tax: 1_000,
    },
  });
  assertEquals(
    result.diagnostics.some((d) =>
      d.nodeType === "schedule_a" &&
      d.message.includes("allocation exceeds deductible")
    ),
    true,
  );
});
