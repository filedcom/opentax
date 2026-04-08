export type PdfFieldEntry =
  | { readonly kind: "text";     readonly domainKey: string; readonly pdfField: string }
  | { readonly kind: "checkbox"; readonly domainKey: string; readonly pdfField: string }
  | { readonly kind: "radio";    readonly domainKey: string; readonly pdfField: string; readonly valueMap: Readonly<Record<string, string>> };

export interface PdfRowDescriptor {
  readonly domainKey: string;
  readonly maxRows: number;
  readonly rowFields: ReadonlyArray<{
    readonly kind: "text" | "checkbox";
    readonly domainKey: string;
    readonly pdfFieldPattern: string;
  }>;
}

export interface PdfFormDescriptor {
  readonly pendingKey: string;
  readonly pdfUrl: string;
  readonly fields: ReadonlyArray<PdfFieldEntry>;
  readonly filerFields?: ReadonlyArray<PdfFieldEntry>;
  readonly rows?: PdfRowDescriptor;
}
