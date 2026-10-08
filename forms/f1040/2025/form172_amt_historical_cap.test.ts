import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateForm172HistoricalAmtCap,
  calculateForm172HistoricalAmtDeductionAllocation,
} from "./form172_amt_historical_cap.ts";
import { form172AmtLegacyTentativeLines } from "./form172_amt_annual_limit.ts";
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
function historicalSources(year = 2017) {
  const regular = origin();
  const {
    noncapital_income,
    noncapital_deductions,
    capital_gains,
    capital_losses,
    prior_nol_deductions,
  } = regular;
  noncapital_deductions[1].amount = 6350;
  const old = {
    source_format: "reviewed_legacy_loss_year",
    reference: `legacy-${year}`,
    tax_year: year,
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
      reference: `regular-return-${year}`,
      tax_year: year,
      taxpayer_ssn: "111223333",
      filing_status: "single",
      agi: -103000,
      standard_or_itemized_deduction: 6350,
      personal_exemptions: 4050,
      reported_taxable_income: 0,
    },
    section199_deduction: { reference: "regular-dpad", amount: 3000 },
    limitations_review: {
      reference: "historical-limitations",
      at_risk_and_passive_limits_applied: true,
      itemized_phaseout_applied: true,
    },
  };
  const modern = amt();
  const alternative = {
    ...modern,
    regular_origin_reference: old.reference,
    amt_inventory: {
      ...modern.amt_inventory,
      tax_year: year,
      limitations_review: {
        reference: "amt-historical-limitations",
        at_risk_and_passive_limits_applied: true,
        itemized_phaseout_applied: true,
      },
    },
    reviewed_amt: {
      ...modern.reviewed_amt,
      tax_year: year,
      amti_before_atnold: -83000,
      section199_deduction: { reference: "amt-dpad", amount: 3000 },
    },
  };
  return { old, alternative };
}

function fixture() {
  const loss = (
    year: number,
    opening: number,
    category: "ordinary" | "whbaa",
  ) => {
    const { old, alternative } = historicalSources(year);
    alternative.reference = `amt-origin-${year}`;
    alternative.amt_inventory.reference = `amt-items-${year}`;
    alternative.reviewed_amt.reference = `amt-return-${year}`;
    return {
      reference: `loss-review-${year}`,
      regular_origin: old,
      amt_origin: alternative,
      reviewed_opening_amt_nol: opening,
      category,
      ...(category === "whbaa"
        ? { whbaa_election_reference: `election-${year}` }
        : {}),
    };
  };
  return {
    reference: "cap-workpaper",
    all_application_year_amt_vintages_included: true,
    annual_review: {
      reference: "annual-2014",
      tax_year: 2014,
      taxpayer_ssn: "111223333",
      form6251_reference: "return-2014",
      before_all_atnold: true,
      tentative_depletion_refigured_with_zero_atnold: true,
      section199_deduction: { reference: "annual-dpad", amount: 0 },
      components: form172AmtLegacyTentativeLines.map((line) => ({
        line,
        reference: `line-${line}`,
        amount: line === "1" ? 100 : 0,
      })),
    },
    losses: [loss(2008, 200, "ordinary"), loss(2009, 100, "whbaa")],
  };
}
Deno.test("Historical AMT cap separately computes ordinary and WHBAA aggregate components", () => {
  const r = calculateForm172HistoricalAmtCap(fixture());
  assertEquals(r.ordinaryCapComponent, 90);
  assertEquals(r.whbaaCapComponent, 10);
  assertEquals(r.aggregateHistoricalCap, 100);
  assertEquals(r.chronologicalReviewedOrigins.map((r) => r.originYear), [
    2008,
    2009,
  ]);
  assertEquals(r.chronologicalAbsorptionReconciled, false);
  assertEquals(r.finalAtnoldReconciled, false);
  assertEquals(r.filingReady, false);
});
Deno.test("Historical AMT cap keeps chronology without treating category subtotals as consumption", () => {
  const f = fixture();
  f.losses[0].category = "whbaa";
  f.losses[0].whbaa_election_reference = "election-2008";
  f.losses[1].category = "ordinary";
  delete f.losses[1].whbaa_election_reference;
  f.losses.reverse();
  const r = calculateForm172HistoricalAmtCap(f);
  assertEquals(r.aggregateHistoricalCap, 100);
  assertEquals(r.chronologicalReviewedOrigins[0].category, "whbaa");
  assertEquals(r.whbaaCapComponent, 10);
  assertEquals(r.chronologicalAbsorptionReconciled, false);
});
Deno.test("Historical AMT cap restores DPAD and retains negative-base and scarcity bounds", () => {
  const f = fixture();
  f.annual_review.section199_deduction.amount = 20;
  let r = calculateForm172HistoricalAmtCap(f);
  assertEquals(r.capBase, 120);
  assertEquals(r.aggregateHistoricalCap, 120);
  f.losses[0].reviewed_opening_amt_nol = 20;
  f.losses[1].reviewed_opening_amt_nol = 5;
  r = calculateForm172HistoricalAmtCap(f);
  assertEquals(r.aggregateHistoricalCap, 25);
  f.annual_review.components[0].amount = -30;
  r = calculateForm172HistoricalAmtCap(f);
  assertEquals(r.aggregateHistoricalCap, 0);
});
Deno.test("Historical AMT cap independently handles ordinary-only and WHBAA-only inventories", () => {
  const f = fixture();
  const ordinary = calculateForm172HistoricalAmtCap({
    ...f,
    losses: [f.losses[0]],
  });
  assertEquals(ordinary.aggregateHistoricalCap, 90);
  assertEquals(ordinary.whbaaCapComponent, 0);
  const special = calculateForm172HistoricalAmtCap({
    ...f,
    losses: [f.losses[1]],
  });
  assertEquals(special.aggregateHistoricalCap, 100);
  assertEquals(special.ordinaryCapComponent, 0);
  const { old, alternative } = historicalSources(2010);
  assertThrows(() =>
    calculateForm172HistoricalAmtCap({
      ...f,
      losses: [{
        ...f.losses[1],
        regular_origin: old,
        amt_origin: alternative,
      }],
    })
  );
});
Deno.test("Historical AMT cap rejects duplicate origins, missing inventory and asserted totals", () => {
  const f = fixture();
  assertThrows(() =>
    calculateForm172HistoricalAmtCap({
      ...f,
      losses: [f.losses[0], { ...f.losses[0], reference: "other" }],
    })
  );
  assertThrows(() =>
    calculateForm172HistoricalAmtCap({
      ...f,
      all_application_year_amt_vintages_included: false,
    })
  );
  assertThrows(() =>
    calculateForm172HistoricalAmtCap({ ...f, aggregateHistoricalCap: 100 })
  );
  assertThrows(() => calculateForm172HistoricalAmtCap({ ...f, losses: [] }));
});
Deno.test("Historical AMT cap rejects unsupported years, excessive opening and election conflicts", () => {
  const f = fixture();
  assertThrows(() =>
    calculateForm172HistoricalAmtCap({
      ...f,
      annual_review: { ...f.annual_review, tax_year: 2021 },
    })
  );
  f.losses[0].reviewed_opening_amt_nol = 80001;
  assertThrows(() => calculateForm172HistoricalAmtCap(f));
  f.losses[0].reviewed_opening_amt_nol = 200;
  f.losses[1].whbaa_election_reference = f.reference;
  assertThrows(() => calculateForm172HistoricalAmtCap(f));
  delete f.losses[1].whbaa_election_reference;
  assertThrows(() => calculateForm172HistoricalAmtCap(f));
});
Deno.test("Historical AMT cap rejects regular-origin substitution, owner mismatch and fractional amounts", () => {
  const f = fixture();
  f.losses[0].amt_origin.regular_origin_reference = "wrong";
  assertThrows(() => calculateForm172HistoricalAmtCap(f));
  const g = fixture();
  g.losses[1].amt_origin.reviewed_amt.taxpayer_ssn = "999887777";
  assertThrows(() => calculateForm172HistoricalAmtCap(g));
  const h = fixture();
  h.losses[1].reviewed_opening_amt_nol = .5;
  assertThrows(() => calculateForm172HistoricalAmtCap(h));
});

Deno.test("Historical AMT deduction chronology preserves the ordinary ninety and later WHBAA ten split", () => {
  const r = calculateForm172HistoricalAmtDeductionAllocation(fixture());
  assertEquals(
    r.chronologicalDeductionAllocations.map((
      v,
    ) => [v.originYear, v.allocatedDeduction]),
    [[2008, 90], [2009, 10]],
  );
  assertEquals(r.historicalDeductionAllocationArithmeticReconciled, true);
  assertEquals(r.chronologicalAbsorptionReconciled, false);
  assertEquals(r.openingAmtCarryAvailabilityVerified, false);
  assertEquals(r.whbaaElectionEligibilityVerified, false);
  assertEquals(r.finalAtnoldReconciled, false);
  assertEquals(r.priorAcceptanceVerified, false);
  assertEquals(r.filingReady, false);
});
Deno.test("An earlier WHBAA deduction is not restricted to the WHBAA cap component", () => {
  const f = fixture();
  f.losses[0].category = "whbaa";
  f.losses[0].whbaa_election_reference = "election-2008";
  f.losses[1].category = "ordinary";
  delete f.losses[1].whbaa_election_reference;
  f.losses.reverse();
  const r = calculateForm172HistoricalAmtDeductionAllocation(f);
  assertEquals(r.whbaaCapComponent, 10);
  assertEquals(
    r.chronologicalDeductionAllocations.map((
      v,
    ) => [v.originYear, v.allocatedDeduction]),
    [[2008, 100], [2009, 0]],
  );
});
Deno.test("An earlier partial WHBAA deduction leaves actual remaining capacity for a later ordinary vintage", () => {
  const f = fixture();
  f.losses[0].category = "whbaa";
  f.losses[0].whbaa_election_reference = "election-2008";
  f.losses[0].reviewed_opening_amt_nol = 50;
  f.losses[1].category = "ordinary";
  delete f.losses[1].whbaa_election_reference;
  const r = calculateForm172HistoricalAmtDeductionAllocation(f);
  assertEquals(r.ordinaryCapComponent, 90);
  assertEquals(r.whbaaCapComponent, 10);
  assertEquals(
    r.chronologicalDeductionAllocations.map((v) => v.allocatedDeduction),
    [50, 50],
  );
});
Deno.test("Historical deduction chronology cannot spend the ordinary limit twice across ordinary vintages", () => {
  const f = fixture();
  const { old, alternative } = historicalSources(2007);
  f.losses.push({
    reference: "earlier-ordinary",
    regular_origin: old,
    amt_origin: alternative,
    reviewed_opening_amt_nol: 40,
    category: "ordinary",
  });
  const r = calculateForm172HistoricalAmtDeductionAllocation(f);
  assertEquals(
    r.chronologicalDeductionAllocations.map(
      (v) => [v.originYear, v.allocatedDeduction],
    ),
    [[2007, 40], [2008, 50], [2009, 10]],
  );
});
Deno.test("Historical deduction allocation keeps scarce, negative-base, zero-opening and DPAD cases bounded", () => {
  const f = fixture();
  f.losses[0].reviewed_opening_amt_nol = 20;
  f.losses[1].reviewed_opening_amt_nol = 5;
  assertEquals(
    calculateForm172HistoricalAmtDeductionAllocation(f)
      .chronologicalDeductionAllocations.map((v) => v.allocatedDeduction),
    [20, 5],
  );
  f.losses[0].reviewed_opening_amt_nol = 0;
  assertEquals(
    calculateForm172HistoricalAmtDeductionAllocation(f)
      .chronologicalDeductionAllocations.map((v) => v.allocatedDeduction),
    [0, 5],
  );
  f.annual_review.components[0].amount = -30;
  assertEquals(
    calculateForm172HistoricalAmtDeductionAllocation(f)
      .chronologicalDeductionAllocations.map((v) => v.allocatedDeduction),
    [0, 0],
  );
  f.losses[0].reviewed_opening_amt_nol = 200;
  f.losses[1].reviewed_opening_amt_nol = 100;
  f.annual_review.components[0].amount = 100;
  f.annual_review.section199_deduction.amount = 20;
  assertEquals(
    calculateForm172HistoricalAmtDeductionAllocation(f)
      .chronologicalDeductionAllocations.map((v) => v.allocatedDeduction),
    [108, 12],
  );
});
Deno.test("Historical deduction allocation recomputes origins and rejects asserted deduction results", () => {
  const f = fixture();
  assertThrows(() =>
    calculateForm172HistoricalAmtDeductionAllocation({
      ...f,
      chronologicalDeductionAllocations: [{
        originYear: 2008,
        allocatedDeduction: 100,
      }],
    })
  );
  f.losses[0].reviewed_opening_amt_nol = 80001;
  assertThrows(() => calculateForm172HistoricalAmtDeductionAllocation(f));
  const g = fixture();
  g.losses[0].amt_origin.regular_origin_reference = "substituted-origin";
  assertThrows(() => calculateForm172HistoricalAmtDeductionAllocation(g));
  g.losses[0].amt_origin.regular_origin_reference =
    g.losses[0].regular_origin.reference;
  delete g.losses[1].whbaa_election_reference;
  assertThrows(() => calculateForm172HistoricalAmtDeductionAllocation(g));
});
