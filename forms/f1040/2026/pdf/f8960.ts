import { PDFDocument, StandardFonts } from "pdf-lib";
import { irsForm8960Pdf2026 } from "./forms/f8960.ts";

const pinnedDraft = new URL(
  "../../../../docs/ty2026/corpus/draft/f8960.pdf",
  import.meta.url,
);
const pinnedDraftSha256 =
  "2306f4f334a8b3b1ed73fd5045dec86eed194902923462bf485431c756f66982";

type Filer = { name: string; ssn: string };

function amount(fields: Record<string, unknown>, key: string): number {
  const value = fields[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`TY2026 Form 8960 PDF needs ${key}`);
  }
  return value;
}

function validate(fields: Record<string, unknown>, filer: Filer): void {
  if (!filer.name.trim() || !filer.ssn.trim()) {
    throw new Error("TY2026 Form 8960 PDF needs filer name and SSN");
  }
  for (const entry of irsForm8960Pdf2026.fields) {
    if (entry.domainKey.startsWith("line")) amount(fields, entry.domainKey);
  }
  const get = (key: string) => amount(fields, key);
  if (
    get("line4c_combined") !==
      get("line4a_passive_income") + get("line4b_rental_net") ||
    get("line5d_combined") !==
      get("line5a_net_gain") + get("line5b_net_gain_adjustment") ||
    get("line8_total_investment_income") !==
      get("line1_taxable_interest") + get("line2_ordinary_dividends") +
        get("line3_annuities") + get("line4c_combined") +
        get("line5d_combined") + get("line7_other_modifications") ||
    get("line9d_total_expenses") !==
      get("line9a_investment_interest_expense") +
        get("line9b_state_local_tax") ||
    get("line11_total_deductions") !==
      get("line9d_total_expenses") + get("line10_additional_modifications") ||
    get("line12_net_investment_income") !==
      Math.max(
        0,
        get("line8_total_investment_income") -
          get("line11_total_deductions"),
      ) ||
    get("line15_magi_excess") !==
      Math.max(0, get("line13_magi") - get("line14_threshold")) ||
    get("line16_taxable_base") !==
      Math.min(
        get("line12_net_investment_income"),
        get("line15_magi_excess"),
      ) ||
    get("line17_niit") !==
      Math.round(get("line16_taxable_base") * 0.038 * 100) / 100 ||
    get("line17_niit") <= 0
  ) {
    throw new Error("TY2026 Form 8960 PDF lines do not reconcile");
  }
}

/** Fill the individual page of the pinned TY2026 draft Form 8960. */
export async function buildForm8960PdfBytes2026(
  fields: Record<string, unknown>,
  filer: Filer,
): Promise<Uint8Array> {
  validate(fields, filer);
  const source = await Deno.readFile(pinnedDraft);
  const hash = [
    ...new Uint8Array(await crypto.subtle.digest("SHA-256", source)),
  ]
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (hash !== pinnedDraftSha256) {
    throw new Error("Pinned TY2026 draft Form 8960 hash changed");
  }
  const draft = await PDFDocument.load(source, { ignoreEncryption: true });
  const form = draft.getForm();
  const values: Record<string, unknown> = {
    ...fields,
    filer_name: filer.name,
    filer_ssn: filer.ssn,
  };
  for (const entry of irsForm8960Pdf2026.fields) {
    if (entry.kind !== "text") continue;
    const value = values[entry.domainKey];
    if (typeof value === "number" && Math.round(value) === 0) continue;
    form.getTextField(entry.pdfField).setText(
      typeof value === "number" ? String(Math.round(value)) : String(value),
    );
  }
  form.updateFieldAppearances(await draft.embedFont(StandardFonts.Helvetica));
  form.flatten();
  const document = await PDFDocument.create();
  document.addPage((await document.copyPages(draft, [1]))[0]);
  return document.save();
}
