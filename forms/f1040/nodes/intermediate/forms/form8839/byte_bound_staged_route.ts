import { z } from "zod";
import type { FilerIdentity } from "../../../../mef/header.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import type { Form8839Input } from "./index.ts";
import {
  bindReviewedDomestic8839DocumentBytes,
  type Form8839SourceDocument,
} from "./document_byte_binding.ts";
import { projectStagedForm8839Documents } from "./staged_documents.ts";
import { finalizeStagedForm8839Sink } from "./staged_sink_finalizer.ts";

/**
 * Evidence-bound staged projection only. The executor and public exporters do
 * not call this helper; it cannot deposit a credit into a filed return.
 */
export async function projectByteBoundStagedDomestic8839(
  source: Form8839Input,
  childReview: unknown,
  documents: readonly Form8839SourceDocument[],
  preAdoptionSinkInput: z.infer<typeof f1040.inputSchema>,
  magiReview: unknown,
  filer: FilerIdentity,
) {
  await bindReviewedDomestic8839DocumentBytes(
    source,
    childReview,
    documents,
  );
  const settled = finalizeStagedForm8839Sink(
    source,
    childReview,
    preAdoptionSinkInput,
    magiReview,
  );
  const projected = projectStagedForm8839Documents(
    source,
    childReview,
    preAdoptionSinkInput,
    magiReview,
    {
      form8839: source,
      f1040: settled.final1040,
      schedule3: settled.finalSchedule3,
    },
    filer,
  );
  return { ...settled, ...projected };
}
