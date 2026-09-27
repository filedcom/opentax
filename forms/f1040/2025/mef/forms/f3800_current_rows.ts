import { element, elements } from "../../../mef/xml.ts";
import type { Form3800CreditLine } from "./f3800_passive_tags.ts";
import { form3800PassiveXmlTags } from "./f3800_passive_tags.ts";

export type Form3800CurrentNonpassiveAmount = {
  readonly line: Form3800CreditLine;
  readonly grossCredit: number;
  readonly transferOutCredit: number;
  readonly appliedCredit: number;
};

export type Form3800CurrentPassiveAmount = {
  readonly line: Form3800CreditLine;
  readonly beforePassiveLimit: number;
  readonly afterPassiveLimit: number;
  readonly appliedCredit: number;
};

export type Form3800CurrentCreditAmount = {
  readonly line: Form3800CreditLine;
  readonly nonpassiveCredit: number;
  readonly transferOutCredit: number;
  readonly passiveBeforeLimit: number;
  readonly passiveAfterLimit: number;
  readonly totalCredit: number;
  readonly appliedCredit: number;
};

export type Form3800CurrentCreditRowMetadata = {
  readonly sourceCount: number;
  readonly transferRegistrationNumber?: string;
  readonly entity?:
    | { readonly ein: string }
    | { readonly missingEinReason: "APPLD FOR" };
  readonly referenceDocumentId?: string;
  readonly referenceDocumentName?: string;
};

/** Combine Part III columns (d), (e), (g), and (i) once per IRS credit line. */
export function combineForm3800CurrentCreditAmounts(
  nonpassive: readonly Form3800CurrentNonpassiveAmount[],
  passive: readonly Form3800CurrentPassiveAmount[],
): Form3800CurrentCreditAmount[] {
  const validLines = Object.keys(
    form3800PassiveXmlTags,
  ) as Form3800CreditLine[];
  const byLine = new Map<Form3800CreditLine, Form3800CurrentCreditAmount>();
  const seenNonpassive = new Set<Form3800CreditLine>();
  const seenPassive = new Set<Form3800CreditLine>();
  for (const row of nonpassive) {
    if (
      !validLines.includes(row.line) ||
      !form3800PassiveXmlTags[row.line].current ||
      !Number.isSafeInteger(row.grossCredit) ||
      !Number.isSafeInteger(row.transferOutCredit) ||
      !Number.isSafeInteger(row.appliedCredit) ||
      row.grossCredit < 0 || row.transferOutCredit < 0 ||
      row.transferOutCredit > row.grossCredit || row.appliedCredit < 0 ||
      row.appliedCredit > row.grossCredit - row.transferOutCredit ||
      seenNonpassive.has(row.line)
    ) {
      throw new Error("Form 3800 current-year nonpassive row is invalid");
    }
    seenNonpassive.add(row.line);
    byLine.set(row.line, {
      line: row.line,
      nonpassiveCredit: row.grossCredit,
      transferOutCredit: row.transferOutCredit,
      passiveBeforeLimit: 0,
      passiveAfterLimit: 0,
      totalCredit: row.grossCredit - row.transferOutCredit,
      appliedCredit: row.appliedCredit,
    });
  }
  for (const row of passive) {
    if (
      !validLines.includes(row.line) ||
      !form3800PassiveXmlTags[row.line].current ||
      !Number.isSafeInteger(row.beforePassiveLimit) ||
      !Number.isSafeInteger(row.afterPassiveLimit) ||
      !Number.isSafeInteger(row.appliedCredit) ||
      row.beforePassiveLimit < 0 || row.afterPassiveLimit < 0 ||
      row.afterPassiveLimit > row.beforePassiveLimit ||
      row.appliedCredit < 0 || row.appliedCredit > row.afterPassiveLimit ||
      seenPassive.has(row.line)
    ) {
      throw new Error("Form 3800 current-year passive row is invalid");
    }
    seenPassive.add(row.line);
    const prior = byLine.get(row.line);
    const nonpassiveCredit = prior?.nonpassiveCredit ?? 0;
    const transferOutCredit = prior?.transferOutCredit ?? 0;
    const appliedCredit = (prior?.appliedCredit ?? 0) + row.appliedCredit;
    const totalCredit = nonpassiveCredit - transferOutCredit +
      row.afterPassiveLimit;
    if (
      !Number.isSafeInteger(totalCredit) ||
      !Number.isSafeInteger(appliedCredit) || appliedCredit > totalCredit
    ) {
      throw new Error("Form 3800 current-year row totals do not reconcile");
    }
    byLine.set(row.line, {
      line: row.line,
      nonpassiveCredit,
      transferOutCredit,
      passiveBeforeLimit: row.beforePassiveLimit,
      passiveAfterLimit: row.afterPassiveLimit,
      totalCredit,
      appliedCredit,
    });
  }
  return validLines.flatMap((line) => {
    const row = byLine.get(line);
    return row ? [row] : [];
  });
}

/** Serialize the shared Part III columns in TY2025 IRS3800.xsd order. */
export function buildForm3800CurrentCreditRowXml(
  row: Form3800CurrentCreditAmount,
  metadata: Form3800CurrentCreditRowMetadata,
): string {
  const tag = form3800PassiveXmlTags[row.line]?.current;
  if (
    !tag || !Number.isSafeInteger(metadata.sourceCount) ||
    metadata.sourceCount < 1 || metadata.sourceCount > 999 ||
    (metadata.entity && "ein" in metadata.entity &&
      !/^\d{9}$/.test(metadata.entity.ein)) ||
    (row.transferOutCredit > 0 && !metadata.transferRegistrationNumber) ||
    Boolean(metadata.referenceDocumentId) !==
      Boolean(metadata.referenceDocumentName) ||
    !Number.isSafeInteger(row.nonpassiveCredit) ||
    !Number.isSafeInteger(row.transferOutCredit) ||
    !Number.isSafeInteger(row.passiveBeforeLimit) ||
    !Number.isSafeInteger(row.passiveAfterLimit) ||
    !Number.isSafeInteger(row.totalCredit) ||
    !Number.isSafeInteger(row.appliedCredit) ||
    row.nonpassiveCredit < 0 || row.transferOutCredit < 0 ||
    row.transferOutCredit > row.nonpassiveCredit ||
    row.passiveBeforeLimit < 0 || row.passiveAfterLimit < 0 ||
    row.passiveAfterLimit > row.passiveBeforeLimit ||
    row.totalCredit !== row.nonpassiveCredit - row.transferOutCredit +
        row.passiveAfterLimit ||
    row.appliedCredit < 0 || row.appliedCredit > row.totalCredit
  ) {
    throw new Error("Form 3800 current-year XML row does not reconcile");
  }
  const attrs = metadata.referenceDocumentId &&
      metadata.referenceDocumentName
    ? {
      referenceDocumentId: metadata.referenceDocumentId,
      referenceDocumentName: metadata.referenceDocumentName,
    }
    : undefined;
  return elements(tag, [
    metadata.sourceCount > 1
      ? element("CYGeneralBusinessCrItemCnt", metadata.sourceCount)
      : "",
    metadata.transferRegistrationNumber
      ? element("TransferRegistrationNum", metadata.transferRegistrationNumber)
      : "",
    metadata.entity
      ? "ein" in metadata.entity
        ? element("PassThroughEntityEIN", metadata.entity.ein)
        : element("MissingEINReasonCd", metadata.entity.missingEinReason)
      : "",
    row.passiveBeforeLimit > 0
      ? element("CrSubjToPassiveActyLmtAmt", row.passiveBeforeLimit)
      : "",
    row.nonpassiveCredit > 0
      ? element("GeneralBusCrFromNnPssvActyAmt", row.nonpassiveCredit)
      : "",
    row.transferOutCredit > 0
      ? element("CreditTransferElectionAmt", -row.transferOutCredit)
      : "",
    element("TotalGeneralBusCreditsAmt", row.totalCredit),
    element("TotalGeneralBusCreditsAppTxAmt", row.appliedCredit),
  ], attrs);
}
