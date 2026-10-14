import { assertEquals, assertThrows } from "@std/assert";
import { calculateForm172CarryHistory } from "./form172_carry_history.ts";
import { stageForm172CarryHistorySource } from "./form172_carry_history_source.ts";
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

function annual(y: number, base = 0) {
  return {
    reference: `absorption-${y}`,
    tax_year: y,
    taxpayer_ssn: "111223333",
    filing_status: "single",
    return_reference: `return-${y}`,
    before_current_and_later_nol: true,
    agi: base,
    deduction_method: "itemized",
    standard_or_itemized_deduction: 0,
    qbi_deduction: 0,
    section250_deduction: 0,
    section199_deduction: y < 2018
      ? { reference: `dpad-${y}`, amount: 0 }
      : undefined,
    personal_exemptions: 0,
    reported_taxable_income: base,
    return_nol_deduction: { reference: `NOL-${y}`, amount: 0 },
    earlier_nols: [],
    capital_loss_deduction: { reference: `capital-${y}`, amount: 0 },
    section1202_exclusion: { reference: `qsbs-${y}`, amount: 0 },
    agi_refigures: [],
    refigured_itemized_deduction: { reference: `deduction-${y}`, amount: 0 },
  };
}
function history(start = 2018) {
  return {
    reference: "legacy-history",
    opening_tax_year: 2025,
    carry_policy: {
      kind: "reviewed_waiver",
      reference: "waiver-review",
      waiver_timeliness_reviewed: true,
    },
    annual_reviews: Array.from(
      { length: 2025 - start },
      (_, i) => annual(start + i),
    ),
  };
}
Deno.test("Form 172 historical carry avoids post-2017 deduction limit for pre-2018 origin", () => {
  const h = history();
  h.annual_reviews[6] = annual(2024, 100000);
  const r = calculateForm172CarryHistory(legacy(), h);
  assertEquals(r.originLoss, 100000);
  assertEquals(r.expiresAfterTaxYear, 2037);
  const a = r.annualResults[6];
  assertEquals(a.pre2018Available, 100000);
  assertEquals(a.excessAfterPre2018, 0);
  assertEquals(a.currentDeduction, 100000);
  assertEquals(a.absorbed, 100000);
  assertEquals(r.openingLoss, 0);
});
Deno.test("Form 172 oldest historical origin requires every year through the final carry year", () => {
  const o = legacy();
  o.tax_year = 2005;
  o.reviewed_form1040.tax_year = 2005;
  const h = history(2006);
  const r = calculateForm172CarryHistory(o, h);
  assertEquals(r.expectedYears.length, 19);
  assertEquals(r.expiresAfterTaxYear, 2025);
  assertEquals(r.openingLoss, 100000);
  assertThrows(() =>
    calculateForm172CarryHistory(o, {
      ...h,
      annual_reviews: h.annual_reviews.slice(1),
    })
  );
});
Deno.test("Form 172 historical general carryback requires two reviewed preceding years", () => {
  const h = {
    ...history(),
    carry_policy: {
      kind: "reviewed_full_loss_carryback",
      reference: "legacy-general",
      whole_loss_carryback_eligibility_reviewed: true,
      section965_years_absent_reviewed: true,
      legacy_general_two_year_rule_reviewed: true,
    },
    annual_reviews: [
      annual(2015, 20000),
      annual(2016, 10000),
      ...history().annual_reviews,
    ],
  };
  h.annual_reviews[0].personal_exemptions = 4000;
  h.annual_reviews[0].agi = 24000;
  const r = calculateForm172CarryHistory(legacy(), h);
  assertEquals(r.expectedYears, [
    2015,
    2016,
    2018,
    2019,
    2020,
    2021,
    2022,
    2023,
    2024,
  ]);
  assertEquals(r.annualResults[0].absorbed, 24000);
  assertEquals(r.openingLoss, 66000);
  const { legacy_general_two_year_rule_reviewed: _, ...policy } =
    h.carry_policy;
  assertThrows(() =>
    calculateForm172CarryHistory(legacy(), { ...h, carry_policy: policy })
  );
});
Deno.test("Form 172 historical annual DPAD is restored for modified-income absorption", () => {
  const a = annual(2016, 17000);
  a.section199_deduction!.amount = 3000;
  const r = calculateForm172CarryAbsorption(legacy(), {
    ...a,
    prior_absorption_records: [],
  });
  assertEquals(r.currentDeduction, 17000);
  assertEquals(r.modifiedTaxableIncome, 20000);
  assertEquals(r.absorbed, 20000);
  const { section199_deduction: _, ...missing } = a;
  assertThrows(() =>
    calculateForm172CarryAbsorption(legacy(), {
      ...missing,
      prior_absorption_records: [],
    })
  );
});
Deno.test("Form 172 historical earlier deductions reduce current capacity without changing origin", () => {
  const a = annual(2024, 80000);
  const r = calculateForm172CarryAbsorption(legacy(), {
    ...a,
    return_nol_deduction: { reference: "older-NOL-review", amount: 20000 },
    earlier_nols: [{
      item_id: "older",
      reference: "older-2010",
      origin_year: 2010,
      carry_available: 20000,
      deduction_on_return: 20000,
    }],
    prior_absorption_records: [],
  });
  assertEquals(r.taxableWithoutNolQbi250, 100000);
  assertEquals(r.pre2018Available, 120000);
  assertEquals(r.currentDeduction, 80000);
  assertEquals(r.absorbed, 80000);
  assertEquals(r.remainingLoss, 20000);
});
Deno.test("Form 172 historical carry source replays exact origin and annual package bytes", async () => {
  const o = legacy(), h = history();
  h.annual_reviews[6] = annual(2024, 25000);
  const docs = [{
    reference: o.reference,
    bytes: new TextEncoder().encode(JSON.stringify(o)),
  }, {
    reference: h.reference,
    bytes: new TextEncoder().encode(JSON.stringify(h)),
  }];
  const claims = await Promise.all(
    docs.map(async (d) => ({
      reference: d.reference,
      sha256: Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", d.bytes)),
        (b) => b.toString(16).padStart(2, "0"),
      ).join(""),
    })),
  );
  const binding = {
    origin: claims[0],
    history: claims[1],
    origin_tax_year: 2017,
    opening_tax_year: 2025,
    taxpayer_ssn: "111223333",
  };
  const r = await stageForm172CarryHistorySource(binding, docs);
  assertEquals(r.originYear, 2017);
  assertEquals(r.openingLoss, 75000);
  assertEquals(r.reviewPackageBytesVerified, true);
  assertEquals(r.filingReady, false);
});

function whbaaFixture(year = 2009, period: 3 | 4 | 5 = 5) {
  const o = legacy();
  o.tax_year = year;
  o.reviewed_form1040.tax_year = year;
  const years = [
    ...Array.from({ length: period }, (_, i) => year - period + i),
    ...Array.from({ length: 2024 - year }, (_, i) => year + 1 + i),
  ];
  const h = {
    reference: "whbaa-history",
    opening_tax_year: 2025,
    carry_policy: {
      kind: "reviewed_whbaa_carryback",
      reference: "whbaa-election-review",
      carryback_period: period,
      whole_loss_whbaa_scope_reviewed: true,
      election_timeliness_reviewed: true,
      whbaa_eligibility_reviewed: true,
      section965_years_absent_reviewed: true,
    },
    annual_reviews: years.map((y) => annual(y)),
  };
  return { o, h, years };
}
Deno.test("Form172 WHBAA reviewed histories require complete elected3 4 or5 year carrybacks", () => {
  for (const year of [2008, 2009]) {
    for (const period of [3, 4, 5] as const) {
      const { o, h, years } = whbaaFixture(year, period);
      h.annual_reviews[0] = annual(year - period, 100000);
      const r = calculateForm172CarryHistory(o, h);
      assertEquals(r.expectedYears, years);
      assertEquals(
        r.annualResults[0].currentDeduction,
        period === 5 ? 50000 : 100000,
      );
      assertEquals(r.annualResults[0].absorbed, period === 5 ? 50000 : 100000);
      assertEquals(r.openingLoss, period === 5 ? 50000 : 0);
      assertEquals(r.completeCarryHistoryVerified, false);
      assertEquals(r.filingReady, false);
    }
  }
});
Deno.test("Form172 WHBAA Notice2010-58 A13 separates fifth-year25000 deduction from30000 absorption", () => {
  const { o, h } = whbaaFixture();
  h.annual_reviews[0] = annual(2004, 50000);
  h.annual_reviews[0].agi = 60000;
  h.annual_reviews[0].personal_exemptions = 10000;
  const r = calculateForm172CarryHistory(o, h);
  assertEquals(r.annualResults[0].currentDeduction, 25000);
  assertEquals(r.annualResults[0].modifiedTaxableIncome, 60000);
  assertEquals(r.annualResults[0].absorbed, 30000);
  assertEquals(r.annualResults[1].openingLoss, 70000);
  assertEquals(r.openingLoss, 70000);
});
Deno.test("Form172 WHBAA Notice2010-58 A12 applies fifty percent after earlier actual deductions", () => {
  const { o, h } = whbaaFixture(2008);
  o.inventory.noncapital_deductions[0].amount = 510000;
  o.reviewed_form1040.agi = -503000;
  const a = annual(2003, 100000);
  a.return_nol_deduction.amount = 300000;
  const review = {
    ...a,
    earlier_nols: [{
      item_id: "2002",
      reference: "2002-reviewed-carry",
      origin_year: 2002,
      carry_available: 100000,
      deduction_on_return: 100000,
    }, {
      item_id: "2005",
      reference: "2005-reviewed-carry",
      origin_year: 2005,
      carry_available: 200000,
      deduction_on_return: 200000,
    }],
  };
  const r = calculateForm172CarryHistory(o, {
    ...h,
    annual_reviews: [review, ...h.annual_reviews.slice(1)],
  });
  assertEquals(r.originLoss, 500000);
  assertEquals(r.annualResults[0].taxableWithoutNolQbi250, 400000);
  assertEquals(r.annualResults[0].currentDeduction, 50000);
  assertEquals(r.annualResults[0].absorbed, 50000);
  assertEquals(r.openingLoss, 450000);
});
Deno.test("Form172 WHBAA rejects wrong origin period incomplete years and injected fifth-year scope", () => {
  const { o, h } = whbaaFixture();
  const wrong = structuredClone(o);
  wrong.tax_year = 2017;
  wrong.reviewed_form1040.tax_year = 2017;
  assertThrows(() => calculateForm172CarryHistory(wrong, h));
  assertThrows(() =>
    calculateForm172CarryHistory(o, {
      ...h,
      carry_policy: { ...h.carry_policy, carryback_period: 2 },
    })
  );
  assertThrows(() =>
    calculateForm172CarryHistory(o, {
      ...h,
      annual_reviews: h.annual_reviews.slice(1),
    })
  );
  const injected = {
    ...h,
    annual_reviews: [{
      ...h.annual_reviews[0],
      whbaa_fifth_year_review: {
        reference: "injected",
        origin_year: 2009,
        whole_loss_whbaa_scope_reviewed: true,
      },
    }, ...h.annual_reviews.slice(1)],
  };
  assertThrows(() => calculateForm172CarryHistory(o, injected));
  assertThrows(() =>
    calculateForm172CarryAbsorption(o, {
      ...annual(2005),
      prior_absorption_records: [],
      whbaa_fifth_year_review: {
        reference: "wrong-year",
        origin_year: 2009,
        whole_loss_whbaa_scope_reviewed: true,
      },
    })
  );
});
Deno.test("Form172 retained WHBAA history bytes recompute fifth-year absorption and next-year openings", async () => {
  const { o, h } = whbaaFixture();
  h.annual_reviews[0] = annual(2004, 50000);
  h.annual_reviews[0].agi = 60000;
  h.annual_reviews[0].personal_exemptions = 10000;
  h.annual_reviews[1] = annual(2005, 20000);
  const docs = [{
    reference: o.reference,
    bytes: new TextEncoder().encode(JSON.stringify(o)),
  }, {
    reference: h.reference,
    bytes: new TextEncoder().encode(JSON.stringify(h)),
  }];
  const claims = await Promise.all(
    docs.map(async (d) => ({
      reference: d.reference,
      sha256: Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", d.bytes)),
        (b) => b.toString(16).padStart(2, "0"),
      ).join(""),
    })),
  );
  const r = await stageForm172CarryHistorySource({
    origin: claims[0],
    history: claims[1],
    origin_tax_year: 2009,
    opening_tax_year: 2025,
    taxpayer_ssn: "111223333",
  }, docs);
  assertEquals(r.annualResults[0].absorbed, 30000);
  assertEquals(r.annualResults[1].openingLoss, 70000);
  assertEquals(r.annualResults[1].absorbed, 20000);
  assertEquals(r.openingLoss, 50000);
  assertEquals(r.reviewPackageBytesVerified, true);
  assertEquals(r.filingReady, false);
});
