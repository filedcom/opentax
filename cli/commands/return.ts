import { join } from "@std/path";
import { execute } from "../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../core/runtime/planner.ts";
import { catalog } from "../../catalog.ts";
import { buildEngineInputs, createReturn, loadReturn } from "../store/store.ts";

function getCatalogEntry(formType: string, year: number) {
  const key = `${formType}:${year}`;
  const def = catalog[key];
  if (!def) throw new Error(`Unsupported form: ${key}`);
  return def;
}

export type CreateReturnArgs = {
  readonly year: number;
  readonly formType?: string;
  readonly baseDir: string;
};

export async function createReturnCommand(
  args: CreateReturnArgs,
): Promise<{ returnId: string }> {
  const { returnId } = await createReturn(args.year, args.baseDir, args.formType);
  return { returnId };
}

export type GetReturnArgs = {
  readonly returnId: string;
  readonly baseDir: string;
};

export type ReturnSummary = {
  readonly line1z_total_wages: number;
  readonly line9_total_income: number;
  readonly line11_agi: number;
  readonly line15_taxable_income: number;
  readonly line24_total_tax: number;
  readonly line33_total_payments: number;
  readonly line35a_refund?: number;
  readonly line37_amount_owed?: number;
};

export type GetReturnResult = {
  readonly returnId: string;
  readonly year: number;
  readonly summary: ReturnSummary;
  readonly forms: readonly string[];
  readonly lines: Record<string, unknown>;
  readonly warnings: readonly string[];
};

function num(value: unknown): number {
  if (Array.isArray(value)) return typeof value[0] === "number" ? value[0] : 0;
  return typeof value === "number" ? value : 0;
}

function extractSummary(f1040: Record<string, unknown>): ReturnSummary {
  const summary: ReturnSummary = {
    line1z_total_wages: num(f1040["line1z_total_wages"]),
    line9_total_income: num(f1040["line9_total_income"]),
    line11_agi: num(f1040["line11_agi"]),
    line15_taxable_income: num(f1040["line15_taxable_income"]),
    line24_total_tax: num(f1040["line24_total_tax"]),
    line33_total_payments: num(f1040["line33_total_payments"]),
  };
  const refund = num(f1040["line35a_refund"]);
  const owed = num(f1040["line37_amount_owed"]);
  if (refund > 0) return { ...summary, line35a_refund: refund };
  if (owed > 0) return { ...summary, line37_amount_owed: owed };
  return summary;
}

function collectForms(pending: Readonly<Record<string, Record<string, unknown>>>): string[] {
  return Object.keys(pending)
    .filter((k) => k !== "start" && Object.keys(pending[k]).length > 0)
    .sort();
}

function softValidationWarnings(
  pending: Readonly<Record<string, Record<string, unknown>>>,
): string[] {
  const warnings: string[] = [];
  const f1040 = pending["f1040"] ?? {};
  const agi = num(f1040["line11_agi"]);

  // Schedule C present without Schedule SE
  if (pending["schedule_c"] && !pending["schedule_se"]) {
    warnings.push("Schedule C is present but Schedule SE is missing — self-employment tax may not be computed.");
  }

  // EITC claimed but no qualifying children or earned income context
  if (num(f1040["line27_eitc"]) > 0 && !pending["eitc"]) {
    warnings.push("EITC (line 27) claimed but no EITC node was computed.");
  }

  // Itemized deductions > 50% of AGI
  const itemized = num(f1040["line12e_itemized_deductions"]);
  if (agi > 0 && itemized > agi * 0.5) {
    warnings.push(`Itemized deductions ($${itemized.toLocaleString()}) exceed 50% of AGI ($${agi.toLocaleString()}) — verify deduction amounts.`);
  }

  // Charitable contributions > 60% of AGI (would be disallowed)
  const scheduleA = pending["schedule_a"] ?? {};
  const cashContributions = num(scheduleA["line_11_cash_contributions"]);
  const noncashContributions = num(scheduleA["line_12_noncash_contributions"]);
  const totalContributions = cashContributions + noncashContributions;
  if (agi > 0 && totalContributions > agi * 0.6) {
    warnings.push(`Charitable contributions ($${totalContributions.toLocaleString()}) exceed 60% of AGI — verify contribution limits.`);
  }

  // Schedule D present but no Form 8949 transactions
  // Exception: cap gain distributions (1099-DIV box 2a → Schedule D line 13) don't require Form 8949
  const scheduleD = pending["schedule_d"] ?? {};
  const hasCapGainDistrib = num(scheduleD["line13_cap_gain_distrib"]) > 0;
  if (pending["schedule_d"] && !pending["form8949"] && !hasCapGainDistrib) {
    warnings.push("Schedule D is present but no Form 8949 transactions found — capital gains may be incomplete.");
  }

  // Refund > total withholding + estimated payments (unusually large refundable credits)
  const withholding = num(f1040["line25a_w2_withheld"]) + num(f1040["line25b_withheld_1099"]);
  const refund = num(f1040["line35a_refund"]);
  if (refund > 0 && refund > withholding * 2 && withholding > 0) {
    warnings.push("Refund is more than double total withholding — verify refundable credits.");
  }

  // HSA distributions without qualified expenses
  const form8889 = pending["form8889"] ?? {};
  const hsaDist = num(form8889["hsa_distributions"]);
  const hsaExpenses = num(form8889["qualified_medical_expenses"]);
  if (hsaDist > 0 && hsaExpenses === 0) {
    warnings.push("HSA distributions reported but no qualified medical expenses — distributions may be taxable.");
  }

  // Medical deductions claimed but below 7.5% AGI floor
  const medical = num(scheduleA["line_1_medical"]);
  if (medical > 0 && agi > 0 && medical <= agi * 0.075) {
    warnings.push(`Medical expenses ($${medical.toLocaleString()}) are at or below the 7.5% AGI floor — no deduction will result.`);
  }

  return warnings;
}

export async function getReturnCommand(
  args: GetReturnArgs,
): Promise<GetReturnResult> {
  const returnPath = join(args.baseDir, args.returnId);
  const { meta, inputs } = await loadReturn(returnPath);

  const def = getCatalogEntry(meta.formType ?? "f1040", meta.year);
  const executionPlan = buildExecutionPlan(def.registry);
  const singletonNodeTypes = new Set(
    def.inputNodes.filter((e) => !e.isArray).map((e) => e.node.nodeType),
  );
  const engineInputs = buildEngineInputs(inputs, singletonNodeTypes);
  const result = execute(executionPlan, def.registry, engineInputs, { taxYear: meta.year, formType: meta.formType ?? "f1040" });

  const f1040 = result.pending["f1040"] ?? {};

  const warnings = softValidationWarnings(result.pending);
  for (const d of result.diagnostics) {
    warnings.push(`[${d.code}] ${d.nodeType}: ${d.message}`);
  }

  return {
    returnId: meta.returnId,
    year: meta.year,
    summary: extractSummary(f1040),
    forms: collectForms(result.pending),
    lines: f1040,
    warnings,
  };
}
