import { element, elements } from "../../../../../mef/xml.ts";
import type { Form3800CurrentCreditRowMetadata } from "./f3800_current_rows.ts";
import {
  form3800CarryoverDetailXmlTags,
  type Form3800CreditLine,
} from "./f3800_passive_tags.ts";

/** One nonpassive source-vintage breakdown for Form 3800 Part VI. */
export type Form3800NonpassiveCarryoverDetailRow = {
  readonly sourceKey: string;
  readonly line: Form3800CreditLine;
  readonly originatingTaxYear: number;
  readonly entity?: Form3800CurrentCreditRowMetadata["entity"];
  readonly nonpassiveCredit: number;
  readonly appliedCredit: number;
  readonly recapturedOrAdjusted: number;
  readonly carryforwardCredit: number;
};

function cents(amount: number): number {
  const value = Math.round(amount * 100);
  if (
    !Number.isFinite(amount) || !Number.isSafeInteger(value) ||
    Math.abs(amount * 100 - value) > 0.000001
  ) {
    throw new Error("Form 3800 Part VI amount needs cent precision");
  }
  return value;
}

export function validateForm3800NonpassiveCarryoverDetail(
  row: Form3800NonpassiveCarryoverDetailRow,
): void {
  const credit = cents(row.nonpassiveCredit);
  const applied = cents(row.appliedCredit);
  const adjusted = cents(row.recapturedOrAdjusted);
  const unused = cents(row.carryforwardCredit);
  if (
    !row.sourceKey.trim() || !form3800CarryoverDetailXmlTags[row.line] ||
    !Number.isInteger(row.originatingTaxYear) ||
    row.originatingTaxYear < 1900 || row.originatingTaxYear >= 2025 ||
    credit <= 0 || applied < 0 || adjusted < 0 || unused < 0 ||
    credit - applied - adjusted !== unused ||
    (row.entity && "ein" in row.entity &&
      !/^\d{9}$/.test(row.entity.ein)) ||
    (row.entity && "missingEinReason" in row.entity &&
      row.entity.missingEinReason !== "APPLD FOR")
  ) {
    throw new Error("Form 3800 Part VI nonpassive source is invalid");
  }
}

export function form3800NonpassiveCarryoverDetailXml(
  row: Form3800NonpassiveCarryoverDetailRow,
): string {
  validateForm3800NonpassiveCarryoverDetail(row);
  return elements(form3800CarryoverDetailXmlTags[row.line], [
    element("Yr", row.originatingTaxYear),
    row.entity
      ? "ein" in row.entity
        ? element("PassThroughEntityEIN", row.entity.ein)
        : element("MissingEINReasonCd", row.entity.missingEinReason)
      : "",
    element("GeneralBusCrFromNnPssvActyAmt", row.nonpassiveCredit),
    element("TotalGeneralBusCreditsAppTxAmt", row.appliedCredit),
    row.recapturedOrAdjusted > 0
      ? element("GeneralBusCrCyovRcptrAdjAmt", row.recapturedOrAdjusted)
      : "",
    element("CarryforwardGeneralBusCrAmt", row.carryforwardCredit),
  ], { lineNumberTxt: `Part IV Line ${row.line}` });
}
