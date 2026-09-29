import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { standard_deduction } from "../../worksheets/standard_deduction/index.ts";
import { form8995a } from "../form8995a/index.ts";
import { scheduleCQbiBusinessSchema } from "../form8995a/index.ts";
import { FilingStatus } from "../../../types.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR, type F1040Config } from "../../../config/index.ts";

// ── TY2025 Constants ─────────────────────────────────────────────────────────

const QBI_RATE = 0.20; // IRC §199A(a) — 20% of net QBI

// Several lines are assembled from more than one upstream node: line 12 from f1099div
// (qualified dividends) and schedule_d (net capital gain), and the Line 1(c) deductions
// from schedule_se, form7206 and sep_retirement. Declaring those fields accumulable
// prevents a Zod parse failure when two deposit; sumField collapses the array.
const accumulable = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([schema, z.array(schema)]);

export const scheduleFQbiBusinessSchema = z.object({
  business_reference: z.string().optional(),
  business_name: z.string().optional(),
  ein: z.string().optional(),
  qbi: z.number(),
  no_other_adjustments_confirmed: z.boolean(),
  source_schedule_f: z.unknown(),
}).strict();

function sumField(value: number | number[] | undefined): number {
  if (value === undefined) return 0;
  if (Array.isArray(value)) {
    return value.reduce((s: number, n: number) => s + n, 0);
  }
  return value;
}

// ── Schemas ──────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Net QBI or (loss) from sole proprietorships (Schedule C), netted across businesses
  qbi_from_schedule_c: accumulable(z.number()).optional(),
  // Net QBI or (loss) from farming (Schedule F)
  qbi_from_schedule_f: accumulable(z.number()).optional(),
  // QBI from pass-through rentals/partnerships (Schedule E)
  qbi: accumulable(z.number()).optional(),
  // W-2 wages and UBIA are carried forward when Form 8995-A is required.
  w2_wages: accumulable(z.number().nonnegative()).optional(),
  unadjusted_basis: accumulable(z.number().nonnegative()).optional(),
  // Specified service trade or business amounts stay separate for the phase-out.
  sstb_qbi: accumulable(z.number()).optional(),
  sstb_w2_wages: accumulable(z.number().nonnegative()).optional(),
  sstb_unadjusted_basis: accumulable(z.number().nonnegative()).optional(),
  // Section 199A dividends from REITs (Form 1099-DIV box 5)
  line6_sec199a_dividends: accumulable(z.number().nonnegative()).optional(),
  // Taxable income before QBI deduction (AGI minus deductions).
  // When provided, caps QBI deduction at 20% of this amount (IRC §199A(a)).
  taxable_income: z.number().nonnegative().optional(),
  // Net capital gain (Form 1040 line 3a plus Schedule D) — reduces income limitation base
  net_capital_gain: accumulable(z.number().nonnegative()).optional(),
  // Deductible part of self-employment tax (Schedule SE line 13) attributable to the
  // trade or business — reduces QBI on Line 1(c)
  se_tax_deduction: accumulable(z.number().nonnegative()).optional(),
  // Self-employed health insurance deduction (Schedule 1 line 17) — reduces QBI
  se_health_insurance_deduction: accumulable(z.number().nonnegative())
    .optional(),
  // Deduction for contributions to a qualified retirement plan (Schedule 1 line 16)
  // — reduces QBI
  retirement_plan_deduction: accumulable(z.number().nonnegative()).optional(),
  // Prior-year QBI net loss carryforward (must be zero or negative)
  qbi_loss_carryforward: z.number().nonpositive().optional(),
  schedule_c_qbi_businesses: z.array(scheduleCQbiBusinessSchema).optional(),
  schedule_f_qbi_businesses: z.array(scheduleFQbiBusinessSchema).optional(),
  qbi_no_prior_loss_or_suspended_loss_confirmed: z.literal(true).optional(),
  qbi_not_patron_of_specified_cooperative_confirmed: z.literal(true).optional(),
  taxpayer_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/).optional(),
  // Prior-year REIT/PTP net loss carryforward (must be zero or negative)
  reit_loss_carryforward: z.number().nonpositive().optional(),
  // AGI — used to compute pre-QBI taxable income when taxable_income is not yet known
  agi: z.number().optional(),
  // Filing status — used to look up the standard deduction base for income limit
  filing_status: z.nativeEnum(FilingStatus).optional(),
  // Age/blindness flags — used to compute the full standard deduction (including additional factors)
  // so the QBI income limit uses the actual deduction amount rather than only the base.
  taxpayer_age_65_or_older: z.boolean().optional(),
  taxpayer_blind: z.boolean().optional(),
  spouse_age_65_or_older: z.boolean().optional(),
  spouse_blind: z.boolean().optional(),
});

type Form8995Input = z.infer<typeof inputSchema>;

// ── Pure helpers ──────────────────────────────────────────────────────────────

// Line 1(c)/Line 2: the net QBI or (loss) of every trade or business, reduced by the
// deductions attributable to them. i8995, Determining Your Qualified Business Income:
// the items to consider include the "deductible part of self-employment tax,
// self-employment health insurance deduction, and contributions to qualified
// retirement plans".
function businessDeductions(input: Form8995Input): number {
  return sumField(input.se_tax_deduction) +
    sumField(input.se_health_insurance_deduction) +
    sumField(input.retirement_plan_deduction);
}

function totalQbi(input: Form8995Input): number {
  return sumField(input.qbi_from_schedule_c) +
    sumField(input.qbi_from_schedule_f) +
    sumField(input.qbi) + sumField(input.sstb_qbi) -
    businessDeductions(input);
}

function netQbi(input: Form8995Input): number {
  return totalQbi(input) + (input.qbi_loss_carryforward ?? 0);
}

function qbiComponent(input: Form8995Input): number {
  const net = netQbi(input);
  if (net <= 0) return 0;
  return net * QBI_RATE;
}

function netReit(input: Form8995Input): number {
  return sumField(input.line6_sec199a_dividends) +
    (input.reit_loss_carryforward ?? 0);
}

function reitComponent(input: Form8995Input): number {
  const net = netReit(input);
  if (net <= 0) return 0;
  return net * QBI_RATE;
}

function totalBeforeLimit(input: Form8995Input): number {
  return qbiComponent(input) + reitComponent(input);
}

// Filing statuses for which spouse factors apply (same set as standard_deduction worksheet).
const SPOUSE_STATUSES = new Set<FilingStatus>([
  FilingStatus.MFJ,
  FilingStatus.MFS,
  FilingStatus.QSS,
]);

// Compute the effective standard deduction for a filing status, including age/blindness additions.
// This mirrors the logic in the standard_deduction worksheet so that the QBI income limit
// uses the same deduction amount that will ultimately be applied to taxable income.
function standardDeductionAmount(
  input: Form8995Input,
  cfg: F1040Config,
): number {
  const status = input.filing_status;
  if (status === undefined) return 0;
  const base = cfg.standardDeductionBase[status] ?? 0;
  const additionalPerFactor = cfg.standardDeductionAdditional[status] ?? 0;
  let factors = 0;
  if (input.taxpayer_age_65_or_older) factors += 1;
  if (input.taxpayer_blind) factors += 1;
  if (SPOUSE_STATUSES.has(status)) {
    if (input.spouse_age_65_or_older) factors += 1;
    if (input.spouse_blind) factors += 1;
  }
  return base + factors * additionalPerFactor;
}

function incomeLimitBase(
  input: Form8995Input,
  cfg: F1040Config,
): number {
  const capGain = sumField(input.net_capital_gain);

  // Preferred: use explicit taxable_income (pre-QBI) when available
  if (input.taxable_income !== undefined) {
    return Math.max(0, input.taxable_income - capGain);
  }

  // Fallback: derive from AGI minus the full standard deduction (including age/blindness
  // additions) for the filing status. IRC §199A(a) caps the deduction at 20% of
  // (taxable income before QBI deduction). Using the full standard deduction amount
  // matches what the standard_deduction worksheet will compute.
  if (input.agi !== undefined) {
    const stdDed = standardDeductionAmount(input, cfg);
    return Math.max(0, input.agi - stdDed - capGain);
  }

  // No income information available — income limit cannot be applied; return Infinity
  // so the deduction is uncapped (will be corrected when agi is received).
  return Infinity;
}

function incomeLimit(
  input: Form8995Input,
  cfg: F1040Config,
): number {
  const base = incomeLimitBase(input, cfg);
  if (base === Infinity) return Infinity;
  return base * QBI_RATE;
}

function qbiDeduction(
  input: Form8995Input,
  cfg: F1040Config,
): number {
  const total = totalBeforeLimit(input);
  if (total <= 0) return 0;
  const limit = incomeLimit(input, cfg);
  if (limit === Infinity) return total;
  return Math.min(total, limit);
}

function hasQbiActivity(input: Form8995Input): boolean {
  return (
    input.schedule_c_qbi_businesses?.some((business) => business.qbi < 0) ===
      true ||
    sumField(input.qbi_from_schedule_c) !== 0 ||
    sumField(input.qbi_from_schedule_f) !== 0 ||
    sumField(input.qbi) !== 0 ||
    sumField(input.sstb_qbi) !== 0 ||
    sumField(input.line6_sec199a_dividends) > 0 ||
    (input.qbi_loss_carryforward ?? 0) !== 0 ||
    (input.reit_loss_carryforward ?? 0) !== 0
  );
}

function taxableIncomeBeforeQbi(
  input: Form8995Input,
  cfg: F1040Config,
): number | undefined {
  if (input.taxable_income !== undefined) return input.taxable_income;
  if (input.agi === undefined || input.filing_status === undefined) {
    return undefined;
  }
  return Math.max(0, input.agi - standardDeductionAmount(input, cfg));
}

function qbiThreshold(
  filingStatus: FilingStatus,
  cfg: F1040Config,
): number {
  return filingStatus === FilingStatus.MFJ
    ? cfg.qbiThresholdMfj
    : cfg.qbiThresholdSingle;
}

function advancedFormOutput(
  input: Form8995Input,
  taxableIncome: number,
): NodeOutput {
  const nonSstbQbi = sumField(input.qbi_from_schedule_c) +
    sumField(input.qbi_from_schedule_f) + sumField(input.qbi);
  const sstbQbi = sumField(input.sstb_qbi);
  if (input.schedule_c_qbi_businesses?.some((business) => business.qbi < 0)) {
    if (
      sumField(input.qbi_from_schedule_f) !== 0 || sumField(input.qbi) !== 0 ||
      sstbQbi !== 0 || businessDeductions(input) !== 0 ||
      sumField(input.qbi_from_schedule_c) !==
        input.schedule_c_qbi_businesses.reduce(
          (sum, business) => sum + business.qbi,
          0,
        ) ||
      sumField(input.w2_wages) !==
        input.schedule_c_qbi_businesses.reduce(
          (sum, business) => sum + business.w2_wages,
          0,
        ) ||
      sumField(input.unadjusted_basis) !==
        input.schedule_c_qbi_businesses.reduce(
          (sum, business) => sum + business.ubia,
          0,
        )
    ) {
      throw new Error(
        "Form 8995-A Schedule C bounded route needs only its identified Schedule C QBI businesses and no separately attributable business deductions",
      );
    }
  }
  const deductions = businessDeductions(input);
  const positiveTotal = Math.max(0, nonSstbQbi) + Math.max(0, sstbQbi);
  const nonSstbShare = positiveTotal > 0
    ? Math.max(0, nonSstbQbi) / positiveTotal
    : 0;
  const sstbShare = positiveTotal > 0
    ? Math.max(0, sstbQbi) / positiveTotal
    : 0;

  return output(form8995a, {
    filing_status: input.filing_status,
    taxable_income: taxableIncome,
    net_capital_gain: sumField(input.net_capital_gain),
    qbi: nonSstbQbi - deductions * nonSstbShare,
    w2_wages: sumField(input.w2_wages),
    unadjusted_basis: sumField(input.unadjusted_basis),
    sstb_qbi: sstbQbi - deductions * sstbShare,
    sstb_w2_wages: sumField(input.sstb_w2_wages),
    sstb_unadjusted_basis: sumField(input.sstb_unadjusted_basis),
    line6_sec199a_dividends: sumField(input.line6_sec199a_dividends),
    qbi_loss_carryforward: input.qbi_loss_carryforward ?? 0,
    reit_loss_carryforward: input.reit_loss_carryforward ?? 0,
    ...(input.schedule_c_qbi_businesses?.some((business) => business.qbi < 0) &&
      {
        schedule_c_qbi_businesses: input.schedule_c_qbi_businesses,
        qbi_no_prior_loss_or_suspended_loss_confirmed:
          input.qbi_no_prior_loss_or_suspended_loss_confirmed,
      }),
  });
}

// One identified Schedule C business can file a simplified positive claim
// with its sourced half-SE-tax deduction and no other section 199A sources.
function oneScheduleCLines(
  input: Form8995Input,
  cfg: F1040Config,
): (Record<string, string | number> & { line15: number }) | undefined {
  const businesses = input.schedule_c_qbi_businesses;
  if (businesses?.length !== 1) return undefined;
  const business = businesses[0];
  const seDeduction = input.se_tax_deduction ?? 0;
  if (
    !business.business_reference || !business.business_name ||
    (!business.ein && !input.taxpayer_ssn) ||
    business.no_other_adjustments_confirmed !== true ||
    input.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    input.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
    !Number.isInteger(business.qbi) || business.qbi <= 0 ||
    sumField(input.qbi_from_schedule_c) !== business.qbi ||
    sumField(input.qbi_from_schedule_f) !== 0 || sumField(input.qbi) !== 0 ||
    sumField(input.sstb_qbi) !== 0 ||
    typeof seDeduction !== "number" || seDeduction < 0 ||
    sumField(input.se_health_insurance_deduction) !== 0 ||
    sumField(input.retirement_plan_deduction) !== 0 ||
    sumField(input.line6_sec199a_dividends) !== 0 ||
    sumField(input.net_capital_gain) !== 0 ||
    (input.qbi_loss_carryforward ?? 0) !== 0 ||
    (input.reit_loss_carryforward ?? 0) !== 0 ||
    input.agi === undefined || !Number.isFinite(input.agi) ||
    input.filing_status === undefined
  ) return undefined;
  const qbi = Math.round(business.qbi - seDeduction);
  if (qbi <= 0) return undefined;
  const line11 = Math.round(
    Math.max(0, input.agi - standardDeductionAmount(input, cfg)),
  );
  const line5 = Math.round(qbi * QBI_RATE);
  const line14 = Math.round(line11 * QBI_RATE);
  return {
    line1_business_reference: business.business_reference,
    line1_business_name: business.business_name,
    ...(business.ein
      ? { line1_ein: business.ein }
      : { line1_ssn: input.taxpayer_ssn!.replace(/\D/g, "") }),
    line1_qbi: qbi,
    line2: qbi,
    line3: 0,
    line4: qbi,
    line5,
    line6: 0,
    line7: 0,
    line8: 0,
    line9: 0,
    line10: line5,
    line11,
    line12: 0,
    line13: line11,
    line14,
    line15: Math.min(line5, line14),
    line16: 0,
    line17: 0,
  };
}

function oneScheduleFLines(
  input: Form8995Input,
  cfg: F1040Config,
): (Record<string, string | number> & { line15: number }) | undefined {
  const businesses = input.schedule_f_qbi_businesses;
  if (businesses?.length !== 1) return undefined;
  const business = businesses[0];
  const seDeduction = sumField(input.se_tax_deduction);
  const usesSsn = !business.ein &&
    input.filing_status === FilingStatus.Single &&
    input.taxpayer_ssn !== undefined;
  if (
    !business.business_reference || !business.business_name ||
    (!business.ein && !usesSsn) ||
    business.no_other_adjustments_confirmed !== true ||
    input.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    input.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
    !Number.isInteger(business.qbi) || business.qbi <= 0 ||
    sumField(input.qbi_from_schedule_f) !== business.qbi ||
    sumField(input.qbi_from_schedule_c) !== 0 || sumField(input.qbi) !== 0 ||
    sumField(input.sstb_qbi) !== 0 ||
    seDeduction < 0 ||
    sumField(input.se_health_insurance_deduction) !== 0 ||
    sumField(input.retirement_plan_deduction) !== 0 ||
    sumField(input.line6_sec199a_dividends) !== 0 ||
    sumField(input.net_capital_gain) !== 0 ||
    (input.qbi_loss_carryforward ?? 0) !== 0 ||
    (input.reit_loss_carryforward ?? 0) !== 0 ||
    input.agi === undefined || !Number.isFinite(input.agi) ||
    input.filing_status === undefined
  ) return undefined;
  const qbi = Math.round(business.qbi - seDeduction);
  if (qbi <= 0) return undefined;
  const line11 = Math.round(
    Math.max(0, input.agi - standardDeductionAmount(input, cfg)),
  );
  const line5 = Math.round(qbi * QBI_RATE);
  const line14 = Math.round(line11 * QBI_RATE);
  return {
    line1_business_reference: business.business_reference,
    line1_business_name: business.business_name,
    ...(usesSsn
      ? { line1_ssn: input.taxpayer_ssn!.replace(/\D/g, "") }
      : { line1_ein: business.ein! }),
    line1_qbi: qbi,
    line2: qbi,
    line3: 0,
    line4: qbi,
    line5,
    line6: 0,
    line7: 0,
    line8: 0,
    line9: 0,
    line10: line5,
    line11,
    line12: 0,
    line13: line11,
    line14,
    line15: Math.min(line5, line14),
    line16: 0,
    line17: 0,
  };
}

// ── Node class ────────────────────────────────────────────────────────────────

class Form8995Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8995";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    f1040,
    standard_deduction,
    form8995a,
  ]);

  compute(ctx: NodeContext, rawInput: Form8995Input): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    const input = inputSchema.parse(rawInput);

    if (!hasQbiActivity(input)) {
      return { outputs: [] };
    }

    const taxableIncome = taxableIncomeBeforeQbi(input, cfg);
    if (
      taxableIncome !== undefined && input.filing_status !== undefined &&
      taxableIncome > qbiThreshold(input.filing_status, cfg)
    ) {
      return { outputs: [advancedFormOutput(input, taxableIncome)] };
    }

    if (netQbi(input) < 0) {
      throw new Error(
        "Form 8995 net QBI loss needs a sourced carryforward filing route",
      );
    }

    const simplifiedLines = input.schedule_f_qbi_businesses !== undefined
      ? oneScheduleFLines(input, cfg)
      : oneScheduleCLines(input, cfg);
    // The bounded one-business filed routes carry whole-dollar line 15 exactly
    // into Form 1040. Other QBI routes retain their existing calculation.
    const deduction = simplifiedLines === undefined
      ? qbiDeduction(input, cfg)
      : simplifiedLines.line15;
    if (deduction <= 0) {
      return { outputs: [] };
    }

    const outputs: NodeOutput[] = [
      this.outputNodes.output(f1040, { line13_qbi_deduction: deduction }),
      // Route QBI deduction to standard_deduction so it is subtracted from taxable income
      // before routing to income_tax_calculation (Form 1040 lines 13 → 14 → 15).
      this.outputNodes.output(standard_deduction, { qbi_deduction: deduction }),
      {
        nodeType: this.nodeType,
        fields: {
          qbi_deduction: deduction,
          ...simplifiedLines,
        },
      },
    ];

    return { outputs };
  }
}

export const form8995 = new Form8995Node();
