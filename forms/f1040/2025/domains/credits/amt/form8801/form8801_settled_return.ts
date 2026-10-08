import type { SourceDocumentBytes } from "../../../../../../../core/runtime/source-documents.ts";
import { f1040 } from "../../../../../nodes/outputs/general/return-assembly/f1040/index.ts";
import { normalizePendingDict } from "../../../../return-processing/pending.ts";
import { calculateForm8801 } from "./form8801_calculation.ts";
import {
  form8801CurrentReturnWorkpaper,
  stageForm8801ReviewedReturnCalculation,
} from "./form8801_reviewed_return.ts";

const ctx = { taxYear: 2025, formType: "f1040" };
const zeros = {
  line1: 0,
  line2: 0,
  line3: 0,
  line4: 0,
  line5a: 0,
  line5b: 0,
  line6aGbc: 0,
  line6bPriorMinimumTax: 0,
  line6kBondCredit: 0,
  line7: 0,
};
const conditionalBalanceLines = [
  "line34_overpayment",
  "line35a_refund",
  "line36_applied_to_next_year",
  "line37_amount_owed",
];

function computed1040(input: Parameters<typeof f1040.compute>[1]) {
  const result = f1040.compute(ctx, input);
  const fields = result.outputs.find((o) => o.nodeType === "f1040")?.fields;
  if (!fields) throw new Error("Form 8801 needs a computed final Form 1040");
  const retained = { ...input } as Record<string, unknown>;
  // Refund and amount owed are recalculated; prior mutually exclusive values
  // must not survive an internally staged sink replay.
  for (const key of conditionalBalanceLines) delete retained[key];
  return {
    result,
    fields: normalizePendingDict({ ...retained, ...fields }, "f1040")!,
  };
}

/** Recompute the actual finalizer input with the byte-bound calculated credit.
 * No caller-supplied pre/post snapshot or credit is accepted. This remains an
 * unregistered projection: accepted prior history and filing artifacts are open. */
export async function stageForm8801SettledReturn(
  inputs: Readonly<Record<string, unknown>>,
  binding: unknown,
  documents: readonly SourceDocumentBytes[],
) {
  const staged = await stageForm8801ReviewedReturnCalculation(
    inputs,
    binding,
    documents,
  );
  if (!staged.public_return_replay_input) {
    throw new Error("Form 8801 needs executor-retained finalizer input");
  }
  const baseInput = f1040.inputSchema.parse(staged.public_return_replay_input);
  const replay = computed1040(baseInput);
  const before = staged.current_form1040_before_credit;
  const beforeLines = Object.keys(before).filter((key) => /^line\d/.test(key));
  const replayLines = Object.keys(replay.fields).filter((key) =>
    /^line\d/.test(key)
  );
  for (const key of new Set([...beforeLines, ...replayLines])) {
    if (JSON.stringify(before[key]) !== JSON.stringify(replay.fields[key])) {
      throw new Error(
        `Form 8801 retained finalizer does not reproduce public ${key}`,
      );
    }
  }
  const priorities = baseInput.credit_limit_schedule3_lines ?? zeros;
  if (priorities.line6bPriorMinimumTax !== 0) {
    throw new Error(
      "Form 8801 finalizer already has a prior minimum-tax credit",
    );
  }
  let credit = staged.schedule3_line6b;
  const seen = new Set<number>();
  for (let iteration = 0; iteration < 32; iteration++) {
    if (seen.has(credit)) {
      throw new Error("Form 8801 interacting credit amounts did not settle");
    }
    seen.add(credit);
    const finalInput = f1040.inputSchema.parse({
      ...baseInput,
      line20_nonrefundable_credits:
        (baseInput.line20_nonrefundable_credits ?? 0) + credit,
      credit_limit_schedule3_lines: {
        ...priorities,
        line6bPriorMinimumTax: credit,
        line7: priorities.line7 + credit,
      },
    });
    const computed = computed1040(finalInput);
    const pending = structuredClone(staged.public_pending_before_credit);
    const oldSchedule3 = pending.schedule3 ?? {};
    pending.schedule3 = {
      ...oldSchedule3,
      line6b_prior_year_min_tax_credit: credit,
      line7_total: Number(oldSchedule3.line7_total ?? 0) + credit,
      line8_total: Number(oldSchedule3.line8_total ?? 0) + credit,
    };
    for (const finalization of computed.result.finalizations ?? []) {
      pending[finalization.nodeType] = {
        ...pending[finalization.nodeType],
        ...finalization.fields,
      };
    }
    pending.f1040 = computed.fields;
    const source = form8801CurrentReturnWorkpaper(
      pending.f1040,
      staged.current_form6251,
      pending.schedule3,
      staged.current_return_workpaper.reference,
    );
    const calculation = calculateForm8801({
      ...staged.reviewed_calculation_source,
      current_return: source,
    });
    if (calculation.schedule3_line6b !== credit) {
      credit = calculation.schedule3_line6b;
      continue;
    }
    for (
      const key of [
        "line11_agi",
        "line14_deductions_qbi_total",
        "line16_income_tax",
        "line18_total_tax_before_credits",
        "line19_child_tax_credit",
        "line25d_total_withholding",
      ]
    ) {
      if (JSON.stringify(pending.f1040[key]) !== JSON.stringify(before[key])) {
        throw new Error(`Form 8801 settlement changed preceding public ${key}`);
      }
    }
    if (
      Number(pending.schedule3.line6b_prior_year_min_tax_credit) !==
        calculation.schedule3_line6b ||
      Number(pending.f1040.line21_credits_total ?? 0) !==
        Number(pending.f1040.line19_child_tax_credit ?? 0) +
          Number(pending.f1040.line20_nonrefundable_credits ?? 0) ||
      Number(pending.f1040.line22_tax_after_credits ?? 0) !==
        Math.max(
          0,
          Number(pending.f1040.line18_total_tax_before_credits ?? 0) -
            Number(pending.f1040.line21_credits_total ?? 0),
        )
    ) {
      throw new Error("Form 8801 final credit and Form 1040 totals differ");
    }
    pending.f8801 = {
      ...pending.f8801,
      staged_official_credit: calculation.fileRequired,
      staged_lines: calculation.lines,
      prior_year_amt_paid:
        staged.reviewed_calculation_source.prior_form6251.line11,
      prior_year_carryforward:
        staged.reviewed_calculation_source.prior_credit_carryforward.amount,
    };
    return {
      ...staged,
      ...calculation,
      current_return_workpaper: source,
      projected_pending: pending,
      final_form1040: pending.f1040,
      final_schedule3: pending.schedule3,
      settlement_iterations: iteration + 1,
      finalReturnAmountsReconciled: true as const,
      // A locally computed projection is not an admitted public filing route.
      finalizedReturnReconciled: false as const,
      filingReady: false as const,
    };
  }
  throw new Error(
    "Form 8801 interacting credit amounts exceeded settlement limit",
  );
}
