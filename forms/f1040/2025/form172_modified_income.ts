import { z } from "zod";
import { form172CarryAbsorptionSchema } from "./form172_carry_absorption.ts";
import { execute, type ExecuteResult } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { TaxNode } from "../../../core/types/tax-node.ts";
import { registry } from "./registry.ts";
import { agi_aggregator } from "../nodes/intermediate/aggregation/agi_aggregator/index.ts";
import { executePreQefSourceReturn } from "./staged_source_return.ts";
import { executeForm172Form8990Return } from "./form172_form8990_return.ts";
import { normalizeAllPending } from "./pending.ts";
import { roundWholeDollars } from "../whole-dollars.ts";

function amount(value: unknown): number {
  if (value === undefined) return 0;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("Modified NOL income needs scalar calculated amounts");
  }
  return roundWholeDollars(value);
}
/** Internal section172 modified-income workpaper, before current/later NOL.
 * Source capital transactions remain intact; only the AGI computation restores
 * the reviewed capital-loss deduction. This is not a hypothetical filed return. */
export function reconcileForm172ModifiedIncome(
  inputs: Record<string, unknown>,
  rawAnnual: unknown,
  before: Record<string, Record<string, unknown>>,
  expectedModifiedAgi: number,
) {
  const annual = form172CarryAbsorptionSchema.parse({
    ...z.record(z.unknown()).parse(rawAnnual),
    prior_absorption_records: [],
  });
  if (annual.tax_year !== 2025 || !Number.isSafeInteger(expectedModifiedAgi)) {
    throw new Error(
      "Modified NOL income needs the current reviewed year and exact AGI",
    );
  }
  if (annual.section1202_exclusion.amount !== 0) {
    throw new Error(
      "Modified NOL income needs a calculated section1202 exclusion source",
    );
  }
  const addback = annual.capital_loss_deduction.amount as number;
  if (!Number.isSafeInteger(addback) || addback < 0 || addback > 3000) {
    throw new Error(
      "Modified NOL capital addback needs reviewed whole dollars",
    );
  }
  class ModifiedAgi extends TaxNode {
    readonly nodeType = agi_aggregator.nodeType;
    readonly inputSchema = agi_aggregator.inputSchema;
    readonly outputNodes = agi_aggregator.outputNodes;
    compute(
      ctx: Parameters<typeof agi_aggregator.compute>[0],
      input: Parameters<typeof agi_aggregator.compute>[1],
    ) {
      return agi_aggregator.compute(ctx, {
        ...input,
        line7_capital_gain: (input.line7_capital_gain ?? 0) + addback,
      });
    }
  }
  const modifiedRegistry = { ...registry, agi_aggregator: new ModifiedAgi() };
  const graph = (
    source: Record<string, unknown>,
    ctx: Parameters<typeof execute>[3] = { taxYear: 2025, formType: "f1040" },
  ) =>
    execute(
      buildExecutionPlan(modifiedRegistry),
      modifiedRegistry,
      source,
      ctx,
    );
  const execution: ExecuteResult = inputs.form8990 === undefined
    ? executePreQefSourceReturn(structuredClone(inputs), true, graph)
    : executeForm172Form8990Return(structuredClone(inputs), graph).execution;
  if (execution.diagnostics.length) {
    throw new Error("Modified NOL income needs a successful source graph");
  }
  const pending = normalizeAllPending(execution.pending);
  const modified = pending.f1040;
  if (!modified || amount(modified.line11_agi) !== expectedModifiedAgi) {
    throw new Error(
      "Reviewed modified NOL AGI differs from the actual source graph",
    );
  }
  const slots: Record<string, { kind: string; node: string; field: string }> = {
    taxable_social_security: {
      kind: "income",
      node: "f1040",
      field: "line6b_ss_taxable",
    },
    student_loan_interest: {
      kind: "deduction",
      node: "schedule1",
      field: "line21_student_loan_interest",
    },
    ira_deduction: {
      kind: "deduction",
      node: "schedule1",
      field: "line20_ira_deduction",
    },
  };
  const declared = new Set<string>();
  for (const row of annual.agi_refigures) {
    const slot = slots[row.item_id];
    if (
      !slot || row.kind !== slot.kind ||
      row.before !== amount(before[slot.node]?.[slot.field]) ||
      row.after !== amount(pending[slot.node]?.[slot.field])
    ) {
      throw new Error(
        "Reviewed NOL AGI refigure differs from the actual source component",
      );
    }
    declared.add(row.item_id);
  }
  for (const [id, slot] of Object.entries(slots)) {
    if (
      amount(before[slot.node]?.[slot.field]) !==
        amount(pending[slot.node]?.[slot.field]) && !declared.has(id)
    ) throw new Error("Modified NOL income omits a changed AGI component");
  }
  const reviewedDeduction = annual.refigured_itemized_deduction?.amount ??
    annual.standard_or_itemized_deduction;
  if (
    reviewedDeduction !== amount(modified.line12c_deduction_total) ||
    (annual.refigured_schedule1a_deduction?.amount ?? 0) !==
      amount(modified.line13b_additional_deductions) ||
    (annual.refigured_schedule1a_deduction?.senior_amount ?? 0) !==
      amount(modified.schedule1a_line37_senior_deduction)
  ) {
    throw new Error(
      "Reviewed modified NOL deductions differ from the actual source graph",
    );
  }
  return {
    modified_income_pending: pending,
    currentModifiedIncomeGraphReconciled: true as const,
    modifiedIncomeSourceEligibilityVerified: false as const,
  };
}
