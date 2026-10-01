import type { Form3800NonpassiveLines } from "../../../nodes/inputs/f3800/calculation.ts";
import type {
  Form3800CarryoverRow,
  Form3800PassiveDetailRow,
} from "./f3800_passive_rows.ts";
import type { Form3800CreditLine } from "./f3800_passive_tags.ts";
import type { Form3800NonpassiveCarryoverDetailRow } from "./f3800_carryover_details.ts";
import { validateForm3800NonpassiveCarryoverDetail } from "./f3800_carryover_details.ts";

export type Form3800CarryforwardDocumentSource = {
  readonly sourceKey: string;
  readonly line: Form3800CreditLine;
  readonly originatingTaxYear: number;
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
  details: readonly Form3800NonpassiveCarryoverDetailRow[],
  passiveDetails: readonly Form3800PassiveDetailRow[],
) {
  const keys = new Set<string>();
  const ids = new Set<string>();
  const byLine = new Map(rows.map((row) => [row.line, row] as const));
  const rowSourceKeys = new Set<string>();
  if (byLine.size !== rows.length) {
    throw new Error("Form 3800 carryforward Part IV lines are duplicated");
  }
  for (const row of rows) {
    for (const key of row.sourceKeys) {
      if (!key.trim() || rowSourceKeys.has(key)) {
        throw new Error(
          "Form 3800 carryforward source appears on multiple Part IV rows",
        );
      }
      rowSourceKeys.add(key);
    }
  }
  for (const source of sources) {
    if (
      !source.sourceKey.trim() || !source.documentId.trim() ||
      /\s/.test(source.documentId) || keys.has(source.sourceKey) ||
      ids.has(source.documentId) ||
      !Number.isInteger(source.originatingTaxYear) ||
      source.originatingTaxYear < 1900 ||
      source.originatingTaxYear >= 2025 ||
      !(source.line.startsWith("1") || source.line.startsWith("2") ||
        source.line.startsWith("4")) ||
      typeof source.revisedFromOriginal !== "boolean" ||
      cents(source.availableCredit) <= 0 ||
      !byLine.get(source.line)?.sourceKeys.includes(source.sourceKey) ||
      source.originatingTaxYear >
        (byLine.get(source.line)?.originatingTaxYear ?? 0)
    ) {
      throw new Error(
        "Form 3800 carryforward computation source does not match Part IV",
      );
    }
    keys.add(source.sourceKey);
    ids.add(source.documentId);
  }
  const detailKeys = new Set<string>();
  for (const detail of details) {
    validateForm3800NonpassiveCarryoverDetail(detail);
    const source = sources.find((source) =>
      source.sourceKey === detail.sourceKey
    );
    const row = byLine.get(detail.line);
    if (
      detailKeys.has(detail.sourceKey) || !source || !row ||
      row.sourceKeys.length < 2 ||
      source.line !== detail.line ||
      source.originatingTaxYear !== detail.originatingTaxYear ||
      cents(source.availableCredit) !== cents(detail.nonpassiveCredit)
    ) {
      throw new Error(
        "Form 3800 carryforward Part VI detail does not match its source",
      );
    }
    detailKeys.add(detail.sourceKey);
  }
  for (const row of rows) {
    const expected = sources.filter((source) =>
      source.line === row.line && row.sourceKeys.includes(source.sourceKey)
    );
    if (
      expected.length === row.sourceKeys.length &&
      Math.max(...expected.map((source) => source.originatingTaxYear)) !==
        row.originatingTaxYear
    ) {
      throw new Error(
        `Form 3800 Part IV line ${row.line} latest source year does not reconcile`,
      );
    }
    if (
      row.sourceKeys.length > 1 &&
      expected.some((source) => !detailKeys.has(source.sourceKey))
    ) {
      throw new Error(
        `Form 3800 Part VI line ${row.line} lacks a nonpassive source detail`,
      );
    }
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
  const detailsByLine = new Map<string, {
    keys: string[];
    before: number;
    after: number;
    nonpassive: number;
    applied: number;
    adjusted: number;
    unused: number;
    latestYear: number;
  }>();
  for (const detail of details) {
    const total = detailsByLine.get(detail.line) ?? {
      keys: [],
      before: 0,
      after: 0,
      nonpassive: 0,
      applied: 0,
      adjusted: 0,
      unused: 0,
      latestYear: 0,
    };
    total.keys.push(detail.sourceKey);
    total.nonpassive += cents(detail.nonpassiveCredit);
    total.applied += cents(detail.appliedCredit);
    total.adjusted += cents(detail.recapturedOrAdjusted);
    total.unused += cents(detail.carryforwardCredit);
    total.latestYear = Math.max(total.latestYear, detail.originatingTaxYear);
    detailsByLine.set(detail.line, total);
  }
  for (const detail of passiveDetails) {
    const source = detail.source;
    if (
      source.form3800CreditLine !== detail.line ||
      !Number.isInteger(source.originatingTaxYear) ||
      source.originatingTaxYear < 1900 || source.originatingTaxYear >= 2025 ||
      cents(source.beforePassiveLimit) < 0 ||
      cents(source.afterPassiveLimit) < 0 ||
      cents(source.appliedAgainstTax) < 0 ||
      cents(source.unusedAfterTaxLimit) < 0 ||
      cents(source.afterPassiveLimit) > cents(source.beforePassiveLimit) ||
      cents(source.appliedAgainstTax) +
            cents(source.unusedAfterTaxLimit) !==
        cents(source.afterPassiveLimit)
    ) {
      throw new Error("Form 3800 Part VI passive source is invalid");
    }
    const total = detailsByLine.get(detail.line) ?? {
      keys: [],
      before: 0,
      after: 0,
      nonpassive: 0,
      applied: 0,
      adjusted: 0,
      unused: 0,
      latestYear: 0,
    };
    total.keys.push(source.sourceKey);
    total.before += cents(source.beforePassiveLimit);
    total.after += cents(source.afterPassiveLimit);
    total.applied += cents(source.appliedAgainstTax);
    total.unused += cents(source.unusedAfterTaxLimit);
    total.latestYear = Math.max(total.latestYear, source.originatingTaxYear);
    detailsByLine.set(detail.line, total);
  }
  for (const row of rows) {
    const total = detailsByLine.get(row.line);
    if (row.sourceKeys.length === 1) {
      if (total) {
        throw new Error(
          `Form 3800 Part VI line ${row.line} has unexpected detail`,
        );
      }
      const source = sources.find((source) =>
        source.sourceKey === row.sourceKeys[0]
      );
      if (
        source && (
          cents(row.amount.passiveBeforeLimit) !== 0 ||
          cents(row.amount.passiveAfterLimit) !== 0 ||
          cents(row.amount.appliedCredit) < 0 ||
          cents(row.amount.recapturedOrAdjusted) !== 0 ||
          cents(row.amount.appliedCredit) +
                cents(row.amount.carryforwardCredit) !==
            cents(source.availableCredit)
        )
      ) {
        throw new Error(
          `Form 3800 Part IV line ${row.line} does not reconcile to its source`,
        );
      }
      continue;
    }
    if (
      !total || total.keys.length !== row.sourceKeys.length ||
      new Set(total.keys).size !== total.keys.length ||
      total.keys.some((key) => !row.sourceKeys.includes(key)) ||
      ![
        total.before,
        total.after,
        total.nonpassive,
        total.applied,
        total.adjusted,
        total.unused,
      ].every(Number.isSafeInteger) ||
      total.latestYear !== row.originatingTaxYear ||
      total.before !== cents(row.amount.passiveBeforeLimit) ||
      total.after !== cents(row.amount.passiveAfterLimit) ||
      total.nonpassive !== cents(row.amount.nonpassiveCredit) ||
      total.applied !== cents(row.amount.appliedCredit) ||
      total.adjusted !== cents(row.amount.recapturedOrAdjusted) ||
      total.unused !== cents(row.amount.carryforwardCredit)
    ) {
      throw new Error(
        `Form 3800 Part VI line ${row.line} sources do not reconcile`,
      );
    }
  }
  for (const line of detailsByLine.keys()) {
    if (!byLine.has(line as Form3800CreditLine)) {
      throw new Error(`Form 3800 Part VI line ${line} has no Part IV row`);
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
