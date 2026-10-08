import { assertEquals, assertRejects } from "@std/assert";
import { stageForm172FarmingCarrySource } from "./form172_farming_carry_source.ts";
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

async function sha(bytes: Uint8Array) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new Uint8Array(bytes)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
async function source() {
  const { o, v } = mixed();
  const h = history([
    annual(2021, 10000),
    annual(2022, 20000),
    annual(2024, 50000),
  ]);
  const documents = [o, v, h].map((value) => ({
    reference: value.reference,
    bytes: new TextEncoder().encode(JSON.stringify(value)),
  }));
  const claims = await Promise.all(
    documents.map(async (d) => ({
      reference: d.reference,
      sha256: await sha(d.bytes),
    })),
  );
  return {
    documents,
    binding: {
      origin: claims[0],
      farming_review: claims[1],
      history: claims[2],
      origin_tax_year: 2023,
      opening_tax_year: 2025,
      taxpayer_ssn: "111223333",
    },
  };
}
Deno.test("Form 172 three mixed carry source packages reproduce both derived balances", async () => {
  const { documents, binding } = await source();
  const r = await stageForm172FarmingCarrySource(binding, documents);
  assertEquals(r.originLoss, 100000);
  assertEquals(r.farmingLoss, 50000);
  assertEquals(r.nonfarmingLoss, 50000);
  assertEquals(r.farmingOpeningLoss, 26000);
  assertEquals(r.nonfarmingOpeningLoss, 10000);
  assertEquals(r.openingLoss, 36000);
  assertEquals(r.review_package_manifest, [
    binding.origin,
    binding.farming_review,
    binding.history,
  ]);
  assertEquals(r.reviewPackageBytesVerified, true);
  for (
    const flag of [
      r.sourceAuthenticityVerified,
      r.priorAcceptanceVerified,
      r.acceptedCarryImportVerified,
      r.farmingClassificationVerified,
      r.portionCarryHistoriesReconciled,
      r.issuerAuthenticityVerified,
      r.packetAdmissionVerified,
      r.filingReady,
    ]
  ) assertEquals(flag, false);
});
Deno.test("Form 172 mixed carry source rejects tampering missing duplicate and extra packages", async () => {
  const { documents, binding } = await source();
  for (const i of [0, 1, 2]) {
    const changed = documents.map((d) => ({
      ...d,
      bytes: new Uint8Array(d.bytes),
    }));
    changed[i].bytes[0] = 32;
    await assertRejects(() => stageForm172FarmingCarrySource(binding, changed));
  }
  for (
    const docs of [documents.slice(0, 2), [
      documents[0],
      documents[0],
      documents[2],
    ], [...documents, { reference: "extra", bytes: documents[0].bytes }]]
  ) await assertRejects(() => stageForm172FarmingCarrySource(binding, docs));
});
Deno.test("Form 172 mixed carry source rejects owner year and envelope substitutions", async () => {
  const { documents, binding } = await source();
  for (
    const patch of [
      { origin_tax_year: 2022 },
      { opening_tax_year: 2024 },
      { taxpayer_ssn: "999887777" },
      { spouse_ssn: "999887777" },
      { opening_loss: 36000 },
      { farming_review: { ...binding.farming_review, reference: "wrong" } },
    ]
  ) {
    await assertRejects(() =>
      stageForm172FarmingCarrySource({ ...binding, ...patch }, documents)
    );
  }
});
Deno.test("Form 172 mixed carry source recalculates classification and annual facts after digest verification", async () => {
  const { documents, binding } = await source();
  const { v } = mixed();
  v.nonfarming_business_item_ids = [];
  const bytes = new TextEncoder().encode(JSON.stringify(v));
  await assertRejects(async () =>
    stageForm172FarmingCarrySource({
      ...binding,
      farming_review: { ...binding.farming_review, sha256: await sha(bytes) },
    }, [documents[0], { reference: v.reference, bytes }, documents[2]])
  );
  const h = history([annual(2021, 10000), annual(2024, 50000)]);
  const historyBytes = new TextEncoder().encode(JSON.stringify(h));
  await assertRejects(async () =>
    stageForm172FarmingCarrySource({
      ...binding,
      history: { ...binding.history, sha256: await sha(historyBytes) },
    }, [documents[0], documents[1], {
      reference: h.reference,
      bytes: historyBytes,
    }])
  );
});
Deno.test("Form 172 mixed carry source rejects duplicate JSON keys BOM whitespace and invalid UTF8", async () => {
  const { documents, binding } = await source();
  const text = new TextDecoder().decode(documents[2].bytes);
  for (
    const bytes of [
      new TextEncoder().encode("\ufeff" + text),
      new TextEncoder().encode(text + " "),
      new TextEncoder().encode(
        text.replace(
          '"opening_tax_year":2025',
          '"opening_tax_year":2025,"opening_tax_year":2025',
        ),
      ),
      new Uint8Array([0xff]),
    ]
  ) {
    await assertRejects(async () =>
      stageForm172FarmingCarrySource({
        ...binding,
        history: { ...binding.history, sha256: await sha(bytes) },
      }, [documents[0], documents[1], {
        reference: binding.history.reference,
        bytes,
      }])
    );
  }
});
Deno.test("Form 172 mixed carry source owns every binding and package before first digest await", async () => {
  const { documents, binding } = await source();
  const pending = stageForm172FarmingCarrySource(binding, documents);
  binding.taxpayer_ssn = "999887777";
  binding.farming_review.sha256 = "0".repeat(64);
  binding.history.reference = "changed";
  for (const d of documents) {
    d.bytes.fill(32);
    d.reference = "changed";
  }
  const r = await pending;
  assertEquals(r.openingLoss, 36000);
  assertEquals(r.taxpayerSsn, "111223333");
});
