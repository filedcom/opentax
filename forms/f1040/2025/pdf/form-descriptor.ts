export interface PdfFormDescriptor {
  readonly pendingKey: string;
  readonly pdfUrl: string;
  /** Maps domain field name → IRS AcroForm field name in the PDF. */
  readonly PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]>;
}
