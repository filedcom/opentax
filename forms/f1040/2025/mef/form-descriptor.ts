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
export interface MefFormDescriptor<
  TKey extends string,
  TFields,
  TResult extends string | readonly string[] = string,
> {
  /** Key used in the MefFormsPending dict (e.g. "form982", "schedule_d"). */
  readonly pendingKey: TKey;
  /** Pending source keys that trigger a derived document. */
  readonly sourcePendingKeys?: readonly string[];
  /**
   * Mapping from pending field names to XML element names.
   * Empty array for forms with non-standard builders (e.g. form8949).
   */
  readonly FIELD_MAP: ReadonlyArray<readonly [string, string]>;
  /** URL to the official IRS PDF for reference. */
  readonly pdfUrl: string;
  /** Build one or more XML fragments from this form's own pending slice. */
  build(
    fields: TFields,
    context?: MefBuildContext,
  ): TResult;
  /** Create any PDF files this form requires in the return bundle. */
  buildBinaryAttachments?(
    fields: TFields,
    context?: MefBuildContext,
  ): Promise<ReadonlyArray<MefPdfAttachment>>;
}
import type { FilerIdentity } from "../../mef/header.ts";
import type { Form3800DocumentParts } from "./forms/f3800_document.ts";

export interface MefBuildContext {
  readonly filer?: FilerIdentity;
  /** Read-only full pending graph for cross-document reconciliation. */
  readonly pending?: Readonly<Record<string, unknown>>;
  readonly binaryAttachmentFileNames?: readonly string[];
  readonly documentIdsByPendingKey?: Readonly<
    Record<string, readonly string[]>
  >;
  /** IDs grouped by exact IRS XML root, for references to one document type. */
  readonly documentIdsByTag?: Readonly<Record<string, readonly string[]>>;
  readonly documentIdsByAttachmentFileName?: Readonly<Record<string, string>>;
  readonly attachmentDescriptionsByFileName?: Readonly<Record<string, string>>;
  /** SHA-256 of each validated PDF's exact submitted bytes, lowercase hex. */
  readonly attachmentSha256ByFileName?: Readonly<Record<string, string>>;
  /** Capture the exact validated Form 3800 parts serialized by this pass. */
  readonly onPreparedForm3800?: (parts: Form3800DocumentParts) => void;
}

export interface MefPdfAttachment {
  readonly fileName: string;
  readonly description: string;
  readonly bytes: Uint8Array;
}
