import {
  stageForm172ModernAmtCapSource,
  stageForm172ModernAmtDeductionAllocationSource,
  stageForm172ModernAmtModifiedIncomeSource,
  stageForm172ModernAmtOrdinaryAbsorptionWorkpaperSource,
  stageForm172ModernAmtSection172CapacitySource,
  stageForm172ModernAmtVintageModifiedIncomeSource,
} from "./form172_amt_historical_cap_source.ts";
import {
  calculateForm172ModernAmtOrdinaryAbsorptionWorkpaper,
  calculateForm172ModernAmtSection172Capacity,
} from "./form172_amt_historical_absorption.ts";
import { calculateForm172ModernAmtVintageModifiedIncome } from "./form172_amt_vintage_modified_income.ts";
import { calculateForm172ModernAmtModifiedIncome } from "./form172_amt_modified_income.ts";
import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  calculateForm172AmtAnnualLimit,
  calculateForm172AmtModernOrdinaryCap,
  calculateForm172AmtModernOrdinaryDeductionAllocation,
  form172AmtLegacyTentativeLines,
  form172AmtTentativeLines,
} from "./form172_amt_annual_limit.ts";
function origin() {
  const item = (id: string, amount: number, business: boolean) => ({
    item_id: id,
    reference: id,
    owner_ssn: "111223333",
    amount,
    business,
  });
  return {
    tax_year: 2019,
    taxpayer_ssn: "111223333",
    reference: "origin-2019",
    filing_status: "single",
    reviewed_form1040: {
      reference: "return-2019",
      tax_year: 2019,
      taxpayer_ssn: "111223333",
      filing_status: "single",
      line11_agi: -100000,
      line12_standard_or_itemized_deduction: 12200,
    },
    limitations_review: {
      reference: "loss-limit-review",
      at_risk_and_passive_limits_applied: true,
      excess_business_loss_limit_applied: true,
    },
    noncapital_income: [item("receipts", 10000, true)],
    noncapital_deductions: [{
      ...item("expenses", 110000, true),
      location: "agi",
    }, { ...item("standard", 12200, false), location: "line12" }],
    capital_gains: [],
    capital_losses: [],
    prior_nol_deductions: [],
  };
}

function amt() {
  const { reviewed_form1040: _, ...a } = origin();
  a.reference = "amt-items";
  a.noncapital_deductions[0].amount = 90000;
  a.noncapital_deductions[1].amount = 0;
  return {
    reference: "amt-origin",
    regular_origin_reference: "origin-2019",
    amt_inventory: a,
    reviewed_amt: {
      reference: "amt-return-review",
      tax_year: 2019,
      taxpayer_ssn: "111223333",
      amti_before_atnold: -80000,
      qbi_deduction: 0,
      section250_deduction: 0,
      all_amt_adjustments_and_preferences_applied: true,
    },
  };
}

function annual() {
  return {
    reference: "annual-AMT-review",
    tax_year: 2024,
    taxpayer_ssn: "111223333",
    form6251_reference: "return-6251",
    before_all_atnold: true,
    tentative_depletion_refigured_with_zero_atnold: true,
    components: form172AmtTentativeLines.map((line) => ({
      line,
      reference: `review-${line}`,
      amount: line === "1"
        ? 50000
        : line === "2e"
        ? 40000
        : line === "2l"
        ? 10000
        : 0,
    })),
  };
}
Deno.test("Form 172 AMT annual cap uses all signed tentative components before ATNOLD", () => {
  const r = calculateForm172AmtAnnualLimit(origin(), amt(), annual());
  assertEquals(r.originAmtNol, 80000);
  assertEquals(r.tentativeAmtiBeforeAtnold, 100000);
  assertEquals(r.ordinary90PercentLimit, 90000);
  assertEquals(r.amtAnnualLimitWorkpaperArithmeticReconciled, true);
  assertEquals(r.section172AnnualLimitReconciled, false);
  assertEquals(r.amtCarryAbsorptionReconciled, false);
  assertEquals(r.filingReady, false);
});
Deno.test("Form 172 AMT annual cap preserves refund and negative depreciation signs", () => {
  const a = annual();
  a.components.find((c) => c.line === "2b")!.amount = -5000;
  a.components.find((c) => c.line === "2l")!.amount = -10000;
  const r = calculateForm172AmtAnnualLimit(origin(), amt(), a);
  assertEquals(r.tentativeAmtiBeforeAtnold, 75000);
  assertEquals(r.ordinary90PercentLimit, 67500);
});
Deno.test("Form 172 AMT annual cap floors negative AMTI and rounds exact dollars", () => {
  const a = annual();
  a.components.forEach((c) => c.amount = 0);
  a.components[0].amount = -1;
  assertEquals(
    calculateForm172AmtAnnualLimit(origin(), amt(), a).ordinary90PercentLimit,
    0,
  );
  a.components[0].amount = 100005;
  assertEquals(
    calculateForm172AmtAnnualLimit(origin(), amt(), a).ordinary90PercentLimit,
    90005,
  );
});
Deno.test("Form 172 AMT annual cap rejects omitted duplicate line2f or asserted capacity", () => {
  const a = annual();
  for (
    const components of [a.components.slice(1), [
      a.components[0],
      ...a.components.slice(0, -1),
    ], [...a.components, {
      line: "2f",
      reference: "unsourced",
      amount: -90000,
    }]]
  ) {
    assertThrows(() =>
      calculateForm172AmtAnnualLimit(origin(), amt(), { ...a, components })
    );
  }
  assertThrows(() =>
    calculateForm172AmtAnnualLimit(origin(), amt(), {
      ...a,
      ordinary90PercentLimit: 90000,
    })
  );
});
Deno.test("Form 172 AMT annual cap rejects source owner year tentative-depletion and sign conflicts", () => {
  const a = annual();
  for (
    const patch of [
      { taxpayer_ssn: "999887777" },
      { tax_year: 2019 },
      { spouse_ssn: "999887777" },
      { tentative_depletion_refigured_with_zero_atnold: false },
      { before_all_atnold: false },
      { reference: "return-6251" },
    ]
  ) {
    assertThrows(() =>
      calculateForm172AmtAnnualLimit(origin(), amt(), { ...a, ...patch })
    );
  }
  a.components.find((c) => c.line === "2b")!.amount = 1;
  assertThrows(() => calculateForm172AmtAnnualLimit(origin(), amt(), a));
  a.components.find((c) => c.line === "2b")!.amount = 0;
  a.components.find((c) => c.line === "2e")!.amount = -1;
  assertThrows(() => calculateForm172AmtAnnualLimit(origin(), amt(), a));
});

function annual2025() {
  const old = annual();
  return {
    ...old,
    tax_year: 2025,
    reviewed_form1040: {
      reference: "current-1040",
      tax_year: 2025,
      taxpayer_ssn: "111223333",
      line11b_agi: 50000,
      line14_deductions: 23750,
      schedule1a_line37_senior_deduction: 6000,
    },
    components: old.components.map((c) =>
      c.line === "1"
        ? { ...c, line: "1b", amount: 32250 }
        : c.line === "2a"
        ? { ...c, amount: 17750 }
        : { ...c, amount: 0 }
    ),
  };
}
Deno.test("Form172 2025 AMT line1b restores senior deduction and counts line1a only as a subtrahend", () => {
  const r = calculateForm172AmtAnnualLimit(origin(), amt(), annual2025());
  assertEquals(r.form6251Line1a, 17750);
  assertEquals(r.tentativeAmtiBeforeAtnold, 50000);
  assertEquals(r.ordinary90PercentLimit, 45000);
  assertEquals(r.sourceAuthenticityVerified, false);
  assertEquals(r.amtCarryAbsorptionReconciled, false);
  assertEquals(r.filingReady, false);
});
Deno.test("Form172 2025 AMT line1b preserves negative AGI and additional non-senior deductions", () => {
  const a = annual2025();
  a.reviewed_form1040.line11b_agi = -5000;
  a.reviewed_form1040.line14_deductions = 26750;
  a.components[0].amount = -25750;
  const r = calculateForm172AmtAnnualLimit(origin(), amt(), a);
  assertEquals(r.form6251Line1a, 20750);
  assertEquals(r.tentativeAmtiBeforeAtnold, -8000);
  assertEquals(r.ordinary90PercentLimit, 0);
});
Deno.test("Form172 AMT annual rejects mixing legacy line1 and current line1b layouts", () => {
  const a = annual2025();
  for (
    const components of [
      a.components.map((c, i) => i === 0 ? { ...c, line: "1" } : c),
      [{ line: "1a", reference: "deductions", amount: 17750 }, ...a.components],
      [{ ...a.components[0], line: "1" }, ...a.components.slice(1)],
    ]
  ) {
    assertThrows(() =>
      calculateForm172AmtAnnualLimit(origin(), amt(), { ...a, components })
    );
  }
  assertThrows(() =>
    calculateForm172AmtAnnualLimit(origin(), amt(), {
      ...annual(),
      components: a.components,
    })
  );
  assertThrows(() =>
    calculateForm172AmtAnnualLimit(origin(), amt(), {
      ...annual(),
      reviewed_form1040: a.reviewed_form1040,
    })
  );
  const { reviewed_form1040: _, ...missing } = a;
  assertThrows(() => calculateForm172AmtAnnualLimit(origin(), amt(), missing));
});
Deno.test("Form172 2025 AMT rejects wrong current return operands identity and senior totals", () => {
  const a = annual2025();
  for (
    const patch of [
      { taxpayer_ssn: "999887777" },
      { spouse_ssn: "999887777" },
      { tax_year: 2024 },
      { reference: a.reference },
      { reference: a.form6251_reference },
      { line11b_agi: 50001 },
      { line14_deductions: 23749 },
      { schedule1a_line37_senior_deduction: 0 },
      { schedule1a_line37_senior_deduction: 23751 },
      { schedule1a_line37_senior_deduction: -1 },
    ]
  ) {
    assertThrows(() =>
      calculateForm172AmtAnnualLimit(origin(), amt(), {
        ...a,
        reviewed_form1040: { ...a.reviewed_form1040, ...patch },
      })
    );
  }
});

function legacyAnnual(year = 2016) {
  return {
    ...annual(),
    tax_year: year,
    section199_deduction: { reference: "annual-dpad", amount: 3000 },
    components: form172AmtLegacyTentativeLines.map((line) => ({
      line,
      reference: `legacy-${line}`,
      amount: line === "1"
        ? 50000
        : line === "10"
        ? 40000
        : line === "18"
        ? 10000
        : 0,
    })),
  };
}
Deno.test("Form172 historical annual cap restores separately reviewed section199 after tentative AMTI", () => {
  for (const year of [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017]) {
    const r = calculateForm172AmtAnnualLimit(
      origin(),
      amt(),
      legacyAnnual(year),
    );
    assertEquals(r.tentativeAmtiBeforeAtnold, 100000);
    assertEquals(r.section199Addback, 3000);
    assertEquals(r.ordinaryLimitBase, 103000);
    assertEquals(r.ordinary90PercentLimit, 92700);
    assertEquals(r.section172AnnualLimitReconciled, false);
    assertEquals(r.filingReady, false);
  }
});
Deno.test("Form172 historical annual preserves parenthetical deductions and medical year boundary", () => {
  const a = legacyAnnual();
  a.components.find((c) => c.line === "2")!.amount = 2000;
  for (const line of ["6", "7", "25"]) {
    a.components.find((c) => c.line === line)!.amount = -1000;
  }
  const r = calculateForm172AmtAnnualLimit(origin(), amt(), a);
  assertEquals(r.tentativeAmtiBeforeAtnold, 99000);
  assertEquals(r.ordinary90PercentLimit, 91800);
  assertThrows(() =>
    calculateForm172AmtAnnualLimit(origin(), amt(), { ...a, tax_year: 2017 })
  );
});
Deno.test("Form172 historical annual cap rejects wrong layout omitted ATNOLD and reversed parentheticals", () => {
  const a = legacyAnnual();
  for (
    const components of [annual().components, a.components.slice(1), [
      ...a.components,
      { line: "11", reference: "atnold", amount: -1000 },
    ], [...a.components.slice(1), a.components[1]]]
  ) {
    assertThrows(() =>
      calculateForm172AmtAnnualLimit(origin(), amt(), { ...a, components })
    );
  }
  for (const line of ["6", "7", "25", "10"]) {
    const b = legacyAnnual();
    b.components.find((c) => c.line === line)!.amount = line === "10" ? -1 : 1;
    assertThrows(() => calculateForm172AmtAnnualLimit(origin(), amt(), b));
  }
});
Deno.test("Form172 annual cap rejects missing duplicate and modern section199 reviews", () => {
  const a = legacyAnnual();
  const { section199_deduction: _, ...missing } = a;
  assertThrows(() => calculateForm172AmtAnnualLimit(origin(), amt(), missing));
  for (
    const reference of [
      a.reference,
      a.form6251_reference,
      a.components[0].reference,
    ]
  ) {
    assertThrows(() =>
      calculateForm172AmtAnnualLimit(origin(), amt(), {
        ...a,
        section199_deduction: { reference, amount: 3000 },
      })
    );
  }
  assertThrows(() =>
    calculateForm172AmtAnnualLimit(origin(), amt(), {
      ...annual(),
      section199_deduction: { reference: "modern-dpad", amount: 0 },
    })
  );
  const modern = annual();
  modern.components.find((c) => c.line === "2s")!.amount = 1;
  assertThrows(() => calculateForm172AmtAnnualLimit(origin(), amt(), modern));
});
Deno.test("Form172 historical cap floors only after section199 restoration", () => {
  const a = legacyAnnual();
  a.components.forEach((c) => c.amount = 0);
  a.components[0].amount = -2000;
  assertEquals(
    calculateForm172AmtAnnualLimit(origin(), amt(), a).ordinary90PercentLimit,
    900,
  );
  a.components[0].amount = -4000;
  assertEquals(
    calculateForm172AmtAnnualLimit(origin(), amt(), a).ordinary90PercentLimit,
    0,
  );
});

Deno.test("Form172 early annual layouts distinguish ScheduleL2010 from reserved2011 and2012 line6", () => {
  const a = legacyAnnual(2010);
  a.components.find((c) => c.line === "6")!.amount = -1000;
  assertEquals(
    calculateForm172AmtAnnualLimit(origin(), amt(), a).ordinary90PercentLimit,
    91800,
  );
  for (const year of [2011, 2012]) {
    assertThrows(
      () =>
        calculateForm172AmtAnnualLimit(origin(), amt(), {
          ...a,
          tax_year: year,
        }),
      Error,
      "reserved line6",
    );
  }
  assertThrows(() =>
    calculateForm172AmtAnnualLimit(origin(), amt(), { ...a, tax_year: 2009 })
  );
});

function modernOrdinaryCap() {
  return {
    reference: "modern-cap",
    annual_review: annual(),
    deductions_review: {
      reference: "modern-deductions",
      tax_year: 2024,
      taxpayer_ssn: "111223333",
      section199a_deduction_in_tentative_amti: 0,
      section250_deduction_in_tentative_amti: 0,
    },
    losses: [{
      reference: "opening-2019",
      regular_origin: origin() as unknown,
      amt_origin: amt() as unknown,
      opening_amt_nol: 80000,
      ordinary_section56_category_reviewed: true,
    }],
  };
}
Deno.test("Form172 modern ordinary ceiling coordinates 80% and 90% separately", () => {
  const v = modernOrdinaryCap();
  v.annual_review.components[0].amount = 40000; // AMTI90k; 80%72k vs90%81k
  const r = calculateForm172AmtModernOrdinaryCap(v);
  assertEquals(r.section172DeductionCap, 72000);
  assertEquals(r.ordinary90PercentLimit, 81000);
  assertEquals(r.ordinaryDeductionCap, 72000);
  assertEquals(r.openingCarryAvailabilityVerified, false);
  assertEquals(r.amtCarryAbsorptionReconciled, false);
  assertEquals(r.filingReady, false);
  v.deductions_review.section199a_deduction_in_tentative_amti = 20000;
  v.deductions_review.section250_deduction_in_tentative_amti = 5000;
  const added = calculateForm172AmtModernOrdinaryCap(v);
  assertEquals(added.section172IncomeBase, 115000);
  assertEquals(added.section172DeductionCap, 80000);
  assertEquals(added.ordinary90PercentLimit, 81000);
  assertEquals(added.ordinaryDeductionCap, 80000);
});
function modernOlderLoss(year: number, opening: number) {
  const r = structuredClone(origin());
  r.tax_year = year;
  r.reviewed_form1040.tax_year = year;
  const a = structuredClone(amt());
  a.amt_inventory.tax_year = year;
  a.reviewed_amt.tax_year = year;
  const historicalLimits = {
    reference: "legacy-limits",
    at_risk_and_passive_limits_applied: true,
    itemized_phaseout_applied: true,
  };
  const regular = year < 2018
    ? {
      source_format: "reviewed_legacy_loss_year",
      reference: r.reference,
      tax_year: year,
      taxpayer_ssn: r.taxpayer_ssn,
      filing_status: r.filing_status,
      inventory: {
        noncapital_income: r.noncapital_income,
        noncapital_deductions: r.noncapital_deductions,
        capital_gains: r.capital_gains,
        capital_losses: r.capital_losses,
        prior_nol_deductions: [],
      },
      reviewed_form1040: {
        reference: r.reviewed_form1040.reference,
        tax_year: year,
        taxpayer_ssn: r.taxpayer_ssn,
        filing_status: r.filing_status,
        agi: -100000,
        standard_or_itemized_deduction: 12200,
        personal_exemptions: 0,
        reported_taxable_income: 0,
      },
      section199_deduction: { reference: "regular-dpad", amount: 0 },
      limitations_review: historicalLimits,
    }
    : r;
  const amtOrigin = year < 2018
    ? {
      ...a,
      amt_inventory: {
        ...a.amt_inventory,
        limitations_review: historicalLimits,
      },
      reviewed_amt: {
        ...a.reviewed_amt,
        section199_deduction: { reference: "amt-dpad", amount: 0 },
      },
    }
    : a;
  return {
    reference: `opening-${year}`,
    regular_origin: regular as unknown,
    amt_origin: amtOrigin as unknown,
    opening_amt_nol: opening,
    ordinary_section56_category_reviewed: true,
  };
}
Deno.test("Form172 modern mixed vintages subtract pre2018 opening before 80%", () => {
  const v = modernOrdinaryCap();
  v.losses.push(modernOlderLoss(2017, 50000));
  const r = calculateForm172AmtModernOrdinaryCap(v);
  assertEquals(r.pre2018Opening, 50000);
  assertEquals(r.post2017IncomeExcess, 50000);
  assertEquals(r.post2017EightyPercentLimit, 40000);
  assertEquals(r.section172DeductionCap, 90000);
  assertEquals(r.ordinaryDeductionCap, 90000);
  v.losses[1].opening_amt_nol = 80000;
  v.annual_review.components[0].amount = 0; //AMTI50k, olderopening80k
  const capped = calculateForm172AmtModernOrdinaryCap(v);
  assertEquals(capped.post2017EightyPercentLimit, 0);
  assertEquals(capped.section172DeductionCap, 80000);
  assertEquals(capped.ordinaryDeductionCap, 45000);
});
Deno.test("Form172 modern annual cap suspends 80% in 2018–20, applies it from2021", () => {
  for (const year of [2018, 2019, 2020, 2021, 2024]) {
    const v = modernOrdinaryCap();
    v.annual_review.tax_year = year;
    v.deductions_review.tax_year = year;
    v.losses = [modernOlderLoss(2017, 50000), modernOlderLoss(2016, 50000)];
    const r = calculateForm172AmtModernOrdinaryCap(v);
    assertEquals(r.section172DeductionCap, 100000);
    assertEquals(r.ordinaryDeductionCap, 90000);
    assertEquals(r.post2017EightyPercentLimit, year > 2020 ? 0 : undefined);
  }
  const v = modernOrdinaryCap();
  v.annual_review.tax_year = 2020;
  v.deductions_review.tax_year = 2020;
  assertEquals(
    calculateForm172AmtModernOrdinaryCap(v).ordinaryDeductionCap,
    80000,
  );
  v.annual_review.tax_year = 2021;
  v.deductions_review.tax_year = 2021;
  v.annual_review.components[0].amount = 40000;
  assertEquals(
    calculateForm172AmtModernOrdinaryCap(v).ordinaryDeductionCap,
    72000,
  );
});
Deno.test("Form172 modern cap rejects invalid opening year owner category and authority", () => {
  for (
    const mutate of [
      (v: ReturnType<typeof modernOrdinaryCap>) => {
        v.losses[0].opening_amt_nol = 80001;
      },
      (v: ReturnType<typeof modernOrdinaryCap>) => {
        v.losses.push(structuredClone(v.losses[0]));
      },
      (v: ReturnType<typeof modernOrdinaryCap>) => {
        v.deductions_review.taxpayer_ssn = "999887777";
      },
      (v: ReturnType<typeof modernOrdinaryCap>) => {
        v.deductions_review.tax_year = 2023;
      },
      (v: ReturnType<typeof modernOrdinaryCap>) => {
        v.deductions_review.reference = v.reference;
      },
      (v: ReturnType<typeof modernOrdinaryCap>) => {
        v.annual_review.tax_year = 2017;
      },
    ]
  ) {
    const v = modernOrdinaryCap();
    mutate(v);
    assertThrows(() => calculateForm172AmtModernOrdinaryCap(v));
  }
  const v = modernOrdinaryCap();
  assertThrows(() =>
    calculateForm172AmtModernOrdinaryCap({
      ...v,
      losses: [{ ...v.losses[0], ordinary_section56_category_reviewed: false }],
    })
  );
  assertThrows(() =>
    calculateForm172AmtModernOrdinaryCap({ ...v, ordinaryDeductionCap: 80000 })
  );
  v.losses = [modernOlderLoss(2024, 80000)];
  assertThrows(() => calculateForm172AmtModernOrdinaryCap(v));
});
Deno.test("Form172 modern cap binds TY2025 operands and last pre2018 carry year", () => {
  const v = modernOrdinaryCap();
  const a = annual2025();
  const r = calculateForm172AmtModernOrdinaryCap({
    ...v,
    annual_review: a,
    deductions_review: { ...v.deductions_review, tax_year: 2025 },
    losses: [modernOlderLoss(2005, 80000)],
  });
  assertEquals(r.section172DeductionCap, 80000);
  assertEquals(r.ordinaryDeductionCap, 45000);
  const later = calculateForm172AmtModernOrdinaryCap({
    ...v,
    annual_review: a,
    deductions_review: { ...v.deductions_review, tax_year: 2025 },
  });
  assertEquals(later.section172DeductionCap, 40000);
  assertEquals(later.ordinaryDeductionCap, 40000);
  assertThrows(() =>
    calculateForm172AmtModernOrdinaryCap({
      ...v,
      annual_review: {
        ...a,
        reviewed_form1040: { ...a.reviewed_form1040, line11b_agi: 50001 },
      },
      deductions_review: { ...v.deductions_review, tax_year: 2025 },
    })
  );
});
Deno.test("Form172 modern cap negative bases and whole-dollar percentages", () => {
  const v = modernOrdinaryCap();
  v.annual_review.components.forEach((c) => c.amount = 0);
  v.annual_review.components[0].amount = -10;
  assertEquals(calculateForm172AmtModernOrdinaryCap(v).ordinaryDeductionCap, 0);
  v.annual_review.components[0].amount = 10001;
  const r = calculateForm172AmtModernOrdinaryCap(v);
  assertEquals(r.post2017EightyPercentLimit, 8001);
  assertEquals(r.ordinary90PercentLimit, 9001);
  assertEquals(r.ordinaryDeductionCap, 8001);
});
Deno.test("Form172 modern deduction allocation sorts mixed vintages and preserves exhausted rows", () => {
  const v = modernOrdinaryCap();
  v.losses = [
    modernOlderLoss(2020, 40000),
    modernOlderLoss(2017, 50000),
    modernOlderLoss(2016, 0),
    modernOlderLoss(2019, 60000),
  ];
  const r = calculateForm172AmtModernOrdinaryDeductionAllocation(v);
  assertEquals(
    r.allocations.map(
      (l) => [
        l.originYear,
        l.actualDeduction,
        l.earlierActualDeduction,
        l.openingNotDeducted,
      ],
    ),
    [[2016, 0, 0, 0], [2017, 50000, 0, 0], [2019, 40000, 50000, 20000], [
      2020,
      0,
      90000,
      40000,
    ]],
  );
  assertEquals(r.totalActualDeduction, 90000);
  assertEquals(r.ordinaryDeductionCap, r.totalActualDeduction);
  assertEquals(r.amtCarryAbsorptionReconciled, false);
  assertEquals(r.earlierVintageOrderingReconciled, false);
  assertEquals(r.openingCarryAvailabilityVerified, false);
  assertEquals(r.filingReady, false);
  assertEquals(
    calculateForm172AmtModernOrdinaryDeductionAllocation({
      ...v,
      losses: [...v.losses].reverse(),
    }).allocations,
    r.allocations,
  );
});
Deno.test("Form172 modern allocation respects shared 80% after2020 and suspended cap before2021", () => {
  const v = modernOrdinaryCap();
  v.annual_review.components[0].amount = 40000; //AMTI90k
  v.losses = [modernOlderLoss(2020, 50000), modernOlderLoss(2019, 30000)];
  const r = calculateForm172AmtModernOrdinaryDeductionAllocation(v);
  assertEquals(r.allocations.map((l) => l.actualDeduction), [30000, 42000]);
  assertEquals(r.totalActualDeduction, 72000);
  v.annual_review.tax_year = 2020;
  v.deductions_review.tax_year = 2020;
  v.losses = [modernOlderLoss(2019, 50000), modernOlderLoss(2018, 30000)];
  const suspended = calculateForm172AmtModernOrdinaryDeductionAllocation(v);
  assertEquals(suspended.allocations.map((l) => l.actualDeduction), [
    30000,
    50000,
  ]);
  assertEquals(suspended.totalActualDeduction, 80000);
});
Deno.test("Form172 modern allocation handles TY2025 zero income and oldest balance exceeding cap", () => {
  const v = modernOrdinaryCap();
  const a = annual2025();
  const raw = {
    ...v,
    annual_review: a,
    deductions_review: { ...v.deductions_review, tax_year: 2025 },
    losses: [modernOlderLoss(2019, 80000), modernOlderLoss(2005, 80000)],
  };
  const r = calculateForm172AmtModernOrdinaryDeductionAllocation(raw);
  assertEquals(
    r.allocations.map(
      (l) => [l.originYear, l.actualDeduction, l.openingNotDeducted],
    ),
    [[2005, 45000, 35000], [2019, 0, 80000]],
  );
  a.reviewed_form1040.line11b_agi = 0;
  a.components[0].amount = -17750;
  const zero = calculateForm172AmtModernOrdinaryDeductionAllocation(raw);
  assertEquals(zero.totalActualDeduction, 0);
  assertEquals(zero.allocations.map((l) => l.openingNotDeducted), [
    80000,
    80000,
  ]);
  assertThrows(() =>
    calculateForm172AmtModernOrdinaryDeductionAllocation({
      ...raw,
      allocations: r.allocations,
    })
  );
});
function modernModified(cap = modernOrdinaryCap()) {
  return {
    reference: "modern-modified",
    annual_reference: cap.annual_review.reference,
    tax_year: cap.annual_review.tax_year,
    taxpayer_ssn: cap.annual_review.taxpayer_ssn,
    filing_status: "single",
    before_all_atnold: true,
    components: cap.annual_review.components.map((c) => ({
      line: c.line,
      original_reference: c.reference,
      original_amount: c.amount,
      refigured_reference: `modified-${c.line}`,
      refigured_amount: c.amount,
    })),
    deductions: {
      original_reference: cap.deductions_review.reference,
      original_section199a:
        cap.deductions_review.section199a_deduction_in_tentative_amti,
      original_section250:
        cap.deductions_review.section250_deduction_in_tentative_amti,
      refigured_reference: "modified-deductions",
      refigured_section199a: 0,
      refigured_section250: 0,
    },
    amt_capital_items: [{
      item_id: "capital-loss",
      reference: "amt-capital-loss",
      owner_ssn: "111223333",
      kind: "loss",
      amount: 10000,
    }],
    amt_capital_loss_deduction: {
      reference: "amt-capital-deduction",
      amount: 3000,
    },
    section1202_items: [{
      item_id: "qsbs",
      reference: "qsbs-review",
      owner_ssn: "111223333",
      excluded_gain: 10000,
      amt_preference: 700,
    }],
  };
}
Deno.test("Modern modified AMTI adds independent capital QBI250 and remaining QSBS exclusion", () => {
  const c = modernOrdinaryCap();
  c.annual_review.components.find((l) => l.line === "2h")!.amount = 700;
  c.deductions_review.section199a_deduction_in_tentative_amti = 10000;
  const v = modernModified(c);
  v.components[0].refigured_amount = 40000;
  v.deductions.refigured_section199a = 12000;
  v.deductions.refigured_section250 = 5000;
  const r = calculateForm172ModernAmtModifiedIncome(c, v);
  assertEquals(r.refiguredTentativeAmti, 90700);
  assertEquals(r.capitalLossAddback, 3000);
  assertEquals(r.section1202Addback, 9300);
  assertEquals(r.signedModifiedAmtiBeforeEarlierNol, 120000);
  assertEquals(r.originalDeductionCap, 80000);
  assertEquals(r.section172Post2020AbsorptionAdjustmentReconciled, false);
  assertEquals(r.amtCarryAbsorptionReconciled, false);
  assertEquals(r.filingReady, false);
});
Deno.test("Modern modified AMTI reconciles TY2025 refigured1040 operands independently", () => {
  const c = modernOrdinaryCap();
  const a = annual2025();
  a.components.find((l) => l.line === "2h")!.amount = 700;
  const raw = {
    ...c,
    annual_review: a,
    deductions_review: { ...c.deductions_review, tax_year: 2025 },
  };
  const v = modernModified();
  const review = {
    ...v,
    tax_year: 2025,
    components: a.components.map((l) => ({
      line: l.line,
      original_reference: l.reference,
      original_amount: l.amount,
      refigured_reference: `modified-${l.line}`,
      refigured_amount: l.line === "1b" ? 42250 : l.amount,
    })),
    refigured_form1040: {
      ...a.reviewed_form1040,
      reference: "refigured1040",
      line11b_agi: 60000,
    },
  };
  const r = calculateForm172ModernAmtModifiedIncome(raw, review);
  assertEquals(r.refiguredTentativeAmti, 60700);
  assertEquals(r.signedModifiedAmtiBeforeEarlierNol, 73000);
  for (
    const patch of [{ line11b_agi: 60001 }, { taxpayer_ssn: "999887777" }, {
      reference: a.reviewed_form1040.reference,
    }, { schedule1a_line37_senior_deduction: 23751 }]
  ) {
    assertThrows(() =>
      calculateForm172ModernAmtModifiedIncome(raw, {
        ...review,
        refigured_form1040: { ...review.refigured_form1040, ...patch },
      })
    );
  }
  const { refigured_form1040: _, ...missing } = review;
  assertThrows(() => calculateForm172ModernAmtModifiedIncome(raw, missing));
});
Deno.test("Modern modified AMTI rejects stale originals signs missing lines and refigured NOL", () => {
  const c = modernOrdinaryCap();
  c.annual_review.components.find((l) => l.line === "2h")!.amount = 700;
  for (
    const mutate of [
      (v: ReturnType<typeof modernModified>) => {
        v.components.pop();
      },
      (v: ReturnType<typeof modernModified>) => {
        v.components[0].original_amount++;
      },
      (v: ReturnType<typeof modernModified>) => {
        v.components[0].original_reference = "wrong";
      },
      (v: ReturnType<typeof modernModified>) => {
        v.components[0].refigured_reference = v.reference;
      },
      (v: ReturnType<typeof modernModified>) => {
        v.components.find((l) => l.line === "2e")!.refigured_amount++;
      },
      (v: ReturnType<typeof modernModified>) => {
        v.components.find((l) => l.line === "2b")!.refigured_amount = 1;
      },
      (v: ReturnType<typeof modernModified>) => {
        v.deductions.original_section199a = 1;
      },
      (v: ReturnType<typeof modernModified>) => {
        v.deductions.original_reference = "wrong";
      },
      (v: ReturnType<typeof modernModified>) => {
        v.amt_capital_loss_deduction.amount = 2999;
      },
      (v: ReturnType<typeof modernModified>) => {
        v.amt_capital_items[0].owner_ssn = "999887777";
      },
      (v: ReturnType<typeof modernModified>) => {
        v.section1202_items[0].item_id = v.amt_capital_items[0].item_id;
      },
      (v: ReturnType<typeof modernModified>) => {
        v.section1202_items[0].amt_preference = 10001;
      },
      (v: ReturnType<typeof modernModified>) => {
        v.components.find((l) => l.line === "2h")!.refigured_amount = 701;
      },
      (v: ReturnType<typeof modernModified>) => {
        v.tax_year = 2023;
      },
    ]
  ) {
    const v = modernModified(c);
    mutate(v);
    assertThrows(() => calculateForm172ModernAmtModifiedIncome(c, v));
  }
  const v = modernModified(c);
  assertThrows(() =>
    calculateForm172ModernAmtModifiedIncome(c, {
      ...v,
      signedModifiedAmtiBeforeEarlierNol: 100000,
    })
  );
  assertThrows(() =>
    calculateForm172ModernAmtModifiedIncome(c, {
      ...v,
      components: [...v.components, {
        line: "2f",
        original_reference: "atnold",
        original_amount: -1,
        refigured_reference: "other",
        refigured_amount: -1,
      }],
    })
  );
});
Deno.test("Modern modified AMTI preserves MFS capital limit and signed negative base", () => {
  const c = modernOrdinaryCap();
  c.annual_review.components.find((l) => l.line === "2h")!.amount = 700;
  const v = modernModified(c);
  v.filing_status = "married_filing_separately";
  v.amt_capital_loss_deduction.amount = 1500;
  v.components.forEach((l) =>
    l.refigured_amount = l.line === "1" ? -100000 : l.original_amount
  );
  const r = calculateForm172ModernAmtModifiedIncome(c, v);
  assertEquals(r.capitalLossAddback, 1500);
  assertEquals(r.signedModifiedAmtiBeforeEarlierNol, -38500);
  assertEquals(r.nonnegativeModifiedAmtiBeforeEarlierNol, 0);
});
function modernVintage() {
  const cap = modernOrdinaryCap();
  cap.annual_review.components.find((c) => c.line === "2h")!.amount = 700;
  cap.losses = [
    modernOlderLoss(2020, 40000),
    modernOlderLoss(2017, 50000),
    modernOlderLoss(2016, 0),
    modernOlderLoss(2019, 60000),
  ];
  const allocation = calculateForm172AmtModernOrdinaryDeductionAllocation(cap);
  const reviews = {
    reference: "modern-vintage-header",
    application_tax_year: 2024,
    taxpayer_ssn: "111223333",
    vintages: allocation.allocations.map((loss, i) => {
      const m = modernModified(cap);
      m.reference = `context-${loss.originYear}`;
      m.components.forEach((c) => {
        c.refigured_reference = `context-${loss.originYear}-${c.line}`;
        if (c.line === "1") c.refigured_amount += i * 1000;
      });
      m.deductions.refigured_reference =
        `context-${loss.originYear}-deductions`;
      return {
        origin_year: loss.originYear,
        loss_reference: loss.reference,
        refigured_deductions_include_earlier_nol_effects: true,
        earlier_nol_deductions: allocation.allocations.slice(0, i).map((l) => ({
          origin_year: l.originYear,
          loss_reference: l.reference,
          amount: l.actualDeduction,
        })),
        modified_review: m,
      };
    }).reverse(),
  };
  return { cap, reviews };
}
Deno.test("Modern AMT vintage contexts reconcile earlier actual deductions and independent refigures", () => {
  const { cap, reviews } = modernVintage();
  const r = calculateForm172ModernAmtVintageModifiedIncome(cap, reviews);
  assertEquals(
    r.chronologicalVintageModifiedIncome.map(
      (l) => [
        l.originYear,
        l.earlierActualDeduction,
        l.signedModifiedAmtiBeforeEarlierAtnold,
        l.modifiedAmtiAfterEarlierAtnold,
      ],
    ),
    [[2016, 0, 113000, 113000], [2017, 0, 114000, 114000], [
      2019,
      50000,
      115000,
      65000,
    ], [2020, 90560, 116000, 25440]],
  );
  assertEquals(r.chronologicalAbsorptionReconciled, false);
  assertEquals(r.section172Post2020AbsorptionAdjustmentReconciled, false);
  assertEquals(r.filingReady, false);
  assertEquals(
    calculateForm172ModernAmtVintageModifiedIncome(cap, {
      ...reviews,
      vintages: [...reviews.vintages].reverse(),
    }),
    r,
  );
});
Deno.test("Modern AMT vintage contexts reject missing zero rows stale amounts and cross-context aliases", () => {
  const { cap, reviews } = modernVintage();
  for (
    const mutate of [
      (v: typeof reviews) => {
        v.vintages.pop();
      },
      (v: typeof reviews) => {
        v.vintages[0].earlier_nol_deductions.pop();
      },
      (v: typeof reviews) => {
        v.vintages[0].earlier_nol_deductions[0].amount = 1;
      },
      (v: typeof reviews) => {
        v.vintages[0].earlier_nol_deductions[1].amount = 50001;
      },
      (v: typeof reviews) => {
        v.vintages[0].earlier_nol_deductions[0].loss_reference = "wrong";
      },
      (v: typeof reviews) => {
        v.vintages[0].modified_review.components[0].refigured_reference =
          v.vintages[1].modified_review.components[0].refigured_reference;
      },
      (v: typeof reviews) => {
        v.vintages[0].modified_review.reference =
          v.vintages[1].modified_review.reference;
      },
      (v: typeof reviews) => {
        v.vintages[0].loss_reference = "wrong";
      },
      (v: typeof reviews) => {
        v.reference = cap.reference;
      },
      (v: typeof reviews) => {
        v.taxpayer_ssn = "999887777";
      },
      (v: typeof reviews) => {
        v.application_tax_year = 2023;
      },
    ]
  ) {
    const v = structuredClone(reviews);
    mutate(v);
    assertThrows(() => calculateForm172ModernAmtVintageModifiedIncome(cap, v));
  }
  assertThrows(() =>
    calculateForm172ModernAmtVintageModifiedIncome(cap, {
      ...reviews,
      vintages: [...reviews.vintages, reviews.vintages[0]],
    })
  );
  assertThrows(() =>
    calculateForm172ModernAmtVintageModifiedIncome(cap, {
      ...reviews,
      vintages: reviews.vintages.map((v) => ({
        ...v,
        refigured_deductions_include_earlier_nol_effects: false,
      })),
    })
  );
});
Deno.test("Modern AMT vintage contexts preserve negative result before zero floor", () => {
  const { cap, reviews } = modernVintage();
  reviews.vintages[0].modified_review.components.find((c) => c.line === "1")!
    .refigured_amount = -100000;
  const r = calculateForm172ModernAmtVintageModifiedIncome(cap, reviews);
  const last = r.chronologicalVintageModifiedIncome.at(-1)!;
  assertEquals(last.signedModifiedAmtiBeforeEarlierAtnold, -37000);
  assertEquals(last.signedModifiedAmtiAfterEarlierAtnold, -127560);
  assertEquals(last.modifiedAmtiAfterEarlierAtnold, 0);
});
Deno.test("Modern AMT TY2025 vintage contexts bind separate1040 refigures and earlier deductions", () => {
  const c = modernOrdinaryCap();
  const a = annual2025();
  a.components.find((l) => l.line === "2h")!.amount = 700;
  const cap = {
    ...c,
    annual_review: a,
    deductions_review: { ...c.deductions_review, tax_year: 2025 },
    losses: [modernOlderLoss(2019, 80000), modernOlderLoss(2017, 50000)],
  };
  const allocation = calculateForm172AmtModernOrdinaryDeductionAllocation(cap);
  const reviews = {
    reference: "2025-vintage-header",
    application_tax_year: 2025,
    taxpayer_ssn: "111223333",
    vintages: allocation.allocations.map((loss, i) => ({
      origin_year: loss.originYear,
      loss_reference: loss.reference,
      refigured_deductions_include_earlier_nol_effects: true,
      earlier_nol_deductions: allocation.allocations.slice(0, i).map((l) => ({
        origin_year: l.originYear,
        loss_reference: l.reference,
        amount: l.actualDeduction,
      })),
      modified_review: {
        ...modernModified(c),
        reference: `2025-context-${loss.originYear}`,
        tax_year: 2025,
        components: a.components.map((l) => ({
          line: l.line,
          original_reference: l.reference,
          original_amount: l.amount,
          refigured_reference: `2025-context-${loss.originYear}-${l.line}`,
          refigured_amount: l.line === "1b" ? 42250 + i * 10000 : l.amount,
        })),
        deductions: {
          ...modernModified(c).deductions,
          refigured_reference: `2025-deductions-${loss.originYear}`,
        },
        refigured_form1040: {
          ...a.reviewed_form1040,
          reference: `refigured1040-${loss.originYear}`,
          line11b_agi: 60000 + i * 10000,
        },
      },
    })),
  };
  const r = calculateForm172ModernAmtVintageModifiedIncome(cap, reviews);
  assertEquals(
    r.chronologicalVintageModifiedIncome.map(
      (l) => [
        l.originYear,
        l.earlierActualDeduction,
        l.signedModifiedAmtiBeforeEarlierAtnold,
        l.modifiedAmtiAfterEarlierAtnold,
      ],
    ),
    [[2017, 0, 73000, 73000], [2019, 45630, 83000, 37370]],
  );
  reviews.vintages[1].modified_review.refigured_form1040.reference =
    reviews.vintages[0].modified_review.refigured_form1040.reference;
  assertThrows(() =>
    calculateForm172ModernAmtVintageModifiedIncome(cap, reviews)
  );
});
Deno.test("Modern AMT section172 capacity subtracts annual excess reduction from each context", () => {
  const { cap, reviews } = modernVintage();
  const r = calculateForm172ModernAmtSection172Capacity(cap, reviews);
  assertEquals(r.annualPost2017IncomeExcess, 50700);
  assertEquals(r.annualAbsorptionReduction, 10140);
  assertEquals(
    r.chronologicalReviewedCapacities.map(
      (l) => [l.originYear, l.section172Capacity],
    ),
    [[2016, 102860], [2017, 103860], [2019, 54860], [2020, 15300]],
  );
  assertEquals(r.section56AbsorptionLimitReconciled, false);
  assertEquals(r.chronologicalAbsorptionReconciled, false);
  assertEquals(r.survivingCarryVerified, false);
  assertEquals(r.filingReady, false);
  assertEquals("absorbed" in r.chronologicalReviewedCapacities[0], false);
  assertEquals(
    "reviewedRemaining" in r.chronologicalReviewedCapacities[0],
    false,
  );
});
Deno.test("Modern AMT section172 reduction uses original QBI250 annual base rather than modified income", () => {
  const { cap, reviews } = modernVintage();
  cap.deductions_review.section199a_deduction_in_tentative_amti = 10000;
  cap.deductions_review.section250_deduction_in_tentative_amti = 5000;
  for (const v of reviews.vintages) {
    v.modified_review.deductions.original_section199a = 10000;
    v.modified_review.deductions.original_section250 = 5000;
  }
  const alloc = calculateForm172AmtModernOrdinaryDeductionAllocation(cap);
  for (const v of reviews.vintages) {
    for (const d of v.earlier_nol_deductions) {
      d.amount = alloc.allocations.find((l) =>
        l.originYear === d.origin_year
      )!.actualDeduction;
    }
  }
  const r = calculateForm172ModernAmtSection172Capacity(cap, reviews);
  assertEquals(r.annualSection172IncomeBase, 115700);
  assertEquals(r.annualAbsorptionReduction, 13140);
  assertEquals(r.chronologicalReviewedCapacities[0].section172Capacity, 99860);
  assertEquals(
    r.chronologicalReviewedCapacities.at(-1)!.section172Capacity,
    12230,
  );
});
Deno.test("Modern AMT section172 capacity suspends reduction before2021 and floors signed negatives", () => {
  const cap = modernOrdinaryCap();
  cap.annual_review.tax_year = 2020;
  cap.deductions_review.tax_year = 2020;
  cap.annual_review.components.find((l) => l.line === "2h")!.amount = 700;
  const m = modernModified(cap);
  const reviews = {
    reference: "capacity-2020",
    application_tax_year: 2020,
    taxpayer_ssn: "111223333",
    vintages: [{
      origin_year: 2019,
      loss_reference: cap.losses[0].reference,
      refigured_deductions_include_earlier_nol_effects: true,
      earlier_nol_deductions: [],
      modified_review: m,
    }],
  };
  assertEquals(
    calculateForm172ModernAmtSection172Capacity(cap, reviews)
      .annualAbsorptionReduction,
    0,
  );
  cap.annual_review.tax_year = 2021;
  cap.deductions_review.tax_year = 2021;
  m.tax_year = 2021;
  reviews.application_tax_year = 2021;
  m.components.find((l) => l.line === "1")!.refigured_amount = -100000;
  const r = calculateForm172ModernAmtSection172Capacity(cap, reviews);
  assertEquals(r.annualAbsorptionReduction, 20140);
  assertEquals(
    r.chronologicalReviewedCapacities[0].signedSection172Capacity,
    -57140,
  );
  assertEquals(r.chronologicalReviewedCapacities[0].section172Capacity, 0);
});
async function modernRetained(raw: unknown) {
  const text = JSON.stringify(raw);
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = Array.from(new Uint8Array(digest)).map((b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
  const cap = raw as ReturnType<typeof modernOrdinaryCap>;
  return {
    binding: {
      workpaper: { reference: cap.reference, sha256 },
      application_tax_year: cap.annual_review.tax_year,
      taxpayer_ssn: cap.annual_review.taxpayer_ssn,
    },
    documents: [{ reference: cap.reference, bytes }],
  };
}
Deno.test("Modern AMT retained bytes recompute cap allocation modified contexts and statutory capacities", async () => {
  const c = modernOrdinaryCap();
  const basic = await modernRetained(c);
  const cap = await stageForm172ModernAmtCapSource(
    basic.binding,
    basic.documents,
  );
  assertEquals(cap.ordinaryDeductionCap, 80000);
  assertEquals(cap.reviewPackageBytesVerified, true);
  assertEquals(cap.packetAdmissionVerified, false);
  assertEquals(cap.acceptedCarryImportVerified, false);
  assertEquals(cap.sourceAuthenticityVerified, false);
  assertEquals(cap.filingReady, false);
  const allocation = await stageForm172ModernAmtDeductionAllocationSource(
    basic.binding,
    basic.documents,
  );
  assertEquals(allocation.allocations[0].actualDeduction, 80000);
  c.annual_review.components.find((l) => l.line === "2h")!.amount = 700;
  const paired = await modernRetained({
    ...c,
    modified_review: modernModified(c),
  });
  const modified = await stageForm172ModernAmtModifiedIncomeSource(
    paired.binding,
    paired.documents,
  );
  assertEquals(modified.signedModifiedAmtiBeforeEarlierNol, 113000);
  const { cap: v, reviews } = modernVintage();
  const multi = await modernRetained({ ...v, vintage_reviews: reviews });
  const contexts = await stageForm172ModernAmtVintageModifiedIncomeSource(
    multi.binding,
    multi.documents,
  );
  assertEquals(
    contexts.chronologicalVintageModifiedIncome.at(-1)!
      .modifiedAmtiAfterEarlierAtnold,
    25440,
  );
  const capacities = await stageForm172ModernAmtSection172CapacitySource(
    multi.binding,
    multi.documents,
  );
  assertEquals(capacities.annualAbsorptionReduction, 10140);
  assertEquals(
    capacities.chronologicalReviewedCapacities.at(-1)!.section172Capacity,
    15300,
  );
  assertEquals(capacities.section56AbsorptionLimitReconciled, false);
});
Deno.test("Modern AMT retained source rejects digest identity owner year and document inventory conflicts", async () => {
  const p = await modernRetained(modernOrdinaryCap());
  const damaged = p.documents[0].bytes.slice();
  damaged[20] ^= 1;
  await assertRejects(() =>
    stageForm172ModernAmtCapSource(p.binding, [{
      ...p.documents[0],
      bytes: damaged,
    }])
  );
  for (
    const patch of [
      { taxpayer_ssn: "999887777" },
      { spouse_ssn: "999887777" },
      { application_tax_year: 2023 },
      { application_tax_year: 2017 },
    ]
  ) {
    await assertRejects(() =>
      stageForm172ModernAmtCapSource({ ...p.binding, ...patch }, p.documents)
    );
  }
  for (
    const docs of [[], [...p.documents, p.documents[0]], [...p.documents, {
      reference: "extra",
      bytes: new Uint8Array([1]),
    }], [{ ...p.documents[0], reference: "other" }]]
  ) {
    await assertRejects(() => stageForm172ModernAmtCapSource(p.binding, docs));
  }
});
Deno.test("Modern AMT retained source rehash cannot hide changed original operands or earlier deductions", async () => {
  const { cap, reviews } = modernVintage();
  reviews.vintages[0].earlier_nol_deductions[0].amount = 1;
  const p = await modernRetained({ ...cap, vintage_reviews: reviews });
  await assertRejects(() =>
    stageForm172ModernAmtSection172CapacitySource(p.binding, p.documents)
  );
  const c = modernOrdinaryCap();
  c.annual_review.components.find((l) => l.line === "2h")!.amount = 700;
  const m = modernModified(c);
  m.components[0].original_amount++;
  const stale = await modernRetained({ ...c, modified_review: m });
  await assertRejects(() =>
    stageForm172ModernAmtModifiedIncomeSource(stale.binding, stale.documents)
  );
  c.losses[0].opening_amt_nol = 80001;
  const opening = await modernRetained(c);
  await assertRejects(() =>
    stageForm172ModernAmtDeductionAllocationSource(
      opening.binding,
      opening.documents,
    )
  );
});
Deno.test("Modern AMT retained source rejects noncanonical duplicate-key BOM and invalid UTF8", async () => {
  const p = await modernRetained(modernOrdinaryCap());
  const original = new TextDecoder().decode(p.documents[0].bytes);
  for (
    const bytes of [
      new TextEncoder().encode(" " + original),
      new TextEncoder().encode('{"reference":"wrong",' + original.slice(1)),
      new TextEncoder().encode("\ufeff" + original),
      new Uint8Array([0xff]),
    ]
  ) {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const sha256 = Array.from(new Uint8Array(digest)).map((b) =>
      b.toString(16).padStart(2, "0")
    ).join("");
    await assertRejects(() =>
      stageForm172ModernAmtCapSource({
        ...p.binding,
        workpaper: { ...p.binding.workpaper, sha256 },
      }, [{ ...p.documents[0], bytes }])
    );
  }
});
Deno.test("Modern AMT retained source owns caller binding and bytes before first await", async () => {
  const { cap, reviews } = modernVintage();
  const p = await modernRetained({ ...cap, vintage_reviews: reviews });
  const pending = stageForm172ModernAmtSection172CapacitySource(
    p.binding,
    p.documents,
  );
  p.binding.application_tax_year = 2023;
  p.binding.taxpayer_ssn = "999887777";
  p.binding.workpaper.reference = "changed";
  p.binding.workpaper.sha256 = "0".repeat(64);
  p.documents[0].bytes.fill(0);
  p.documents[0].reference = "changed";
  p.documents.length = 0;
  const r = await pending;
  assertEquals(r.applicationYear, 2024);
  assertEquals(r.taxpayerSsn, "111223333");
  assertEquals(r.annualAbsorptionReduction, 10140);
  assertEquals(r.reviewPackageBytesVerified, true);
  assertEquals(r.packetAdmissionVerified, false);
});

Deno.test("Modern AMT ordinary model keeps cumulative90 capacity separate from section172 and actual deductions", () => {
  const { cap, reviews } = modernVintage();
  const r = calculateForm172ModernAmtOrdinaryAbsorptionWorkpaper(cap, reviews);
  assertEquals(
    r.chronologicalModelApplications.map((l) => [
      l.originYear,
      l.earlierActualDeduction,
      l.earlierModelAbsorbed,
      l.section172Capacity,
      l.section56OrdinaryCeiling,
      l.remainingSection56Capacity,
      l.modelAbsorbed,
      l.modelRemaining,
    ]),
    [
      [2016, 0, 0, 102860, 101700, 101700, 0, 0],
      [2017, 0, 0, 103860, 102600, 102600, 50000, 0],
      [2019, 50000, 50000, 54860, 103500, 53500, 53500, 6500],
      [2020, 90560, 103500, 15300, 104400, 900, 900, 39100],
    ],
  );
  assertEquals(r.originalDeductionCap, 90560);
  assertEquals(r.totalModelAbsorbed, 104400);
  assertEquals(r.totalModelRemaining, 45600);
  assertEquals(r.ordinaryCoordinationModelArithmeticReconciled, true);
  assertEquals(r.legalSection172Section56CoordinationVerified, false);
  assertEquals(r.survivingAcceptedCarryVerified, false);
  assertEquals(r.filingReady, false);
  assertEquals(
    calculateForm172ModernAmtOrdinaryAbsorptionWorkpaper(cap, {
      ...reviews,
      vintages: [...reviews.vintages].reverse(),
    }),
    r,
  );
});
Deno.test("Modern AMT ordinary model section172 limit binds independently and negative contexts consume zero", () => {
  const { cap, reviews } = modernVintage();
  const third = reviews.vintages.find((v) => v.origin_year === 2019)!;
  third.modified_review.components.find((c) => c.line === "1")!
    .refigured_amount -= 30000;
  const last = reviews.vintages.find((v) => v.origin_year === 2020)!;
  last.modified_review.components.find((c) => c.line === "1")!
    .refigured_amount = -100000;
  const r = calculateForm172ModernAmtOrdinaryAbsorptionWorkpaper(cap, reviews);
  assertEquals(r.chronologicalModelApplications[2].section172Capacity, 24860);
  assertEquals(
    r.chronologicalModelApplications[2].remainingSection56Capacity,
    26500,
  );
  assertEquals(r.chronologicalModelApplications[2].modelAbsorbed, 24860);
  assertEquals(r.chronologicalModelApplications[3].section56ModifiedBase, 0);
  assertEquals(r.chronologicalModelApplications[3].modelAbsorbed, 0);
  assertEquals(r.chronologicalModelApplications[3].modelRemaining, 40000);
  assertEquals(r.totalModelAbsorbed, 74860);
});
Deno.test("Modern AMT ordinary model rejects stale prior actual deductions and original operand changes", () => {
  const { cap, reviews } = modernVintage();
  reviews.vintages[0].earlier_nol_deductions[1].amount += 1;
  assertThrows(() =>
    calculateForm172ModernAmtOrdinaryAbsorptionWorkpaper(cap, reviews)
  );
  const fresh = modernVintage();
  fresh.reviews.vintages[0].modified_review.components[0].original_amount += 1;
  assertThrows(() =>
    calculateForm172ModernAmtOrdinaryAbsorptionWorkpaper(
      fresh.cap,
      fresh.reviews,
    )
  );
});
Deno.test("Modern AMT ordinary coordination model binds retained bytes without admitting accepted carry", async () => {
  const { cap, reviews } = modernVintage();
  const packageData = { ...cap, vintage_reviews: reviews };
  const p = await modernRetained(packageData);
  const r = await stageForm172ModernAmtOrdinaryAbsorptionWorkpaperSource(
    p.binding,
    p.documents,
  );
  assertEquals(r.totalModelAbsorbed, 104400);
  assertEquals(r.reviewPackageBytesVerified, true);
  assertEquals(r.legalSection172Section56CoordinationVerified, false);
  assertEquals(r.sourceAuthenticityVerified, false);
  assertEquals(r.filingReady, false);
  p.documents[0].bytes[0] ^= 1;
  await assertRejects(() =>
    stageForm172ModernAmtOrdinaryAbsorptionWorkpaperSource(
      p.binding,
      p.documents,
    )
  );
});
