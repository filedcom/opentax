import { assertEquals, assertThrows } from "@std/assert";
import { calculateReviewedLegacyLossYear } from "./form172_legacy_loss_year.ts";
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
Deno.test("Form 172 legacy origin excludes personal exemptions and DPAD from loss", () => {
  const r = calculateReviewedLegacyLossYear(legacy());
  assertEquals(r.taxYear, 2017);
  assertEquals(r.regularNol, 100000);
  assertEquals(r.trueTaxableIncome, -113400);
  assertEquals(r.personalExemptionModification, 4050);
  assertEquals(r.section199Modification, 3000);
  assertEquals(r.section172CalculationLines[1], -106350);
  assertEquals(r.carryAvailabilityVerified, false);
  assertEquals(r.filingReady, false);
});
Deno.test("Form 172 legacy DPAD-only or exemption-only negative income creates no NOL", () => {
  for (const dpad of [0, 3000]) {
    const v = legacy();
    v.inventory.noncapital_income[0].amount = 1000;
    v.inventory.noncapital_deductions = [];
    v.section199_deduction.amount = dpad;
    v.reviewed_form1040.agi = 1000 - dpad;
    v.reviewed_form1040.standard_or_itemized_deduction = 0;
    assertEquals(calculateReviewedLegacyLossYear(v).regularNol, 0);
  }
});
Deno.test("Form 172 legacy capital loss and earlier NOL do not create another origin", () => {
  const v = legacy();
  v.inventory.capital_losses.push(
    {
      item_id: "capital",
      reference: "capital-review",
      owner_ssn: "111223333",
      amount: 10000,
      business: false,
    } as never,
  );
  v.inventory.prior_nol_deductions.push(
    {
      item_id: "prior",
      reference: "prior-review",
      owner_ssn: "111223333",
      amount: 20000,
    } as never,
  );
  v.reviewed_form1040.agi -= 23000;
  const r = calculateReviewedLegacyLossYear(v);
  assertEquals(r.regularNol, 100000);
  assertEquals(r.capitalLossDeduction, 3000);
  assertEquals(r.section172CalculationLines[23], 20000);
});
Deno.test("Form 172 legacy review preserves oldest supported origin year", () => {
  const v = legacy();
  v.tax_year = 2005;
  v.reviewed_form1040.tax_year = 2005;
  v.inventory.noncapital_deductions[1].amount = 5000;
  v.reviewed_form1040.standard_or_itemized_deduction = 5000;
  v.reviewed_form1040.personal_exemptions = 3200;
  assertEquals(calculateReviewedLegacyLossYear(v).taxYear, 2005);
  assertEquals(calculateReviewedLegacyLossYear(v).regularNol, 100000);
});
Deno.test("Form 172 legacy review rejects mismatched source totals identity and scalar losses", () => {
  const v = legacy();
  for (
    const patch of [{ agi: -1 }, { tax_year: 2016 }, {
      taxpayer_ssn: "999887777",
    }, { reported_taxable_income: 1 }]
  ) {
    assertThrows(() =>
      calculateReviewedLegacyLossYear({
        ...v,
        reviewed_form1040: { ...v.reviewed_form1040, ...patch },
      })
    );
  }
  assertThrows(() =>
    calculateReviewedLegacyLossYear({ ...v, nol_amount: 100000 })
  );
  assertThrows(() => calculateReviewedLegacyLossYear({ ...v, tax_year: 2018 }));
});
Deno.test("Form 172 legacy review retains duplicate owner and DPAD separation checks", () => {
  const v = legacy();
  v.inventory.noncapital_income[0].owner_ssn = "999887777";
  assertThrows(() => calculateReviewedLegacyLossYear(v));
  const d = legacy();
  d.inventory.noncapital_income.push({ ...d.inventory.noncapital_income[0] });
  assertThrows(() => calculateReviewedLegacyLossYear(d));
  const p = legacy();
  p.inventory.noncapital_deductions[0].reference = "dpad-review";
  assertThrows(() => calculateReviewedLegacyLossYear(p));
});
