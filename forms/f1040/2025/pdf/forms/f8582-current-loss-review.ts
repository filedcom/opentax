import { PDFDocument } from "pdf-lib";
import { extractFilerIdentity } from "../../../mef/filer.ts";
import { fillFormPdf } from "../builder.ts";
import { form8582Pdf, projectCurrentPropertyLoss8582Review } from "./f8582.ts";
import {
  appendForm8582Continuation,
  type Form8582Continuation,
} from "./f8582_continuation.ts";

/** Render only the source-bound review worksheet, never a filing packet. */
export async function buildCurrentPropertyLoss8582ReviewPdf(
  allPending: Record<string, Record<string, any>>,
  cacheDir: string,
) {
  const fields = projectCurrentPropertyLoss8582Review(allPending);
  const filer = extractFilerIdentity(allPending.f1040);
  if (!filer) throw new Error("Current loss review PDF needs finalized filer");
  const bytes = await fillFormPdf(form8582Pdf, fields, filer, cacheDir);
  if (!bytes) throw new Error("Current loss review PDF has no worksheet");
  const document = await PDFDocument.load(bytes);
  await appendForm8582Continuation(
    document,
    (fields.pdf_continuation ?? []) as Form8582Continuation[],
    filer,
  );
  return {
    bytes: await document.save(),
    fields,
    filingReady: false as const,
    issuerVerified: false as const,
  };
}
