import type { FilerIdentity } from "../../mef/header.ts";
import type { MefBundle } from "../../2025/mef/builder.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../2025/pdf/builder.ts";
import { ALL_PDF_FORMS } from "../../2025/pdf/forms/index.ts";
import type { PdfFormDescriptor } from "../../2025/pdf/review-support/form-descriptor.ts";
import { refusedOnTy2026, TY2026_DRAFT_NOTICE } from "./draft-template.ts";
import { irs1040Pdf2026 } from "./forms/general/return-assembly/f1040.ts";
import { schedule1Pdf2026 } from "./forms/general/return-assembly/schedule1.ts";
import { schedule3Pdf2026 } from "./forms/general/return-assembly/schedule3.ts";
import { schedule2Pdf2026 } from "./forms/taxes/other/schedule2.ts";

const MAPPED: ReadonlyMap<string, PdfFormDescriptor> = new Map(
  [irs1040Pdf2026, schedule1Pdf2026, schedule2Pdf2026, schedule3Pdf2026].map(
    (descriptor) => [descriptor.pendingKey, descriptor],
  ),
);

/** The 2025 print order; forms without a TY2026 mapping refuse when needed. */
export const TY2026_PDF_FORMS: ReadonlyArray<PdfFormDescriptor> = ALL_PDF_FORMS
  .map((descriptor) =>
    MAPPED.get(descriptor.pendingKey) ?? refusedOnTy2026(descriptor)
  );

export const TY2026_PDF_MAPPED_FORMS: readonly string[] = [...MAPPED.keys()];

export function buildPdfBytes2026(
  pending: Record<string, unknown>,
  filer: FilerIdentity | undefined,
  cacheDir = ".pdf-cache",
  preparedBundle?: MefBundle,
  pageOrigins?: PdfPageOrigin[],
): Promise<Uint8Array> {
  return buildPdfBytes(pending, filer, cacheDir, preparedBundle, pageOrigins, {
    descriptors: TY2026_PDF_FORMS,
    taxYear: 2026,
    subject: TY2026_DRAFT_NOTICE,
  });
}
