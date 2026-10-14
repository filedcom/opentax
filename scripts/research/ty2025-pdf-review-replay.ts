import { sha256Hex } from "../../forms/f1040/2025/return-processing/prepared-source.ts";

/** A manifest digest alone cannot prove the PDF still matches the source. */
export async function assertReviewPdfReplay(
  caseId: string,
  rebuiltPdf: Uint8Array,
  recordedPdfSha256: unknown,
): Promise<void> {
  if (await sha256Hex(rebuiltPdf) !== recordedPdfSha256) {
    throw new Error(
      `${caseId}: filled PDF differs from the current prepared return`,
    );
  }
}
