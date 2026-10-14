import {
  casualtyLossLines,
  inputSchema as casualtySchema,
} from "../../../../../nodes/intermediate/forms/deductions/casualty/form4684/index.ts";
import { inputSchema as gainSchema } from "../../../../../nodes/intermediate/forms/income/business/form4797/index.ts";
import { form4684 as nativeCasualty } from "../../../../mef/forms/deductions/casualty/f4684.ts";
import { form4797 as nativeGain } from "../../../../mef/forms/income/business/f4797.ts";
import { assertReturnScheduleJoins } from "../../../../return-processing/return-wide-arithmetic.ts";
import type { ExecuteResult } from "../../../../../../../core/runtime/executor.ts";
import type { FilerIdentity } from "../../../../../mef/header.ts";
import type { z } from "zod";
import { buildPending } from "../../../../mef/execution/pending.ts";

/** Reconcile the currently modeled casualty route without deciding legal
 * reportability or turning native/PDF unsupported branches into exclusions. */
export function assertForm8886BusinessCasualtyReturn(
  row: z.infer<typeof casualtySchema>,
  pending: ExecuteResult["pending"],
  filer: FilerIdentity,
) {
  const loss = casualtyLossLines(
    row.business_fmv_before ?? 0,
    row.business_fmv_after ?? 0,
    row.business_basis ?? 0,
    row.business_insurance ?? 0,
  ).loss;
  // Reuse current filing validation for property facts, real 2025 date,
  // holding period, whole dollars and the actual Form 4797 line 14 join.
  const nativeCasualtyXml = nativeCasualty.build(row, { pending, filer });
  if (!nativeCasualtyXml || loss <= 0) {
    throw new Error(
      "Form 8886 current casualty source needs a modeled positive business loss",
    );
  }
  if (!pending.form4797 || !pending.schedule1 || !pending.f1040) {
    throw new Error(
      "Form 8886 casualty needs calculated Form 4797, Schedule 1 and Form 1040",
    );
  }
  gainSchema.parse(pending.form4797);
  const nativePending = buildPending(pending);
  if (!nativePending.form4797) {
    throw new Error("Form 8886 casualty needs its prepared Form 4797");
  }
  const native = nativeGain.build(nativePending.form4797, {
    pending: nativePending,
    filer,
  });
  // This is the filed aggregate, including any other supported Form 4797
  // sources. Do not equate one casualty's source loss with the net total.
  const total = /<OtherGainLossAmt>(-?\d+)<\/OtherGainLossAmt>/.exec(native)
    ?.[1];
  if (
    total === undefined ||
    typeof pending.schedule1.line4_other_gains !== "number" ||
    pending.schedule1.line4_other_gains !== Number(total) ||
    typeof pending.schedule1.line10_total_additional_income !== "number" ||
    typeof pending.f1040.line8_additional_income !== "number"
  ) {
    throw new Error(
      "Form 8886 casualty Form 4797 total differs from calculated Schedule 1",
    );
  }
  assertReturnScheduleJoins(pending.f1040, pending);
  return loss;
}
