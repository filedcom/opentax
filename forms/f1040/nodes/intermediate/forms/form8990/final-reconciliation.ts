import type { ExecuteResult } from "../../../../../../core/runtime/executor.ts";
import {
  assertCalculatedLimitForBusiness,
  type CalculatedBoundedForm8990Limit,
} from "./limit.ts";
import {
  assertBoundedProvisionalATI,
  type BoundedProvisionalATI,
} from "./provisional-ati.ts";
import {
  type FinalizedScheduleCInterestPass,
  sameStagedScheduleCSource,
} from "./two-stage.ts";

const finalBrand = Symbol("Form8990FinalizedBoundedReturn");

export interface FinalizedBoundedForm8990Return {
  readonly [finalBrand]: true;
  readonly businessReference: string;
  readonly originalInterestExpense: number;
  readonly allowedInterestExpense: number;
  readonly disallowedInterestExpense: number;
  readonly scheduleCProfit: number;
  readonly selfEmploymentTax: number;
  readonly selfEmploymentTaxDeduction: number;
  readonly qbiDeduction: number;
  readonly adjustedGrossIncome: number;
  readonly taxableIncome: number;
  readonly totalTax: number;
}

export function assertFinalizedBoundedForm8990Return(
  reconciled: FinalizedBoundedForm8990Return,
): void {
  if (reconciled[finalBrand] !== true) {
    throw new Error("Form 8990 needs a reconciled finalized return");
  }
}

function numberAt(result: ExecuteResult, node: string, key: string): number {
  const value = result.pending[node]?.[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Form 8990 finalized return lacks ${node}.${key}`);
  }
  return value;
}

function equal(actual: number, expected: number, label: string): void {
  if (Math.abs(actual - expected) > 0.000001) {
    throw new Error(`Form 8990 finalized ${label} is not source-reconciled`);
  }
}

/**
 * Only the positive-income, one-Schedule-C, no-other-source second pass is
 * supported here. The branded result is an internal workpaper, not filing
 * authorization or a persisted section 163(j) carryforward.
 */
export function reconcileBoundedForm8990FinalReturn(args: {
  readonly source: FinalizedScheduleCInterestPass;
  readonly provisionalAti: BoundedProvisionalATI;
  readonly limit: CalculatedBoundedForm8990Limit;
  readonly result: ExecuteResult;
}): FinalizedBoundedForm8990Return {
  const { source, provisionalAti, limit, result } = args;
  if (result.diagnostics.length > 0) {
    throw new Error("Form 8990 finalized return has node diagnostics");
  }
  assertBoundedProvisionalATI(provisionalAti);
  assertCalculatedLimitForBusiness(
    limit,
    source.businessReference,
    source.originalInterestExpense,
  );
  if (provisionalAti.businessReference !== source.businessReference) {
    throw new Error("Form 8990 final business differs from provisional ATI");
  }
  equal(source.allowedInterestExpense, limit.line30, "interest allowance");
  equal(source.disallowedInterestExpense, limit.line31, "disallowed interest");
  if (!sameStagedScheduleCSource(result.pending.schedule_c, source.source)) {
    throw new Error("Form 8990 finalized Schedule C source differs");
  }

  const profit = source.finalizedAtRiskNet;
  equal(
    numberAt(result, "agi_aggregator", "line3_schedule_c"),
    profit,
    "AGI Schedule C profit",
  );
  equal(
    numberAt(result, "schedule1", "line3_schedule_c"),
    profit,
    "Schedule 1 profit",
  );
  equal(
    numberAt(result, "schedule1", "line10_total_additional_income"),
    profit,
    "Schedule 1 additional income",
  );
  equal(
    numberAt(result, "schedule_se", "net_profit_schedule_c"),
    profit,
    "Schedule SE profit",
  );
  equal(
    numberAt(result, "form8995", "qbi_from_schedule_c"),
    profit,
    "QBI business profit",
  );

  const schedule2 = result.pending.schedule2 ?? {};
  for (const [key, value] of Object.entries(schedule2)) {
    if (key !== "line4_se_tax" && typeof value === "number" && value !== 0) {
      throw new Error(`Form 8990 finalized Schedule 2 has unsupported ${key}`);
    }
  }
  const seTax = numberAt(result, "schedule2", "line4_se_tax");
  const seDeduction = seTax / 2;
  equal(
    numberAt(result, "schedule1", "line15_se_deduction"),
    seDeduction,
    "Schedule 1 half-SE deduction",
  );
  equal(
    numberAt(result, "schedule1", "line26_total_adjustments"),
    seDeduction,
    "Schedule 1 adjustments",
  );
  equal(
    numberAt(result, "agi_aggregator", "line15_se_deduction"),
    seDeduction,
    "AGI half-SE deduction",
  );
  equal(
    numberAt(result, "form8995", "se_tax_deduction"),
    seDeduction,
    "QBI half-SE deduction",
  );

  const qbi = numberAt(result, "form8995", "qbi_deduction");
  const agi = profit - seDeduction;
  const standardDeduction = provisionalAti.line7NonbusinessDeduction;
  const taxable = agi - standardDeduction - qbi;
  if (taxable <= 0) {
    throw new Error(
      "Form 8990 finalized taxable income is outside the bounded positive route",
    );
  }
  equal(
    numberAt(result, "f1040", "line8_additional_income"),
    profit,
    "Form 1040 additional income",
  );
  equal(
    numberAt(result, "f1040", "line9_total_income"),
    profit,
    "Form 1040 total income",
  );
  equal(
    numberAt(result, "f1040", "line10_adjustments"),
    seDeduction,
    "Form 1040 adjustments",
  );
  equal(numberAt(result, "f1040", "line11_agi"), agi, "Form 1040 AGI");
  equal(
    numberAt(result, "f1040", "line12a_standard_deduction"),
    standardDeduction,
    "Form 1040 standard deduction",
  );
  equal(
    numberAt(result, "f1040", "line12c_deduction_total"),
    standardDeduction,
    "Form 1040 deduction total",
  );
  equal(
    numberAt(result, "f1040", "line13_qbi_deduction"),
    qbi,
    "Form 1040 QBI deduction",
  );
  equal(
    numberAt(result, "f1040", "line14_deductions_qbi_total"),
    standardDeduction + qbi,
    "Form 1040 total deductions",
  );
  equal(
    numberAt(result, "income_tax_calculation", "form6251_line1b"),
    taxable,
    "signed taxable income",
  );
  equal(
    numberAt(result, "income_tax_calculation", "taxable_income"),
    taxable,
    "income-tax worksheet income",
  );
  equal(
    numberAt(result, "f1040", "line15_taxable_income"),
    taxable,
    "Form 1040 taxable income",
  );

  const incomeTax = numberAt(result, "f1040", "line16_income_tax");
  equal(
    numberAt(result, "f1040", "line18_total_tax_before_credits"),
    incomeTax,
    "Form 1040 tax before credits",
  );
  equal(
    numberAt(result, "f1040", "line21_credits_total"),
    0,
    "Form 1040 credits",
  );
  equal(
    numberAt(result, "f1040", "line22_tax_after_credits"),
    incomeTax,
    "Form 1040 tax after credits",
  );
  equal(
    numberAt(result, "f1040", "line23_other_taxes"),
    seTax,
    "Form 1040 other taxes",
  );
  equal(
    numberAt(result, "f1040", "line24_total_tax"),
    incomeTax + seTax,
    "Form 1040 total tax",
  );
  equal(
    numberAt(result, "f1040", "line33_total_payments"),
    0,
    "Form 1040 payments",
  );
  if (Object.values(result.carryforwards).some((value) => value !== 0)) {
    throw new Error(
      "Form 8990 finalized return has an unsupported other carryforward",
    );
  }
  return {
    [finalBrand]: true,
    businessReference: source.businessReference,
    originalInterestExpense: source.originalInterestExpense,
    allowedInterestExpense: source.allowedInterestExpense,
    disallowedInterestExpense: source.disallowedInterestExpense,
    scheduleCProfit: profit,
    selfEmploymentTax: seTax,
    selfEmploymentTaxDeduction: seDeduction,
    qbiDeduction: qbi,
    adjustedGrossIncome: agi,
    taxableIncome: taxable,
    totalTax: incomeTax + seTax,
  };
}
