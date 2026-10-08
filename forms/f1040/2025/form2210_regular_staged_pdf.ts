import { PDFCheckBox, PDFDocument, PDFTextField, StandardFonts } from "pdf-lib";
import { extractFilerIdentity } from "../mef/filer.ts";
import { roundWholeDollars } from "../whole-dollars.ts";
import { f1040_2025 } from "./index.ts";
import { normalizeAllPending } from "./pending.ts";
import { sha256Hex } from "./prepared-source.ts";
import { stageForm2210RegularNativeDocument } from "./form2210_regular_staged_native.ts";

export const FORM2210_2025_TEMPLATE_SHA256 =
  "6899ce672648b280bf00ab47200f1b0fbf40368cfbf137df507b945b8577159a";

/** Source-derived interactive review PDF only. Neither registry invokes this
 * API; it does not insert a final-return penalty or authorize filing. */
export async function stageForm2210RegularPdfDocument(
  rawReturnInputs: Readonly<Record<string, unknown>>,
  rawPaymentLedger: unknown,
  priorReturnDocuments: ReadonlyArray<{ reference: string; bytes: Uint8Array }>,
  canonicalTemplate: Uint8Array,
) {
  // Own every fact/byte before template hashing or source verification awaits.
  const inputs = structuredClone(rawReturnInputs);
  const ledger = structuredClone(rawPaymentLedger);
  const documents = priorReturnDocuments.map((d) => ({
    reference: d.reference,
    bytes: new Uint8Array(d.bytes),
  }));
  const template = new Uint8Array(canonicalTemplate);
  if (await sha256Hex(template) !== FORM2210_2025_TEMPLATE_SHA256) {
    throw new Error("Form 2210 review PDF needs the verified TY2025 template");
  }
  const result = await stageForm2210RegularNativeDocument(
    inputs,
    ledger,
    documents,
  );
  const pending = normalizeAllPending(f1040_2025.executeReturn(inputs).pending);
  const filer = extractFilerIdentity(pending.general);
  if (!filer?.fullName || !filer.spouse?.firstName || !filer.spouse.lastName) {
    throw new Error("Form 2210 joint PDF needs both finalized filer names");
  }
  const spouseName = [
    filer.spouse.firstName,
    filer.spouse.middleInitial,
    filer.spouse.lastName,
  ].filter(Boolean).join(" ");
  const pdf = await PDFDocument.load(template);
  if (pdf.getPageCount() !== 3) {
    throw new Error("Unexpected Form 2210 template pages");
  }
  const form = pdf.getForm();
  for (const field of form.getFields()) {
    if (field instanceof PDFTextField) field.setText("");
    else if (field instanceof PDFCheckBox) field.uncheck();
  }
  // Some blank IRS widgets lack an /AP /N stream. pdf-lib's removeField
  // requires it even for a page we will discard; synthesize blank appearances
  // before removing Schedule AI's fields and page.
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  form.updateFieldAppearances(font);
  for (const field of form.getFields()) {
    if (field.getName().includes(".Page3[0].")) form.removeField(field);
  }
  pdf.removePage(2); // Schedule AI is not applicable to this regular branch.
  const values: Record<string, string | boolean> = {};
  const page1 = "topmostSubform[0].Page1[0]";
  const page2 = "topmostSubform[0].Page2[0]";
  const text = (name: string, value: string | number) => {
    const content = typeof value === "number"
      ? String(roundWholeDollars(value))
      : value;
    const field = form.getTextField(name);
    field.setFontSize(10);
    field.setText(content);
    values[name] = content;
  };
  const check = (name: string) => {
    form.getCheckBox(name).check();
    values[name] = true;
  };
  text(`${page1}.f1_1[0]`, `${filer.fullName} and ${spouseName}`);
  text(`${page1}.f1_2[0]`, filer.primarySSN);
  for (let line = 1; line <= 9; line++) {
    text(
      `${page1}.f1_${line + 2}[0]`,
      result
        .filed_lines[
          `line${line}` as keyof typeof result.filed_lines
        ] as number,
    );
  }
  check(`${page1}.c1_1[1]`); // Line 9 exceeds withholding: Yes.
  check(`${page1}.c1_5[0]`); // D: beneficial actual withholding dates.
  check(`${page1}.c1_6[0]`); // E: changed joint status.
  for (
    const [column, amounts] of result.actual_payment_worksheet.columns.entries()
  ) {
    for (let line = 10; line <= 18; line++) {
      if (column === 0 && [12, 13, 14, 16].includes(line)) continue;
      if (column === 3 && [16, 18].includes(line)) continue;
      // Follow the printed line 17/18 alternatives rather than placing a
      // computed zero in the branch the form instructs the filer to skip.
      if (line === 17 && amounts.line15 > amounts.line10) continue;
      if (line === 18 && amounts.line15 <= amounts.line10) continue;
      const number = (line - 10) * 4 + column + 1;
      text(
        `${page2}.SectionATable[0].Line${line}[0].f2_${number}[0]`,
        amounts[`line${line}`] / 100,
      );
    }
  }
  text(`${page2}.f2_37[0]`, result.line19_penalty_dollars);
  form.updateFieldAppearances(font);
  return {
    ...result,
    pdf_bytes: await pdf.save(),
    pdf_field_values: values,
    canonicalTemplateVerified: true as const,
    filingReady: false as const,
  };
}
