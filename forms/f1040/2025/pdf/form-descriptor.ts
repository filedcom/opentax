export type PdfFieldEntry =
  | { readonly kind: "text";     readonly domainKey: string; readonly pdfField: string }
  | { readonly kind: "checkbox"; readonly domainKey: string; readonly pdfField: string }
  | { readonly kind: "radio";    readonly domainKey: string; readonly pdfField: string; readonly valueMap: Readonly<Record<string, string>> };

export interface PdfRowDescriptor {
  readonly domainKey: string;
  readonly maxRows: number;
  /**
   * Number of PDF fields consumed per row. Required when rowFields use
   * `{field_num}` in pdfFieldPattern to compute sequential field numbers.
   * The builder computes: fieldNum = fieldNumBase + rowIndex * rowStride.
   */
  readonly rowStride?: number;
  readonly rowFields: ReadonlyArray<{
    readonly kind: "text" | "checkbox";
    readonly domainKey: string;
    /**
     * PDF field name pattern. Supports two placeholders:
     *   {row}       — replaced with the 1-based row number (e.g. "Row1[0]")
     *   {field_num} — replaced with fieldNumBase + rowIndex * rowStride
     *                 (used for forms with sequential field numbering like 8949)
     */
    readonly pdfFieldPattern: string;
    /**
     * Base field number at row 1. Required when pdfFieldPattern contains
     * {field_num}. The builder computes the actual number as:
     *   fieldNumBase + rowIndex * rowStride
     */
    readonly fieldNumBase?: number;
  }>;
}

export interface PdfFormDescriptor {
  readonly pendingKey: string;
  readonly pdfUrl: string;
  readonly fields: ReadonlyArray<PdfFieldEntry>;
  readonly filerFields?: ReadonlyArray<PdfFieldEntry>;
  readonly rows?: PdfRowDescriptor;
}
