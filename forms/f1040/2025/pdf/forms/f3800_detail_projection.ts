import { PassiveCreditSourceOrigin } from "../../../nodes/intermediate/forms/form8582cr/source.ts";
import type { Form3800PassiveTaxUseVintage } from "../../../nodes/inputs/f3800/calculation.ts";
import type { Form3800DocumentParts } from "../../mef/forms/f3800_document.ts";
import {
  form3800CarryoverDetailXmlTags,
  form3800CurrentDetailXmlTags,
} from "../../mef/forms/f3800_passive_tags.ts";
import type { Form3800NonpassiveDetailRow } from "../../mef/forms/f3800_nonpassive_details.ts";
import type { Form3800PassiveDetailRow } from "../../mef/forms/f3800_passive_rows.ts";
import { assertForm3800PrintableDetailCapacity } from "./f3800_capacity.ts";
import { form3800PartVFields, form3800PartVIFields } from "./f3800_fields.ts";

function cents(amount: number): number {
  const value = Math.round(amount * 100);
  if (
    !Number.isFinite(amount) || !Number.isSafeInteger(value) ||
    Math.abs(amount * 100 - value) > 0.000001
  ) {
    throw new Error("Form 3800 printable detail needs cent precision");
  }
  return value;
}

function passThroughEin(
  source: Form3800PassiveTaxUseVintage,
): string | undefined {
  const origin = source.sourceOrigin;
  const ein = origin.kind === PassiveCreditSourceOrigin.Self
    ? undefined
    : origin.ein ?? origin.missing_ein_reason;
  if (
    origin.kind !== PassiveCreditSourceOrigin.Self &&
    (!ein || (ein !== "APPLD FOR" && !/^\d{9}$/.test(ein)))
  ) {
    throw new Error(
      "Form 3800 printable pass-through source needs EIN evidence",
    );
  }
  return ein;
}

type CurrentSource =
  | { readonly kind: "nonpassive"; readonly row: Form3800NonpassiveDetailRow }
  | { readonly kind: "passive"; readonly row: Form3800PassiveDetailRow };

/** Part V's 18 physical columns, using only credit routes native MeF supports. */
export function projectForm3800PartVFields(
  parts: Form3800DocumentParts,
): Readonly<Record<string, string | number>> {
  assertForm3800PrintableDetailCapacity(parts);
  const amountByLine = new Map(
    parts.currentAmounts.map((row) => [row.line, row]),
  );
  const aggregateLines = new Set(
    parts.currentRows.flatMap((row) =>
      row.metadata.sourceCount > 1 ? [row.line] : []
    ),
  );
  const lineOrder = Object.keys(form3800CurrentDetailXmlTags);
  const sources: CurrentSource[] = [
    ...parts.currentDetails.map((row) => ({
      kind: "nonpassive" as const,
      row,
    })),
    ...parts.passiveCurrentDetails.map((row) => ({
      kind: "passive" as const,
      row,
    })),
  ].filter((source) => aggregateLines.has(source.row.line)).sort((a, b) =>
    lineOrder.indexOf(a.row.line) - lineOrder.indexOf(b.row.line)
  );
  if (sources.some((source) => lineOrder.indexOf(source.row.line) < 0)) {
    throw new Error("Form 3800 printable Part V has an unsupported line");
  }
  const fields: Record<string, string | number> = {};
  const byLine = new Map<string, {
    before: number;
    after: number;
    nonpassive: number;
    sold: number;
    applied: number;
  }>();
  for (const [index, item] of sources.entries()) {
    const pdf = form3800PartVFields(index + 1);
    fields[pdf.a] = item.row.line;
    const total = byLine.get(item.row.line) ?? {
      before: 0,
      after: 0,
      nonpassive: 0,
      sold: 0,
      applied: 0,
    };
    if (item.kind === "nonpassive") {
      const row = item.row;
      const sold = row.transferOutCredit ?? 0;
      if (
        cents(row.credit) < 0 || cents(sold) < 0 ||
        cents(sold) > cents(row.credit) ||
        cents(row.appliedCredit) < 0 ||
        cents(row.appliedCredit) > cents(row.credit) - cents(sold) ||
        (sold > 0 && !row.transferRegistrationNumber) ||
        (row.passThroughEin && !/^\d{9}$/.test(row.passThroughEin))
      ) {
        throw new Error(
          "Form 3800 printable Part V nonpassive source is invalid",
        );
      }
      if (row.transferRegistrationNumber) {
        fields[pdf.b] = row.transferRegistrationNumber;
      }
      if (row.passThroughEin) fields[pdf.c1] = row.passThroughEin;
      fields[pdf.e] = row.credit;
      if (sold > 0) fields[pdf.f1] = -sold;
      const available = (cents(row.credit) - cents(sold)) / 100;
      fields[pdf.g] = available;
      fields[pdf.h2] = available;
      fields[pdf.i1] = row.appliedCredit;
      fields[pdf.k] = (cents(available) - cents(row.appliedCredit)) / 100;
      total.nonpassive += cents(row.credit);
      total.sold += cents(sold);
      total.applied += cents(row.appliedCredit);
    } else {
      const source = item.row.source;
      if (
        source.form3800CreditLine !== item.row.line ||
        source.originatingTaxYear !== 2025 ||
        !Number.isSafeInteger(source.beforePassiveLimit) ||
        !Number.isSafeInteger(source.afterPassiveLimit) ||
        !Number.isSafeInteger(source.appliedAgainstTax) ||
        !Number.isSafeInteger(source.unusedAfterTaxLimit) ||
        source.beforePassiveLimit < 0 || source.afterPassiveLimit < 0 ||
        source.afterPassiveLimit > source.beforePassiveLimit ||
        source.appliedAgainstTax < 0 || source.unusedAfterTaxLimit < 0 ||
        source.appliedAgainstTax + source.unusedAfterTaxLimit !==
          source.afterPassiveLimit
      ) {
        throw new Error("Form 3800 printable Part V passive source is invalid");
      }
      const ein = passThroughEin(source);
      if (ein) fields[pdf.c1] = ein;
      fields[pdf.d1] = source.beforePassiveLimit;
      fields[pdf.d4] = source.afterPassiveLimit;
      fields[pdf.g] = source.afterPassiveLimit;
      fields[pdf.h2] = source.afterPassiveLimit;
      fields[pdf.i1] = source.appliedAgainstTax;
      fields[pdf.k] = source.unusedAfterTaxLimit;
      total.before += cents(source.beforePassiveLimit);
      total.after += cents(source.afterPassiveLimit);
      total.applied += cents(source.appliedAgainstTax);
    }
    byLine.set(item.row.line, total);
  }
  for (const line of aggregateLines) {
    const amount = amountByLine.get(line);
    const total = byLine.get(line);
    if (
      !amount || !total ||
      total.before !== cents(amount.passiveBeforeLimit) ||
      total.after !== cents(amount.passiveAfterLimit) ||
      total.nonpassive !== cents(amount.nonpassiveCredit) ||
      total.sold !== cents(amount.transferOutCredit) ||
      total.applied !== cents(amount.appliedCredit)
    ) {
      throw new Error(
        `Form 3800 printable Part V line ${line} sources do not reconcile`,
      );
    }
  }
  return fields;
}

/** Part VI's nine physical columns from typed carryover vintages. */
export function projectForm3800PartVIFields(
  parts: Form3800DocumentParts,
): Readonly<Record<string, string | number>> {
  assertForm3800PrintableDetailCapacity(parts);
  if (parts.carryoverDetails.length > 0) {
    throw new Error(
      "Form 3800 printable Part VI needs typed carryover details",
    );
  }
  const lineOrder = Object.keys(form3800CarryoverDetailXmlTags);
  const details = [...parts.passiveCarryoverDetails].sort((a, b) =>
    lineOrder.indexOf(a.line) - lineOrder.indexOf(b.line)
  );
  if (details.some((detail) => lineOrder.indexOf(detail.line) < 0)) {
    throw new Error("Form 3800 printable Part VI has an unsupported line");
  }
  const fields: Record<string, string | number> = {};
  const byLine = new Map<string, {
    keys: string[];
    before: number;
    after: number;
    applied: number;
    unused: number;
    latestYear: number;
  }>();
  for (const [index, detail] of details.entries()) {
    const source = detail.source;
    if (
      source.form3800CreditLine !== detail.line ||
      !Number.isInteger(source.originatingTaxYear) ||
      source.originatingTaxYear < 1900 || source.originatingTaxYear >= 2025 ||
      !Number.isSafeInteger(source.beforePassiveLimit) ||
      !Number.isSafeInteger(source.afterPassiveLimit) ||
      !Number.isSafeInteger(source.appliedAgainstTax) ||
      !Number.isSafeInteger(source.unusedAfterTaxLimit) ||
      source.beforePassiveLimit < 0 || source.afterPassiveLimit < 0 ||
      source.afterPassiveLimit > source.beforePassiveLimit ||
      source.appliedAgainstTax < 0 || source.unusedAfterTaxLimit < 0 ||
      source.appliedAgainstTax + source.unusedAfterTaxLimit !==
        source.afterPassiveLimit
    ) {
      throw new Error("Form 3800 printable Part VI source is invalid");
    }
    const pdf = form3800PartVIFields(index + 1);
    fields[pdf.a] = detail.line;
    fields[pdf.b] = source.originatingTaxYear;
    const ein = passThroughEin(source);
    if (ein) fields[pdf.c] = ein;
    fields[pdf.d] = source.beforePassiveLimit;
    fields[pdf.e] = source.afterPassiveLimit;
    fields[pdf.g] = source.appliedAgainstTax;
    fields[pdf.i] = source.unusedAfterTaxLimit;
    const total = byLine.get(detail.line) ?? {
      keys: [],
      before: 0,
      after: 0,
      applied: 0,
      unused: 0,
      latestYear: 0,
    };
    total.keys.push(source.sourceKey);
    total.before += source.beforePassiveLimit;
    total.after += source.afterPassiveLimit;
    total.applied += source.appliedAgainstTax;
    total.unused += source.unusedAfterTaxLimit;
    total.latestYear = Math.max(total.latestYear, source.originatingTaxYear);
    if (
      !Number.isSafeInteger(total.before) ||
      !Number.isSafeInteger(total.after) ||
      !Number.isSafeInteger(total.applied) ||
      !Number.isSafeInteger(total.unused)
    ) {
      throw new Error("Form 3800 printable Part VI exceeds whole-dollar range");
    }
    byLine.set(detail.line, total);
  }
  for (const row of parts.carryoverRows) {
    const total = byLine.get(row.line);
    if (row.sourceKeys.length === 1) {
      if (total) {
        throw new Error(
          `Form 3800 printable Part VI line ${row.line} has unexpected detail`,
        );
      }
      continue;
    }
    if (
      !total ||
      total.keys.length !== row.sourceKeys.length ||
      total.keys.some((key, index) => key !== row.sourceKeys[index]) ||
      total.latestYear !== row.originatingTaxYear ||
      row.amount.nonpassiveCredit !== 0 ||
      row.amount.recapturedOrAdjusted !== 0 ||
      total.before !== row.amount.passiveBeforeLimit ||
      total.after !== row.amount.passiveAfterLimit ||
      total.applied !== row.amount.appliedCredit ||
      total.unused !== row.amount.carryforwardCredit
    ) {
      throw new Error(
        `Form 3800 printable Part VI line ${row.line} sources do not reconcile`,
      );
    }
  }
  for (const line of byLine.keys()) {
    if (!parts.carryoverRows.some((row) => row.line === line)) {
      throw new Error(
        `Form 3800 printable Part VI line ${line} has no Part IV row`,
      );
    }
  }
  return fields;
}
