import { assertStringIncludes, assertThrows } from "@std/assert";
import { irs1040 } from "./mef/forms/f1040.ts";
import { irs1040Pdf } from "./pdf/forms/f1040.ts";
import {
  assertReturnScheduleJoins,
  assertReturnWideArithmetic,
} from "./return-wide-arithmetic.ts";

Deno.test("Form 1040 export replays retained wage and total-income components", () => {
  const income = {
    line1a_wages: 40_000,
    line1b_household_wages: 2_000,
    line1i_combat_pay: 3_000,
    line1z_total_wages: 42_000,
    line2a_tax_exempt: 200,
    line2b_taxable_interest: 500,
    line3a_qualified_dividends: 100,
    line3b_ordinary_dividends: 300,
    line9_total_income: 42_800,
  };
  assertReturnWideArithmetic(income);
  assertStringIncludes(
    irs1040.build(income, { pending: {} }),
    "<TotalIncomeAmt>42800</TotalIncomeAmt>",
  );
  irs1040Pdf.projectFields?.(income, {});

  for (
    const [change, reason] of [
      [{ line1z_total_wages: 42_001 }, "line 1z"],
      [{ line9_total_income: 42_801 }, "line 9"],
    ] as const
  ) {
    const changed = { ...income, ...change };
    assertThrows(() => assertReturnWideArithmetic(changed), Error, reason);
    assertThrows(
      () => irs1040.build(changed, { pending: {} }),
      Error,
      reason,
    );
    assertThrows(
      () => irs1040Pdf.projectFields?.(changed, {}),
      Error,
      reason,
    );
  }

  // Sparse direct descriptor calls have no complete income-component record.
  assertReturnWideArithmetic({ line1z_total_wages: 42_000 });
  assertReturnWideArithmetic({ line9_total_income: 42_800 });
  assertThrows(
    () =>
      assertReturnWideArithmetic({
        line1a_wages: 40_000,
        line1z_total_wages: 40_000,
        line9_total_income: 40_001,
      }),
    Error,
    "line 9",
  );
  assertReturnWideArithmetic({
    line1a_wages: [20_000, 20_000],
    line1z_total_wages: 40_000,
    line9_total_income: 40_000,
  });
  assertReturnWideArithmetic({
    line2b_taxable_interest: 500,
    line9_total_income: 500,
  });
  assertThrows(
    () =>
      assertReturnWideArithmetic({
        line2b_taxable_interest: 500,
        line9_total_income: 501,
      }),
    Error,
    "line 9",
  );
  assertThrows(
    () =>
      irs1040.build({
        line2b_taxable_interest: 500,
        line9_total_income: 501,
      }, { pending: {} }),
    Error,
    "line 9",
  );
  assertThrows(
    () =>
      irs1040Pdf.projectFields?.({
        line2b_taxable_interest: 500,
        line9_total_income: 501,
      }, {}),
    Error,
    "line 9",
  );
  assertReturnWideArithmetic({
    line1a_wages: 1_000,
    line2b_taxable_interest: 500,
    line9_total_income: 1_500,
  });
  assertThrows(
    () =>
      assertReturnWideArithmetic({
        line1a_wages: 1_000,
        line2b_taxable_interest: 500,
        line9_total_income: 500,
      }),
    Error,
    "line 9",
  );
});

Deno.test("Form 1040 export rejects malformed income components before line 9 replay", () => {
  for (const invalid of ["500", [250, "250"], Number.NaN]) {
    const fields = {
      line2b_taxable_interest: invalid,
      line9_total_income: 0,
    };
    assertThrows(
      () => assertReturnWideArithmetic(fields),
      Error,
      "line2b_taxable_interest needs a finite amount",
    );
    assertThrows(
      () =>
        irs1040.build(fields as Parameters<typeof irs1040.build>[0], {
          pending: {},
        }),
      Error,
      "line2b_taxable_interest needs a finite amount",
    );
    assertThrows(
      () => irs1040Pdf.projectFields?.(fields, {}),
      Error,
      "line2b_taxable_interest needs a finite amount",
    );
  }
});

Deno.test("Form 1040 export replays AGI, deductions, and taxable income", () => {
  const income = {
    line9_total_income: 70_000,
    line10_adjustments: 2_000,
    line11_agi: 68_000,
    line12c_deduction_total: 15_000,
    line13_qbi_deduction: 1_000,
    line14_deductions_qbi_total: 16_000,
    line15_taxable_income: 52_000,
  };
  assertReturnWideArithmetic(income);
  assertStringIncludes(
    irs1040.build(income, { pending: {} }),
    "<TaxableIncomeAmt>52000</TaxableIncomeAmt>",
  );
  irs1040Pdf.projectFields?.(income, {});
  for (
    const [key, reason] of [
      ["line11_agi", "line 11"],
      ["line14_deductions_qbi_total", "line 14"],
      ["line15_taxable_income", "line 15"],
    ] as const
  ) {
    assertThrows(
      () => assertReturnWideArithmetic({ ...income, [key]: income[key] + 1 }),
      Error,
      reason,
    );
    assertThrows(
      () =>
        irs1040.build({ ...income, [key]: income[key] + 1 }, {
          pending: {},
        }),
      Error,
      reason,
    );
    assertThrows(
      () =>
        irs1040Pdf.projectFields?.({ ...income, [key]: income[key] + 1 }, {}),
      Error,
      reason,
    );
  }
  assertReturnWideArithmetic({
    line11_agi: 1_000,
    line14_deductions_qbi_total: 2_000,
    line15_taxable_income: 0,
  });
});

Deno.test("Form 1040 export replays overpayment and amount owed", () => {
  const refund = {
    line24_total_tax: 1_000,
    line33_total_payments: 1_200,
    line34_overpayment: 200,
    line38_underpayment_penalty: 50,
  };
  assertReturnWideArithmetic(refund);
  assertStringIncludes(
    irs1040.build(refund, { pending: {} }),
    "<OverpaidAmt>200</OverpaidAmt>",
  );
  irs1040Pdf.projectFields?.(refund, {});
  assertThrows(
    () => assertReturnWideArithmetic({ ...refund, line34_overpayment: 199 }),
    Error,
    "line 34",
  );
  assertThrows(
    () =>
      irs1040.build({ ...refund, line34_overpayment: 199 }, {
        pending: {},
      }),
    Error,
    "line 34",
  );

  const owe = {
    line24_total_tax: 1_000,
    line33_total_payments: 800,
    line38_underpayment_penalty: 25,
    line37_amount_owed: 225,
  };
  assertReturnWideArithmetic(owe);
  irs1040Pdf.projectFields?.(owe, {});
  assertThrows(
    () => assertReturnWideArithmetic({ ...owe, line37_amount_owed: 224 }),
    Error,
    "line 37",
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.({ ...owe, line37_amount_owed: 224 }, {}),
    Error,
    "line 37",
  );

  assertReturnWideArithmetic({
    ...refund,
    line38_underpayment_penalty: 250,
    line37_amount_owed: 50,
  });
  assertReturnWideArithmetic({
    line24_total_tax: 26_357.62,
    line33_total_payments: 25_751.28,
    line37_amount_owed: 607,
  });
});

Deno.test("Form 1040 refund and applied amount exhaust the overpayment after penalty", () => {
  const fields = {
    line24_total_tax: 1_000,
    line33_total_payments: 1_200,
    line34_overpayment: 200,
    line35a_refund: 150,
    line38_underpayment_penalty: 50,
  };
  assertReturnWideArithmetic(fields);
  irs1040.build(fields, { pending: {} });
  irs1040Pdf.projectFields?.(fields, {});

  const changed = { ...fields, line35a_refund: 151 };
  assertThrows(
    () => assertReturnWideArithmetic(changed),
    Error,
    "lines 35a, 36, and 38",
  );
  assertThrows(
    () => irs1040.build(changed, { pending: {} }),
    Error,
    "lines 35a, 36, and 38",
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.(changed, {}),
    Error,
    "lines 35a, 36, and 38",
  );

  assertReturnWideArithmetic({
    ...fields,
    line35a_refund: 0,
    line38_underpayment_penalty: 250,
    line37_amount_owed: 50,
  });
});

Deno.test("Form 1040 line 33 replays a payment component when zero subtotals are omitted", () => {
  const fields = {
    line25a_w2_withheld: 125,
    line33_total_payments: 125,
  };
  assertReturnWideArithmetic(fields);
  assertStringIncludes(
    irs1040.build(fields, { pending: {} }),
    "<TotalPaymentsAmt>125</TotalPaymentsAmt>",
  );
  irs1040Pdf.projectFields?.(fields, {});
  const changed = { ...fields, line33_total_payments: 126 };
  assertThrows(() => assertReturnWideArithmetic(changed), Error, "line 33");
  assertThrows(
    () => irs1040.build(changed, { pending: {} }),
    Error,
    "line 33",
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.(changed, {}),
    Error,
    "line 33",
  );
});

const filed = {
  filing_status: "single",
  line16_income_tax: 1_000,
  line17_additional_taxes: 100,
  line18_total_tax_before_credits: 1_100,
  line19_child_tax_credit: 100,
  line20_nonrefundable_credits: 50,
  line21_credits_total: 150,
  line22_tax_after_credits: 950,
  line23_other_taxes: 50,
  line24_total_tax: 1_000,
  line25a_w2_withheld: 1_500,
  line25b_withheld_1099: 200,
  line25c_total: 20,
  line25d_total_withholding: 1_720,
  line26_estimated_tax: 100,
  line28_actc: 20,
  line29_refundable_aoc: 10,
  line31_additional_payments: 40,
  line32_refundable_credits_total: 70,
  line33_total_payments: 1_890,
};

Deno.test("Form 1040 native and PDF replay final tax and payment totals", () => {
  const pending = { f1040es: { payment_q1: 100 } };
  assertStringIncludes(
    irs1040.build(filed, { pending }),
    "<TotalPaymentsAmt>1890</TotalPaymentsAmt>",
  );
  irs1040Pdf.projectFields?.(filed, pending);

  for (
    const [change, reason] of [
      [{ line18_total_tax_before_credits: 1_101 }, "line 18"],
      [{ line21_credits_total: 151 }, "line 21"],
      [{ line22_tax_after_credits: 951 }, "line 22"],
      [{ line24_total_tax: 1_001 }, "line 24"],
      [{ line25d_total_withholding: 1_721 }, "line 25d"],
      [{ line32_refundable_credits_total: 71 }, "line 32"],
      [{ line33_total_payments: 1_891 }, "line 33"],
    ] as const
  ) {
    const changed = { ...filed, ...change };
    assertThrows(() => irs1040.build(changed, { pending }), Error, reason);
    assertThrows(
      () => irs1040Pdf.projectFields?.(changed, pending),
      Error,
      reason,
    );
  }
});

Deno.test("final Form 1040 joins Schedules B, 1, 1-A, 2, and 3 totals", () => {
  const fields = {
    line2b_taxable_interest: 120,
    line8_additional_income: 300,
    line10_adjustments: 50,
    line13b_additional_deductions: 75,
    line17_additional_taxes: 100,
    line20_nonrefundable_credits: 25,
    line31_additional_payments: 40,
  };
  const pending = {
    schedule_b: { print_line4_total: 120 },
    schedule1: {
      line10_total_additional_income: 300,
      line26_total_adjustments: 50,
    },
    schedule1a: { line38_total: 75 },
    schedule2: { line2_amt: 100 },
    schedule3: { line8_total: 25, line15_total: 40 },
  };
  assertReturnScheduleJoins(fields, pending);
  for (
    const [key, reason] of [
      ["line2b_taxable_interest", "line 2b"],
      ["line8_additional_income", "line 8"],
      ["line10_adjustments", "line 10"],
      ["line13b_additional_deductions", "line 13b"],
      ["line17_additional_taxes", "line 17"],
      ["line20_nonrefundable_credits", "line 20"],
      ["line31_additional_payments", "line 31"],
    ] as const
  ) {
    assertThrows(
      () => assertReturnScheduleJoins({ ...fields, [key]: 999 }, pending),
      Error,
      reason,
    );
  }

  const attached = {
    schedule_b: pending.schedule_b,
    schedule1: pending.schedule1,
    schedule2: pending.schedule2,
    schedule3: pending.schedule3,
  };
  const filedWithSchedules = {
    line2b_taxable_interest: 120,
    line8_additional_income: 300,
    line10_adjustments: 50,
    line17_additional_taxes: 100,
    line20_nonrefundable_credits: 25,
    line31_additional_payments: 40,
  };
  assertStringIncludes(
    irs1040.build(filedWithSchedules, { pending: attached }),
    "<TotalAdditionalIncomeAmt>300</TotalAdditionalIncomeAmt>",
  );
  irs1040Pdf.projectFields?.(filedWithSchedules, attached);
  assertThrows(
    () =>
      irs1040.build({ ...filedWithSchedules, line2b_taxable_interest: 119 }, {
        pending: attached,
      }),
    Error,
    "line 2b",
  );
  assertThrows(
    () =>
      irs1040Pdf.projectFields?.(
        { ...filedWithSchedules, line2b_taxable_interest: 119 },
        attached,
      ),
    Error,
    "line 2b",
  );
  assertThrows(
    () =>
      irs1040.build({ ...filedWithSchedules, line8_additional_income: 301 }, {
        pending: attached,
      }),
    Error,
    "line 8",
  );
  assertThrows(
    () =>
      irs1040Pdf.projectFields?.(
        { ...filedWithSchedules, line31_additional_payments: 41 },
        attached,
      ),
    Error,
    "line 31",
  );
  assertThrows(
    () =>
      irs1040.build(
        { ...filedWithSchedules, line20_nonrefundable_credits: 26 },
        { pending: attached },
      ),
    Error,
    "line 20",
  );
  assertThrows(
    () =>
      irs1040Pdf.projectFields?.(
        { ...filedWithSchedules, line20_nonrefundable_credits: 26 },
        attached,
      ),
    Error,
    "line 20",
  );
});

Deno.test("Form 1040 line 31 uses the rounded Schedule 3 payment total", () => {
  const pending = { schedule3: { line15_total: 42.6 } };
  assertReturnScheduleJoins({ line31_additional_payments: 42.6 }, pending);
  assertReturnScheduleJoins({ line31_additional_payments: 43 }, pending);
  assertThrows(
    () =>
      assertReturnScheduleJoins(
        { line31_additional_payments: 42.4 },
        pending,
      ),
    Error,
    "line 31",
  );
});

Deno.test("full-return Schedule 1 totals replay printed income and adjustments", () => {
  const schedule1 = {
    line3_schedule_c: 100,
    line8a_nol_deduction: 20,
    line9_total_other_income: -20,
    line10_total_additional_income: 80,
    line11_educator_expenses: 10,
    line24b_personal_property_expenses: 5,
    line25_total_other_adjustments: 5,
    line26_total_adjustments: 15,
  };
  const pending = { general: {}, schedule1 };
  const filed = { line8_additional_income: 80, line10_adjustments: 15 };
  assertReturnScheduleJoins(filed, pending);
  for (
    const [key, filedKey, reason] of [
      ["line9_total_other_income", "line8_additional_income", "line 9"],
      ["line10_total_additional_income", "line8_additional_income", "line 10"],
      ["line25_total_other_adjustments", "line10_adjustments", "line 25"],
      ["line26_total_adjustments", "line10_adjustments", "line 26"],
    ] as const
  ) {
    assertThrows(
      () =>
        assertReturnScheduleJoins(
          { ...filed, [filedKey]: filed[filedKey] + 1 },
          {
            general: {},
            schedule1: { ...schedule1, [key]: schedule1[key] + 1 },
          },
        ),
      Error,
      reason,
    );
  }
});
