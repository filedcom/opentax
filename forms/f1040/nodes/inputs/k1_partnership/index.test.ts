import { assertEquals, assertThrows } from "@std/assert";
import { k1Partnership } from "./index.ts";
import {
  ForeignTaxCreditMethod,
  foreignTaxItemSchema,
  ForeignTaxKind,
  IncomeCategory,
} from "../../intermediate/forms/form_1116/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    partnership_name: "Test Partnership",
    ...overrides,
  };
}

function compute(items: Record<string, unknown>[]) {
  return k1Partnership.compute(
    { taxYear: 2025, formType: "f1040" },
    k1Partnership.inputSchema.parse({ k1_partnerships: items }),
  );
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

Deno.test("partnership K-3 passive interest and line 12 reduction reconcile to K-1", () => {
  const k3 = {
    partnership_ein: "123456789",
    k1_source_document_reference: "2025 K-1",
    k3_source_document_reference: "2025 K-3",
    part_ii_section_1_line_6_passive_interest: 1_000,
    part_ii_section_1_line_24_passive_total: 1_000,
    part_iii_section_4_line_1_foreign_tax: 50,
    part_iii_section_4_line_2_tax_reduction: 10,
    irs_country_code: "DE",
    tax_paid_date: "2025-06-15",
    foreign_tax_currency: {
      currency_code: "EUR",
      amount: 40,
      usd_per_foreign_unit: 1.25,
      source_document_reference: "2025 K-3",
    },
    no_other_income_tax_or_reduction_on_k3_confirmed: true as const,
  };
  const source = {
    partnership_ein: "123456789",
    source_document_reference: "2025 K-1",
    box5_interest: 1_000,
    box16_foreign_income: 1_000,
    box16_foreign_tax: 50,
    box16_foreign_income_category: IncomeCategory.Passive,
    box16_foreign_tax_irs_country_code: "DE",
    box16_foreign_tax_paid_or_accrued_date: "2025-06-15",
    box16_foreign_tax_kind: ForeignTaxKind.Interest,
    box16_foreign_tax_credit_method: ForeignTaxCreditMethod.Paid,
    schedule_k3_passive_interest: k3,
  };
  const output = findOutput(compute([minimalItem(source)]), "form_1116");
  const item = foreignTaxItemSchema.parse(
    (output?.fields.foreign_tax_items as unknown[])[0],
  );
  assertEquals(item?.schedule_k3_line12_reduction?.amount, 10);
  assertEquals(item?.partnership_k3_passive_interest, k3);
  assertThrows(
    () => compute([minimalItem({ ...source, box5_interest: 999 })]),
    Error,
    "must match its K-1",
  );
  assertThrows(
    () =>
      compute([minimalItem({
        ...source,
        schedule_k3_passive_interest: {
          ...k3,
          part_iii_section_4_line_2_tax_reduction: 60,
        },
      })]),
    Error,
    "must match its K-1",
  );
});

Deno.test("partnership K-1 portfolio boxes feed Form 4952 only when affirmed", () => {
  const item = minimalItem({
    box5_interest: 200,
    box6a_ordinary_dividends: 300,
    box6b_qualified_dividends: 100,
  });
  assertEquals(findOutput(compute([item]), "form4952"), undefined);
  const fields = compute([{
    ...item,
    investment_property_for_form4952: true,
  }]).outputs.filter((output) => output.nodeType === "form4952")
    .map((output) => output.fields);
  assertEquals(fields, [
    { source_k1_interest: 200 },
    { source_k1_dividends: 300 },
    { source_k1_qualified_dividends: 100 },
  ]);
});

Deno.test("partnership K-1 box 20 code B routes only allowed investment depreciation to Form 4952", () => {
  const codeB = {
    reported_amount: 600,
    allowed_deduction_amount: 600,
    allowed_deduction_kind: "depreciation",
    nonpassive_investment_property: true,
    issuer_crosswalk: {
      issuer_supplement_reference: "2025 K-1 investment supplement",
      issuer_reported_amount: 600,
      same_expense_as_box13_code_i_confirmed: true,
      box13_code_i_statement_reference: "2025 code I statement",
      royalty_property_description: "Partnership mineral royalty",
    },
  };
  const item = minimalItem({
    partnership_ein: "123456789",
    source_document_reference: "2025 K-1 and investment-property statement",
    investment_property_for_form4952: true,
    box7_royalties: 1_000,
    box7_royalty_reporting: {
      tsj: "T",
      property_description: "Partnership mineral royalty",
      portfolio_nonpassive: true,
      form_1099_payments_made: false,
    },
    box13_code_i_royalty_deduction: {
      reported_amount: 600,
      allowed_amount: 600,
      statement_reference: "2025 code I statement",
      expense_kind: "depreciation",
      basis_workpaper_reference: "2025 basis review",
      at_risk_workpaper_reference: "2025 at-risk review",
    },
    box20_code_b_investment_expenses: codeB,
  });
  const result = compute([item]);
  assertEquals(
    result.outputs.filter((entry) => entry.nodeType === "form4952").map(
      (entry) => entry.fields,
    ),
    [
      { source_k1_royalties: 1_000 },
      { source_k1_allowed_investment_expenses: 600 },
    ],
  );
  const scheduleERows = findOutput(result, "schedule_e")?.fields.schedule_es as
    | unknown[]
    | undefined;
  assertEquals(scheduleERows?.length, 1);
  assertEquals(findOutput(compute([item]), "schedule1"), undefined);
  assertThrows(
    () =>
      compute([{
        ...item,
        box20_code_b_investment_expenses: {
          ...codeB,
          issuer_crosswalk: {
            ...codeB.issuer_crosswalk,
            box13_code_i_statement_reference: "different code I item",
          },
        },
      }]),
    Error,
    "same issuer-identified",
  );
  assertThrows(
    () =>
      compute([{
        ...item,
        box13_code_i_royalty_deduction: undefined,
      }]),
    Error,
    "same issuer-identified",
  );
});

Deno.test("partnership K-1 box 13 code H routes separately stated investment interest", () => {
  const item = minimalItem({
    partnership_ein: "123456789",
    source_document_reference: "2025 K-1 box 13 code H",
    box13_code_h_investment_interest: 425,
  });
  assertEquals(findOutput(compute([item]), "form4952")?.fields, {
    source_k1_investment_interest: 425,
  });
  assertThrows(() =>
    compute([minimalItem({
      box13_code_h_investment_interest: 425,
    })])
  );
});

Deno.test("partnership K-1 box 20 code B rejects unsourced or disallowed expenses", () => {
  const expense = {
    reported_amount: 1_000,
    allowed_deduction_amount: 600,
    allowed_deduction_kind: "depletion",
    nonpassive_investment_property: true,
  };
  assertThrows(() =>
    compute([minimalItem({
      box20_code_b_investment_expenses: expense,
    })])
  );
  assertThrows(() =>
    compute([minimalItem({
      partnership_ein: "123456789",
      source_document_reference: "2025 K-1 statement",
      box20_code_b_investment_expenses: {
        ...expense,
        allowed_deduction_amount: 1_100,
      },
    })])
  );
  assertThrows(() =>
    compute([minimalItem({
      partnership_ein: "123456789",
      source_document_reference: "2025 K-1 statement",
      box20_code_b_investment_expenses: {
        ...expense,
        allowed_deduction_kind: "miscellaneous_itemized",
      },
    })])
  );
});

Deno.test("partnership K-1 box 15 code Z needs source identity and passive classification", () => {
  assertThrows(() =>
    compute([minimalItem({ box15_code_z_orphan_drug_credit: 1_250 })])
  );
  compute([minimalItem({
    partnership_ein: "123456789",
    source_document_reference: "2025 Partnership K-1",
    box15_code_z_orphan_drug_credit: 1_250,
    orphan_drug_credit_subject_to_passive_activity_limit: false,
  })]);
});

Deno.test("partnership K-1 code Z reaches source-backed Form 3800", () => {
  const item = minimalItem({
    partnership_ein: "123456789",
    source_document_reference: "2025 partnership K-1",
    box15_code_z_orphan_drug_credit: 1_250,
    orphan_drug_credit_subject_to_passive_activity_limit: false,
  });
  assertEquals(findOutput(compute([item]), "f3800")?.fields, {
    f8820_k1_credit_entries: [{
      source_type: "partnership",
      source_ein: "123456789",
      source_document_reference: "2025 partnership K-1",
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
        source_type: "partnership",
        source_ein: "123456789",
        source_document_reference: "2025 partnership K-1",
        credit_amount: 1_250,
      }],
    },
  );
});

Deno.test("partnership K-1 box 15 code AD reaches Form 3800 line 1i source", () => {
  assertThrows(() =>
    compute([minimalItem({
      box15_code_ad_new_markets_credit: 1_250,
    })])
  );
  const item = minimalItem({
    partnership_ein: "123456789",
    source_document_reference: "2025 partnership K-1",
    box15_code_ad_new_markets_credit: 1_250,
    new_markets_credit_subject_to_passive_activity_limit: false,
  });
  assertEquals(findOutput(compute([item]), "f3800")?.fields, {
    f8874_k1_credit_entries: [{
      source_type: "partnership",
      source_ein: "123456789",
      source_document_reference: "2025 partnership K-1",
      credit_amount: 1_250,
      subject_to_passive_activity_limit: false,
    }],
  });
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
        source_type: "partnership",
        source_ein: "123456789",
        source_document_reference: "2025 partnership K-1",
        credit_amount: 1_250,
      }],
    },
  );
});

Deno.test("partnership K-1 box 15 code K needs source identity and passive classification", () => {
  assertThrows(() =>
    compute([minimalItem({ box15_code_k_disabled_access_credit: 500 })])
  );
  const result = compute([minimalItem({
    partnership_ein: "123456789",
    source_document_reference: "2025 Partnership K-1",
    box15_code_k_disabled_access_credit: 500.25,
    disabled_access_credit_subject_to_passive_activity_limit: true,
  })]);
  assertEquals(findOutput(result, "disabled_access_limit")?.fields, {
    required_disabled_access_k1_credits: [{
      source_type: "partnership",
      source_ein: "123456789",
      source_document_reference: "2025 Partnership K-1",
      credit_amount: 500.25,
    }],
  });
  assertThrows(() =>
    compute([minimalItem({
      partnership_ein: "123456789",
      source_document_reference: "2025 Partnership K-1",
      box15_code_k_disabled_access_credit: 500.251,
      disabled_access_credit_subject_to_passive_activity_limit: true,
    })])
  );
});

Deno.test("nonpassive partnership K-1 code K reaches source-backed Form 3800", () => {
  const result = compute([minimalItem({
    partnership_ein: "123456789",
    source_document_reference: "2025 Partnership K-1",
    box15_code_k_disabled_access_credit: 500.25,
    disabled_access_credit_subject_to_passive_activity_limit: false,
  })]);
  assertEquals(findOutput(result, "disabled_access_limit")?.fields, {
    f8826_credit_entries: [{
      source_type: "partnership",
      source_ein: "123456789",
      source_document_reference: "2025 Partnership K-1",
      credit_amount: 500.25,
      subject_to_passive_activity_limit: false,
    }],
  });
  assertEquals(findOutput(result, "form8582cr"), undefined);
});

Deno.test("box 10 retains each partnership's Form 4797 line 2 amount", () => {
  const result = compute([
    minimalItem({ partnership_name: "Partner One", box10_net_1231: 10_000 }),
    minimalItem({ partnership_name: "Partner Two", box10_net_1231: -2_000 }),
  ]);
  const fields = findOutput(result, "form4797")?.fields;
  assertEquals(fields?.section_1231_gain, 8_000);
  assertEquals(fields?.k1_1231_rows, [
    { source: "partnership", entity_name: "Partner One", gain_loss: 10_000 },
    { source: "partnership", entity_name: "Partner Two", gain_loss: -2_000 },
  ]);
});

// ── 1. Input schema validation ────────────────────────────────────────────────

Deno.test("empty array throws", () => {
  assertThrows(
    () =>
      k1Partnership.compute({ taxYear: 2025, formType: "f1040" }, {
        k1_partnerships: [],
      }),
    Error,
  );
});

Deno.test("missing partnership_name throws", () => {
  assertThrows(
    () =>
      k1Partnership.compute({ taxYear: 2025, formType: "f1040" }, {
        k1_partnerships: [
          { box1_ordinary_business: 100 } as unknown as ReturnType<
            typeof minimalItem
          >,
        ],
      }),
    Error,
  );
});

Deno.test("negative box5_interest throws", () => {
  assertThrows(() => compute([minimalItem({ box5_interest: -1 })]), Error);
});

Deno.test("negative box6a_ordinary_dividends throws", () => {
  assertThrows(
    () => compute([minimalItem({ box6a_ordinary_dividends: -5 })]),
    Error,
  );
});

Deno.test("negative box6b_qualified_dividends throws", () => {
  assertThrows(
    () => compute([minimalItem({ box6b_qualified_dividends: -10 })]),
    Error,
  );
});

// ── 2. Per-box routing ────────────────────────────────────────────────────────

Deno.test("box1_ordinary_business routes to schedule1 line5_schedule_e", () => {
  const result = compute([minimalItem({ box1_ordinary_business: 8000 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 8000);
});

Deno.test("negative box1 (loss) routes to schedule1", () => {
  const result = compute([minimalItem({ box1_ordinary_business: -3000 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, -3000);
});

Deno.test("zero box1 does not route to schedule1", () => {
  const result = compute([minimalItem()]);
  const out = findOutput(result, "schedule1");
  assertEquals(out, undefined);
});

Deno.test("box2_rental_re routes to schedule1 line5_schedule_e", () => {
  const result = compute([minimalItem({ box2_rental_re: 2500 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 2500);
});

Deno.test("box3_other_rental routes to schedule1 line5_schedule_e", () => {
  const result = compute([minimalItem({ box3_other_rental: 1200 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 1200);
});

Deno.test("box4a_guaranteed_services routes to schedule1", () => {
  const result = compute([minimalItem({ box4a_guaranteed_services: 5000 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 5000);
});

Deno.test("box4a_guaranteed_services routes to schedule_se net_profit_schedule_c", () => {
  const result = compute([minimalItem({ box4a_guaranteed_services: 5000 })]);
  const out = findOutput(result, "schedule_se");
  assertEquals(out?.fields.net_profit_schedule_c, 5000);
});

Deno.test("box4b_guaranteed_capital routes to schedule1 but not schedule_se", () => {
  const result = compute([minimalItem({ box4b_guaranteed_capital: 2000 })]);
  const sch1 = findOutput(result, "schedule1");
  assertEquals(sch1?.fields.line5_schedule_e, 2000);
  const schSe = findOutput(result, "schedule_se");
  assertEquals(schSe, undefined);
});

Deno.test("box 7 and box 13 code I reach one sourced Schedule E royalty row", () => {
  const result = compute([minimalItem({
    partnership_ein: "123456789",
    source_document_reference: "2025 K-1 source A",
    box7_royalties: 700,
    box7_royalty_reporting: {
      tsj: "T",
      property_description: "Partnership mineral royalty",
      portfolio_nonpassive: true,
      form_1099_payments_made: false,
    },
    box13_code_i_royalty_deduction: {
      reported_amount: 100,
      allowed_amount: 100,
      statement_reference: "2025 K-1 code I statement",
      expense_kind: "depletion",
      basis_workpaper_reference: "2025 outside-basis worksheet",
      at_risk_workpaper_reference: "2025 at-risk worksheet",
    },
  })]);
  assertEquals(findOutput(result, "schedule1"), undefined);
  const row = (findOutput(result, "schedule_e")?.fields.schedule_es as
    | Array<{
      royalties_income: number;
      expense_other_lines: Array<{ description: string; amount: number }>;
      k1_royalty_source: { box13_code_i_allowed_deduction: number };
    }>
    | undefined)?.[0];
  assertEquals(row?.royalties_income, 700);
  assertEquals(row?.expense_other_lines?.[0], {
    description: "From Schedule K-1 (Form 1065)",
    amount: 100,
  });
  assertEquals(row?.k1_royalty_source?.box13_code_i_allowed_deduction, 100);
  assertThrows(() => compute([minimalItem({ box7_royalties: 700 })]));
  assertThrows(() =>
    compute([minimalItem({
      partnership_ein: "123456789",
      source_document_reference: "2025 K-1 source A",
      box7_royalties: 700,
      box7_royalty_reporting: {
        tsj: "T",
        property_description: "Partnership mineral royalty",
        portfolio_nonpassive: true,
        form_1099_payments_made: false,
      },
      box13_code_i_royalty_deduction: {
        reported_amount: 100,
        allowed_amount: 90,
        statement_reference: "2025 K-1 code I statement",
        expense_kind: "depletion",
        basis_workpaper_reference: "2025 outside-basis worksheet",
        at_risk_workpaper_reference: "2025 at-risk worksheet",
      },
    })])
  );
});

Deno.test("box5_interest routes to schedule_b taxable_interest_net", () => {
  const result = compute([minimalItem({ box5_interest: 350 })]);
  const out = findOutput(result, "schedule_b");
  assertEquals(out?.fields.taxable_interest_net, 350);
});

Deno.test("zero box5_interest does not route to schedule_b", () => {
  const result = compute([minimalItem()]);
  const out = findOutput(result, "schedule_b");
  assertEquals(out, undefined);
});

Deno.test("box6a_ordinary_dividends routes to schedule_b ordinaryDividends", () => {
  const result = compute([minimalItem({ box6a_ordinary_dividends: 500 })]);
  const out = findOutput(result, "schedule_b");
  assertEquals(out?.fields.ordinaryDividends, 500);
});

Deno.test("box6b_qualified_dividends routes to f1040 line3a", () => {
  const result = compute([minimalItem({ box6b_qualified_dividends: 350 })]);
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line3a_qualified_dividends, 350);
});

Deno.test("zero box6b does not route to f1040", () => {
  const result = compute([minimalItem()]);
  const out = findOutput(result, "f1040");
  assertEquals(out, undefined);
});

Deno.test("box8_net_st_cap_gain routes to schedule_d line_5_k1_st", () => {
  const result = compute([minimalItem({ box8_net_st_cap_gain: 1000 })]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields.line_5_k1_st, 1000);
});

Deno.test("negative box8 routes to schedule_d as loss", () => {
  const result = compute([minimalItem({ box8_net_st_cap_gain: -500 })]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields.line_5_k1_st, -500);
});

Deno.test("box9a_net_lt_cap_gain routes to schedule_d line_12_k1_lt", () => {
  const result = compute([minimalItem({ box9a_net_lt_cap_gain: 2500 })]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields.line_12_k1_lt, 2500);
});

Deno.test("box14a_se_earnings routes to schedule_se net_profit_schedule_c", () => {
  const result = compute([minimalItem({ box14a_se_earnings: 10000 })]);
  const out = findOutput(result, "schedule_se");
  assertEquals(out?.fields.net_profit_schedule_c, 10000);
});

Deno.test("zero box14a does not route to schedule_se (no other SE income)", () => {
  const result = compute([minimalItem({ box1_ordinary_business: 5000 })]);
  const out = findOutput(result, "schedule_se");
  assertEquals(out, undefined);
});

Deno.test("box20z_qbi routes to form8995 qbi", () => {
  const result = compute([minimalItem({ box20z_qbi: 12000 })]);
  const out = findOutput(result, "form8995");
  assertEquals(out?.fields.qbi, 12000);
});

Deno.test("box20_w2_wages routes to form8995 w2_wages", () => {
  const result = compute([
    minimalItem({ box20z_qbi: 10000, box20_w2_wages: 6000 }),
  ]);
  const out = findOutput(result, "form8995");
  assertEquals(out?.fields.w2_wages, 6000);
});

Deno.test("box16_foreign_tax routes to form_1116", () => {
  const result = compute([
    minimalItem({
      box16_foreign_tax: 180,
      box16_foreign_income: 900,
      box16_foreign_income_category: "passive",
      box16_foreign_tax_irs_country_code: "GM",
      box16_foreign_tax_paid_or_accrued_date: "2025-06-15",
      box16_foreign_tax_kind: "interest",
      box16_foreign_tax_credit_method: "paid",
    }),
  ]);
  const out = findOutput(result, "form_1116");
  assertEquals(
    (out?.fields.foreign_tax_items as Array<Record<string, unknown>>)[0]
      .foreign_tax_paid,
    180,
  );
  const taxItem =
    (out?.fields.foreign_tax_items as Array<Record<string, unknown>>)[0];
  assertEquals(taxItem.irs_country_code, "GM");
  assertEquals(taxItem.tax_paid_or_accrued_date, "2025-06-15");
  assertEquals(taxItem.tax_kind, "interest");
  assertEquals(taxItem.tax_credit_method, "paid");
});

Deno.test("zero box16_foreign_tax does not route to form_1116", () => {
  const result = compute([minimalItem()]);
  const out = findOutput(result, "form_1116");
  assertEquals(out, undefined);
});

// ── 3. Aggregation across multiple K-1s ──────────────────────────────────────

Deno.test("box1 sums across K-1s to schedule1", () => {
  const result = compute([
    minimalItem({ box1_ordinary_business: 4000 }),
    minimalItem({ partnership_name: "Fund B", box1_ordinary_business: 3000 }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 7000);
});

Deno.test("box6b sums across K-1s to f1040 line3a", () => {
  const result = compute([
    minimalItem({ box6b_qualified_dividends: 200 }),
    minimalItem({ partnership_name: "Fund B", box6b_qualified_dividends: 300 }),
  ]);
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line3a_qualified_dividends, 500);
});

Deno.test("box8 STCG sums across K-1s to schedule_d", () => {
  const result = compute([
    minimalItem({ box8_net_st_cap_gain: 1000 }),
    minimalItem({ partnership_name: "Fund B", box8_net_st_cap_gain: 500 }),
  ]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields.line_5_k1_st, 1500);
});

Deno.test("box1+box2+box3+box4a+box4b+box7 combined in schedule1", () => {
  const result = compute([
    minimalItem({
      box1_ordinary_business: 2000,
      box2_rental_re: 1000,
      box3_other_rental: 500,
      box4a_guaranteed_services: 3000,
      box4b_guaranteed_capital: 500,
      box7_royalties: 400,
      partnership_ein: "123456789",
      source_document_reference: "2025 K-1 source B",
      box7_royalty_reporting: {
        tsj: "T",
        property_description: "Partnership mineral royalty",
        portfolio_nonpassive: true,
        form_1099_payments_made: false,
      },
    }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 7000); // Box 7 flows through Schedule E Part I.
});

// ── 5. QBI extended fields (K199 screen) ─────────────────────────────────────

Deno.test("box20_sstb true is accepted and does not produce extra outputs", () => {
  // SSTB indicator is informational in this node — Form 8995-A handles phaseout.
  // The field must be accepted by the schema without throwing.
  const result = compute([
    minimalItem({ box20z_qbi: 10000, box20_sstb: true }),
  ]);
  const out = findOutput(result, "form8995");
  assertEquals(out?.fields.qbi, 10000);
});

Deno.test("box20_sstb false is accepted", () => {
  const result = compute([
    minimalItem({ box20z_qbi: 5000, box20_sstb: false }),
  ]);
  const out = findOutput(result, "form8995");
  assertEquals(out?.fields.qbi, 5000);
});

Deno.test("box20_aggregation_group is accepted and does not affect routing", () => {
  const result = compute([
    minimalItem({ box20z_qbi: 8000, box20_aggregation_group: "GroupA" }),
  ]);
  const out = findOutput(result, "form8995");
  assertEquals(out?.fields.qbi, 8000);
});

// ── 6. Partner Basis Worksheet fields (K1P > "Basis Wkst" tab) ───────────────

Deno.test("basis_beginning is accepted (informational; no routing output)", () => {
  const result = compute([minimalItem({ basis_beginning: 50000 })]);
  // Basis fields are worksheet-only; they do not route to downstream nodes.
  assertEquals(result.outputs.length, 0);
});

Deno.test("basis_contributions is accepted", () => {
  const result = compute([minimalItem({ basis_contributions: 10000 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("basis_share_of_income is accepted", () => {
  const result = compute([minimalItem({ basis_share_of_income: 3000 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("basis_share_of_losses is accepted", () => {
  const result = compute([minimalItem({ basis_share_of_losses: 2000 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("basis_distributions is accepted", () => {
  const result = compute([minimalItem({ basis_distributions: 5000 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("basis_liabilities_assumed is accepted", () => {
  const result = compute([minimalItem({ basis_liabilities_assumed: 15000 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("basis_liabilities_relieved is accepted", () => {
  const result = compute([minimalItem({ basis_liabilities_relieved: 5000 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("negative basis_beginning throws (nonnegative constraint)", () => {
  assertThrows(() => compute([minimalItem({ basis_beginning: -100 })]), Error);
});

Deno.test("basis worksheet fields alongside income produce correct income routing", () => {
  // Basis fields are stored but do not affect routing of income boxes.
  const result = compute([
    minimalItem({
      box1_ordinary_business: 12000,
      basis_beginning: 30000,
      basis_contributions: 5000,
      basis_distributions: 2000,
    }),
  ]);
  const sch1 = findOutput(result, "schedule1");
  assertEquals(sch1?.fields.line5_schedule_e, 12000);
});

// ── 7. Pre-2018 Basis Carryover fields (K1P> "Pre-2018 Basis" tab) ───────────

Deno.test("pre2018_basis_ordinary_loss is accepted (informational; no routing output)", () => {
  const result = compute([minimalItem({ pre2018_basis_ordinary_loss: 4000 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("pre2018_basis_st_cap_loss is accepted", () => {
  const result = compute([minimalItem({ pre2018_basis_st_cap_loss: 1500 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("pre2018_basis_lt_cap_loss is accepted", () => {
  const result = compute([minimalItem({ pre2018_basis_lt_cap_loss: 2500 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("pre2018_basis_other_loss is accepted", () => {
  const result = compute([minimalItem({ pre2018_basis_other_loss: 1000 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("negative pre2018_basis_ordinary_loss throws (nonnegative constraint)", () => {
  assertThrows(
    () => compute([minimalItem({ pre2018_basis_ordinary_loss: -500 })]),
    Error,
  );
});

// ── 8. Pre-2018 At-Risk Carryover fields (K1P> "Pre-2018 At-Risk" tab) ───────

Deno.test("pre2018_atrisk_ordinary_loss is accepted (informational; no routing output)", () => {
  const result = compute([minimalItem({ pre2018_atrisk_ordinary_loss: 6000 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("pre2018_atrisk_st_cap_loss is accepted", () => {
  const result = compute([minimalItem({ pre2018_atrisk_st_cap_loss: 2000 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("pre2018_atrisk_lt_cap_loss is accepted", () => {
  const result = compute([minimalItem({ pre2018_atrisk_lt_cap_loss: 3000 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("pre2018_atrisk_other_loss is accepted", () => {
  const result = compute([minimalItem({ pre2018_atrisk_other_loss: 1500 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("negative pre2018_atrisk_ordinary_loss throws (nonnegative constraint)", () => {
  assertThrows(
    () => compute([minimalItem({ pre2018_atrisk_ordinary_loss: -100 })]),
    Error,
  );
});

Deno.test("pre-2018 carryover fields alongside QBI produce correct QBI routing", () => {
  const result = compute([
    minimalItem({
      box20z_qbi: 15000,
      pre2018_basis_ordinary_loss: 3000,
      pre2018_atrisk_ordinary_loss: 2000,
    }),
  ]);
  const f8995 = findOutput(result, "form8995");
  assertEquals(f8995?.fields.qbi, 15000);
});

// ── 9. Informational fields ───────────────────────────────────────────────────

Deno.test("partnership_name alone produces no outputs", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

// ── 10. Edge cases ────────────────────────────────────────────────────────────

Deno.test("all-zero K-1 produces no outputs", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("STCG and LTCG produce single merged schedule_d output", () => {
  const result = compute([
    minimalItem({ box8_net_st_cap_gain: 800, box9a_net_lt_cap_gain: 1200 }),
  ]);
  const sdOutputs = result.outputs.filter((o) => o.nodeType === "schedule_d");
  assertEquals(sdOutputs.length, 1);
  assertEquals(sdOutputs[0].fields.line_5_k1_st, 800);
  assertEquals(sdOutputs[0].fields.line_12_k1_lt, 1200);
});

// ── 11. SE tax priority and multiple K-1 aggregation ─────────────────────────

Deno.test("box14a takes priority over box4a for schedule_se when both present", () => {
  // Box 14a is the authoritative SE earnings figure; box4a fallback only when 14a absent
  const result = compute([
    minimalItem({ box4a_guaranteed_services: 5000, box14a_se_earnings: 12000 }),
  ]);
  const out = findOutput(result, "schedule_se");
  assertEquals(out?.fields.net_profit_schedule_c, 12000);
});

Deno.test("box14a_se_earnings from two K-1s aggregates into one schedule_se output", () => {
  // SE earnings are aggregated across K-1s to prevent array accumulation in schedule_se
  const result = compute([
    minimalItem({ box14a_se_earnings: 8000 }),
    minimalItem({ partnership_name: "Fund B", box14a_se_earnings: 6000 }),
  ]);
  const seOutputs = result.outputs.filter((o) => o.nodeType === "schedule_se");
  assertEquals(seOutputs.length, 1);
  assertEquals(seOutputs[0].fields.net_profit_schedule_c, 14000);
});

Deno.test("box20z_qbi sums across K-1s to form8995 qbi", () => {
  const result = compute([
    minimalItem({ box20z_qbi: 10000 }),
    minimalItem({ partnership_name: "Fund B", box20z_qbi: 5000 }),
  ]);
  const out = findOutput(result, "form8995");
  assertEquals(out?.fields.qbi, 15000);
});

Deno.test("box20_w2_wages sums across K-1s to form8995 w2_wages", () => {
  const result = compute([
    minimalItem({ box20z_qbi: 8000, box20_w2_wages: 4000 }),
    minimalItem({
      partnership_name: "Fund B",
      box20z_qbi: 4000,
      box20_w2_wages: 2000,
    }),
  ]);
  const out = findOutput(result, "form8995");
  assertEquals(out?.fields.w2_wages, 6000);
});

Deno.test("loss K-1 (box1 negative) does not suppress QBI from a second profitable K-1", () => {
  const result = compute([
    minimalItem({ box1_ordinary_business: -3000 }),
    minimalItem({ partnership_name: "Fund B", box20z_qbi: 7000 }),
  ]);
  // schedule1 nets to -3000 + 0 = -3000
  const sch1 = findOutput(result, "schedule1");
  assertEquals(sch1?.fields.line5_schedule_e, -3000);
  // QBI routes only from the second K-1
  const f8995 = findOutput(result, "form8995");
  assertEquals(f8995?.fields.qbi, 7000);
});

// ── 12. AGI aggregator routing ────────────────────────────────────────────────

Deno.test("box1_ordinary_business routes to agi_aggregator line5_schedule_e", () => {
  const result = compute([minimalItem({ box1_ordinary_business: 8000 })]);
  const out = findOutput(result, "agi_aggregator");
  assertEquals(out?.fields.line5_schedule_e, 8000);
});

Deno.test("zero income does not route to agi_aggregator", () => {
  const result = compute([minimalItem()]);
  const out = findOutput(result, "agi_aggregator");
  assertEquals(out, undefined);
});

// ── 13. Smoke test ────────────────────────────────────────────────────────────

Deno.test("smoke test — K-1 with all major boxes", () => {
  const result = compute([
    minimalItem({
      box1_ordinary_business: 20000,
      box4a_guaranteed_services: 5000,
      box5_interest: 400,
      box6a_ordinary_dividends: 600,
      box6b_qualified_dividends: 500,
      box8_net_st_cap_gain: 1000,
      box9a_net_lt_cap_gain: 3000,
      box14a_se_earnings: 25000,
      box16_foreign_tax: 200,
      box16_foreign_income: 1_000,
      box16_foreign_income_category: "passive",
      box20z_qbi: 20000,
      box20_w2_wages: 10000,
    }),
  ]);
  // schedule1: box1 (20000) + box4a (5000) = 25000
  const sch1 = findOutput(result, "schedule1");
  assertEquals(sch1?.fields.line5_schedule_e, 25000);
  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040?.fields.line3a_qualified_dividends, 500);
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd?.fields.line_5_k1_st, 1000);
  assertEquals(sd?.fields.line_12_k1_lt, 3000);
  const schSe = findOutput(result, "schedule_se");
  assertEquals(schSe?.fields.net_profit_schedule_c, 25000);
  const f8995 = findOutput(result, "form8995");
  assertEquals(f8995?.fields.qbi, 20000);
  assertEquals(f8995?.fields.w2_wages, 10000);
  const f1116 = findOutput(result, "form_1116");
  assertEquals(
    (f1116?.fields.foreign_tax_items as Array<Record<string, unknown>>)[0]
      .foreign_tax_paid,
    200,
  );
});
