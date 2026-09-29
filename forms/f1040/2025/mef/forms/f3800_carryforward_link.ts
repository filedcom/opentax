import type { Form3800NonpassiveLines } from "../../../nodes/inputs/f3800/calculation.ts";
import type { Form3800CarryoverRow } from "./f3800_passive_rows.ts";
import type { Form3800CreditLine } from "./f3800_passive_tags.ts";

export type Form3800CarryforwardDocumentSource = {
  readonly sourceKey: string;
  readonly line: Form3800CreditLine;
  readonly documentId: string;
  readonly availableCredit: number;
  readonly revisedFromOriginal: boolean;
};

function cents(amount: number): number {
  const value = Math.round(amount * 100);
  if (
    !Number.isFinite(amount) || !Number.isSafeInteger(value) ||
    Math.abs(amount * 100 - value) > 0.000001
  ) {
    throw new Error("Form 3800 carryforward source needs cent precision");
  }
  return value;
}

/** One source-to-Part IV and Part I/II reconciliation for native and PDF. */
export function reconcileForm3800CarryforwardLinks(
  lines: Form3800NonpassiveLines,
  rows: readonly Form3800CarryoverRow[],
  sources: readonly Form3800CarryforwardDocumentSource[],
) {
  const keys = new Set<string>();
  const ids = new Set<string>();
  const byLine = new Map(rows.map((row) => [row.line, row] as const));
  if (byLine.size !== rows.length) {
    throw new Error("Form 3800 carryforward Part IV lines are duplicated");
  }
  for (const source of sources) {
    if (
      !source.sourceKey.trim() || !source.documentId.trim() ||
      /\s/.test(source.documentId) || keys.has(source.sourceKey) ||
      ids.has(source.documentId) ||
      !(source.line.startsWith("1") || source.line.startsWith("2") ||
        source.line.startsWith("4")) ||
      typeof source.revisedFromOriginal !== "boolean" ||
      cents(source.availableCredit) <= 0 ||
      !byLine.get(source.line)?.sourceKeys.includes(source.sourceKey)
    ) {
      throw new Error(
        "Form 3800 carryforward computation source does not match Part IV",
      );
    }
    keys.add(source.sourceKey);
    ids.add(source.documentId);
  }
  for (const row of rows) {
    const sourceTotal = sources.filter((source) => source.line === row.line)
      .reduce((sum, source) => sum + cents(source.availableCredit), 0);
    if (
      !Number.isSafeInteger(sourceTotal) ||
      sourceTotal !== cents(row.amount.nonpassiveCredit)
    ) {
      throw new Error(
        `Form 3800 Part IV line ${row.line} nonpassive sources do not reconcile`,
      );
    }
  }
  const standard = sources.filter((source) => !source.line.startsWith("4"));
  const specified = sources.filter((source) => source.line.startsWith("4"));
  const standardTotal = standard.reduce(
    (sum, source) => sum + cents(source.availableCredit),
    0,
  );
  const specifiedTotal = specified.reduce(
    (sum, source) => sum + cents(source.availableCredit),
    0,
  );
  if (
    standardTotal !== cents(lines.line4) ||
    specifiedTotal !== cents(lines.line34)
  ) {
    throw new Error(
      "Form 3800 carryforward computation totals do not reconcile to Parts I and II",
    );
  }
  return {
    standardDocumentIds: standard.map((source) => source.documentId),
    standardRevised: standard.some((source) => source.revisedFromOriginal),
    specifiedRevised: specified.some((source) => source.revisedFromOriginal),
  };
}
