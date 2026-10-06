import {
  computeGrossIncome as cGross,
  computeTotalExpenses as cExpenses,
  mealsDeductiblePct,
  type ScheduleCItem,
} from "./inputs/schedule_c/model.ts";
import {
  computeGrossIncome as fGross,
  computeTotalExpenses as fExpenses,
  conservationDeduction,
  type ScheduleFItem,
} from "./intermediate/forms/schedule_f/model.ts";
import { roundWholeDollars } from "../whole-dollars.ts";

function filedLeaves<T extends object>(source: T): T {
  return Object.fromEntries(
    Object.entries(source).map((
      [key, value],
    ) => [
      key,
      /^line_?\d/.test(key) && typeof value === "number"
        ? roundWholeDollars(value)
        : (key === "part_v_other_expenses" ||
            key === "line32_other_expenses") && Array.isArray(value)
        ? value.map((row) => ({
          ...row,
          amount: roundWholeDollars(row.amount),
        }))
        : value,
    ]),
  ) as T;
}
/** Retain original source cents; settle ordinary reviewed proprietor filing operands. */
export function filedOwnedScheduleC(
  item: ScheduleCItem,
  specialFiling = false,
  reduction = 0,
) {
  if (
    specialFiling || reduction !== 0 || !item.proprietor_recipient ||
    item.qbi_no_other_adjustments_confirmed !== true ||
    item.statutory_employee === true || item.professional_gambler === true ||
    item.line_f_accounting_method !== "cash" ||
    item.line_g_material_participation !== true ||
    item.line_32_at_risk !== "a" || item.at_risk_simplified ||
    item.qbi_wotc_filing_review ||
    (item.line_26_other_employment_credits ?? 0) !== 0 ||
    item.home_office_method || (item.line_30_home_office ?? 0) !== 0
  ) return undefined;
  const filed = filedLeaves(item);
  const meals_deduction = roundWholeDollars(
    (item.line_24b_meals ?? 0) * mealsDeductiblePct(item),
  );
  const gross = cGross(filed);
  const expenses = cExpenses({ ...filed, line_24b_meals: 0 }) + meals_deduction;
  return {
    filed_source: filed,
    gross,
    expenses,
    meals_deduction,
    profit: gross - expenses,
  };
}
export function filedOwnedScheduleF(
  item: ScheduleFItem,
  specialFiling = false,
  reduction = 0,
) {
  if (
    specialFiling || reduction !== 0 || !item.proprietor_recipient ||
    item.qbi_no_other_adjustments_confirmed !== true ||
    item.accounting_method !== "cash" ||
    item.line_e_material_participation !== true ||
    item.line36_at_risk !== "a" ||
    (item.line22_other_employment_credits ?? 0) !== 0 ||
    (item.line3b_cooperative_distributions_taxable ?? 0) !== 0
  ) return undefined;
  const filed = filedLeaves(item), gross = fGross(filed);
  const conservation_deduction = roundWholeDollars(
    conservationDeduction(item, gross),
  );
  const expenses = fExpenses({ ...filed, line12_conservation: 0 }, gross) +
    conservation_deduction;
  return {
    filed_source: filed,
    gross,
    expenses,
    conservation_deduction,
    profit: gross - expenses,
  };
}
