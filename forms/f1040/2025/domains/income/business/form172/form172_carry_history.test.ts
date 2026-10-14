import { assertEquals, assertThrows } from "@std/assert";
import { calculateForm172CarryHistory } from "./form172_carry_history.ts";

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

const standards: Record<number, number> = {
  2013: 6100,
  2014: 6200,
  2015: 6300,
  2016: 6300,
  2017: 6350,
  2018: 12000,
  2019: 12200,
  2020: 12400,
  2021: 12550,
  2022: 12950,
  2023: 13850,
  2024: 14600,
};
function annual(year: number, base = 0) {
  const exemption = year < 2018
    ? ({ 2013: 3900, 2014: 3950, 2015: 4000, 2016: 4050, 2017: 4050 } as Record<
      number,
      number
    >)[year]
    : 0;
  return {
    reference: `absorption-${year}`,
    tax_year: year,
    taxpayer_ssn: "111223333",
    filing_status: "single",
    return_reference: `return-${year}`,
    before_current_and_later_nol: true,
    agi: base ? base + standards[year] + exemption : 0,
    deduction_method: "standard",
    standard_or_itemized_deduction: standards[year],
    qbi_deduction: 0,
    section250_deduction: 0,
    section199_deduction: year < 2018
      ? { reference: `dpad-${year}`, amount: 0 }
      : undefined,
    personal_exemptions: exemption,
    reported_taxable_income: base,
    return_nol_deduction: { reference: `nol-${year}`, amount: 0 },
    earlier_nols: [],
    capital_loss_deduction: { reference: `capital-${year}`, amount: 0 },
    section1202_exclusion: { reference: `qsbs-${year}`, amount: 0 },
    agi_refigures: [],
  };
}
function history() {
  return {
    reference: "history",
    opening_tax_year: 2025,
    carry_policy: {
      kind: "reviewed_waiver",
      reference: "waiver",
      waiver_timeliness_reviewed: true,
    },
    annual_reviews: [2020, 2021, 2022, 2023, 2024].map((y) =>
      annual(y, y === 2021 ? 50000 : y === 2022 ? 20000 : 0)
    ),
  };
}
function origin2024() {
  const o = origin();
  o.tax_year = 2024;
  o.reference = "origin-2024";
  o.reviewed_form1040.tax_year = 2024;
  o.reviewed_form1040.reference = "return-2024";
  o.reviewed_form1040.line12_standard_or_itemized_deduction = 14600;
  o.noncapital_deductions[1].amount = 14600;
  return o;
}
Deno.test("Form 172 history derives each opening from all waived carryforward years", () => {
  const r = calculateForm172CarryHistory(origin(), history());
  assertEquals(r.expectedYears, [2020, 2021, 2022, 2023, 2024]);
  assertEquals(r.annualResults.map((a) => a.openingLoss), [
    100000,
    100000,
    60000,
    44000,
    44000,
  ]);
  assertEquals(r.computedAbsorptionRecords.map((a) => a.absorbed), [
    0,
    40000,
    16000,
    0,
    0,
  ]);
  assertEquals(r.openingLoss, 44000);
  assertEquals(r.completeAnnualArithmeticChainReconciled, true);
  assertEquals(r.completeCarryHistoryVerified, false);
  assertEquals(r.filingReady, false);
});
Deno.test("Form 172 history orders five carryback years before forward years", () => {
  const years = [2014, 2015, 2016, 2017, 2018, 2020, 2021, 2022, 2023, 2024];
  const h = {
    ...history(),
    carry_policy: {
      kind: "reviewed_full_loss_carryback",
      reference: "carryback",
      whole_loss_carryback_eligibility_reviewed: true,
      section965_years_absent_reviewed: true,
    },
    annual_reviews: years.map((y) => annual(y, y === 2014 ? 20000 : 0)),
  };
  const r = calculateForm172CarryHistory(origin(), h);
  assertEquals(r.expectedYears, years);
  assertEquals(r.annualResults[0].currentDeduction, 20000);
  assertEquals(r.annualResults[0].absorbed, 23950);
  assertEquals(r.openingLoss, 76050);
});
Deno.test("Form 172 history requires whole farming review for two-year carryback", () => {
  const h = {
    reference: "history",
    opening_tax_year: 2025,
    carry_policy: {
      kind: "reviewed_full_loss_carryback",
      reference: "farm",
      whole_loss_carryback_eligibility_reviewed: true,
      section965_years_absent_reviewed: true,
      farming_loss_only: true,
    },
    annual_reviews: [annual(2022, 20000), annual(2023, 25000)],
  };
  const r = calculateForm172CarryHistory(origin2024(), h);
  assertEquals(r.expectedYears, [2022, 2023]);
  assertEquals(r.openingLoss, 64000);
  const { farming_loss_only: _, ...missing } = h.carry_policy;
  assertThrows(() =>
    calculateForm172CarryHistory(origin2024(), { ...h, carry_policy: missing })
  );
});
Deno.test("Form 172 history permits no application years only for current opening", () => {
  for (
    const carry_policy of [history().carry_policy, {
      kind: "reviewed_no_carryback",
      reference: "nonfarm",
      nonfarming_loss_only: true,
    }]
  ) {
    const r = calculateForm172CarryHistory(origin2024(), {
      ...history(),
      carry_policy,
      annual_reviews: [],
    });
    assertEquals(r.openingLoss, 100000);
    assertEquals(r.expectedYears, []);
  }
  assertThrows(() =>
    calculateForm172CarryHistory(origin(), {
      ...history(),
      carry_policy: {
        kind: "reviewed_no_carryback",
        reference: "nonfarm",
        nonfarming_loss_only: true,
      },
    })
  );
});
Deno.test("Form 172 history requires remaining zero-balance years after exhaustion", () => {
  const h = history();
  h.annual_reviews = h.annual_reviews.map((v) =>
    annual(v.tax_year, v.tax_year === 2020 ? 100000 : 0)
  );
  const r = calculateForm172CarryHistory(origin(), h);
  assertEquals(r.openingLoss, 0);
  assertEquals(r.annualResults.map((a) => a.openingLoss), [100000, 0, 0, 0, 0]);
  assertThrows(() =>
    calculateForm172CarryHistory(origin(), {
      ...h,
      annual_reviews: h.annual_reviews.slice(0, 1),
    })
  );
});
Deno.test("Form 172 history rejects skipped duplicate reordered or foreign-owner annual records", () => {
  const h = history();
  for (
    const rows of [h.annual_reviews.slice(1), [
      h.annual_reviews[0],
      ...h.annual_reviews.slice(0, 4),
    ], [...h.annual_reviews].reverse()]
  ) {
    assertThrows(() =>
      calculateForm172CarryHistory(origin(), { ...h, annual_reviews: rows })
    );
  }
  for (
    const patch of [
      { taxpayer_ssn: "999887777" },
      { return_reference: "return-2021" },
      { tax_year: 2025 },
      { reference: "history" },
      { prior_absorption_records: [] },
    ]
  ) {
    assertThrows(() =>
      calculateForm172CarryHistory(origin(), {
        ...h,
        annual_reviews: [
          { ...h.annual_reviews[0], ...patch },
          ...h.annual_reviews.slice(1),
        ],
      })
    );
  }
});
Deno.test("Form 172 history rejects asserted balances and incomplete policy declarations", () => {
  const h = history();
  assertThrows(() =>
    calculateForm172CarryHistory(origin(), { ...h, opening_loss: 1 })
  );
  assertThrows(() =>
    calculateForm172CarryHistory(origin(), {
      ...h,
      carry_policy: { ...h.carry_policy, waiver_timeliness_reviewed: false },
    })
  );
  assertThrows(() =>
    calculateForm172CarryHistory({ ...origin(), nol_amount: 100000 }, h)
  );
  assertThrows(() =>
    calculateForm172CarryHistory(origin(), {
      ...h,
      annual_reviews: [{
        ...h.annual_reviews[0],
        prior_absorption_records: [{ absorbed: 1 }],
      }, ...h.annual_reviews.slice(1)],
    })
  );
});
