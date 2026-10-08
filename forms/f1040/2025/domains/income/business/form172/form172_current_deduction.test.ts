import { assertEquals, assertThrows } from "@std/assert";
import { calculateForm172CurrentDeduction } from "./form172_current_deduction.ts";
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

function current(kind = "regular", base = 20000) {
  return {
    reference: "current-deduction-review",
    history_kind: kind,
    annual_review: annual(2025, base),
  };
}
Deno.test("Form 172 current deduction derives opening from complete ordinary history", () => {
  const h = history([
    annual(2020),
    annual(2021, 50000),
    annual(2022, 20000),
    annual(2023),
    annual(2024),
  ], true);
  const r = calculateForm172CurrentDeduction(origin(), h, current());
  assertEquals(r.historyOpeningLoss, 44000);
  assertEquals(r.deduction, 16000);
  assertEquals(r.proposedSchedule1Line8a, -16000);
  assertEquals(r.closingLossBeforeExpiration, 28000);
  assertEquals(r.carryTo2026, 28000);
  assertEquals(r.publicForm1040JoinVerified, false);
  assertEquals(r.amtNolReconciled, false);
  assertEquals(r.filingReady, false);
});
Deno.test("Form 172 current mixed deduction uses nonfarm first after prior farm carrybacks", () => {
  const { o, v } = mixed();
  const h = history([
    annual(2021, 10000),
    annual(2022, 20000),
    annual(2024, 50000),
  ]);
  const r = calculateForm172CurrentDeduction(
    o,
    h,
    current("mixed_farming", 30000),
    v,
  );
  assertEquals(r.historyOpeningLoss, 36000);
  assertEquals(r.nonfarmingDeduction, 10000);
  assertEquals(r.farmingDeduction, 14000);
  assertEquals(r.deduction, 24000);
  assertEquals(r.carryTo2026, 12000);
});
Deno.test("Form 172 current deduction keeps capital absorption distinct from deductible use", () => {
  const h = history([
    annual(2020),
    annual(2021, 50000),
    annual(2022, 20000),
    annual(2023),
    annual(2024),
  ], true);
  const c = current();
  c.annual_review.capital_loss_deduction.amount = 3000;
  const r = calculateForm172CurrentDeduction(origin(), h, c);
  assertEquals(r.deduction, 16000);
  assertEquals(r.nonfarmingAbsorbed, 19000);
  assertEquals(r.carryTo2026, 25000);
});
Deno.test("Form 172 current oldest legacy loss expires after the twentieth forward year", () => {
  const o = legacy();
  o.tax_year = 2005;
  o.reviewed_form1040.tax_year = 2005;
  const h = history(
    Array.from({ length: 19 }, (_, i) => annual(2006 + i)),
    true,
  );
  const r = calculateForm172CurrentDeduction(o, h, current());
  assertEquals(r.historyOpeningLoss, 100000);
  assertEquals(r.deduction, 20000);
  assertEquals(r.closingLossBeforeExpiration, 80000);
  assertEquals(r.expiredLoss, 80000);
  assertEquals(r.carryTo2026, 0);
});
Deno.test("Form 172 current deduction keeps exhausted history explicit without a negative zero", () => {
  const h = history([
    annual(2020, 100000),
    annual(2021),
    annual(2022),
    annual(2023),
    annual(2024),
  ], true);
  const r = calculateForm172CurrentDeduction(origin(), h, current());
  assertEquals(r.deduction, 0);
  assertEquals(r.proposedSchedule1Line8a, 0);
  assertEquals(r.carryTo2026, 0);
});
Deno.test("Form 172 current deduction rejects year owner asserted balance and reused-source conflicts", () => {
  const h = history([
    annual(2020),
    annual(2021),
    annual(2022),
    annual(2023),
    annual(2024),
  ], true);
  const c = current();
  for (
    const patch of [
      { tax_year: 2024 },
      { taxpayer_ssn: "999887777" },
      { prior_absorption_records: [] },
      { reference: "annual-2024" },
      { return_reference: "application-return-2024" },
    ]
  ) {
    assertThrows(() =>
      calculateForm172CurrentDeduction(origin(), h, {
        ...c,
        annual_review: { ...c.annual_review, ...patch },
      })
    );
  }
  assertThrows(() =>
    calculateForm172CurrentDeduction(origin(), h, {
      ...c,
      opening_loss: 100000,
    })
  );
  assertThrows(() =>
    calculateForm172CurrentDeduction(origin(), h, c, review())
  );
  assertThrows(() =>
    calculateForm172CurrentDeduction(origin(), h, {
      ...c,
      history_kind: "mixed_farming",
    })
  );
});
