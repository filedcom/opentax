import { assertEquals, assertThrows } from "@std/assert";
import { calculateReviewedAmtLossYear } from "./form172_amt_loss_year.ts";

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
Deno.test("Form 172 AMT origin independently refigures business deductions", () => {
  const r = calculateReviewedAmtLossYear(origin(), amt());
  assertEquals(r.regularNol, 100000);
  assertEquals(r.amtNol, 80000);
  assertEquals(r.amtLines[1], -80000);
  assertEquals(r.amtOriginWorkpaperArithmeticReconciled, true);
  assertEquals(r.amtCarryAvailabilityVerified, false);
  assertEquals(r.filingReady, false);
});
Deno.test("Form 172 AMT origin refigures nonbusiness limitation from AMT income", () => {
  const v = amt();
  v.amt_inventory.noncapital_income.push({
    item_id: "pab",
    reference: "pab-review",
    owner_ssn: "111223333",
    amount: 10000,
    business: false,
  });
  v.amt_inventory.noncapital_deductions[1].amount = 5000;
  v.reviewed_amt.amti_before_atnold = -75000;
  const r = calculateReviewedAmtLossYear(origin(), v);
  assertEquals(r.amtLines[6], 5000);
  assertEquals(r.amtLines[7], 10000);
  assertEquals(r.amtLines[9], 0);
  assertEquals(r.amtNol, 75000);
});
Deno.test("Form 172 AMT origin removes QBI and section250 from the modified base", () => {
  const v = amt();
  v.reviewed_amt.qbi_deduction = 5000;
  v.reviewed_amt.section250_deduction = 2000;
  v.reviewed_amt.amti_before_atnold = -87000;
  const r = calculateReviewedAmtLossYear(origin(), v);
  assertEquals(r.amtSection172ModifiedBase, -80000);
  assertEquals(r.amtNol, 80000);
});
Deno.test("Form 172 AMT origin separately applies capital loss limitation", () => {
  const v = amt();
  v.amt_inventory.capital_losses.push(
    {
      item_id: "amt-capital",
      reference: "amt-capital-review",
      owner_ssn: "111223333",
      amount: 10000,
      business: false,
    } as never,
  );
  v.reviewed_amt.amti_before_atnold = -83000;
  const r = calculateReviewedAmtLossYear(origin(), v);
  assertEquals(r.amtCapitalLossDeduction, 3000);
  assertEquals(r.amtLines[20], 7000);
  assertEquals(r.amtNol, 80000);
});
Deno.test("Form 172 AMT origin rejects scalar ATNOL mismatched totals and identity", () => {
  const v = amt();
  for (
    const patch of [{ amti_before_atnold: -1 }, { tax_year: 2020 }, {
      taxpayer_ssn: "999887777",
    }, { all_amt_adjustments_and_preferences_applied: false }]
  ) {
    assertThrows(() =>
      calculateReviewedAmtLossYear(origin(), {
        ...v,
        reviewed_amt: { ...v.reviewed_amt, ...patch },
      })
    );
  }
  assertThrows(() =>
    calculateReviewedAmtLossYear(origin(), { ...v, amt_nol: 80000 })
  );
  assertThrows(() =>
    calculateReviewedAmtLossYear(origin(), {
      ...v,
      regular_origin_reference: "wrong",
    })
  );
});
Deno.test("Form 172 AMT origin preserves owner duplicate and exclusion refinements", () => {
  const v = amt();
  v.amt_inventory.noncapital_income[0].owner_ssn = "999887777";
  assertThrows(() => calculateReviewedAmtLossYear(origin(), v));
  const duplicate = amt();
  duplicate.amt_inventory.noncapital_income.push({
    ...duplicate.amt_inventory.noncapital_income[0],
  });
  assertThrows(() => calculateReviewedAmtLossYear(origin(), duplicate));
  const prior = amt();
  prior.amt_inventory.prior_nol_deductions.push(
    {
      item_id: "prior",
      reference: "prior",
      owner_ssn: "111223333",
      amount: 1,
    } as never,
  );
  assertThrows(() => calculateReviewedAmtLossYear(origin(), prior));
});
