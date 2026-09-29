import { assertEquals, assertThrows } from "@std/assert";
import { k1_trust } from "./index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    estate_trust_name: "Test Trust",
    ...overrides,
  };
}

function compute(items: Record<string, unknown>[]) {
  return k1_trust.compute(
    { taxYear: 2025, formType: "f1040" },
    k1_trust.inputSchema.parse({ k1_trusts: items }),
  );
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

Deno.test("trust K-1 box 12 code A routes signed line 2j amounts per source", () => {
  const source = {
    estate_trust_ein: "123456789",
    source_document_reference: "2025 K-1 box 12",
    box12_codes_b_through_f_absent: true,
    box12_codes_g_through_i_absent: true,
  };
  const outputs = compute([
    minimalItem({ ...source, box12_code_a_amt_adjustment: 3_000 }),
    minimalItem({ ...source, box12_code_a_amt_adjustment: -800 }),
  ]).outputs.filter((row) => row.nodeType === "form6251");
  assertEquals(outputs.map((row) => row.fields.line2j_estates_and_trusts), [
    3_000,
    -800,
  ]);
});

Deno.test("trust K-1 rejects uncoded or incomplete box 12 AMT source", () => {
  assertThrows(() => compute([minimalItem({ box12_amt: 500 })]));
  assertThrows(() =>
    compute([minimalItem({
      box12_code_a_amt_adjustment: 500,
      estate_trust_ein: "123456789",
      source_document_reference: "2025 K-1",
    })])
  );
  assertThrows(() =>
    compute([minimalItem({
      box12_code_a_amt_adjustment: 500,
      estate_trust_ein: "123456789",
      source_document_reference: "2025 K-1",
      box12_codes_b_through_f_absent: true,
    })])
  );
});

Deno.test("trust K-1 uses DNI-limited portfolio income for affirmed Form 4952 source", () => {
  const item = minimalItem({
    distributable_net_income: 300,
    box1_interest: 200,
    box2a_ordinary_dividends: 400,
    box2b_qualified_dividends: 100,
  });
  assertEquals(findOutput(compute([item]), "form4952"), undefined);
  const fields = compute([{
    ...item,
    investment_property_for_form4952: true,
  }]).outputs.filter((output) => output.nodeType === "form4952")
    .map((output) => output.fields);
  assertEquals(fields, [
    { source_k1_interest: 100 },
    { source_k1_dividends: 200 },
    { source_k1_qualified_dividends: 50 },
  ]);
});

Deno.test("estate or trust K-1 orphan-drug code M needs source identity", () => {
  assertThrows(() =>
    compute([minimalItem({ box13_code_m_orphan_drug_credit: 500 })])
  );
  compute([minimalItem({
    entity_type: "trust",
    estate_trust_ein: "123456789",
    source_document_reference: "2025 Trust K-1",
    box13_code_m_orphan_drug_credit: 500,
    orphan_drug_credit_subject_to_passive_activity_limit: false,
  })]);
  assertThrows(() =>
    compute([minimalItem({
      entity_type: "estate",
      estate_trust_ein: "123456789",
      source_document_reference: "2025 Estate K-1",
      box13_credits: 499,
      box13_code_m_orphan_drug_credit: 500,
      orphan_drug_credit_subject_to_passive_activity_limit: false,
    })])
  );
});

Deno.test("estate/trust K-1 code M reaches source-backed Form 3800", () => {
  for (const entity_type of ["estate", "trust"] as const) {
    const item = minimalItem({
      entity_type,
      estate_trust_ein: "123456789",
      source_document_reference: `${entity_type} K-1 2025`,
      box13_code_m_orphan_drug_credit: 1_250,
      orphan_drug_credit_subject_to_passive_activity_limit: false,
    });
    assertEquals(findOutput(compute([item]), "f3800")?.fields, {
      f8820_k1_credit_entries: [{
        source_type: entity_type,
        source_ein: "123456789",
        source_document_reference: `${entity_type} K-1 2025`,
        credit_amount: 1_250,
        subject_to_passive_activity_limit: false,
      }],
    });
    assertEquals(
      findOutput(
        compute([{
          ...item,
          orphan_drug_credit_subject_to_passive_activity_limit: true,
        }]),
        "f3800",
      ),
      undefined,
    );
    assertEquals(
      findOutput(
        compute([{
          ...item,
          orphan_drug_credit_subject_to_passive_activity_limit: true,
        }]),
        "form8582cr",
      )?.fields,
      {
        required_orphan_drug_k1_credits: [{
          source_type: entity_type,
          source_ein: "123456789",
          source_document_reference: `${entity_type} K-1 2025`,
          credit_amount: 1_250,
        }],
      },
    );
  }
});

Deno.test("estate/trust K-1 code ZZ New Markets Credit needs its statement", () => {
  assertThrows(() =>
    compute([minimalItem({
      box13_code_zz_new_markets_credit: 1_250,
    })])
  );
  for (const entity_type of ["estate", "trust"] as const) {
    const item = minimalItem({
      entity_type,
      estate_trust_ein: "123456789",
      source_document_reference: `${entity_type} K-1 2025`,
      box13_code_zz_new_markets_statement_reference:
        "Box 13 ZZ New Markets statement",
      box13_code_zz_new_markets_credit: 1_250,
      new_markets_credit_subject_to_passive_activity_limit: false,
      box13_credits: 1_250,
    });
    assertEquals(findOutput(compute([item]), "f3800")?.fields, {
      f8874_k1_credit_entries: [{
        source_type: entity_type,
        source_ein: "123456789",
        source_document_reference: `${entity_type} K-1 2025`,
        source_statement_reference: "Box 13 ZZ New Markets statement",
        credit_amount: 1_250,
        subject_to_passive_activity_limit: false,
      }],
    });
    assertThrows(() =>
      compute([{
        ...item,
        box13_credits: 1_249,
      }])
    );
    assertEquals(
      findOutput(
        compute([{
          ...item,
          new_markets_credit_subject_to_passive_activity_limit: true,
        }]),
        "form8582cr",
      )?.fields,
      {
        required_new_markets_k1_credits: [{
          source_type: entity_type,
          source_ein: "123456789",
          source_document_reference: `${entity_type} K-1 2025`,
          source_statement_reference: "Box 13 ZZ New Markets statement",
          credit_amount: 1_250,
        }],
      },
    );
  }
});

Deno.test("estate or trust K-1 disabled-access code ZZ needs its named statement", () => {
  assertThrows(() =>
    compute([minimalItem({ box13_code_zz_disabled_access_credit: 500 })])
  );
  compute([minimalItem({
    entity_type: "trust",
    estate_trust_ein: "123456789",
    source_document_reference: "2025 Trust K-1",
    box13_credits: 750.25,
    box13_code_m_orphan_drug_credit: 250,
    orphan_drug_credit_subject_to_passive_activity_limit: false,
    box13_code_zz_disabled_access_credit: 500.25,
    box13_code_zz_disabled_access_statement_reference: "Access statement",
    disabled_access_credit_subject_to_passive_activity_limit: true,
  })]);
  assertThrows(() =>
    compute([minimalItem({
      entity_type: "estate",
      estate_trust_ein: "123456789",
      source_document_reference: "2025 Estate K-1",
      box13_credits: 500,
      box13_code_zz_disabled_access_credit: 500.25,
      box13_code_zz_disabled_access_statement_reference: "Access statement",
      disabled_access_credit_subject_to_passive_activity_limit: true,
    })])
  );
});

Deno.test("estate and trust K-1 nonpassive disabled-access credits enter Form 3800 with both references", () => {
  for (const entity_type of ["estate", "trust"] as const) {
    const item = minimalItem({
      entity_type,
      estate_trust_ein: "123456789",
      source_document_reference: `2025 ${entity_type} K-1`,
      box13_code_zz_disabled_access_credit: 500.25,
      box13_code_zz_disabled_access_statement_reference:
        `${entity_type} disabled-access statement`,
      disabled_access_credit_subject_to_passive_activity_limit: false,
    });
    assertEquals(findOutput(compute([item]), "disabled_access_limit")?.fields, {
      f8826_credit_entries: [{
        source_type: entity_type,
        source_ein: "123456789",
        source_document_reference: `2025 ${entity_type} K-1`,
        source_statement_reference: `${entity_type} disabled-access statement`,
        credit_amount: 500.25,
        subject_to_passive_activity_limit: false,
      }],
    });
    assertEquals(
      findOutput(
        compute([{
          ...item,
          disabled_access_credit_subject_to_passive_activity_limit: true,
        }]),
        "f3800",
      ),
      undefined,
    );
    assertEquals(
      findOutput(
        compute([{
          ...item,
          disabled_access_credit_subject_to_passive_activity_limit: true,
        }]),
        "disabled_access_limit",
      )?.fields,
      {
        required_disabled_access_k1_credits: [{
          source_type: entity_type,
          source_ein: "123456789",
          source_document_reference: `2025 ${entity_type} K-1`,
          source_statement_reference:
            `${entity_type} disabled-access statement`,
          credit_amount: 500.25,
        }],
      },
    );
  }
});

// ── 1. Input schema validation ────────────────────────────────────────────────

Deno.test("empty array throws", () => {
  assertThrows(
    () =>
      k1_trust.compute({ taxYear: 2025, formType: "f1040" }, { k1_trusts: [] }),
    Error,
  );
});

Deno.test("missing estate_trust_name throws", () => {
  assertThrows(
    () =>
      k1_trust.compute({ taxYear: 2025, formType: "f1040" }, {
        k1_trusts: [
          { box1_interest: 100 } as unknown as ReturnType<typeof minimalItem>,
        ],
      }),
    Error,
  );
});

Deno.test("negative box1_interest throws", () => {
  assertThrows(() => compute([minimalItem({ box1_interest: -1 })]), Error);
});

Deno.test("negative box2a_ordinary_dividends throws", () => {
  assertThrows(
    () => compute([minimalItem({ box2a_ordinary_dividends: -5 })]),
    Error,
  );
});

Deno.test("negative box2b_qualified_dividends throws", () => {
  assertThrows(
    () => compute([minimalItem({ box2b_qualified_dividends: -10 })]),
    Error,
  );
});

// ── 2. Per-box routing ────────────────────────────────────────────────────────

Deno.test("box1_interest routes to schedule_b taxable_interest_net", () => {
  const result = compute([minimalItem({ box1_interest: 500 })]);
  const out = findOutput(result, "schedule_b");
  assertEquals(out?.fields.taxable_interest_net, 500);
});

Deno.test("zero box1_interest does not route to schedule_b", () => {
  const result = compute([minimalItem()]);
  const out = findOutput(result, "schedule_b");
  assertEquals(out, undefined);
});

Deno.test("box2a_ordinary_dividends routes to schedule_b ordinaryDividends", () => {
  const result = compute([minimalItem({ box2a_ordinary_dividends: 800 })]);
  const out = findOutput(result, "schedule_b");
  assertEquals(out?.fields.ordinaryDividends, 800);
});

Deno.test("box2b_qualified_dividends routes to f1040 line3a", () => {
  const result = compute([minimalItem({ box2b_qualified_dividends: 300 })]);
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line3a_qualified_dividends, 300);
});

Deno.test("zero box2b does not route to f1040", () => {
  const result = compute([minimalItem()]);
  const out = findOutput(result, "f1040");
  assertEquals(out, undefined);
});

Deno.test("box3_net_st_cap_gain routes to schedule_d line_5_k1_st", () => {
  const result = compute([minimalItem({ box3_net_st_cap_gain: 1000 })]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields.line_5_k1_st, 1000);
});

Deno.test("negative box3 (short-term loss) routes to schedule_d", () => {
  const result = compute([minimalItem({ box3_net_st_cap_gain: -400 })]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields.line_5_k1_st, -400);
});

Deno.test("zero box3 does not route to schedule_d", () => {
  const result = compute([minimalItem()]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out, undefined);
});

Deno.test("box4a_net_lt_cap_gain routes to schedule_d line_12_k1_lt", () => {
  const result = compute([minimalItem({ box4a_net_lt_cap_gain: 2000 })]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields.line_12_k1_lt, 2000);
});

Deno.test("negative box4a (long-term loss) routes to schedule_d", () => {
  const result = compute([minimalItem({ box4a_net_lt_cap_gain: -600 })]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields.line_12_k1_lt, -600);
});

Deno.test("box5_other_portfolio routes to schedule1 line8z_other_income", () => {
  const result = compute([minimalItem({ box5_other_portfolio: 750 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line8z_other_income, 750);
});

Deno.test("box6_ordinary_business routes to schedule1 line5_schedule_e", () => {
  const result = compute([minimalItem({ box6_ordinary_business: 4000 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 4000);
});

Deno.test("negative box6 (business loss) routes to schedule1", () => {
  const result = compute([minimalItem({ box6_ordinary_business: -1500 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, -1500);
});

Deno.test("box7_rental_real_estate routes to schedule1 line5_schedule_e", () => {
  const result = compute([minimalItem({ box7_rental_real_estate: 2500 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 2500);
});

Deno.test("box8_other_rental routes to schedule1 line5_schedule_e", () => {
  const result = compute([minimalItem({ box8_other_rental: 1200 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 1200);
});

Deno.test("box14_foreign_tax routes to form_1116", () => {
  const result = compute([minimalItem({
    box14_foreign_tax: 150,
    box14_foreign_income: 750,
    box14_foreign_income_category: "passive",
    box14_foreign_tax_irs_country_code: "UK",
    box14_foreign_tax_paid_or_accrued_date: "2025-08-03",
    box14_foreign_tax_kind: "rents_royalties",
    box14_foreign_tax_credit_method: "paid",
  })]);
  const out = findOutput(result, "form_1116");
  const taxItem =
    (out?.fields.foreign_tax_items as Array<Record<string, unknown>>)[0];
  assertEquals(taxItem.foreign_tax_paid, 150);
  assertEquals(taxItem.irs_country_code, "UK");
  assertEquals(taxItem.tax_paid_or_accrued_date, "2025-08-03");
  assertEquals(taxItem.tax_kind, "rents_royalties");
  assertEquals(taxItem.tax_credit_method, "paid");
});

Deno.test("zero box14 does not route to form_1116", () => {
  const result = compute([minimalItem()]);
  const out = findOutput(result, "form_1116");
  assertEquals(out, undefined);
});

// ── 3. Aggregation across multiple K-1s ──────────────────────────────────────

Deno.test("box1_interest from multiple K-1s produces separate per-payer schedule_b entries", () => {
  const result = compute([
    minimalItem({ box1_interest: 300 }),
    minimalItem({ estate_trust_name: "Second Trust", box1_interest: 200 }),
  ]);
  const sbOutputs = result.outputs.filter((o) => o.nodeType === "schedule_b");
  // Each K-1 produces its own schedule_b entry with the per-payer amount
  assertEquals(sbOutputs.length, 2);
  const amounts = sbOutputs.map((o) => o.fields.taxable_interest_net as number)
    .sort((a, b) => a - b);
  assertEquals(amounts, [200, 300]);
});

Deno.test("box2b_qualified_dividends sums across K-1s to f1040", () => {
  const result = compute([
    minimalItem({ box2b_qualified_dividends: 200 }),
    minimalItem({
      estate_trust_name: "Trust B",
      box2b_qualified_dividends: 300,
    }),
  ]);
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line3a_qualified_dividends, 500);
});

Deno.test("box3 STCG sums across K-1s to schedule_d", () => {
  const result = compute([
    minimalItem({ box3_net_st_cap_gain: 1000 }),
    minimalItem({ estate_trust_name: "Trust B", box3_net_st_cap_gain: 500 }),
  ]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields.line_5_k1_st, 1500);
});

Deno.test("box6 business income sums across K-1s to schedule1", () => {
  const result = compute([
    minimalItem({ box6_ordinary_business: 2000 }),
    minimalItem({ estate_trust_name: "Trust B", box6_ordinary_business: 1000 }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 3000);
});

Deno.test("box6+box7+box8 combined routes to schedule1 line5_schedule_e", () => {
  const result = compute([
    minimalItem({
      box6_ordinary_business: 1000,
      box7_rental_real_estate: 500,
      box8_other_rental: 300,
    }),
  ]);
  const out = findOutput(result, "schedule1");
  // 1000 + 500 + 300 = 1800
  assertEquals(out?.fields.line5_schedule_e, 1800);
});

Deno.test("box5_other_portfolio and box6_ordinary_business together produce single schedule1 with both fields", () => {
  // When both schedule_e income and other-portfolio income are nonzero, a single
  // schedule1 output is emitted with both line5_schedule_e and line8z_other_income set
  const result = compute([
    minimalItem({ box5_other_portfolio: 400, box6_ordinary_business: 3000 }),
  ]);
  const sch1Outputs = result.outputs.filter((o) => o.nodeType === "schedule1");
  assertEquals(sch1Outputs.length, 1);
  assertEquals(sch1Outputs[0].fields.line5_schedule_e, 3000);
  assertEquals(sch1Outputs[0].fields.line8z_other_income, 400);
});

Deno.test("negative box5_other_portfolio (portfolio loss) routes to schedule1 line8z_other_income", () => {
  const result = compute([minimalItem({ box5_other_portfolio: -500 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line8z_other_income, -500);
});

Deno.test("box4a LTCG sums across K-1s to schedule_d", () => {
  const result = compute([
    minimalItem({ box4a_net_lt_cap_gain: 1500 }),
    minimalItem({ estate_trust_name: "Trust B", box4a_net_lt_cap_gain: 2500 }),
  ]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields.line_12_k1_lt, 4000);
});

// ── 7. Informational fields ───────────────────────────────────────────────────

Deno.test("estate_trust_name does not produce tax output alone", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("box10_estate_tax_deduction does not produce tax output", () => {
  const r1 = compute([minimalItem()]);
  const r2 = compute([minimalItem({ box10_estate_tax_deduction: 5000 })]);
  assertEquals(r1.outputs.length, r2.outputs.length);
});

// ── 8. Edge cases ─────────────────────────────────────────────────────────────

Deno.test("all-zero K-1 produces no outputs", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("K-1 with both STCG and LTCG produces single merged schedule_d output", () => {
  const result = compute([
    minimalItem({ box3_net_st_cap_gain: 500, box4a_net_lt_cap_gain: 1000 }),
  ]);
  const sdOutputs = result.outputs.filter((o) => o.nodeType === "schedule_d");
  assertEquals(sdOutputs.length, 1);
  assertEquals(sdOutputs[0].fields.line_5_k1_st, 500);
  assertEquals(sdOutputs[0].fields.line_12_k1_lt, 1000);
});

// ── 9. Smoke test ─────────────────────────────────────────────────────────────

Deno.test("smoke test — K-1 with all major boxes", () => {
  const result = compute([
    minimalItem({
      box1_interest: 500,
      box2a_ordinary_dividends: 800,
      box2b_qualified_dividends: 600,
      box3_net_st_cap_gain: 1000,
      box4a_net_lt_cap_gain: 2000,
      box5_other_portfolio: 300,
      box6_ordinary_business: 5000,
      box7_rental_real_estate: 1500,
      box14_foreign_tax: 100,
      box14_foreign_income: 500,
      box14_foreign_income_category: "passive",
    }),
  ]);
  const sb = findOutput(result, "schedule_b");
  assertEquals(sb?.fields.taxable_interest_net, 500);
  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040?.fields.line3a_qualified_dividends, 600);
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd?.fields.line_5_k1_st, 1000);
  assertEquals(sd?.fields.line_12_k1_lt, 2000);
  const sch1 = findOutput(result, "schedule1");
  // box6=5000 + box7=1500 → line5_schedule_e=6500; box5=300 → line8z_other_income=300
  assertEquals(sch1?.fields.line5_schedule_e, 6500);
  assertEquals(sch1?.fields.line8z_other_income, 300);
  const f1116 = findOutput(result, "form_1116");
  assertEquals(
    (f1116?.fields.foreign_tax_items as Array<Record<string, unknown>>)[0]
      .foreign_tax_paid,
    100,
  );
});

// ── 10. DNI limitation (IRC §662) ─────────────────────────────────────────────

Deno.test("DNI: no cap when distributable_net_income not provided", () => {
  const result = compute([minimalItem({ box1_interest: 10_000 })]);
  const sb = findOutput(result, "schedule_b");
  assertEquals(sb?.fields.taxable_interest_net, 10_000);
});

Deno.test("DNI: no cap when total income <= DNI", () => {
  const result = compute([
    minimalItem({ box1_interest: 5_000, distributable_net_income: 8_000 }),
  ]);
  const sb = findOutput(result, "schedule_b");
  assertEquals(sb?.fields.taxable_interest_net, 5_000);
});

Deno.test("DNI: caps single box when total exceeds DNI", () => {
  // Total $10,000, DNI $6,000 → ratio 0.60 → interest = $6,000
  const result = compute([
    minimalItem({ box1_interest: 10_000, distributable_net_income: 6_000 }),
  ]);
  const sb = findOutput(result, "schedule_b");
  assertEquals(sb?.fields.taxable_interest_net, 6_000);
});

Deno.test("DNI: prorates all characters proportionally", () => {
  // interest=$4,000 + dividends=$6,000 = $10,000; DNI=$5,000 → ratio 0.50
  const result = compute([
    minimalItem({
      box1_interest: 4_000,
      box2a_ordinary_dividends: 6_000,
      distributable_net_income: 5_000,
    }),
  ]);
  // Check schedule_b interest (4000 * 0.5 = 2000)
  const sbInterest = result.outputs.find(
    (o) => o.nodeType === "schedule_b" && "taxable_interest_net" in o.fields,
  );
  assertEquals(sbInterest?.fields.taxable_interest_net, 2_000);
});

Deno.test("DNI: losses pass through unchanged regardless of DNI cap", () => {
  // Loss in box6 should not be scaled
  const result = compute([
    minimalItem({
      box6_ordinary_business: -3_000,
      box1_interest: 5_000,
      distributable_net_income: 2_000,
    }),
  ]);
  const sch1 = findOutput(result, "schedule1");
  assertEquals(sch1?.fields.line5_schedule_e, -3_000); // loss unchanged
});

Deno.test("DNI: per-trust — DNI cap applied independently to each K-1", () => {
  // Trust A: $10k interest, DNI $5k → $5k
  // Trust B: $8k interest, no DNI → $8k
  const result = compute([
    minimalItem({ box1_interest: 10_000, distributable_net_income: 5_000 }),
    minimalItem({ estate_trust_name: "Trust B", box1_interest: 8_000 }),
  ]);
  const sbOutputs = result.outputs.filter((o) =>
    o.nodeType === "schedule_b" && "taxable_interest_net" in o.fields
  );
  const amounts = sbOutputs.map((o) => o.fields.taxable_interest_net as number)
    .sort((a, b) => a - b);
  assertEquals(amounts, [5_000, 8_000]);
});
