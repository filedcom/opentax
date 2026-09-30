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

Deno.test("trust K-1 box 11 code A sums distinct final K-1 deductions for Schedule 1 and AGI", () => {
  const source = {
    box11_code_a_statement_reference: "Final-year deduction statement",
    box11_final_k1: true,
    box11_beneficiary_succeeds_to_property: true,
    beneficiary_ssn: "111223333",
  };
  const result = compute([
    minimalItem({
      ...source,
      estate_trust_ein: "123456789",
      source_document_reference: "K-1 A",
      box11_code_a_section67e_excess_deduction: 300,
    }),
    minimalItem({
      ...source,
      estate_trust_ein: "987654321",
      source_document_reference: "K-1 B",
      box11_code_a_section67e_excess_deduction: 200,
    }),
  ]);
  for (const nodeType of ["schedule1", "agi_aggregator"]) {
    assertEquals(
      result.outputs.filter((row) => row.nodeType === nodeType).map((row) =>
        row.fields.line24k_section67e_excess_deduction
      ),
      [500],
    );
  }
});

Deno.test("trust K-1 box 11 code A requires final-year beneficiary evidence", () => {
  const source = {
    estate_trust_ein: "123456789",
    source_document_reference: "K-1 A",
    box11_code_a_section67e_excess_deduction: 500,
  };
  assertThrows(() => compute([minimalItem(source)]));
  assertThrows(() =>
    compute([
      minimalItem({
        ...source,
        box11_code_a_statement_reference: "Statement",
        box11_final_k1: true,
        beneficiary_ssn: "111223333",
      }),
    ])
  );
  assertThrows(() =>
    compute([minimalItem({
      ...source,
      box11_code_a_statement_reference: "Statement",
      box11_final_k1: true,
      box11_beneficiary_succeeds_to_property: true,
      beneficiary_ssn: "111223333",
      box11_final_year_deductions: 500,
    })])
  );
});

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

Deno.test("trust K-1 uses issued portfolio income for affirmed Form 4952 source", () => {
  const item = minimalItem({
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
    { source_k1_interest: 200 },
    { source_k1_dividends: 400 },
    { source_k1_qualified_dividends: 100 },
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

Deno.test("negative box3 belongs to final-year capital loss carryover code", () => {
  assertThrows(() => compute([minimalItem({ box3_net_st_cap_gain: -400 })]));
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

Deno.test("negative box4a belongs to final-year capital loss carryover code", () => {
  assertThrows(() => compute([minimalItem({ box4a_net_lt_cap_gain: -600 })]));
});

Deno.test("box 5 creates a sourced Schedule E Part III row", () => {
  const result = compute([minimalItem({
    estate_trust_ein: "123456789",
    source_document_reference: "K1-2025-A",
    box5_other_portfolio: 750,
  })]);
  const out = findOutput(result, "schedule_e");
  assertEquals(out?.fields.estate_trust_rows, [{
    estate_trust_name: "Test Trust",
    estate_trust_ein: "123456789",
    source_document_reference: "K1-2025-A",
    other_income: 750,
  }]);
  assertEquals(findOutput(result, "schedule1"), undefined);
});

Deno.test("boxes 6 through 8 require matching activity statements", () => {
  for (
    const field of [
      "box6_ordinary_business",
      "box7_rental_real_estate",
      "box8_other_rental",
    ]
  ) {
    assertThrows(
      () => compute([minimalItem({ [field]: 100 })]),
      Error,
      "per-activity statement",
    );
  }
});

Deno.test("positive boxes 6 through 8 reach Schedule E passive income", () => {
  const result = compute([minimalItem({
    estate_trust_ein: "123456789",
    source_document_reference: "K1-2025-A",
    box6_ordinary_business: 300,
    box7_rental_real_estate: 200,
    box8_other_rental: 100,
    box6_8_activity_statement: [
      {
        box: "6",
        activity_name: "Shop",
        statement_reference: "A-6",
        income: 300,
      },
      {
        box: "7",
        activity_name: "House",
        statement_reference: "A-7",
        income: 200,
      },
      {
        box: "8",
        activity_name: "Equipment",
        statement_reference: "A-8",
        income: 100,
      },
    ],
  })]);
  assertEquals(findOutput(result, "schedule_e")?.fields.estate_trust_rows, [{
    estate_trust_name: "Test Trust",
    estate_trust_ein: "123456789",
    source_document_reference: "K1-2025-A",
    passive_income: 600,
  }]);
});

Deno.test("box 9 still needs activity deduction character", () => {
  assertThrows(
    () => compute([minimalItem({ box9_directly_apportioned_deductions: 100 })]),
    Error,
    "per-activity character",
  );
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

Deno.test("box 5 retains distinct Schedule E rows across K-1s", () => {
  const result = compute([
    minimalItem({
      estate_trust_ein: "123456789",
      source_document_reference: "A",
      box5_other_portfolio: 2000,
    }),
    minimalItem({
      estate_trust_name: "Trust B",
      estate_trust_ein: "987654321",
      source_document_reference: "B",
      box5_other_portfolio: 1000,
    }),
  ]);
  const rows = result.outputs.filter((o) => o.nodeType === "schedule_e");
  assertEquals(rows.length, 2);
  assertEquals(rows.map((row) => row.fields.estate_trust_rows), [
    [{
      estate_trust_name: "Test Trust",
      estate_trust_ein: "123456789",
      source_document_reference: "A",
      other_income: 2000,
    }],
    [{
      estate_trust_name: "Trust B",
      estate_trust_ein: "987654321",
      source_document_reference: "B",
      other_income: 1000,
    }],
  ]);
});

Deno.test("negative box 5 cannot appear on an issued K-1", () => {
  assertThrows(
    () => compute([minimalItem({ box5_other_portfolio: -500 })]),
    Error,
    "greater than or equal to 0",
  );
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

Deno.test("uncoded special gain and deduction claims reject", () => {
  for (
    const field of [
      "box4b_28pct_rate_gain",
      "box4c_unrecaptured_1250",
      "box10_estate_tax_deduction",
      "box11_final_year_deductions",
    ]
  ) {
    assertThrows(
      () => compute([minimalItem({ [field]: 500 })]),
      Error,
      "coded tax-rate or deduction filing route",
    );
  }
});

Deno.test("box 13 residual credit and uncategorized foreign tax reject", () => {
  assertThrows(
    () => compute([minimalItem({ box13_credits: 100 })]),
    Error,
    "residual credits",
  );
  assertThrows(
    () => compute([minimalItem({ box14_foreign_tax: 100 })]),
    Error,
    "income and category",
  );
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
      estate_trust_ein: "123456789",
      source_document_reference: "K1-2025-A",
      box5_other_portfolio: 300,
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
  const scheduleE = findOutput(result, "schedule_e");
  assertEquals(
    (scheduleE?.fields.estate_trust_rows as Array<{ other_income: number }>)[0]
      .other_income,
    300,
  );
  const f1116 = findOutput(result, "form_1116");
  assertEquals(
    (f1116?.fields.foreign_tax_items as Array<Record<string, unknown>>)[0]
      .foreign_tax_paid,
    100,
  );
});

// ── 10. Fiduciary-allocated K-1 amounts ──────────────────────────────────────

Deno.test("trust K-1 reports its issued beneficiary share without a second DNI cap", () => {
  const result = compute([minimalItem({
    box1_interest: 4_000,
    box2a_ordinary_dividends: 6_000,
  })]);
  const interest = result.outputs.find((row) =>
    row.nodeType === "schedule_b" && "taxable_interest_net" in row.fields
  );
  const dividends = result.outputs.find((row) =>
    row.nodeType === "schedule_b" && "ordinaryDividends" in row.fields
  );
  assertEquals(interest?.fields.taxable_interest_net, 4_000);
  assertEquals(dividends?.fields.ordinaryDividends, 6_000);
});

Deno.test("trust K-1 rejects a beneficiary-side DNI cap", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box1_interest: 10_000,
        distributable_net_income: 5_000,
      })]),
    Error,
    "Expected never",
  );
});

Deno.test("trust K-1 boxes 1 through 8 reject negative reported amounts", () => {
  for (
    const field of [
      "box1_interest",
      "box2a_ordinary_dividends",
      "box2b_qualified_dividends",
      "box3_net_st_cap_gain",
      "box4a_net_lt_cap_gain",
      "box5_other_portfolio",
      "box6_ordinary_business",
      "box7_rental_real_estate",
      "box8_other_rental",
    ]
  ) {
    assertThrows(
      () => compute([minimalItem({ [field]: -1 })]),
      Error,
      "greater than or equal to 0",
    );
  }
});
