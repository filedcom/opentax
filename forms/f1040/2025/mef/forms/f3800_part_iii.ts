import { element, elements } from "../../../mef/xml.ts";
import type { Form3800CurrentCreditAmount } from "./f3800_current_rows.ts";
import type { Form3800PassiveXmlRow } from "./f3800_passive_rows.ts";
import {
  type Form3800CreditLine,
  form3800PassiveXmlTags,
} from "./f3800_passive_tags.ts";

export type Form3800PartIIIInput = {
  readonly rows: readonly Form3800PassiveXmlRow[];
  readonly amounts: readonly Form3800CurrentCreditAmount[];
};

function toCents(amount: number): number {
  const value = Math.round(amount * 100);
  if (
    !Number.isFinite(amount) || !Number.isSafeInteger(value) ||
    Math.abs(amount * 100 - value) > 0.000001
  ) {
    throw new Error("Form 3800 Part III amount must have cent precision");
  }
  return value;
}

function subtotalXml(
  tag: string,
  rows: readonly Form3800CurrentCreditAmount[],
): string {
  if (rows.length === 0) return "";
  const total = (
    field: keyof Pick<
      Form3800CurrentCreditAmount,
      | "nonpassiveCredit"
      | "transferOutCredit"
      | "passiveBeforeLimit"
      | "passiveAfterLimit"
      | "totalCredit"
      | "appliedCredit"
    >,
  ): number => {
    const amount = rows.reduce((sum, row) => sum + toCents(row[field]), 0);
    if (!Number.isSafeInteger(amount)) {
      throw new Error("Form 3800 Part III subtotal exceeds cent precision");
    }
    return amount / 100;
  };
  const passiveBefore = total("passiveBeforeLimit");
  const passiveAfter = total("passiveAfterLimit");
  const nonpassive = total("nonpassiveCredit");
  const transferOut = total("transferOutCredit");
  const available = total("totalCredit");
  const applied = total("appliedCredit");
  if (
    toCents(available) !==
      toCents(passiveAfter) + toCents(nonpassive) - toCents(transferOut) ||
    toCents(applied) > toCents(available)
  ) {
    throw new Error("Form 3800 Part III subtotal does not reconcile");
  }
  return elements(tag, [
    passiveBefore > 0
      ? element("CrSubjToPassiveActyLmtAmt", passiveBefore)
      : "",
    nonpassive > 0 ? element("GeneralBusCrFromNnPssvActyAmt", nonpassive) : "",
    transferOut > 0 ? element("CreditTransferElectionAmt", -transferOut) : "",
    element("TotalGeneralBusCreditsAmt", available),
    element("TotalGeneralBusCreditsAppTxAmt", applied),
  ]);
}

/** Place and total current-year groups in TY2025 IRS3800.xsd order. */
export function buildForm3800PartIIIXml(
  input: Form3800PartIIIInput,
): string[] {
  const orderedLines = (Object.keys(
    form3800PassiveXmlTags,
  ) as Form3800CreditLine[]).filter((line) =>
    form3800PassiveXmlTags[line].current
  );
  const rowByLine = new Map(input.rows.map((row) => [row.line, row.xml]));
  const amountByLine = new Map(input.amounts.map((row) => [row.line, row]));
  for (const row of input.amounts) {
    const passiveBefore = toCents(row.passiveBeforeLimit);
    const passiveAfter = toCents(row.passiveAfterLimit);
    const nonpassive = toCents(row.nonpassiveCredit);
    const transferOut = toCents(row.transferOutCredit);
    const available = toCents(row.totalCredit);
    const applied = toCents(row.appliedCredit);
    if (
      passiveBefore < 0 || passiveAfter < 0 ||
      passiveAfter > passiveBefore || nonpassive < 0 ||
      transferOut < 0 || transferOut > nonpassive ||
      available !== passiveAfter + nonpassive - transferOut ||
      applied < 0 || applied > available
    ) {
      throw new Error("Form 3800 Part III amount row does not reconcile");
    }
  }
  if (
    rowByLine.size !== input.rows.length ||
    amountByLine.size !== input.amounts.length ||
    rowByLine.size !== amountByLine.size ||
    input.rows.some((row) =>
      !orderedLines.includes(row.line) || !row.xml ||
      !amountByLine.has(row.line)
    )
  ) {
    throw new Error("Form 3800 Part III rows do not reconcile");
  }
  const standard = orderedLines.filter((line) => line.startsWith("1"));
  const specified = orderedLines.filter((line) => line.startsWith("4"));
  return [
    ...standard.flatMap((line) => {
      const xml = rowByLine.get(line);
      return xml ? [xml] : [];
    }),
    subtotalXml(
      "GenBusCYCreditsSubTotGrp",
      input.amounts.filter((row) => row.line.startsWith("1")),
    ),
    rowByLine.get("3") ?? "",
    ...specified.flatMap((line) => {
      const xml = rowByLine.get(line);
      return xml ? [xml] : [];
    }),
    subtotalXml(
      "GenBusCYCreditsSubTot2Grp",
      input.amounts.filter((row) => row.line.startsWith("4")),
    ),
    subtotalXml("TotGenBusCYCreditAmtGrp", input.amounts),
  ].filter(Boolean);
}
