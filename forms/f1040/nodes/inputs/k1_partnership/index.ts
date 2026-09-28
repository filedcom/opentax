import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { schedule_b } from "../../intermediate/aggregation/schedule_b/index.ts";
import { schedule_d } from "../../intermediate/aggregation/schedule_d/index.ts";
import { schedule_se } from "../../intermediate/forms/schedule_se/index.ts";
import { form8995 } from "../../intermediate/forms/form8995/index.ts";
import {
  ForeignTaxCreditMethod,
  ForeignTaxKind,
  form_1116,
  IncomeCategory,
  partnershipK3PassiveInterestSchema,
} from "../../intermediate/forms/form_1116/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import { unrecaptured_1250_worksheet } from "../../intermediate/worksheets/unrecaptured_1250_worksheet/index.ts";
import { form6251 } from "../../intermediate/forms/form6251/index.ts";
import { income_tax_calculation } from "../../intermediate/worksheets/income_tax_calculation/index.ts";
import { form8960 } from "../../intermediate/forms/form8960/index.ts";
import { rate_28_gain_worksheet } from "../../intermediate/worksheets/rate_28_gain_worksheet/index.ts";
import { form4797 } from "../../intermediate/forms/form4797/index.ts";
import { form4562 } from "../../intermediate/forms/form4562/index.ts";
import { form4952 } from "../../intermediate/forms/form4952/index.ts";
import { f3800 } from "../f3800/index.ts";
import { form8582cr } from "../../intermediate/forms/form8582cr/index.ts";
import { disabledAccessLimit } from "../../intermediate/forms/disabled_access_limit/index.ts";
import { scheduleE } from "../schedule_e/index.ts";
import { tsjSchema } from "../../types.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Schedule K-1 (Form 1065) — Partner's Share of Income, Deductions, Credits
//
// Issued by partnerships (including LLCs taxed as partnerships) to partners.
// Key difference from S corp K-1: guaranteed payments for services (Box 4a) are
// subject to SE tax; net partnership earnings (Box 14a) also drive Schedule SE.
//
// IRS Instructions: https://www.irs.gov/instructions/i1065sk1
// IRC §702 — partner's distributive share; IRC §1402 — SE earnings

// Per-item schema — one K-1 from one partnership
export const itemSchema = z.object({
  // Identification
  partnership_name: z.string().min(1),
  partnership_ein: z.string().regex(/^\d{9}$/).optional(),
  source_document_reference: z.string().trim().min(1).optional(),
  // Box 15 code Z is the partner's orphan-drug credit, not a generic credit.
  box15_code_z_orphan_drug_credit: z.number().int().positive().optional(),
  orphan_drug_credit_subject_to_passive_activity_limit: z.boolean().optional(),
  box15_code_ad_new_markets_credit: z.number().int().positive().optional(),
  new_markets_credit_subject_to_passive_activity_limit: z.boolean().optional(),
  box15_code_k_disabled_access_credit: z.number().finite().positive().refine(
    (amount) =>
      Number.isSafeInteger(Math.round(amount * 100)) &&
      Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001,
    { message: "K-1 disabled-access credit needs cent precision" },
  ).optional(),
  disabled_access_credit_subject_to_passive_activity_limit: z.boolean()
    .optional(),
  // Affirm portfolio boxes 5/6 are investment-property income not already
  // included in Form 4952's manual "other" facts.
  investment_property_for_form4952: z.boolean().optional(),

  // Box 1 — Ordinary business income/loss → Schedule E page 2
  box1_ordinary_business: z.number().optional(),

  // Box 2 — Net rental real estate income/loss → Schedule E
  box2_rental_re: z.number().optional(),

  // Box 3 — Other net rental income/loss → Schedule E
  box3_other_rental: z.number().optional(),

  // Box 4a — Guaranteed payments for services → Schedule E + Schedule SE
  box4a_guaranteed_services: z.number().optional(),

  // Box 4b — Guaranteed payments for capital → Schedule E (not SE)
  box4b_guaranteed_capital: z.number().optional(),

  // Box 4c — Total guaranteed payments (4a + 4b) — informational sum
  box4c_total_guaranteed_payments: z.number().optional().describe(
    "Box 4c — Total guaranteed payments (services + capital)",
  ),

  // Box 5 — Interest income → Schedule B
  box5_interest: z.number().nonnegative().optional(),

  // Box 6a — Ordinary dividends → Schedule B
  box6a_ordinary_dividends: z.number().nonnegative().optional(),

  // Box 6b — Qualified dividends → Form 1040 line 3a
  box6b_qualified_dividends: z.number().nonnegative().optional(),

  // Box 6c — Dividend equivalents → Schedule B (§871(m) substitute dividends)
  box6c_dividend_equivalents: z.number().nonnegative().optional().describe(
    "Box 6c — Dividend equivalents",
  ),

  // Box 7 — Royalties → Schedule E line 4
  box7_royalties: z.number().nonnegative().optional(),
  // Owner and royalty-property identity are needed for the separate Schedule E
  // Part I row. Box 7 is not posted directly to Schedule 1.
  box7_royalty_reporting: z.object({
    tsj: tsjSchema,
    property_description: z.string().trim().min(1),
    portfolio_nonpassive: z.literal(true),
    form_1099_payments_made: z.literal(false),
  }).strict().optional(),
  box13_code_i_royalty_deduction: z.object({
    reported_amount: z.number().positive(),
    allowed_amount: z.number().nonnegative(),
    statement_reference: z.string().trim().min(1),
    expense_kind: z.enum([
      "depreciation",
      "depletion",
      "other_royalty_expense",
    ]),
    basis_workpaper_reference: z.string().trim().min(1),
    at_risk_workpaper_reference: z.string().trim().min(1),
  }).strict().optional(),

  // Box 8 — Net STCG/loss → Schedule D line 5
  box8_net_st_cap_gain: z.number().optional(),

  // Box 9a — Net LTCG/loss → Schedule D line 12
  box9a_net_lt_cap_gain: z.number().optional(),

  // Box 9b — Collectibles (28%) gain/loss → Schedule D 28% Rate Gain Worksheet
  box9b_collectibles_gain: z.number().optional().describe(
    "Box 9b — Collectibles (28%) gain/loss",
  ),

  // Box 9c — Unrecaptured §1250 gain → Unrecaptured §1250 Gain Worksheet
  // Partner's share of §1250 gain from partnership property; taxed at 25% max rate.
  box9c_unrecaptured_1250: z.number().nonnegative().optional().describe(
    "Box 9c — Unrecaptured section 1250 gain",
  ),

  // Box 9b — Unrecaptured §1250 gain → Unrecaptured §1250 Gain Worksheet
  // Partner's share of §1250 gain from partnership property; taxed at 25% max rate.
  // LEGACY: IRS renumbered this box; use box9c_unrecaptured_1250 for 2023+ returns.
  box9b_unrecaptured_1250: z.number().nonnegative().optional(),

  // Box 10 — Net §1231 gain/loss → Form 4797 Part I
  box10_net_1231: z.number().optional().describe(
    "Box 10 — Net section 1231 gain (loss)",
  ),

  // Box 11 — Other income (loss) → Schedule 1 line 8z (various codes A–J)
  box11_other_income: z.number().optional().describe(
    "Box 11 — Other income (loss)",
  ),

  // Box 12 — Section 179 deduction → Form 4562
  box12_section_179: z.number().nonnegative().optional().describe(
    "Box 12 — Section 179 deduction",
  ),

  // Box 14a — Net SE earnings → Schedule SE
  // This is the definitive SE income figure from the partnership
  box14a_se_earnings: z.number().optional(),

  // Box 16 — Foreign taxes paid → Form 1116
  box16_foreign_tax: z.number().nonnegative().optional(),
  box16_foreign_income: z.number().nonnegative().optional(),
  box16_foreign_income_category: z.nativeEnum(IncomeCategory).optional(),
  box16_foreign_deductions: z.number().nonnegative().optional(),
  box16_foreign_deductions_explanation: z.string().trim().min(1).optional(),
  // Use the country, tax type, and payment details from Schedule K-3 Part III.
  box16_foreign_tax_irs_country_code: z.string().length(2).optional(),
  box16_foreign_tax_paid_or_accrued_date: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
  ).optional(),
  box16_foreign_tax_kind: z.nativeEnum(ForeignTaxKind).optional(),
  box16_foreign_tax_credit_method: z.nativeEnum(ForeignTaxCreditMethod)
    .optional(),
  // A single 2025 Schedule K-3 (Form 1065) passive-interest source.
  schedule_k3_passive_interest: partnershipK3PassiveInterestSchema.optional(),

  // Box 18 — Tax-exempt income and nondeductible expenses (various codes A–C)
  // Code A: tax-exempt interest income; Code B: other tax-exempt income
  box18_tax_exempt_income: z.number().nonnegative().optional().describe(
    "Box 18 — Tax-exempt income and nondeductible expenses",
  ),

  // Box 19 — Distributions (cash and marketable securities, code A; property, code B)
  box19_distributions: z.number().nonnegative().optional().describe(
    "Box 19 — Distributions",
  ),

  // Box 20 code Z — Section 199A QBI information → Form 8995
  box20z_qbi: z.number().optional(),

  // Box 20 code B is informational. Only the separately documented portion
  // already allowed as a nonpassive depreciation/depletion deduction can
  // reduce Form 4952 investment income in 2025.
  box20_code_b_investment_expenses: z.object({
    reported_amount: z.number().positive(),
    allowed_deduction_amount: z.number().positive(),
    allowed_deduction_kind: z.enum(["depreciation", "depletion"]),
    nonpassive_investment_property: z.literal(true),
    issuer_crosswalk: z.object({
      issuer_supplement_reference: z.string().trim().min(1),
      issuer_reported_amount: z.number().positive(),
      same_expense_as_box13_code_i_confirmed: z.literal(true),
      box13_code_i_statement_reference: z.string().trim().min(1),
      royalty_property_description: z.string().trim().min(1),
    }).strict(),
  }).refine(
    (value) => value.allowed_deduction_amount <= value.reported_amount,
    {
      message: "Allowed K-1 investment expense cannot exceed box 20 code B",
    },
  ).optional(),

  // Box 13 code H is separately stated investment interest, not a general
  // partnership deduction. Form 4952 limits the amount deductible in 2025.
  box13_code_h_investment_interest: z.number().positive().optional(),

  // Box 20 — W-2 wages for QBI limitation
  box20_w2_wages: z.number().nonnegative().optional(),

  // Box 20 — UBIA of qualified property
  box20_ubia: z.number().nonnegative().optional(),

  // Box 20 — SSTB indicator (specified service trade or business)
  // When true, QBI deduction may be limited or disallowed based on taxable income
  box20_sstb: z.boolean().optional(),

  // Box 20 — Aggregation group identifier (§199A aggregation election)
  // Partners may aggregate multiple pass-throughs; group name ties K-1s together
  box20_aggregation_group: z.string().optional(),

  // Box 13 — Other deductions (various codes A-Z+)
  // Legacy aggregate of box 13 deductions. Code H investment interest must
  // instead use its separately stated field above and Form 4952 limitation.
  box13_deductions: z.number().nonnegative().optional(),

  // Box 17 — Alternative Minimum Tax (AMT) items (codes A-G)
  // Net adjustment to AMTI from partnership-level AMT preferences/adjustments.
  // Positive increases AMTI; negative decreases AMTI (e.g. AMT loss adjustments).
  // IRC §702(a)(7); Form 6251 Line 2 adjustments.
  box17_amt_adjustment: z.number().optional(),

  // ── Partner Basis Worksheet (K1P > "Basis Wkst" tab) ────────────────────────
  // These fields track outside basis — the partner's tax basis in the partnership.
  // Outside basis determines deductibility of losses (§704(d)) and gain/loss on
  // sale. They are worksheet fields, not K-1 boxes; carried forward each year.

  // Beginning-of-year outside basis
  basis_beginning: z.number().nonnegative().optional(),

  // Cash and property contributions made during the year
  basis_contributions: z.number().nonnegative().optional(),

  // Partner's share of income (increases basis)
  basis_share_of_income: z.number().optional(),

  // Partner's share of losses (decreases basis; reported as positive)
  basis_share_of_losses: z.number().nonnegative().optional(),

  // Distributions received (decrease basis; reported as positive)
  basis_distributions: z.number().nonnegative().optional(),

  // Increase in partner's share of liabilities (increases basis)
  basis_liabilities_assumed: z.number().nonnegative().optional(),

  // Decrease in partner's share of liabilities (decreases basis)
  basis_liabilities_relieved: z.number().nonnegative().optional(),

  // ── Pre-2018 Basis Carryover (K1P> "Pre-2018 Basis" tab) ────────────────────
  // Losses from pre-TCJA years suspended under §704(d) (basis limitation).
  // When basis became positive in a later year, these losses became deductible.
  // The TCJA (2017) changed passive activity interaction; these carryovers track
  // the amounts suspended before the new rules applied.

  // Pre-2018 ordinary losses suspended due to basis limitations
  pre2018_basis_ordinary_loss: z.number().nonnegative().optional(),

  // Pre-2018 short-term capital losses suspended due to basis limitations
  pre2018_basis_st_cap_loss: z.number().nonnegative().optional(),

  // Pre-2018 long-term capital losses suspended due to basis limitations
  pre2018_basis_lt_cap_loss: z.number().nonnegative().optional(),

  // Pre-2018 other losses suspended due to basis limitations
  pre2018_basis_other_loss: z.number().nonnegative().optional(),

  // ── Pre-2018 At-Risk Carryover (K1P> "Pre-2018 At-Risk" tab) ────────────────
  // Losses from pre-TCJA years suspended under §465 (at-risk limitation).
  // Tracked separately from basis carryovers per Drake software convention.

  // Pre-2018 ordinary losses suspended under at-risk rules (§465)
  pre2018_atrisk_ordinary_loss: z.number().nonnegative().optional(),

  // Pre-2018 short-term capital losses suspended under at-risk rules
  pre2018_atrisk_st_cap_loss: z.number().nonnegative().optional(),

  // Pre-2018 long-term capital losses suspended under at-risk rules
  pre2018_atrisk_lt_cap_loss: z.number().nonnegative().optional(),

  // Pre-2018 other losses suspended under at-risk rules
  pre2018_atrisk_other_loss: z.number().nonnegative().optional(),
}).superRefine((item, ctx) => {
  if (
    (item.box7_royalties ?? 0) > 0 || item.box7_royalty_reporting ||
    item.box13_code_i_royalty_deduction
  ) {
    for (
      const key of [
        "partnership_ein",
        "source_document_reference",
        "box7_royalty_reporting",
      ] as const
    ) {
      if (item[key] === undefined) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `K-1 box 7 royalty needs ${key}`,
        });
      }
    }
    if ((item.box7_royalties ?? 0) <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["box7_royalties"],
        message: "K-1 royalty route needs positive box 7 gross income",
      });
    }
    const codeI = item.box13_code_i_royalty_deduction;
    if (
      codeI && (codeI.allowed_amount !== codeI.reported_amount ||
        codeI.allowed_amount > (item.box7_royalties ?? 0))
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["box13_code_i_royalty_deduction"],
        message:
          "K-1 code I route needs the fully allowed statement amount within box 7 gross income",
      });
    }
  }
  if (item.box15_code_z_orphan_drug_credit !== undefined) {
    for (
      const key of [
        "partnership_ein",
        "source_document_reference",
        "orphan_drug_credit_subject_to_passive_activity_limit",
      ] as const
    ) {
      if (item[key] === undefined) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `K-1 box 15 code Z needs ${key}`,
        });
      }
    }
  }
  if (item.box15_code_ad_new_markets_credit !== undefined) {
    for (
      const key of [
        "partnership_ein",
        "source_document_reference",
        "new_markets_credit_subject_to_passive_activity_limit",
      ] as const
    ) {
      if (item[key] === undefined) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `K-1 box 15 code AD needs ${key}`,
        });
      }
    }
  }
  if (item.box15_code_k_disabled_access_credit !== undefined) {
    for (
      const key of [
        "partnership_ein",
        "source_document_reference",
        "disabled_access_credit_subject_to_passive_activity_limit",
      ] as const
    ) {
      if (item[key] === undefined) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `K-1 box 15 code K needs ${key}`,
        });
      }
    }
  }
  if (item.box20_code_b_investment_expenses !== undefined) {
    for (
      const key of ["partnership_ein", "source_document_reference"] as const
    ) {
      if (item[key] === undefined) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `K-1 box 20 code B needs ${key}`,
        });
      }
    }
    const codeB = item.box20_code_b_investment_expenses;
    const codeI = item.box13_code_i_royalty_deduction;
    const royalty = item.box7_royalty_reporting;
    if (
      !codeI || !royalty ||
      item.investment_property_for_form4952 !== true ||
      (item.box7_royalties ?? 0) <= 0 ||
      codeB.reported_amount !== codeI.reported_amount ||
      codeB.allowed_deduction_amount !== codeI.allowed_amount ||
      codeB.allowed_deduction_kind !== codeI.expense_kind ||
      codeB.issuer_crosswalk.issuer_reported_amount !== codeB.reported_amount ||
      codeB.issuer_crosswalk.box13_code_i_statement_reference !==
        codeI.statement_reference ||
      codeB.issuer_crosswalk.royalty_property_description !==
        royalty.property_description
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["box20_code_b_investment_expenses"],
        message:
          "K-1 box 20 code B needs the same issuer-identified and fully allowed box 13 code I royalty expense",
      });
    }
  }
  if (item.box13_code_h_investment_interest !== undefined) {
    for (
      const key of ["partnership_ein", "source_document_reference"] as const
    ) {
      if (item[key] === undefined) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `K-1 box 13 code H needs ${key}`,
        });
      }
    }
  }
});

export const inputSchema = z.object({
  k1_partnerships: z.array(itemSchema).min(1),
});

type K1PartnershipItem = z.infer<typeof itemSchema>;
type K1PartnershipItems = K1PartnershipItem[];

// Aggregate Schedule E income → schedule1 line5_schedule_e
// Includes: Box 1 + 2 + 3 + 4a + 4b. Box 7 goes through Schedule E Part I.
function schedule1Output(items: K1PartnershipItems): NodeOutput[] {
  const total = items.reduce(
    (sum, item) =>
      sum +
      (item.box1_ordinary_business ?? 0) +
      (item.box2_rental_re ?? 0) +
      (item.box3_other_rental ?? 0) +
      (item.box4a_guaranteed_services ?? 0) +
      (item.box4b_guaranteed_capital ?? 0),
    0,
  );
  if (total === 0) return [];
  return [
    output(schedule1, { line5_schedule_e: total }),
    output(agi_aggregator, { line5_schedule_e: total }),
  ];
}

function royaltyScheduleEOutputs(items: K1PartnershipItems): NodeOutput[] {
  return items.filter((item) => (item.box7_royalties ?? 0) > 0).map((item) => {
    const reporting = item.box7_royalty_reporting!;
    const deduction = item.box13_code_i_royalty_deduction;
    return output(scheduleE, {
      schedule_es: [{
        tsj: reporting.tsj,
        property_description: reporting.property_description,
        property_type: 6,
        activity_type: "D",
        fair_rental_days: 0,
        personal_use_days: 0,
        rent_income: 0,
        royalties_income: item.box7_royalties!,
        form_1099_payments_made: reporting.form_1099_payments_made,
        ...(deduction
          ? {
            expense_other_lines: [{
              description: "From Schedule K-1 (Form 1065)",
              amount: deduction.allowed_amount,
            }],
          }
          : {}),
        k1_royalty_source: {
          partnership_ein: item.partnership_ein!,
          source_document_reference: item.source_document_reference!,
          box7_gross_royalties: item.box7_royalties!,
          ...(deduction
            ? {
              box13_code_i_allowed_deduction: deduction.allowed_amount,
              box13_code_i_statement_reference: deduction.statement_reference,
            }
            : {}),
        },
      }],
    });
  });
}

// Per-payer schedule_b entries for interest (Box 5)
function scheduleBInterestOutputs(items: K1PartnershipItems): NodeOutput[] {
  return items
    .filter((item) => (item.box5_interest ?? 0) > 0)
    .map((item) =>
      output(schedule_b, {
        payer_name: item.partnership_name,
        taxable_interest_net: item.box5_interest!,
      })
    );
}

// Per-payer schedule_b entries for dividends (Box 6a)
function scheduleBDividendOutputs(items: K1PartnershipItems): NodeOutput[] {
  return items
    .filter((item) => (item.box6a_ordinary_dividends ?? 0) > 0)
    .map((item) =>
      output(schedule_b, {
        payerName: item.partnership_name,
        ordinaryDividends: item.box6a_ordinary_dividends!,
      })
    );
}

// Box 6c — Dividend equivalents (§871(m) substitute dividends) → Schedule B
// Treated as ordinary dividends; routed per-payer same as box6a.
function scheduleBDividendEquivalentOutputs(
  items: K1PartnershipItems,
): NodeOutput[] {
  return items
    .filter((item) => (item.box6c_dividend_equivalents ?? 0) > 0)
    .map((item) =>
      output(schedule_b, {
        payerName: item.partnership_name,
        ordinaryDividends: item.box6c_dividend_equivalents!,
      })
    );
}

// Aggregate qualified dividends (Box 6b) → f1040 line3a + income_tax_calculation QDCGT worksheet
// IRC §1(h): qualified dividends from partnerships receive preferential 0%/15%/20% rates.
// Both outputs carry the same aggregated total; income_tax_calculation uses it for QDCGT.
function f1040QualDivOutput(items: K1PartnershipItems): NodeOutput[] {
  const total = items.reduce(
    (sum, item) => sum + (item.box6b_qualified_dividends ?? 0),
    0,
  );
  if (total <= 0) return [];
  return [
    output(f1040, { line3a_qualified_dividends: total }),
    output(income_tax_calculation, { qualified_dividends: total }),
  ];
}

// Aggregate capital gains/losses → schedule_d (one merged output)
function scheduleDOutput(items: K1PartnershipItems): NodeOutput[] {
  const totalSt = items.reduce(
    (sum, item) => sum + (item.box8_net_st_cap_gain ?? 0),
    0,
  );
  const totalLt = items.reduce(
    (sum, item) => sum + (item.box9a_net_lt_cap_gain ?? 0),
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

// NIIT routing: K-1 partnership income → Form 8960 lines 2 and 4a.
// IRC §1411(c)(1)(A)/(2)(A):
//   - line4a (passive income): Box 2 rental + Box 3 other rental + Box 7 royalties
//     Box 1 ordinary business income is EXCLUDED when box14a_se_earnings is present —
//     active partners with SE income are not passive, so box1 is not NII per Reg §1.1411-5.
//   - line2 (ordinary dividends): Box 6a ordinary dividends from partnership investment portfolio
// Note: form8960 line2_ordinary_dividends is accumulable — f1099div also routes there.
// Sending as separate NodeOutput objects avoids merging issues and lets the executor
// accumulate them into an array that form8960 sums via normalizeArray.
function form8960Output(items: K1PartnershipItems): NodeOutput[] {
  const passiveTotal = items.reduce(
    (sum, item) => {
      // Only include box1 ordinary business income in NII when there is NO SE earnings
      // (box14a absent or zero), meaning the partner is passive for this activity.
      const box1Passive = (item.box14a_se_earnings ?? 0) === 0
        ? (item.box1_ordinary_business ?? 0)
        : 0;
      return sum +
        box1Passive +
        (item.box2_rental_re ?? 0) +
        (item.box3_other_rental ?? 0) +
        (item.box7_royalties ?? 0) -
        (item.box13_code_i_royalty_deduction?.allowed_amount ?? 0);
    },
    0,
  );
  const dividendTotal = items.reduce(
    (sum, item) => sum + (item.box6a_ordinary_dividends ?? 0),
    0,
  );
  const outputs: NodeOutput[] = [];
  if (passiveTotal !== 0) {
    outputs.push(output(form8960, { line4a_passive_income: passiveTotal }));
  }
  if (dividendTotal > 0) {
    outputs.push(output(form8960, { line2_ordinary_dividends: dividendTotal }));
  }
  return outputs;
}

// SE tax routing: aggregate all SE earnings across K-1s into a single output.
// Box 14a (net SE earnings) takes priority per item; Box 4a used as fallback.
// Aggregating prevents array accumulation in schedule_se when multiple K-1s are present.
function scheduleSEOutputs(items: K1PartnershipItems): NodeOutput[] {
  const total = items.reduce((sum, item) => {
    if ((item.box14a_se_earnings ?? 0) !== 0) {
      return sum + item.box14a_se_earnings!;
    }
    if ((item.box4a_guaranteed_services ?? 0) > 0) {
      return sum + item.box4a_guaranteed_services!;
    }
    return sum;
  }, 0);
  if (total === 0) return [];
  return [output(schedule_se, { net_profit_schedule_c: total })];
}

// QBI routing: Box 20Z → form8995
function form8995Output(items: K1PartnershipItems): NodeOutput[] {
  const totalQbi = items.reduce((sum, item) => sum + (item.box20z_qbi ?? 0), 0);
  const totalW2 = items.reduce(
    (sum, item) => sum + (item.box20_w2_wages ?? 0),
    0,
  );
  const totalUbia = items.reduce(
    (sum, item) => sum + (item.box20_ubia ?? 0),
    0,
  );

  if (totalQbi === 0 && totalW2 <= 0 && totalUbia <= 0) return [];

  if (totalQbi !== 0 && totalW2 > 0) {
    return [output(form8995, { qbi: totalQbi, w2_wages: totalW2 })];
  }
  if (totalQbi !== 0) {
    return [output(form8995, { qbi: totalQbi })];
  }
  return [output(form8995, { w2_wages: totalW2 })];
}

// Box 9b (legacy) + Box 9c — Unrecaptured §1250 gain → unrecaptured_1250_worksheet
// box9b_unrecaptured_1250: pre-2023 field name (IRS renumbered to 9c for 2023+)
// box9c_unrecaptured_1250: current field name for partner's share of §1250 gain (25% max rate)
function unrecaptured1250Outputs(items: K1PartnershipItems): NodeOutput[] {
  const total = items.reduce(
    (sum, item) =>
      sum + (item.box9b_unrecaptured_1250 ?? 0) +
      (item.box9c_unrecaptured_1250 ?? 0),
    0,
  );
  if (total <= 0) return [];
  return [
    output(unrecaptured_1250_worksheet, { unrecaptured_1250_gain: total }),
  ];
}

// Box 9b — Collectibles (28%) gain/loss → rate_28_gain_worksheet
// Partner's share of collectibles gain taxed at the 28% rate per IRC §1(h)(4).
function box9bCollectiblesOutputs(items: K1PartnershipItems): NodeOutput[] {
  const total = items.reduce(
    (sum, item) => sum + (item.box9b_collectibles_gain ?? 0),
    0,
  );
  if (total === 0) return [];
  return [output(rate_28_gain_worksheet, { collectibles_gain: total })];
}

// Box 10 — Net §1231 gain/loss → Form 4797 Part I
// §1231 gains/losses flow to Form 4797 Part I, which then determines ordinary vs. capital treatment.
function box10Net1231Outputs(items: K1PartnershipItems): NodeOutput[] {
  const rows = items
    .filter((item) => (item.box10_net_1231 ?? 0) !== 0)
    .map((item) => ({
      source: "partnership" as const,
      entity_name: item.partnership_name,
      gain_loss: item.box10_net_1231 ?? 0,
    }));
  if (rows.length === 0) return [];
  const total = rows.reduce((sum, row) => sum + row.gain_loss, 0);
  return [output(form4797, { section_1231_gain: total, k1_1231_rows: rows })];
}

// Box 11 — Other income (loss) → Schedule 1 line 8z + agi_aggregator
// Various codes A–J (e.g., code A: other portfolio income, code C: §1256 contracts).
// Routed to the generic line8z_other bucket on Schedule 1 and the AGI aggregator.
function box11OtherIncomeOutputs(items: K1PartnershipItems): NodeOutput[] {
  const total = items.reduce(
    (sum, item) => sum + (item.box11_other_income ?? 0),
    0,
  );
  if (total === 0) return [];
  return [
    output(schedule1, { line8z_other: total }),
    output(agi_aggregator, { line8z_other: total }),
  ];
}

// Box 12 — Section 179 deduction → Form 4562
// §179 deductions pass through to the partner and are subject to the partner's own §179
// limitation on Form 4562. Aggregate across all K-1s and emit as a single input.
function box12Section179Outputs(items: K1PartnershipItems): NodeOutput[] {
  const total = items.reduce(
    (sum, item) => sum + (item.box12_section_179 ?? 0),
    0,
  );
  if (total === 0) return [];
  return [output(form4562, { section_179_deduction: total })];
}

// Box 13 deductions — K-1 box 13 covers various codes (A–Z+):
//   Code A: Cash charitable contributions → Schedule A line 12
//   Code B: Capital gain property contributions → Schedule A line 12
//   Code K: Section 179 deduction → Form 4562
//   etc.
// These are itemized deductions that flow through Schedule A, NOT above-the-line.
// The input layer (parse_cch.py) aggregates box13 amounts into the schedule_a
// input data. This node does not route box13 to avoid double-counting.
function box13DeductionOutputs(_items: K1PartnershipItems): NodeOutput[] {
  return [];
}

// Box 17 AMT items → form6251 other_adjustments
// Partnership-level AMT preferences/adjustments passed through to the partner.
// Routes to the catch-all other_adjustments field on Form 6251.
// IRC §702(a)(7); Form 6251 Lines 2a–2t, 3.
function form6251Outputs(items: K1PartnershipItems): NodeOutput[] {
  const total = items.reduce(
    (sum, item) => sum + (item.box17_amt_adjustment ?? 0),
    0,
  );
  if (total === 0) return [];
  return [output(form6251, { other_adjustments: total })];
}

// Route foreign taxes → form_1116
function form1116Outputs(items: K1PartnershipItems): NodeOutput[] {
  for (const item of items) {
    const k3 = item.schedule_k3_passive_interest;
    if (!k3) continue;
    if (
      item.partnership_ein !== k3.partnership_ein ||
      item.source_document_reference !== k3.k1_source_document_reference ||
      item.box5_interest !== k3.part_ii_section_1_line_6_passive_interest ||
      item.box16_foreign_income !==
        k3.part_ii_section_1_line_24_passive_total ||
      item.box16_foreign_income !== item.box5_interest ||
      item.box16_foreign_tax !== k3.part_iii_section_4_line_1_foreign_tax ||
      item.box16_foreign_income_category !== IncomeCategory.Passive ||
      item.box16_foreign_tax_irs_country_code !== k3.irs_country_code ||
      item.box16_foreign_tax_paid_or_accrued_date !== k3.tax_paid_date ||
      item.box16_foreign_tax_kind !== ForeignTaxKind.Interest ||
      item.box16_foreign_tax_credit_method !== ForeignTaxCreditMethod.Paid ||
      k3.part_iii_section_4_line_2_tax_reduction >
        k3.part_iii_section_4_line_1_foreign_tax ||
      Math.round(
          k3.foreign_tax_currency.amount *
            k3.foreign_tax_currency.usd_per_foreign_unit * 100,
        ) !== Math.round(k3.part_iii_section_4_line_1_foreign_tax * 100) ||
      k3.foreign_tax_currency.source_document_reference !==
        k3.k3_source_document_reference
    ) {
      throw new Error(
        "Partnership K-3 passive interest, foreign tax, and reduction must match its K-1 and Form 1116 source",
      );
    }
  }
  return items
    .filter((item) =>
      (item.box16_foreign_tax ?? 0) > 0 &&
      (item.box16_foreign_income ?? 0) > 0 &&
      item.box16_foreign_income_category !== undefined
    )
    .map((item) =>
      output(form_1116, {
        foreign_tax_items: [{
          foreign_tax_paid: item.box16_foreign_tax!,
          foreign_gross_income: item.box16_foreign_income!,
          income_category: item.box16_foreign_income_category!,
          directly_allocable_deductions: item.box16_foreign_deductions,
          direct_expense_explanation: item.box16_foreign_deductions_explanation,
          irs_country_code: item.box16_foreign_tax_irs_country_code,
          tax_paid_or_accrued_date: item.box16_foreign_tax_paid_or_accrued_date,
          tax_kind: item.box16_foreign_tax_kind,
          tax_credit_method: item.box16_foreign_tax_credit_method,
          foreign_income_source_document_reference: item
            .schedule_k3_passive_interest?.k3_source_document_reference,
          foreign_tax_currency: item.schedule_k3_passive_interest
            ?.foreign_tax_currency,
          schedule_k3_line12_reduction: item.schedule_k3_passive_interest
            ? {
              amount: item.schedule_k3_passive_interest
                .part_iii_section_4_line_2_tax_reduction,
              source_document_reference: item.schedule_k3_passive_interest
                .k3_source_document_reference,
            }
            : undefined,
          partnership_k3_passive_interest: item.schedule_k3_passive_interest,
        }],
      })
    );
}

class K1PartnershipNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "k1_partnership";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule1,
    agi_aggregator,
    schedule_b,
    f1040,
    schedule_d,
    schedule_se,
    form8995,
    form_1116,
    unrecaptured_1250_worksheet,
    form6251,
    income_tax_calculation,
    form8960,
    rate_28_gain_worksheet,
    form4797,
    form4562,
    form4952,
    f3800,
    form8582cr,
    disabledAccessLimit,
    scheduleE,
  ]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const { k1_partnerships } = inputSchema.parse(input);

    const outputs: NodeOutput[] = [
      ...schedule1Output(k1_partnerships),
      ...royaltyScheduleEOutputs(k1_partnerships),
      ...scheduleBInterestOutputs(k1_partnerships),
      ...scheduleBDividendOutputs(k1_partnerships),
      // Box 6c — dividend equivalents treated as ordinary dividends on Schedule B
      ...scheduleBDividendEquivalentOutputs(k1_partnerships),
      ...f1040QualDivOutput(k1_partnerships),
      ...scheduleDOutput(k1_partnerships),
      ...box9bCollectiblesOutputs(k1_partnerships),
      ...scheduleSEOutputs(k1_partnerships),
      ...form8995Output(k1_partnerships),
      ...form1116Outputs(k1_partnerships),
      // box9c_unrecaptured_1250 (and legacy box9b_unrecaptured_1250) routed here
      ...unrecaptured1250Outputs(k1_partnerships),
      // box10_net_1231 → form4797 Part I (§1231 gain/loss)
      ...box10Net1231Outputs(k1_partnerships),
      // box11_other_income → Schedule 1 line 8z + agi_aggregator
      ...box11OtherIncomeOutputs(k1_partnerships),
      // box12_section_179 → form4562 (partner-level §179 limitation applies)
      ...box12Section179Outputs(k1_partnerships),
      ...box13DeductionOutputs(k1_partnerships),
      ...form6251Outputs(k1_partnerships),
      ...form8960Output(k1_partnerships),
      ...k1_partnerships.flatMap((item) => {
        const credit = item.box15_code_z_orphan_drug_credit;
        if (credit === undefined) return [];
        if (!item.partnership_ein || !item.source_document_reference) {
          throw new Error("Partnership orphan-drug K-1 source is incomplete");
        }
        if (item.orphan_drug_credit_subject_to_passive_activity_limit) {
          return [output(form8582cr, {
            required_orphan_drug_k1_credits: [{
              source_type: "partnership",
              source_ein: item.partnership_ein,
              source_document_reference: item.source_document_reference,
              credit_amount: credit,
            }],
          })];
        }
        return [output(f3800, {
          f8820_k1_credit_entries: [{
            source_type: "partnership",
            source_ein: item.partnership_ein,
            source_document_reference: item.source_document_reference,
            credit_amount: credit,
            subject_to_passive_activity_limit: false,
          }],
        })];
      }),
      ...k1_partnerships.flatMap((item) => {
        const credit = item.box15_code_ad_new_markets_credit;
        if (credit === undefined) return [];
        if (!item.partnership_ein || !item.source_document_reference) {
          throw new Error(
            "Partnership New Markets Credit K-1 source is incomplete",
          );
        }
        if (item.new_markets_credit_subject_to_passive_activity_limit) {
          return [output(form8582cr, {
            required_new_markets_k1_credits: [{
              source_type: "partnership",
              source_ein: item.partnership_ein,
              source_document_reference: item.source_document_reference,
              credit_amount: credit,
            }],
          })];
        }
        return [output(f3800, {
          f8874_k1_credit_entries: [{
            source_type: "partnership",
            source_ein: item.partnership_ein,
            source_document_reference: item.source_document_reference,
            credit_amount: credit,
            subject_to_passive_activity_limit: false,
          }],
        })];
      }),
      ...k1_partnerships.flatMap((item) => {
        const credit = item.box15_code_k_disabled_access_credit;
        if (credit === undefined) return [];
        if (!item.partnership_ein || !item.source_document_reference) {
          throw new Error(
            "Partnership disabled-access K-1 source is incomplete",
          );
        }
        if (item.disabled_access_credit_subject_to_passive_activity_limit) {
          return [output(disabledAccessLimit, {
            required_disabled_access_k1_credits: [{
              source_type: "partnership",
              source_ein: item.partnership_ein,
              source_document_reference: item.source_document_reference,
              credit_amount: credit,
            }],
          })];
        }
        return [output(disabledAccessLimit, {
          f8826_credit_entries: [{
            source_type: "partnership",
            source_ein: item.partnership_ein,
            source_document_reference: item.source_document_reference,
            credit_amount: credit,
            subject_to_passive_activity_limit: false,
          }],
        })];
      }),
      // box18_tax_exempt_income: excluded from taxable income — no routing needed.
      // box19_distributions: not taxable within basis — no routing needed (basis tracking not yet implemented).
    ];

    for (const item of k1_partnerships) {
      if (item.investment_property_for_form4952 !== true) continue;
      if (
        (item.box6b_qualified_dividends ?? 0) >
          (item.box6a_ordinary_dividends ?? 0)
      ) {
        throw new Error(
          "Partnership K-1 qualified dividends exceed ordinary dividends",
        );
      }
      if ((item.box5_interest ?? 0) > 0) {
        outputs.push(output(form4952, {
          source_k1_interest: item.box5_interest!,
        }));
      }
      if ((item.box7_royalties ?? 0) > 0) {
        outputs.push(output(form4952, {
          source_k1_royalties: item.box7_royalties!,
        }));
      }
      if ((item.box6a_ordinary_dividends ?? 0) > 0) {
        outputs.push(output(form4952, {
          source_k1_dividends: item.box6a_ordinary_dividends!,
        }));
      }
      if ((item.box6b_qualified_dividends ?? 0) > 0) {
        outputs.push(output(form4952, {
          source_k1_qualified_dividends: item.box6b_qualified_dividends!,
        }));
      }
    }

    for (const item of k1_partnerships) {
      const expense = item.box20_code_b_investment_expenses;
      if (expense) {
        outputs.push(output(form4952, {
          source_k1_allowed_investment_expenses:
            expense.allowed_deduction_amount,
        }));
      }
    }

    for (const item of k1_partnerships) {
      if (item.box13_code_h_investment_interest !== undefined) {
        outputs.push(output(form4952, {
          source_k1_investment_interest: item.box13_code_h_investment_interest,
        }));
      }
    }

    return { outputs };
  }
}

export const k1Partnership = new K1PartnershipNode();
