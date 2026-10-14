import {
  PDFDocument,
  PDFTextField,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import type { SourceDocumentBytes } from "../../../../../../../core/runtime/source-documents.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { FilingStatus } from "../../../../../mef/header.ts";
import { sha256Hex } from "../../../../return-processing/prepared-source.ts";
import { stageForm8801NativeDocument } from "./form8801_staged_native.ts";

export const FORM8801_2025_TEMPLATE_SHA256 =
  "b82dff67ecf37406bab02f177c706295bd6084853a9ba8be5c87a35c74668a78";

export function form8801PdfFieldForLine(line: number): string {
  if (!Number.isInteger(line) || line < 1 || line > 55) {
    throw new Error("Unknown Form 8801 PDF line");
  }
  const page = line <= 15 ? 1 : line <= 26 ? 2 : line <= 42 ? 3 : 4;
  const field = page === 1 ? line + 2 : line - [0, 0, 15, 26, 42][page];
  return `topmostSubform[0].Page${page}[0].f${page}_${field}[0]`;
}

/** Interactive source-derived review document; no registry admits this route.
 * Every line comes from byte-bound review and settled public return amounts. */
export async function stageForm8801PdfDocument(
  rawInputs: Readonly<Record<string, unknown>>,
  rawBinding: unknown,
  sourceDocuments: readonly SourceDocumentBytes[],
  canonicalTemplate: Uint8Array,
) {
  const inputs = structuredClone(rawInputs);
  const binding = structuredClone(rawBinding);
  const documents = sourceDocuments.map((d) => ({
    reference: d.reference,
    bytes: new Uint8Array(d.bytes),
  }));
  const template = new Uint8Array(canonicalTemplate);
  if (await sha256Hex(template) !== FORM8801_2025_TEMPLATE_SHA256) {
    throw new Error("Form 8801 review PDF needs the verified TY2025 template");
  }
  const result = await stageForm8801NativeDocument(inputs, binding, documents);
  const values: Record<string, string> = {};
  if (!result.fileRequired) {
    return {
      ...result,
      pdf_bytes: undefined,
      pdf_field_values: values,
      canonicalTemplateVerified: true as const,
      filingReady: false as const,
    };
  }
  const filer = extractFilerIdentity(result.projected_pending.general ?? {});
  if (!filer?.firstName || !filer.lastName || !filer.fullName) {
    throw new Error("Form 8801 PDF needs finalized filer names");
  }
  let name = filer.fullName;
  if (filer.filingStatus === FilingStatus.MarriedFilingJointly) {
    if (!filer.spouse?.firstName || !filer.spouse.lastName) {
      throw new Error("Form 8801 joint PDF needs both finalized filer names");
    }
    name += " and " +
      [
        filer.spouse.firstName,
        filer.spouse.middleInitial,
        filer.spouse.lastName,
      ].filter(Boolean).join(" ");
  }
  const pdf = await PDFDocument.load(template);
  if (pdf.getPageCount() !== 4) {
    throw new Error("Unexpected Form 8801 template pages");
  }
  const form = pdf.getForm();
  if (
    form.getFields().length !== 57 ||
    form.getFields().some((field) => !(field instanceof PDFTextField))
  ) {
    throw new Error("Unexpected Form 8801 template fields");
  }
  for (const field of form.getFields()) (field as PDFTextField).setText("");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  form.updateFieldAppearances(font);
  if (result.lines[27] === undefined) {
    for (const field of form.getFields()) {
      if (/\.Page[34]\[0\]\./.test(field.getName())) form.removeField(field);
    }
    pdf.removePage(3);
    pdf.removePage(2);
  }
  const write = (fieldName: string, value: string, numeric: boolean) => {
    const field = form.getTextField(fieldName);
    const width = field.acroField.getWidgets()[0].getRectangle().width - 4;
    const fontSize = Math.min(
      10,
      width / Math.max(1, font.widthOfTextAtSize(value, 1)),
    );
    if (fontSize < 6) {
      throw new Error("Form 8801 PDF value cannot fit its field");
    }
    field.setFontSize(fontSize);
    field.setAlignment(numeric ? TextAlignment.Right : TextAlignment.Left);
    field.setText(value);
    values[fieldName] = value;
  };
  write("topmostSubform[0].Page1[0].f1_1[0]", name, false);
  write("topmostSubform[0].Page1[0].f1_2[0]", filer.primarySSN, false);
  for (const [line, amount] of Object.entries(result.lines)) {
    write(form8801PdfFieldForLine(Number(line)), String(amount), true);
  }
  form.updateFieldAppearances(font);
  return {
    ...result,
    pdf_bytes: await pdf.save(),
    pdf_field_values: values,
    canonicalTemplateVerified: true as const,
    filingReady: false as const,
  };
}
