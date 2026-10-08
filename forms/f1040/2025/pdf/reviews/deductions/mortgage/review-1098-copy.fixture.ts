import { PDFDocument, StandardFonts } from "pdf-lib";
import { sha256Hex } from "../../../../return-processing/prepared-source.ts";

/** Constructed Copy B uses the official page and printable widgets; no issuer authentication. */
export async function canonicalForm1098CopyDocument(): Promise<PDFDocument> {
  const path = ".pdf-cache/form1098-2025-printable-source.pdf";
  let bytes: Uint8Array;
  try {
    bytes = await Deno.readFile(path);
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
    const response = await fetch(
      "https://www.irs.gov/pub/irs-prior/f1098--2025.pdf",
    );
    if (!response.ok) {
      throw Error(`Form1098 canonical template HTTP ${response.status}`);
    }
    bytes = new Uint8Array(await response.arrayBuffer());
    await Deno.mkdir(".pdf-cache", { recursive: true });
    await Deno.writeFile(path, bytes);
  }
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  const form = pdf.getForm();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  form.updateFieldAppearances(font);
  const prefix = "topmostSubform[0].CopyB[0]";
  const keep = new Set([
    `${prefix}.CopyHeader[0].CalendarYear[0].f2_1[0]`,
    `${prefix}.LeftCol[0].f2_2[0]`,
    `${prefix}.LeftCol[0].f2_4[0]`,
    ...[11, 12, 13, 14, 15, 16].map((n) => `${prefix}.RightCol[0].f2_${n}[0]`),
  ]);
  for (const field of form.getFields()) {
    if (!keep.has(field.getName())) form.removeField(field);
  }
  for (let page = pdf.getPageCount() - 1; page >= 0; page--) {
    if (page !== 2) pdf.removePage(page);
  }
  return pdf;
}

interface Form1098CopySource {
  readonly lender_name: string;
  readonly recipient_tin: string;
  readonly source_document_reference: string;
  readonly box1_mortgage_interest: number;
  readonly box2_outstanding_principal?: number;
  readonly box3_origination_date?: string;
  readonly box4_refund_overpaid?: number;
  readonly box5_mip?: number;
  readonly box6_points_paid?: number;
}

/** Synthetic, byte-bound 2025 issuer Copy B for filled-return review only. */
export async function withSyntheticForm1098Copy<T extends Form1098CopySource>(
  caseId: string,
  source: T,
): Promise<
  T & {
    issuer_copy: {
      file_name: string;
      pdf_sha256: string;
      bytes: Uint8Array;
    };
  }
> {
  const pdf = await canonicalForm1098CopyDocument();
  const form = pdf.getForm();
  const prefix = "topmostSubform[0].CopyB[0]";
  const values: Record<string, string> = {
    [`${prefix}.CopyHeader[0].CalendarYear[0].f2_1[0]`]: "25",
    [`${prefix}.LeftCol[0].f2_2[0]`]:
      `${source.lender_name}\n${source.source_document_reference}`,
    [`${prefix}.LeftCol[0].f2_4[0]`]: `***-**-${
      source.recipient_tin.replace(/\D/g, "").slice(-4)
    }`,
    [`${prefix}.RightCol[0].f2_11[0]`]: String(source.box1_mortgage_interest),
    [`${prefix}.RightCol[0].f2_12[0]`]:
      source.box2_outstanding_principal?.toString() ?? "",
    [`${prefix}.RightCol[0].f2_13[0]`]: source.box3_origination_date ?? "",
    [`${prefix}.RightCol[0].f2_14[0]`]:
      source.box4_refund_overpaid?.toString() ?? "",
    [`${prefix}.RightCol[0].f2_15[0]`]: source.box5_mip?.toString() ?? "",
    [`${prefix}.RightCol[0].f2_16[0]`]: source.box6_points_paid?.toString() ??
      "",
  };
  for (const [name, value] of Object.entries(values)) {
    form.getTextField(name).setText(value);
  }
  const bytes = await pdf.save();
  return {
    ...source,
    issuer_copy: {
      file_name: `${caseId}-Form1098-CopyB.pdf`,
      pdf_sha256: await sha256Hex(bytes),
      bytes,
    },
  };
}
