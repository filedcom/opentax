import type { Form2210BoxEInput } from "./form2210_box_e.ts";
import { reconcileForm2210BoxEFinalized2025 } from "./form2210_box_e_finalized.ts";
import {
  type Form2210BoxEPriorIdentity,
  inspectForm2210BoxEPriorReturnBytes,
} from "./form2210_box_e_prior_bytes.ts";
import { buildForm2210BoxEPage1 } from "../../../../mef/forms/taxes/underpayment/f2210_box_e.ts";
import { projectForm2210BoxEPage1 } from "../../../../pdf/forms/taxes/underpayment/f2210_box_e.ts";

/** Source bytes → page 1 → native/PDF projection. This isolated chain remains
 * outside public export until accepted 2024 filing provenance is authenticated. */
export async function stageForm2210BoxEPage1(
  rawSource: unknown,
  identity: Form2210BoxEPriorIdentity,
  priorReturnDocuments: ReadonlyArray<{
    reference: string;
    bytes: Uint8Array;
  }>,
  finalized2025Form1040: unknown,
) {
  const source: Form2210BoxEInput = await inspectForm2210BoxEPriorReturnBytes(
    rawSource,
    identity,
    priorReturnDocuments,
  );
  const filed_lines = reconcileForm2210BoxEFinalized2025(
    source,
    finalized2025Form1040,
  );
  const record = { source, filed_lines };
  return {
    filed_lines,
    native_xml: buildForm2210BoxEPage1(record, finalized2025Form1040),
    pdf_fields: projectForm2210BoxEPage1(record, finalized2025Form1040),
  };
}
