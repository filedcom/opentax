import type { F8949Transaction } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

type Term = "short" | "long";
interface CategoryKey {
  term: Term;
  checkbox: string;
}

// Each 2025 paper checkbox has its own MeF indicator and its own group.

const PART_TO_CATEGORY: Readonly<Record<string, CategoryKey>> = {
  A: { term: "short", checkbox: "TransRptOn1099BThatShowBssInd" },
  B: { term: "short", checkbox: "TransRptOn1099BNotShowBasisInd" },
  C: { term: "short", checkbox: "NonDATransNotRptOn1099BOrDAInd" },
  G: { term: "short", checkbox: "TransRptOn1099DAThatShowBssInd" },
  H: { term: "short", checkbox: "TransRptOn1099DANotShowBssInd" },
  I: { term: "short", checkbox: "DATransNotRptOn1099DAOrBInd" },
  D: { term: "long", checkbox: "TransRptOn1099BThatShowBssInd" },
  E: { term: "long", checkbox: "TransRptOn1099BNotShowBasisInd" },
  F: { term: "long", checkbox: "NonDATransNotRptOn1099BOrDAInd" },
  J: { term: "long", checkbox: "TransRptOn1099DAThatShowBssInd" },
  K: { term: "long", checkbox: "TransRptOn1099DANotShowBssInd" },
  L: { term: "long", checkbox: "DATransNotRptOn1099DAOrBInd" },
};

// The XSD permits up to six short-term and six long-term groups in that order.
const GROUP_ORDER = [
  "A",
  "B",
  "C",
  "G",
  "H",
  "I",
  "D",
  "E",
  "F",
  "J",
  "K",
  "L",
];

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function categoryKeyOf(part: string): CategoryKey | undefined {
  return PART_TO_CATEGORY[part];
}

function groupWrapper(term: Term): string {
  return term === "short"
    ? "ShortTermCapitalGainAndLossGrp"
    : "LongTermCapitalGainAndLossGrp";
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
    element(key.checkbox, "X"),
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
    if (key === undefined) {
      throw new Error(`Form 8949 has unsupported box ${tx.part}`);
    }
    if (tx.is_long_term !== (key.term === "long")) {
      throw new Error(
        `Form 8949 box ${tx.part} conflicts with its holding-period flag`,
      );
    }
    const existing = grouped.get(tx.part);
    if (existing !== undefined) {
      grouped.set(tx.part, [...existing, tx]);
    } else {
      grouped.set(tx.part, [tx]);
    }
  }

  // Emit groups in canonical XSD order
  const groupChildren: string[] = GROUP_ORDER.map((part) => {
    const txs = grouped.get(part);
    if (txs === undefined || txs.length === 0) return "";
    return buildGroup(PART_TO_CATEGORY[part], txs);
  });

  return elements("IRS8949", groupChildren);
}

export type Fields = F8949Transaction[];

export const form8949: MefFormDescriptor<"form8949", Fields> = {
  pendingKey: "form8949",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8949.pdf",
  build(transactions) {
    return buildIRS8949(transactions);
  },
};
