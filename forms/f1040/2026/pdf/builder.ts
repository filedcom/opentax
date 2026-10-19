import type { FilerIdentity } from "../../mef/header.ts";
import type { MefBundle } from "../../2025/mef/builder.ts";
import type { PdfPageOrigin } from "../../2025/pdf/builder.ts";
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
export async function ty2026PdfForms(): Promise<
  ReadonlyArray<PdfFormDescriptor>
> {
  // Loaded on use: a static import of the 2025 PDF modules here makes the
  // compiled binary emit an undefined async-init helper (Bun 1.4.2).
  const { ALL_PDF_FORMS } = await import("../../2025/pdf/forms/index.ts");
  return ALL_PDF_FORMS.map((descriptor) =>
    MAPPED.get(descriptor.pendingKey) ?? refusedOnTy2026(descriptor)
  );
}

export const TY2026_PDF_MAPPED_FORMS: readonly string[] = [...MAPPED.keys()];

export async function buildPdfBytes2026(
  pending: Record<string, unknown>,
  filer: FilerIdentity | undefined,
  cacheDir = ".pdf-cache",
  preparedBundle?: MefBundle,
  pageOrigins?: PdfPageOrigin[],
): Promise<Uint8Array> {
  const { buildPdfBytes } = await import("../../2025/pdf/builder.ts");
  return await buildPdfBytes(
    pending,
    filer,
    cacheDir,
    preparedBundle,
    pageOrigins,
    {
      descriptors: await ty2026PdfForms(),
      taxYear: 2026,
      subject: TY2026_DRAFT_NOTICE,
    },
  );
}
