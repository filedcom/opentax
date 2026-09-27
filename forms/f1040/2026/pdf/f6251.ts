import { PDFDocument, StandardFonts } from "pdf-lib";
import type { PdfFieldEntry } from "../../pdf/form-descriptor.ts";
import { irsForm6251Pdf2026 } from "./forms/f6251.ts";

const pinnedDraft = new URL(
  "../../../../docs/ty2026/corpus/draft/f6251.pdf",
  import.meta.url,
);
const pinnedDraftSha256 =
  "a547fc9d629e1f04bdc30e088214c716667b88cb1b45447c580c0ae33095b5cc";

type Filer = { name: string; ssn: string };

function amount(fields: Record<string, unknown>, key: string): number {
  const value = fields[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`TY2026 Form 6251 PDF needs ${key}`);
  }
  return value;
}

function optionalAmount(fields: Record<string, unknown>, key: string): number {
  return fields[key] === undefined ? 0 : amount(fields, key);
}

function validate(
  form6251: Record<string, unknown>,
  f1040: Record<string, unknown>,
  filer: Filer,
): number {
  if (!filer.name.trim() || !filer.ssn.trim()) {
    throw new Error("TY2026 Form 6251 PDF needs filer name and SSN");
  }
  const line1a = amount(f1040, "line11b_agi") -
    amount(form6251, "regular_tax_income");
  if (line1a < 0) {
    throw new Error("TY2026 Form 6251 line 1a deduction is negative");
  }
  const line2c = optionalAmount(form6251, "line2c_investment_interest");
  const expectedAmti = amount(form6251, "regular_tax_income") +
    optionalAmount(form6251, "line2a_taxes_paid") + line2c +
    optionalAmount(form6251, "nol_adjustment") +
    optionalAmount(form6251, "private_activity_bond_interest") +
    optionalAmount(form6251, "qsbs_adjustment") +
    optionalAmount(form6251, "iso_adjustment") +
    optionalAmount(form6251, "depreciation_adjustment") +
    optionalAmount(form6251, "other_adjustments");
  if (
    expectedAmti !== amount(form6251, "amti") ||
    Math.max(0, expectedAmti - amount(form6251, "exemption")) !==
      amount(form6251, "taxable_excess") ||
    Math.max(
        0,
        amount(form6251, "tentative_tax") -
          optionalAmount(form6251, "amtftc"),
      ) !== amount(form6251, "net_tmt") ||
    Math.max(
        0,
        amount(form6251, "net_tmt") - amount(form6251, "regular_tax"),
      ) !== amount(form6251, "line11_amt")
  ) {
    throw new Error("TY2026 Form 6251 PDF lines do not reconcile");
  }
  const expectedRegularTax = Math.max(
    0,
    amount(f1040, "line16_income_tax") -
      optionalAmount(form6251, "form4972_tax") +
      optionalAmount(form6251, "schedule2_line1z_tax") -
      optionalAmount(form6251, "schedule3_line1_foreign_tax_credit") -
      optionalAmount(form6251, "form8978_negative_line14"),
  );
  if (expectedRegularTax !== amount(form6251, "regular_tax")) {
    throw new Error("TY2026 Form 6251 line 10 disagrees with Form 1040");
  }
  if (
    amount(form6251, "line11_amt") === 0 &&
    form6251.must_file_for_credit !== true
  ) {
    throw new Error("TY2026 Form 6251 PDF has no filing trigger");
  }
  if (
    form6251.line12 !== undefined &&
    amount(form6251, "line40") !== amount(form6251, "tentative_tax")
  ) {
    throw new Error("TY2026 Form 6251 Part III disagrees with line 7");
  }
  return line1a;
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

/** Fill both printed pages of the pinned TY2026 draft Form 6251. */
export async function buildForm6251PdfBytes2026(
  form6251: Record<string, unknown>,
  f1040: Record<string, unknown>,
  filer: Filer,
): Promise<Uint8Array> {
  const line1a = validate(form6251, f1040, filer);
  const source = await Deno.readFile(pinnedDraft);
  const hash = [
    ...new Uint8Array(await crypto.subtle.digest("SHA-256", source)),
  ]
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (hash !== pinnedDraftSha256) {
    throw new Error("Pinned TY2026 draft Form 6251 hash changed");
  }
  const draft = await PDFDocument.load(source, { ignoreEncryption: true });
  const form = draft.getForm();
  const values: Record<string, unknown> = {
    ...form6251,
    filer_name: filer.name,
    filer_ssn: filer.ssn,
    line1a_deductions_excluding_schedule1a_43: line1a,
    line2f_atnold_print: Math.abs(optionalAmount(form6251, "nol_adjustment")),
  };
  for (const entry of irsForm6251Pdf2026.fields) {
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
