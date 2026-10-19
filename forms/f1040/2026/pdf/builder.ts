import type { FilerIdentity } from "../../mef/header.ts";
import type { MefBundle } from "../../2025/mef/builder.ts";
import type { PdfPageOrigin } from "../../2025/pdf/builder.ts";
import type { PdfFormDescriptor } from "../../2025/pdf/review-support/form-descriptor.ts";
import { refusedOnTy2026, TY2026_DRAFT_NOTICE } from "./draft-template.ts";
import { irs1040Pdf2026 } from "./forms/general/return-assembly/f1040.ts";
import { schedule1Pdf2026 } from "./forms/general/return-assembly/schedule1.ts";
import { schedule3Pdf2026 } from "./forms/general/return-assembly/schedule3.ts";
import { schedule2Pdf2026 } from "./forms/taxes/other/schedule2.ts";
import { scheduleSePdf2026 } from "./forms/taxes/self-employment/schedule_se.ts";
import { scheduleCPdf2026 } from "./forms/income/business/schedule_c.ts";
import { form8995Pdf2026 } from "./forms/deductions/business/f8995.ts";
import { form2441Pdf2026 } from "./forms/credits/individual/f2441.ts";
import { scheduleBPdf2026 } from "./forms/income/investments/schedule_b.ts";
import { scheduleDPdf2026 } from "./forms/income/investments/schedule_d.ts";
import { form8880Pdf2026 } from "./forms/credits/individual/f8880.ts";
import { form8889Pdf2026 } from "./forms/adjustments/health/f8889.ts";
import { scheduleEPdf2026 } from "./forms/income/rental-passthrough/schedule_e.ts";
import { scheduleAPdf2026 } from "./forms/deductions/itemized/schedule_a.ts";
import { schedule1aPdf2026 } from "./forms/deductions/additional/schedule1a.ts";
import { form8863Pdf2026 } from "./forms/credits/individual/f8863.ts";
import { form6251Pdf2026 } from "./forms/taxes/amt/f6251.ts";
import { form8606Pdf2026 } from "./forms/income/retirement/f8606.ts";
import { form8949Pdf2026 } from "./forms/income/investments/f8949.ts";
import { form8615Pdf2026 } from "./forms/taxes/investments/f8615.ts";
import { form8959Pdf2026 } from "./forms/taxes/employment/f8959.ts";
import { form8960Pdf2026 } from "./forms/taxes/investments/f8960.ts";

const MAPPED: ReadonlyMap<string, PdfFormDescriptor> = new Map(
  [
    irs1040Pdf2026,
    schedule1Pdf2026,
    schedule1aPdf2026,
    schedule2Pdf2026,
    schedule3Pdf2026,
    scheduleAPdf2026,
    scheduleBPdf2026,
    scheduleCPdf2026,
    scheduleDPdf2026,
    scheduleEPdf2026,
    scheduleSePdf2026,
    form2441Pdf2026,
    form6251Pdf2026,
    form8863Pdf2026,
    form8606Pdf2026,
    form8615Pdf2026,
    form8880Pdf2026,
    form8889Pdf2026,
    form8949Pdf2026,
    form8959Pdf2026,
    form8960Pdf2026,
    form8995Pdf2026,
  ].map((descriptor) => [descriptor.pendingKey, descriptor]),
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
