import { assertEquals, assertThrows } from "@std/assert";
import { f1040 } from "./index.ts";
import { FilingStatus } from "../../types.ts";

const ctx = {} as Parameters<typeof f1040.compute>[0];

// ─── Helper ───────────────────────────────────────────────────────────────────

function compute(input: Parameters<typeof f1040.compute>[1]) {
  return f1040.compute(ctx, input);
}

function fields(
  input: Parameters<typeof f1040.compute>[1],
): Record<string, unknown> {
  const result = compute(input);
  return result.outputs[0].fields as Record<string, unknown>;
}

// ─── Node identity ────────────────────────────────────────────────────────────

Deno.test("f1040: nodeType is f1040", () => {
  assertEquals(f1040.nodeType, "f1040");
});

Deno.test("f1040: outputNodeTypes is empty (no downstream routing)", () => {
  assertEquals(f1040.outputNodeTypes.length, 0);
});

// ─── Self-emit ────────────────────────────────────────────────────────────────

Deno.test("f1040: compute returns one self-referencing output", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "f1040");
});

Deno.test("f1040: empty input emits zeros for computed lines", () => {
  const f = fields({});
  assertEquals(f.line9_total_income, 0);
  assertEquals(f.line11_agi, 0);
  assertEquals(f.line15_taxable_income, 0);
  assertEquals(f.line24_total_tax, 0);
  assertEquals(f.line33_total_payments, 0);
  assertEquals(f.line35a_refund, 0);
});

Deno.test("f1040: unresolved Form 8912 credit stops final return assembly", () => {
  assertThrows(
    () =>
      compute({
        form8912_tentative_credit: 100,
        line2b_taxable_interest: 100,
      }),
    Error,
    "Part II tax limit and source document",
  );
});

const emptySchedule3ForBusinessCredit = {
  line1: 0,
  line2: 0,
  line3: 0,
  line4: 0,
  line5a: 0,
  line5b: 0,
  line6aGbc: 0,
  line6bPriorMinimumTax: 0,
  line6kBondCredit: 0,
  line7: 0,
};

Deno.test("f1040: source-backed Form 3800 posts only its allowed ordinary credit", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    line16_income_tax: 40_000,
    line19_child_tax_credit: 2_000,
    line20_nonrefundable_credits: 1_000,
    form3800_source_credits: { standardCredit: 25_000, specifiedCredit: 0 },
    form3800_form6251_line9: 20_000,
    form3800_form6251_line11: 0,
    form3800_schedule3_lines: {
      ...emptySchedule3ForBusinessCredit,
      line2: 1_000,
      line7: 0,
    },
  });
  assertEquals(result.outputs[0].fields.line20_nonrefundable_credits, 18_000);
  assertEquals(result.outputs[0].fields.line24_total_tax, 20_000);
  assertEquals(result.finalizations?.[0].fields.line6a_total, 17_000);
  assertEquals(result.finalizations?.[0].fields.line7_total, 17_000);
  assertEquals(result.finalizations?.[0].fields.line8_total, 18_000);
  assertEquals(result.finalizations?.[1].nodeType, "f3800");
  assertEquals(result.finalizations?.[1].fields.allowed_credit, 17_000);
});

Deno.test("f1040: specified Form 3800 credit uses its separate AMT limit", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    line16_income_tax: 20_000,
    line17_additional_taxes: 5_000,
    form3800_source_credits: { standardCredit: 0, specifiedCredit: 10_000 },
    form3800_form6251_line9: 25_000,
    form3800_form6251_line11: 5_000,
    form3800_schedule3_lines: emptySchedule3ForBusinessCredit,
  });
  assertEquals(result.finalizations?.[1].fields.standard_credit_allowed, 0);
  assertEquals(
    result.finalizations?.[1].fields.specified_credit_allowed,
    10_000,
  );
  assertEquals(result.outputs[0].fields.line20_nonrefundable_credits, 10_000);
});

Deno.test("f1040: Form 3800 follows finalized personal clean-vehicle credit", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    line16_income_tax: 10_000,
    line20_nonrefundable_credits: 7_500,
    form8936_tentative_new_credit: 7_500,
    form8936_tentative_used_credit: 0,
    form8936_priority_personal_credits: 0,
    form8936_schedule3_line7_tentative: 7_500,
    form3800_source_credits: { standardCredit: 5_000, specifiedCredit: 0 },
    form3800_form6251_line9: 0,
    form3800_form6251_line11: 0,
    form3800_schedule3_lines: {
      ...emptySchedule3ForBusinessCredit,
      line7: 7_500,
    },
  });
  assertEquals(result.finalizations?.[0].fields.line6a_total, 2_500);
  assertEquals(result.finalizations?.[0].fields.line6f_total, 7_500);
  assertEquals(result.finalizations?.[0].fields.line8_total, 10_000);
  assertEquals(result.outputs[0].fields.line22_tax_after_credits, 0);
});

Deno.test("f1040: Form 3800 needs AMT evidence and does not mix legacy gross GBC", () => {
  const source = {
    filing_status: FilingStatus.Single,
    line16_income_tax: 10_000,
    form3800_source_credits: { standardCredit: 1_000, specifiedCredit: 0 },
    form3800_schedule3_lines: emptySchedule3ForBusinessCredit,
  };
  assertThrows(
    () => compute(source),
    Error,
    "needs filing status, Form 1040 tax",
  );
  assertThrows(
    () =>
      compute({
        ...source,
        form3800_form6251_line9: 0,
        form3800_form6251_line11: 0,
        form3800_schedule3_lines: {
          ...emptySchedule3ForBusinessCredit,
          line6aGbc: 100,
          line7: 100,
        },
      }),
    Error,
    "unbounded Schedule 3",
  );
});

Deno.test("f1040: MFS Form 3800 requires the spouse business-credit answer", () => {
  const source = {
    filing_status: FilingStatus.MFS,
    line16_income_tax: 20_000,
    form3800_source_credits: { standardCredit: 5_000, specifiedCredit: 0 },
    form3800_form6251_line9: 0,
    form3800_form6251_line11: 0,
    form3800_schedule3_lines: emptySchedule3ForBusinessCredit,
  };
  assertThrows(() => compute(source), Error, "spouse business-credit answer");
  const withAnswer = compute({ ...source, spouse_has_business_credit: true });
  assertEquals(withAnswer.finalizations?.[1].fields.allowed_credit, 5_000);
});

// ─── Line computations ────────────────────────────────────────────────────────

Deno.test("f1040: computes taxable income from agi and standard deduction", () => {
  const f = fields({ line11_agi: 80_000, line12a_standard_deduction: 15_000 });
  assertEquals(f.line15_taxable_income, 65_000);
});

Deno.test("f1040: taxable income cannot go below zero", () => {
  const f = fields({ line11_agi: 5_000, line12a_standard_deduction: 30_000 });
  assertEquals(f.line15_taxable_income, 0);
});

Deno.test("f1040: selected standard deduction wins over a smaller Schedule A amount", () => {
  const f = fields({
    line11_agi: 100_000,
    line12a_standard_deduction: 31_500,
    line12e_itemized_deductions: 18_349,
  });
  assertEquals(f.line12c_deduction_total, 31_500);
  assertEquals(f.line14_deductions_qbi_total, 31_500);
  assertEquals(f.line15_taxable_income, 68_500);
});

Deno.test("f1040: itemized deduction is reported when standard was not selected", () => {
  const f = fields({
    line11_agi: 100_000,
    line12e_itemized_deductions: 33_000,
  });
  assertEquals(f.line12c_deduction_total, 33_000);
  assertEquals(f.line15_taxable_income, 67_000);
});

Deno.test("f1040: computes refund when payments exceed tax", () => {
  const f = fields({
    line11_agi: 50_000,
    line12a_standard_deduction: 15_000,
    line16_income_tax: 4_000,
    line25a_w2_withheld: 6_000,
  });
  assertEquals(f.line24_total_tax, 4_000);
  assertEquals(f.line33_total_payments, 6_000);
  assertEquals(f.line35a_refund, 2_000);
});

Deno.test("f1040: computes amount owed when tax exceeds payments", () => {
  const f = fields({
    line11_agi: 120_000,
    line12a_standard_deduction: 15_000,
    line16_income_tax: 20_000,
    line25a_w2_withheld: 15_000,
  });
  assertEquals(f.line24_total_tax, 20_000);
  assertEquals(f.line37_amount_owed, 5_000);
});

Deno.test("f1040: adds an underpayment penalty to amount owed", () => {
  const f = fields({
    line16_income_tax: 10_000,
    line25a_w2_withheld: 5_000,
    line38_underpayment_penalty: 250,
  });
  assertEquals(f.line37_amount_owed, 5_250);
});

Deno.test("f1040: subtracts an underpayment penalty from a refund", () => {
  const f = fields({
    line16_income_tax: 5_000,
    line25a_w2_withheld: 7_000,
    line38_underpayment_penalty: 250,
  });
  assertEquals(f.line34_overpayment, 2_000);
  assertEquals(f.line35a_refund, 1_750);
});

Deno.test("f1040: penalty above overpayment becomes amount owed", () => {
  const f = fields({
    line16_income_tax: 5_000,
    line25a_w2_withheld: 5_100,
    line38_underpayment_penalty: 250,
  });
  assertEquals(f.line34_overpayment, 100);
  assertEquals(f.line35a_refund, 0);
  assertEquals(f.line37_amount_owed, 150);
});

Deno.test("f1040: AMT added to line16 for total tax before credits", () => {
  const f = fields({
    line16_income_tax: 10_000,
    line17_additional_taxes: 2_000,
  });
  assertEquals(f.line18_total_tax_before_credits, 12_000);
  assertEquals(f.line24_total_tax, 12_000);
});

Deno.test("f1040: Form 8936 new credit is capped at remaining line 18 tax", () => {
  const input = {
    line16_income_tax: 5_000,
    line20_nonrefundable_credits: 7_500,
    form8936_tentative_new_credit: 7_500,
    form8936_tentative_used_credit: 0,
    form8936_priority_personal_credits: 0,
    form8936_schedule3_line7_tentative: 7_500,
  };
  const result = compute(input);
  const f = result.outputs[0].fields;
  assertEquals(f.line20_nonrefundable_credits, 5_000);
  assertEquals(f.line21_credits_total, 5_000);
  assertEquals(f.line22_tax_after_credits, 0);
  assertEquals(result.finalizations?.[0].fields, {
    line6f_total: 5_000,
    line6m_total: undefined,
    line7_total: 5_000,
    line8_total: 5_000,
  });
});

Deno.test("f1040: previously owned credit takes priority over new clean vehicle credit", () => {
  const result = compute({
    line16_income_tax: 9_000,
    line20_nonrefundable_credits: 12_500,
    form8936_tentative_new_credit: 7_500,
    form8936_tentative_used_credit: 4_000,
    form8936_priority_personal_credits: 1_000,
    form8936_schedule3_line7_tentative: 11_500,
  });
  assertEquals(result.outputs[0].fields.line20_nonrefundable_credits, 9_000);
  assertEquals(result.finalizations?.[0].fields.line6m_total, 4_000);
  assertEquals(result.finalizations?.[0].fields.line6f_total, 4_000);
  assertEquals(result.finalizations?.[0].fields.line7_total, 8_000);
});

Deno.test("f1040: Form 8936 personal credit is zero when line 18 is zero", () => {
  const result = compute({
    line20_nonrefundable_credits: 7_500,
    form8936_tentative_new_credit: 7_500,
    form8936_tentative_used_credit: 0,
    form8936_priority_personal_credits: 0,
    form8936_schedule3_line7_tentative: 7_500,
  });
  assertEquals(result.outputs[0].fields.line20_nonrefundable_credits, 0);
  assertEquals(result.finalizations?.[0].fields.line6f_total, undefined);
  assertEquals(result.finalizations?.[0].fields.line8_total, undefined);
});

Deno.test("f1040: child tax credit reduces tax", () => {
  const f = fields({
    line16_income_tax: 5_000,
    line19_child_tax_credit: 2_000,
  });
  assertEquals(f.line22_tax_after_credits, 3_000);
  assertEquals(f.line24_total_tax, 3_000);
});

Deno.test("f1040: credits cannot make tax negative", () => {
  const f = fields({
    line16_income_tax: 1_000,
    line19_child_tax_credit: 2_000,
    line20_nonrefundable_credits: 500,
  });
  assertEquals(f.line22_tax_after_credits, 0);
  assertEquals(f.line24_total_tax, 0);
});

Deno.test("f1040: nonrefundable credits cannot offset Schedule 2 Part II taxes", () => {
  const f = fields({
    line16_income_tax: 300,
    line20_nonrefundable_credits: 2_000,
    line23_other_taxes: 2_800,
  });
  assertEquals(f.line18_total_tax_before_credits, 300);
  assertEquals(f.line22_tax_after_credits, 0);
  assertEquals(f.line24_total_tax, 2_800);
});

Deno.test("f1040: credits reduce Part I tax before Part II tax is added", () => {
  const f = fields({
    line16_income_tax: 1_000,
    line17_additional_taxes: 500,
    line19_child_tax_credit: 750,
    line23_other_taxes: 2_000,
  });
  assertEquals(f.line18_total_tax_before_credits, 1_500);
  assertEquals(f.line22_tax_after_credits, 750);
  assertEquals(f.line24_total_tax, 2_750);
});

Deno.test("f1040: EITC included in total payments", () => {
  const f = fields({
    line16_income_tax: 500,
    line27_eitc: 3_600,
    line25a_w2_withheld: 1_000,
  });
  assertEquals(f.line33_total_payments, 4_600);
  assertEquals(f.line35a_refund, 4_100);
});

Deno.test("f1040: ACTC and refundable AOC included in payments", () => {
  const f = fields({ line28_actc: 1_500, line29_refundable_aoc: 1_000 });
  assertEquals(f.line33_total_payments, 2_500);
  assertEquals(f.line35a_refund, 2_500);
});

Deno.test("f1040: withholding from multiple sources aggregated", () => {
  const f = fields({
    line25a_w2_withheld: 10_000,
    line25b_withheld_1099: 2_000,
    line25c_additional_medicare_withheld: 500,
  });
  assertEquals(f.line33_total_payments, 12_500);
  assertEquals(f.line25c_total, 500);
});

Deno.test("f1040: Form 8805 withholding joins other line 25c withholding", () => {
  const f = fields({
    line25c_additional_medicare_withheld: 500,
    line25c_other_withheld: [3_000, 2_000],
  });
  assertEquals(f.line25c_total, 5_500);
  assertEquals(f.line25d_total_withholding, 5_500);
  assertEquals(f.line33_total_payments, 5_500);
});

Deno.test("f1040: wage lines summed to line 1z", () => {
  const f = fields({
    line1a_wages: 60_000,
    line1c_unreported_tips: 500,
    line1g_wages_8919: 1_000,
  });
  assertEquals(f.line1z_total_wages, 61_500);
  assertEquals(f.line9_total_income, 61_500);
});

Deno.test("f1040: total income includes capital gains and interest", () => {
  const f = fields({
    line1a_wages: 50_000,
    line2b_taxable_interest: 500,
    line3b_ordinary_dividends: 1_000,
    line7_capital_gain: 5_000,
  });
  assertEquals(f.line9_total_income, 56_500);
});

Deno.test("f1040: ordinary dividends from multiple sources are summed", () => {
  const f = fields({ line3b_ordinary_dividends: [400, 300, 125] });
  assertEquals(f.line3b_ordinary_dividends, 825);
  assertEquals(f.line9_total_income, 825);
  assertEquals(f.line11_agi, 825);
});

Deno.test("f1040: QBI deduction reduces taxable income", () => {
  const f = fields({
    line11_agi: 100_000,
    line12a_standard_deduction: 15_000,
    line13_qbi_deduction: 5_000,
  });
  assertEquals(f.line15_taxable_income, 80_000);
});

Deno.test("f1040: Schedule 1-A deduction reduces taxable income and increases line 14", () => {
  const f = fields({
    line11_agi: 30_000,
    line12a_standard_deduction: 15_750,
    line13b_additional_deductions: 5_000,
  });
  assertEquals(f.line14_deductions_qbi_total, 20_750);
  assertEquals(f.line15_taxable_income, 9_250);
});

Deno.test("f1040: accepts explicit line9 total income override", () => {
  const f = fields({
    line9_total_income: 200_000,
    line11_agi: 180_000,
    line12a_standard_deduction: 15_000,
    line16_income_tax: 40_000,
  });
  assertEquals(f.line9_total_income, 200_000);
  assertEquals(f.line15_taxable_income, 165_000);
});
