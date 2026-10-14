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
Deno.test("Form172 historical AMT origin independently restores section199 without personal exemptions", () => {
  for (const year of [2005, 2010, 2017]) {
    const { old, alternative } = historicalSources(year);
    const r = calculateReviewedAmtLossYear(old, alternative);
    assertEquals(r.taxYear, year);
    assertEquals(r.regularNol, 100000);
    assertEquals(r.amtNol, 80000);
    assertEquals(r.amtSection199Modification, 3000);
    assertEquals(r.amtSection172ModifiedBase, -80000);
    assertEquals(r.priorAcceptanceVerified, false);
    assertEquals(r.filingReady, false);
  }
});
Deno.test("Form172 historical AMT origin rejects missing DPAD modern deductions and mixed review years", () => {
  const { old, alternative } = historicalSources();
  for (
    const patch of [
      { section199_deduction: undefined },
      { qbi_deduction: 1 },
      { section250_deduction: 1 },
      { tax_year: 2018 },
      { section199_deduction: { reference: "amt-items", amount: 3000 } },
      { section199_deduction: { reference: "expenses", amount: 3000 } },
    ]
  ) {
    assertThrows(() =>
      calculateReviewedAmtLossYear(old, {
        ...alternative,
        reviewed_amt: { ...alternative.reviewed_amt, ...patch },
      })
    );
  }
  assertThrows(() =>
    calculateReviewedAmtLossYear(old, {
      ...alternative,
      amt_inventory: {
        ...alternative.amt_inventory,
        limitations_review: amt().amt_inventory.limitations_review,
      },
    })
  );
  assertThrows(() =>
    calculateReviewedAmtLossYear(origin(), {
      ...amt(),
      reviewed_amt: {
        ...amt().reviewed_amt,
        section199_deduction: { reference: "modern-dpad", amount: 3000 },
      },
    })
  );
});

import { stageForm172AmtReviewSource } from "./form172_amt_review_source.ts";
import {
  form172AmtLegacyTentativeLines,
  form172AmtTentativeLines,
} from "./form172_amt_annual_limit.ts";
Deno.test("Form172 retained historical regular and independent AMT origins reproduce modern annual cap", async () => {
  const { old, alternative } = historicalSources();
  const annual = {
    reference: "current-amt-review",
    tax_year: 2024,
    taxpayer_ssn: "111223333",
    form6251_reference: "current-6251",
    before_all_atnold: true,
    tentative_depletion_refigured_with_zero_atnold: true,
    components: form172AmtTentativeLines.map((line) => ({
      line,
      reference: `current-${line}`,
      amount: line === "1"
        ? 50000
        : line === "2e"
        ? 40000
        : line === "2l"
        ? 10000
        : 0,
    })),
  };
  const docs = [old, alternative, annual].map((v) => ({
    reference: v.reference,
    bytes: new TextEncoder().encode(JSON.stringify(v)),
  }));
  const claims = await Promise.all(
    docs.map(async (d) => ({
      reference: d.reference,
      sha256: Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", d.bytes)),
        (b) => b.toString(16).padStart(2, "0"),
      ).join(""),
    })),
  );
  const r = await stageForm172AmtReviewSource({
    regular_origin: claims[0],
    amt_origin: claims[1],
    annual: claims[2],
    origin_tax_year: 2017,
    application_tax_year: 2024,
    taxpayer_ssn: "111223333",
  }, docs);
  assertEquals(r.originYear, 2017);
  assertEquals(r.originAmtNol, 80000);
  assertEquals(r.tentativeAmtiBeforeAtnold, 100000);
  assertEquals(r.ordinary90PercentLimit, 90000);
  assertEquals(r.reviewPackageBytesVerified, true);
  assertEquals(r.amtCarryAvailabilityVerified, false);
  assertEquals(r.filingReady, false);
});

Deno.test("Form172 retained historical regular and independent AMT origins reproduce historical annual cap with separate section199", async () => {
  const { old, alternative } = historicalSources();
  const annual = {
    reference: "current-amt-review",
    tax_year: 2016,
    taxpayer_ssn: "111223333",
    form6251_reference: "current-6251",
    before_all_atnold: true,
    tentative_depletion_refigured_with_zero_atnold: true,
    section199_deduction: { reference: "annual-dpad", amount: 3000 },
    components: form172AmtLegacyTentativeLines.map((line) => ({
      line,
      reference: `current-${line}`,
      amount: line === "1"
        ? 50000
        : line === "10"
        ? 40000
        : line === "18"
        ? 10000
        : 0,
    })),
  };
  const docs = [old, alternative, annual].map((v) => ({
    reference: v.reference,
    bytes: new TextEncoder().encode(JSON.stringify(v)),
  }));
  const claims = await Promise.all(
    docs.map(async (d) => ({
      reference: d.reference,
      sha256: Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", d.bytes)),
        (b) => b.toString(16).padStart(2, "0"),
      ).join(""),
    })),
  );
  const r = await stageForm172AmtReviewSource({
    regular_origin: claims[0],
    amt_origin: claims[1],
    annual: claims[2],
    origin_tax_year: 2017,
    application_tax_year: 2016,
    taxpayer_ssn: "111223333",
  }, docs);
  assertEquals(r.originYear, 2017);
  assertEquals(r.originAmtNol, 80000);
  assertEquals(r.tentativeAmtiBeforeAtnold, 100000);
  assertEquals(r.ordinary90PercentLimit, 92700);
  assertEquals(r.reviewPackageBytesVerified, true);
  assertEquals(r.amtCarryAvailabilityVerified, false);
  assertEquals(r.filingReady, false);
});
