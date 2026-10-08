import { assertEquals, assertThrows } from "@std/assert";
import { calculateForm172CarryAbsorption } from "./form172_carry_absorption.ts";

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
function annual() {
  return {
    reference: "absorption-2024",
    tax_year: 2024,
    taxpayer_ssn: "111223333",
    filing_status: "single",
    return_reference: "return-2024",
    before_current_and_later_nol: true,
    agi: 114600,
    deduction_method: "standard",
    standard_or_itemized_deduction: 14600,
    qbi_deduction: 10000,
    section250_deduction: 0,
    section199_deduction: undefined as
      | { reference: string; amount: number }
      | undefined,
    personal_exemptions: 0,
    reported_taxable_income: 90000,
    return_nol_deduction: { reference: "return-NOL-review", amount: 0 },
    earlier_nols: [] as {
      item_id: string;
      reference: string;
      origin_year: number;
      carry_available: number;
      deduction_on_return: number;
    }[],
    capital_loss_deduction: { reference: "capital-review", amount: 0 },
    section1202_exclusion: { reference: "qsbs-review", amount: 0 },
    agi_refigures: [] as {
      item_id: string;
      reference: string;
      kind: string;
      before: number;
      after: number;
    }[],
    prior_absorption_records: [] as {
      item_id: string;
      reference: string;
      tax_year: number;
      absorbed: number;
    }[],
  };
}
Deno.test("Form 172 absorption recomputes origin and excludes QBI from annual 80 percent capacity", () => {
  const r = calculateForm172CarryAbsorption(origin(), annual());
  assertEquals(r.openingLoss, 100000);
  assertEquals(r.taxableWithoutNolQbi250, 100000);
  assertEquals(r.currentDeduction, 80000);
  assertEquals(r.modifiedTaxableIncome, 100000);
  assertEquals(r.absorptionReduction, 20000);
  assertEquals(r.absorbed, 80000);
  assertEquals(r.remainingLoss, 20000);
  assertEquals(r.completeCarryHistoryVerified, false);
  assertEquals(r.filingReady, false);
});
Deno.test("Form 172 absorption subtracts pre-2018 availability before the post-2017 limitation", () => {
  const v = annual();
  v.earlier_nols.push({
    item_id: "old",
    reference: "2017-nol",
    origin_year: 2017,
    carry_available: 20000,
    deduction_on_return: 20000,
  });
  v.agi -= 20000;
  v.reported_taxable_income -= 20000;
  v.return_nol_deduction.amount = 20000;
  const r = calculateForm172CarryAbsorption(origin(), v);
  assertEquals(r.taxableWithoutNolQbi250, 100000);
  assertEquals(r.pre2018Available, 20000);
  assertEquals(r.post2017Limit, 64000);
  assertEquals(r.modifiedTaxableIncome, 80000);
  assertEquals(r.absorptionReduction, 16000);
  assertEquals(r.absorbed, 64000);
  assertEquals(r.remainingLoss, 36000);
});
Deno.test("Form 172 deduction and statutory absorption differ when modified income has capital addback", () => {
  const v = annual();
  v.earlier_nols.push({
    item_id: "old",
    reference: "2018-nol",
    origin_year: 2018,
    carry_available: 60000,
    deduction_on_return: 40000,
  });
  v.agi -= 40000;
  v.reported_taxable_income -= 40000;
  v.return_nol_deduction.amount = 40000;
  v.capital_loss_deduction.amount = 3000;
  const r = calculateForm172CarryAbsorption(origin(), v);
  assertEquals(r.currentDeduction, 40000);
  assertEquals(r.modifiedTaxableIncome, 63000);
  assertEquals(r.absorptionReduction, 20000);
  assertEquals(r.absorbed, 43000);
  assertEquals(r.remainingLoss, 57000);
});
Deno.test("Form 172 absorption applies 20 percent to statutory excess rather than modified income", () => {
  const v = annual();
  v.agi_refigures.push({
    item_id: "ira",
    reference: "ira-refigure",
    kind: "deduction",
    before: 6000,
    after: 2000,
  });
  v.capital_loss_deduction.amount = 3000;
  v.section1202_exclusion.amount = 5000;
  v.deduction_method = "itemized";
  const r = calculateForm172CarryAbsorption(origin(), {
    ...v,
    refigured_itemized_deduction: {
      reference: "modified-schedule-a",
      amount: 13000,
    },
  });
  assertEquals(r.agiAdjustment, 4000);
  assertEquals(r.modifiedAgi, 126600);
  assertEquals(r.modifiedTaxableIncome, 113600);
  assertEquals(r.absorptionReduction, 20000);
  assertEquals(r.absorbed, 93600);
  assertEquals(r.currentDeduction, 80000);
  assertEquals(r.remainingLoss, 6400);
});
Deno.test("Form 172 pre-2021 carryback capacity subtracts every earlier NOL without an 80 percent reduction", () => {
  const v = annual();
  v.tax_year = 2017;
  v.section199_deduction = { reference: "dpad-2017", amount: 0 };
  v.qbi_deduction = 0;
  v.personal_exemptions = 4000;
  v.earlier_nols.push({
    item_id: "old",
    reference: "2016-nol",
    origin_year: 2016,
    carry_available: 20000,
    deduction_on_return: 20000,
  });
  v.agi = 94600;
  v.reported_taxable_income = 76000;
  v.return_nol_deduction.amount = 20000;
  const r = calculateForm172CarryAbsorption(origin(), v);
  assertEquals(r.taxableWithoutNolQbi250, 96000);
  assertEquals(r.currentDeduction, 76000);
  assertEquals(r.modifiedTaxableIncome, 80000);
  assertEquals(r.absorptionReduction, 0);
  assertEquals(r.absorbed, 80000);
  assertEquals(r.remainingLoss, 20000);
  assertEquals(r.carrybackEligibilityVerified, false);
});
Deno.test("Form 172 negative annual income is refigured before the zero floor", () => {
  const v = annual();
  v.agi = 4600;
  v.qbi_deduction = 0;
  v.reported_taxable_income = 0;
  v.section1202_exclusion.amount = 20000;
  const r = calculateForm172CarryAbsorption(origin(), v);
  assertEquals(r.trueTaxableIncome, -10000);
  assertEquals(r.currentDeduction, 0);
  assertEquals(r.modifiedTaxableIncome, 10000);
  assertEquals(r.absorbed, 10000);
  assertEquals(r.remainingLoss, 90000);
});
Deno.test("Form 172 reviewed earlier absorptions reduce the origin without claiming a complete ledger", () => {
  const v = annual();
  v.prior_absorption_records.push({
    item_id: "2020",
    reference: "review-2020",
    tax_year: 2020,
    absorbed: 15000,
  }, {
    item_id: "2021",
    reference: "review-2021",
    tax_year: 2021,
    absorbed: 25000,
  });
  const r = calculateForm172CarryAbsorption(origin(), v);
  assertEquals(r.openingLoss, 60000);
  assertEquals(r.currentDeduction, 60000);
  assertEquals(r.absorbed, 60000);
  assertEquals(r.remainingLoss, 0);
  assertEquals(r.completeCarryHistoryVerified, false);
});
Deno.test("Form 172 absorption rejects inconsistent source years, owner, capacity and prior utilization", () => {
  const v = annual();
  for (
    const bad of [
      { ...v, reported_taxable_income: 89999 },
      { ...v, taxpayer_ssn: "999887777" },
      { ...v, tax_year: 2019 },
      { ...v, personal_exemptions: 1 },
      { ...v, tax_year: 2017 },
      { ...v, deduction_method: "itemized" },
      { ...v, capital_loss_deduction: { reference: "capital", amount: 3001 } },
      {
        ...v,
        earlier_nols: [{
          item_id: "later",
          reference: "later-loss",
          origin_year: 2020,
          carry_available: 100,
          deduction_on_return: 100,
        }],
      },
      {
        ...v,
        earlier_nols: [{
          item_id: "older",
          reference: "older-loss",
          origin_year: 2018,
          carry_available: 100,
          deduction_on_return: 101,
        }],
      },
      {
        ...v,
        agi: 24600,
        reported_taxable_income: 0,
        return_nol_deduction: {
          reference: "over-limit-return-NOL",
          amount: 90000,
        },
        earlier_nols: [{
          item_id: "older",
          reference: "older-loss",
          origin_year: 2018,
          carry_available: 90000,
          deduction_on_return: 90000,
        }],
      },
      {
        ...v,
        prior_absorption_records: [{
          item_id: "past",
          reference: "past",
          tax_year: 2020,
          absorbed: 100001,
        }],
      },
      {
        ...v,
        prior_absorption_records: [{
          item_id: "own-year",
          reference: "own-year",
          tax_year: 2019,
          absorbed: 1,
        }],
      },
      {
        ...v,
        prior_absorption_records: [{
          item_id: "late",
          reference: "late",
          tax_year: 2025,
          absorbed: 1,
        }],
      },
      {
        ...v,
        prior_absorption_records: [{
          item_id: "a",
          reference: "a",
          tax_year: 2021,
          absorbed: 1,
        }, { item_id: "b", reference: "b", tax_year: 2020, absorbed: 1 }],
      },
      { ...v, reference: v.return_reference },
      { ...v, current_year_taxable_income: 100000 },
      { ...v, nol_amount: 100000 },
    ]
  ) assertThrows(() => calculateForm172CarryAbsorption(origin(), bad));
  const changed = origin();
  changed.noncapital_deductions[0].amount++;
  assertThrows(() => calculateForm172CarryAbsorption(changed, v));
});
