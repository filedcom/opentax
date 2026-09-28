import type { F8949Transaction } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";
import {
  assertForm4797ExcessGainRow,
  assertForm8949TransactionMath,
  transactionSchema,
} from "../../../nodes/intermediate/forms/form8949/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";
import type { MefBuildContext } from "../form-descriptor.ts";
import {
  calculateInvestment1245Disposition,
  investment1245DispositionSchema,
} from "../../../nodes/intermediate/forms/form4797/investment_1245.ts";

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

/** Code Z is its own QOF election row, not an adjustment to a sale row. */
export function isQofCodeZRow(tx: F8949Transaction): boolean {
  if (!tx.adjustment_codes?.includes("Z")) return false;
  const acquired = /^\d{4}-\d{2}-\d{2}$/.test(tx.date_acquired)
    ? new Date(`${tx.date_acquired}T00:00:00.000Z`)
    : undefined;
  if (tx.adjustment_codes !== "Z" ||
    !["C", "I", "F", "L"].includes(tx.part) ||
    !/^\d{9}$/.test(tx.description) ||
    !tx.source_transaction_id?.trim() ||
    !acquired || Number.isNaN(acquired.getTime()) ||
    acquired.toISOString().slice(0, 10) !== tx.date_acquired ||
    tx.date_sold !== "" || tx.proceeds !== 0 || tx.cost_basis !== 0 ||
    tx.adjustment_amount === undefined || tx.adjustment_amount >= 0 ||
    tx.gain_loss !== tx.adjustment_amount ||
    tx.from_form4797_investment_1245 === true) {
    throw new Error(
      "Form 8949 code Z needs a separate identified QOF EIN row with blank sale date, proceeds and basis",
    );
  }
  return true;
}

function groupWrapper(term: Term): string {
  return term === "short"
    ? "ShortTermCapitalGainAndLossGrp"
    : "LongTermCapitalGainAndLossGrp";
}

function buildAssetGrp(tx: F8949Transaction): string {
  const from4797 = tx.from_form4797_investment_1245 === true;
  const qofZ = isQofCodeZRow(tx);
  const children: string[] = [
    qofZ ? element("EIN", tx.description) : element("PropertyDesc", tx.description),
    from4797 ? "" : element("AcquiredDt", tx.date_acquired),
    from4797 || qofZ ? "" : element("SoldOrDisposedDt", tx.date_sold),
    qofZ ? "" : element("ProceedsSalesPriceAmt", tx.proceeds),
    from4797 || qofZ ? "" : element("CostOrOtherBasisAmt", tx.cost_basis),
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
    txs.every(isQofCodeZRow)
      ? ""
      : element("TotalProceedsSalesPriceAmt", totalProceeds),
    txs.every((tx) => tx.from_form4797_investment_1245 === true || isQofCodeZRow(tx))
      ? ""
      : element("TotalCostOrOtherBasisAmt", totalCost),
    totalAdjustments !== undefined
      ? element("TotAdjustmentsToGainOrLossAmt", totalAdjustments)
      : "",
    element("TotalGainOrLossAmt", totalGainLoss),
  ];

  return elements(groupWrapper(key.term), children);
}

// ─── Public API ───────────────────────────────────────────────────────────────

function buildIRS8949(
  transactions: F8949Transaction[],
  context?: MefBuildContext,
): string {
  if (transactions.length === 0) return "";

  const specialRows = transactions.filter((tx) =>
    tx.from_form4797_investment_1245 === true
  );
  if (specialRows.length > 0) {
    const form4797 = context?.pending?.form4797 as Record<string, unknown> | undefined;
    const source = form4797?.investment_1245_dispositions;
    if (!Array.isArray(source)) {
      throw new Error("Form 8949 excess gain needs its Form 4797 property source");
    }
    const calculated = source.map((row) =>
      calculateInvestment1245Disposition(
        investment1245DispositionSchema.parse(row),
      )
    ).filter((sale) => sale.excessCapitalGain > 0);
    if (
      specialRows.length !== calculated.length ||
      calculated.some((sale) =>
        specialRows.filter((tx) =>
          tx.form4797_property_id === sale.sale.property_id &&
          tx.source_transaction_id === sale.sale.property_id &&
          tx.proceeds === sale.excessCapitalGain &&
          tx.gain_loss === sale.excessCapitalGain
        ).length !== 1
      )
    ) {
      throw new Error("Form 8949 excess gain differs from the Form 4797 property calculation");
    }
  }

  // Group transactions by category
  const grouped = new Map<string, F8949Transaction[]>();
  for (const tx of transactions) {
    if (
      tx.adjustment_codes?.includes("Q") ||
      ("qsbs_code" in tx && tx.qsbs_code !== undefined) ||
      ("qsbs_amount" in tx && tx.qsbs_amount !== undefined)
    ) {
      throw new Error(
        "Form 8949 section 1202 source needs a sourced exclusion, 28% Rate Gain Worksheet refigure, and Form 6251 line 2h preference before filing",
      );
    }
    if (tx.from_form4797_investment_1245 === true) {
      assertForm4797ExcessGainRow(transactionSchema.parse(tx));
    }
    assertForm8949TransactionMath(tx);
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
  build(transactions, context) {
    return buildIRS8949(transactions, context);
  },
};
