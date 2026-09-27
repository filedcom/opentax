import { z } from "zod";
import type {
  AtLeastOne,
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { filingStatusSchema } from "../../types.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../config/index.ts";

export const earnedIncomeWorksheetSchema = z.object({
  form1040_line1z_wages: z.number().nonnegative(),
  nontaxable_combat_pay: z.number().nonnegative(),
  schedule_c_statutory_employee_income: z.number().nonnegative(),
  nonfarm_schedule_c_and_k1_net: z.number(),
  farm_schedule_f_and_k1_net: z.number(),
  farm_optional_method_used: z.boolean(),
  schedule_se_line15: z.number().nonnegative().optional(),
  excluded_medicaid_waiver_payments: z.number().nonnegative(),
  schedule1_line15_se_deduction: z.number().nonnegative(),
}).superRefine((value, ctx) => {
  if (
    value.farm_optional_method_used && value.schedule_se_line15 === undefined
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Schedule 8812 earned-income worksheet needs Schedule SE line 15 for the farm optional method",
    });
  }
  if (
    !value.farm_optional_method_used && value.schedule_se_line15 !== undefined
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Schedule 8812 earned-income worksheet Schedule SE line 15 requires the farm optional method",
    });
  }
});

export const creditLimitWorksheetSchema = z.object({
  schedule3_line1: z.number().nonnegative(),
  schedule3_line2: z.number().nonnegative(),
  schedule3_line3: z.number().nonnegative(),
  schedule3_line4: z.number().nonnegative(),
  schedule3_line5b: z.number().nonnegative(),
  schedule3_line6d: z.number().nonnegative(),
  schedule3_line6f: z.number().nonnegative(),
  schedule3_line6l: z.number().nonnegative(),
  schedule3_line6m: z.number().nonnegative(),
  worksheet_b_applies: z.boolean(),
  worksheet_b_line14: z.number().nonnegative().optional(),
  worksheet_b_line15: z.number().nonnegative().optional(),
}).superRefine((value, ctx) => {
  if (value.worksheet_b_applies && value.worksheet_b_line15 === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Schedule 8812 Worksheet B needs its line 15 credit total",
    });
  }
  if (!value.worksheet_b_applies && value.worksheet_b_line15 !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Schedule 8812 Worksheet B line 15 requires Worksheet B",
    });
  }
  if (!value.worksheet_b_applies && value.worksheet_b_line14 !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Schedule 8812 Worksheet B line 14 requires Worksheet B",
    });
  }
});

export const creditLimitWorksheet2026Schema = z.object({
  schedule3_line1: z.number().nonnegative(),
  schedule3_line2: z.number().nonnegative(),
  schedule3_line3: z.number().nonnegative(),
  schedule3_line4: z.number().nonnegative(),
  schedule3_line6d: z.number().nonnegative(),
  schedule3_line6f: z.number().nonnegative(),
  schedule3_line6l: z.number().nonnegative(),
  schedule3_line6m: z.number().nonnegative(),
  worksheet_b_applies: z.boolean(),
  worksheet_b_line14: z.number().nonnegative().optional(),
  schedule3_line5a: z.number().nonnegative().optional(),
  schedule3_line6c: z.number().nonnegative().optional(),
  schedule3_line6g: z.number().nonnegative().optional(),
  schedule3_line6h: z.number().nonnegative().optional(),
}).strict().superRefine((value, ctx) => {
  const bSources = [
    value.schedule3_line5a,
    value.schedule3_line6c,
    value.schedule3_line6g,
    value.schedule3_line6h,
  ];
  if (
    value.worksheet_b_applies && bSources.some((amount) => amount === undefined)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "TY2026 Schedule 8812 Worksheet B needs Schedule 3 lines 5a, 6c, 6g, and 6h",
    });
  }
  if (
    !value.worksheet_b_applies &&
    (value.worksheet_b_line14 !== undefined ||
      bSources.some((amount) => amount !== undefined))
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "TY2026 Schedule 8812 Worksheet B lines require Worksheet B",
    });
  }
});

export const itemSchema = z.object({
  qualifying_children_count: z.number().int().nonnegative().optional(),
  other_dependents_count: z.number().int().nonnegative().optional(),
  agi: z.number().optional(),
  filing_status: filingStatusSchema.optional(),
  earned_income: z.number().nonnegative().optional(),
  line18a_earned_income: z.number().optional(),
  earned_income_worksheet: earnedIncomeWorksheetSchema.optional(),
  credit_limit_worksheet: creditLimitWorksheetSchema.optional(),
  income_tax_liability: z.number().nonnegative().optional(),
  // Modified AGI add-backs (Lines 2a-2c of Schedule 8812)
  puerto_rico_excluded_income: z.number().nonnegative().optional(),
  form_2555_amounts: z.number().nonnegative().optional(),
  form_4563_amount: z.number().nonnegative().optional(),
  // ACTC earned income
  nontaxable_combat_pay: z.number().nonnegative().optional(),
  // Part II-B payroll tax method inputs (Lines 22-26)
  ss_taxes_withheld: z.number().nonnegative().optional(),
  medicare_taxes_withheld: z.number().nonnegative().optional(),
  se_tax: z.number().nonnegative().optional(),
  eic_amount: z.number().nonnegative().optional(),
  // Flags
  do_not_claim_actc: z.boolean().optional(),
  has_form_2555: z.boolean().optional(),
  bona_fide_pr_resident: z.boolean().optional(),
  odc_only_override: z.boolean().optional(),
  not_eligible_override: z.boolean().optional(),
  form_8332_override: z.boolean().optional(),
}).superRefine((item, ctx) => {
  if (
    item.ss_taxes_withheld !== undefined ||
    item.medicare_taxes_withheld !== undefined ||
    item.se_tax !== undefined ||
    item.eic_amount !== undefined
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Schedule 8812 legacy payroll fields cannot represent Part II-B; use the structured part_iib line sources",
    });
  }
});

export const inputSchema = z.object({
  f8812s: z.array(itemSchema).optional(),
  // Set by Form 8862 when prior-year CTC/ACTC disallowance has been cleared
  form8862_filed: z.boolean().optional(),
  credit_limit_worksheet: creditLimitWorksheetSchema.optional(),
  credit_limit_worksheet_2026: creditLimitWorksheet2026Schema.optional(),
  part_iib: z.object({
    line21_w2_withheld_social_security_medicare: z.number().nonnegative(),
    schedule1_line15: z.number().nonnegative(),
    schedule2_line5: z.number().nonnegative(),
    schedule2_line6: z.number().nonnegative(),
    schedule2_line13: z.number().nonnegative(),
    form1040_line27a_eic: z.number().nonnegative(),
    schedule3_line11_adoption_credit: z.number().nonnegative(),
  }).optional(),
  part_iib_2026: z.object({
    line21_w2_withheld_social_security_medicare: z.number().nonnegative(),
    schedule1_line15: z.number().nonnegative(),
    schedule2_line16c: z.number().nonnegative(),
    schedule2_line17c: z.number().nonnegative(),
    form1040_line27a_eic: z.number().nonnegative(),
    schedule3_line11_excess_ss_rrta: z.number().nonnegative(),
  }).strict().optional(),
  line18a_earned_income: z.number().optional(),
  earned_income_worksheet: earnedIncomeWorksheetSchema.optional(),
  // ── Auto-populated fields (used when f8812s is empty) ──────────────────────
  // Number of qualifying children for CTC (from general node)
  auto_qualifying_children: z.number().int().nonnegative().optional(),
  // Filing status (from general node)
  auto_filing_status: filingStatusSchema.optional(),
  // AGI (from agi_aggregator)
  auto_agi: z.number().optional(),
  // Income tax liability (from income_tax_calculation)
  auto_income_tax_liability: z.number().nonnegative().optional(),
  // Earned income from wages (from w2 node)
  auto_earned_income: z.number().nonnegative().optional(),
  // Net self-employment profit for ACTC earned income (from schedule_c node)
  auto_se_earned_income: z.number().nonnegative().optional(),
  auto_schedule2_line16c: z.number().nonnegative().optional(),
  auto_schedule2_line17c: z.number().nonnegative().optional(),
  // Number of other qualifying dependents for ODC (from general node)
  auto_other_dependents: z.number().int().nonnegative().optional(),
});

const PHASE_OUT_STEP = 50;
const PHASE_OUT_INCREMENT = 1000;
const ACTC_EARNED_INCOME_RATE = 0.15;

type F8812Item = z.infer<typeof itemSchema>;
export type F8812Input = z.infer<typeof inputSchema>;

export type CreditLimitWorksheet = NonNullable<
  F8812Input["credit_limit_worksheet"]
>;
export type CreditLimitWorksheet2026 = NonNullable<
  F8812Input["credit_limit_worksheet_2026"]
>;
export type PartIIBDetails = NonNullable<F8812Input["part_iib"]>;
export type PartIIBDetails2026 = NonNullable<F8812Input["part_iib_2026"]>;
export type EarnedIncomeWorksheet = z.infer<typeof earnedIncomeWorksheetSchema>;

export function calculateEarnedIncomeWorksheet(
  rawWorksheet: EarnedIncomeWorksheet,
) {
  const worksheet = earnedIncomeWorksheetSchema.parse(rawWorksheet);
  const line1a = worksheet.form1040_line1z_wages;
  const line1b = worksheet.nontaxable_combat_pay;
  const line2a = worksheet.schedule_c_statutory_employee_income;
  const line2b = worksheet.nonfarm_schedule_c_and_k1_net;
  const line2c = worksheet.farm_schedule_f_and_k1_net;
  const line2d = worksheet.farm_optional_method_used
    ? worksheet.schedule_se_line15
    : line2c;
  if (line2d === undefined) {
    throw new Error(
      "Schedule 8812 earned-income worksheet needs Schedule SE line 15 for the farm optional method",
    );
  }
  const line2e = line2c > 0 ? Math.min(line2c, line2d) : line2c;
  const line3 = line1a + line1b + line2a + line2b + line2e;
  const line4 = line3 > 0 ? worksheet.excluded_medicaid_waiver_payments : 0;
  const line5 = line3 > 0 ? worksheet.schedule1_line15_se_deduction : 0;
  const line6 = line4 + line5;
  const line7 = line3 > 0 ? line3 - line6 : 0;
  return {
    line1a,
    line1b,
    line2a,
    line2b,
    line2c,
    line2d,
    line2e,
    line3,
    line4,
    line5,
    line6,
    line7,
  };
}

export function calculatePartIIBLines(
  details: PartIIBDetails,
  line20: number,
) {
  const line21 = details.line21_w2_withheld_social_security_medicare;
  const line22 = details.schedule1_line15 + details.schedule2_line5 +
    details.schedule2_line6 + details.schedule2_line13;
  const line23 = line21 + line22;
  const line24 = details.form1040_line27a_eic +
    details.schedule3_line11_adoption_credit;
  const line25 = Math.max(0, line23 - line24);
  const line26 = Math.max(line20, line25);
  return { line21, line22, line23, line24, line25, line26 };
}

export function calculatePartIIBLines2026(
  details: PartIIBDetails2026,
  line20: number,
) {
  const line21 = details.line21_w2_withheld_social_security_medicare;
  const line22 = details.schedule1_line15 + details.schedule2_line16c +
    details.schedule2_line17c;
  const line23 = line21 + line22;
  const line24 = details.form1040_line27a_eic +
    details.schedule3_line11_excess_ss_rrta;
  const line25 = Math.max(0, line23 - line24);
  const line26 = Math.max(line20, line25);
  return { line21, line22, line23, line24, line25, line26 };
}

export function calculateCreditLimitWorksheetALine5(
  form1040Line18Tax: number,
  worksheet: CreditLimitWorksheet,
): number {
  const line2 = worksheet.schedule3_line1 + worksheet.schedule3_line2 +
    worksheet.schedule3_line3 + worksheet.schedule3_line4 +
    worksheet.schedule3_line5b + worksheet.schedule3_line6d +
    worksheet.schedule3_line6f + worksheet.schedule3_line6l +
    worksheet.schedule3_line6m;
  let line4 = 0;
  if (worksheet.worksheet_b_applies) {
    if (worksheet.worksheet_b_line15 === undefined) {
      throw new Error(
        "Schedule 8812 Worksheet B needs its line 15 credit total",
      );
    }
    line4 = worksheet.worksheet_b_line15;
  }
  return Math.max(0, form1040Line18Tax - line2 - line4);
}

export function calculateCreditLimitWorksheetALine5_2026(
  form1040Line18Tax: number,
  rawWorksheet: CreditLimitWorksheet2026,
): number {
  const worksheet = creditLimitWorksheet2026Schema.parse(rawWorksheet);
  const line2 = worksheet.schedule3_line1 + worksheet.schedule3_line2 +
    worksheet.schedule3_line3 + worksheet.schedule3_line4 +
    worksheet.schedule3_line6d + worksheet.schedule3_line6f +
    worksheet.schedule3_line6l + worksheet.schedule3_line6m;
  const line4 = worksheet.worksheet_b_applies
    ? worksheet.schedule3_line5a! + worksheet.schedule3_line6c! +
      worksheet.schedule3_line6g! + worksheet.schedule3_line6h!
    : 0;
  return Math.max(0, form1040Line18Tax - line2 - line4);
}

function returnValue<K extends keyof F8812Item>(
  items: F8812Item[],
  key: K,
): F8812Item[K] {
  const values = items.map((item) => item[key]).filter((value) =>
    value !== undefined
  );
  if (values.some((value) => value !== values[0])) {
    throw new Error(
      `Schedule 8812 has conflicting return-level ${String(key)}`,
    );
  }
  return values[0];
}

// Build a synthetic f8812 item from auto-populated fields (engine-computed inputs).
function buildAutoItem(input: F8812Input): F8812Item | null {
  const children = input.auto_qualifying_children ?? 0;
  const otherDeps = input.auto_other_dependents ?? 0;
  if (children === 0 && otherDeps === 0) return null;
  return {
    qualifying_children_count: children || undefined,
    other_dependents_count: otherDeps || undefined,
    filing_status: input.auto_filing_status,
    agi: input.auto_agi,
    income_tax_liability: input.auto_income_tax_liability,
    earned_income:
      (input.auto_earned_income ?? 0) + (input.auto_se_earned_income ?? 0) ||
      undefined,
  };
}

// Line 9: phase-out threshold based on filing status
function phaseOutThreshold(
  filingStatus: string,
  mfj: number,
  other: number,
): number {
  return filingStatus === "mfj" ? mfj : other;
}

// Lines 10-11: phase-out reduction uses ceiling rounding per IRS instructions
// "round UP to next $1,000" — ceiling, not standard rounding
function computePhaseOutReduction(
  modifiedAgi: number,
  filingStatus: string,
  thresholdMfj: number,
  thresholdOther: number,
): number {
  const excess = Math.max(
    0,
    modifiedAgi - phaseOutThreshold(filingStatus, thresholdMfj, thresholdOther),
  );
  if (excess === 0) return 0;
  const steps = Math.ceil(excess / PHASE_OUT_INCREMENT);
  return steps * PHASE_OUT_STEP;
}

// Lines 19-20: ACTC via 15% earned income method (Part II-A)
function computeActcEarnedIncomeBased(
  effectiveEarnedIncome: number,
  floor: number,
): number {
  const excess = Math.max(0, effectiveEarnedIncome - floor);
  return excess * ACTC_EARNED_INCOME_RATE;
}

export interface ProvisionalSchedule8812Input {
  readonly filingStatus: z.infer<typeof filingStatusSchema>;
  readonly agi: number;
  readonly puertoRicoExcludedIncome: number;
  readonly form2555Amounts: number;
  readonly form4563Amount: number;
  readonly qualifyingChildrenCount: number;
  readonly otherDependentsCount: number;
}

/** Lines 1–12, which precede the credit-limit worksheets for both years. */
export function calculateProvisionalSchedule8812Lines(
  taxYear: number,
  input: ProvisionalSchedule8812Input,
) {
  const cfg = CONFIG_BY_YEAR[taxYear];
  if (!cfg) throw new Error(`No f1040 config for year ${taxYear}`);
  if (
    !Number.isFinite(input.agi) ||
    !Number.isInteger(input.qualifyingChildrenCount) ||
    input.qualifyingChildrenCount < 0 ||
    !Number.isInteger(input.otherDependentsCount) ||
    input.otherDependentsCount < 0 ||
    [
      input.puertoRicoExcludedIncome,
      input.form2555Amounts,
      input.form4563Amount,
    ]
      .some((value) => !Number.isFinite(value) || value < 0)
  ) {
    throw new Error("Schedule 8812 provisional lines need valid return facts");
  }
  const line1 = input.agi;
  const line2a = input.puertoRicoExcludedIncome;
  const line2b = input.form2555Amounts;
  const line2c = input.form4563Amount;
  const line2d = line2a + line2b + line2c;
  const line3 = line1 + line2d;
  const line4 = input.qualifyingChildrenCount;
  const line5 = line4 * cfg.ctcPerChild;
  const line6 = input.otherDependentsCount;
  const line7 = line6 * cfg.odcPerDependent;
  const line8 = line5 + line7;
  const line9 = phaseOutThreshold(
    input.filingStatus,
    cfg.ctcPhaseOutThresholdMfj,
    cfg.ctcPhaseOutThresholdOther,
  );
  const line11 = computePhaseOutReduction(
    line3,
    input.filingStatus,
    cfg.ctcPhaseOutThresholdMfj,
    cfg.ctcPhaseOutThresholdOther,
  );
  const line10 = line11 / 0.05;
  const line12 = Math.max(0, line8 - line11);
  return {
    line1,
    line2a,
    line2b,
    line2c,
    line2d,
    line3,
    line4,
    line5,
    line6,
    line7,
    line8,
    line9,
    line10,
    line11,
    line12,
  };
}

export function calculateSchedule8812Lines(
  taxYear: number,
  rawInput: F8812Input,
) {
  const cfg = CONFIG_BY_YEAR[taxYear];
  if (!cfg) throw new Error(`No f1040 config for year ${taxYear}`);
  const input = inputSchema.parse(rawInput);
  if (taxYear === 2026 && input.part_iib !== undefined) {
    throw new Error("TY2026 Schedule 8812 needs part_iib_2026 line sources");
  }
  if (taxYear === 2026 && input.credit_limit_worksheet !== undefined) {
    throw new Error(
      "TY2026 Schedule 8812 needs credit_limit_worksheet_2026",
    );
  }
  if (
    taxYear !== 2026 &&
    input.credit_limit_worksheet_2026 !== undefined
  ) {
    throw new Error(
      "Schedule 8812 credit_limit_worksheet_2026 requires TY2026",
    );
  }
  if (taxYear !== 2026 && input.part_iib_2026 !== undefined) {
    throw new Error("Schedule 8812 part_iib_2026 requires TY2026");
  }
  if (
    taxYear !== 2026 &&
    (input.auto_schedule2_line16c !== undefined ||
      input.auto_schedule2_line17c !== undefined)
  ) {
    throw new Error("Schedule 2 lines 16c/17c require TY2026");
  }
  if (taxYear === 2026 && input.part_iib_2026) {
    if (
      input.auto_schedule2_line16c !== undefined &&
      input.auto_schedule2_line16c !== input.part_iib_2026.schedule2_line16c
    ) {
      throw new Error(
        "Schedule 8812 line 22 disagrees with Schedule 2 line 16c",
      );
    }
    if (
      input.auto_schedule2_line17c !== undefined &&
      input.auto_schedule2_line17c !== input.part_iib_2026.schedule2_line17c
    ) {
      throw new Error(
        "Schedule 8812 line 22 disagrees with Schedule 2 line 17c",
      );
    }
  }
  const explicitItems = input.f8812s ?? [];
  if (explicitItems.length > 0) {
    const explicitChildren = explicitItems.reduce(
      (sum, item) => sum + (item.qualifying_children_count ?? 0),
      0,
    );
    const explicitOtherDependents = explicitItems.reduce(
      (sum, item) => sum + (item.other_dependents_count ?? 0),
      0,
    );
    if (
      (input.auto_qualifying_children !== undefined &&
        input.auto_qualifying_children !== explicitChildren) ||
      (input.auto_other_dependents !== undefined &&
        input.auto_other_dependents !== explicitOtherDependents)
    ) {
      throw new Error(
        "Schedule 8812 credit counts must match the Form 1040 dependent rows",
      );
    }
  }
  const autoItem = explicitItems.length ? null : buildAutoItem(input);
  const items = explicitItems.length
    ? explicitItems
    : autoItem
    ? [autoItem]
    : [];
  if (items.length === 0) return null;

  const qualifyingChildrenCount = items.reduce(
    (sum, item) => sum + (item.qualifying_children_count ?? 0),
    0,
  );
  const otherDependentsCount = items.reduce(
    (sum, item) => sum + (item.other_dependents_count ?? 0),
    0,
  );
  if (qualifyingChildrenCount + otherDependentsCount === 0) return null;
  const filingStatus = returnValue(items, "filing_status");
  const agi = returnValue(items, "agi");
  const tax = returnValue(items, "income_tax_liability");
  if (filingStatus === undefined || agi === undefined) {
    throw new Error("Schedule 8812 needs filing status and Form 1040 AGI");
  }
  const {
    line1,
    line2a,
    line2b,
    line2c,
    line2d,
    line3,
    line4,
    line5,
    line6,
    line7,
    line8,
    line9,
    line10,
    line11,
    line12,
  } = calculateProvisionalSchedule8812Lines(taxYear, {
    filingStatus,
    agi,
    puertoRicoExcludedIncome:
      returnValue(items, "puerto_rico_excluded_income") ?? 0,
    form2555Amounts: returnValue(items, "form_2555_amounts") ?? 0,
    form4563Amount: returnValue(items, "form_4563_amount") ?? 0,
    qualifyingChildrenCount,
    otherDependentsCount,
  });
  if (line12 === 0) return null;

  const hasFEIE = items.some((item) =>
    item.has_form_2555 === true || (item.form_2555_amounts ?? 0) > 0
  );
  const doNotClaimActc = items.some((item) => item.do_not_claim_actc === true);
  const isPrResident = items.some((item) =>
    item.bona_fide_pr_resident === true
  );
  const itemCreditWorksheets = items.flatMap((item) =>
    item.credit_limit_worksheet ? [item.credit_limit_worksheet] : []
  );
  if (itemCreditWorksheets.length > 1) {
    throw new Error(
      "Schedule 8812 credit-limit worksheet must be supplied only once",
    );
  }
  if (input.credit_limit_worksheet && itemCreditWorksheets.length > 0) {
    throw new Error(
      "Schedule 8812 credit-limit worksheet cannot be supplied both on an item and at the root",
    );
  }
  if (taxYear === 2026 && itemCreditWorksheets.length > 0) {
    throw new Error(
      "TY2026 Schedule 8812 needs credit_limit_worksheet_2026",
    );
  }
  const creditWorksheet = taxYear === 2026
    ? input.credit_limit_worksheet_2026
    : input.credit_limit_worksheet ?? itemCreditWorksheets[0];
  if (!creditWorksheet) {
    throw new Error(
      "Schedule 8812 needs complete Credit Limit Worksheet A and B answers",
    );
  }
  if (
    creditWorksheet.worksheet_b_applies &&
    (line4 === 0 || hasFEIE)
  ) {
    throw new Error(
      "Schedule 8812 Worksheet B requires a qualifying child and no Form 2555",
    );
  }
  if (tax === undefined) {
    throw new Error(
      "Schedule 8812 needs Form 1040 line 18 tax before calculating line 14",
    );
  }
  const line13 = taxYear === 2026
    ? calculateCreditLimitWorksheetALine5_2026(
      tax,
      creditWorksheet as CreditLimitWorksheet2026,
    )
    : calculateCreditLimitWorksheetALine5(
      tax,
      creditWorksheet as CreditLimitWorksheet,
    );
  const line14 = Math.min(line12, line13);

  const canClaimActc = line4 > 0 && !doNotClaimActc && !hasFEIE;
  const line16a = canClaimActc ? Math.max(0, line12 - line14) : 0;
  const line16b = canClaimActc ? line4 * cfg.actcMaxPerChild : 0;
  const line17 = Math.min(line16a, line16b);
  const itemWorksheets = items.flatMap((item) =>
    item.earned_income_worksheet ? [item.earned_income_worksheet] : []
  );
  if (itemWorksheets.length > 1) {
    throw new Error(
      "Schedule 8812 earned-income worksheet must be supplied only once",
    );
  }
  if (input.earned_income_worksheet && itemWorksheets.length > 0) {
    throw new Error(
      "Schedule 8812 earned-income worksheet cannot be supplied both on an item and at the root",
    );
  }
  const worksheetInput = input.earned_income_worksheet ?? itemWorksheets[0];
  const worksheet = worksheetInput
    ? calculateEarnedIncomeWorksheet(worksheetInput)
    : null;
  const itemCombatPay = returnValue(items, "nontaxable_combat_pay");
  if (
    worksheet && itemCombatPay !== undefined &&
    worksheet.line1b !== itemCombatPay
  ) {
    throw new Error("Schedule 8812 has conflicting nontaxable combat pay");
  }
  const line18b = itemCombatPay ?? worksheet?.line1b ?? 0;
  const itemLine18a = returnValue(items, "line18a_earned_income");
  if (
    itemLine18a !== undefined &&
    input.line18a_earned_income !== undefined &&
    itemLine18a !== input.line18a_earned_income
  ) {
    throw new Error("Schedule 8812 has conflicting line 18a earned income");
  }
  const explicitLine18a = input.line18a_earned_income ?? itemLine18a;
  if (
    worksheet && explicitLine18a !== undefined &&
    worksheet.line7 !== explicitLine18a
  ) {
    throw new Error(
      "Schedule 8812 earned-income worksheet conflicts with line 18a",
    );
  }
  const line18a = explicitLine18a ?? worksheet?.line7;
  if (line17 > 0 && line18a === undefined) {
    throw new Error(
      "Schedule 8812 refundable credit needs verified line 18a earned income from the IRS Earned Income Chart or Worksheet",
    );
  }
  const line19 = Math.max(0, (line18a ?? 0) - cfg.actcEarnedIncomeFloor);
  const line20 = computeActcEarnedIncomeBased(
    line18a ?? 0,
    cfg.actcEarnedIncomeFloor,
  );
  const needsPartIIB = line17 > 0 &&
    (isPrResident || (line4 >= 3 && line20 < line17));
  let partIIBLines = null;
  if (needsPartIIB) {
    const partIIB = taxYear === 2026 ? input.part_iib_2026 : input.part_iib;
    if (!partIIB) {
      throw new Error(
        "Schedule 8812 Part II-B needs its W-2, Schedule 1, Schedule 2, EIC, and adoption-credit line sources",
      );
    }
    partIIBLines = taxYear === 2026
      ? calculatePartIIBLines2026(partIIB as PartIIBDetails2026, line20)
      : calculatePartIIBLines(partIIB as PartIIBDetails, line20);
  }
  const line27 = Math.min(
    line17,
    partIIBLines ? partIIBLines.line26 : line20,
  );
  return {
    line1,
    line2a,
    line2b,
    line2c,
    line2d,
    line3,
    line4,
    line5,
    line6,
    line7,
    line8,
    line9,
    line10,
    line11,
    line12,
    line13,
    line14,
    line16a,
    line16b,
    line17,
    line18a: line18a ?? 0,
    line18b,
    line19,
    line20,
    partIIBLines,
    needsPartIIB,
    line27,
    worksheetBApplies: creditWorksheet.worksheet_b_applies,
    worksheetBLine14: creditWorksheet.worksheet_b_line14,
  };
}

class F8812Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8812";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040]);

  compute(ctx: NodeContext, input: F8812Input): NodeResult {
    const lines = calculateSchedule8812Lines(ctx.taxYear, input);
    if (!lines) return { outputs: [] };
    const fields: Partial<z.infer<typeof f1040.inputSchema>> = {
      ...(lines.line14 > 0 ? { line19_child_tax_credit: lines.line14 } : {}),
      ...(lines.line27 > 0 ? { line28_actc: lines.line27 } : {}),
      ...(lines.worksheetBApplies
        ? {
          form8859_worksheet_b_applies: true,
          ...(lines.worksheetBLine14 !== undefined
            ? { form8859_worksheet_b_line14: lines.worksheetBLine14 }
            : {}),
        }
        : {}),
    };
    const outputs: NodeOutput[] = Object.keys(fields).length > 0
      ? [this.outputNodes.output(
        f1040,
        fields as AtLeastOne<z.infer<typeof f1040["inputSchema"]>>,
      )]
      : [];
    return { outputs };
  }
}

export const f8812 = new F8812Node();
