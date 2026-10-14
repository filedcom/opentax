import { assertEquals, assertThrows } from "@std/assert";
import { calculateForm172FarmingCarryHistory } from "./form172_farming_carry_history.ts";
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

function legacy() {
  const {
    noncapital_income,
    noncapital_deductions,
    capital_gains,
    capital_losses,
    prior_nol_deductions,
  } = origin();
  noncapital_deductions[1].amount = 6350;
  return {
    source_format: "reviewed_legacy_loss_year",
    reference: "legacy-origin",
    tax_year: 2017,
    taxpayer_ssn: "111223333",
    filing_status: "single",
    inventory: {
      noncapital_income,
      noncapital_deductions,
      capital_gains,
      capital_losses,
      prior_nol_deductions,
    },
    reviewed_form1040: {
      reference: "return-2017",
      tax_year: 2017,
      taxpayer_ssn: "111223333",
      filing_status: "single",
      agi: -103000,
      standard_or_itemized_deduction: 6350,
      personal_exemptions: 4050,
      reported_taxable_income: 0,
    },
    section199_deduction: { reference: "dpad-review", amount: 3000 },
    limitations_review: {
      reference: "historic-limit-review",
      at_risk_and_passive_limits_applied: true,
      itemized_phaseout_applied: true,
    },
  };
}

function review(year = 2019, origin_reference = "origin-2019") {
  return {
    reference: "farm-subset-review",
    origin_reference,
    tax_year: year,
    taxpayer_ssn: "111223333",
    farming_item_ids: ["receipts", "expenses"],
    nonfarming_business_item_ids: [] as string[],
    section263a_farming_classification_reviewed: true,
    loss_limitations_refigured_for_farming_subset: true,
  };
}

function mixed(year = 2023, farmExpense = 60000) {
  const o = origin();
  o.tax_year = year;
  o.reference = `origin-${year}`;
  o.reviewed_form1040.tax_year = year;
  o.reviewed_form1040.reference = `origin-return-${year}`;
  o.noncapital_deductions[0].amount = farmExpense;
  o.noncapital_deductions.push({
    item_id: "other-expenses",
    reference: "other-business",
    owner_ssn: "111223333",
    amount: 110000 - farmExpense,
    business: true,
    location: "agi",
  });
  const v = {
    ...review(year, o.reference),
    nonfarming_business_item_ids: ["other-expenses"],
  };
  return { o, v };
}
function annual(year: number, base = 0) {
  return {
    reference: `annual-${year}`,
    tax_year: year,
    taxpayer_ssn: "111223333",
    filing_status: "single",
    return_reference: `application-return-${year}`,
    before_current_and_later_nol: true,
    agi: base,
    deduction_method: "itemized",
    standard_or_itemized_deduction: 0,
    qbi_deduction: 0,
    section250_deduction: 0,
    section199_deduction: year < 2018
      ? { reference: `dpad-${year}`, amount: 0 }
      : undefined,
    personal_exemptions: 0,
    reported_taxable_income: base,
    return_nol_deduction: { reference: `nol-${year}`, amount: 0 },
    earlier_nols: [],
    capital_loss_deduction: { reference: `capital-${year}`, amount: 0 },
    section1202_exclusion: { reference: `qsbs-${year}`, amount: 0 },
    agi_refigures: [],
    refigured_itemized_deduction: { reference: `itemized-${year}`, amount: 0 },
  };
}
function history(rows: ReturnType<typeof annual>[], waiver = false) {
  return {
    reference: "mixed-history",
    opening_tax_year: 2025,
    carry_policy: waiver
      ? {
        kind: "reviewed_waiver",
        reference: "waiver",
        waiver_timeliness_reviewed: true,
      }
      : {
        kind: "reviewed_mixed_carryback",
        reference: "carryback",
        farming_carryback_eligibility_reviewed: true,
        section965_years_absent_reviewed: true,
        legacy_general_nonfarm_two_year_rule_reviewed: true,
      },
    annual_reviews: rows,
  };
}
Deno.test("Form 172 mixed history applies farm carryback then nonfarm-first forward capacity", () => {
  const { o, v } = mixed();
  const r = calculateForm172FarmingCarryHistory(
    o,
    v,
    history([annual(2021, 10000), annual(2022, 20000), annual(2024, 50000)]),
  );
  assertEquals(r.farmingApplicationYears, [2021, 2022, 2024]);
  assertEquals(r.nonfarmingApplicationYears, [2024]);
  assertEquals(r.nonfarmingOpeningLoss, 10000);
  assertEquals(r.farmingOpeningLoss, 26000);
  assertEquals(r.openingLoss, 36000);
  assertEquals(
    r.annualResults.map((a) => [a.nonfarmAbsorbed, a.farmAbsorbed]),
    [[0, 8000], [0, 16000], [40000, 0]],
  );
  assertEquals(r.portionCarryHistoryArithmeticReconciled, true);
  assertEquals(r.portionCarryHistoriesReconciled, false);
  assertEquals(r.filingReady, false);
});
Deno.test("Form 172 mixed waived history shares capacity without carrying nonfarm back", () => {
  const { o, v } = mixed();
  const r = calculateForm172FarmingCarryHistory(
    o,
    v,
    history([annual(2024, 100000)], true),
  );
  assertEquals(r.expectedYears, [2024]);
  assertEquals(r.annualResults[0].nonfarmDeduction, 50000);
  assertEquals(r.annualResults[0].farmDeduction, 30000);
  assertEquals(r.openingLoss, 20000);
});
Deno.test("Form 172 mixed deduction and absorption allocations preserve capital addbacks", () => {
  const { o, v } = mixed(2023, 100000);
  const a = annual(2024, 50000);
  a.capital_loss_deduction.amount = 3000;
  const r = calculateForm172FarmingCarryHistory(o, v, history([a], true));
  const y = r.annualResults[0];
  assertEquals(y.nonfarmDeduction, 10000);
  assertEquals(y.nonfarmAbsorbed, 10000);
  assertEquals(y.farmDeduction, 30000);
  assertEquals(y.farmAbsorbed, 33000);
  assertEquals(r.openingLoss, 57000);
});
Deno.test("Form 172 mixed 2018–2020 history uses five carryback years for both portions", () => {
  const { o, v } = mixed(2019);
  const years = [2014, 2015, 2016, 2017, 2018, 2020, 2021, 2022, 2023, 2024];
  const r = calculateForm172FarmingCarryHistory(
    o,
    v,
    history(
      years.map((y) => annual(y, y === 2014 ? 20000 : y === 2015 ? 30000 : 0)),
    ),
  );
  assertEquals(r.farmingApplicationYears, years);
  assertEquals(r.nonfarmingApplicationYears, years);
  assertEquals(r.nonfarmingOpeningLoss, 0);
  assertEquals(r.farmingOpeningLoss, 50000);
});
Deno.test("Form 172 historic mixed history uses five farm years and two general nonfarm years", () => {
  const o = legacy();
  o.inventory.noncapital_deductions[0].amount = 60000;
  o.inventory.noncapital_deductions.push({
    item_id: "other-expenses",
    reference: "other-business",
    owner_ssn: "111223333",
    amount: 50000,
    business: true,
    location: "agi",
  });
  const v = {
    ...review(2017, o.reference),
    nonfarming_business_item_ids: ["other-expenses"],
  };
  const years = [
    2012,
    2013,
    2014,
    2015,
    2016,
    2018,
    2019,
    2020,
    2021,
    2022,
    2023,
    2024,
  ];
  const r = calculateForm172FarmingCarryHistory(
    o,
    v,
    history(years.map((y) =>
      annual(
        y,
        y === 2012 ? 10000 : y === 2015 ? 20000 : y === 2016 ? 40000 : 0,
      )
    )),
  );
  assertEquals(r.nonfarmingApplicationYears.slice(0, 2), [2015, 2016]);
  assertEquals(r.farmingApplicationYears.slice(0, 5), [
    2012,
    2013,
    2014,
    2015,
    2016,
  ]);
  assertEquals(r.openingLoss, 30000);
  assertEquals(r.expiresAfterTaxYear, 2037);
});
Deno.test("Form 172 mixed history requires all annual sources even after full exhaustion", () => {
  const { o, v } = mixed();
  const h = history([annual(2021, 100000), annual(2022), annual(2024, 100000)]);
  const r = calculateForm172FarmingCarryHistory(o, v, h);
  assertEquals(r.openingLoss, 0);
  for (
    const rows of [
      h.annual_reviews.slice(0, 1),
      [...h.annual_reviews].reverse(),
      [h.annual_reviews[0], h.annual_reviews[0], h.annual_reviews[2]],
    ]
  ) {
    assertThrows(() =>
      calculateForm172FarmingCarryHistory(o, v, { ...h, annual_reviews: rows })
    );
  }
});
Deno.test("Form 172 mixed history rejects caller prior-use balances and conflicting owners", () => {
  const { o, v } = mixed();
  const h = history([annual(2024, 100000)], true);
  for (
    const patch of [{ prior_absorption_records: [] }, {
      taxpayer_ssn: "999887777",
    }, { nonfarm_absorbed: 1 }]
  ) {
    assertThrows(() =>
      calculateForm172FarmingCarryHistory(o, v, {
        ...h,
        annual_reviews: [{ ...h.annual_reviews[0], ...patch }],
      })
    );
  }
  assertThrows(() =>
    calculateForm172FarmingCarryHistory(o, v, { ...h, opening_loss: 1 })
  );
});
