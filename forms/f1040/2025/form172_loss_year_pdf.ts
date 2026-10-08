import {
  PDFDocument,
  PDFTextField,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import type { SourceDocumentBytes } from "../../../core/runtime/source-documents.ts";
import { sha256Hex } from "./prepared-source.ts";
import { stageForm172LossYearNativeDocument } from "./form172_loss_year_native.ts";

export const FORM172_TEMPLATE_SHA256 =
  "5e11c7acd788ce5681cd921a4bc75b5368b4e2385f79eaf62f7be278db13e749";
const prefix = "topmostSubform[0].Page1[0].";
export function form172PdfPartIField(line: number): string {
  if (!Number.isInteger(line) || line < 1 || line > 24) {
    throw new Error("Unknown Form 172 Part I PDF line");
  }
  const group: Record<number, string> = {
    5: "Line5_ReadOrder[0].",
    7: "Line7_ReadOrder[0].",
    10: "Line10_ReadOrder[0].",
    12: "Line12_ReadOrder[0].",
  };
  return `${prefix}${group[line] ?? ""}f1_${
    String(line + 15).padStart(2, "0")
  }[0]`;
}

/** Interactive current-origin review PDF, recomputed from the same retained
 * package as native Part I. Part II stays blank; no filing registry admits it. */
export async function stageForm172LossYearPdfDocument(
  rawBinding: unknown,
  rawDocuments: readonly SourceDocumentBytes[],
  canonicalTemplate: Uint8Array,
) {
  const binding = structuredClone(rawBinding);
  const documents = rawDocuments.map((d) => ({
    reference: d.reference,
    bytes: new Uint8Array(d.bytes),
  }));
  const template = new Uint8Array(canonicalTemplate);
  if (await sha256Hex(template) !== FORM172_TEMPLATE_SHA256) {
    throw new Error("Form 172 needs the verified canonical template");
  }
  const result = await stageForm172LossYearNativeDocument(binding, documents);
  const values: Record<string, string> = {};
  if (!result.native_xml) {
    return {
      ...result,
      pdf_bytes: undefined,
      pdf_field_values: values,
      canonicalTemplateVerified: true as const,
      filingReady: false as const,
    };
  }
  const identity = result.reviewed_loss_year.pdf_identity;
  if (!identity) {
    throw new Error("Form 172 PDF needs byte-bound names and address");
  }
  const pdf = await PDFDocument.load(template);
  if (pdf.getPageCount() !== 3) {
    throw new Error("Unexpected Form 172 template pages");
  }
  const form = pdf.getForm();
  const fields = form.getFields();
  if (
    fields.length !== 109 || fields.some((f) => !(f instanceof PDFTextField))
  ) throw new Error("Unexpected Form 172 canonical field tree");
  for (const field of fields) (field as PDFTextField).setText("");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const write = (name: string, value: string, numeric = false) => {
    const field = form.getTextField(name),
      widgets = field.acroField.getWidgets();
    if (widgets.length !== 1) {
      throw new Error("Unexpected Form 172 widget count");
    }
    const width = widgets[0].getRectangle().width - 4;
    const fontSize = Math.min(
      10,
      width / Math.max(1, font.widthOfTextAtSize(value, 1)),
    );
    if (fontSize < 6) {
      throw new Error("Form 172 PDF value cannot fit its field");
    }
    field.setFontSize(fontSize);
    field.setAlignment(numeric ? TextAlignment.Right : TextAlignment.Left);
    field.setText(value);
    values[name] = value;
  };
  write(prefix + "f1_01[0]", String(result.taxYear));
  let name = [
    identity.taxpayer_first_name,
    identity.taxpayer_middle_initial,
    identity.taxpayer_last_name,
  ].filter(Boolean).join(" ");
  if (result.spouseSsn) {
    name += " and " +
      [
        identity.spouse_first_name,
        identity.spouse_middle_initial,
        identity.spouse_last_name,
      ].filter(Boolean).join(" ");
  }
  write(prefix + "f1_04[0]", name);
  write(prefix + "SSN_ReadOrder[0].f1_05[0]", result.taxpayerSsn);
  if (result.spouseSsn) {
    write(prefix + "SSN_ReadOrder[0].f1_06[0]", result.spouseSsn);
  }
  const address = identity.address;
  write(prefix + "f1_07[0]", address.line1);
  if (address.line2) write(prefix + "f1_08[0]", address.line2);
  write(prefix + "f1_09[0]", address.city);
  if (address.type === "us") {
    write(prefix + "f1_10[0]", address.state);
    write(prefix + "f1_11[0]", address.zip);
  } else {
    write(prefix + "f1_13[0]", address.country_name);
    if (address.province) write(prefix + "f1_14[0]", address.province);
    if (address.postal_code) write(prefix + "f1_15[0]", address.postal_code);
  }
  if (identity.daytime_phone) {
    write(prefix + "f1_12[0]", identity.daytime_phone);
  }
  // Paper skip instructions differ from the schema's mandatory zero line 21.
  for (const [line, amount] of Object.entries(result.lines)) {
    write(form172PdfPartIField(Number(line)), String(amount), true);
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
