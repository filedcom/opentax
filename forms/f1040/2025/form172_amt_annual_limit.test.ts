import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateForm172AmtAnnualLimit,
  calculateForm172AmtModernOrdinaryCap,
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
