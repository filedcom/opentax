import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateForm8814,
  f8814,
  type F8814Item,
  type Form8814Lines,
} from "./index.ts";

const child: F8814Item = {
  child_name: "Alex Rivera",
  child_name_control: "RIVE",
  child_ssn: "123456789",
  child_age_eligible: true,
  child_required_to_file: true,
  child_income_only_permitted_types: true,
  child_no_joint_return: true,
  child_no_estimated_payments: true,
  child_no_withholding: true,
  parent_eligible_to_elect: true,
};

function compute(items: F8814Item[]) {
  return f8814.compute({ taxYear: 2025, formType: "f1040" }, { f8814s: items });
}

function field(
  result: ReturnType<typeof compute>,
  nodeType: string,
  key: string,
): unknown {
  return result.outputs.find((output) =>
    output.nodeType === nodeType && key in output.fields
  )
    ?.fields[key];
}

Deno.test("f8814: empty election emits nothing", () => {
  assertEquals(compute([]).outputs, []);
});

Deno.test("f8814: eligibility and identity facts are required", () => {
  assertEquals(
    f8814.inputSchema.safeParse({ f8814s: [{ interest_income: 2000 }] })
      .success,
    false,
  );
  assertEquals(
    f8814.inputSchema.safeParse({
      f8814s: [{ ...child, child_no_withholding: false }],
    }).success,
    false,
  );
});

Deno.test("f8814: exactly $1,350 has no child tax or transferred income", () => {
  const lines = calculateForm8814({ ...child, interest_income: 1350 });
  assertEquals(lines.line14, 0);
  assertEquals(lines.line15, 0);
  assertEquals(lines.line12, 0);
  assertEquals(lines.dependentPtcMagi, 0);
  assertThrows(() => compute([{ ...child, interest_income: 1350 }]));
});

Deno.test("f8814: $2,000 has $65 child tax but no income transfer", () => {
  const result = compute([{ ...child, interest_income: 2000 }]);
  assertEquals(field(result, "income_tax_calculation", "form8814_tax"), 65);
  assertEquals(field(result, "schedule1", "line8z_form8814"), undefined);
});

Deno.test("f8814: $2,700 has $135 tax and no transferred income", () => {
  const lines = calculateForm8814({ ...child, dividend_income: 2700 });
  assertEquals(lines.line6, 0);
  assertEquals(lines.line15, 135);
});

Deno.test("f8814: $3,700 interest transfers only $1,000 to Schedule 1", () => {
  const result = compute([{ ...child, interest_income: 3700 }]);
  assertEquals(field(result, "schedule1", "line8z_form8814"), 1000);
  assertEquals(field(result, "agi_aggregator", "line8z_form8814"), 1000);
  assertEquals(field(result, "f1040", "line2b_taxable_interest"), undefined);
  assertEquals(field(result, "income_tax_calculation", "form8814_tax"), 135);
});

Deno.test("f8814: qualified dividend and capital gain allocations reconcile", () => {
  const item = {
    ...child,
    interest_income: 1000,
    dividend_income: 2000,
    qualified_dividends: 1500,
    capital_gain_distributions: 1000,
  };
  const lines = calculateForm8814(item);
  assertEquals(lines.line4, 4000);
  assertEquals(lines.line6, 1300);
  assertEquals(lines.line9, 488);
  assertEquals(lines.line10, 325);
  assertEquals(lines.line12, 487);
  const result = compute([item]);
  assertEquals(field(result, "f1040", "line3a_qualified_dividends"), 488);
  assertEquals(field(result, "schedule_d", "line13_form8814"), 325);
  assertEquals(field(result, "schedule1", "line8z_form8814"), 487);
  assertEquals(
    field(result, "form4952", "form8814_line9_qualified_dividends"),
    488,
  );
  assertEquals(field(result, "form4952", "form8814_line10_capital_gain"), 325);
  assertEquals(
    field(result, "form4952", "form8814_line12_investment_income"),
    487,
  );
});

Deno.test("f8814: Alaska PFD is ordinary dividend, not qualified dividend", () => {
  const lines = calculateForm8814({ ...child, alaska_pfd: 3200 });
  assertEquals(lines.line2a, 3200);
  assertEquals(lines.line9, 0);
  assertEquals(lines.line12, 500);
});

Deno.test("f8814: Alaska PFD share is excluded from Form 8960 line 7", () => {
  const item = { ...child, interest_income: 4000, alaska_pfd: 2000 };
  const lines = calculateForm8814(item);
  assertEquals(lines.line12, 3300);
  assertEquals(lines.line12InvestmentIncome, 2200);
  const result = compute([item]);
  assertEquals(
    field(result, "form8960", "form8814_line12_investment_income"),
    2200,
  );
  assertEquals(
    field(result, "form4952", "form8814_line12_investment_income"),
    2200,
  );
});

Deno.test("f8814: $13,500 income must use a child return", () => {
  assertThrows(() => calculateForm8814({ ...child, interest_income: 13_500 }));
});

Deno.test("f8814: duplicate child is rejected", () => {
  assertThrows(() => compute([child, child]));
});

Deno.test("f8814: multiple children aggregate tax and retain separate forms", () => {
  const result = compute([
    { ...child, interest_income: 3000 },
    {
      ...child,
      child_name: "Jamie Rivera",
      child_ssn: "987654321",
      dividend_income: 2000,
    },
  ]);
  assertEquals(field(result, "income_tax_calculation", "form8814_tax"), 200);
  assertEquals((field(result, "form8814", "items") as unknown[]).length, 2);
});

Deno.test("f8814: PTC worksheet special amount includes tax-exempt interest and nontaxable Social Security", () => {
  const lines = calculateForm8814({
    ...child,
    interest_income: 3000,
    tax_exempt_interest: 200,
    nontaxable_social_security: 700,
  });
  assertEquals(lines.dependentPtcMagi, 3600);
});

Deno.test("f8814: interest adjustments do not add back to taxable interest", () => {
  const result = compute([{
    ...child,
    interest_income: 3000,
    interest_adjustments: {
      nominee_distribution: 500,
      accrued_interest: 100,
      abp_adjustment: 50,
      oid_adjustment: 25,
    },
  }]);
  const line = (field(result, "form8814", "items") as Form8814Lines[])[0];
  assertEquals(line.line4, 3000);
  assertEquals(line.line12, 300);
});

Deno.test("f8814: nominee dividends and capital gains stay outside income", () => {
  const item = {
    ...child,
    dividend_income: 2000,
    dividend_nominee_distribution: 700,
    capital_gain_distributions: 1000,
    capital_gain_nominee_distribution: 400,
  };
  const lines = calculateForm8814(item);
  assertEquals(lines.line2a, 2000);
  assertEquals(lines.line4, 3000);
  assertEquals(lines.line6, 300);
});

Deno.test("f8814: child's private-activity-bond interest enters parent AMT", () => {
  const result = compute([{
    ...child,
    interest_income: 3000,
    tax_exempt_interest: 300,
    private_activity_bond_interest: 200,
  }]);
  assertEquals(field(result, "form6251", "line2g_pab_interest"), 200);
  assertEquals(
    f8814.inputSchema.safeParse({
      f8814s: [{
        ...child,
        interest_income: 3000,
        tax_exempt_interest: 100,
        private_activity_bond_interest: 200,
      }],
    }).success,
    false,
  );
});

Deno.test("f8814: child's foreign account and trust trigger Schedule B", () => {
  const result = compute([{
    ...child,
    interest_income: 3000,
    child_had_foreign_account: true,
    child_foreign_trust_part_iii_event: true,
  }]);
  assertEquals(field(result, "schedule_b", "form8814_foreign_account"), true);
  assertEquals(field(result, "schedule_b", "form8814_foreign_trust"), true);
});
