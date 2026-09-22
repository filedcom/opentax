export type PdfFieldEntry =
  /** `printZero` prints an explicit "0" instead of the default blank-when-zero convention
   *  (used for lines like Form 8606 line 2 where 0 is a meaningful declared value). */
  | { readonly kind: "text";         readonly domainKey: string; readonly pdfField: string; readonly extraPdfFields?: readonly string[]; readonly printZero?: boolean }
  | { readonly kind: "checkbox";     readonly domainKey: string; readonly pdfField: string; readonly extraPdfFields?: readonly string[] }
  /** Checks the box only when the domain value equals `whenValue` (string comparison). */
  | { readonly kind: "checkboxWhen"; readonly domainKey: string; readonly pdfField: string; readonly whenValue: string }
  | { readonly kind: "radio";        readonly domainKey: string; readonly pdfField: string; readonly valueMap: Readonly<Record<string, string>> };

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
  /**
   * Optional gate: render the form only when this domain key holds a value.
   * For forms whose pending slot also collects context deposited on every
   * return (e.g. Form 1116's §904 limitation inputs).
   */
  readonly presenceKey?: string;
  /**
   * Optional instance expansion for forms that must be filed once per item or
   * category. Each returned object is rendered as a separate copy of the PDF.
   */
  readonly instances?: (
    fields: Record<string, unknown>,
  ) => ReadonlyArray<Record<string, unknown>>;
  readonly fields: ReadonlyArray<PdfFieldEntry>;
  readonly filerFields?: ReadonlyArray<PdfFieldEntry>;
  readonly rows?: PdfRowDescriptor;
  /**
   * Inclusion gate evaluated against the form's pending fields. When provided,
   * the form is only emitted if this returns true. Used for forms that are
   * only filed when a condition is met (e.g. Schedule B only above $1,500,
   * Form 8880 only when the credit is nonzero).
   *
   * The second argument is the full normalized pending dict, for gates that
   * depend on a downstream computed value (e.g. Schedule SE only when
   * Schedule 2 carries SE tax; Form 6251 only when AMT is actually due).
   */
  readonly includeWhen?: (
    fields: Record<string, unknown>,
    allPending?: Record<string, Record<string, unknown>>,
  ) => boolean;
}
