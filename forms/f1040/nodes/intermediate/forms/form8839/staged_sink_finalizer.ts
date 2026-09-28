import { z } from "zod";
import { f1040 } from "../../../outputs/f1040/index.ts";
import type { Form8839Input } from "./index.ts";
import { reconcilePreAdoptionForm8839Credit } from "./pre_adoption_reconciliation.ts";

type F1040SinkInput = z.infer<typeof f1040.inputSchema>;

const finalOutputSchema = z.object({
  line11_agi: z.number().finite(),
  line18_total_tax_before_credits: z.number().finite().nonnegative(),
  line19_child_tax_credit: z.number().finite().nonnegative(),
  line20_nonrefundable_credits: z.number().finite().nonnegative(),
  line21_credits_total: z.number().finite().nonnegative(),
  line30_refundable_adoption: z.number().finite().nonnegative(),
}).passthrough();

/**
 * Staged direct sink calculation, not an active return route. A future executor
 * integration must supply its own settled f1040 input and reviewed evidence;
 * callers cannot supply asserted pre/post Form 1040 or Schedule 3 snapshots.
 */
export function finalizeStagedForm8839Sink(
  source: Form8839Input,
  childReview: unknown,
  executorSinkInput: F1040SinkInput,
  magiReview: unknown,
) {
  const input = f1040.inputSchema.parse(executorSinkInput);
  const pre = reconcilePreAdoptionForm8839Credit(
    source,
    childReview,
    input,
    magiReview,
  );
  const schedule3 = input.credit_limit_schedule3_lines;
  if (!schedule3) {
    throw new Error("Form 8839 needs executor-owned Schedule 3 priority lines");
  }
  const adoption = pre.credit;
  const priorCredits = input.line20_nonrefundable_credits ?? 0;
  const finalSchedule3 = {
    line6c_adoption_credit: adoption.line18,
    line7_total: schedule3.line7 + adoption.line18,
    line8_total: priorCredits + adoption.line18,
  } as const;
  const finalInput = f1040.inputSchema.parse({
    ...input,
    line20_nonrefundable_credits: finalSchedule3.line8_total,
    line30_refundable_adoption: adoption.line13,
    credit_limit_schedule3_lines: {
      ...schedule3,
      line6cAdoption: adoption.line18,
      line7: finalSchedule3.line7_total,
    },
  });
  const computed = f1040.compute(
    { taxYear: 2025, formType: "f1040" },
    finalInput,
  );
  if (computed.finalizations?.some((entry) => entry.nodeType === "schedule3")) {
    throw new Error(
      "Form 8839 final return has unsettled late Schedule 3 credits",
    );
  }
  const final1040 = finalOutputSchema.parse(
    {
      // f1040 intentionally does not self-emit ordinary input pass-through
      // fields, because executor merging would otherwise accumulate them.
      ...finalInput,
      ...computed.outputs.find((entry) => entry.nodeType === "f1040")?.fields,
    },
  );
  if (
    final1040.line11_agi !== pre.preAdoptionForm1040.line11_agi ||
    final1040.line18_total_tax_before_credits !==
      pre.preAdoptionForm1040.line18_total_tax_before_credits ||
    final1040.line19_child_tax_credit !==
      pre.context.child_credit_priority.amount ||
    final1040.line20_nonrefundable_credits !== finalSchedule3.line8_total ||
    final1040.line21_credits_total !==
      pre.preAdoptionForm1040.line21_credits_total + adoption.line18 ||
    final1040.line30_refundable_adoption !== adoption.line13
  ) {
    throw new Error(
      "Form 8839 final Form 1040 differs from the pre-adoption sink and Schedule 3 calculation",
    );
  }
  return {
    preAdoption1040: pre.preAdoptionForm1040,
    credit: adoption,
    final1040,
    finalSchedule3,
  } as const;
}
