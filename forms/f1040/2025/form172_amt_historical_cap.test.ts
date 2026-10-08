import { calculateForm172HistoricalAmtAbsorption } from "./form172_amt_historical_absorption.ts";
import { calculateForm172HistoricalAmtVintageModifiedIncome } from "./form172_amt_vintage_modified_income.ts";
import { calculateForm172HistoricalAmtModifiedIncome } from "./form172_amt_modified_income.ts";
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

function modifiedReview(f = fixture()) {
  return {
    reference: "modified-review",
    annual_reference: f.annual_review.reference,
    tax_year: 2014,
    taxpayer_ssn: "111223333",
    filing_status: "single",
    before_all_atnold: true,
    components: f.annual_review.components.map((row) => ({
      line: row.line,
      original_reference: row.reference,
      original_amount: row.amount,
      refigured_reference: `modified-${row.line}`,
      refigured_amount: row.amount,
    })),
    section199: {
      original_reference: f.annual_review.section199_deduction.reference,
      original_amount: f.annual_review.section199_deduction.amount,
      refigured_reference: "modified-dpad",
      refigured_amount: f.annual_review.section199_deduction.amount,
    },
    amt_capital_items: [] as {
      item_id: string;
      reference: string;
      owner_ssn: string;
      kind: "gain" | "loss";
      amount: number;
    }[],
    amt_capital_loss_deduction: { reference: "amt-schedule-d", amount: 0 },
    section1202_items: [] as {
      item_id: string;
      reference: string;
      owner_ssn: string;
      excluded_gain: number;
      amt_preference: number;
    }[],
  };
}
Deno.test("Historical AMT modified income separates deduction cap from capital and medical refigures", () => {
  const f = fixture();
  f.losses[0].reviewed_opening_amt_nol = 80000;
  f.losses[1].reviewed_opening_amt_nol = 0;
  f.annual_review.components[0].amount = 31700;
  const v = modifiedReview(f);
  // Wages50000, AMT capital deduction3000, medical20000: the original
  // medical floor4700 gives deduction15300 and AMTI31700. Refiguring
  // the floor at5000 changes the deduction to15000; restore capital once.
  v.components[0].refigured_amount = 32000;
  v.amt_capital_items = [{
    item_id: "loss",
    reference: "amt-loss-source",
    owner_ssn: v.taxpayer_ssn,
    kind: "loss",
    amount: 7000,
  }];
  v.amt_capital_loss_deduction.amount = 3000;
  const r = calculateForm172HistoricalAmtModifiedIncome(f, v);
  assertEquals(r.originalDeductionCap, 28530);
  assertEquals(r.refiguredTentativeAmti, 32000);
  assertEquals(r.capitalLossAddback, 3000);
  assertEquals(r.modifiedAmtiBeforeEarlierAtnold, 35000);
  assertEquals(r.chronologicalAbsorptionReconciled, false);
  assertEquals(r.survivingCarryVerified, false);
  assertEquals(r.filingReady, false);
});
Deno.test("Historical AMT modified income restores only section1202 exclusion not already in AMTI", () => {
  const f = fixture();
  f.annual_review.components.find((row) => row.line === "13")!.amount = 7;
  const v = modifiedReview(f);
  v.section1202_items = [{
    item_id: "qsbs",
    reference: "qsbs-source",
    owner_ssn: v.taxpayer_ssn,
    excluded_gain: 100,
    amt_preference: 7,
  }];
  const r = calculateForm172HistoricalAmtModifiedIncome(f, v);
  assertEquals(r.originalTentativeAmti, 107);
  assertEquals(r.section1202Addback, 93);
  assertEquals(r.modifiedAmtiBeforeEarlierAtnold, 200);
  assertEquals(r.refiguredOperandEligibilityVerified, false);
  v.components.find((row) => row.line === "13")!.refigured_amount = 0;
  assertThrows(
    () => calculateForm172HistoricalAmtModifiedIncome(f, v),
    Error,
    "preference differs",
  );
});
Deno.test("Historical AMT modified income uses AMT capital netting and MFS limit", () => {
  const f = fixture();
  const v = modifiedReview(f);
  v.filing_status = "married_filing_separately";
  v.amt_capital_items = [
    {
      item_id: "gain",
      reference: "gain-source",
      owner_ssn: v.taxpayer_ssn,
      kind: "gain",
      amount: 2000,
    },
    {
      item_id: "loss",
      reference: "loss-source",
      owner_ssn: v.taxpayer_ssn,
      kind: "loss",
      amount: 7000,
    },
  ];
  v.amt_capital_loss_deduction.amount = 1500;
  assertEquals(
    calculateForm172HistoricalAmtModifiedIncome(f, v).capitalLossAddback,
    1500,
  );
  v.amt_capital_loss_deduction.amount = 3000;
  assertThrows(
    () => calculateForm172HistoricalAmtModifiedIncome(f, v),
    Error,
    "capital deduction differs",
  );
  v.amt_capital_loss_deduction.amount = 1500;
  v.amt_capital_items[1].owner_ssn = "222334444";
  assertThrows(
    () => calculateForm172HistoricalAmtModifiedIncome(f, v),
    Error,
    "wrong owners",
  );
});
Deno.test("Historical AMT modified income restores refigured DPAD and preserves negative signed base", () => {
  const f = fixture();
  f.annual_review.components[0].amount = -5000;
  f.annual_review.section199_deduction.amount = 100;
  const v = modifiedReview(f);
  v.section199.refigured_amount = 200;
  const r = calculateForm172HistoricalAmtModifiedIncome(f, v);
  assertEquals(r.signedModifiedAmti, -4800);
  assertEquals(r.modifiedAmtiBeforeEarlierAtnold, 0);
  v.section199.original_amount = 101;
  assertThrows(
    () => calculateForm172HistoricalAmtModifiedIncome(f, v),
    Error,
    "section199 original",
  );
});
Deno.test("Historical AMT modified income rejects incomplete stale duplicate or asserted operands", () => {
  const f = fixture();
  const good = modifiedReview(f);
  for (
    const mutate of [
      (v: typeof good) => {
        v.components.pop();
      },
      (v: typeof good) => {
        v.components[1] = v.components[0];
      },
      (v: typeof good) => {
        v.components[0].original_amount++;
      },
      (v: typeof good) => {
        v.components[0].original_reference = "unmatched";
      },
      (v: typeof good) => {
        v.components[0].refigured_reference =
          v.components[1].refigured_reference;
      },
      (v: typeof good) => {
        v.tax_year = 2015;
      },
      (v: typeof good) => {
        v.taxpayer_ssn = "222334444";
      },
      (v: typeof good) => {
        v.annual_reference = "wrong-year-return";
      },
    ]
  ) {
    const bad = structuredClone(good);
    mutate(bad);
    assertThrows(() => calculateForm172HistoricalAmtModifiedIncome(f, bad));
  }
  assertThrows(() =>
    calculateForm172HistoricalAmtModifiedIncome(f, {
      ...good,
      modified_amti: 123,
    })
  );
  const bad = structuredClone(good);
  bad.components.find((row) => row.line === "10")!.refigured_amount = 1;
  assertThrows(
    () => calculateForm172HistoricalAmtModifiedIncome(f, bad),
    Error,
    "retain regular NOL",
  );
});

function vintageReview(f = fixture()) {
  const earlier = f.losses.map((loss, index) => ({
    origin_year: index === 0 ? 2008 : 2009,
    loss_reference: loss.reference,
    refigured_deductions_include_earlier_nol_effects: true,
    earlier_nol_deductions: index === 0 ? [] : [{
      origin_year: 2008,
      loss_reference: f.losses[0].reference,
      amount: 90,
    }],
    modified_review: {
      ...modifiedReview(f),
      reference: `modified-vintage-${index}`,
      components: modifiedReview(f).components.map((c) => ({
        ...c,
        refigured_reference: `vintage-${index}-${c.line}`,
      })),
      section199: {
        ...modifiedReview(f).section199,
        refigured_reference: `vintage-${index}-dpad`,
      },
    },
  }));
  return {
    reference: "vintage-refigures",
    application_tax_year: 2014,
    taxpayer_ssn: "111223333",
    vintages: earlier,
  };
}
Deno.test("Historical AMT vintage workpapers use independent refigures and earlier deductions once", () => {
  const f = fixture();
  const v = vintageReview(f);
  v.vintages[1].modified_review.components[0].refigured_amount = 120;
  const r = calculateForm172HistoricalAmtVintageModifiedIncome(f, v);
  assertEquals(
    r.chronologicalVintageModifiedIncome.map((
      row,
    ) => [row.earlierActualDeduction, row.modifiedAmtiAfterEarlierAtnold]),
    [[0, 100], [90, 30]],
  );
  assertEquals(
    r.chronologicalVintageModifiedIncome.map((row) =>
      row.actualAllocatedDeduction
    ),
    [90, 10],
  );
  assertEquals(r.chronologicalAbsorptionReconciled, false);
  assertEquals(r.survivingCarryVerified, false);
  assertEquals(r.filingReady, false);
  v.vintages[1].modified_review.components[0].refigured_amount = 50;
  assertEquals(
    calculateForm172HistoricalAmtVintageModifiedIncome(f, v)
      .chronologicalVintageModifiedIncome[1].modifiedAmtiAfterEarlierAtnold,
    0,
  );
});
Deno.test("Historical AMT vintage workpapers reject lost duplicated stale and reused contexts", () => {
  const f = fixture();
  const good = vintageReview(f);
  for (
    const mutate of [
      (v: typeof good) => {
        v.vintages.pop();
      },
      (v: typeof good) => {
        v.vintages[1].origin_year = 2008;
      },
      (v: typeof good) => {
        v.vintages[0].loss_reference = "wrong-origin";
      },
      (v: typeof good) => {
        v.vintages[1].earlier_nol_deductions[0].amount = 89;
      },
      (v: typeof good) => {
        v.vintages[1].earlier_nol_deductions = [];
      },
      (v: typeof good) => {
        v.vintages[0].earlier_nol_deductions = [{
          origin_year: 2009,
          loss_reference: f.losses[1].reference,
          amount: 10,
        }];
      },
      (v: typeof good) => {
        v.vintages[1].modified_review.reference =
          v.vintages[0].modified_review.reference;
      },
      (v: typeof good) => {
        v.taxpayer_ssn = "222334444";
      },
    ]
  ) {
    const bad = structuredClone(good);
    mutate(bad);
    assertThrows(() =>
      calculateForm172HistoricalAmtVintageModifiedIncome(f, bad)
    );
  }
  assertThrows(() =>
    calculateForm172HistoricalAmtVintageModifiedIncome(f, {
      ...good,
      absorbed_loss: 100,
    })
  );
});

Deno.test("Historical AMT absorption reproduces ordinary ninety and WHBAA ten without accepted carry", () => {
  const f = fixture();
  const v = vintageReview(f);
  const r = calculateForm172HistoricalAmtAbsorption(f, v);
  assertEquals(
    r.chronologicalReviewedApplications.map((
      row,
    ) => [row.absorbed, row.reviewedRemaining]),
    [[90, 110], [10, 90]],
  );
  assertEquals(r.totalReviewedAbsorbed, 100);
  assertEquals(r.totalReviewedRemaining, 200);
  assertEquals(r.completeCarryHistoryVerified, false);
  assertEquals(r.survivingAcceptedCarryVerified, false);
  assertEquals(r.filingReady, false);
});
Deno.test("Historical AMT absorption preserves early WHBAA consumption and its later ordinary remainder", () => {
  const f = fixture();
  f.losses[0].category = "whbaa";
  f.losses[0].whbaa_election_reference = "election-2008";
  f.losses[1].category = "ordinary";
  delete f.losses[1].whbaa_election_reference;
  let v = vintageReview(f);
  v.vintages[1].earlier_nol_deductions[0].amount = 100;
  let r = calculateForm172HistoricalAmtAbsorption(f, v);
  assertEquals(r.chronologicalReviewedApplications.map((row) => row.absorbed), [
    100,
    0,
  ]);
  assertEquals(r.chronologicalReviewedApplications[0].whbaaComponent, 10);
  f.losses[0].reviewed_opening_amt_nol = 50;
  v = vintageReview(f);
  v.vintages[1].earlier_nol_deductions[0].amount = 50;
  r = calculateForm172HistoricalAmtAbsorption(f, v);
  assertEquals(
    r.chronologicalReviewedApplications.map((
      row,
    ) => [row.absorbed, row.reviewedRemaining]),
    [[50, 0], [50, 50]],
  );
});
Deno.test("Historical AMT absorption spends a shared ordinary ninety capacity only once", () => {
  const f = fixture();
  f.losses[0].reviewed_opening_amt_nol = 40;
  f.losses[1].category = "ordinary";
  delete f.losses[1].whbaa_election_reference;
  const v = vintageReview(f);
  v.vintages[1].earlier_nol_deductions[0].amount = 40;
  const r = calculateForm172HistoricalAmtAbsorption(f, v);
  assertEquals(r.chronologicalReviewedApplications.map((row) => row.absorbed), [
    40,
    50,
  ]);
  assertEquals(r.totalReviewedAbsorbed, 90);
  // Multiplying (100-40) by90% for the second origin would incorrectly use54.
  assertEquals(
    r.chronologicalReviewedApplications[1].remainingOrdinaryCapacity,
    50,
  );
});
Deno.test("Historical AMT absorption differs from actual deduction after capital and medical modifications", () => {
  const f = fixture();
  f.losses[0].reviewed_opening_amt_nol = 80000;
  f.losses[1].reviewed_opening_amt_nol = 0;
  f.annual_review.components[0].amount = 31700;
  const v = vintageReview(f);
  v.vintages[1].earlier_nol_deductions[0].amount = 28530;
  for (const row of v.vintages) {
    row.modified_review.components[0].refigured_amount = 32000;
    row.modified_review.amt_capital_items = [{
      item_id: "loss",
      reference: "amt-loss-source",
      owner_ssn: "111223333",
      kind: "loss",
      amount: 7000,
    }];
    row.modified_review.amt_capital_loss_deduction.amount = 3000;
  }
  const r = calculateForm172HistoricalAmtAbsorption(f, v);
  assertEquals(r.originalDeductionCap, 28530);
  assertEquals(
    r.chronologicalReviewedApplications[0].actualAllocatedDeduction,
    28530,
  );
  assertEquals(r.chronologicalReviewedApplications[0].modifiedBase, 35000);
  assertEquals(r.chronologicalReviewedApplications[0].absorbed, 31500);
  assertEquals(r.chronologicalReviewedApplications[0].reviewedRemaining, 48500);
  assertEquals(
    r.chronologicalReviewedApplications[1].earlierActualDeduction,
    28530,
  );
  v.vintages[1].earlier_nol_deductions[0].amount = 31500;
  assertThrows(
    () => calculateForm172HistoricalAmtAbsorption(f, v),
    Error,
    "earlier deductions differ",
  );
});
Deno.test("Historical AMT absorption floors shrinking vintage bases and rejects missing reviews", () => {
  const f = fixture();
  const v = vintageReview(f);
  v.vintages[1].modified_review.components[0].refigured_amount = -20;
  const r = calculateForm172HistoricalAmtAbsorption(f, v);
  assertEquals(r.chronologicalReviewedApplications.map((row) => row.absorbed), [
    90,
    0,
  ]);
  assertEquals(r.chronologicalReviewedApplications[1].reviewedRemaining, 100);
  v.vintages.pop();
  assertThrows(
    () => calculateForm172HistoricalAmtAbsorption(f, v),
    Error,
    "each origin exactly once",
  );
});
