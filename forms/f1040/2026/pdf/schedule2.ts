import { PDFDocument, StandardFonts } from "pdf-lib";
import type { PdfFieldEntry } from "../../pdf/form-descriptor.ts";
import {
  calculateSchedule2_2026,
  type Schedule2Input2026,
  schedule2Input2026Schema,
} from "../schedule2.ts";
import { irsSchedule2Pdf2026 } from "./forms/schedule2.ts";

const pinnedDraft = new URL(
  "../../../../docs/ty2026/corpus/draft/f1040s2.pdf",
  import.meta.url,
);
const pinnedDraftSha256 =
  "0e3d4faa4b96f692bc31119d2c86189c3d8b9263e8f3aaaf7c3da371887ebc56";

type Filer = { name: string; ssn: string };

function amount(fields: Record<string, unknown>, key: string): number {
  const value = fields[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`TY2026 Schedule 2 PDF needs ${key}`);
  }
  return value;
}

function validate(rawFields: Record<string, unknown>, filer: Filer): void {
  if (!filer.name.trim() || !filer.ssn.trim()) {
    throw new Error("TY2026 Schedule 2 PDF needs filer name and SSN");
  }
  const input = Object.fromEntries(
    Object.keys(schedule2Input2026Schema.shape).map((key) => [
      key,
      rawFields[key],
    ]),
  ) as Schedule2Input2026;
  const totals = calculateSchedule2_2026(input);
  for (const [key, expected] of Object.entries(totals)) {
    if (amount(rawFields, key) !== expected) {
      throw new Error(`TY2026 Schedule 2 PDF ${key} does not reconcile`);
    }
  }
  if (
    totals.line3_part1_tax === 0 && totals.line21_total_additional_taxes === 0
  ) {
    throw new Error("TY2026 Schedule 2 PDF has no filed tax");
  }
  for (
    const key of [
      "line1e_excessive_payment",
      "line1f_twenty_percent_excessive_payment",
      "line1y_other_additions",
      "line13a_other_credit_recapture",
      "line13z_other_income_taxes",
    ]
  ) {
    if ((input[key as keyof Schedule2Input2026] ?? 0) > 0) {
      throw new Error(
        `TY2026 Schedule 2 PDF needs the description/election for ${key}`,
      );
    }
  }
}

function fillField(
  form: ReturnType<PDFDocument["getForm"]>,
  entry: PdfFieldEntry,
  value: unknown,
): void {
  if (entry.kind !== "text" || value === undefined || value === null) return;
  if (typeof value === "number" && Math.round(value) === 0) return;
  form.getTextField(entry.pdfField).setText(
    typeof value === "number" ? String(Math.round(value)) : String(value),
  );
}

/** Fill the two printed pages of the pinned TY2026 draft Schedule 2. */
export async function buildSchedule2PdfBytes2026(
  rawFields: Record<string, unknown>,
  filer: Filer,
): Promise<Uint8Array> {
  validate(rawFields, filer);
  const source = await Deno.readFile(pinnedDraft);
  const hash = [
    ...new Uint8Array(await crypto.subtle.digest("SHA-256", source)),
  ]
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (hash !== pinnedDraftSha256) {
    throw new Error("Pinned TY2026 draft Schedule 2 hash changed");
  }
  const draft = await PDFDocument.load(source, { ignoreEncryption: true });
  const form = draft.getForm();
  const values: Record<string, unknown> = {
    ...rawFields,
    filer_name: filer.name,
    filer_ssn: filer.ssn,
  };
  for (const entry of irsSchedule2Pdf2026.fields) {
    fillField(form, entry, values[entry.domainKey]);
  }
  const font = await draft.embedFont(StandardFonts.Helvetica);
  form.updateFieldAppearances(font);
  form.flatten();

  const document = await PDFDocument.create();
  const pages = await document.copyPages(draft, [1, 2]);
  for (const page of pages) document.addPage(page);
  return document.save();
}
