import { z } from "zod";
import type { ExecuteResult } from "../../../../../../core/runtime/executor.ts";
import { FilingStatus } from "../../../types.ts";
import {
  type ProvisionalScheduleCInterestPass,
  sameStagedScheduleCSource,
  stageProvisionalScheduleCInterest,
} from "./two-stage.ts";

export const receiptSchema = z.object({
  source_reference: z.string().trim().min(1),
  kind: z.enum(["sale", "business_interest"]),
  amount: z.number().int().finite().positive(),
}).strict();

export type BusinessReceipt = z.infer<typeof receiptSchema>;

const provisionalAtiBrand = Symbol("Form8990BoundedProvisionalATI");

export interface BoundedProvisionalATI {
  readonly [provisionalAtiBrand]: true;
  readonly businessReference: string;
  readonly line1BusinessInterestExpense: number;
  readonly line6SignedTentativeTaxableIncome: number;
  readonly line7NonbusinessDeduction: number;
  readonly line8BusinessInterestExpense: number;
  readonly line10QbiDeduction: number;
  readonly line11DepreciationDepletion: number;
  readonly line16TotalAdditions: number;
  readonly line18BusinessInterestIncome: number;
  readonly line21TotalReductions: number;
  readonly line22AdjustedTaxableIncome: number;
  readonly line23CurrentYearBusinessInterestIncome: number;
}

export function assertBoundedProvisionalATI(
  ati: BoundedProvisionalATI,
): void {
  if (ati[provisionalAtiBrand] !== true) {
    throw new Error(
      "Form 8990 limitation needs source-reconciled provisional ATI",
    );
  }
}

function numberAt(
  pending: ExecuteResult["pending"],
  node: string,
  key: string,
): number {
  const value = pending[node]?.[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Form 8990 provisional return lacks ${node}.${key}`);
  }
  return value;
}

function requireEqual(actual: number, expected: number, label: string): void {
  if (Math.abs(actual - expected) > 0.000001) {
    throw new Error(`Form 8990 provisional ${label} is not source-reconciled`);
  }
}

/**
 * ATI from a real provisional return, for the narrow positive-income,
 * one-Schedule-C case. The caller must pass executor output from the
 * all-interest-otherwise-allowed phase; ordinary execution still rejects it.
 */
export function calculateBoundedProvisionalATI(args: {
  provisional: ProvisionalScheduleCInterestPass;
  returnInputs: Readonly<Record<string, unknown>>;
  result: ExecuteResult;
  receipts: readonly BusinessReceipt[];
}): BoundedProvisionalATI {
  const { provisional, returnInputs, result } = args;
  if (result.diagnostics.length > 0) {
    throw new Error(
      `Form 8990 provisional return has node diagnostics: ${
        result.diagnostics.map((diagnostic) =>
          `${diagnostic.nodeType}: ${diagnostic.message}`
        ).join("; ")
      }`,
    );
  }
  const inputKeys = Object.keys(returnInputs);
  if (
    inputKeys.length !== 2 || !inputKeys.includes("general") ||
    !inputKeys.includes("schedule_c")
  ) {
    throw new Error(
      "Form 8990 provisional ATI needs only general and Schedule C inputs",
    );
  }
  const generalSchema = z.object({
    filing_status: z.literal(FilingStatus.Single),
    taxpayer_first_name: z.string().optional(),
    taxpayer_last_name: z.string().optional(),
    taxpayer_ssn: z.string().optional(),
    taxpayer_dob: z.string().optional(),
  }).strict();
  const general = generalSchema.parse(returnInputs.general);
  const executedStart = result.pending.start;
  if (
    executedStart === null || typeof executedStart !== "object" ||
    Object.keys(executedStart).length !== 2 ||
    !Object.keys(executedStart).includes("general") ||
    !Object.keys(executedStart).includes("schedule_c")
  ) {
    throw new Error(
      "Form 8990 provisional executor inputs differ from source inputs",
    );
  }
  const executedGeneral = generalSchema.parse(executedStart.general);
  if (
    general.filing_status !== executedGeneral.filing_status ||
    general.taxpayer_first_name !== executedGeneral.taxpayer_first_name ||
    general.taxpayer_last_name !== executedGeneral.taxpayer_last_name ||
    general.taxpayer_ssn !== executedGeneral.taxpayer_ssn ||
    general.taxpayer_dob !== executedGeneral.taxpayer_dob ||
    !sameStagedScheduleCSource(
      { schedule_cs: executedStart.schedule_c },
      stageProvisionalScheduleCInterest({
        schedule_cs: returnInputs.schedule_c,
      }).source,
    )
  ) {
    throw new Error(
      "Form 8990 provisional executor inputs differ from source inputs",
    );
  }
  if (general.taxpayer_dob !== undefined) {
    throw new Error(
      "Form 8990 provisional ATI has unresolved age-based deductions",
    );
  }
  const inputSource = stageProvisionalScheduleCInterest(
    { schedule_cs: returnInputs.schedule_c },
  );
  if (!sameStagedScheduleCSource(inputSource.source, provisional.source)) {
    throw new Error(
      "Form 8990 provisional Schedule C source changed between passes",
    );
  }
  const executedSource = stageProvisionalScheduleCInterest(
    result.pending.schedule_c,
  );
  if (!sameStagedScheduleCSource(executedSource.source, provisional.source)) {
    throw new Error(
      "Form 8990 provisional Schedule C execution source differs",
    );
  }
  const business = provisional.source.schedule_cs[0];
  const allowedBusinessKeys = new Set([
    "business_reference",
    "line_a_principal_business",
    "line_b_business_code",
    "line_f_accounting_method",
    "line_g_material_participation",
    "line_1_gross_receipts",
    "line_12_depletion",
    "amt_depletion_worksheet",
    "line_13_depreciation",
    "line_16b_interest_other",
  ]);
  if (
    Object.keys(business).some((key) => !allowedBusinessKeys.has(key)) ||
    business.line_g_material_participation !== true ||
    provisional.source.wotc_wage_reductions !== undefined ||
    provisional.source.filing_status !== undefined
  ) {
    throw new Error(
      "Form 8990 provisional ATI has unmodeled Schedule C components",
    );
  }
  const receipts = z.array(receiptSchema).min(1).parse(args.receipts);
  const refs = new Set(receipts.map((entry) => entry.source_reference));
  if (refs.size !== receipts.length) {
    throw new Error("Form 8990 business receipt references are duplicated");
  }
  const grossReceipts = receipts.reduce((sum, entry) => sum + entry.amount, 0);
  requireEqual(
    grossReceipts,
    business.line_1_gross_receipts,
    "gross receipts ledger",
  );
  const businessInterestIncome = receipts.filter((entry) =>
    entry.kind === "business_interest"
  ).reduce((sum, entry) => sum + entry.amount, 0);
  const profit =
    provisional.interest.tentativeScheduleCAtRiskNetWithFullInterest;
  if (profit <= 0) {
    throw new Error(
      "Form 8990 provisional ATI needs positive Schedule C profit",
    );
  }
  requireEqual(
    numberAt(result.pending, "agi_aggregator", "line3_schedule_c"),
    profit,
    "Schedule C profit",
  );
  requireEqual(
    numberAt(result.pending, "schedule1", "line3_schedule_c"),
    profit,
    "Schedule 1 business profit",
  );
  requireEqual(
    numberAt(result.pending, "schedule_se", "net_profit_schedule_c"),
    profit,
    "Schedule SE profit",
  );
  const seDeduction = numberAt(
    result.pending,
    "agi_aggregator",
    "line15_se_deduction",
  );
  requireEqual(
    numberAt(result.pending, "schedule1", "line15_se_deduction"),
    seDeduction,
    "Schedule 1 SE deduction",
  );
  const agi = numberAt(result.pending, "f1040", "line11_agi");
  requireEqual(agi, profit - seDeduction, "AGI");
  requireEqual(
    numberAt(result.pending, "f1040", "line9_total_income"),
    profit,
    "total income",
  );
  requireEqual(
    numberAt(result.pending, "f1040", "line10_adjustments"),
    seDeduction,
    "total adjustments",
  );
  const standardDeduction = numberAt(
    result.pending,
    "f1040",
    "line12a_standard_deduction",
  );
  const qbi = numberAt(result.pending, "f1040", "line13_qbi_deduction");
  requireEqual(
    qbi,
    numberAt(result.pending, "form8995", "qbi_deduction"),
    "QBI deduction",
  );
  if (
    result.pending.f1040?.line12e_itemized_deductions !== undefined ||
    result.pending.f1040?.line13b_additional_deductions !== undefined ||
    result.pending.standard_deduction?.nol_deduction !== undefined
  ) {
    throw new Error(
      "Form 8990 provisional ATI has unmodeled return deductions",
    );
  }
  const signedLine6 = agi - standardDeduction - qbi;
  requireEqual(
    signedLine6,
    numberAt(result.pending, "income_tax_calculation", "form6251_line1b"),
    "signed tentative taxable income",
  );
  if (signedLine6 <= 0) {
    throw new Error(
      "Form 8990 provisional ATI needs positive signed taxable income",
    );
  }
  requireEqual(
    numberAt(result.pending, "f1040", "line15_taxable_income"),
    signedLine6,
    "Form 1040 taxable income",
  );
  const line11 = (business.line_12_depletion ?? 0) +
    (business.line_13_depreciation ?? 0);
  const line8 = provisional.interest.currentYearBusinessInterestExpense;
  const line16 = standardDeduction + line8 + qbi + line11;
  const line22 = Math.max(0, signedLine6 + line16 - businessInterestIncome);
  return {
    [provisionalAtiBrand]: true,
    businessReference: provisional.interest.businessReference,
    line1BusinessInterestExpense: line8,
    line6SignedTentativeTaxableIncome: signedLine6,
    line7NonbusinessDeduction: standardDeduction,
    line8BusinessInterestExpense: line8,
    line10QbiDeduction: qbi,
    line11DepreciationDepletion: line11,
    line16TotalAdditions: line16,
    line18BusinessInterestIncome: businessInterestIncome,
    line21TotalReductions: businessInterestIncome,
    line22AdjustedTaxableIncome: line22,
    line23CurrentYearBusinessInterestIncome: businessInterestIncome,
  };
}
