import type { F5471Item } from "../nodes/inputs/f5471/index.ts";
import {
  calculateOwnedCfcWorksheets,
  ownedWorksheetFiledOperands,
} from "../nodes/inputs/f5471/worksheet-source.ts";

export type OwnedCategory = "GEN" | "PAS" | "TOTAL";
export function owned5471Calculation(cfc: F5471Item) {
  if (!cfc.owned_worksheet_source) return undefined;
  // A raw diagnostic calculation is not authority for finalized native/paper operands.
  // In particular, the retained related note cannot bypass the7872/482 guard.
  ownedWorksheetFiledOperands(cfc.owned_worksheet_source);
  return calculateOwnedCfcWorksheets(cfc.owned_worksheet_source);
}
export function owned5471Categories(cfc: F5471Item): OwnedCategory[] {
  const r = owned5471Calculation(cfc);
  return r && r.categories.PAS.passive.gross > 0
    ? ["GEN", "PAS", "TOTAL"]
    : ["GEN"];
}
export function owned5471Category(cfc: F5471Item, category: OwnedCategory) {
  const r = owned5471Calculation(cfc);
  if (!r) {
    throw Error(
      "Category projection requires its complete owned worksheet source",
    );
  }
  if (
    r.ep_rollforward.section956_ptep_reclassified !== 0 &&
    r.ep_rollforward.section956_ptep_reclassified !==
      r.ep_rollforward.subpart_f + r.form8992.gilti
  ) {
    throw Error(
      "Partial section956 PTEP reclassification requires complete group allocation source",
    );
  }
  const isPas = category === "PAS", isTotal = category === "TOTAL";
  const opening = isPas ? 0 : r.books.opening_ep;
  const current = isTotal
    ? r.books.current_ep
    : isPas
    ? r.categories.PAS.ep
    : r.categories.GEN.ep;
  const subpartF = isTotal
    ? r.ep_rollforward.subpart_f
    : isPas
    ? r.schedule_i.line1e
    : r.schedule_i.line1f;
  const gilti = isPas ? 0 : r.form8992.gilti;
  const section956 = isPas ? 0 : r.schedule_i.line2_us_property;
  const reclassified = r.ep_rollforward.section956_ptep_reclassified === 0
    ? 0
    : subpartF + gilti;
  const reclassSf = reclassified ? subpartF : 0,
    reclassGilti = reclassified ? gilti : 0;
  return {
    r,
    category,
    opening,
    current,
    subpartF,
    gilti,
    section956,
    reclassified,
    reclassSf,
    reclassGilti,
    untaxedClosing: opening + current - subpartF - gilti - section956,
    ptepClosing: subpartF + gilti + section956,
    salesGross: isPas ? 0 : r.categories.GEN.sales.gross,
    salesNet: isPas ? 0 : r.categories.GEN.sales.net,
    salesInterest: isPas
      ? 0
      : r.classified_expenses.filter((e) =>
        e.category === "sales" && e.kind === "interest"
      ).reduce((n, e) => n + e.amount, 0),
    passiveInterest: category === "GEN"
      ? 0
      : r.classified_expenses.filter((e) =>
        e.category === "passive" && e.kind === "interest"
      ).reduce((n, e) => n + e.amount, 0),
    totalInterest: isPas
      ? r.classified_expenses.filter((e) =>
        e.category === "passive" && e.kind === "interest"
      ).reduce((n, e) => n + e.amount, 0)
      : isTotal
      ? r.classified_expenses.filter((e) => e.kind === "interest").reduce(
        (n, e) => n + e.amount,
        0,
      )
      : r.classified_expenses.filter((e) =>
        e.category !== "passive" && e.kind === "interest"
      ).reduce((n, e) => n + e.amount, 0),
    passiveGross: category === "GEN" ? 0 : r.categories.PAS.passive.gross,
    passiveNet: category === "GEN" ? 0 : r.categories.PAS.ep,
    passiveTax: category === "GEN" ? 0 : r.categories.PAS.us_tax,
    passiveAverageAssets: category === "GEN"
      ? 0
      : r.owned_property_basis.filter((x) => x.kind === "debt_obligation")
        .reduce((n, x) => n + x.cost, 0),
    testedGross: isPas ? 0 : r.categories.GEN.tested.gross,
    testedNet: isPas ? 0 : r.categories.GEN.tested.net,
    testedInterest: isPas ? 0 : r.form8992.tested_interest_expense,
    testedExpenses: isPas ? 0 : r.categories.GEN.tested.depreciation,
    testedTaxes: isPas ? 0 : cfc.schedule_e.tax_usd,
    // QBAI uses quarter-end tax basis; Schedule Q asset value is distinct.
    testedAverageAssets: isPas
      ? 0
      : r.owned_property_basis.filter((x) => x.kind === "depreciable_equipment")
        .reduce(
          (n, x) => n + (x.beginning_book_basis + x.ending_book_basis) / 2,
          0,
        ),
  };
}
