import { assertEquals, assertThrows } from "@std/assert";
import { k1SCorpNode } from "./index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    corporation_name: "Test S Corp",
    ...overrides,
  };
}

function stockLossLedger(beginningStockBasis: number) {
  return {
    shareholder_ssn: "123456789",
    shareholder_name_as_on_k1: "Alex Taxpayer",
    corporation_ein: "123456789",
    beginning_stock_basis: beginningStockBasis,
    beginning_basis_workpaper_reference: "2024 shareholder stock ledger",
    original_shareholder: true,
    all_shares_one_stock_block: true,
    no_current_year_stock_transactions: true,
    no_section_1367_1_g_election: true,
    no_other_2025_stock_basis_changes: true,
    no_other_schedule_e_activity: true,
    materially_participated_in_s_corporation: true,
    material_participation_workpaper_reference:
      "2025 shareholder participation log",
    no_shareholder_debt_or_repayments: true,
    no_prior_year_suspended_losses: true,
    no_at_risk_or_passive_limitation: true,
  };
}

function reviewedLossItem(
  beginningStockBasis: number,
  overrides: Record<string, unknown> = {},
) {
  return minimalItem({
    corporation_ein: "123456789",
    source_document_reference: "2025 S corporation K-1",
    form7203_stock_loss_ledger: stockLossLedger(beginningStockBasis),
    ...overrides,
  });
}

function compute(items: Record<string, unknown>[]) {
  return k1SCorpNode.compute(
    { taxYear: 2025, formType: "f1040" },
    k1SCorpNode.inputSchema.parse({ k1_s_corps: items }),
  );
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

Deno.test("S corporation K-1 portfolio boxes feed Form 4952 only when affirmed", () => {
  const item = minimalItem({
    box4_interest: 200,
    box5a_ordinary_dividends: 300,
    box5b_qualified_dividends: 100,
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

Deno.test("S corporation K-1 box 12 code H routes investment interest without a generic deduction", () => {
  const item = minimalItem({
    corporation_ein: "123456789",
    source_document_reference: "2025 K-1 box 12 code H",
    box12_code_h_investment_interest: 375,
  });
  const result = compute([item]);
  assertEquals(findOutput(result, "form4952")?.fields, {
    source_k1_investment_interest: 375,
  });
  assertEquals(findOutput(result, "schedule_a"), undefined);
  assertThrows(() =>
    compute([minimalItem({
      box12_code_h_investment_interest: 375,
    })])
  );
  assertThrows(() => compute([{ ...item, box12_other_deductions: 375 }]));
});

Deno.test("S corporation K-1 box 13 code Z needs source identity and passive classification", () => {
  assertThrows(() =>
    compute([minimalItem({ box13_code_z_orphan_drug_credit: 1_250 })])
  );
  compute([minimalItem({
    corporation_ein: "123456789",
    source_document_reference: "2025 S corporation K-1",
    box13_code_z_orphan_drug_credit: 1_250,
    orphan_drug_credit_subject_to_passive_activity_limit: false,
  })]);
});

Deno.test("S corporation K-1 code Z reaches source-backed Form 3800", () => {
  const item = minimalItem({
    corporation_ein: "123456789",
    source_document_reference: "2025 S corporation K-1",
    box13_code_z_orphan_drug_credit: 1_250,
    orphan_drug_credit_subject_to_passive_activity_limit: false,
  });
  assertEquals(findOutput(compute([item]), "f3800")?.fields, {
    f8820_k1_credit_entries: [{
      source_type: "s_corporation",
      source_ein: "123456789",
      source_document_reference: "2025 S corporation K-1",
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
        source_type: "s_corporation",
        source_ein: "123456789",
        source_document_reference: "2025 S corporation K-1",
        credit_amount: 1_250,
      }],
    },
  );
});

Deno.test("S corporation K-1 box 13 code AD reaches Form 3800 line 1i source", () => {
  assertThrows(() =>
    compute([minimalItem({
      box13_code_ad_new_markets_credit: 1_250,
    })])
  );
  const item = minimalItem({
    corporation_ein: "123456789",
    source_document_reference: "2025 S corporation K-1",
    box13_code_ad_new_markets_credit: 1_250,
    new_markets_credit_subject_to_passive_activity_limit: false,
  });
  assertEquals(findOutput(compute([item]), "f3800")?.fields, {
    f8874_k1_credit_entries: [{
      source_type: "s_corporation",
      source_ein: "123456789",
      source_document_reference: "2025 S corporation K-1",
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
        source_type: "s_corporation",
        source_ein: "123456789",
        source_document_reference: "2025 S corporation K-1",
        credit_amount: 1_250,
      }],
    },
  );
});

Deno.test("S corporation K-1 box 13 code K needs source identity and passive classification", () => {
  assertThrows(() =>
    compute([minimalItem({ box13_code_k_disabled_access_credit: 500 })])
  );
  const result = compute([minimalItem({
    corporation_ein: "123456789",
    source_document_reference: "2025 S corporation K-1",
    box13_code_k_disabled_access_credit: 500.25,
    disabled_access_credit_subject_to_passive_activity_limit: true,
  })]);
  assertEquals(findOutput(result, "disabled_access_limit")?.fields, {
    required_disabled_access_k1_credits: [{
      source_type: "s_corporation",
      source_ein: "123456789",
      source_document_reference: "2025 S corporation K-1",
      credit_amount: 500.25,
    }],
  });
  assertThrows(() =>
    compute([minimalItem({
      corporation_ein: "123456789",
      source_document_reference: "2025 S corporation K-1",
      box13_code_k_disabled_access_credit: 500.251,
      disabled_access_credit_subject_to_passive_activity_limit: true,
    })])
  );
});

Deno.test("nonpassive S corporation K-1 code K reaches source-backed Form 3800", () => {
  const result = compute([minimalItem({
    corporation_ein: "123456789",
    source_document_reference: "2025 S corporation K-1",
    box13_code_k_disabled_access_credit: 500.25,
    disabled_access_credit_subject_to_passive_activity_limit: false,
  })]);
  assertEquals(findOutput(result, "disabled_access_limit")?.fields, {
    f8826_credit_entries: [{
      source_type: "s_corporation",
      source_ein: "123456789",
      source_document_reference: "2025 S corporation K-1",
      credit_amount: 500.25,
      subject_to_passive_activity_limit: false,
    }],
  });
  assertEquals(findOutput(result, "form8582cr"), undefined);
});

Deno.test("box 9 retains each S-corp's Form 4797 line 2 amount", () => {
  const result = compute([
    minimalItem({ corporation_name: "Corp One", box9_net_1231: 3_000 }),
    minimalItem({ corporation_name: "Corp Two", box9_net_1231: 4_000 }),
  ]);
  const fields = findOutput(result, "form4797")?.fields;
  assertEquals(fields?.section_1231_gain, 7_000);
  assertEquals(fields?.k1_1231_rows, [
    { source: "s_corp", entity_name: "Corp One", gain_loss: 3_000 },
    { source: "s_corp", entity_name: "Corp Two", gain_loss: 4_000 },
  ]);
});

// ── 1. Input schema validation ────────────────────────────────────────────────

Deno.test("empty array throws", () => {
  assertThrows(
    () =>
      k1SCorpNode.compute({ taxYear: 2025, formType: "f1040" }, {
        k1_s_corps: [],
      }),
    Error,
  );
});

Deno.test("missing corporation_name throws", () => {
  assertThrows(
    () =>
      k1SCorpNode.compute({ taxYear: 2025, formType: "f1040" }, {
        k1_s_corps: [
          { box1_ordinary_business: 100 } as unknown as ReturnType<
            typeof minimalItem
          >,
        ],
      }),
    Error,
  );
});

Deno.test("negative box4_interest throws", () => {
  assertThrows(() => compute([minimalItem({ box4_interest: -1 })]), Error);
});

Deno.test("negative box5a_ordinary_dividends throws", () => {
  assertThrows(
    () => compute([minimalItem({ box5a_ordinary_dividends: -5 })]),
    Error,
  );
});

Deno.test("negative box5b_qualified_dividends throws", () => {
  assertThrows(
    () => compute([minimalItem({ box5b_qualified_dividends: -10 })]),
    Error,
  );
});

// ── 2. Per-box routing ────────────────────────────────────────────────────────

Deno.test("box1_ordinary_business routes to schedule1 line5_schedule_e", () => {
  const result = compute([minimalItem({ box1_ordinary_business: 5000 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 5000);
  assertEquals(
    findOutput(result, "agi_aggregator")?.fields.line5_schedule_e,
    5000,
  );
});

Deno.test("negative box1 (loss) routes to schedule1 line5_schedule_e", () => {
  const result = compute([reviewedLossItem(3000, {
    box1_ordinary_business: -2000,
  })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, -2000);
});

Deno.test("negative S corporation box1 without basis facts rejects before a loss can file", () => {
  assertThrows(
    () => compute([minimalItem({ box1_ordinary_business: -2000 })]),
    Error,
    "ordinary loss needs shareholder basis facts and Form 7203 filing review",
  );
});

Deno.test("zero box1 does not route to schedule1", () => {
  const result = compute([minimalItem()]);
  const out = findOutput(result, "schedule1");
  assertEquals(out, undefined);
});

Deno.test("box2_rental_re routes to schedule1 line5_schedule_e", () => {
  const result = compute([minimalItem({ box2_rental_re: 3000 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 3000);
});

Deno.test("box3_other_rental routes to schedule1 line5_schedule_e", () => {
  const result = compute([minimalItem({ box3_other_rental: 1500 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 1500);
});

Deno.test("box6_royalties routes to schedule1 line5_schedule_e", () => {
  const result = compute([minimalItem({ box6_royalties: 800 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 800);
});

Deno.test("box4_interest routes to schedule_b taxable_interest_net", () => {
  const result = compute([minimalItem({ box4_interest: 400 })]);
  const out = findOutput(result, "schedule_b");
  assertEquals(out?.fields.taxable_interest_net, 400);
});

Deno.test("zero box4_interest does not route to schedule_b", () => {
  const result = compute([minimalItem()]);
  const out = findOutput(result, "schedule_b");
  assertEquals(out, undefined);
});

Deno.test("box5a_ordinary_dividends routes to schedule_b ordinaryDividends", () => {
  const result = compute([minimalItem({ box5a_ordinary_dividends: 600 })]);
  const out = findOutput(result, "schedule_b");
  assertEquals(out?.fields.ordinaryDividends, 600);
});

Deno.test("box5b_qualified_dividends routes to f1040 line3a", () => {
  const result = compute([minimalItem({ box5b_qualified_dividends: 400 })]);
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line3a_qualified_dividends, 400);
});

Deno.test("zero box5b does not route to f1040", () => {
  const result = compute([minimalItem()]);
  const out = findOutput(result, "f1040");
  assertEquals(out, undefined);
});

Deno.test("box7_net_st_cap_gain routes to schedule_d line_5_k1_st", () => {
  const result = compute([minimalItem({ box7_net_st_cap_gain: 1000 })]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields.line_5_k1_st, 1000);
});

Deno.test("negative box7 routes to schedule_d as loss", () => {
  const result = compute([minimalItem({ box7_net_st_cap_gain: -300 })]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields.line_5_k1_st, -300);
});

Deno.test("box8a_net_lt_cap_gain routes to schedule_d line_12_k1_lt", () => {
  const result = compute([minimalItem({ box8a_net_lt_cap_gain: 2000 })]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields.line_12_k1_lt, 2000);
});

Deno.test("positive box1 routes to form8995 as qbi", () => {
  const result = compute([minimalItem({ box1_ordinary_business: 10000 })]);
  const out = findOutput(result, "form8995");
  assertEquals(out?.fields.qbi, 10000);
});

Deno.test("negative box1 does not route to form8995", () => {
  const result = compute([reviewedLossItem(6000, {
    box1_ordinary_business: -5000,
  })]);
  const out = findOutput(result, "form8995");
  assertEquals(out, undefined);
});

Deno.test("box17_w2_wages routes to form8995 w2_wages", () => {
  const result = compute([
    minimalItem({ box1_ordinary_business: 10000, box17_w2_wages: 5000 }),
  ]);
  const out = findOutput(result, "form8995");
  assertEquals(out?.fields.w2_wages, 5000);
});

Deno.test("box14_foreign_tax routes to form_1116", () => {
  const result = compute([
    minimalItem({
      box14_foreign_tax: 200,
      box14_foreign_income: 1_000,
      box14_foreign_income_category: "passive",
      box14_foreign_tax_irs_country_code: "FR",
      box14_foreign_tax_paid_or_accrued_date: "2025-07-20",
      box14_foreign_tax_kind: "dividends",
      box14_foreign_tax_credit_method: "accrued",
    }),
  ]);
  const out = findOutput(result, "form_1116");
  assertEquals(
    (out?.fields.foreign_tax_items as Array<Record<string, unknown>>)[0]
      .foreign_tax_paid,
    200,
  );
  const taxItem =
    (out?.fields.foreign_tax_items as Array<Record<string, unknown>>)[0];
  assertEquals(taxItem.irs_country_code, "FR");
  assertEquals(taxItem.tax_paid_or_accrued_date, "2025-07-20");
  assertEquals(taxItem.tax_kind, "dividends");
  assertEquals(taxItem.tax_credit_method, "accrued");
});

Deno.test("zero box14_foreign_tax does not route to form_1116", () => {
  const result = compute([minimalItem()]);
  const out = findOutput(result, "form_1116");
  assertEquals(out, undefined);
});

// ── 3. Aggregation across multiple K-1s ──────────────────────────────────────

Deno.test("box1 sums across K-1s to schedule1 line5_schedule_e", () => {
  const result = compute([
    minimalItem({ box1_ordinary_business: 3000 }),
    minimalItem({ corporation_name: "Corp B", box1_ordinary_business: 2000 }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 5000);
});

Deno.test("box5b sums across K-1s to f1040 line3a", () => {
  const result = compute([
    minimalItem({ box5b_qualified_dividends: 300 }),
    minimalItem({ corporation_name: "Corp B", box5b_qualified_dividends: 200 }),
  ]);
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line3a_qualified_dividends, 500);
});

Deno.test("box7 STCG sums across K-1s to schedule_d", () => {
  const result = compute([
    minimalItem({ box7_net_st_cap_gain: 1000 }),
    minimalItem({ corporation_name: "Corp B", box7_net_st_cap_gain: 500 }),
  ]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields.line_5_k1_st, 1500);
});

Deno.test("box1+box2+box3+box6 combined in schedule1 line5_schedule_e", () => {
  const result = compute([
    minimalItem({
      box1_ordinary_business: 2000,
      box2_rental_re: 1000,
      box3_other_rental: 500,
      box6_royalties: 300,
    }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 3800);
});

// ── 7. Informational fields ───────────────────────────────────────────────────

Deno.test("corporation_name alone produces no outputs", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

// ── 8. Edge cases ─────────────────────────────────────────────────────────────

Deno.test("all-zero K-1 produces no outputs", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("STCG and LTCG produce single merged schedule_d output", () => {
  const result = compute([
    minimalItem({ box7_net_st_cap_gain: 500, box8a_net_lt_cap_gain: 1000 }),
  ]);
  const sdOutputs = result.outputs.filter((o) => o.nodeType === "schedule_d");
  assertEquals(sdOutputs.length, 1);
  assertEquals(sdOutputs[0].fields.line_5_k1_st, 500);
  assertEquals(sdOutputs[0].fields.line_12_k1_lt, 1000);
});

// ── 4. QBI dedicated fields (K199 screen) ─────────────────────────────────────

Deno.test("qbi_amount routes to form8995 qbi (non-SSTB)", () => {
  const result = compute([minimalItem({ qbi_amount: 12000 })]);
  const out = findOutput(result, "form8995");
  assertEquals(out?.fields.qbi, 12000);
});

Deno.test("qbi_amount overrides box1 for form8995 routing", () => {
  // qbi_amount provided: use it directly instead of clamping box1
  const result = compute([
    minimalItem({ box1_ordinary_business: 5000, qbi_amount: 8000 }),
  ]);
  const out = findOutput(result, "form8995");
  // resolveQbiAmount returns qbi_amount (8000) for the non-SSTB item
  assertEquals(out?.fields.qbi, 8000);
});

Deno.test("w2_wages field routes to form8995 w2_wages", () => {
  const result = compute([minimalItem({ qbi_amount: 5000, w2_wages: 3000 })]);
  const out = findOutput(result, "form8995");
  assertEquals(out?.fields.w2_wages, 3000);
});

Deno.test("ubia_qualified_property routes to form8995 unadjusted_basis", () => {
  const result = compute([
    minimalItem({ qbi_amount: 5000, ubia_qualified_property: 50000 }),
  ]);
  const out = findOutput(result, "form8995");
  assertEquals(out?.fields.unadjusted_basis, 50000);
});

Deno.test("sstb_indicator keeps QBI and limitation amounts in the SSTB pool", () => {
  const result = compute([minimalItem({
    qbi_amount: 10000,
    sstb_indicator: true,
    w2_wages: 2000,
    ubia_qualified_property: 50_000,
  })]);
  const out = findOutput(result, "form8995");
  assertEquals(out?.fields.qbi, undefined);
  assertEquals(out?.fields.sstb_qbi, 10_000);
  assertEquals(out?.fields.sstb_w2_wages, 2_000);
  assertEquals(out?.fields.sstb_unadjusted_basis, 50_000);
});

Deno.test("mixed SSTB and non-SSTB amounts remain separate for Form 8995-A", () => {
  const result = compute([
    minimalItem({
      corporation_name: "Corp A",
      qbi_amount: 8000,
      sstb_indicator: false,
    }),
    minimalItem({
      corporation_name: "Corp B",
      qbi_amount: 5000,
      sstb_indicator: true,
    }),
  ]);
  const out = findOutput(result, "form8995");
  assertEquals(out?.fields.qbi, 8000);
  assertEquals(out?.fields.sstb_qbi, 5000);
});

Deno.test("negative qbi_amount does not route to form8995", () => {
  const result = compute([minimalItem({ qbi_amount: -3000 })]);
  const out = findOutput(result, "form8995");
  assertEquals(out, undefined);
});

Deno.test("box17_w2_wages and w2_wages are additive in form8995", () => {
  const result = compute([
    minimalItem({
      box1_ordinary_business: 10000,
      box17_w2_wages: 2000,
      w2_wages: 3000,
    }),
  ]);
  const out = findOutput(result, "form8995");
  assertEquals(out?.fields.w2_wages, 5000);
});

// ── 5. Form 7203 basis routing (K1S > "Basis (7203)" tab) ────────────────────

Deno.test("stock_basis_beginning routes to form7203", () => {
  const result = compute([minimalItem({ stock_basis_beginning: 10000 })]);
  const out = findOutput(result, "form7203");
  assertEquals(out?.fields.stock_basis_beginning, 10000);
});

Deno.test("debt_basis_beginning routes to form7203", () => {
  const result = compute([minimalItem({ debt_basis_beginning: 5000 })]);
  const out = findOutput(result, "form7203");
  assertEquals(out?.fields.debt_basis_beginning, 5000);
});

Deno.test("no basis fields does not route to form7203", () => {
  const result = compute([minimalItem({ box1_ordinary_business: 10000 })]);
  const out = findOutput(result, "form7203");
  assertEquals(out, undefined);
});

Deno.test("loss with stock basis routes ordinary_loss to form7203", () => {
  const result = compute([
    reviewedLossItem(3000, { box1_ordinary_business: -4000 }),
  ]);
  const out = findOutput(result, "form7203");
  assertEquals(out?.fields.ordinary_loss, 4000);
});

// ── 6. Pre-2018 carryover fields ──────────────────────────────────────────────

Deno.test("pre2018 basis carryover stops before an unsupported current-year add-back", () => {
  assertThrows(
    () => compute([minimalItem({ pre2018_suspended_losses: 7000 })]),
    Error,
    "need separate reviewed loss routes",
  );
});

Deno.test("pre2018 at-risk carryover does not masquerade as basis carryover", () => {
  assertThrows(
    () => compute([minimalItem({ pre2018_at_risk_suspended: 2500 })]),
    Error,
    "need separate reviewed loss routes",
  );
});

Deno.test("ordinary-loss stock route rejects absent ledger and debt basis", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        corporation_ein: "123456789",
        source_document_reference: "2025 S corporation K-1",
        box1_ordinary_business: -4000,
        stock_basis_beginning: 3000,
      })]),
    Error,
    "reviewed stock-only beginning basis",
  );
  assertThrows(
    () =>
      compute([reviewedLossItem(3000, {
        box1_ordinary_business: -4000,
        debt_basis_beginning: 500,
      })]),
    Error,
    "reviewed stock-only beginning basis",
  );
});

Deno.test("ordinary-loss ledger EIN must match the issued K-1", () => {
  const item = reviewedLossItem(3000, { box1_ordinary_business: -4000 });
  assertThrows(
    () =>
      compute([{
        ...item,
        form7203_stock_loss_ledger: {
          ...stockLossLedger(3000),
          corporation_ein: "999999999",
        },
      }]),
    Error,
    "reviewed stock-only beginning basis",
  );
});

Deno.test("ordinary-loss ledger rejects undeclared basis fields", () => {
  const item = reviewedLossItem(3000, { box1_ordinary_business: -4000 });
  assertThrows(() =>
    compute([{
      ...item,
      form7203_stock_loss_ledger: {
        ...stockLossLedger(3000),
        unreviewed_extra_basis: 400,
      },
    }])
  );
});

Deno.test("ordinary-loss ledger does not merge two corporations", () => {
  assertThrows(
    () =>
      compute([
        reviewedLossItem(3000, { box1_ordinary_business: -4000 }),
        minimalItem({
          corporation_name: "Another S Corp",
          box1_ordinary_business: 1000,
        }),
      ]),
    Error,
    "exactly one S-corporation K-1",
  );
});

Deno.test("ordinary-loss ledger is not a generic no-loss basis record", () => {
  assertThrows(
    () => compute([reviewedLossItem(3000)]),
    Error,
    "needs a current K-1 box-1 ordinary loss",
  );
});

Deno.test("ordinary-loss stock route accepts reviewed explicit zero basis", () => {
  const result = compute([reviewedLossItem(0, {
    box1_ordinary_business: -4000,
  })]);
  assertEquals(findOutput(result, "form7203")?.fields.ordinary_loss, 4000);
  assertEquals(findOutput(result, "form7203")?.fields.stock_basis_beginning, 0);
});

Deno.test("ordinary-loss stock route rejects a contradictory other K-1 basis item", () => {
  assertThrows(
    () =>
      compute([reviewedLossItem(3000, {
        box1_ordinary_business: -4000,
        box4_interest: 250,
      })]),
    Error,
    "no other changes",
  );
});

Deno.test("misidentified box 17 distribution cannot bypass Form 7203 filing review", () => {
  assertThrows(
    () => compute([minimalItem({ box17_distributions: 500 })]),
    Error,
    "box 16 code D source",
  );
});

Deno.test("negative pre2018_suspended_losses throws", () => {
  assertThrows(
    () => compute([minimalItem({ pre2018_suspended_losses: -100 })]),
    Error,
  );
});

Deno.test("negative pre2018_at_risk_suspended throws", () => {
  assertThrows(
    () => compute([minimalItem({ pre2018_at_risk_suspended: -50 })]),
    Error,
  );
});

// ── 9. Smoke test ─────────────────────────────────────────────────────────────

Deno.test("untyped S-corporation box 10 is rejected, even when zero", () => {
  for (const amount of [0, 450]) {
    assertThrows(
      () => compute([minimalItem({ box10_other_income: amount })]),
      Error,
      "Untyped S-corporation K-1 box 10",
    );
  }
});

Deno.test("box 10 code J routes only reviewed taxable recovery to line 8z and AGI", () => {
  const result = compute([minimalItem({
    corporation_ein: "123456789",
    source_document_reference:
      "2025 K-1 box 10 code J and prior-year tax workpaper",
    box10_code_j_recovery: 1000,
    box10_code_j_taxable_recovery: 650,
    box10_code_j_tax_benefit_workpaper_reference:
      "2024 deduction and tax-benefit reconciliation",
    box10_code_j_prior_year_tax_benefit_reviewed: true,
  })]);
  assertEquals(
    findOutput(result, "schedule1")?.fields
      .line8z_k1_s_corp_tax_benefit_recovery,
    650,
  );
  assertEquals(
    findOutput(result, "agi_aggregator")?.fields
      .line8z_k1_s_corp_tax_benefit_recovery,
    650,
  );
});

Deno.test("box 10 code J recovery requires source and prior-year benefit review", () => {
  const base = {
    box10_code_j_recovery: 1000,
    box10_code_j_taxable_recovery: 650,
  };
  assertThrows(
    () => compute([minimalItem(base)]),
    Error,
    "corporation_ein",
  );
  assertThrows(
    () =>
      compute([minimalItem({
        ...base,
        corporation_ein: "123456789",
        source_document_reference: "2025 K-1 box 10 code J",
      })]),
    Error,
    "box10_code_j_tax_benefit_workpaper_reference",
  );
  assertThrows(
    () =>
      compute([minimalItem({
        ...base,
        corporation_ein: "123456789",
        source_document_reference: "2025 K-1 box 10 code J",
        box10_code_j_tax_benefit_workpaper_reference: "2024 tax workpaper",
      })]),
    Error,
    "box10_code_j_prior_year_tax_benefit_reviewed",
  );
});

Deno.test("box 10 code J taxable subset cannot exceed K-1 recovery", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        corporation_ein: "123456789",
        source_document_reference: "2025 K-1 box 10 code J",
        box10_code_j_recovery: 500,
        box10_code_j_taxable_recovery: 600,
        box10_code_j_tax_benefit_workpaper_reference: "2024 tax workpaper",
        box10_code_j_prior_year_tax_benefit_reviewed: true,
      })]),
    Error,
    "taxable recovery exceeds K-1 recovery",
  );
});

Deno.test("box 10 code J taxable recoveries aggregate without losing other Schedule E income", () => {
  const result = compute([
    minimalItem({
      corporation_ein: "123456789",
      source_document_reference: "2025 K-1 A code J",
      box1_ordinary_business: 800,
      box10_code_j_recovery: 400,
      box10_code_j_taxable_recovery: 250,
      box10_code_j_tax_benefit_workpaper_reference: "2024 tax workpaper A",
      box10_code_j_prior_year_tax_benefit_reviewed: true,
    }),
    minimalItem({
      corporation_name: "Second S Corp",
      corporation_ein: "987654321",
      source_document_reference: "2025 K-1 B code J",
      box10_code_j_recovery: 200,
      box10_code_j_taxable_recovery: 150,
      box10_code_j_tax_benefit_workpaper_reference: "2024 tax workpaper B",
      box10_code_j_prior_year_tax_benefit_reviewed: true,
    }),
  ]);
  const schedule1Outputs = result.outputs.filter((o) =>
    o.nodeType === "schedule1"
  );
  assertEquals(
    schedule1Outputs.some((o) => o.fields.line5_schedule_e === 800),
    true,
  );
  assertEquals(
    schedule1Outputs.some((o) =>
      o.fields.line8z_k1_s_corp_tax_benefit_recovery === 400
    ),
    true,
  );
  const agiOutputs = result.outputs.filter((o) =>
    o.nodeType === "agi_aggregator"
  );
  assertEquals(
    agiOutputs.some((o) => o.fields.line5_schedule_e === 800),
    true,
  );
  assertEquals(
    agiOutputs.some((o) =>
      o.fields.line8z_k1_s_corp_tax_benefit_recovery === 400
    ),
    true,
  );
});

Deno.test("smoke test — K-1 with all major boxes", () => {
  const result = compute([
    minimalItem({
      box1_ordinary_business: 15000,
      box2_rental_re: 2000,
      box4_interest: 300,
      box5a_ordinary_dividends: 500,
      box5b_qualified_dividends: 400,
      box7_net_st_cap_gain: 800,
      box8a_net_lt_cap_gain: 1500,
      box17_w2_wages: 8000,
      box14_foreign_tax: 150,
      box14_foreign_income: 750,
      box14_foreign_income_category: "passive",
    }),
  ]);
  const sch1 = findOutput(result, "schedule1");
  assertEquals(sch1?.fields.line5_schedule_e, 17000); // 15000 + 2000
  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040?.fields.line3a_qualified_dividends, 400);
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd?.fields.line_5_k1_st, 800);
  assertEquals(sd?.fields.line_12_k1_lt, 1500);
  const f8995 = findOutput(result, "form8995");
  assertEquals(f8995?.fields.qbi, 15000);
  assertEquals(f8995?.fields.w2_wages, 8000);
  const f1116 = findOutput(result, "form_1116");
  assertEquals(
    (f1116?.fields.foreign_tax_items as Array<Record<string, unknown>>)[0]
      .foreign_tax_paid,
    150,
  );
});
