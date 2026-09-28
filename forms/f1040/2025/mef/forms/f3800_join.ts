import type { Form3800NonpassiveLines } from "../../../nodes/inputs/f3800/calculation.ts";
import {
  buildForm3800CurrentCreditRowXml,
  combineForm3800CurrentCreditAmounts,
  type Form3800CurrentCreditAmount,
  type Form3800CurrentXmlRow,
  largestForm3800CurrentEntity,
} from "./f3800_current_rows.ts";
import type { Form3800DocumentParts } from "./f3800_document.ts";
import type { Form3800PassiveRowXml } from "./f3800_passive_rows.ts";
import type { Form3800CreditLine } from "./f3800_passive_tags.ts";

function currentRowMap(
  rows: readonly Form3800CurrentXmlRow[],
  amounts: readonly Form3800CurrentCreditAmount[],
): ReadonlyMap<Form3800CreditLine, Form3800CurrentXmlRow> {
  const byLine = new Map(rows.map((row) => [row.line, row] as const));
  const amountLines = new Set(amounts.map((row) => row.line));
  if (
    byLine.size !== rows.length || amountLines.size !== amounts.length ||
    byLine.size !== amountLines.size ||
    rows.some((row) => !amountLines.has(row.line))
  ) {
    throw new Error("Form 3800 source rows and amounts do not reconcile");
  }
  return byLine;
}

/** Combine source-backed Part III rows before final IRS3800 document assembly. */
export function joinForm3800DocumentParts(
  lines: Form3800NonpassiveLines,
  nonpassive: Form3800DocumentParts | undefined,
  passive: Form3800PassiveRowXml,
): Form3800DocumentParts {
  const nonpassiveAmounts = nonpassive?.currentAmounts ?? [];
  const nonpassiveRows = currentRowMap(
    nonpassive?.currentRows ?? [],
    nonpassiveAmounts,
  );
  const passiveRows = currentRowMap(passive.partIII, passive.currentAmounts);
  if (
    nonpassiveAmounts.some((row) =>
      row.passiveBeforeLimit !== 0 || row.passiveAfterLimit !== 0
    ) ||
    passive.currentAmounts.some((row) =>
      row.nonpassiveCredit !== 0 || row.transferOutCredit !== 0
    )
  ) {
    throw new Error("Form 3800 source side contains another side's credits");
  }
  const currentAmounts = combineForm3800CurrentCreditAmounts(
    nonpassiveAmounts.map((row) => ({
      line: row.line,
      grossCredit: row.nonpassiveCredit,
      transferOutCredit: row.transferOutCredit,
      appliedCredit: row.appliedCredit,
    })),
    passive.currentAmounts.map((row) => ({
      line: row.line,
      beforePassiveLimit: row.passiveBeforeLimit,
      afterPassiveLimit: row.passiveAfterLimit,
      appliedCredit: row.appliedCredit,
    })),
  );
  const currentRows = currentAmounts.map((amount) => {
    const ordinary = nonpassiveRows.get(amount.line);
    const passiveRow = passiveRows.get(amount.line);
    if (!ordinary) {
      if (!passiveRow) throw new Error("Form 3800 current row was not joined");
      return passiveRow;
    }
    if (!passiveRow) return ordinary;
    if (
      ordinary.metadata.referenceDocumentId &&
      passiveRow.metadata.referenceDocumentId &&
      (ordinary.metadata.referenceDocumentId !==
          passiveRow.metadata.referenceDocumentId ||
        ordinary.metadata.referenceDocumentName !==
          passiveRow.metadata.referenceDocumentName)
    ) {
      throw new Error(
        "Form 3800 mixed current row has conflicting document references",
      );
    }
    const entityCredits = [
      ...ordinary.entityCredits,
      ...passiveRow.entityCredits,
    ];
    const metadata = {
      sourceCount: ordinary.metadata.sourceCount +
        passiveRow.metadata.sourceCount,
      transferRegistrationNumber:
        ordinary.metadata.transferRegistrationNumber ??
          passiveRow.metadata.transferRegistrationNumber,
      entity: largestForm3800CurrentEntity(entityCredits),
      referenceDocumentId: ordinary.metadata.referenceDocumentId ??
        passiveRow.metadata.referenceDocumentId,
      referenceDocumentName: ordinary.metadata.referenceDocumentName ??
        passiveRow.metadata.referenceDocumentName,
    };
    return {
      line: amount.line,
      metadata,
      entityCredits,
      xml: buildForm3800CurrentCreditRowXml(amount, metadata),
    };
  });
  return {
    lines,
    transferStatementIds: nonpassive?.transferStatementIds ?? [],
    currentRows,
    currentAmounts,
    carryoverRows: [...(nonpassive?.carryoverRows ?? []), ...passive.partIV],
    currentDetails: nonpassive?.currentDetails ?? [],
    carryoverDetails: nonpassive?.carryoverDetails ?? [],
    passiveCurrentDetails: passive.partV,
    passiveCarryoverDetails: passive.partVI,
  };
}
