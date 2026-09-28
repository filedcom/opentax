import { element, elements } from "../../../mef/xml.ts";
import type {
  Form3800CarryoverAmount,
  Form3800CarryoverRow,
} from "./f3800_passive_rows.ts";
import { form3800CarryoverRowXml } from "./f3800_passive_rows.ts";
import {
  type Form3800CreditLine,
  form3800PassiveXmlTags,
} from "./f3800_passive_tags.ts";

function toCents(amount: number): number {
  const value = Math.round(amount * 100);
  if (
    !Number.isFinite(amount) || !Number.isSafeInteger(value) ||
    Math.abs(amount * 100 - value) > 0.000001
  ) {
    throw new Error("Form 3800 Part IV amount must have cent precision");
  }
  return value;
}

function subtotalXml(
  tag: string,
  rows: readonly Form3800CarryoverAmount[],
): string {
  if (rows.length === 0) return "";
  const total = (
    field: Exclude<keyof Form3800CarryoverAmount, "line">,
  ): number => {
    const cents = rows.reduce((sum, row) => sum + toCents(row[field]), 0);
    if (!Number.isSafeInteger(cents)) {
      throw new Error("Form 3800 Part IV subtotal exceeds cent precision");
    }
    return cents / 100;
  };
  const before = total("passiveBeforeLimit");
  const after = total("passiveAfterLimit");
  const nonpassive = total("nonpassiveCredit");
  const applied = total("appliedCredit");
  const adjusted = total("recapturedOrAdjusted");
  const carryforward = total("carryforwardCredit");
  if (
    toCents(carryforward) !== toCents(after) + toCents(nonpassive) -
        toCents(applied) - toCents(adjusted)
  ) {
    throw new Error("Form 3800 Part IV subtotal does not reconcile");
  }
  return elements(tag, [
    before > 0 ? element("CrSubjToPassiveActyLmtAmt", before) : "",
    after > 0 ? element("PassiveActivityCrAfterLmtAmt", after) : "",
    nonpassive > 0 ? element("GeneralBusCrFromNnPssvActyAmt", nonpassive) : "",
    element("TotalGeneralBusCreditsAppTxAmt", applied),
    adjusted !== 0 ? element("GeneralBusCrCyovRcptrAdjAmt", adjusted) : "",
    element("CarryforwardGeneralBusCrAmt", carryforward),
  ]);
}

/** Order Part IV source rows and derive lines 5, 6, and 7 from them. */
export function buildForm3800PartIVXml(
  rows: readonly Form3800CarryoverRow[],
): string[] {
  const orderedLines = Object.keys(
    form3800PassiveXmlTags,
  ) as Form3800CreditLine[];
  const byLine = new Map(rows.map((row) => [row.line, row]));
  if (
    byLine.size !== rows.length ||
    rows.some((row) =>
      !orderedLines.includes(row.line) ||
      row.amount.line !== row.line
    )
  ) {
    throw new Error("Form 3800 Part IV rows do not reconcile");
  }
  for (const { amount } of rows) {
    const before = toCents(amount.passiveBeforeLimit);
    const after = toCents(amount.passiveAfterLimit);
    const nonpassive = toCents(amount.nonpassiveCredit);
    const applied = toCents(amount.appliedCredit);
    const adjusted = toCents(amount.recapturedOrAdjusted);
    const carryforward = toCents(amount.carryforwardCredit);
    if (
      before < 0 || after < 0 || after > before || nonpassive < 0 ||
      applied < 0 || carryforward < 0 ||
      carryforward !== after + nonpassive - applied - adjusted
    ) {
      throw new Error("Form 3800 Part IV source amount does not reconcile");
    }
  }
  const standard = orderedLines.filter((line) =>
    line.startsWith("1") || line.startsWith("2")
  );
  const specified = orderedLines.filter((line) => line.startsWith("4"));
  return [
    ...standard.flatMap((line) => {
      const row = byLine.get(line);
      return row ? [form3800CarryoverRowXml(row)] : [];
    }),
    byLine.get("3") ? form3800CarryoverRowXml(byLine.get("3")!) : "",
    ...specified.flatMap((line) => {
      const row = byLine.get(line);
      return row ? [form3800CarryoverRowXml(row)] : [];
    }),
    subtotalXml(
      "CYOtherSpcfdCreditsSubTotGrp",
      rows.filter((row) => row.line.startsWith("4")).map((row) => row.amount),
    ),
    subtotalXml(
      "TotCYGBCOrESBCAmtGrp",
      rows.filter((row) => row.line.startsWith("1") || row.line.startsWith("2"))
        .map((row) => row.amount),
    ),
    subtotalXml(
      "Tot8844OthSpcfdGBCOrESBCAmtGrp",
      rows.map((row) => row.amount),
    ),
  ].filter(Boolean);
}
