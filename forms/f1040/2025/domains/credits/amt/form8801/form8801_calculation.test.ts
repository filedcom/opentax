import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateForm8801,
  type Form8801CalculationInput,
} from "./form8801_calculation.ts";

function fixture(): Form8801CalculationInput {
  return {
    tax_year: 2025,
    prior_tax_year: 2024,
    taxpayer_ssn: "111223333",
    reviewer: "Workpaper reviewer",
    reviewed_on: "2026-04-01",
    prior_filing_status: "single",
    prior_form6251: {
      reference: "2024-6251",
      line1: 100_000,
      line2e: 0,
      line2a: 20_000,
      line2b: 0,
      line2c: 0,
      line2d: 0,
      line2g: 0,
      line2h: 0,
      line10: 8_000,
      line11: 5_000,
    },
    additional_exclusion_items: [],
    minimum_tax_credit_nol_workpaper: { reference: "mtcnol", amount: 0 },
    minimum_tax_foreign_credit_exclusion_workpaper: {
      reference: "mtftce",
      amount: 0,
    },
    prior_credit_carryforward: { reference: "2024-8801-line26", amount: 1_000 },
    prior_unallowed_qualified_electric_vehicle_credit: {
      reference: "qev",
      amount: 100,
    },
    current_return: {
      reference: "2025-return",
      form1040_line16: 20_000,
      schedule2_line1z: 0,
      form1040_line19: 1_000,
      form6251_line9: 15_000,
      schedule3_credits: [{ key: "1", amount: 1_000 }, {
        key: "6b",
        amount: 999,
      }, { key: "6k", amount: 888 }],
    },
  };
}

Deno.test("Form 8801 exclusion AMT, credit ordering and carry differ from the old preview", () => {
  const r = calculateForm8801(fixture());
  assertEquals(r.lines, {
    1: 100_000,
    2: 20_000,
    3: 0,
    4: 120_000,
    5: 85_700,
    6: 609_350,
    7: 0,
    8: 0,
    9: 85_700,
    10: 34_300,
    11: 8_918,
    12: 0,
    13: 8_918,
    14: 8_000,
    15: 918,
    16: 5_000,
    17: 918,
    18: 4_082,
    19: 1_000,
    20: 100,
    21: 5_182,
    22: 18_000,
    23: 15_000,
    24: 3_000,
    25: 3_000,
    26: 2_182,
  });
  assertEquals([
    r.filingReady,
    r.priorAcceptanceVerified,
    r.workpaperAuthenticityVerified,
    r.finalizedReturnReconciled,
  ], [false, false, false, false]);
});

Deno.test("Form 8801 negative deferral amount offsets carry and stops at nonpositive line 21", () => {
  const v = fixture();
  v.prior_form6251.line10 = 0;
  const r = calculateForm8801(v);
  assertEquals(r.lines[18], -3_918);
  assertEquals(r.lines[21], -2_818);
  assertEquals(r.fileRequired, false);
  assertEquals(r.lines[22], undefined);
  assertEquals(r.carryforward_to_2026, 0);
  assertEquals(r.schedule3_line6b, 0);
});

Deno.test("Form 8801 prior MFS adjustment reproduces IRS 895950 example and cap", () => {
  for (
    const [entered, expected] of [[875_950, 875_950], [895_950, 900_950], [
      1_142_550,
      1_209_200,
    ]]
  ) {
    const v = fixture();
    v.prior_filing_status = "married_filing_separately";
    v.prior_form6251.line1 = entered;
    v.prior_form6251.line2a = 0;
    assertEquals(calculateForm8801(v).lines[4], expected);
  }
});

Deno.test("Form 8801 all five prior statuses use 2024 exemption and phaseout", () => {
  for (
    const [status, exemption, threshold] of [
      ["single", 85_700, 609_350],
      ["head_of_household", 85_700, 609_350],
      ["married_filing_jointly", 133_300, 1_218_700],
      ["qualifying_surviving_spouse", 133_300, 1_218_700],
      ["married_filing_separately", 66_650, 609_350],
    ] as const
  ) {
    const v = fixture();
    v.prior_filing_status = status;
    if (status === "married_filing_jointly") v.prior_spouse_ssn = "444556666";
    v.prior_form6251.line1 = threshold + 4_000;
    v.prior_form6251.line2a = 0;
    const r = calculateForm8801(v);
    assertEquals(r.lines[5], exemption);
    assertEquals(r.lines[8], 1_000);
    assertEquals(r.lines[9], exemption - 1_000);
  }
});

Deno.test("Form 8801 separate MTCNOL and signed exclusion inventory can skip Part I tax", () => {
  const v = fixture();
  v.prior_form6251.line2e = -1_000;
  v.additional_exclusion_items = [{
    item_id: "trust-code-J",
    reference: "trust-k1",
    amount: 1_000,
  }, {
    item_id: "other-exclusion",
    reference: "depletion-workpaper",
    amount: -2_000,
  }];
  v.minimum_tax_credit_nol_workpaper.amount = 118_000;
  const r = calculateForm8801(v);
  assertEquals(r.lines[1], 99_000);
  assertEquals(r.lines[2], 19_000);
  assertEquals(r.lines[4], 0);
  assertEquals(r.lines[5], undefined);
  assertEquals(r.lines[11], undefined);
  assertEquals(r.lines[15], 0);
  assertEquals(r.lines[21], 6_100);
});

Deno.test("Form 8801 positive available credit files even with zero current capacity", () => {
  const v = fixture();
  v.current_return.form6251_line9 = 30_000;
  const r = calculateForm8801(v);
  assertEquals(r.fileRequired, true);
  assertEquals(r.lines[24], 0);
  assertEquals(r.lines[25], 0);
  assertEquals(r.lines[26], 5_182);
  v.prior_form6251.line11 = 7_818;
  v.prior_form6251.line10 = 0;
  const zero = calculateForm8801(v);
  assertEquals(zero.lines[21], 0);
  assertEquals(zero.lines[26], undefined);
});

function capitalFixture(): Form8801CalculationInput {
  const v = fixture();
  v.prior_form6251.line1 = 185_700;
  v.prior_form6251.line2a = 0;
  v.capital_rate_workpaper = {
    reference: "2024-amt-gain-worksheet",
    method: "qualified_dividends_worksheet",
    line28: 20_000,
    line29: 0,
    line35: 100_000,
    line42: 100_000,
    amt_and_foreign_modifications_reviewed: true,
  };
  return v;
}

Deno.test("Form 8801 preferential tax computes 15%, 20%, zero and ordinary caps", () => {
  const v = capitalFixture();
  let r = calculateForm8801(v);
  assertEquals(r.lines[27], 100_000);
  assertEquals(r.lines[33], 20_800);
  assertEquals(r.lines[46], 3_000);
  assertEquals(r.lines[55], 23_800);
  v.capital_rate_workpaper!.line35 = 0;
  v.capital_rate_workpaper!.line42 = 0;
  r = calculateForm8801(v);
  assertEquals(r.lines[38], 20_000);
  assertEquals(r.lines[48], 0);
  assertEquals(r.lines[55], 20_800);
  v.capital_rate_workpaper!.line35 = 600_000;
  v.capital_rate_workpaper!.line42 = 600_000;
  r = calculateForm8801(v);
  assertEquals(r.lines[45], 0);
  assertEquals(r.lines[49], 4_000);
  assertEquals(r.lines[55], 24_800);
});

Deno.test("Form 8801 Schedule D unrecaptured gain uses separate 25% component", () => {
  const v = capitalFixture();
  v.capital_rate_workpaper = {
    ...v.capital_rate_workpaper!,
    method: "schedule_d_worksheet",
    line29: 10_000,
    schedule_d_line10: 30_000,
  };
  const r = calculateForm8801(v);
  assertEquals(r.lines[32], 70_000);
  assertEquals(r.lines[51], 10_000);
  assertEquals(r.lines[52], 2_500);
  assertEquals(r.lines[55], 23_700);
});

Deno.test("Form 8801 foreign-income worksheet subtracts tax on excluded-income stack", () => {
  const v = fixture();
  v.foreign_earned_income = {
    reference: "2024-2555",
    form2555_lines45_and50: 250_000,
    excluded_income_related_deductions: 10_000,
  };
  const r = calculateForm8801(v);
  assertEquals(r.foreignWorksheet, {
    line1: 34_300,
    line2a: 250_000,
    line2b: 10_000,
    line2c: 240_000,
    line3: 274_300,
    line4: 72_152,
    line5: 62_548,
    line6: 9_604,
  });
  assertEquals(r.lines[11], 9_604);
  v.minimum_tax_foreign_credit_exclusion_workpaper.amount = 500;
  assertEquals(calculateForm8801(v).lines[15], 1_104);
});

Deno.test("Form 8801 foreign and preferential workpapers coexist without omitting stack", () => {
  const v = capitalFixture();
  v.foreign_earned_income = {
    reference: "2024-2555",
    form2555_lines45_and50: 100_000,
    excluded_income_related_deductions: 0,
  };
  const r = calculateForm8801(v);
  assertEquals(r.lines[27], 200_000);
  assertEquals(r.lines[55], 49_800);
  assertEquals(r.foreignWorksheet!.line5, 26_000);
  assertEquals(r.lines[11], 23_800);
});

Deno.test("Form 8801 strict workpapers reject wrong years, dates, duplicates, detached lines and unsafe values", () => {
  const v = fixture();
  for (
    const altered of [
      { ...v, prior_tax_year: 2025 },
      { ...v, tax_year: 2026 },
      { ...v, reviewed_on: "2026-02-30" },
      { ...v, line21: 9_999 },
      { ...v, prior_form6251: { ...v.prior_form6251, line11: -1 } },
      {
        ...v,
        prior_form6251: { ...v.prior_form6251, line1: Number.MAX_SAFE_INTEGER },
      },
      {
        ...v,
        current_return: {
          ...v.current_return,
          schedule3_credits: [{ key: "1", amount: 1 }, { key: "1", amount: 2 }],
        },
      },
      {
        ...v,
        additional_exclusion_items: [{
          item_id: "dup",
          reference: "a",
          amount: 1,
        }, { item_id: "dup", reference: "b", amount: 2 }],
      },
      {
        ...capitalFixture(),
        capital_rate_workpaper: {
          ...capitalFixture().capital_rate_workpaper,
          line29: 1,
        },
      },
      {
        ...capitalFixture(),
        capital_rate_workpaper: {
          ...capitalFixture().capital_rate_workpaper,
          line42: 0,
        },
      },
      {
        ...capitalFixture(),
        capital_rate_workpaper: {
          ...capitalFixture().capital_rate_workpaper,
          method: "schedule_d_worksheet",
          schedule_d_line10: 1,
        },
      },
    ]
  ) assertThrows(() => calculateForm8801(altered as Form8801CalculationInput));
});
