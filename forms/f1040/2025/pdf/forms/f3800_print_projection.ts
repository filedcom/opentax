import type { Form3800DocumentParts } from "../../mef/forms/f3800_document.ts";
import type { FilerIdentity } from "../../../mef/header.ts";
import type { Form3800CurrentCreditAmount } from "../../mef/forms/f3800_current_rows.ts";
import type { Form3800CarryoverAmount } from "../../mef/forms/f3800_passive_rows.ts";
import {
  form3800HeaderFields,
  form3800PartIAndIIFields,
  form3800PartIIIFields,
  form3800PartIVFields,
} from "./f3800_fields.ts";

/** Project filer identity and the elections already fixed by the native document. */
export function projectForm3800HeaderFields(
  parts: Form3800DocumentParts,
  filer: FilerIdentity,
): Readonly<Record<string, string | number | boolean>> {
  const name = filer.nameLine1.trim();
  const tin = filer.primarySSN.replaceAll("-", "");
  if (!name || !/^\d{9}$/.test(tin) || tin === "000000000") {
    throw new Error("Form 3800 printable filer identity is invalid");
  }
  const ids = parts.transferStatementIds;
  if (
    ids.some((id) => !id.trim()) || new Set(ids).size !== ids.length
  ) {
    throw new Error("Form 3800 printable transfer statement IDs are invalid");
  }
  const transferred = parts.currentAmounts.some((row) =>
    row.transferOutCredit > 0
  );
  if (transferred !== (ids.length > 0)) {
    throw new Error(
      "Form 3800 printable transfer election does not reconcile to source rows",
    );
  }
  if (parts.lines.line4 !== 0 || parts.lines.line34 !== 0) {
    throw new Error(
      "Form 3800 revised carryforward answer lacks a typed source",
    );
  }
  return {
    [form3800HeaderFields.filerName]: name,
    [form3800HeaderFields.filerTin]: tin,
    [form3800HeaderFields.camtAndBeatNo]: true,
    [
      transferred
        ? form3800HeaderFields.transferElectionYes
        : form3800HeaderFields.transferElectionNo
    ]: true,
    ...(transferred
      ? { [form3800HeaderFields.transferStatementCount]: ids.length }
      : {}),
  };
}

function cents(amount: number): number {
  const value = Math.round(amount * 100);
  if (
    !Number.isFinite(amount) || !Number.isSafeInteger(value) ||
    Math.abs(amount * 100 - value) > 0.000001
  ) {
    throw new Error("Form 3800 printable amount must have cent precision");
  }
  return value;
}

/** Map validated native Parts I-II to the official PDF's exact field paths. */
export function projectForm3800PartIAndIIFields(
  parts: Form3800DocumentParts,
  schedule3Line6a: number,
): Readonly<Record<string, number>> {
  if (cents(parts.lines.line38) !== cents(schedule3Line6a)) {
    throw new Error(
      "Form 3800 printed line 38 does not match Schedule 3 line 6a",
    );
  }
  const applied = [
    ...parts.currentAmounts.map((row) => ({
      line: row.line,
      amount: row.appliedCredit,
    })),
    ...parts.carryoverRows.map((row) => ({
      line: row.line,
      amount: row.amount.appliedCredit,
    })),
  ];
  const used = (bucket: "standard" | "empowerment" | "specified") =>
    applied.filter((row) =>
      bucket === "empowerment"
        ? row.line === "3"
        : bucket === "specified"
        ? row.line.startsWith("4")
        : row.line.startsWith("1") || row.line.startsWith("2")
    ).reduce((sum, row) => sum + cents(row.amount), 0);
  if (
    used("standard") !== cents(parts.lines.line17) ||
    used("empowerment") !== cents(parts.lines.line26) ||
    used("specified") !== cents(parts.lines.line37)
  ) {
    throw new Error(
      "Form 3800 printable source tax use does not reconcile to Part II",
    );
  }
  const fields: Record<string, number> = {};
  for (
    const line of Object.keys(form3800PartIAndIIFields) as (
      keyof typeof form3800PartIAndIIFields
    )[]
  ) {
    fields[form3800PartIAndIIFields[line]] = parts.lines[line];
  }
  return fields;
}

function partIIISubtotal(
  amounts: readonly Form3800CurrentCreditAmount[],
): Pick<
  Form3800CurrentCreditAmount,
  | "passiveBeforeLimit"
  | "nonpassiveCredit"
  | "transferOutCredit"
  | "totalCredit"
  | "appliedCredit"
> {
  type AmountKey = keyof Pick<
    Form3800CurrentCreditAmount,
    | "passiveBeforeLimit"
    | "nonpassiveCredit"
    | "transferOutCredit"
    | "totalCredit"
    | "appliedCredit"
  >;
  const total = (key: AmountKey) =>
    amounts.reduce((sum, row) => sum + cents(row[key]), 0) / 100;
  return {
    passiveBeforeLimit: total("passiveBeforeLimit"),
    nonpassiveCredit: total("nonpassiveCredit"),
    transferOutCredit: total("transferOutCredit"),
    totalCredit: total("totalCredit"),
    appliedCredit: total("appliedCredit"),
  };
}

/** Map source-backed Part III rows and subtotals to pages 3-4. */
export function projectForm3800PartIIIFields(
  parts: Form3800DocumentParts,
): Readonly<Record<string, string | number>> {
  const sourceByLine = new Map(parts.currentRows.map((row) => [row.line, row]));
  const amountByLine = new Map(
    parts.currentAmounts.map((row) => [row.line, row]),
  );
  if (
    sourceByLine.size !== parts.currentRows.length ||
    amountByLine.size !== parts.currentAmounts.length ||
    sourceByLine.size !== amountByLine.size ||
    parts.currentRows.some((row) => !amountByLine.has(row.line))
  ) {
    throw new Error(
      "Form 3800 printable Part III source rows do not reconcile",
    );
  }
  const fields: Record<string, string | number> = {};
  const assignAmounts = (
    line: string,
    amount: Pick<
      Form3800CurrentCreditAmount,
      | "passiveBeforeLimit"
      | "nonpassiveCredit"
      | "transferOutCredit"
      | "totalCredit"
      | "appliedCredit"
    >,
  ) => {
    const pdf = form3800PartIIIFields(line);
    if (amount.passiveBeforeLimit > 0) {
      fields[pdf.d] = amount.passiveBeforeLimit;
    }
    if (amount.nonpassiveCredit > 0) fields[pdf.e] = amount.nonpassiveCredit;
    if (amount.transferOutCredit > 0) fields[pdf.f] = -amount.transferOutCredit;
    fields[pdf.g] = amount.totalCredit;
    fields[pdf.i] = amount.appliedCredit;
  };
  for (const amount of parts.currentAmounts) {
    const source = sourceByLine.get(amount.line);
    if (!source) {
      throw new Error("Form 3800 printable Part III source row is missing");
    }
    if (
      !Number.isSafeInteger(source.metadata.sourceCount) ||
      source.metadata.sourceCount < 1 ||
      source.metadata.sourceCount > 999 ||
      cents(amount.passiveBeforeLimit) < 0 ||
      cents(amount.passiveAfterLimit) < 0 ||
      cents(amount.passiveAfterLimit) > cents(amount.passiveBeforeLimit) ||
      cents(amount.nonpassiveCredit) < 0 ||
      cents(amount.transferOutCredit) < 0 ||
      cents(amount.transferOutCredit) > cents(amount.nonpassiveCredit) ||
      (amount.transferOutCredit > 0 &&
        !source.metadata.transferRegistrationNumber) ||
      cents(amount.totalCredit) !== cents(amount.nonpassiveCredit) -
          cents(amount.transferOutCredit) + cents(amount.passiveAfterLimit) ||
      cents(amount.appliedCredit) < 0 ||
      cents(amount.appliedCredit) > cents(amount.totalCredit)
    ) {
      throw new Error("Form 3800 printable Part III amount does not reconcile");
    }
    const pdf = form3800PartIIIFields(amount.line);
    if (source.metadata.sourceCount > 1) {
      fields[pdf.a] = source.metadata.sourceCount;
    }
    if (source.metadata.transferRegistrationNumber) {
      fields[pdf.b] = source.metadata.transferRegistrationNumber;
    }
    if (source.metadata.entity) {
      fields[pdf.c] = "ein" in source.metadata.entity
        ? source.metadata.entity.ein
        : source.metadata.entity.missingEinReason;
    }
    assignAmounts(amount.line, amount);
  }
  for (
    const [line, rows] of [
      ["2", parts.currentAmounts.filter((row) => row.line.startsWith("1"))],
      ["5", parts.currentAmounts.filter((row) => row.line.startsWith("4"))],
      ["6", parts.currentAmounts],
    ] as const
  ) {
    if (rows.length > 0) assignAmounts(line, partIIISubtotal(rows));
  }
  return fields;
}

function partIVSubtotal(
  rows: readonly Form3800CarryoverAmount[],
): Omit<Form3800CarryoverAmount, "line"> {
  type AmountKey = keyof Omit<Form3800CarryoverAmount, "line">;
  const total = (key: AmountKey) =>
    rows.reduce((sum, row) => sum + cents(row[key]), 0) / 100;
  return {
    passiveBeforeLimit: total("passiveBeforeLimit"),
    passiveAfterLimit: total("passiveAfterLimit"),
    nonpassiveCredit: total("nonpassiveCredit"),
    appliedCredit: total("appliedCredit"),
    recapturedOrAdjusted: total("recapturedOrAdjusted"),
    carryforwardCredit: total("carryforwardCredit"),
  };
}

/** Map typed carryover provenance and tax use to Part IV, pages 5-7. */
export function projectForm3800PartIVFields(
  parts: Form3800DocumentParts,
): Readonly<Record<string, string | number>> {
  const fields: Record<string, string | number> = {};
  const seen = new Set<string>();
  const assignAmounts = (
    line: string,
    amount: Omit<Form3800CarryoverAmount, "line">,
  ) => {
    const pdf = form3800PartIVFields(line);
    if (amount.passiveBeforeLimit > 0) {
      fields[pdf.d] = amount.passiveBeforeLimit;
    }
    if (amount.passiveAfterLimit > 0) fields[pdf.e] = amount.passiveAfterLimit;
    if (amount.nonpassiveCredit > 0) fields[pdf.f] = amount.nonpassiveCredit;
    fields[pdf.g] = amount.appliedCredit;
    if (amount.recapturedOrAdjusted !== 0) {
      fields[pdf.h] = amount.recapturedOrAdjusted;
    }
    fields[pdf.i] = amount.carryforwardCredit;
  };
  for (const row of parts.carryoverRows) {
    if (
      seen.has(row.line) || row.amount.line !== row.line ||
      row.sourceKeys.length < 1 || row.sourceKeys.length > 999 ||
      row.sourceKeys.some((key) => !key) ||
      new Set(row.sourceKeys).size !== row.sourceKeys.length ||
      !Number.isInteger(row.originatingTaxYear) ||
      row.originatingTaxYear < 1900 || row.originatingTaxYear >= 2025 ||
      (row.entity && "ein" in row.entity &&
        !/^\d{9}$/.test(row.entity.ein))
    ) {
      throw new Error("Form 3800 printable Part IV source identity is invalid");
    }
    seen.add(row.line);
    const amount = row.amount;
    if (
      cents(amount.passiveBeforeLimit) < 0 ||
      cents(amount.passiveAfterLimit) < 0 ||
      cents(amount.passiveAfterLimit) > cents(amount.passiveBeforeLimit) ||
      cents(amount.nonpassiveCredit) < 0 ||
      cents(amount.appliedCredit) < 0 ||
      cents(amount.carryforwardCredit) < 0 ||
      cents(amount.carryforwardCredit) !== cents(amount.passiveAfterLimit) +
          cents(amount.nonpassiveCredit) - cents(amount.appliedCredit) -
          cents(amount.recapturedOrAdjusted)
    ) {
      throw new Error("Form 3800 printable Part IV tax use does not reconcile");
    }
    const pdf = form3800PartIVFields(row.line);
    if (row.sourceKeys.length > 1) fields[pdf.a] = row.sourceKeys.length;
    fields[pdf.b] = row.originatingTaxYear;
    if (row.entity) {
      fields[pdf.c] = "ein" in row.entity
        ? row.entity.ein
        : row.entity.missingEinReason;
    }
    assignAmounts(row.line, amount);
  }
  const standard = parts.carryoverRows.filter((row) =>
    row.line.startsWith("1") || row.line.startsWith("2")
  );
  const specified = parts.carryoverRows.filter((row) =>
    row.line.startsWith("4")
  );
  for (
    const [line, rows] of [
      ["5", specified],
      ["6", standard],
      ["7", parts.carryoverRows],
    ] as const
  ) {
    if (rows.length > 0) {
      assignAmounts(
        line,
        partIVSubtotal(rows.map((row) => row.amount)),
      );
    }
  }
  return fields;
}
