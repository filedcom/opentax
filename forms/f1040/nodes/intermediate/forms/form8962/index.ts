import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../aggregation/schedule3/index.ts";
import { schedule2 } from "../../aggregation/schedule2/index.ts";
import { form6251 } from "../form6251/index.ts";
import { FilingStatus, filingStatusSchema } from "../../../types.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";
import type { F1040Config } from "../../../config/index.ts";

// 2025 Form 8962 instructions, Table 2: line 5 is an integer percentage.
// Through 150% FPL the applicable figure is zero; it rises by 0.0004 per
// percentage point through 300%, then by 0.00025 to 8.5% at 400%.

// IRC §36B(f)(2)(B): APTC repayment caps by household income as % of FPL
// Table 5 has a Single column and one column for every other filing status.
// Above 400% FPL (TY2025): no cap — ARP extension means 400%+ still eligible,
//   so full excess APTC is repaid with no limit
type RepaymentCapTier = {
  readonly maxPct: number; // income pct upper bound (exclusive)
  readonly singleCap: number;
  readonly otherCap: number;
};

const REPAYMENT_CAP_TIERS: readonly RepaymentCapTier[] = [
  { maxPct: 200, singleCap: 375, otherCap: 750 },
  { maxPct: 300, singleCap: 975, otherCap: 1_950 },
  { maxPct: 400, singleCap: 1_625, otherCap: 3_250 },
];

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Household size for FPL calculation
  household_size: z.number().int().positive().optional(),
  fpl_region: z.enum(["contiguous", "alaska", "hawaii"]).optional(),

  // Form 8962 lines 2a, 2b, and 3 are distinct amounts.
  taxpayer_modified_agi: z.number().optional(),
  dependents_modified_agi: z.number().optional(),
  form8814_expected_ssns: z.array(z.string()).optional(),
  form8814_children: z.array(z.object({
    ssn: z.string().regex(/^\d{9}$/),
    magi: z.number().nonnegative(),
  })).optional(),
  dependent_income_complete: z.boolean().optional(),

  // Annual totals (used when no monthly detail provided)
  annual_premium: z.number().nonnegative().optional(),
  annual_slcsp: z.number().nonnegative().optional(),
  annual_aptc: z.number().nonnegative().optional(),
  // Form 8962 line 10: derived from twelve full-year, unchanged monthly rows.
  annual_line11_eligible: z.boolean().optional(),

  // Monthly detail arrays (12 elements each, indexed 0=Jan … 11=Dec)
  monthly_premiums: z.array(z.number().nonnegative()).length(12).optional(),
  monthly_slcsps: z.array(z.number().nonnegative()).length(12).optional(),
  monthly_aptcs: z.array(z.number().nonnegative()).length(12).optional(),

  // QSEHRA — kept as an input fact, but rejected until monthly affordability
  // and permitted-benefit calculations are modeled (2025 Form 8962 instructions).
  qsehra_amount_offered: z.number().nonnegative().optional(),

  // Filing status — used for IRC §36B(f)(2)(B) repayment cap (Single/MFS vs other)
  filing_status: filingStatusSchema.optional(),
});

type Form8962Input = z.infer<typeof inputSchema>;

// ─── Pure Helpers ─────────────────────────────────────────────────────────────

function federalPovertyLevel(
  householdSize: number,
  region: NonNullable<Form8962Input["fpl_region"]>,
  cfg: F1040Config,
): number {
  const [base, increment] = region === "alaska"
    ? [18_810, 6_730]
    : region === "hawaii"
    ? [17_310, 6_190]
    : [cfg.fplBase, cfg.fplIncrement];
  return base + increment * (householdSize - 1);
}

function applicableContributionPct(incomeAsFplPct: number): number {
  const line5 = Math.floor(incomeAsFplPct);
  if (line5 < 100) return Infinity;
  if (line5 <= 150) return 0;
  if (line5 <= 300) return ((line5 - 150) * 4) / 10_000;
  if (line5 < 400) {
    return Math.round(600 + (line5 - 300) * 2.5) / 10_000;
  }
  return 0.085;
}

function totalPremium(input: Form8962Input): number {
  if (input.monthly_premiums) {
    return input.monthly_premiums.reduce((sum, m) => sum + m, 0);
  }
  return input.annual_premium ?? 0;
}

function totalSlcsp(input: Form8962Input): number {
  if (input.monthly_slcsps) {
    return input.monthly_slcsps.reduce((sum, m) => sum + m, 0);
  }
  return input.annual_slcsp ?? 0;
}

function totalAptc(input: Form8962Input): number {
  if (input.monthly_aptcs) {
    return input.monthly_aptcs.reduce((sum, m) => sum + m, 0);
  }
  return input.annual_aptc ?? 0;
}

// Allowed PTC = min(enrollment premium, max(0, SLCSP - contribution)).
// IRS Form 8962 line 11: max premium assistance = SLCSP - required contribution;
// allowed = lesser of enrollment premium or max premium assistance (IRC §36B(b)(2)(A))
function allowedPtc(
  slcsp: number,
  actualPremium: number,
  applicable: number,
): number {
  return Math.min(actualPremium, Math.max(0, slcsp - applicable));
}

// IRC §36B(f)(2)(B): cap on excess APTC repayment liability
// Returns null when no cap applies (income ≥ 400% FPL)
function repaymentCap(
  incomePct: number,
  status: FilingStatus | undefined,
): number | null {
  const isSingle = status === FilingStatus.Single;
  for (const tier of REPAYMENT_CAP_TIERS) {
    if (incomePct < tier.maxPct) {
      return isSingle ? tier.singleCap : tier.otherCap;
    }
  }
  return null; // ≥ 400% FPL — no cap
}

function buildOutputs(
  line26: number,
  line29: number,
  formFields: Record<string, unknown>,
): NodeOutput[] {
  const outputs: NodeOutput[] = [];
  if (line26 > 0) {
    outputs.push(output(schedule3, { line9_premium_tax_credit: line26 }));
  }
  if (line29 > 0) {
    outputs.push(output(schedule2, { line1a_excess_advance_premium: line29 }));
    outputs.push(output(form6251, { schedule2_line1z_tax: line29 }));
  }
  outputs.push({ nodeType: "form8962", fields: formFields });
  return outputs;
}

// ─── Node Class ───────────────────────────────────────────────────────────────

class Form8962Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8962";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3, schedule2, form6251]);

  compute(ctx: NodeContext, rawInput: Form8962Input): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    const input = inputSchema.parse(rawInput);

    const premium = totalPremium(input);
    const slcsp = totalSlcsp(input);
    const aptc = totalAptc(input);
    if (premium === 0 && slcsp === 0 && aptc === 0) return { outputs: [] };
    if (
      input.taxpayer_modified_agi === undefined ||
      input.household_size === undefined ||
      input.fpl_region === undefined || input.filing_status === undefined
    ) {
      throw new Error(
        "Form 8962 requires taxpayer modified AGI, family size, FPL region, and filing status",
      );
    }
    if (input.dependent_income_complete !== true) {
      throw new Error(
        "Form 8962 needs verified dependent filing and modified-AGI facts",
      );
    }
    if (input.filing_status === FilingStatus.MFS) {
      throw new Error(
        "Form 8962 MFS needs verified exception and policy-allocation facts before filing",
      );
    }

    const hasMonthlyColumns = input.monthly_premiums !== undefined ||
      input.monthly_slcsps !== undefined || input.monthly_aptcs !== undefined;
    if (
      hasMonthlyColumns &&
      (!input.monthly_premiums || !input.monthly_slcsps || !input.monthly_aptcs)
    ) {
      throw new Error(
        "Form 8962 monthly calculation needs all three 1095-A columns for each month",
      );
    }
    if (!hasMonthlyColumns && input.annual_line11_eligible !== true) {
      throw new Error(
        "Form 8962 annual line 11 needs verified full-year unchanged monthly coverage",
      );
    }
    const monthly = hasMonthlyColumns && input.annual_line11_eligible !== true;
    if ((input.qsehra_amount_offered ?? 0) > 0) {
      throw new Error(
        "Form 8962 QSEHRA needs monthly affordability and benefit facts before PTC can be filed",
      );
    }

    const taxpayerMagi = input.taxpayer_modified_agi;
    const expected8814 = input.form8814_expected_ssns ?? [];
    const reported8814 = input.form8814_children ?? [];
    const reportedBySsn = new Map(
      reported8814.map((child) => [child.ssn, child.magi]),
    );
    if (
      new Set(expected8814).size !== expected8814.length ||
      reportedBySsn.size !== reported8814.length ||
      expected8814.some((ssn) => !ssn || !reportedBySsn.has(ssn))
    ) {
      throw new Error(
        "Form 8962 needs a matching Form 8814 for each elected dependent",
      );
    }
    const dependentsMagi = (input.dependents_modified_agi ?? 0) +
      expected8814.reduce((sum, ssn) => sum + (reportedBySsn.get(ssn) ?? 0), 0);
    const income = Math.max(0, taxpayerMagi + dependentsMagi);
    const fpl = federalPovertyLevel(
      input.household_size,
      input.fpl_region,
      cfg,
    );
    const incomePct = income > 4 * fpl ? 401 : Math.floor(income / fpl * 100);
    if (incomePct < 100) {
      throw new Error(
        "Form 8962 below 100% FPL needs verified PTC exception facts before filing",
      );
    }
    const applicableFigure = applicableContributionPct(incomePct);
    const annualContribution = applicableFigure === Infinity
      ? undefined
      : Math.round(income * applicableFigure);
    const monthlyContribution = annualContribution === undefined
      ? undefined
      : Math.round(annualContribution / 12);
    const monthlyRows = monthly
      ? input.monthly_premiums!.map((monthPremium, index) => {
        const monthSlcsp = input.monthly_slcsps![index];
        const monthAptc = input.monthly_aptcs![index];
        const maxAssistance = annualContribution === undefined
          ? 0
          : Math.max(0, monthSlcsp - monthlyContribution!);
        return {
          month_code: [
            "JANUARY",
            "FEBRUARY",
            "MARCH",
            "APRIL",
            "MAY",
            "JUNE",
            "JULY",
            "AUGUST",
            "SEPTEMBER",
            "OCTOBER",
            "NOVEMBER",
            "DECEMBER",
          ][index],
          premium: monthPremium,
          slcsp: monthSlcsp,
          contribution: monthlyContribution,
          max_assistance: maxAssistance,
          allowed_credit: Math.min(monthPremium, maxAssistance),
          aptc: monthAptc,
        };
      })
      : undefined;
    const annualMaxAssistance = annualContribution === undefined
      ? 0
      : Math.max(0, slcsp - annualContribution);
    const allowed = monthlyRows
      ? monthlyRows.reduce((sum, row) => sum + row.allowed_credit, 0)
      : annualContribution === undefined
      ? 0
      : allowedPtc(slcsp, premium, annualContribution);
    const line24 = Math.round(allowed);
    const line25 = Math.round(aptc);
    const line26 = Math.max(0, line24 - line25);
    const line27 = Math.max(0, line25 - line24);
    const cap = line27 > 0
      ? repaymentCap(incomePct, input.filing_status)
      : null;
    const line29 = cap === null ? line27 : Math.min(line27, cap);

    const formFields: Record<string, unknown> = {
      household_size: input.household_size,
      taxpayer_modified_agi: taxpayerMagi,
      dependents_modified_agi: dependentsMagi,
      household_income: income,
      federal_poverty_line: fpl,
      fpl_region: input.fpl_region,
      federal_poverty_pct: incomePct,
      total_premium_tax_credit: line24,
      total_advance_ptc: line25,
      ...(annualContribution !== undefined && {
        applicable_figure: applicableFigure,
        annual_applicable_contribution: annualContribution,
        monthly_applicable_contribution: monthlyContribution,
      }),
      ...(monthlyRows ? { monthly_ptc_rows: monthlyRows } : {
        annual_premium: premium,
        annual_slcsp: slcsp,
        annual_max_ptc: annualMaxAssistance,
        annual_ptc_allowed: line24,
        annual_aptc: aptc,
      }),
      ...(line26 > 0 && { net_premium_tax_credit: line26 }),
      ...(line27 > 0 && {
        excess_advance_payment: line27,
        ...(cap !== null && { repayment_limitation: cap }),
        excess_advance_premium: line29,
      }),
    };
    return { outputs: buildOutputs(line26, line29, formFields) };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const form8962 = new Form8962Node();
