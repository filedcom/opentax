import { element, elements } from "../../../mef/xml.ts";
import type { Form3800NonpassiveLines } from "../../../nodes/inputs/f3800/calculation.ts";
import type {
  Form3800CurrentCreditAmount,
  Form3800CurrentXmlRow,
} from "./f3800_current_rows.ts";
import type {
  Form3800CarryoverRow,
  Form3800PassiveDetailRow,
  Form3800PassiveXmlRow,
} from "./f3800_passive_rows.ts";
import {
  form3800PassiveCarryoverDetailXml,
  form3800PassiveCurrentDetailXml,
} from "./f3800_passive_rows.ts";
import {
  form3800NonpassiveCurrentDetailXml,
  type Form3800NonpassiveDetailRow,
} from "./f3800_nonpassive_details.ts";
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
  readonly carryoverRows: readonly Form3800CarryoverRow[];
  readonly currentDetails: readonly Form3800NonpassiveDetailRow[];
  readonly carryoverDetails: readonly Form3800PassiveXmlRow[];
  readonly passiveCurrentDetails: readonly Form3800PassiveDetailRow[];
  readonly passiveCarryoverDetails: readonly Form3800PassiveDetailRow[];
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
  const detailCountByLine = new Map(
    parts.currentRows.map((row) => [row.line, row.metadata.sourceCount]),
  );
  const currentDetails = [
    ...parts.currentDetails.map((row) => ({
      line: row.line,
      xml: form3800NonpassiveCurrentDetailXml(row),
    })),
    ...parts.passiveCurrentDetails.map((row) => ({
      line: row.line,
      xml: form3800PassiveCurrentDetailXml(row),
    })),
  ];
  const carryoverDetails = [
    ...parts.carryoverDetails,
    ...parts.passiveCarryoverDetails.map((row) => ({
      line: row.line,
      xml: form3800PassiveCarryoverDetailXml(row),
    })),
  ];
  if (currentDetails.some((row) => !detailCountByLine.has(row.line))) {
    throw new Error("Form 3800 Part V detail has no Part III source row");
  }
  const filedCurrentDetails = currentDetails.filter((row) =>
    (detailCountByLine.get(row.line) ?? 0) > 1
  );
  for (const [line, count] of detailCountByLine) {
    if (
      count > 1 &&
      filedCurrentDetails.filter((row) => row.line === line).length !== count
    ) {
      throw new Error(
        `Form 3800 Part V line ${line} source count does not reconcile`,
      );
    }
  }
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
    buildForm3800PartVXml(filedCurrentDetails),
    ...buildForm3800PartVIXml(carryoverDetails),
  ]);
}
