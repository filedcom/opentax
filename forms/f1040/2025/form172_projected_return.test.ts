import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { stageForm172ProjectedReturn } from "./form172_projected_return.ts";
import { passiveK1Inputs } from "./eic_passive_k1.fixture.ts";
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
