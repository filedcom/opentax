import type { F8949Transaction } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";


type Term = "short" | "long";
type Basis = "reported" | "not_reported" | "no_1099b";

interface CategoryKey {
  term: Term;
  basis: Basis;
}

// ─── Part -> category mapping ────────────────────────────────────────────────

const PART_TO_CATEGORY: Readonly<Record<string, CategoryKey>> = {
  A: { term: "short", basis: "reported" },
  G: { term: "short", basis: "reported" },
  B: { term: "short", basis: "not_reported" },
  H: { term: "short", basis: "not_reported" },
  C: { term: "short", basis: "no_1099b" },
  I: { term: "short", basis: "no_1099b" },
  D: { term: "long", basis: "reported" },
  J: { term: "long", basis: "reported" },
  E: { term: "long", basis: "not_reported" },
  K: { term: "long", basis: "not_reported" },
  F: { term: "long", basis: "no_1099b" },
  L: { term: "long", basis: "no_1099b" },
};

// Canonical order for group emission: short-term first, then long-term,
// each in reported -> not_reported -> no_1099b order (XSD document order).
const GROUP_ORDER: ReadonlyArray<CategoryKey> = [
  { term: "short", basis: "reported" },
  { term: "short", basis: "not_reported" },
  { term: "short", basis: "no_1099b" },
  { term: "long", basis: "reported" },
  { term: "long", basis: "not_reported" },
  { term: "long", basis: "no_1099b" },
];

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function categoryKeyOf(part: string): CategoryKey | undefined {
  return PART_TO_CATEGORY[part.toUpperCase()];
}

function categoryId(key: CategoryKey): string {
  return `${key.term}:${key.basis}`;
}

function groupWrapper(term: Term): string {
  return term === "short"
    ? "ShortTermCapitalGainAndLossGrp"
    : "LongTermCapitalGainAndLossGrp";
}

function checkboxElement(basis: Basis): string {
  switch (basis) {
    case "reported":
      return element("TransRptOn1099BThatShowBssInd", "X");
    case "not_reported":
      return element("TransRptOn1099BNotShowBasisInd", "X");
    case "no_1099b":
      return element("TransactionsNotRptedOn1099BInd", "X");
  }
}

function buildAssetGrp(tx: F8949Transaction): string {
  const children: string[] = [
    element("PropertyDesc", tx.description),
    element("AcquiredDt", tx.date_acquired),
    element("SoldOrDisposedDt", tx.date_sold),
    element("ProceedsSalesPriceAmt", tx.proceeds),
    element("CostOrOtherBasisAmt", tx.cost_basis),
    tx.adjustment_codes !== undefined
      ? element("AdjustmentsToGainOrLossCd", tx.adjustment_codes)
      : "",
    tx.adjustment_amount !== undefined
      ? element("AdjustmentsToGainOrLossAmt", tx.adjustment_amount)
      : "",
    element("GainOrLossAmt", tx.gain_loss),
  ];
  return elements("CapitalGainAndLossAssetGrp", children);
}

function buildGroup(key: CategoryKey, txs: F8949Transaction[]): string {
  const totalProceeds = txs.reduce((sum, tx) => sum + tx.proceeds, 0);
  const totalCost = txs.reduce((sum, tx) => sum + tx.cost_basis, 0);
  const totalGainLoss = txs.reduce((sum, tx) => sum + tx.gain_loss, 0);
  const adjustmentAmounts = txs
    .map((tx) => tx.adjustment_amount)
    .filter((v): v is number => v !== undefined);
  const totalAdjustments = adjustmentAmounts.length > 0
    ? adjustmentAmounts.reduce((sum, v) => sum + v, 0)
    : undefined;

  const children: string[] = [
    checkboxElement(key.basis),
    ...txs.map(buildAssetGrp),
    element("TotalProceedsSalesPriceAmt", totalProceeds),
    element("TotalCostOrOtherBasisAmt", totalCost),
    totalAdjustments !== undefined
      ? element("TotAdjustmentsToGainOrLossAmt", totalAdjustments)
      : "",
    element("TotalGainOrLossAmt", totalGainLoss),
  ];

  return elements(groupWrapper(key.term), children);
}

// ─── Public API ───────────────────────────────────────────────────────────────

function buildIRS8949(transactions: F8949Transaction[]): string {
  if (transactions.length === 0) return "";

  // Group transactions by category
  const grouped = new Map<string, F8949Transaction[]>();
  for (const tx of transactions) {
    const key = categoryKeyOf(tx.part);
    if (key === undefined) continue;
    const id = categoryId(key);
    const existing = grouped.get(id);
    if (existing !== undefined) {
      grouped.set(id, [...existing, tx]);
    } else {
      grouped.set(id, [tx]);
    }
  }

  // Emit groups in canonical XSD order
  const groupChildren: string[] = GROUP_ORDER.map((key) => {
    const txs = grouped.get(categoryId(key));
    if (txs === undefined || txs.length === 0) return "";
    return buildGroup(key, txs);
  });

  return elements("IRS8949", groupChildren);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Form8949MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f8949.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS8949(pending.form8949 ?? []);
  }
}

export const form8949 = new Form8949MefNode();
