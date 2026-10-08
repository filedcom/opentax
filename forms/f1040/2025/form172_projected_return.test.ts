import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { stageForm172ProjectedReturn } from "./form172_projected_return.ts";
import { passiveK1Inputs, passiveK1Item } from "./eic_passive_k1.fixture.ts";
import { assertAttachmentCoverage } from "./attachment-coverage.ts";
import educationSource from "./pdf/review-8863-scholarship-source.json" with {
  type: "json",
};
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
Deno.test("Form172 projection sends retained deduction through Schedule1 AGI and regular tax graph", async () => {
  for (const mixedKind of [false, true]) {
    const f = await fixture(mixedKind);
    const r = await stageForm172ProjectedReturn(
      f.inputs,
      f.binding,
      f.documents,
    );
    assertEquals(r.deduction, 27400);
    assertEquals(r.projected_schedule1.line8a_nol_deduction, 27400);
    assertEquals(r.projected_schedule1.line10_total_additional_income, -27400);
    assertEquals(r.projected_form1040.line8_additional_income, -27400);
    assertEquals(r.projected_form1040.line11_agi, 22600);
    assertEquals(r.projected_form1040.line15_taxable_income, 6850);
    assertEquals(
      Number(r.projected_form1040.line16_income_tax) <
        Number(r.current_form1040_before_nol.line16_income_tax),
      true,
    );
    assertEquals(r.projected_form1040.line1a_wages, 50000);
    assertEquals(r.projected_pending.form6251?.line2e_regular_nol, 27400);
    assertEquals(r.projected_pending.form6251?.amti, 50000);
    assertEquals(r.amtRegularNolAddbackReconciled, true);
    assertEquals(r.baseGraphNolProjectionReconciled, true);
    assertEquals(r.currentAgiDependentRefiguresVerified, false);
    assertEquals(r.amtNolReconciled, false);
    assertEquals(r.filingReady, false);
    for (const kind of ["pdf", "mef"] as const) {
      assertThrows(
        () => assertAttachmentCoverage(r.projected_pending, kind),
        Error,
        "Form 172",
      );
    }
  }
});
Deno.test("Form172 projection rejects detached NOL shortcuts", async () => {
  const f = await fixture();
  await assertRejects(() =>
    stageForm172ProjectedReturn(
      {
        ...f.inputs,
        nol_carryforward: {
          nol_carryforwards: [{
            year: 2019,
            nol_amount: 100000,
            nol_type: "POST2017",
          }],
          current_year_taxable_income: 34250,
        },
      },
      f.binding,
      f.documents,
    )
  );
  await assertRejects(() =>
    stageForm172ProjectedReturn(
      { ...f.inputs, schedule1: { line8a_nol_deduction: 27400 } },
      f.binding,
      f.documents,
    )
  );
});
async function seniorFixture(amount = 6000, seniorAmount = amount) {
  const f = await fixture();
  f.inputs.general = {
    ...passiveK1Inputs().general,
    taxpayer_dob: "1950-06-15",
  };
  const review = {
    ...f.currentReview,
    annual_review: {
      ...f.currentReview.annual_review,
      standard_or_itemized_deduction: 17750,
      reported_taxable_income: 50000 - 17750 - amount,
      schedule1a_deduction: {
        reference: "current senior Schedule1-A",
        amount,
        senior_amount: seniorAmount,
      },
      refigured_schedule1a_deduction: {
        reference: "modified senior Schedule1-A",
        amount,
        senior_amount: seniorAmount,
      },
    },
  };
  const bytes = new TextEncoder().encode(JSON.stringify(review));
  f.documents[2] = { reference: review.reference, bytes };
  f.binding.current_review.sha256 = await sha(bytes);
  return f;
}
Deno.test("Form172 retained senior Schedule1-A joins public deduction and lowers current NOL capacity", async () => {
  const f = await seniorFixture();
  const r = await stageForm172ProjectedReturn(f.inputs, f.binding, f.documents);
  assertEquals(r.current_form1040_before_nol.line12c_deduction_total, 17750);
  assertEquals(
    r.current_form1040_before_nol.line13b_additional_deductions,
    6000,
  );
  assertEquals(r.current_form1040_before_nol.line15_taxable_income, 26250);
  assertEquals(r.deduction, 21000);
  assertEquals(r.currentAnnualCalculation.taxableWithoutNolQbi250, 26250);
  assertEquals(r.carryTo2026, 17000);
  assertEquals(r.currentAnnualCalculation.absorbed, 27000);
  assertEquals(
    r.currentAnnualCalculation.seniorDeductionAbsorptionAddback,
    6000,
  );
  assertEquals(r.projected_form1040.line11_agi, 29000);
  assertEquals(r.projected_form1040.line13b_additional_deductions, 6000);
  assertEquals(r.projected_form1040.line15_taxable_income, 5250);
  assertEquals(r.projected_pending.form6251?.line2e_regular_nol, 21000);
  assertEquals(r.projected_pending.form6251?.regular_tax_income, 11250);
  assertEquals(r.projected_pending.form6251?.amti, 50000);
  assertEquals(r.filingReady, false);
});
Deno.test("Form172 current source rejects an internally consistent wrong senior deduction", async () => {
  for (const f of [await seniorFixture(5000), await seniorFixture(6000, 0)]) {
    await assertRejects(
      () => stageForm172ProjectedReturn(f.inputs, f.binding, f.documents),
      Error,
      "Schedule1-A",
    );
  }
});
Deno.test("Form172 NOL projection reruns education MAGI and credit limitation through actual sources", async () => {
  const f = await fixture();
  const inputs = structuredClone(educationSource.inputs);
  const review = {
    ...f.currentReview,
    annual_review: {
      ...f.currentReview.annual_review,
      agi: 81000,
      reported_taxable_income: 65250,
    },
  };
  const bytes = new TextEncoder().encode(JSON.stringify(review));
  f.documents[2] = { reference: review.reference, bytes };
  f.binding.current_review.sha256 = await sha(bytes);
  const r = await stageForm172ProjectedReturn(inputs, f.binding, f.documents);
  assertEquals(r.current_form1040_before_nol.line11_agi, 81000);
  assertEquals(r.deduction, 44000);
  assertEquals(r.projected_form1040.line11_agi, 37000);
  assertEquals(r.projected_form1040.line15_taxable_income, 21250);
  assertEquals(
    (r.projected_pending.f8863.f8863s as Record<string, unknown>[])[0]
      .filer_magi,
    37000,
  );
  assertEquals(r.projected_pending.schedule3.line3_education_credit, 1500);
  assertEquals(r.projected_form1040.line29_refundable_aoc, 1000);
  assertEquals(
    r.projected_pending.f8863.credit_limit_worksheet,
    {
      ...educationSource.inputs.f8863_credit_limit_worksheet
        .credit_limit_worksheet,
      form1040_line18_tax: r.projected_form1040.line18_total_tax_before_credits,
    },
  );
  assertEquals(inputs.f8863[0].filer_magi, 81000);
  assertEquals(r.filingReady, false);
  assertThrows(
    () => assertAttachmentCoverage(r.projected_pending, "mef"),
    Error,
    "Form 172",
  );
});

// Synthetic review assertions only; no authentic adoption documents claimed.
const syntheticAdoptionSource = {
  filing_status: "single" as const,
  adoption_benefits: 0,
  children: [{
    first_name: "Ada",
    last_name: "Example",
    birth_year: 2020,
    ssn: "111223334",
    final_decree: {
      source_document_id: "decree-1",
      finalization_date: "2025-07-15",
      issuing_jurisdiction: "TX",
      child_origin: "US" as const,
    },
    expenses: [{
      source_document_id: "invoice-1",
      paid_date: "2025-03-12",
      category: "attorney_fee" as const,
      payee: "Adoption Counsel",
      amount: 11_000,
      reimbursed_amount: 0,
    }],
  }],
  reviewed_source: {
    reviewed_by: "Synthetic Adoption Reviewer",
    reviewed_on: "2026-04-01",
    adoption_case_reference: "case-TX-2025-1",
    decree: {
      source_document_id: "decree-1",
      document_sha256: "a".repeat(64),
      child_first_name: "Ada",
      child_last_name: "Example",
      child_ssn: "111223334",
      finalization_date: "2025-07-15",
      issuing_jurisdiction: "TX",
      child_origin: "US" as const,
      taxpayer_named_as_adoptive_parent_confirmed: true as const,
    },
    birth_record: {
      source_document_id: "birth-1",
      document_sha256: "a".repeat(64),
      child_first_name: "Ada",
      child_last_name: "Example",
      date_of_birth: "2020-02-01",
    },
    reviewed_facts: {
      child_us_citizen_or_resident_when_effort_began_confirmed: true as const,
      child_under_18_on_2025_12_31_confirmed: true as const,
      child_not_taxpayers_spouses_child_confirmed: true as const,
      no_other_nonspouse_taxpayer_claim_confirmed: true as const,
      no_prior_form8839_claim_for_child_confirmed: true as const,
      no_employer_adoption_benefits_confirmed: true as const,
      all_reimbursements_disclosed_confirmed: true as const,
      no_other_federal_credit_or_deduction_for_expenses_confirmed:
        true as const,
      no_surrogacy_or_illegal_expenses_confirmed: true as const,
    },
    expenses: [{
      source_document_id: "invoice-1",
      receipt_sha256: "a".repeat(64),
      payment_proof_document_id: "payment-1",
      payment_proof_sha256: "a".repeat(64),
      paid_date: "2025-03-12",
      category: "attorney_fee" as const,
      payee: "Adoption Counsel",
      amount: 11_000,
      directly_related_to_legal_adoption_confirmed: true as const,
    }],
  },
  magi_review: {
    reviewed_by: "Synthetic Return Reviewer",
    reviewed_on: "2026-04-01",
    section933: {
      no_puerto_rico_excluded_income_confirmed: true as const,
      return_wide_review_reference: "territory-review",
    },
    form2555: {
      no_form2555_filing_or_exclusion_confirmed: true as const,
      return_wide_review_reference: "foreign-income-review",
    },
    form4563: {
      no_form4563_filing_or_exclusion_confirmed: true as const,
      return_wide_review_reference: "territory-return-review",
    },
  },
  documents: ["decree-1", "birth-1", "invoice-1", "payment-1"].map((id) => ({
    source_document_id: id,
    file_name: `${id}.pdf`,
    description: `Synthetic unverified ${id}`,
    sha256: "a".repeat(64),
  })),
};
Deno.test("Form172 NOL projection preserves source-dependent adoption finalizer and refund", async () => {
  const f = await fixture();
  const template = passiveK1Inputs();
  const inputs = {
    general: template.general,
    w2: [{ ...template.w2[0], box1_wages: 120000 }],
    form8839: syntheticAdoptionSource,
  };
  const review = {
    ...f.currentReview,
    annual_review: {
      ...f.currentReview.annual_review,
      agi: 120000,
      reported_taxable_income: 104250,
    },
  };
  const bytes = new TextEncoder().encode(JSON.stringify(review));
  f.documents[2] = { reference: review.reference, bytes };
  f.binding.current_review.sha256 = await sha(bytes);
  const r = await stageForm172ProjectedReturn(inputs, f.binding, f.documents);
  assertEquals(r.deduction, 44000);
  assertEquals(r.projected_form1040.line11_agi, 76000);
  assertEquals(r.projected_form1040.line15_taxable_income, 60250);
  assertEquals(r.projected_form1040.line20_nonrefundable_credits, 6000);
  assertEquals(r.projected_form1040.line30_refundable_adoption, 5000);
  assertEquals(
    (r.projected_pending.form8839_route.pre_adoption_sink_input as Record<
      string,
      unknown
    >).line11_agi,
    76000,
  );
  assertEquals(
    r.projected_execution.replayInputs?.f1040.line30_refundable_adoption,
    5000,
  );
  assertEquals(r.sourceAuthenticityVerified, false);
  assertEquals(r.filingReady, false);
});

import { stageForm172AmtProjectedReturn } from "./form172_amt_projected_return.ts";
import { form172Amt2025TentativeLines } from "./form172_amt_annual_limit.ts";
async function amtSource(
  f: Awaited<ReturnType<typeof fixture>>,
  senior = false,
) {
  const regular = JSON.parse(new TextDecoder().decode(f.documents[0].bytes));
  const { reviewed_form1040: _, ...inventory } = structuredClone(regular);
  inventory.reference = "amt-inventory";
  inventory.noncapital_deductions[0].amount -= 20000;
  inventory.noncapital_deductions[1].amount = 0;
  const review = {
    reference: "independent-AMT-origin",
    regular_origin_reference: regular.reference,
    amt_inventory: inventory,
    reviewed_amt: {
      reference: "AMT-origin-return",
      tax_year: regular.tax_year,
      taxpayer_ssn: "111223333",
      amti_before_atnold: -80000,
      qbi_deduction: 0,
      section250_deduction: 0,
      all_amt_adjustments_and_preferences_applied: true,
    },
  };
  const annual = {
    reference: "AMT-current-review",
    tax_year: 2025,
    taxpayer_ssn: "111223333",
    form6251_reference: "AMT-current-return",
    before_all_atnold: true,
    tentative_depletion_refigured_with_zero_atnold: true,
    reviewed_form1040: {
      reference: "projected-current-1040",
      tax_year: 2025,
      taxpayer_ssn: "111223333",
      line11b_agi: senior ? 29000 : 22600,
      line14_deductions: senior ? 23750 : 15750,
      schedule1a_line37_senior_deduction: senior ? 6000 : 0,
    },
    components: form172Amt2025TentativeLines.map((line) => ({
      line,
      reference: `AMT-current-${line}`,
      amount: line === "1b"
        ? senior ? 11250 : 6850
        : line === "2a"
        ? senior ? 17750 : 15750
        : line === "2e"
        ? senior ? 21000 : 27400
        : 0,
    })),
  };
  const documents = [
    f.documents[0],
    ...[review, annual].map((v) => ({
      reference: v.reference,
      bytes: new TextEncoder().encode(JSON.stringify(v)),
    })),
  ];
  const claims = await Promise.all(
    documents.map(async (d) => ({
      reference: d.reference,
      sha256: await sha(d.bytes),
    })),
  );
  const binding = {
    regular_origin: claims[0],
    amt_origin: claims[1],
    annual: claims[2],
    origin_tax_year: regular.tax_year,
    application_tax_year: 2025,
    taxpayer_ssn: "111223333",
  };
  return { documents, binding, annual };
}
Deno.test("Form172 retained independent AMT review matches ordinary mixed and senior tentative graph", async () => {
  for (
    const [f, senior] of [[await fixture(), false], [
      await fixture(true),
      false,
    ], [await seniorFixture(), true]] as const
  ) {
    const a = await amtSource(f, senior);
    const r = await stageForm172AmtProjectedReturn(
      f.inputs,
      f.binding,
      f.documents,
      a.binding,
      a.documents,
    );
    assertEquals(r.currentAmtTentativeGraphReconciled, true);
    assertEquals(r.independent_amt_review.originAmtNol, 80000);
    assertEquals(r.independent_amt_review.tentativeAmtiBeforeAtnold, 50000);
    assertEquals(r.independent_amt_review.ordinary90PercentLimit, 45000);
    assertEquals(r.calculated_tentative_amt_components["2e"], r.deduction);
    assertEquals(r.amtNolReconciled, false);
    assertEquals(r.filingReady, false);
    for (const kind of ["pdf", "mef"] as const) {
      assertThrows(
        () => assertAttachmentCoverage(r.projected_pending, kind),
        Error,
        "Form 172",
      );
    }
  }
});
Deno.test("Form172 AMT graph rejects offsetting component substitutions despite an unchanged total", async () => {
  const f = await fixture();
  const a = await amtSource(f);
  a.annual.components.find((c) => c.line === "2g")!.amount = 100;
  a.annual.components.find((c) => c.line === "2l")!.amount = -100;
  const bytes = new TextEncoder().encode(JSON.stringify(a.annual));
  a.documents[2].bytes = bytes;
  a.binding.annual.sha256 = await sha(bytes);
  await assertRejects(
    () =>
      stageForm172AmtProjectedReturn(
        f.inputs,
        f.binding,
        f.documents,
        a.binding,
        a.documents,
      ),
    Error,
    "line2g differs",
  );
});
Deno.test("Form172 AMT graph rejects internally consistent Form1040 operands differing from actual replay", async () => {
  const f = await fixture();
  const a = await amtSource(f);
  a.annual.reviewed_form1040.line11b_agi++;
  a.annual.reviewed_form1040.line14_deductions++;
  const bytes = new TextEncoder().encode(JSON.stringify(a.annual));
  a.documents[2].bytes = bytes;
  a.binding.annual.sha256 = await sha(bytes);
  await assertRejects(
    () =>
      stageForm172AmtProjectedReturn(
        f.inputs,
        f.binding,
        f.documents,
        a.binding,
        a.documents,
      ),
    Error,
    "AGI differs",
  );
});
Deno.test("Form172 AMT graph requires the identical retained regular origin in both package sets", async () => {
  const f = await fixture();
  const a = await amtSource(f);
  const changed = JSON.parse(new TextDecoder().decode(a.documents[0].bytes));
  changed.limitations_review.reference = "different-valid-review";
  const bytes = new TextEncoder().encode(JSON.stringify(changed));
  a.documents[0] = { reference: changed.reference, bytes };
  a.binding.regular_origin.sha256 = await sha(bytes);
  await assertRejects(
    () =>
      stageForm172AmtProjectedReturn(
        f.inputs,
        f.binding,
        f.documents,
        a.binding,
        a.documents,
      ),
    Error,
    "identical loss-year source",
  );
});
Deno.test("Form172 AMT composition owns both bindings all source bytes and public inputs before await", async () => {
  const f = await fixture();
  const a = await amtSource(f);
  const pending = stageForm172AmtProjectedReturn(
    f.inputs,
    f.binding,
    f.documents,
    a.binding,
    a.documents,
  );
  f.inputs.w2 = [];
  f.binding.origin.sha256 = "0".repeat(64);
  a.binding.annual.sha256 = "0".repeat(64);
  for (const d of [...f.documents, ...a.documents]) d.bytes.fill(32);
  const r = await pending;
  assertEquals(r.projected_form1040.line1a_wages, 50000);
  assertEquals(r.independent_amt_review.tentativeAmtiBeforeAtnold, 50000);
  assertEquals(r.currentAmtTentativeGraphReconciled, true);
});

Deno.test("Form172 post-NOL senior phaseout reruns before the retained finalizer", async () => {
  const f = await seniorFixture(1500);
  f.inputs.w2 = [{ ...passiveK1Inputs().w2[0], box1_wages: 150000 }];
  const review = JSON.parse(new TextDecoder().decode(f.documents[2].bytes));
  review.annual_review.agi = 150000;
  review.annual_review.reported_taxable_income = 130750;
  const bytes = new TextEncoder().encode(JSON.stringify(review));
  f.documents[2].bytes = bytes;
  f.binding.current_review.sha256 = await sha(bytes);
  const r = await stageForm172ProjectedReturn(f.inputs, f.binding, f.documents);
  assertEquals(
    r.current_form1040_before_nol.schedule1a_line37_senior_deduction,
    1500,
  );
  assertEquals(r.deduction, 44000);
  assertEquals(r.projected_form1040.line11_agi, 106000);
  assertEquals(r.projected_form1040.schedule1a_line37_senior_deduction, 4140);
  assertEquals(r.projected_form1040.line15_taxable_income, 84110);
  assertEquals(r.projected_pending.form6251?.amti, 150000);
  assertEquals(r.projected_return_replay_input.line11_agi, 106000);
  assertEquals(r.projectedFinalizerReconciled, true);
  assertEquals(r.currentAgiDependentRefiguresVerified, false);
  assertEquals(r.filingReady, false);
});
Deno.test("Form172 full graph refigures source student-loan interest before finalized AGI", async () => {
  const f = await fixture();
  f.inputs.w2 = [{ ...passiveK1Inputs().w2[0], box1_wages: 95000 }];
  f.inputs.f1098e = [{
    box1_student_loan_interest: 2500,
    lender_name: "Synthetic Lender",
    lender_tin: "123456789",
    borrower_tin: "111223333",
    source_document_reference: "synthetic student loan statement",
  }];
  f.currentReview.annual_review.agi = 94167;
  f.currentReview.annual_review.reported_taxable_income = 78417;
  const bytes = new TextEncoder().encode(JSON.stringify(f.currentReview));
  f.documents[2].bytes = bytes;
  f.binding.current_review.sha256 = await sha(bytes);
  const r = await stageForm172ProjectedReturn(f.inputs, f.binding, f.documents);
  assertEquals(
    r.public_pending_before_nol.schedule1?.line21_student_loan_interest,
    833,
  );
  assertEquals(r.deduction, 44000);
  assertEquals(r.projected_schedule1.line21_student_loan_interest, 2500);
  assertEquals(r.projected_form1040.line11_agi, 48500);
  assertEquals(r.projected_form1040.line15_taxable_income, 32750);
  assertEquals(r.projected_return_replay_input.line11_agi, 48500);
  assertEquals(r.projectedFinalizerReconciled, true);
  assertEquals(r.filingReady, false);
});

Deno.test("Form172 ordinary NOL refigures QBI taxable-income limit without reducing current business QBI", async () => {
  const f = await fixture();
  f.inputs.w2 = [{ ...passiveK1Inputs().w2[0], box1_wages: 20000 }];
  const business = passiveK1Item("partnership", "box1", 30000);
  f.inputs.k1_partnership = [business];
  f.currentReview.annual_review.qbi_deduction = 6000;
  f.currentReview.annual_review.reported_taxable_income = 28250;
  const bytes = new TextEncoder().encode(JSON.stringify(f.currentReview));
  f.documents[2].bytes = bytes;
  f.binding.current_review.sha256 = await sha(bytes);
  const r = await stageForm172ProjectedReturn(f.inputs, f.binding, f.documents);
  assertEquals(r.current_form1040_before_nol.line11_agi, 50000);
  assertEquals(r.current_form1040_before_nol.line13_qbi_deduction, 6000);
  assertEquals(r.deduction, 27400);
  assertEquals(r.currentAnnualCalculation.taxableWithoutNolQbi250, 34250);
  assertEquals(r.projected_form1040.line11_agi, 22600);
  assertEquals(r.projected_pending.form8995?.line1_qbi, 30000);
  assertEquals(r.projected_pending.form8995?.line11, 6850);
  assertEquals(r.projected_pending.form8995?.line14, 1370);
  assertEquals(r.projected_form1040.line13_qbi_deduction, 1370);
  assertEquals(r.projected_form1040.line15_taxable_income, 5480);
  assertEquals(r.projectedFinalizerReconciled, true);
  assertEquals(business.box20z_qbi, 30000);
  assertEquals(business.qualified_business_income_source.statement_qbi, 30000);
  assertEquals(r.amtNolReconciled, false);
  assertEquals(r.filingReady, false);
});

import { calculateBoundedProvisionalATI } from "../nodes/intermediate/forms/form8990/provisional-ati.ts";
import { reconcileBoundedForm8990FinalReturn } from "../nodes/intermediate/forms/form8990/final-reconciliation.ts";
import { executeForm172Form8990Return } from "./form172_form8990_return.ts";
import { f1040_2025 } from "./index.ts";
const interestBaseInputs = {
  general: { filing_status: "single", taxpayer_ssn: "111223333" },
  schedule_c: [{
    business_reference: "C-1",
    line_a_principal_business: "Software consulting",
    line_b_business_code: "541510",
    line_f_accounting_method: "cash",
    line_g_material_participation: true,
    line_1_gross_receipts: 200_000,
    line_12_depletion: 1_000,
    amt_depletion_worksheet: {
      source_reference: "2025 C-1 AMT depletion review",
      all_property_income_and_basis_limits_applied_verified: true,
      no_at_risk_or_basis_limitation_verified: true,
      properties: [{
        property_reference: "C-1-depletion-property",
        regular_allowed_depletion: 1_000,
        amt_allowed_depletion: 1_000,
      }],
    },
    line_13_depreciation: 7_500,
    line_16b_interest_other: 100_000,
  }],
};

const interestSourceRecords = {
  receipts: [{ source_reference: "sale-1", kind: "sale", amount: 200_000 }],
  interestExpenseRecords: [{
    interest_payment_reference: "interest-statement-1",
    debt_proceeds_trace: {
      source_reference: "business-loan-ledger-1",
      debt_disbursed_on: "2024-01-15",
      gross_proceeds: 250_000,
      business_uses: [{
        expenditure_document_reference: "C-1-equipment-invoice",
        spent_on: "2024-01-20",
        amount: 250_000,
        business_reference: "C-1",
      }],
    },
    debtor_taxpayer_ssn: "111223333",
    lender_ein: "987654321",
    debt_account_reference: "BUSINESS-LOAN-1",
    business_reference: "C-1",
    allocation: "nonexcepted_schedule_c_business",
    interest_paid_amount: 100_000,
    line16b_business_interest_amount: 100_000,
  }],
  priorFiledScheduleCs: [2022, 2023, 2024].map((taxYear) => ({
    tax_year: taxYear,
    business_reference: "C-1",
    filed_schedule_c_document_reference: `filed-${taxYear}-schedule-c`,
    filed_taxpayer_ssn: "111223333",
    filed_tax_period_start: `${taxYear}-01-01`,
    filed_tax_period_end: `${taxYear}-12-31`,
    filed_line1_gross_receipts: 33_000_000,
    filed_line2_returns_and_allowances: 1_000_000,
    filed_line3_net_receipts: 32_000_000,
  })),
  priorFiledForm8990: {
    tax_year: 2024,
    filed_form8990_document_reference: "filed-2024-form8990",
    filed_taxpayer_ssn: "111223333",
    filed_line31_disallowed_business_interest: 0,
  },
};

async function interestFixture() {
  const f = await fixture();
  f.inputs = { ...interestBaseInputs, form8990: interestSourceRecords };
  const before = executeForm172Form8990Return(f.inputs);
  const return1040 = before.execution.pending.f1040!;
  const a = f.currentReview.annual_review;
  a.agi = Number(return1040.line11_agi);
  a.qbi_deduction = Math.round(Number(return1040.line13_qbi_deduction));
  a.reported_taxable_income = Math.round(
    Number(return1040.line15_taxable_income),
  );
  const bytes = new TextEncoder().encode(JSON.stringify(f.currentReview));
  f.documents[2] = { reference: f.currentReview.reference, bytes };
  f.binding.current_review.sha256 = await sha(bytes);
  return { ...f, before };
}
Deno.test("Form172 retained NOL composes both sourced interest passes with ATI line9 restoration", async () => {
  const f = await interestFixture();
  const r = await stageForm172ProjectedReturn(f.inputs, f.binding, f.documents);
  const composed = r.form8990_nol_composition!;
  assertEquals(r.deduction, 44000);
  assertEquals(composed.limit.line9, 44000);
  assertEquals(composed.limit.line22, f.before.twoPass.limit.line22);
  assertEquals(composed.limit.line30, f.before.twoPass.limit.line30);
  assertEquals(composed.limit.line31, f.before.twoPass.limit.line31);
  assertEquals(
    composed.limit.line16,
    composed.limit.line7 + composed.limit.line8 + composed.limit.line9 +
      composed.limit.line10 + composed.limit.line11,
  );
  assertEquals(
    Number(r.projected_form1040.line11_agi),
    Number(f.before.execution.pending.f1040!.line11_agi) - 44000,
  );
  assertEquals(
    composed.finalizedReconciliation.selfEmploymentTax,
    f.before.twoPass.finalizedReconciliation.selfEmploymentTax,
  );
  assertEquals(
    Math.round(Number(r.projected_form1040.line13_qbi_deduction)),
    Math.round((Number(r.projected_form1040.line11_agi) - 15750) * .2),
  );
  assertEquals(r.projectedFinalizerReconciled, true);
  assertEquals(r.form8990NolOrderingReconciled, true);
  for (const node of ["schedule1", "agi_aggregator"]) {
    for (const invalid of [NaN, "44000", [44000], 44000.5, -1, 44001]) {
      const corrupt = (result: typeof composed.provisionalReturn) => ({
        ...result,
        pending: {
          ...result.pending,
          [node]: { ...result.pending[node], line8a_nol_deduction: invalid },
        },
      });
      assertThrows(() =>
        calculateBoundedProvisionalATI({
          provisional: composed.provisionalSource,
          returnInputs: interestBaseInputs,
          result: corrupt(composed.provisionalReturn),
          receipts: interestSourceRecords.receipts as Parameters<
            typeof calculateBoundedProvisionalATI
          >[0]["receipts"],
          retainedNolDeduction: 44000,
        })
      );
      assertThrows(() =>
        reconcileBoundedForm8990FinalReturn({
          source: composed.finalizedSource,
          provisionalAti: composed.provisionalAti,
          limit: composed.limit,
          result: corrupt(composed.finalizedReturn),
          retainedNolDeduction: 44000,
        })
      );
    }
  }

  assertEquals(r.filingReady, false);
  assertEquals(r.projected_pending.nol_carryforward !== undefined, true);
  assertEquals(
    f1040_2025.executeReturn(f.inputs).diagnostics.some((d) =>
      d.nodeType === "form8990" && d.message.includes("unfileable")
    ),
    true,
  );
});
Deno.test("Form172 interest composition rejects changed current workpaper and source tracing", async () => {
  const f = await interestFixture();
  f.currentReview.annual_review.agi += 1;
  f.currentReview.annual_review.reported_taxable_income += 1;
  const bytes = new TextEncoder().encode(JSON.stringify(f.currentReview));
  f.documents[2] = { reference: f.currentReview.reference, bytes };
  f.binding.current_review.sha256 = await sha(bytes);
  await assertRejects(() =>
    stageForm172ProjectedReturn(f.inputs, f.binding, f.documents)
  );
  const valid = await interestFixture();
  const bad = structuredClone(interestSourceRecords);
  bad.interestExpenseRecords[0].debtor_taxpayer_ssn = "999887777";
  await assertRejects(() =>
    stageForm172ProjectedReturn(
      { ...valid.inputs, form8990: bad },
      valid.binding,
      valid.documents,
    )
  );
});

Deno.test("Form172 sourced interest and retained AMT review reconcile raw tentative total and filed components", async () => {
  const f = await interestFixture();
  const a = await amtSource(f);
  a.annual.reviewed_form1040.line11b_agi = 80011;
  a.annual.reviewed_form1040.line14_deductions = 28602;
  a.annual.components.forEach((c) =>
    c.amount = c.line === "1b"
      ? 51409
      : c.line === "2a"
      ? 15750
      : c.line === "2e"
      ? 44000
      : 0
  );
  const bytes = new TextEncoder().encode(JSON.stringify(a.annual));
  a.documents[2] = { reference: a.annual.reference, bytes };
  a.binding.annual.sha256 = await sha(bytes);
  const r = await stageForm172AmtProjectedReturn(
    f.inputs,
    f.binding,
    f.documents,
    a.binding,
    a.documents,
  );
  assertEquals(r.form8990NolOrderingReconciled, true);
  assertEquals(r.currentAmtTentativeTotalReconciled, true);
  assertEquals(r.currentAmtTentativeGraphReconciled, true);
  assertEquals(r.calculated_tentative_amt_unrounded, 111158.8);
  assertEquals(r.projected_pending.form6251.amti_before_mfs_addition, 111159);
  assertEquals(r.independent_amt_review.tentativeAmtiBeforeAtnold, 111159);
  assertEquals(r.independent_amt_review.ordinary90PercentLimit, 100043);
  assertEquals(r.amtNolReconciled, false);
  assertEquals(r.filingReady, false);
});

Deno.test("Form172 modified carry income replays capital-loss and student-interest AGI adjustments", async () => {
  const f = await fixture();
  f.inputs.w2 = [{ ...passiveK1Inputs().w2[0], box1_wages: 95000 }];
  f.inputs.f1099b = [{
    recipient_ssn: "111223333",
    payer_tin: "123456789",
    account_number: "SYNTHETIC",
    source_document_reference: "synthetic-loss-statement",
    transaction_id: "loss-sale",
    part: "A",
    description: "Synthetic stock",
    date_acquired: "2025-01-01",
    date_sold: "2025-07-01",
    proceeds: 1000,
    cost_basis: 6000,
  }];
  f.inputs.f1098e = [{
    box1_student_loan_interest: 2500,
    lender_name: "Synthetic Lender",
    lender_tin: "123456789",
    borrower_tin: "111223333",
    source_document_reference: "synthetic interest statement",
  }];
  const a: Record<string, any> = f.currentReview.annual_review;
  a.agi = 90667;
  a.reported_taxable_income = 74917;
  a.capital_loss_deduction.amount = 3000;
  a.agi_refigures = [{
    item_id: "student_loan_interest",
    reference: "modified interest workpaper",
    kind: "deduction",
    before: 1333,
    after: 833,
  }];
  const update = async () => {
    const bytes = new TextEncoder().encode(JSON.stringify(f.currentReview));
    f.documents[2] = { reference: f.currentReview.reference, bytes };
    f.binding.current_review.sha256 = await sha(bytes);
  };
  await update();
  const r = await stageForm172ProjectedReturn(f.inputs, f.binding, f.documents);
  assertEquals(r.currentModifiedIncomeGraphReconciled, true);
  assertEquals(r.currentAnnualCalculation.modifiedAgi, 94167);
  assertEquals(
    r.modified_income_pending.schedule1.line21_student_loan_interest,
    833,
  );
  assertEquals(
    r.public_pending_before_nol.schedule1.line21_student_loan_interest,
    1333,
  );
  assertEquals(r.projected_schedule1.line21_student_loan_interest, 2500);
  assertEquals(r.filingReady, false);
  a.agi_refigures = [];
  await update();
  await assertRejects(() =>
    stageForm172ProjectedReturn(f.inputs, f.binding, f.documents)
  );
});

Deno.test("Form172 modified carry income refigures SSA independently of post-NOL tax", async () => {
  const f = await fixture();
  f.inputs.w2 = [{ ...passiveK1Inputs().w2[0], box1_wages: 22000 }];
  f.inputs.ssa1099 = [{
    recipient_ssn: "111223333",
    box3_gross_benefits: 10000,
    box5_net_benefits: 10000,
  }];
  f.inputs.f1099b = [{
    recipient_ssn: "111223333",
    payer_tin: "123456789",
    account_number: "SYNTHETIC",
    source_document_reference: "synthetic-loss-statement",
    transaction_id: "loss-sale",
    part: "A",
    description: "Synthetic stock",
    date_acquired: "2025-01-01",
    date_sold: "2025-07-01",
    proceeds: 1000,
    cost_basis: 6000,
  }];
  const a: Record<string, any> = f.currentReview.annual_review;
  a.agi = 19000;
  a.reported_taxable_income = 3250;
  a.capital_loss_deduction.amount = 3000;
  a.agi_refigures = [{
    item_id: "taxable_social_security",
    reference: "modified SSA workpaper",
    kind: "income",
    before: 0,
    after: 1000,
  }];
  const update = async () => {
    const bytes = new TextEncoder().encode(JSON.stringify(f.currentReview));
    f.documents[2] = { reference: f.currentReview.reference, bytes };
    f.binding.current_review.sha256 = await sha(bytes);
  };
  await update();
  const r = await stageForm172ProjectedReturn(f.inputs, f.binding, f.documents);
  assertEquals(r.currentAnnualCalculation.modifiedAgi, 23000);
  assertEquals(r.modified_income_pending.f1040.line6b_ss_taxable, 1000);
  assertEquals(r.current_form1040_before_nol.line6b_ss_taxable ?? 0, 0);
  assertEquals(r.projected_form1040.line6b_ss_taxable ?? 0, 0);
  assertEquals(r.deduction, 2600);
  assertEquals(r.currentModifiedIncomeGraphReconciled, true);
  assertEquals(r.filingReady, false);
  a.agi_refigures[0].before = 100;
  a.agi_refigures[0].after = 1100;
  await update();
  await assertRejects(
    () => stageForm172ProjectedReturn(f.inputs, f.binding, f.documents),
    Error,
    "source component",
  );
  a.agi_refigures[0].before = 0;
  a.agi_refigures[0].after = 1000;
  a.section1202_exclusion.amount = 100;
  await update();
  await assertRejects(
    () => stageForm172ProjectedReturn(f.inputs, f.binding, f.documents),
    Error,
    "section1202",
  );
});
