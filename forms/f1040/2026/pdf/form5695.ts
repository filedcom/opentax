import { PDFDocument, StandardFonts } from "pdf-lib";
import { irsForm5695Pdf2026 } from "./forms/f5695.ts";

const pinnedDraft = new URL(
  "../../../../docs/ty2026/corpus/draft/f5695.pdf",
  import.meta.url,
);
const pinnedDraftSha256 =
  "f01a8e0555c804f5fd9460ba9e19172549f8c311661ab8d0107bd560f63ea586";

type Filer = { name: string; ssn: string };

function amount(fields: Record<string, unknown>, key: string): number {
  const value = fields[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`TY2026 Form 5695 PDF needs ${key}`);
  }
  return value;
}

/** Fill the pinned one-page 2026 Form 5695 carryforward draft. */
export async function buildForm5695PdfBytes2026(
  fields: Record<string, unknown>,
  schedule3: Record<string, unknown> | undefined,
  filer: Filer,
): Promise<Uint8Array> {
  if (!filer.name.trim() || !filer.ssn.trim()) {
    throw new Error("TY2026 Form 5695 PDF needs filer name and SSN");
  }
  const line1 = amount(fields, "line1_carryforward");
  const line2 = amount(fields, "line2_limit");
  const line3 = amount(fields, "line3_credit");
  const line4 = amount(fields, "line4_to_2027");
  if (line1 === 0) {
    throw new Error("TY2026 Form 5695 PDF needs prior-year carryforward");
  }
  if (
    line3 !== Math.min(line1, line2) || line4 !== line1 - line3 ||
    (schedule3?.line5a_residential_clean_energy ?? 0) !== line3
  ) {
    throw new Error("TY2026 Form 5695 PDF lines do not reconcile");
  }
  const source = await Deno.readFile(pinnedDraft);
  const hash = [
    ...new Uint8Array(await crypto.subtle.digest("SHA-256", source)),
  ]
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (hash !== pinnedDraftSha256) {
    throw new Error("Pinned TY2026 draft Form 5695 hash changed");
  }
  const draft = await PDFDocument.load(source, { ignoreEncryption: true });
  const form = draft.getForm();
  const values: Record<string, string | number> = {
    ...fields,
    filer_name: filer.name,
    filer_ssn: filer.ssn,
  } as Record<string, string | number>;
  for (const entry of irsForm5695Pdf2026.fields) {
    const value = values[entry.domainKey];
    if (value === undefined || entry.kind !== "text") continue;
    if (typeof value === "number" && Math.round(value) === 0) continue;
    form.getTextField(entry.pdfField).setText(
      typeof value === "number" ? String(Math.round(value)) : value,
    );
  }
  const font = await draft.embedFont(StandardFonts.Helvetica);
  form.updateFieldAppearances(font);
  form.flatten();
  const document = await PDFDocument.create();
  const [page] = await document.copyPages(draft, [1]);
  document.addPage(page);
  return document.save();
}
