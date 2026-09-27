import { element, elements } from "../../../mef/xml.ts";
import type { Form3800NonpassiveLines } from "../../../nodes/inputs/f3800/calculation.ts";
import type {
  Form3800CurrentCreditAmount,
  Form3800CurrentXmlRow,
} from "./f3800_current_rows.ts";
import type {
  Form3800CarryoverXmlRow,
  Form3800PassiveXmlRow,
} from "./f3800_passive_rows.ts";
import { form3800PartIAndIIXml } from "./f3800_part_i_ii.ts";
import { buildForm3800PartIIIXml } from "./f3800_part_iii.ts";
import { buildForm3800PartIVXml } from "./f3800_part_iv.ts";
import { buildForm3800PartVXml } from "./f3800_part_v.ts";
import { buildForm3800PartVIXml } from "./f3800_part_vi.ts";

export type Form3800DocumentParts = {
  readonly lines: Form3800NonpassiveLines;
  readonly transferStatementIds: readonly string[];
  readonly currentRows: readonly Form3800CurrentXmlRow[];
  readonly currentAmounts: readonly Form3800CurrentCreditAmount[];
  readonly carryoverRows: readonly Form3800CarryoverXmlRow[];
  readonly currentDetails: readonly Form3800PassiveXmlRow[];
  readonly carryoverDetails: readonly Form3800PassiveXmlRow[];
};

/** Assemble a filed IRS3800 document in TY2025 schema order. */
export function buildIRS3800Document(parts: Form3800DocumentParts): string {
  if (
    parts.currentRows.length === 0 && parts.carryoverRows.length === 0
  ) {
    throw new Error("Form 3800 needs a current-year or carryover source row");
  }
  const toCents = (amount: number): number => {
    const cents = Math.round(amount * 100);
    if (
      !Number.isFinite(amount) || !Number.isSafeInteger(cents) ||
      Math.abs(amount * 100 - cents) > 0.000001
    ) {
      throw new Error("Form 3800 filed amount must have cent precision");
    }
    return cents;
  };
  const sourceUse = [
    ...parts.currentAmounts.map((row) => ({
      line: row.line,
      appliedCredit: row.appliedCredit,
    })),
    ...parts.carryoverRows.map((row) => ({
      line: row.line,
      appliedCredit: row.amount.appliedCredit,
    })),
  ];
  const usedFor = (bucket: "standard" | "empowerment" | "specified") =>
    sourceUse.filter((row) =>
      bucket === "empowerment"
        ? row.line === "3"
        : bucket === "specified"
        ? row.line.startsWith("4")
        : row.line.startsWith("1") || row.line.startsWith("2")
    ).reduce((sum, row) => sum + toCents(row.appliedCredit), 0);
  const standardUsed = usedFor("standard");
  const empowermentUsed = usedFor("empowerment");
  const specifiedUsed = usedFor("specified");
  const appliedCents = standardUsed + empowermentUsed + specifiedUsed;
  if (
    !Number.isSafeInteger(appliedCents) ||
    standardUsed !== toCents(parts.lines.line17) ||
    empowermentUsed !== toCents(parts.lines.line26) ||
    specifiedUsed !== toCents(parts.lines.line37) ||
    appliedCents !== toCents(parts.lines.line38)
  ) {
    throw new Error(
      "Form 3800 source-row tax use does not reconcile to Part II",
    );
  }
  const partIII = buildForm3800PartIIIXml({
    rows: parts.currentRows,
    amounts: parts.currentAmounts,
  });
  const partIV = buildForm3800PartIVXml(parts.carryoverRows);
  return elements("IRS3800", [
    element("CAMTAndBEATInd", "false"),
    element(
      "CreditTransferElectionInd",
      String(parts.transferStatementIds.length > 0),
    ),
    parts.transferStatementIds.length > 0
      ? element(
        "TransferElectionStatementCnt",
        parts.transferStatementIds.length,
        {
          referenceDocumentId: parts.transferStatementIds.join(" "),
          referenceDocumentName: "BinaryAttachment",
        },
      )
      : "",
    ...form3800PartIAndIIXml(parts.lines),
    ...partIII,
    ...partIV,
    buildForm3800PartVXml(parts.currentDetails),
    ...buildForm3800PartVIXml(parts.carryoverDetails),
  ]);
}
