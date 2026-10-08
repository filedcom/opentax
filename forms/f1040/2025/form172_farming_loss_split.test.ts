import { assertEquals, assertThrows } from "@std/assert";
import { calculateForm172FarmingLossSplit } from "./form172_farming_loss_split.ts";
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
Deno.test("Form 172 farming split recomputes two portions from identified original items", () => {
  const o = origin();
  o.noncapital_deductions[0].amount = 60000;
  o.noncapital_deductions.push({
    item_id: "other-expenses",
    reference: "other-business",
    owner_ssn: "111223333",
    amount: 50000,
    business: true,
    location: "agi",
  });
  const r = calculateForm172FarmingLossSplit(o, {
    ...review(),
    nonfarming_business_item_ids: o.noncapital_deductions.some((d) =>
        d.item_id === "other-expenses"
      )
      ? ["other-expenses"]
      : o.noncapital_income.some((d) => d.item_id === "other-income")
      ? ["other-income"]
      : [],
  });
  assertEquals(r.originLoss, 100000);
  assertEquals(r.farmingOnlyNol, 50000);
  assertEquals(r.farmingLoss, 50000);
  assertEquals(r.nonfarmingLoss, 50000);
  assertEquals(r.farmingItemReferences, [{
    item_id: "receipts",
    reference: "receipts",
  }, { item_id: "expenses", reference: "expenses" }]);
  assertEquals(r.farmingSplitArithmeticReconciled, true);
  assertEquals(r.portionCarryHistoriesReconciled, false);
  assertEquals(r.filingReady, false);
});
Deno.test("Form 172 farm-only loss is capped by full origin after other-business income", () => {
  const o = origin();
  o.noncapital_income.push({
    item_id: "other-income",
    reference: "other-income-source",
    owner_ssn: "111223333",
    amount: 30000,
    business: true,
  });
  o.reviewed_form1040.line11_agi = -70000;
  const r = calculateForm172FarmingLossSplit(o, {
    ...review(),
    nonfarming_business_item_ids: o.noncapital_deductions.some((d) =>
        d.item_id === "other-expenses"
      )
      ? ["other-expenses"]
      : o.noncapital_income.some((d) => d.item_id === "other-income")
      ? ["other-income"]
      : [],
  });
  assertEquals(r.farmingOnlyNol, 100000);
  assertEquals(r.originLoss, 70000);
  assertEquals(r.farmingLoss, 70000);
  assertEquals(r.nonfarmingLoss, 0);
});
Deno.test("Form 172 positive farm activity leaves nonfarm loss in remaining portion", () => {
  const o = origin();
  o.noncapital_deductions[0].amount = 5000;
  o.noncapital_deductions.push({
    item_id: "other-expenses",
    reference: "other-business",
    owner_ssn: "111223333",
    amount: 100000,
    business: true,
    location: "agi",
  });
  o.reviewed_form1040.line11_agi = -95000;
  const r = calculateForm172FarmingLossSplit(o, {
    ...review(),
    nonfarming_business_item_ids: o.noncapital_deductions.some((d) =>
        d.item_id === "other-expenses"
      )
      ? ["other-expenses"]
      : o.noncapital_income.some((d) => d.item_id === "other-income")
      ? ["other-income"]
      : [],
  });
  assertEquals(r.farmingOnlyNol, 0);
  assertEquals(r.nonfarmingLoss, 95000);
});
Deno.test("Form 172 historic farming subset excludes DPAD and exemptions from new loss", () => {
  const o = legacy();
  const r = calculateForm172FarmingLossSplit(o, review(2017, o.reference));
  assertEquals(r.originYear, 2017);
  assertEquals(r.farmingOnlyNol, 100000);
  assertEquals(r.farmingLoss, 100000);
});
Deno.test("Form 172 farm capital-loss deduction cannot create extra farming loss", () => {
  const o = origin();
  o.capital_losses.push(
    {
      item_id: "farm-capital",
      reference: "farm-capital-review",
      owner_ssn: "111223333",
      amount: 10000,
      business: true,
    } as never,
  );
  o.reviewed_form1040.line11_agi -= 3000;
  const v = review();
  v.farming_item_ids.push("farm-capital");
  const r = calculateForm172FarmingLossSplit(o, v);
  assertEquals(r.originLoss, 100000);
  assertEquals(r.farmingOnlyNol, 100000);
});
Deno.test("Form 172 farming split rejects invented duplicate nonbusiness or old-NOL selections", () => {
  const o = origin();
  for (
    const ids of [["invented"], ["receipts", "receipts"], ["standard"], [
      "prior",
    ]]
  ) {
    assertThrows(() =>
      calculateForm172FarmingLossSplit(o, {
        ...review(),
        farming_item_ids: ids,
      })
    );
  }
  assertThrows(() =>
    calculateForm172FarmingLossSplit(o, { ...review(), farming_loss: 50000 })
  );
});
Deno.test("Form 172 farming split rejects mismatched identity unreconciled origin and missing reviews", () => {
  const o = origin();
  for (
    const patch of [
      { origin_reference: "wrong" },
      { tax_year: 2020 },
      { taxpayer_ssn: "999887777" },
      { section263a_farming_classification_reviewed: false },
      { loss_limitations_refigured_for_farming_subset: false },
    ]
  ) {
    assertThrows(() =>
      calculateForm172FarmingLossSplit(o, { ...review(), ...patch })
    );
  }
  o.reviewed_form1040.line11_agi = -1;
  assertThrows(() => calculateForm172FarmingLossSplit(o, review()));
});
