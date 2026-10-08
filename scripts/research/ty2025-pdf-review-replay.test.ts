import { assertRejects } from "@std/assert";
import { sha256Hex } from "../../forms/f1040/2025/return-processing/prepared-source.ts";
import { assertReviewPdfReplay } from "./ty2025-pdf-review-replay.ts";

Deno.test("review PDF replay rejects a replaced PDF with an updated manifest hash", async () => {
  const generatedPdf = new Uint8Array([37, 80, 68, 70, 45, 49]);
  const substitutedPdf = new Uint8Array([37, 80, 68, 70, 45, 50]);
  const substitutedDigest = await sha256Hex(substitutedPdf);
  await assertReviewPdfReplay(
    "case-one",
    generatedPdf,
    await sha256Hex(generatedPdf),
  );
  await assertRejects(
    () =>
      assertReviewPdfReplay(
        "case-one",
        generatedPdf,
        substitutedDigest,
      ),
    Error,
    "filled PDF differs from the current prepared return",
  );
});
