import { z } from "zod";
import { inputSchema as reviewSchema } from "./schema.ts";
import {
  computeGrossIncome as cGross,
  computeNetProfit as cProfit,
  computeTotalExpenses as cExpenses,
  itemSchema as cSchema,
} from "../schedule_c/model.ts";
import {
  computeGrossIncome as fGross,
  computeNetProfit as fProfit,
  computeTotalExpenses as fExpenses,
  itemSchema as fSchema,
} from "../../intermediate/forms/schedule_f/model.ts";
import { distributionTotal } from "../f1099patr/schema.ts";

export { sourceSchema } from "./schema.ts";
import { type PatronSource, sourceSchema } from "./schema.ts";
/** Round source amounts inside their leaf filing lines; derive equations from filed operands. */
export function patronFiledBusinessLines(
  kind: "schedule_c" | "schedule_f",
  raw: unknown,
  determinedWotcReduction = 0,
) {
  const source = kind === "schedule_c"
    ? cSchema.parse(raw)
    : fSchema.parse(raw);
  const filed = Object.fromEntries(
    Object.entries(source).map((
      [key, value],
    ) => [
      key,
      /^line_?\d/.test(key) && typeof value === "number"
        ? Math.round(value)
        : (key === "part_v_other_expenses" ||
            key === "line32_other_expenses") && Array.isArray(value)
        ? value.map((row) => ({ ...row, amount: Math.round(row.amount) }))
        : value,
    ]),
  );
  if (kind === "schedule_c") {
    const item = cSchema.parse(filed);
    const gross = cGross(item);
    const expenses = cExpenses(item, determinedWotcReduction);
    return { gross, expenses, profit: gross - expenses, filed_source: item };
  }
  const item = fSchema.parse(filed);
  const gross = fGross(item);
  const expenses = fExpenses(item, gross, determinedWotcReduction);
  return { gross, expenses, profit: gross - expenses, filed_source: item };
}

/** Reviewed receipts allocation includes the deductions attributable to this sole business. */
export function patronSourceAmounts(raw: PatronSource) {
  const source = sourceSchema.parse(raw);
  const review = source.review;
  const patr = review.source_1099patr;
  const c = review.business.kind === "schedule_c"
    ? cSchema.parse(source.business_source)
    : undefined;
  const f = review.business.kind === "schedule_f"
    ? fSchema.parse(source.business_source)
    : undefined;
  const gross = c ? cGross(c) : fGross(f!);
  const rawProfit = c ? cProfit(c) : fProfit(f!);
  const filing = patronFiledBusinessLines(
    review.business.kind,
    source.business_source,
  );
  const profit = filing.profit;
  const wages = c ? c.qbi_w2_wages ?? 0 : f!.qbi_w2_wages ?? 0;
  const ubia = c ? c.qbi_unadjusted_basis ?? 0 : f!.qbi_unadjusted_basis ?? 0;
  const payroll = c ? c.line_26_wages ?? 0 : f!.line22_labor_hired ?? 0;
  const name = c ? c.line_c_business_name : f!.line_c_farm_name;
  const ein = (c ? c.line_d_ein : f!.line_d_ein)?.replace(/\D/g, "");
  const treatment = patr.distribution_treatment;
  const payments = patr.box7_qualified_payments ?? 0;
  const wageRecords = review.employee_w2_records;
  const recordedWages = wageRecords.reduce(
    (sum, record) => sum + record.eligible_199a_wages,
    0,
  );
  const recordedPayroll = wageRecords.reduce(
    (sum, record) => sum + record.box1_wages,
    0,
  );
  const references = new Set(
    wageRecords.map((record) => record.employee_reference),
  );
  const correctBusiness = c
    ? review.business.kind === "schedule_c" &&
      c.business_reference === review.business.business_reference &&
      (c.proprietor_recipient === "T" || c.proprietor_recipient === "S") &&
      c.line_f_accounting_method === "cash" &&
      c.line_g_material_participation &&
      c.qbi_specified_service !== true && treatment?.kind === "schedule_c" &&
      treatment.business_reference === c.business_reference &&
      (c.line_6_other_income ?? 0) >= treatment.verified_taxable_amount
    : review.business.kind === "schedule_f" &&
      f!.farm_id === review.business.farm_id &&
      (f!.proprietor_recipient === "T" || f!.proprietor_recipient === "S") &&
      f!.accounting_method === "cash" &&
      f!.line_e_material_participation && treatment?.kind === "farm" &&
      treatment.farm_id === f!.farm_id &&
      (f!.line3a_cooperative_distributions ?? 0) >= distributionTotal(patr) &&
      (f!.line3b_cooperative_distributions_taxable ?? 0) >=
        treatment.verified_taxable_amount;
  if (
    !correctBusiness || !name?.trim() || !/^\d{9}$/.test(ein ?? "") ||
    profit <= 0 || gross <= 0 ||
    payments <= 0 || payments > gross || wages <= 0 || wages > payroll ||
    wages !== recordedWages ||
    recordedPayroll !== payroll || references.size !== wageRecords.length ||
    wageRecords.some((record) =>
      record.eligible_199a_wages > record.box1_wages
    ) || ubia !== 0 ||
    patr.trade_or_business !== true ||
    patr.box13_specified_cooperative !== true ||
    !patr.payer_name?.trim() || !/^\d{9}$/.test(patr.payer_tin ?? "") ||
    !patr.source_document_reference ||
    (patr.box9_section199aa_sstb_items ?? 0) !== 0 ||
    (c && (c.line_30_home_office ?? 0) !== 0) ||
    (f && (f.line22_other_employment_credits ?? 0) !== 0) ||
    (c && (c.line_26_other_employment_credits ?? 0) !== 0)
  ) {
    throw new Error(
      "Patron source needs one owned active cash business, included cooperative income and eligible sourced payroll without property or credit adjustments",
    );
  }
  const rawAdjustedQbi = rawProfit - source.se_tax_deduction -
    source.health_insurance_deduction - source.retirement_plan_deduction;
  const adjustedQbi = profit - source.se_tax_deduction -
    source.health_insurance_deduction - source.retirement_plan_deduction;
  if (adjustedQbi <= 0) {
    throw new Error("Patron source needs positive adjusted QBI");
  }
  const receiptShare = payments / gross;
  return {
    gross,
    profit,
    raw_profit: rawProfit,
    raw_qbi: rawAdjustedQbi,
    filed_gross: filing.gross,
    filed_expenses: filing.expenses,
    receipt_share: receiptShare,
    raw_qualified_qbi: rawAdjustedQbi * receiptShare,
    raw_qualified_wages: wages * receiptShare,
    qbi: Math.round(adjustedQbi),
    wages: Math.round(wages),
    ubia: 0,
    qualified_qbi: Math.round(adjustedQbi * receiptShare),
    qualified_wages: Math.round(wages * receiptShare),
    name,
    ein: ein!,
  };
}
