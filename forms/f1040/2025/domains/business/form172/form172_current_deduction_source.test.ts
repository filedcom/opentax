import { assertEquals, assertRejects } from "@std/assert";
import { stageForm172CurrentDeductionSource } from "./form172_current_deduction_source.ts";
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
Deno.test("Form172 retained current packages reproduce regular and mixed deduction and closing", async () => {
  for (const mixedKind of [false, true]) {
    const { documents, binding } = await source(mixedKind);
    const r = await stageForm172CurrentDeductionSource(binding, documents);
    assertEquals(r.historyOpeningLoss, mixedKind ? 36000 : 44000);
    assertEquals(r.deduction, mixedKind ? 24000 : 16000);
    assertEquals(r.carryTo2026, mixedKind ? 12000 : 28000);
    assertEquals(r.review_package_manifest.length, mixedKind ? 4 : 3);
    assertEquals(r.reviewPackageBytesVerified, true);
    for (
      const flag of [
        r.issuerAuthenticityVerified,
        r.sourceAuthenticityVerified,
        r.acceptedCarryImportVerified,
        r.publicForm1040JoinVerified,
        r.amtNolReconciled,
        r.packetAdmissionVerified,
        r.filingReady,
      ]
    ) assertEquals(flag, false);
  }
});
Deno.test("Form172 current source rejects every tampered missing duplicate and extra package", async () => {
  for (const mixedKind of [false, true]) {
    const { documents, binding } = await source(mixedKind);
    for (let i = 0; i < documents.length; i++) {
      const changed = documents.map((d) => ({
        ...d,
        bytes: new Uint8Array(d.bytes),
      }));
      changed[i].bytes[0] = 32;
      await assertRejects(() =>
        stageForm172CurrentDeductionSource(binding, changed)
      );
      await assertRejects(() =>
        stageForm172CurrentDeductionSource(
          binding,
          documents.filter((_, n) => n !== i),
        )
      );
    }
    await assertRejects(() =>
      stageForm172CurrentDeductionSource(binding, [...documents, documents[0]])
    );
    await assertRejects(() =>
      stageForm172CurrentDeductionSource(binding, [...documents, {
        ...documents[0],
        reference: "extra",
      }])
    );
  }
});
Deno.test("Form172 current source rejects owner year kind and asserted result substitutions", async () => {
  const { documents, binding } = await source();
  for (
    const patch of [
      { origin_tax_year: 2020 },
      { tax_year: 2024 },
      { taxpayer_ssn: "999887777" },
      { spouse_ssn: "999887777" },
      { history_kind: "mixed_farming" },
      { farming_review: binding.origin },
      { deduction: 16000 },
    ]
  ) {
    await assertRejects(() =>
      stageForm172CurrentDeductionSource({ ...binding, ...patch }, documents)
    );
  }
  const mixedSource = await source(true);
  await assertRejects(() =>
    stageForm172CurrentDeductionSource({
      ...mixedSource.binding,
      history_kind: "regular",
    }, mixedSource.documents)
  );
});
Deno.test("Form172 current source recomputes current and historical facts after replacement digest", async () => {
  const { documents, binding } = await source();
  for (
    const patch of [{ reference: "different" }, {
      history_kind: "mixed_farming",
    }, {
      annual_review: { ...current().annual_review, taxpayer_ssn: "999887777" },
    }, {
      annual_review: { ...current().annual_review, reported_taxable_income: 1 },
    }, {
      annual_review: {
        ...current().annual_review,
        prior_absorption_records: [],
      },
    }]
  ) {
    const bytes = new TextEncoder().encode(
      JSON.stringify({ ...current(), ...patch }),
    );
    await assertRejects(async () =>
      stageForm172CurrentDeductionSource({
        ...binding,
        current_review: { ...binding.current_review, sha256: await sha(bytes) },
      }, [documents[0], documents[1], {
        reference: binding.current_review.reference,
        bytes,
      }])
    );
  }
  const badHistory = JSON.parse(new TextDecoder().decode(documents[1].bytes));
  badHistory.annual_reviews.pop();
  const bytes = new TextEncoder().encode(JSON.stringify(badHistory));
  await assertRejects(async () =>
    stageForm172CurrentDeductionSource({
      ...binding,
      history: { ...binding.history, sha256: await sha(bytes) },
    }, [
      documents[0],
      { reference: binding.history.reference, bytes },
      documents[2],
    ])
  );
});
Deno.test("Form172 current source rejects noncanonical duplicate keys and invalid UTF8", async () => {
  const { documents, binding } = await source();
  const text = new TextDecoder().decode(documents[2].bytes);
  for (
    const bytes of [
      new TextEncoder().encode("\ufeff" + text),
      new TextEncoder().encode(text + " "),
      new TextEncoder().encode(
        text.replace(
          '"history_kind":"regular"',
          '"history_kind":"regular","history_kind":"regular"',
        ),
      ),
      new Uint8Array([0xff]),
      new Uint8Array(5_000_001),
    ]
  ) {
    await assertRejects(async () =>
      stageForm172CurrentDeductionSource({
        ...binding,
        current_review: { ...binding.current_review, sha256: await sha(bytes) },
      }, [documents[0], documents[1], {
        reference: binding.current_review.reference,
        bytes,
      }])
    );
  }
});
Deno.test("Form172 current source owns bindings and every byte before first await", async () => {
  const { documents, binding } = await source(true);
  const pending = stageForm172CurrentDeductionSource(binding, documents);
  binding.taxpayer_ssn = "999887777";
  binding.current_review.sha256 = "0".repeat(64);
  binding.farming_review!.reference = "changed";
  for (const d of documents) {
    d.bytes.fill(32);
    d.reference = "changed";
  }
  const r = await pending;
  assertEquals(r.deduction, 24000);
  assertEquals(r.carryTo2026, 12000);
});
