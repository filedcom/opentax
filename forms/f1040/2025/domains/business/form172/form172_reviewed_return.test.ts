import { assertEquals, assertRejects } from "@std/assert";
import { stageForm172ReviewedReturnCalculation } from "./form172_reviewed_return.ts";
import { passiveK1Inputs } from "../../credits/earned-income/eic_passive_k1.fixture.ts";
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

function mixed(year = 2023, farmExpense = 60000) {
  const o = origin();
  o.tax_year = year;
  o.reference = `origin-${year}`;
  o.reviewed_form1040.tax_year = year;
  o.reviewed_form1040.reference = `origin-return-${year}`;
  o.noncapital_deductions[0].amount = farmExpense;
  o.noncapital_deductions.push({
    item_id: "other-expenses",
    reference: "other-business",
    owner_ssn: "111223333",
    amount: 110000 - farmExpense,
    business: true,
    location: "agi",
  });
  const v = {
    ...review(year, o.reference),
    nonfarming_business_item_ids: ["other-expenses"],
  };
  return { o, v };
}
function annual(year: number, base = 0) {
  return {
    reference: `annual-${year}`,
    tax_year: year,
    taxpayer_ssn: "111223333",
    filing_status: "single",
    return_reference: `application-return-${year}`,
    before_current_and_later_nol: true,
    agi: base,
    deduction_method: "itemized",
    standard_or_itemized_deduction: 0,
    qbi_deduction: 0,
    section250_deduction: 0,
    section199_deduction: year < 2018
      ? { reference: `dpad-${year}`, amount: 0 }
      : undefined,
    personal_exemptions: 0,
    reported_taxable_income: base,
    return_nol_deduction: { reference: `nol-${year}`, amount: 0 },
    earlier_nols: [],
    capital_loss_deduction: { reference: `capital-${year}`, amount: 0 },
    section1202_exclusion: { reference: `qsbs-${year}`, amount: 0 },
    agi_refigures: [],
    refigured_itemized_deduction: { reference: `itemized-${year}`, amount: 0 },
  };
}
function history(rows: ReturnType<typeof annual>[], waiver = false) {
  return {
    reference: "mixed-history",
    opening_tax_year: 2025,
    carry_policy: waiver
      ? {
        kind: "reviewed_waiver",
        reference: "waiver",
        waiver_timeliness_reviewed: true,
      }
      : {
        kind: "reviewed_mixed_carryback",
        reference: "carryback",
        farming_carryback_eligibility_reviewed: true,
        section965_years_absent_reviewed: true,
        legacy_general_nonfarm_two_year_rule_reviewed: true,
      },
    annual_reviews: rows,
  };
}

function current(kind = "regular", base = 20000) {
  return {
    reference: "current-deduction-review",
    history_kind: kind,
    annual_review: annual(2025, base),
  };
}
async function sha(bytes: Uint8Array) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new Uint8Array(bytes)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
async function source(mixedKind = false) {
  const { o, v } = mixed();
  const values = mixedKind
    ? [
      o,
      history([annual(2021, 10000), annual(2022, 20000), annual(2024, 50000)]),
      current("mixed_farming", 30000),
      v,
    ]
    : [
      origin(),
      history([
        annual(2020),
        annual(2021, 50000),
        annual(2022, 20000),
        annual(2023),
        annual(2024),
      ], true),
      current(),
    ];
  const documents = values.map((value) => ({
    reference: value.reference,
    bytes: new TextEncoder().encode(JSON.stringify(value)),
  }));
  const claims = await Promise.all(
    documents.map(async (d) => ({
      reference: d.reference,
      sha256: await sha(d.bytes),
    })),
  );
  const binding = {
    origin: claims[0],
    history: claims[1],
    current_review: claims[2],
    origin_tax_year: mixedKind ? 2023 : 2019,
    tax_year: 2025,
    taxpayer_ssn: "111223333",
    history_kind: mixedKind ? "mixed_farming" : "regular",
    ...(mixedKind ? { farming_review: claims[3] } : {}),
  };
  return { documents, binding };
}
async function fixture(mixedKind = false) {
  const { documents, binding } = await source(mixedKind);
  const currentReview = current(mixedKind ? "mixed_farming" : "regular", 50000);
  currentReview.annual_review.deduction_method = "standard";
  currentReview.annual_review.standard_or_itemized_deduction = 15750;
  currentReview.annual_review.reported_taxable_income = 34250;
  delete (currentReview.annual_review as Partial<
    typeof currentReview.annual_review
  >).refigured_itemized_deduction;
  const bytes = new TextEncoder().encode(JSON.stringify(currentReview));
  documents[2] = { reference: currentReview.reference, bytes };
  binding.current_review.sha256 = await sha(bytes);
  const template = passiveK1Inputs();
  const inputs: Record<string, unknown> = {
    general: template.general,
    w2: [{ ...template.w2[0], box1_wages: 50000 }],
  };
  return { inputs, binding, documents, currentReview };
}
Deno.test("Form172 current workpaper matches public wages deduction and retained finalizer", async () => {
  for (const mixedKind of [false, true]) {
    const f = await fixture(mixedKind);
    const r = await stageForm172ReviewedReturnCalculation(
      f.inputs,
      f.binding,
      f.documents,
    );
    assertEquals(r.current_form1040_before_nol.line11_agi, 50000);
    assertEquals(r.current_form1040_before_nol.line15_taxable_income, 34250);
    assertEquals(r.deduction, 27400);
    assertEquals(r.carryTo2026, mixedKind ? 8600 : 16600);
    assertEquals(r.currentReturnStartingAmountsReconciled, true);
    assertEquals(r.publicForm1040JoinVerified, false);
    assertEquals(r.currentAgiDependentRefiguresVerified, false);
    assertEquals(r.filingReady, false);
  }
});
Deno.test("Form172 current workpaper rejects public income identity status and detached sources", async () => {
  const f = await fixture();
  const template = passiveK1Inputs();
  for (
    const patch of [
      { w2: [{ ...template.w2[0], box1_wages: 51000 }] },
      { general: { ...template.general, taxpayer_ssn: "999887777" }, w2: [] },
      { general: { ...template.general, filing_status: "mfs" } },
      { f1040: {} },
      { schedule1: {} },
      { form6251: {} },
      { nol_carryforward: {} },
    ]
  ) {
    await assertRejects(() =>
      stageForm172ReviewedReturnCalculation(
        { ...f.inputs, ...patch },
        f.binding,
        f.documents,
      )
    );
  }
});
Deno.test("Form172 current workpaper rejects internally valid source amounts differing from actual deductions", async () => {
  const f = await fixture();
  for (
    const patch of [
      { standard_or_itemized_deduction: 16000, reported_taxable_income: 34000 },
      { qbi_deduction: 1000, reported_taxable_income: 33250 },
      { capital_loss_deduction: { reference: "capital", amount: 3000 } },
      {
        deduction_method: "itemized",
        refigured_itemized_deduction: { reference: "itemized", amount: 15750 },
      },
      { section250_deduction: 1000, reported_taxable_income: 33250 },
    ]
  ) {
    const bytes = new TextEncoder().encode(
      JSON.stringify({
        ...f.currentReview,
        annual_review: { ...f.currentReview.annual_review, ...patch },
      }),
    );
    await assertRejects(async () =>
      stageForm172ReviewedReturnCalculation(f.inputs, {
        ...f.binding,
        current_review: {
          ...f.binding.current_review,
          sha256: await sha(bytes),
        },
      }, [f.documents[0], f.documents[1], {
        reference: f.currentReview.reference,
        bytes,
      }])
    );
  }
});
Deno.test("Form172 current return owns public input and source bytes during digest awaits", async () => {
  const f = await fixture();
  const pending = stageForm172ReviewedReturnCalculation(
    f.inputs,
    f.binding,
    f.documents,
  );
  f.inputs.general = {};
  f.inputs.w2 = [];
  f.binding.current_review.sha256 = "0".repeat(64);
  for (const d of f.documents) d.bytes.fill(32);
  const r = await pending;
  assertEquals(r.current_form1040_before_nol.line11_agi, 50000);
  assertEquals(r.deduction, 27400);
});
