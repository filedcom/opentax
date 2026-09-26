import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { schedule2 } from "../../aggregation/schedule2/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";

// ─── TY2025 Constants (Rev Proc 2024-40; IRS Publication 926) ────────────────

// FICA rates — employer and employee share each pay:
// Social Security: 6.2% employer + 6.2% employee = 12.4% total
// Medicare: 1.45% employer + 1.45% employee = 2.9% total
// Combined: 7.65% employer + 7.65% employee = 15.3% total
const SS_RATE_EMPLOYER = 0.062;
const SS_RATE_EMPLOYEE = 0.062;
const MEDICARE_RATE_EMPLOYER = 0.0145;
const MEDICARE_RATE_EMPLOYEE = 0.0145;
const calendarDate = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) &&
    date.toISOString().slice(0, 10) === value;
}, "Expected a valid ISO calendar date");

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // MeF identity and per-employee line A answer cannot be inferred from payroll.
  employer_ein: z.string().regex(/^\d{9}$/).optional(),
  cash_wages_over_2025_limit: z.boolean().optional(),
  cash_wages_over_quarter_limit: z.boolean().optional(),
  // Social Security wages (may differ if wages exceed SS wage base)
  ss_wages: z.number().nonnegative().optional(),

  // Medicare wages (all FICA wages — no wage base cap)
  medicare_wages: z.number().nonnegative().optional(),

  // Line 5 is the sum of wages above $200,000 for each employee, not the
  // employer's aggregate Medicare wages above $200,000.
  additional_medicare_wages: z.number().nonnegative().optional(),

  // Federal income tax withheld from household employee wages
  // Must withhold only if employee requests it (Form W-4)
  federal_income_tax_withheld: z.number().nonnegative().optional(),

  // Part II Section A. The $7,000 cap is applied to each employee upstream.
  federal_unemployment: z.union([
    z.object({
      paid_only_one_state: z.literal(true),
      all_contributions_paid_on_time: z.literal(true),
      all_futa_wages_state_taxable: z.literal(true),
      state: z.string().regex(/^[A-Z]{2}$/),
      contributions_paid: z.number().positive().optional(),
      zero_experience_rate: z.literal(true).optional(),
      taxable_wages: z.number().nonnegative(),
    }).strict(),
    z.object({
      paid_only_one_state: z.boolean(),
      all_contributions_paid_on_time: z.boolean(),
      all_futa_wages_state_taxable: z.boolean(),
      taxable_futa_wages: z.number().nonnegative(),
      state_rows: z.array(
        z.object({
          state: z.string().regex(/^[A-Z]{2}$/),
          taxable_state_wages: z.number().nonnegative(),
          experience_rate: z.number().min(0).max(1).optional(),
          rate_period_from: calendarDate.optional(),
          rate_period_to: calendarDate.optional(),
          contributions_paid_by_due_date: z.number().nonnegative(),
        }).strict(),
      ).min(1).max(62),
      late_contributions: z.number().positive().optional(),
      credit_reduction_wages: z.array(
        z.object({
          state: z.enum(["CA", "VI"]),
          taxable_futa_wages: z.number().nonnegative(),
        }).strict(),
      ).optional(),
    }).strict(),
  ]).optional(),
}).strict();

type ScheduleHInput = z.infer<typeof inputSchema>;

// ─── Pure Helpers ─────────────────────────────────────────────────────────────

// Lines 1 and 3 must already account for each employee's threshold, exclusions,
// and Social Security wage base. The employer's aggregate payroll cannot do so.
export function computeScheduleHAmounts(
  input: ScheduleHInput,
  taxYear: number,
) {
  if ((input.ss_wages === undefined) !== (input.medicare_wages === undefined)) {
    throw new Error(
      "Schedule H requires both taxable Social Security and Medicare wage amounts",
    );
  }
  if (
    input.additional_medicare_wages !== undefined &&
    (input.medicare_wages === undefined ||
      input.additional_medicare_wages > input.medicare_wages)
  ) {
    throw new Error(
      "Schedule H Additional Medicare wages require a sufficient Medicare wage amount",
    );
  }
  if (
    input.cash_wages_over_quarter_limit === true &&
    !input.federal_unemployment
  ) {
    throw new Error("Schedule H needs Part II unemployment details");
  }
  if (
    input.federal_unemployment &&
    input.cash_wages_over_quarter_limit !== true
  ) {
    throw new Error("Schedule H Part II requires a true quarter-limit answer");
  }
  const unemployment = input.federal_unemployment;
  if (
    unemployment && "state_rows" in unemployment && taxYear !== 2025
  ) {
    throw new Error(
      `Schedule H Section B credit reduction rates are not configured for ${taxYear}`,
    );
  }
  if (unemployment && "taxable_wages" in unemployment) {
    if (
      (unemployment.contributions_paid === undefined) ===
        (unemployment.zero_experience_rate === undefined)
    ) {
      throw new Error(
        "Schedule H Section A needs either contributions paid or an explicit 0% rate",
      );
    }
  }
  if (unemployment && "state_rows" in unemployment) {
    if (
      unemployment.paid_only_one_state &&
      unemployment.all_contributions_paid_on_time &&
      unemployment.all_futa_wages_state_taxable
    ) {
      throw new Error(
        "Schedule H Section B requires a No answer on line 10, 11, or 12",
      );
    }
    if (
      unemployment.all_contributions_paid_on_time ===
        (unemployment.late_contributions !== undefined)
    ) {
      throw new Error(
        "Schedule H late contributions must match the line 11 answer",
      );
    }
    for (const row of unemployment.state_rows) {
      if (
        (row.experience_rate === undefined &&
          row.rate_period_from !== undefined) ||
        (row.rate_period_from === undefined) !==
          (row.rate_period_to === undefined) ||
        (row.experience_rate !== undefined &&
          row.rate_period_from === undefined) ||
        (row.rate_period_from !== undefined &&
          (row.rate_period_from > row.rate_period_to! ||
            row.rate_period_from < `${taxYear}-01-01` ||
            row.rate_period_to! > `${taxYear}-12-31`))
      ) {
        throw new Error(
          "Schedule H state experience rate needs a valid date period",
        );
      }
    }
    const reductionStates = new Set(
      unemployment.credit_reduction_wages?.map((entry) => entry.state) ?? [],
    );
    if (
      reductionStates.size !==
        (unemployment.credit_reduction_wages?.length ?? 0) ||
      [...reductionStates].some((state) =>
        !unemployment.state_rows.some((row) => row.state === state)
      )
    ) {
      throw new Error(
        "Schedule H credit reduction state wages must match unique state rows",
      );
    }
    if (
      (unemployment.credit_reduction_wages ?? []).reduce(
        (total, entry) => total + entry.taxable_futa_wages,
        0,
      ) > unemployment.taxable_futa_wages
    ) {
      throw new Error(
        "Schedule H credit reduction wages exceed total FUTA wages",
      );
    }
    for (const state of ["CA", "VI"] as const) {
      if (
        unemployment.state_rows.some((row) => row.state === state) &&
        !reductionStates.has(state)
      ) {
        throw new Error(
          `Schedule H needs ${state} credit reduction FUTA wages`,
        );
      }
    }
    if (
      reductionStates.size > 0 && unemployment.paid_only_one_state
    ) {
      throw new Error(
        "Schedule H line 10 must be No for a credit reduction state",
      );
    }
  }
  const socialSecurityTax = Math.round(
    (input.ss_wages ?? 0) * (SS_RATE_EMPLOYER + SS_RATE_EMPLOYEE),
  );
  const medicareTax = Math.round(
    (input.medicare_wages ?? 0) *
      (MEDICARE_RATE_EMPLOYER + MEDICARE_RATE_EMPLOYEE),
  );
  const additionalMedicareTax = Math.round(
    (input.additional_medicare_wages ?? 0) * 0.009,
  );
  const ficaAndWithholding = socialSecurityTax + medicareTax +
    additionalMedicareTax +
    (input.federal_income_tax_withheld ?? 0);
  const sectionB = unemployment && "state_rows" in unemployment
    ? computeSectionB(unemployment)
    : undefined;
  const futaTax = sectionB?.futaTax ??
    (unemployment && "taxable_wages" in unemployment
      ? Math.round(unemployment.taxable_wages * 0.006)
      : 0);
  return {
    socialSecurityTax,
    medicareTax,
    additionalMedicareTax,
    ficaAndWithholding,
    futaTax,
    sectionB,
    totalTax: ficaAndWithholding + futaTax,
  };
}

function computeSectionB(
  input: Extract<NonNullable<ScheduleHInput["federal_unemployment"]>, {
    state_rows: unknown;
  }>,
) {
  const rows = input.state_rows.map((row) => {
    const creditAt54 = row.experience_rate !== undefined &&
        row.experience_rate < 0.054
      ? Math.round(row.taxable_state_wages * 0.054)
      : undefined;
    const creditAtStateRate = creditAt54 === undefined
      ? undefined
      : Math.round(row.taxable_state_wages * row.experience_rate!);
    return {
      ...row,
      creditAt54,
      creditAtStateRate,
      additionalCredit: creditAt54 === undefined
        ? 0
        : Math.max(0, creditAt54 - creditAtStateRate!),
    };
  });
  const additionalCredit = rows.reduce(
    (total, row) => total + row.additionalCredit,
    0,
  );
  const contributions = rows.reduce(
    (total, row) => total + row.contributions_paid_by_due_date,
    0,
  );
  const tentativeCredit = additionalCredit + contributions;
  const grossTax = Math.round(input.taxable_futa_wages * 0.06);
  const maximumCredit = Math.round(input.taxable_futa_wages * 0.054);
  const lateCredit = input.late_contributions === undefined ? 0 : Math.round(
    Math.min(
      Math.max(0, maximumCredit - tentativeCredit),
      input.late_contributions,
    ) * 0.9,
  );
  const reduction = (input.credit_reduction_wages ?? []).reduce(
    (total, entry) =>
      total + Math.round(
        entry.taxable_futa_wages * (entry.state === "CA" ? 0.012 : 0.045),
      ),
    0,
  );
  const allowedCredit = Math.max(
    0,
    Math.min(maximumCredit, tentativeCredit + lateCredit) - reduction,
  );
  return {
    rows,
    additionalCredit,
    contributions,
    tentativeCredit,
    grossTax,
    maximumCredit,
    allowedCredit,
    futaTax: grossTax - allowedCredit,
    needsWorksheet: input.late_contributions !== undefined ||
      (input.credit_reduction_wages?.length ?? 0) > 0,
  };
}

function buildOutput(totalTax: number): NodeOutput[] {
  if (totalTax <= 0) return [];
  return [output(schedule2, { line9_household_employment: totalTax })];
}

// ─── Node Class ───────────────────────────────────────────────────────────────

class ScheduleHNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_h";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule2]);

  compute(ctx: NodeContext, rawInput: ScheduleHInput): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    const input = inputSchema.parse(rawInput);

    // If no wages or tax data provided, no output
    const hasWages = (input.ss_wages ?? 0) > 0 ||
      (input.medicare_wages ?? 0) > 0 ||
      (input.additional_medicare_wages ?? 0) > 0 ||
      (input.federal_income_tax_withheld ?? 0) > 0 ||
      input.federal_unemployment !== undefined;

    if (!hasWages) return { outputs: [] };

    const { totalTax } = computeScheduleHAmounts(input, ctx.taxYear);
    return { outputs: buildOutput(totalTax) };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const schedule_h = new ScheduleHNode();
