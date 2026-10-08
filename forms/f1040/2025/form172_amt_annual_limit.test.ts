import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateForm172AmtAnnualLimit,
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
