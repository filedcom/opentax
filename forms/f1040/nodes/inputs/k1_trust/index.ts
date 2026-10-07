import { z } from "zod";
import { ty2025IrsCountryCodeSchema } from "../../irs_country_code.ts";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import { scheduleE } from "../schedule_e/index.ts";
import { schedule_b } from "../../intermediate/aggregation/schedule_b/index.ts";
import { schedule_d } from "../../intermediate/aggregation/schedule_d/index.ts";
import { form4952 } from "../../intermediate/forms/form4952/index.ts";
import { form6251 } from "../../intermediate/forms/form6251/index.ts";
import { f3800 } from "../f3800/index.ts";
import { f3468 } from "../f3468/index.ts";
import {
  reconcileTrustPartVStatement,
  trustPartVStatementSchema,
} from "../f3468/trust-part-v-source.ts";
import { form8582cr } from "../../intermediate/forms/form8582cr/index.ts";
import { disabledAccessLimit } from "../../intermediate/forms/disabled_access_limit/index.ts";
import {
  ForeignTaxCreditMethod,
  ForeignTaxKind,
  form_1116,
  IncomeCategory,
} from "../../intermediate/forms/form_1116/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Schedule K-1 (Form 1041) — Beneficiary's Share of Income, Deductions, Credits
//
// Issued by trusts and estates to beneficiaries.
// Each box routes to the beneficiary's Form 1040 as shown in the K-1 instructions.
//
// IRS Instructions for Schedule K-1 (Form 1041):
// https://www.irs.gov/instructions/i1041sk1

export const box13CodeBIssuedCopyReviewSchema = z.object({
  pdf_reference: z.string().trim().min(1),
  pdf_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  tax_year: z.literal(2025),
  estate_trust_ein: z.string().regex(/^\d{9}$/),
  beneficiary_ssn: z.string().regex(/^\d{9}$/),
  box13_code_b_backup_withholding: z.number().finite().positive().refine(
    (amount) =>
      Number.isSafeInteger(Math.round(amount * 100)) &&
      Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001,
    "Issued K-1 code B review needs cent precision",
  ),
}).strict();

// Per-item schema — one Schedule K-1 (1041) from one trust or estate
export const itemSchema = z.object({
  // Identification
  estate_trust_name: z.string().min(1),
  entity_type: z.enum(["estate", "trust"]).optional(),
  estate_trust_ein: z.string().regex(/^\d{9}$/).optional(),
  source_document_reference: z.string().trim().min(1).optional(),
  // TY2025 box 14 code M supplies Part V information, not a credit amount.
  // Box 13 code M is the separate orphan-drug credit and stays closed here.
  box13_code_m_clean_electricity_investment_credit: z.never().optional(),
  box14_code_m_clean_electricity_investment_information: z.literal(true)
    .optional(),
  box14_code_m_form3468_part_v_statement: trustPartVStatementSchema.optional(),
  box13_code_m_orphan_drug_credit: z.never().optional(),
  // Box 13 code B requires an issued K-1 copy attached to the beneficiary's
  // return. Calculate the entered credit and retain its source; export still
  // requires the complete verified native/issued-copy attachment route.
  box13_code_b_backup_withholding: z.number().finite().positive().refine(
    (amount) =>
      Number.isSafeInteger(Math.round(amount * 100)) &&
      Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001,
    { message: "K-1 box 13 code B needs cent precision" },
  ).optional(),
  // Review metadata binds selected source facts to retained PDF bytes. It
  // does not prove the PDF's printed contents or fiduciary issuance.
  box13_code_b_issued_copy_review: box13CodeBIssuedCopyReviewSchema.optional(),
  orphan_drug_credit_subject_to_passive_activity_limit: z.never().optional(),
  box13_code_zz_new_markets_credit: z.number().int().positive().optional(),
  box13_code_zz_new_markets_statement_reference: z.string().trim().min(1)
    .optional(),
  new_markets_credit_subject_to_passive_activity_limit: z.boolean().optional(),
  box13_code_zz_disabled_access_credit: z.number().finite().positive().refine(
    (amount) =>
      Number.isSafeInteger(Math.round(amount * 100)) &&
      Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001,
    { message: "K-1 disabled-access credit needs cent precision" },
  ).optional(),
  box13_code_zz_disabled_access_statement_reference: z.string().trim().min(1)
    .optional(),
  disabled_access_credit_subject_to_passive_activity_limit: z.boolean()
    .optional(),
  // Affirm the beneficiary's limited portfolio boxes are investment-property
  // income not already included in Form 4952's manual "other" facts.
  investment_property_for_form4952: z.boolean().optional(),

  // Fiduciary-allocated K-1 boxes are final beneficiary shares. A second
  // beneficiary-side DNI cap would underreport them, so reject that input.
  distributable_net_income: z.never().optional(),

  // Box 1 — Interest income → Schedule B Part I
  box1_interest: z.number().nonnegative().optional(),

  // Box 2a — Ordinary dividends → Schedule B Part II
  box2a_ordinary_dividends: z.number().nonnegative().optional(),

  // Box 2b — Qualified dividends → Form 1040 line 3a
  box2b_qualified_dividends: z.number().nonnegative().optional(),

  // Box 3 — Net short-term capital gain → Schedule D line 5 (K-1 ST)
  box3_net_st_cap_gain: z.number().nonnegative().optional(),

  // Box 4a — Net long-term capital gain → Schedule D line 12 (K-1 LT)
  box4a_net_lt_cap_gain: z.number().nonnegative().optional(),

  // Box 4b — 28% rate gain (informational; used in Schedule D 28% Rate Gain Worksheet)
  box4b_28pct_rate_gain: z.number().nonnegative().optional(),

  // Box 4c — Unrecaptured §1250 gain (informational; Schedule D Worksheet line 11)
  box4c_unrecaptured_1250: z.number().nonnegative().optional(),

  // Box 5 — Other portfolio income → Schedule E Part III, column (f)
  box5_other_portfolio: z.number().int().nonnegative().optional(),

  // Box 6 — Ordinary business income → Schedule E page 2 → Schedule 1 line 5
  box6_ordinary_business: z.number().int().nonnegative().optional(),

  // Box 7 — Net rental real estate income → Schedule E → Schedule 1 line 5
  box7_rental_real_estate: z.number().int().nonnegative().optional(),

  // Box 8 — Other rental income → Schedule E → Schedule 1 line 5
  box8_other_rental: z.number().int().nonnegative().optional(),
  box6_8_activity_statement: z.array(
    z.object({
      box: z.enum(["6", "7", "8"]),
      activity_name: z.string().trim().min(1),
      statement_reference: z.string().trim().min(1),
      income: z.number().int().positive(),
    }).strict(),
  ).min(1).optional(),

  // Box 9 — Directly apportioned deductions (codes A–B)
  // Deductions allocated directly to the beneficiary (e.g. depreciation, depletion).
  // Reduce gross income of the same character; typically Schedule E or Schedule A.
  box9_directly_apportioned_deductions: z.number().nonnegative().optional()
    .describe("Box 9 — Directly apportioned deductions"),

  // Box 10 — Estate tax deduction (IRD) — informational; Schedule A line 16
  box10_estate_tax_deduction: z.number().nonnegative().optional(),

  // Box 11 — Final year deductions (excess deductions on termination)
  box11_final_year_deductions: z.number().nonnegative().optional(),
  box11_code_a_section67e_excess_deduction: z.number().int().positive()
    .optional(),
  box11_code_a_statement_reference: z.string().trim().min(1).optional(),
  box11_code_c_short_term_capital_loss_carryover: z.number().int().positive()
    .optional(),
  box11_code_c_statement_reference: z.string().trim().min(1).optional(),
  box11_code_d_long_term_capital_loss_carryover: z.number().int().positive()
    .optional(),
  box11_code_d_statement_reference: z.string().trim().min(1).optional(),
  box11_final_k1: z.literal(true).optional(),
  box11_beneficiary_succeeds_to_property: z.literal(true).optional(),
  beneficiary_ssn: z.string().regex(/^\d{9}$/).optional(),

  // Uncoded box 12 cannot identify a Form 6251 line.
  box12_amt: z.number().optional(),
  // Box 12 code A is the signed estate/trust adjustment on Form 6251 line 2j.
  // Codes B–F also affect the AMT preferential-rate worksheets; codes G–I
  // belong on other Form 6251 lines. They are outside this bounded source route.
  box12_code_a_amt_adjustment: z.number().int().finite().optional(),
  box12_codes_b_through_f_absent: z.literal(true).optional(),
  box12_codes_g_through_i_absent: z.literal(true).optional(),

  // Box 13 — Credits and credit recapture → applicable credit form
  // Beneficiary's share of credits passed through from the trust (e.g. foreign tax credit).
  box13_credits: z.number().nonnegative().optional().describe(
    "Box 13 — Credits and credit recapture",
  ),

  // Box 14 — Foreign taxes → Form 1116
  box14_foreign_tax: z.number().nonnegative().optional(),
  box14_foreign_income: z.number().nonnegative().optional(),
  box14_foreign_income_category: z.nativeEnum(IncomeCategory).optional(),
  box14_foreign_deductions: z.number().nonnegative().optional(),
  box14_foreign_deductions_explanation: z.string().trim().min(1).optional(),
  // Use the country, tax type, and payment details from the trust's K-1 statement.
  box14_foreign_tax_irs_country_code: ty2025IrsCountryCodeSchema.optional(),
  box14_foreign_tax_paid_or_accrued_date: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
  ).optional(),
  box14_foreign_tax_kind: z.nativeEnum(ForeignTaxKind).optional(),
  box14_foreign_tax_credit_method: z.nativeEnum(ForeignTaxCreditMethod)
    .optional(),
}).superRefine((item, ctx) => {
  if (item.box13_code_b_issued_copy_review) {
    const review = item.box13_code_b_issued_copy_review;
    if (
      item.box13_code_b_backup_withholding === undefined ||
      item.estate_trust_ein !== review.estate_trust_ein ||
      item.beneficiary_ssn !== review.beneficiary_ssn ||
      !item.source_document_reference ||
      Math.round(item.box13_code_b_backup_withholding * 100) !==
        Math.round(review.box13_code_b_backup_withholding * 100)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["box13_code_b_issued_copy_review"],
        message:
          "Trust K-1 box 13 code B issued-copy review must match retained source, beneficiary, and amount",
      });
    }
  }
  if (
    item.box14_code_m_clean_electricity_investment_information !== undefined ||
    item.box14_code_m_form3468_part_v_statement !== undefined
  ) {
    if (
      item.entity_type !== "trust" ||
      item.box14_code_m_clean_electricity_investment_information !== true ||
      item.box14_code_m_form3468_part_v_statement === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["box14_code_m_form3468_part_v_statement"],
        message:
          "Trust K-1 box 14 code M needs a reviewed Form 3468 Part V statement",
      });
    } else {
      try {
        reconcileTrustPartVStatement(
          item.box14_code_m_form3468_part_v_statement,
          item,
        );
      } catch (error) {
        ctx.addIssue({
          code: "custom",
          path: ["box14_code_m_form3468_part_v_statement"],
          message: String(error),
        });
      }
    }
  }
  for (
    const key of [
      "box4b_28pct_rate_gain",
      "box4c_unrecaptured_1250",
      "box10_estate_tax_deduction",
      "box11_final_year_deductions",
    ] as const
  ) {
    if ((item[key] ?? 0) > 0) {
      ctx.addIssue({
        code: "custom",
        path: [key],
        message:
          `K-1 ${key} needs its coded tax-rate or deduction filing route`,
      });
    }
  }
  if (item.box11_code_a_section67e_excess_deduction !== undefined) {
    for (
      const key of [
        "estate_trust_ein",
        "source_document_reference",
        "box11_code_a_statement_reference",
        "box11_final_k1",
        "box11_beneficiary_succeeds_to_property",
        "beneficiary_ssn",
      ] as const
    ) {
      if (item[key] === undefined) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `K-1 box 11 code A needs ${key}`,
        });
      }
    }
  }
  if (item.box11_code_c_short_term_capital_loss_carryover !== undefined) {
    for (
      const key of [
        "estate_trust_ein",
        "source_document_reference",
        "box11_code_c_statement_reference",
        "box11_final_k1",
        "box11_beneficiary_succeeds_to_property",
        "beneficiary_ssn",
      ] as const
    ) {
      if (item[key] === undefined) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `K-1 box 11 code C needs ${key}`,
        });
      }
    }
  }
  if (item.box11_code_d_long_term_capital_loss_carryover !== undefined) {
    for (
      const key of [
        "estate_trust_ein",
        "source_document_reference",
        "box11_code_d_statement_reference",
        "box11_final_k1",
        "box11_beneficiary_succeeds_to_property",
        "beneficiary_ssn",
      ] as const
    ) {
      if (item[key] === undefined) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `K-1 box 11 code D needs ${key}`,
        });
      }
    }
  }
  if (
    (item.box5_other_portfolio ?? 0) !== 0 ||
    (item.box6_ordinary_business ?? 0) > 0 ||
    (item.box7_rental_real_estate ?? 0) > 0 ||
    (item.box8_other_rental ?? 0) > 0
  ) {
    for (
      const key of ["estate_trust_ein", "source_document_reference"] as const
    ) {
      if (!item[key]) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `K-1 box 5 Schedule E income needs ${key}`,
        });
      }
    }
  }
  const activityBoxes = [
    ["6", "box6_ordinary_business"],
    ["7", "box7_rental_real_estate"],
    ["8", "box8_other_rental"],
  ] as const;
  for (const [box, key] of activityBoxes) {
    const amount = item[key] ?? 0;
    const rows = item.box6_8_activity_statement?.filter((row) =>
      row.box === box
    ) ?? [];
    if (
      amount < 0 || rows.reduce((sum, row) => sum + row.income, 0) !== amount ||
      (amount > 0 && rows.length === 0)
    ) {
      ctx.addIssue({
        code: "custom",
        path: [key],
        message:
          `K-1 ${key} needs positive income reconciled to its per-activity statement; losses need the Schedule E limitation route`,
      });
    }
  }
  if ((item.box9_directly_apportioned_deductions ?? 0) > 0) {
    ctx.addIssue({
      code: "custom",
      path: ["box9_directly_apportioned_deductions"],
      message:
        "K-1 box 9 deductions need their per-activity character and Schedule E limitation route",
    });
  }
  if ((item.box12_amt ?? 0) !== 0) {
    ctx.addIssue({
      code: "custom",
      path: ["box12_amt"],
      message:
        "Uncoded K-1 box 12 AMT amount needs its source code before filing",
    });
  }
  if (item.box12_code_a_amt_adjustment !== undefined) {
    for (
      const key of [
        "estate_trust_ein",
        "source_document_reference",
        "box12_codes_b_through_f_absent",
        "box12_codes_g_through_i_absent",
      ] as const
    ) {
      if (item[key] === undefined) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `K-1 box 12 code A AMT adjustment needs ${key}`,
        });
      }
    }
  }
  if (item.box13_code_zz_disabled_access_credit !== undefined) {
    for (
      const key of [
        "entity_type",
        "estate_trust_ein",
        "source_document_reference",
        "box13_code_zz_disabled_access_statement_reference",
        "disabled_access_credit_subject_to_passive_activity_limit",
      ] as const
    ) {
      if (item[key] === undefined) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `K-1 box 13 code ZZ disabled-access credit needs ${key}`,
        });
      }
    }
  }
  if (item.box13_code_zz_new_markets_credit !== undefined) {
    for (
      const key of [
        "entity_type",
        "estate_trust_ein",
        "source_document_reference",
        "box13_code_zz_new_markets_statement_reference",
        "new_markets_credit_subject_to_passive_activity_limit",
      ] as const
    ) {
      if (item[key] === undefined) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `K-1 box 13 code ZZ New Markets Credit needs ${key}`,
        });
      }
    }
  }
  if (
    item.box13_credits !== undefined &&
    Math.round(item.box13_credits * 100) <
      Math.round((item.box13_code_zz_disabled_access_credit ?? 0) * 100) +
        Math.round((item.box13_code_zz_new_markets_credit ?? 0) * 100)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["box13_credits"],
      message: "K-1 named credits exceed box 13 total credits",
    });
  }
  const namedCredits = (item.box13_code_zz_disabled_access_credit ?? 0) +
    (item.box13_code_zz_new_markets_credit ?? 0);
  if ((item.box13_credits ?? 0) > namedCredits) {
    ctx.addIssue({
      code: "custom",
      path: ["box13_credits"],
      message:
        "K-1 box 13 residual credits need their source codes and filing routes",
    });
  }
  if (
    (item.box14_foreign_tax ?? 0) > 0 &&
    ((item.box14_foreign_income ?? 0) <= 0 ||
      item.box14_foreign_income_category === undefined)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["box14_foreign_tax"],
      message:
        "K-1 box 14 foreign tax needs income and category before Form 1116 routing",
    });
  }
});

export const inputSchema = z.object({
  k1_trusts: z.array(itemSchema).min(1),
});

type K1TrustItem = z.infer<typeof itemSchema>;
type K1TrustItems = K1TrustItem[];

export function totalTrustBackupWithholding(
  items: readonly { box13_code_b_backup_withholding?: number }[],
): number {
  const cents = items.reduce(
    (sum, item) =>
      sum + Math.round((item.box13_code_b_backup_withholding ?? 0) * 100),
    0,
  );
  if (!Number.isSafeInteger(cents)) {
    throw Error(
      "Combined trust K-1 backup withholding exceeds exact cent precision",
    );
  }
  return cents / 100;
}

// ─── Output helpers ───────────────────────────────────────────────────────────

// Per-payer schedule_b entries for interest (Box 1)
function scheduleBInterestOutputs(items: K1TrustItems): NodeOutput[] {
  return items
    .filter((item) => (item.box1_interest ?? 0) > 0)
    .map((item) =>
      output(schedule_b, {
        payer_name: item.estate_trust_name,
        taxable_interest_net: item.box1_interest!,
      })
    );
}

// Per-payer schedule_b entries for dividends (Box 2a)
function scheduleBDividendOutputs(items: K1TrustItems): NodeOutput[] {
  return items
    .filter((item) => (item.box2a_ordinary_dividends ?? 0) > 0)
    .map((item) =>
      output(schedule_b, {
        payerName: item.estate_trust_name,
        ordinaryDividends: item.box2a_ordinary_dividends!,
      })
    );
}

// Aggregate qualified dividends (Box 2b) → f1040 line3a
function f1040QualDivOutput(items: K1TrustItems): NodeOutput[] {
  const total = items.reduce(
    (sum, item) => sum + (item.box2b_qualified_dividends ?? 0),
    0,
  );
  if (total <= 0) return [];
  return [output(f1040, { line3a_qualified_dividends: total })];
}

// Aggregate capital gains/losses → schedule_d (one merged output)
function scheduleDOutput(items: K1TrustItems): NodeOutput[] {
  const totalSt = items.reduce(
    (sum, item) =>
      sum + (item.box3_net_st_cap_gain ?? 0) -
      (item.box11_code_c_short_term_capital_loss_carryover ?? 0),
    0,
  );
  const totalLt = items.reduce(
    (sum, item) =>
      sum + (item.box4a_net_lt_cap_gain ?? 0) -
      (item.box11_code_d_long_term_capital_loss_carryover ?? 0),
    0,
  );
  const finalLtCarryover = items.reduce(
    (sum, item) =>
      sum + (item.box11_code_d_long_term_capital_loss_carryover ?? 0),
    0,
  );
  const hasSt = items.some((item) =>
    (item.box3_net_st_cap_gain ?? 0) !== 0 ||
    item.box11_code_c_short_term_capital_loss_carryover !== undefined
  );
  const hasLt = totalLt !== 0 || finalLtCarryover > 0;
  if (!hasSt && !hasLt) return [];

  if (hasSt && hasLt) {
    return [
      output(schedule_d, {
        line_5_k1_st: totalSt,
        line_12_k1_lt: totalLt,
        ...(finalLtCarryover > 0
          ? { trust_k1_code_d_loss: finalLtCarryover }
          : {}),
      }),
    ];
  }
  if (hasSt) {
    return [output(schedule_d, { line_5_k1_st: totalSt })];
  }
  return [output(schedule_d, {
    line_12_k1_lt: totalLt,
    ...(finalLtCarryover > 0 ? { trust_k1_code_d_loss: finalLtCarryover } : {}),
  })];
}

function scheduleEOutputs(items: K1TrustItems): NodeOutput[] {
  return items.flatMap((item) => {
    const passiveIncome = (item.box6_ordinary_business ?? 0) +
      (item.box7_rental_real_estate ?? 0) +
      (item.box8_other_rental ?? 0);
    return (item.box5_other_portfolio ?? 0) > 0 || passiveIncome > 0
      ? [output(scheduleE, {
        estate_trust_rows: [{
          estate_trust_name: item.estate_trust_name,
          estate_trust_ein: item.estate_trust_ein!,
          source_document_reference: item.source_document_reference!,
          ...(item.box5_other_portfolio
            ? { other_income: item.box5_other_portfolio }
            : {}),
          ...(passiveIncome > 0 ? { passive_income: passiveIncome } : {}),
        }],
      })]
      : [];
  });
}

// Route foreign taxes → form_1116 (one output per K-1 with foreign taxes)
function form1116Outputs(items: K1TrustItems): NodeOutput[] {
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
        }],
      })
    );
}

function disabledAccessCreditOutputs(items: K1TrustItems): NodeOutput[] {
  return items.flatMap((item) => {
    const credit = item.box13_code_zz_disabled_access_credit;
    if (credit === undefined) return [];
    if (
      !item.entity_type || !item.estate_trust_ein ||
      !item.source_document_reference ||
      !item.box13_code_zz_disabled_access_statement_reference
    ) {
      throw new Error("Estate/trust disabled-access K-1 source is incomplete");
    }
    if (item.disabled_access_credit_subject_to_passive_activity_limit) {
      return [output(disabledAccessLimit, {
        required_disabled_access_k1_credits: [{
          source_type: item.entity_type,
          source_ein: item.estate_trust_ein,
          source_document_reference: item.source_document_reference,
          source_statement_reference:
            item.box13_code_zz_disabled_access_statement_reference,
          credit_amount: credit,
        }],
      })];
    }
    return [output(disabledAccessLimit, {
      f8826_credit_entries: [{
        source_type: item.entity_type,
        source_ein: item.estate_trust_ein,
        source_document_reference: item.source_document_reference,
        source_statement_reference:
          item.box13_code_zz_disabled_access_statement_reference,
        credit_amount: credit,
        subject_to_passive_activity_limit: false,
      }],
    })];
  });
}

function newMarketsCreditOutputs(items: K1TrustItems): NodeOutput[] {
  return items.flatMap((item) => {
    const credit = item.box13_code_zz_new_markets_credit;
    if (credit === undefined) return [];
    if (
      !item.entity_type || !item.estate_trust_ein ||
      !item.source_document_reference ||
      !item.box13_code_zz_new_markets_statement_reference
    ) {
      throw new Error(
        "Estate/trust New Markets Credit K-1 source is incomplete",
      );
    }
    if (item.new_markets_credit_subject_to_passive_activity_limit) {
      return [output(form8582cr, {
        required_new_markets_k1_credits: [{
          source_type: item.entity_type,
          source_ein: item.estate_trust_ein,
          source_document_reference: item.source_document_reference,
          source_statement_reference:
            item.box13_code_zz_new_markets_statement_reference,
          credit_amount: credit,
        }],
      })];
    }
    return [output(f3800, {
      f8874_k1_credit_entries: [{
        source_type: item.entity_type,
        source_ein: item.estate_trust_ein,
        source_document_reference: item.source_document_reference,
        source_statement_reference:
          item.box13_code_zz_new_markets_statement_reference,
        credit_amount: credit,
        subject_to_passive_activity_limit: false,
      }],
    })];
  });
}

function cleanElectricityInvestmentCreditOutputs(
  items: K1TrustItems,
): NodeOutput[] {
  return items.flatMap((item) => {
    if (item.box14_code_m_clean_electricity_investment_information !== true) {
      return [];
    }
    const statement = item.box14_code_m_form3468_part_v_statement!;
    return [output(f3468, {
      trust_part_v_claims: [{
        source_type: "trust",
        source_ein: item.estate_trust_ein!,
        source_document_reference: item.source_document_reference!,
        statement,
      }],
    })];
  });
}

class K1TrustNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "k1_trust";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule_b,
    f1040,
    schedule_d,
    schedule1,
    agi_aggregator,
    scheduleE,
    form_1116,
    form4952,
    form6251,
    f3800,
    f3468,
    form8582cr,
    disabledAccessLimit,
  ]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const { k1_trusts } = inputSchema.parse(input);

    const outputs: NodeOutput[] = [
      ...scheduleBInterestOutputs(k1_trusts),
      ...scheduleBDividendOutputs(k1_trusts),
      ...f1040QualDivOutput(k1_trusts),
      ...(() => {
        const amount = totalTrustBackupWithholding(k1_trusts);
        return amount > 0
          ? [output(f1040, { line25c_other_withheld: amount })]
          : [];
      })(),
      ...scheduleDOutput(k1_trusts),
      ...scheduleEOutputs(k1_trusts),
      ...(() => {
        const codeAItems = k1_trusts.filter((item) =>
          item.box11_code_a_section67e_excess_deduction !== undefined
        );
        if (codeAItems.length === 0) return [];
        const amount = codeAItems.reduce(
          (sum, item) => sum + item.box11_code_a_section67e_excess_deduction!,
          0,
        );
        return [
          output(schedule1, {
            line24k_section67e_excess_deduction: amount,
          }),
          output(agi_aggregator, {
            line24k_section67e_excess_deduction: amount,
          }),
        ];
      })(),
      ...form1116Outputs(k1_trusts),
      ...disabledAccessCreditOutputs(k1_trusts),
      ...newMarketsCreditOutputs(k1_trusts),
      ...cleanElectricityInvestmentCreditOutputs(k1_trusts),
      ...k1_trusts.flatMap((item) =>
        (item.box12_code_a_amt_adjustment ?? 0) === 0 ? [] : [output(form6251, {
          line2j_estates_and_trusts: item.box12_code_a_amt_adjustment!,
        })]
      ),
    ];

    for (const item of k1_trusts) {
      if (item.investment_property_for_form4952 !== true) continue;
      if (
        (item.box2b_qualified_dividends ?? 0) >
          (item.box2a_ordinary_dividends ?? 0)
      ) {
        throw new Error(
          "Trust K-1 qualified dividends exceed ordinary dividends",
        );
      }
      if ((item.box1_interest ?? 0) > 0) {
        outputs.push(
          output(form4952, { source_k1_interest: item.box1_interest! }),
        );
      }
      if ((item.box2a_ordinary_dividends ?? 0) > 0) {
        outputs.push(output(form4952, {
          source_k1_dividends: item.box2a_ordinary_dividends!,
        }));
      }
      if ((item.box2b_qualified_dividends ?? 0) > 0) {
        outputs.push(output(form4952, {
          source_k1_qualified_dividends: item.box2b_qualified_dividends!,
        }));
      }
    }

    return { outputs };
  }
}

export const k1_trust = new K1TrustNode();
