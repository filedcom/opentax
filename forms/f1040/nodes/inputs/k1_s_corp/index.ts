import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import {
  type AtLeastOne,
  output,
  TaxNode,
} from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import { schedule_b } from "../../intermediate/aggregation/schedule_b/index.ts";
import { schedule_d } from "../../intermediate/aggregation/schedule_d/index.ts";
import { form8995 } from "../../intermediate/forms/form8995/index.ts";
import {
  ForeignTaxCreditMethod,
  ForeignTaxKind,
  form_1116,
  IncomeCategory,
  sCorpK3PassiveInterestSchema,
} from "../../intermediate/forms/form_1116/index.ts";
import { form7203 } from "../../intermediate/forms/form7203/index.ts";
import { reviewedStockLossLedgerSchema } from "../../intermediate/forms/form7203/stock-ledger.ts";
import { form4797 } from "../../intermediate/forms/form4797/index.ts";
import { rate_28_gain_worksheet } from "../../intermediate/worksheets/rate_28_gain_worksheet/index.ts";
import { unrecaptured_1250_worksheet } from "../../intermediate/worksheets/unrecaptured_1250_worksheet/index.ts";
import { form4562 } from "../../intermediate/forms/form4562/index.ts";
import { form6251 } from "../../intermediate/forms/form6251/index.ts";
import { form4952 } from "../../intermediate/forms/form4952/index.ts";
import { f3800 } from "../f3800/index.ts";
import { form8582cr } from "../../intermediate/forms/form8582cr/index.ts";
import { disabledAccessLimit } from "../../intermediate/forms/disabled_access_limit/index.ts";
import { scheduleA as schedule_a } from "../schedule_a/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Schedule K-1 (Form 1120-S) — Shareholder's Share of Income, Deductions, Credits
//
// Issued by S corporations to shareholders.
// Ordinary business income does NOT trigger SE tax (unlike partnership guaranteed payments).
//
// IRS Instructions: https://www.irs.gov/instructions/i1120ssk
// IRC §1366 — pass-through taxation; IRC §199A — QBI deduction

// Per-item schema — one K-1 from one S corporation
export const itemSchema = z.object({
  // Identification
  corporation_name: z.string().min(1),
  corporation_ein: z.string().regex(/^\d{9}$/).optional(),
  source_document_reference: z.string().trim().min(1).optional(),
  // Box 13 code Z is the shareholder's orphan-drug credit.
  box13_code_z_orphan_drug_credit: z.number().int().positive().optional(),
  orphan_drug_credit_subject_to_passive_activity_limit: z.boolean().optional(),
  box13_code_ad_new_markets_credit: z.number().int().positive().optional(),
  new_markets_credit_subject_to_passive_activity_limit: z.boolean().optional(),
  box13_code_k_disabled_access_credit: z.number().finite().positive().refine(
    (amount) =>
      Number.isSafeInteger(Math.round(amount * 100)) &&
      Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001,
    { message: "K-1 disabled-access credit needs cent precision" },
  ).optional(),
  disabled_access_credit_subject_to_passive_activity_limit: z.boolean()
    .optional(),
  // Affirm portfolio boxes 4/5 are investment-property income not already
  // included in Form 4952's manual "other" facts.
  investment_property_for_form4952: z.boolean().optional(),

  // Box 1 — Ordinary business income/loss → Schedule E page 2 → Schedule 1 line 5
  box1_ordinary_business: z.number().optional(),

  // Box 2 — Net rental real estate income/loss → Schedule E
  box2_rental_re: z.number().optional(),

  // Box 3 — Other net rental income/loss → Schedule E
  box3_other_rental: z.number().optional(),

  // Box 4 — Interest income → Schedule B
  box4_interest: z.number().nonnegative().optional(),

  // Box 5a — Ordinary dividends → Schedule B
  box5a_ordinary_dividends: z.number().nonnegative().optional(),

  // Box 5b — Qualified dividends → Form 1040 line 3a
  box5b_qualified_dividends: z.number().nonnegative().optional(),

  // Box 6 — Royalties → Schedule E line 4
  box6_royalties: z.number().optional(),

  // Box 7 — Net STCG/loss → Schedule D line 5
  box7_net_st_cap_gain: z.number().optional(),

  // Box 8a — Net LTCG/loss → Schedule D line 12
  box8a_net_lt_cap_gain: z.number().optional(),

  // Box 8b — Collectibles (28%) gain/loss → Schedule D 28% Rate Gain Worksheet
  box8b_collectibles_gain: z.number().optional().describe(
    "Box 8b — Collectibles (28%) gain/loss",
  ),

  // Box 8c — Unrecaptured §1250 gain → Unrecaptured §1250 Gain Worksheet
  box8c_unrecaptured_1250: z.number().nonnegative().optional().describe(
    "Box 8c — Unrecaptured section 1250 gain",
  ),

  // Box 9 — Net §1231 gain/loss (informational; full computation requires Form 4797)
  box9_net_1231: z.number().optional(),

  // Box 10 codes have different destinations. Reject the former untyped total.
  box10_other_income: z.number().optional().describe(
    "Unsupported untyped box 10 other income (loss)",
  ),
  // Code J is a recovery only to the extent a prior-year deduction produced a
  // tax benefit. The reviewed taxable amount may be less than the K-1 amount.
  box10_code_j_recovery: z.number().finite().positive().optional(),
  box10_code_j_taxable_recovery: z.number().finite().positive().optional(),
  box10_code_j_tax_benefit_workpaper_reference: z.string().trim().min(1)
    .optional(),
  box10_code_j_prior_year_tax_benefit_reviewed: z.literal(true).optional(),

  // Box 11 — Section 179 deduction → Form 4562
  box11_section_179: z.number().nonnegative().optional().describe(
    "Box 11 — Section 179 deduction",
  ),

  // Box 12 — Other deductions (various codes A–S)
  box12_other_deductions: z.number().nonnegative().optional().describe(
    "Box 12 — Other deductions",
  ),
  // Code H must go through Form 4952, not the generic Schedule A line 16 route.
  box12_code_h_investment_interest: z.number().positive().optional(),

  // Box 15 — Alternative minimum tax (AMT) items (codes A–C) → Form 6251
  box15_amt_adjustment: z.number().optional().describe(
    "Box 15 — Alternative minimum tax (AMT) items",
  ),

  // Box 16 — Tax-exempt income and nondeductible expenses (codes A–C)
  box16_tax_exempt_income: z.number().nonnegative().optional().describe(
    "Box 16 — Tax-exempt income and nondeductible expenses",
  ),

  // Previously mislabeled distribution field. TY2025 nondividend distributions
  // are box 16 code D; this field is rejected until that source is modeled.
  box17_distributions: z.number().nonnegative().optional().describe(
    "Box 17 — Distributions",
  ),

  // Box 14 — Foreign taxes → Form 1116
  box14_foreign_tax: z.number().nonnegative().optional(),
  box14_foreign_income: z.number().nonnegative().optional(),
  box14_foreign_income_category: z.nativeEnum(IncomeCategory).optional(),
  box14_foreign_deductions: z.number().nonnegative().optional(),
  box14_foreign_deductions_explanation: z.string().trim().min(1).optional(),
  // Use the country, tax type, and payment details from Schedule K-3 Part III.
  box14_foreign_tax_irs_country_code: z.string().length(2).optional(),
  box14_foreign_tax_paid_or_accrued_date: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
  ).optional(),
  box14_foreign_tax_kind: z.nativeEnum(ForeignTaxKind).optional(),
  box14_foreign_tax_credit_method: z.nativeEnum(ForeignTaxCreditMethod)
    .optional(),
  // One 2025 Schedule K-3 (Form 1120-S) passive-interest source.
  schedule_k3_passive_interest: sCorpK3PassiveInterestSchema.optional(),

  // Box 17 — QBI/W-2 wages/UBIA for §199A deduction (legacy fields retained for compat)
  box17_w2_wages: z.number().nonnegative().optional(),
  box17_ubia: z.number().nonnegative().optional(),

  // ── QBI fields (K-1 box 17 code V / K199 screen) ─────────────────────────
  // Qualified business income/loss amount per §199A
  qbi_amount: z.number().optional(),
  // W-2 wages allocable to the qualified trade or business
  w2_wages: z.number().nonnegative().optional(),
  // Unadjusted basis immediately after acquisition of qualified property
  ubia_qualified_property: z.number().nonnegative().optional(),
  // True when the trade/business is a specified service trade/business (SSTB)
  sstb_indicator: z.boolean().optional(),

  // ── Form 7203 basis fields (K1S > "Basis (7203)" tab) ────────────────────
  // Shareholder's stock basis at beginning of the tax year
  stock_basis_beginning: z.number().nonnegative().optional(),
  // Direct reviewed per-corporation source for the bounded current box-1 loss.
  form7203_stock_loss_ledger: reviewedStockLossLedgerSchema.optional(),
  // Shareholder's debt basis at beginning of the tax year
  debt_basis_beginning: z.number().nonnegative().optional(),

  // ── Pre-2018 carryover fields (currently rejected pending separate routes) ──
  // Losses suspended in pre-2018 years (K1S > "Pre-2018 Basis" tab)
  pre2018_suspended_losses: z.number().nonnegative().optional(),
  // At-risk suspended losses from pre-2018 years (K1S > "Pre-2018 At-Risk" tab)
  pre2018_at_risk_suspended: z.number().nonnegative().optional(),
}).superRefine((item, ctx) => {
  if (item.box10_other_income !== undefined) {
    ctx.addIssue({
      code: "custom",
      path: ["box10_other_income"],
      message:
        "Untyped S-corporation K-1 box 10 cannot be routed to Schedule 1 line 8z; supply a supported box 10 code and reviewed source facts",
    });
  }
  if (
    item.box10_code_j_recovery !== undefined ||
    item.box10_code_j_taxable_recovery !== undefined ||
    item.box10_code_j_tax_benefit_workpaper_reference !== undefined ||
    item.box10_code_j_prior_year_tax_benefit_reviewed !== undefined
  ) {
    for (
      const key of [
        "corporation_ein",
        "source_document_reference",
        "box10_code_j_recovery",
        "box10_code_j_taxable_recovery",
        "box10_code_j_tax_benefit_workpaper_reference",
        "box10_code_j_prior_year_tax_benefit_reviewed",
      ] as const
    ) {
      if (item[key] === undefined) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `K-1 box 10 code J taxable recovery needs ${key}`,
        });
      }
    }
    if (
      (item.box10_code_j_taxable_recovery ?? 0) >
        (item.box10_code_j_recovery ?? 0)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["box10_code_j_taxable_recovery"],
        message: "K-1 box 10 code J taxable recovery exceeds K-1 recovery",
      });
    }
  }
  if (item.box13_code_z_orphan_drug_credit !== undefined) {
    for (
      const key of [
        "corporation_ein",
        "source_document_reference",
        "orphan_drug_credit_subject_to_passive_activity_limit",
      ] as const
    ) {
      if (item[key] === undefined) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `K-1 box 13 code Z needs ${key}`,
        });
      }
    }
  }
  if (item.box13_code_ad_new_markets_credit !== undefined) {
    for (
      const key of [
        "corporation_ein",
        "source_document_reference",
        "new_markets_credit_subject_to_passive_activity_limit",
      ] as const
    ) {
      if (item[key] === undefined) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `K-1 box 13 code AD needs ${key}`,
        });
      }
    }
  }
  if (item.box13_code_k_disabled_access_credit !== undefined) {
    for (
      const key of [
        "corporation_ein",
        "source_document_reference",
        "disabled_access_credit_subject_to_passive_activity_limit",
      ] as const
    ) {
      if (item[key] === undefined) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `K-1 box 13 code K needs ${key}`,
        });
      }
    }
  }
  if (item.box12_code_h_investment_interest !== undefined) {
    for (
      const key of ["corporation_ein", "source_document_reference"] as const
    ) {
      if (item[key] === undefined) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `K-1 box 12 code H needs ${key}`,
        });
      }
    }
    if ((item.box12_other_deductions ?? 0) > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["box12_other_deductions"],
        message:
          "K-1 box 12 code H cannot be combined with aggregate box 12 deductions",
      });
    }
  }
});

export const inputSchema = z.object({
  k1_s_corps: z.array(itemSchema).min(1),
});

type K1SCorpItem = z.infer<typeof itemSchema>;
type K1SCorpItems = K1SCorpItem[];

// Aggregate Schedule E income (Box 1 + 2 + 3 + 6) → schedule1 line5_schedule_e
function schedule1Output(items: K1SCorpItems): NodeOutput[] {
  const total = items.reduce(
    (sum, item) =>
      sum +
      (item.box1_ordinary_business ?? 0) +
      (item.box2_rental_re ?? 0) +
      (item.box3_other_rental ?? 0) +
      (item.box6_royalties ?? 0),
    0,
  );
  if (total === 0) return [];
  return [
    output(schedule1, { line5_schedule_e: total }),
    output(agi_aggregator, { line5_schedule_e: total }),
  ];
}

// Per-payer schedule_b entries for interest (Box 4)
function scheduleBInterestOutputs(items: K1SCorpItems): NodeOutput[] {
  return items
    .filter((item) => (item.box4_interest ?? 0) > 0)
    .map((item) =>
      output(schedule_b, {
        payer_name: item.corporation_name,
        taxable_interest_net: item.box4_interest!,
      })
    );
}

// Per-payer schedule_b entries for dividends (Box 5a)
function scheduleBDividendOutputs(items: K1SCorpItems): NodeOutput[] {
  return items
    .filter((item) => (item.box5a_ordinary_dividends ?? 0) > 0)
    .map((item) =>
      output(schedule_b, {
        payerName: item.corporation_name,
        ordinaryDividends: item.box5a_ordinary_dividends!,
      })
    );
}

// Aggregate qualified dividends (Box 5b) → f1040 line3a
function f1040QualDivOutput(items: K1SCorpItems): NodeOutput[] {
  const total = items.reduce(
    (sum, item) => sum + (item.box5b_qualified_dividends ?? 0),
    0,
  );
  if (total <= 0) return [];
  return [output(f1040, { line3a_qualified_dividends: total })];
}

// Aggregate capital gains/losses → schedule_d (one merged output)
function scheduleDOutput(items: K1SCorpItems): NodeOutput[] {
  const totalSt = items.reduce(
    (sum, item) => sum + (item.box7_net_st_cap_gain ?? 0),
    0,
  );
  const totalLt = items.reduce(
    (sum, item) => sum + (item.box8a_net_lt_cap_gain ?? 0),
    0,
  );
  const hasSt = totalSt !== 0;
  const hasLt = totalLt !== 0;
  if (!hasSt && !hasLt) return [];

  if (hasSt && hasLt) {
    return [
      output(schedule_d, { line_5_k1_st: totalSt, line_12_k1_lt: totalLt }),
    ];
  }
  if (hasSt) {
    return [output(schedule_d, { line_5_k1_st: totalSt })];
  }
  return [output(schedule_d, { line_12_k1_lt: totalLt })];
}

// QBI routing: box1 positive ordinary income or explicit qbi_amount → form8995 (non-SSTB)
// SSTB items route to form8995a via the sstb_qbi field.
// Dedicated qbi_amount / w2_wages / ubia_qualified_property fields take priority over
// the legacy box17_* fields when present.
function resolveQbiAmount(item: K1SCorpItem): number {
  if (item.qbi_amount !== undefined) return item.qbi_amount;
  return Math.max(0, item.box1_ordinary_business ?? 0);
}

function resolveW2Wages(item: K1SCorpItem): number {
  return (item.w2_wages ?? 0) + (item.box17_w2_wages ?? 0);
}

function resolveUbia(item: K1SCorpItem): number {
  return (item.ubia_qualified_property ?? 0) + (item.box17_ubia ?? 0);
}

function form8995Output(items: K1SCorpItems): NodeOutput[] {
  const nonSstb = items.filter((item) => item.sstb_indicator !== true);
  const sstb = items.filter((item) => item.sstb_indicator === true);
  const totalQbi = nonSstb.reduce(
    (sum, item) => sum + resolveQbiAmount(item),
    0,
  );
  const totalW2 = nonSstb.reduce((sum, item) => sum + resolveW2Wages(item), 0);
  const totalUbia = nonSstb.reduce((sum, item) => sum + resolveUbia(item), 0);
  const totalSstbQbi = sstb.reduce(
    (sum, item) => sum + resolveQbiAmount(item),
    0,
  );
  const totalSstbW2 = sstb.reduce((sum, item) => sum + resolveW2Wages(item), 0);
  const totalSstbUbia = sstb.reduce((sum, item) => sum + resolveUbia(item), 0);

  if (
    totalQbi <= 0 && totalW2 <= 0 && totalUbia <= 0 &&
    totalSstbQbi <= 0 && totalSstbW2 <= 0 && totalSstbUbia <= 0
  ) return [];

  const fields: Partial<z.infer<typeof form8995["inputSchema"]>> = {};
  if (totalQbi > 0) fields.qbi = totalQbi;
  if (totalW2 > 0) fields.w2_wages = totalW2;
  if (totalUbia > 0) fields.unadjusted_basis = totalUbia;
  if (totalSstbQbi > 0) fields.sstb_qbi = totalSstbQbi;
  if (totalSstbW2 > 0) fields.sstb_w2_wages = totalSstbW2;
  if (totalSstbUbia > 0) fields.sstb_unadjusted_basis = totalSstbUbia;

  return [
    output(
      form8995,
      fields as AtLeastOne<z.infer<typeof form8995["inputSchema"]>>,
    ),
  ];
}

// Route K-1 Box 9 §1231 gain/loss → Form 4797 (Part I)
// IRC §1231 gains/losses from S-corps flow through Form 4797
function form4797Outputs(items: K1SCorpItems): NodeOutput[] {
  const rows = items
    .filter((item) => (item.box9_net_1231 ?? 0) !== 0)
    .map((item) => ({
      source: "s_corp" as const,
      entity_name: item.corporation_name,
      gain_loss: item.box9_net_1231 ?? 0,
    }));
  if (rows.length === 0) return [];
  const total = rows.reduce((sum, row) => sum + row.gain_loss, 0);
  return [output(form4797, { section_1231_gain: total, k1_1231_rows: rows })];
}

// Only reviewed box 10 code J tax-benefit recoveries belong on line 8z.
function codeJTaxBenefitRecoveryOutputs(items: K1SCorpItems): NodeOutput[] {
  const total = items.reduce(
    (sum, item) => sum + (item.box10_code_j_taxable_recovery ?? 0),
    0,
  );
  if (total === 0) return [];
  return [
    output(schedule1, { line8z_k1_s_corp_tax_benefit_recovery: total }),
    output(agi_aggregator, {
      line8z_k1_s_corp_tax_benefit_recovery: total,
    }),
  ];
}

// Route Form 7203 basis data when stock or debt basis fields are provided
function hasBasisData(item: K1SCorpItem): boolean {
  return (
    item.stock_basis_beginning !== undefined ||
    item.debt_basis_beginning !== undefined ||
    item.form7203_stock_loss_ledger !== undefined
  );
}

function buildForm7203Fields(
  item: K1SCorpItem,
): Parameters<typeof output<typeof form7203>>[1] {
  const loss = Math.max(0, -(item.box1_ordinary_business ?? 0));
  const beginningBasis = loss > 0
    ? item.form7203_stock_loss_ledger?.beginning_stock_basis
    : item.stock_basis_beginning;
  if (loss > 0 && beginningBasis === undefined) {
    throw new Error("Form 7203 ordinary loss needs its reviewed stock ledger");
  }
  // Prior-year basis and at-risk carryovers are not interchangeable. Both
  // require separate source-linked routes before they can affect the return.
  return {
    ...(beginningBasis !== undefined
      ? { stock_basis_beginning: beginningBasis }
      : {}),
    ...(item.debt_basis_beginning !== undefined
      ? { debt_basis_beginning: item.debt_basis_beginning }
      : {}),
    ...(loss > 0 ? { ordinary_loss: loss } : {}),
  } as Parameters<typeof output<typeof form7203>>[1];
}

function form7203Outputs(items: K1SCorpItems): NodeOutput[] {
  return items
    .filter(hasBasisData)
    .map((item) => output(form7203, buildForm7203Fields(item)));
}

// Route foreign taxes → form_1116
function form1116Outputs(items: K1SCorpItems): NodeOutput[] {
  for (const item of items) {
    const k3 = item.schedule_k3_passive_interest;
    if (!k3) continue;
    if (
      item.corporation_ein !== k3.corporation_ein ||
      item.source_document_reference !== k3.k1_source_document_reference ||
      item.box4_interest !== k3.part_ii_section_1_line_6_passive_interest ||
      item.box14_foreign_income !==
        k3.part_ii_section_1_line_24_passive_total ||
      item.box14_foreign_income !== item.box4_interest ||
      item.box14_foreign_tax !==
        k3.part_iii_section_3_line_1_foreign_tax ||
      item.box14_foreign_income_category !== IncomeCategory.Passive ||
      item.box14_foreign_tax_irs_country_code !== k3.irs_country_code ||
      item.box14_foreign_tax_paid_or_accrued_date !== k3.tax_paid_date ||
      item.box14_foreign_tax_kind !== ForeignTaxKind.Interest ||
      item.box14_foreign_tax_credit_method !== ForeignTaxCreditMethod.Paid ||
      k3.part_iii_section_3_line_2_tax_reduction >
        k3.part_iii_section_3_line_1_foreign_tax ||
      Math.round(
          k3.foreign_tax_currency.amount *
            k3.foreign_tax_currency.usd_per_foreign_unit * 100,
        ) !== Math.round(k3.part_iii_section_3_line_1_foreign_tax * 100) ||
      k3.foreign_tax_currency.source_document_reference !==
        k3.k3_source_document_reference
    ) {
      throw new Error(
        "S-corporation K-3 passive interest, foreign tax, and reduction must match its K-1 and Form 1116 source",
      );
    }
  }
  return items
    .filter((item) =>
      (item.box14_foreign_tax ?? 0) > 0 &&
      (item.box14_foreign_income ?? 0) > 0 &&
      item.box14_foreign_income_category !== undefined
    )
    .map((item) =>
      output(form_1116, {
        foreign_tax_items: [{
          foreign_tax_paid: item.box14_foreign_tax!,
          foreign_gross_income: item.box14_foreign_income!,
          income_category: item.box14_foreign_income_category!,
          directly_allocable_deductions: item.box14_foreign_deductions,
          direct_expense_explanation: item.box14_foreign_deductions_explanation,
          irs_country_code: item.box14_foreign_tax_irs_country_code,
          tax_paid_or_accrued_date: item.box14_foreign_tax_paid_or_accrued_date,
          tax_kind: item.box14_foreign_tax_kind,
          tax_credit_method: item.box14_foreign_tax_credit_method,
          foreign_income_source_document_reference: item
            .schedule_k3_passive_interest?.k3_source_document_reference,
          foreign_tax_currency: item.schedule_k3_passive_interest
            ?.foreign_tax_currency,
          schedule_k3_line12_reduction: item.schedule_k3_passive_interest
            ? {
              amount: item.schedule_k3_passive_interest
                .part_iii_section_3_line_2_tax_reduction,
              source_document_reference: item.schedule_k3_passive_interest
                .k3_source_document_reference,
            }
            : undefined,
          s_corp_k3_passive_interest: item.schedule_k3_passive_interest,
        }],
      })
    );
}

// Aggregate box8b collectibles (28%) gain → rate_28_gain_worksheet
function collectiblesGainOutput(items: K1SCorpItems): NodeOutput[] {
  const total = items.reduce(
    (sum, item) => sum + (item.box8b_collectibles_gain ?? 0),
    0,
  );
  if (total <= 0) return [];
  return [output(rate_28_gain_worksheet, { collectibles_gain: total })];
}

// Aggregate box8c unrecaptured §1250 gain → unrecaptured_1250_worksheet
function unrecaptured1250Output(items: K1SCorpItems): NodeOutput[] {
  const total = items.reduce(
    (sum, item) => sum + (item.box8c_unrecaptured_1250 ?? 0),
    0,
  );
  if (total <= 0) return [];
  return [
    output(unrecaptured_1250_worksheet, { unrecaptured_1250_gain: total }),
  ];
}

// Aggregate box11 §179 deduction → form4562
function section179Output(items: K1SCorpItems): NodeOutput[] {
  const total = items.reduce(
    (sum, item) => sum + (item.box11_section_179 ?? 0),
    0,
  );
  if (total <= 0) return [];
  return [output(form4562, { section_179_deduction: total })];
}

// Aggregate box12 other deductions → schedule_a line 16 (other deductions)
function otherDeductionsOutput(items: K1SCorpItems): NodeOutput[] {
  const total = items.reduce(
    (sum, item) => sum + (item.box12_other_deductions ?? 0),
    0,
  );
  if (total <= 0) return [];
  return [output(schedule_a, { line_16_other_deductions: total })];
}

// Aggregate box15 AMT adjustment → form6251 other_adjustments
function amtAdjustmentOutput(items: K1SCorpItems): NodeOutput[] {
  const total = items.reduce(
    (sum, item) => sum + (item.box15_amt_adjustment ?? 0),
    0,
  );
  if (total === 0) return [];
  return [output(form6251, { other_adjustments: total })];
}

class K1SCorpNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "k1_s_corp";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule1,
    agi_aggregator,
    schedule_b,
    f1040,
    schedule_d,
    form8995,
    form_1116,
    form7203,
    form4797,
    rate_28_gain_worksheet,
    unrecaptured_1250_worksheet,
    form4562,
    form6251,
    schedule_a,
    form4952,
    f3800,
    form8582cr,
    disabledAccessLimit,
  ]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const { k1_s_corps } = inputSchema.parse(input);

    if (
      k1_s_corps.some((item) =>
        (item.pre2018_suspended_losses ?? 0) > 0 ||
        (item.pre2018_at_risk_suspended ?? 0) > 0
      )
    ) {
      throw new Error(
        "S corporation prior-year basis and at-risk carryovers need separate reviewed loss routes",
      );
    }
    if (k1_s_corps.some((item) => (item.box17_distributions ?? 0) > 0)) {
      throw new Error(
        "S corporation distributions need box 16 code D source and Form 7203/8949 filing review",
      );
    }
    if (
      k1_s_corps.length !== 1 &&
      k1_s_corps.some((item) => (item.box1_ordinary_business ?? 0) < 0)
    ) {
      throw new Error(
        "Form 7203 ordinary-loss route currently needs exactly one S-corporation K-1",
      );
    }
    if (
      k1_s_corps.some((item) =>
        item.form7203_stock_loss_ledger !== undefined &&
        (item.box1_ordinary_business ?? 0) >= 0
      )
    ) {
      throw new Error(
        "Form 7203 stock-loss ledger needs a current K-1 box-1 ordinary loss",
      );
    }
    if (
      k1_s_corps.some((item) =>
        (item.box1_ordinary_business ?? 0) < 0 && !hasBasisData(item)
      )
    ) {
      throw new Error(
        "S corporation K-1 ordinary loss needs shareholder basis facts and Form 7203 filing review",
      );
    }
    if (
      k1_s_corps.some((item) =>
        (item.box1_ordinary_business ?? 0) < 0 &&
        (!Number.isSafeInteger(item.box1_ordinary_business ?? 0) ||
          !item.corporation_ein || !item.source_document_reference ||
          !item.form7203_stock_loss_ledger ||
          item.form7203_stock_loss_ledger.corporation_ein !==
            item.corporation_ein ||
          item.stock_basis_beginning !== undefined ||
          item.debt_basis_beginning !== undefined ||
          [
            item.box2_rental_re,
            item.box3_other_rental,
            item.box4_interest,
            item.box5a_ordinary_dividends,
            item.box6_royalties,
            item.box7_net_st_cap_gain,
            item.box8a_net_lt_cap_gain,
            item.box9_net_1231,
            item.box10_code_j_taxable_recovery,
            item.box11_section_179,
            item.box12_other_deductions,
            item.box12_code_h_investment_interest,
            item.box16_tax_exempt_income,
          ].some((amount) => (amount ?? 0) !== 0))
      )
    ) {
      throw new Error(
        "S corporation ordinary-loss basis route needs an identified K-1 and reviewed stock-only beginning basis with no other changes",
      );
    }

    const outputs: NodeOutput[] = [
      ...schedule1Output(k1_s_corps),
      ...scheduleBInterestOutputs(k1_s_corps),
      ...scheduleBDividendOutputs(k1_s_corps),
      ...f1040QualDivOutput(k1_s_corps),
      ...scheduleDOutput(k1_s_corps),
      ...form8995Output(k1_s_corps),
      ...form1116Outputs(k1_s_corps),
      ...form7203Outputs(k1_s_corps),
      ...form4797Outputs(k1_s_corps),
      ...codeJTaxBenefitRecoveryOutputs(k1_s_corps),
      ...collectiblesGainOutput(k1_s_corps),
      ...unrecaptured1250Output(k1_s_corps),
      ...section179Output(k1_s_corps),
      ...otherDeductionsOutput(k1_s_corps),
      ...amtAdjustmentOutput(k1_s_corps),
      ...k1_s_corps.flatMap((item) => {
        const credit = item.box13_code_z_orphan_drug_credit;
        if (credit === undefined) return [];
        if (!item.corporation_ein || !item.source_document_reference) {
          throw new Error("S-corporation orphan-drug K-1 source is incomplete");
        }
        if (item.orphan_drug_credit_subject_to_passive_activity_limit) {
          return [output(form8582cr, {
            required_orphan_drug_k1_credits: [{
              source_type: "s_corporation",
              source_ein: item.corporation_ein,
              source_document_reference: item.source_document_reference,
              credit_amount: credit,
            }],
          })];
        }
        return [output(f3800, {
          f8820_k1_credit_entries: [{
            source_type: "s_corporation",
            source_ein: item.corporation_ein,
            source_document_reference: item.source_document_reference,
            credit_amount: credit,
            subject_to_passive_activity_limit: false,
          }],
        })];
      }),
      ...k1_s_corps.flatMap((item) => {
        const credit = item.box13_code_ad_new_markets_credit;
        if (credit === undefined) return [];
        if (!item.corporation_ein || !item.source_document_reference) {
          throw new Error(
            "S-corporation New Markets Credit K-1 source is incomplete",
          );
        }
        if (item.new_markets_credit_subject_to_passive_activity_limit) {
          return [output(form8582cr, {
            required_new_markets_k1_credits: [{
              source_type: "s_corporation",
              source_ein: item.corporation_ein,
              source_document_reference: item.source_document_reference,
              credit_amount: credit,
            }],
          })];
        }
        return [output(f3800, {
          f8874_k1_credit_entries: [{
            source_type: "s_corporation",
            source_ein: item.corporation_ein,
            source_document_reference: item.source_document_reference,
            credit_amount: credit,
            subject_to_passive_activity_limit: false,
          }],
        })];
      }),
      ...k1_s_corps.flatMap((item) => {
        const credit = item.box13_code_k_disabled_access_credit;
        if (credit === undefined) return [];
        if (!item.corporation_ein || !item.source_document_reference) {
          throw new Error(
            "S-corporation disabled-access K-1 source is incomplete",
          );
        }
        if (item.disabled_access_credit_subject_to_passive_activity_limit) {
          return [output(disabledAccessLimit, {
            required_disabled_access_k1_credits: [{
              source_type: "s_corporation",
              source_ein: item.corporation_ein,
              source_document_reference: item.source_document_reference,
              credit_amount: credit,
            }],
          })];
        }
        return [output(disabledAccessLimit, {
          f8826_credit_entries: [{
            source_type: "s_corporation",
            source_ein: item.corporation_ein,
            source_document_reference: item.source_document_reference,
            credit_amount: credit,
            subject_to_passive_activity_limit: false,
          }],
        })];
      }),
      // box16_tax_exempt_income: intentionally not routed — tax-exempt income does not flow to taxable income
      // box17_distributions is rejected above: actual source is box 16 code D.
    ];

    for (const item of k1_s_corps) {
      if (item.investment_property_for_form4952 !== true) continue;
      if (
        (item.box5b_qualified_dividends ?? 0) >
          (item.box5a_ordinary_dividends ?? 0)
      ) {
        throw new Error(
          "S corporation K-1 qualified dividends exceed ordinary dividends",
        );
      }
      if ((item.box4_interest ?? 0) > 0) {
        outputs.push(output(form4952, {
          source_k1_interest: item.box4_interest!,
        }));
      }
      if ((item.box5a_ordinary_dividends ?? 0) > 0) {
        outputs.push(output(form4952, {
          source_k1_dividends: item.box5a_ordinary_dividends!,
        }));
      }
      if ((item.box5b_qualified_dividends ?? 0) > 0) {
        outputs.push(output(form4952, {
          source_k1_qualified_dividends: item.box5b_qualified_dividends!,
        }));
      }
    }

    for (const item of k1_s_corps) {
      if (item.box12_code_h_investment_interest !== undefined) {
        outputs.push(output(form4952, {
          source_k1_investment_interest: item.box12_code_h_investment_interest,
        }));
      }
    }

    return { outputs };
  }
}

export const k1SCorpNode = new K1SCorpNode();
