import { z } from "zod";
import type { NodeResult } from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { standard_deduction } from "../../worksheets/standard_deduction/index.ts";
import { FilingStatus } from "../../../types.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";
import {
  employeeTipSource2026Schema,
  reconcileEmployeeTips2026,
} from "../../../../2026/employee-tips.ts";

const vehicleLoanSchema = z.object({
  vin: z.string().trim().regex(
    /^[A-HJ-NPR-Z0-9]{17}$/i,
    "VIN must contain 17 characters and cannot contain I, O, or Q",
  ),
  qualified_interest_paid: z.number().nonnegative(),
  interest_deducted_on_business_schedules: z.number().nonnegative().optional(),
}).refine(
  (loan) =>
    (loan.interest_deducted_on_business_schedules ?? 0) <=
      loan.qualified_interest_paid,
  {
    message: "Business-use interest cannot exceed qualified interest paid",
    path: ["interest_deducted_on_business_schedules"],
  },
);

/** Fields a taxpayer supplies directly for Schedule 1-A. */
export const claimInputSchema = z.object({
  taxpayer_qualified_overtime_compensation: z.number().nonnegative().optional(),
  spouse_qualified_overtime_compensation: z.number().nonnegative().optional(),
  taxpayer_non_w2_qualified_overtime_compensation: z.number().nonnegative()
    .optional(),
  spouse_non_w2_qualified_overtime_compensation: z.number().nonnegative()
    .optional(),
  vehicle_loans: z.array(vehicleLoanSchema).min(1).optional(),
});

export const inputSchema = claimInputSchema.extend({
  qualified_employee_tips: z.array(z.object({
    employee_ssn: z.string(),
    amount: z.number().nonnegative(),
  })).optional(),
  qualified_employee_tip_sources_2026: z.array(employeeTipSource2026Schema)
    .optional(),
  qualified_employee_overtime: z.array(z.object({
    employee_ssn: z.string(),
    amount: z.number().nonnegative(),
    employer_name: z.string().optional(),
    employer_ein: z.string().optional(),
  })).optional(),
  magi: z.number().optional(),
  filing_status: z.nativeEnum(FilingStatus).optional(),
  taxpayer_ssn: z.string().optional(),
  spouse_ssn: z.string().optional(),
  taxpayer_has_valid_ssn: z.boolean().optional(),
  spouse_has_valid_ssn: z.boolean().optional(),
  taxpayer_age_65_or_older: z.boolean().optional(),
  spouse_age_65_or_older: z.boolean().optional(),
});

type Schedule1AInput = z.infer<typeof inputSchema>;

const QUALIFIED_TIPS_CAP = 25_000;
const OVERTIME_CAP = 12_500;
const OVERTIME_CAP_MFJ = 25_000;
const TIPS_OVERTIME_PHASEOUT_THRESHOLD = 150_000;
const TIPS_OVERTIME_PHASEOUT_THRESHOLD_MFJ = 300_000;
const VEHICLE_INTEREST_CAP = 10_000;
const VEHICLE_PHASEOUT_THRESHOLD = 100_000;
const VEHICLE_PHASEOUT_THRESHOLD_MFJ = 200_000;

function tipsOvertimePhaseout(input: Schedule1AInput): number | undefined {
  if (input.filing_status === undefined || input.magi === undefined) {
    return undefined;
  }
  const threshold = input.filing_status === FilingStatus.MFJ
    ? TIPS_OVERTIME_PHASEOUT_THRESHOLD_MFJ
    : TIPS_OVERTIME_PHASEOUT_THRESHOLD;
  return Math.floor(Math.max(0, input.magi - threshold) / 1_000) * 100;
}

export function qualifiedTipsDeduction(
  input: Schedule1AInput,
  taxYear = 2025,
): number {
  let eligibleTips: number;
  if (taxYear === 2026) {
    if (input.qualified_employee_tips !== undefined) {
      throw new Error("TY2026 tips need employer-level W-2/4137 sources");
    }
    const sources = input.qualified_employee_tip_sources_2026 ?? [];
    if (sources.length > 0 && input.filing_status === undefined) {
      throw new Error("TY2026 employer tips need filing status");
    }
    const reconciled = sources.length > 0
      ? reconcileEmployeeTips2026({
        filingStatus: input.filing_status!,
        taxpayerSsn: input.taxpayer_ssn,
        spouseSsn: input.spouse_ssn,
        sources,
      })
      : { rows: [], totalBeforeCap: 0 };
    eligibleTips = reconciled.rows.reduce((sum, row) => {
      const validSsn = row.recipient === "taxpayer"
        ? input.taxpayer_has_valid_ssn === true
        : input.spouse_has_valid_ssn === true;
      return sum + (validSsn ? row.amountUsed : 0);
    }, 0);
  } else {
    if (input.qualified_employee_tip_sources_2026 !== undefined) {
      throw new Error("Employer-level TP/4137 tip sources require TY2026");
    }
    const taxpayerSsn = input.taxpayer_ssn?.replaceAll("-", "");
    const spouseSsn = input.spouse_ssn?.replaceAll("-", "");
    eligibleTips = (input.qualified_employee_tips ?? []).reduce(
      (sum, entry) => {
        const employeeSsn = entry.employee_ssn.replaceAll("-", "");
        if (
          employeeSsn === taxpayerSsn &&
          input.taxpayer_has_valid_ssn === true
        ) return sum + entry.amount;
        if (
          input.filing_status === FilingStatus.MFJ &&
          employeeSsn === spouseSsn &&
          input.spouse_has_valid_ssn === true
        ) return sum + entry.amount;
        return sum;
      },
      0,
    );
  }
  const tips = Math.min(eligibleTips, QUALIFIED_TIPS_CAP);
  const phaseout = tipsOvertimePhaseout(input);
  if (
    tips === 0 ||
    input.filing_status === FilingStatus.MFS ||
    phaseout === undefined
  ) {
    return 0;
  }
  return Math.max(0, tips - phaseout);
}

export function qualifiedOvertimeDeduction(
  input: Schedule1AInput,
  taxYear = 2025,
): number {
  if (taxYear === 2026) {
    if (
      input.taxpayer_qualified_overtime_compensation !== undefined ||
      input.spouse_qualified_overtime_compensation !== undefined
    ) {
      throw new Error(
        "TY2026 overtime must distinguish W-2 code TT from non-W-2 compensation",
      );
    }
  } else if (
    input.qualified_employee_overtime !== undefined ||
    input.taxpayer_non_w2_qualified_overtime_compensation !== undefined ||
    input.spouse_non_w2_qualified_overtime_compensation !== undefined
  ) {
    throw new Error("W-2 code TT and separated overtime require tax year 2026");
  }
  if (
    input.filing_status === undefined ||
    input.filing_status === FilingStatus.MFS
  ) {
    return 0;
  }

  const normalizeSsn = (ssn: string | undefined) => ssn?.replaceAll("-", "");
  const taxpayerSsn = normalizeSsn(input.taxpayer_ssn);
  const spouseSsn = normalizeSsn(input.spouse_ssn);
  const w2Overtime = input.qualified_employee_overtime ?? [];
  if (
    taxYear === 2026 && w2Overtime.some((entry) => {
      const ssn = normalizeSsn(entry.employee_ssn);
      return ssn !== taxpayerSsn && ssn !== spouseSsn;
    })
  ) {
    throw new Error("W-2 code TT employee SSN does not match a filer");
  }
  const taxpayerW2 = taxYear === 2026
    ? w2Overtime.filter((entry) =>
      normalizeSsn(entry.employee_ssn) === taxpayerSsn
    ).reduce((sum, entry) => sum + entry.amount, 0)
    : 0;
  const spouseW2 = taxYear === 2026
    ? w2Overtime.filter((entry) =>
      normalizeSsn(entry.employee_ssn) === spouseSsn
    ).reduce((sum, entry) => sum + entry.amount, 0)
    : 0;
  const taxpayerOvertime = input.taxpayer_has_valid_ssn === true
    ? taxYear === 2026
      ? taxpayerW2 +
        (input.taxpayer_non_w2_qualified_overtime_compensation ?? 0)
      : input.taxpayer_qualified_overtime_compensation ?? 0
    : 0;
  const spouseOvertime = input.filing_status === FilingStatus.MFJ &&
      input.spouse_has_valid_ssn === true
    ? taxYear === 2026
      ? spouseW2 + (input.spouse_non_w2_qualified_overtime_compensation ?? 0)
      : input.spouse_qualified_overtime_compensation ?? 0
    : 0;
  const cap = input.filing_status === FilingStatus.MFJ
    ? OVERTIME_CAP_MFJ
    : OVERTIME_CAP;
  const phaseout = tipsOvertimePhaseout(input);
  if (phaseout === undefined) return 0;
  return Math.max(
    0,
    Math.min(taxpayerOvertime + spouseOvertime, cap) - phaseout,
  );
}

export function vehicleLoanInterestDeduction(input: Schedule1AInput): number {
  if (input.filing_status === undefined || input.magi === undefined) return 0;
  const qualifiedInterest = (input.vehicle_loans ?? []).reduce(
    (sum, loan) =>
      sum + loan.qualified_interest_paid -
      (loan.interest_deducted_on_business_schedules ?? 0),
    0,
  );
  if (qualifiedInterest <= 0) return 0;

  const threshold = input.filing_status === FilingStatus.MFJ
    ? VEHICLE_PHASEOUT_THRESHOLD_MFJ
    : VEHICLE_PHASEOUT_THRESHOLD;
  const phaseout = Math.ceil(Math.max(0, input.magi - threshold) / 1_000) * 200;
  return Math.max(
    0,
    Math.min(qualifiedInterest, VEHICLE_INTEREST_CAP) - phaseout,
  );
}

export function seniorDeduction(
  ctx: NodeContext,
  input: Schedule1AInput,
): number {
  if (
    input.filing_status === undefined ||
    input.filing_status === FilingStatus.MFS ||
    input.magi === undefined
  ) {
    return 0;
  }
  const cfg = CONFIG_BY_YEAR[ctx.taxYear];
  if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);

  const taxpayerEligible = input.taxpayer_age_65_or_older === true &&
    input.taxpayer_has_valid_ssn === true;
  const spouseEligible = input.filing_status === FilingStatus.MFJ &&
    input.spouse_age_65_or_older === true &&
    input.spouse_has_valid_ssn === true;
  const eligiblePeople = Number(taxpayerEligible) + Number(spouseEligible);
  if (eligiblePeople === 0) return 0;

  const threshold = input.filing_status === FilingStatus.MFJ
    ? cfg.seniorDeductionPhaseoutMfj
    : cfg.seniorDeductionPhaseoutSingle;
  const perPerson = Math.max(
    0,
    cfg.seniorDeductionMax -
      Math.max(0, input.magi - threshold) * cfg.seniorDeductionPhaseoutRate,
  );
  return eligiblePeople * perPerson;
}

class Schedule1ANode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule1a";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, standard_deduction]);

  compute(ctx: NodeContext, rawInput: Schedule1AInput): NodeResult {
    const input = inputSchema.parse(rawInput);
    const enhancedSeniorDeduction = seniorDeduction(ctx, input);
    const qualifiedTips = qualifiedTipsDeduction(input, ctx.taxYear);
    const qualifiedOvertime = qualifiedOvertimeDeduction(input, ctx.taxYear);
    const vehicleLoanInterest = vehicleLoanInterestDeduction(input);
    const deduction = qualifiedTips + qualifiedOvertime + vehicleLoanInterest +
      enhancedSeniorDeduction;
    if (deduction === 0) return { outputs: [] };
    if (ctx.taxYear === 2026) {
      return {
        outputs: [
          {
            nodeType: standard_deduction.nodeType,
            fields: {
              schedule1a_line44: deduction,
              schedule1a_line43: enhancedSeniorDeduction,
            },
          },
          {
            nodeType: this.nodeType,
            fields: {
              line15_qualified_tips: qualifiedTips,
              line27_qualified_overtime: qualifiedOvertime,
              line36_vehicle_loan_interest: vehicleLoanInterest,
              line43_enhanced_senior: enhancedSeniorDeduction,
              line44_total_additional_deductions: deduction,
            },
          },
        ],
      };
    }
    return {
      outputs: [
        this.outputNodes.output(f1040, {
          line13b_additional_deductions: deduction,
        }),
        this.outputNodes.output(standard_deduction, {
          additional_deductions: deduction,
          enhanced_senior_deduction: enhancedSeniorDeduction,
        }),
      ],
    };
  }
}

export const schedule1a = new Schedule1ANode();
