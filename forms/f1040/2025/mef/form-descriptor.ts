/**
 * Descriptor interface for a single MEF form builder.
 *
 * Each form exports one constant of this type. The descriptor is self-contained:
 * it knows its pending key, its field map, and how to build XML from its own
 * slice of the pending dict — not the whole MefFormsPending object.
 *
 * Adding a new form only requires:
 *   1. Create the form file exporting a MefFormDescriptor constant.
 *   2. Add it to ALL_MEF_FORMS in forms/index.ts.
 */
export interface MefFormDescriptor<TKey extends string, TFields> {
  /** Key used in the MefFormsPending dict (e.g. "form982", "schedule_d"). */
  readonly pendingKey: TKey;
  /**
   * Mapping from pending field names to XML element names.
   * Empty array for forms with non-standard builders (e.g. form8949).
   */
  readonly FIELD_MAP: ReadonlyArray<readonly [string, string]>;
  /** URL to the official IRS PDF for reference. */
  readonly pdfUrl: string;
  /** Build the XML fragment from this form's own pending slice. */
  build(fields: TFields): string;
}
