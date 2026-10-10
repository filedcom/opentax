import { PDFCheckBox, PDFDocument, PDFTextField } from "pdf-lib";
import type { F8835Item } from "../../../../../nodes/inputs/credits/business/f8835/index.ts";
import {
  assertForm8835PwaSource,
  form8835PwaDescription,
  type PwaWageRow,
  reconcileForm8835PwaPayroll,
} from "../../../../../nodes/inputs/credits/business/f8835/pwa-source.ts";
import type { MefPdfAttachment } from "../../../form-descriptor.ts";
import { sha256Hex } from "../../../../return-processing/prepared-source.ts";

const dateText = (s: string) =>
  `${s.slice(5, 7)}/${s.slice(8, 10)}/${s.slice(0, 4)}`;
const roundMoney = (cents: number) => String(Math.floor((cents + 50) / 100));
// Preserve exact minutes for eligibility; report hours to four decimal places.
const hours = (minutes: number) => String(Number((minutes / 60).toFixed(4)));
export const pwaContinuationPrefix = (part: "II" | "III", copy: number) =>
  `Form7220Continuation.Part${part}.Copy${copy}.`;

/** Expected canonical Form7220 values, including all row continuations. */
export function form8835PwaFields(item: F8835Item) {
  assertForm8835PwaSource(item, true);
  const s = item.pwa_source!;
  const payroll = reconcileForm8835PwaPayroll(s);
  const fields: Record<string, string | boolean> = {};
  const prefix = "topmostSubform[0].Page1[0].";
  const current = s.placed_in_service_on >= "2025-01-01";
  Object.assign(fields, {
    [`${prefix}f1_1[0]`]: s.taxpayer_name,
    [`${prefix}f1_2[0]`]: s.taxpayer_tin,
    [`${prefix}f1_3[0]`]: "",
    [`${prefix}f1_4[0]`]: s.facility_description,
    [`${prefix}f1_5[0]`]: "",
    [`${prefix}f1_6[0]`]: `${item.facility_us_address!.line1}${
      item.facility_us_address!.line2
        ? ` ${item.facility_us_address!.line2}`
        : ""
    }, ${item.facility_us_address!.city}, ${item.facility_us_address!.state} ${
      item.facility_us_address!.zip
    }`,
    [`${prefix}f1_13[0]`]: dateText(s.construction_began_on),
    [`${prefix}f1_14[0]`]: dateText(s.placed_in_service_on),
  });
  for (
    const [kind, value, start, width] of [
      ["Latitude", s.facility_latitude, 7, 2],
      ["Longitude", s.facility_longitude, 10, 3],
    ] as const
  ) {
    const [whole, decimal] = Math.abs(value).toFixed(6).split(".");
    fields[`${prefix}${kind}_CombFields[0].f1_${start}[0]`] = value < 0
      ? "-"
      : "+";
    fields[`${prefix}${kind}_CombFields[0].f1_${start + 1}[0]`] = whole
      .padStart(width, "0");
    fields[`${prefix}${kind}_CombFields[0].f1_${start + 2}[0]`] = decimal;
  }
  const marks: [string, boolean[]][] = [
    ["c1_1", [current, !current]],
    ["c1_2", Array.from({ length: 12 }, (_, i) => current && i === 8)],
    ["c1_3", [s.project_labor_agreement, !s.project_labor_agreement]],
    ["c1_4", [false, true]],
    ["c1_5", [false, current, false]],
    [
      "c1_6",
      [s.alterations_or_repairs_in_2025, !s.alterations_or_repairs_in_2025],
    ],
  ];
  for (const [name, values] of marks) {
    values.forEach((value, i) => (fields[`${prefix}${name}[${i}]`] = value));
  }
  const continuations: {
    part: "II" | "III";
    copy: number;
    templatePage: number;
  }[] = [];
  const totals = (rows: PwaWageRow[], part: "II" | "III") => {
    // Totals add the printed row amounts, preserving whole-dollar reconciliation.
    const sums = [0, 0, 0, 0, 0];
    for (const row of rows) {
      sums[0] += row.workers;
      sums[1] += row.minutes;
      sums[2] += Number(roundMoney(row.cashCents));
      sums[3] += Number(roundMoney(row.fringeCents));
    }
    sums[4] = sums[2] + sums[3];
    return [
      String(sums[0]),
      hours(sums[1]),
      String(sums[2]),
      String(sums[3]),
      ...(part === "II" ? [String(sums[4])] : ["", ""]),
    ];
  };
  const table = (part: "II" | "III", rows: PwaWageRow[]) => {
    if (!rows.length) return;
    const page = part === "II" ? 2 : 3;
    const columns = part === "II" ? 8 : 9;
    const perPage = part === "II" ? 18 : 16;
    const blocks = Math.ceil(rows.length / perPage);
    for (let copy = 0; copy < blocks; copy++) {
      const root = copy === 0 ? "" : pwaContinuationPrefix(part, copy);
      const base = `${root}topmostSubform[0].Page${page}[0].`;
      const chunk = rows.slice(copy * perPage, (copy + 1) * perPage);
      if (copy) continuations.push({ part, copy, templatePage: page - 1 });
      chunk.forEach((row, i) => {
        const cash = roundMoney(row.cashCents),
          fringe = roundMoney(row.fringeCents);
        const values = [
          row.employerName,
          row.employerEin,
          row.classification,
          String(row.workers),
          hours(row.minutes),
          cash,
          fringe,
          ...(part === "II"
            ? [String(Number(cash) + Number(fringe))]
            : ["", ""]),
        ];
        // The official Part III field numbering skips f3_107 on row 12.
        values.forEach(
          (value, j) => (fields[
            `${base}Table_Part${part}[0].Line${i + 1}[0].f${page}_${
              i * columns + j + 1 +
              (part === "III" && i * columns + j + 1 >= 107 ? 1 : 0)
            }[0]`
          ] = value),
        );
      });
      if (copy === 0 && blocks > 1) {
        totals(rows.slice(perPage), part).forEach(
          (value, i) => (fields[`${base}f${page}_${145 + i}[0]`] = value),
        );
      }
      const totalStart = part === "II" ? 150 : 151;
      totals(copy === 0 ? rows : chunk, part).forEach(
        (value, i) => (fields[`${base}f${page}_${totalStart + i}[0]`] = value),
      );
    }
  };
  table("II", payroll.wageRows);
  table("III", payroll.apprenticeRows);
  return {
    fields,
    continuations,
    payroll,
    pageCount: 5 + continuations.length,
  };
}

export async function assertForm8835PwaAttachment(
  item: F8835Item,
  attachments: readonly MefPdfAttachment[],
) {
  if (item.increased_credit_reason !== "prevailing_wage_and_apprenticeship") {
    return;
  }
  assertForm8835PwaSource(item, true);
  const s = item.pwa_source!;
  const matches = attachments.filter(
    (a) => a.fileName === s.form7220_file_name,
  );
  if (
    matches.length !== 1 ||
    matches[0].description !==
      form8835PwaDescription(item.facility_description!) ||
    (await sha256Hex(matches[0].bytes)) !== s.form7220_sha256
  ) {
    throw new Error(
      "Form 8835 PWA needs its exact reviewed Form 7220 attachment",
    );
  }
  const expected = form8835PwaFields(item);
  const pdf = await PDFDocument.load(matches[0].bytes);
  if (pdf.getPageCount() !== expected.pageCount) {
    throw new Error(
      "Form 8835 Form 7220 needs five pages and all reviewed continuations",
    );
  }
  const form = pdf.getForm();
  const normalize = (s: string) => s.trim().replace(/\s+/g, " ");
  const names = new Set<string>();
  for (const field of form.getFields()) {
    const name = field.getName();
    if (names.has(name)) {
      throw new Error("Form 8835 Form 7220 has duplicate canonical fields");
    }
    names.add(name);
    if (field instanceof PDFTextField) {
      const value = expected.fields[name] ?? "";
      if (
        typeof value !== "string" ||
        normalize(field.getText() ?? "") !== normalize(value)
      ) {
        throw new Error(
          `Form 8835 Form 7220 ${name} differs from reviewed payroll`,
        );
      }
    } else if (field instanceof PDFCheckBox) {
      if (field.isChecked() !== (expected.fields[name] ?? false)) {
        throw new Error(
          `Form 8835 Form 7220 ${name} differs from reviewed answer`,
        );
      }
    } else throw new Error("Form 8835 Form 7220 has an unsupported field type");
  }
  for (const name of Object.keys(expected.fields)) {
    if (!names.has(name)) {
      throw new Error(`Form 8835 Form 7220 missing canonical field ${name}`);
    }
  }
}
