import type { Form3800CreditLine } from "./f3800_passive_tags.ts";
import { form3800PassiveXmlTags } from "./f3800_passive_tags.ts";

export type Form3800CurrentNonpassiveAmount = {
  readonly line: Form3800CreditLine;
  readonly availableCredit: number;
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
  readonly passiveBeforeLimit: number;
  readonly passiveAfterLimit: number;
  readonly totalCredit: number;
  readonly appliedCredit: number;
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
      !Number.isSafeInteger(row.availableCredit) ||
      !Number.isSafeInteger(row.appliedCredit) ||
      row.availableCredit < 0 || row.appliedCredit < 0 ||
      row.appliedCredit > row.availableCredit ||
      seenNonpassive.has(row.line)
    ) {
      throw new Error("Form 3800 current-year nonpassive row is invalid");
    }
    seenNonpassive.add(row.line);
    byLine.set(row.line, {
      line: row.line,
      nonpassiveCredit: row.availableCredit,
      passiveBeforeLimit: 0,
      passiveAfterLimit: 0,
      totalCredit: row.availableCredit,
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
    const appliedCredit = (prior?.appliedCredit ?? 0) + row.appliedCredit;
    const totalCredit = nonpassiveCredit + row.afterPassiveLimit;
    if (
      !Number.isSafeInteger(totalCredit) ||
      !Number.isSafeInteger(appliedCredit) || appliedCredit > totalCredit
    ) {
      throw new Error("Form 3800 current-year row totals do not reconcile");
    }
    byLine.set(row.line, {
      line: row.line,
      nonpassiveCredit,
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
