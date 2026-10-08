import { buildExecutionPlan } from "../../../../../../../../core/runtime/planner.ts";
import {
  execute,
  type ExecuteResult,
} from "../../../../../../../../core/runtime/executor.ts";
import type { NodeOutput } from "../../../../../../../../core/types/tax-node.ts";
import { registry } from "../../../../../../2025/registry.ts";
import { projectCalculatedBoundedForm8990Node } from "./index.ts";
import {
  type PriorFiledForm8990Carryforward,
  projectUnfiledForm8990Carryforward,
  proveZeroPriorForm8990Carryforward,
  type ReviewedZeroPriorForm8990Carryforward,
  type UnfiledForm8990CarryforwardWorkpaper,
} from "./carryforward.ts";
import {
  type FinalizedBoundedForm8990Return,
  reconcileBoundedForm8990FinalReturn,
} from "./final-reconciliation.ts";
import {
  type BoundedProvisionalATI,
  type BusinessReceipt,
  calculateBoundedProvisionalATI,
} from "./provisional-ati.ts";
import {
  calculateBoundedForm8990Limit,
  type CalculatedBoundedForm8990Limit,
} from "./limit.ts";
import {
  type NonexemptPriorReceiptsProof,
  type PriorFiledScheduleCReceipt,
  proveNonexemptPriorReceipts,
} from "./nonexempt-receipts.ts";
import {
  type BusinessInterestExpenseRecord,
  reconcileBusinessInterestExpenseRecords,
} from "./interest-expense.ts";
import {
  finalizedScheduleCContext,
  provisionalScheduleCContext,
} from "./schedule-c-pass.ts";
import {
  applyCalculatedInterestAllowance,
  type FinalizedScheduleCInterestPass,
  type ProvisionalScheduleCInterestPass,
  stageProvisionalScheduleCInterest,
} from "./two-stage.ts";

export interface BoundedForm8990TwoPassResult {
  readonly provisionalSource: ProvisionalScheduleCInterestPass;
  readonly nonexemptPriorReceipts: NonexemptPriorReceiptsProof;
  readonly reviewedPriorCarryforward: ReviewedZeroPriorForm8990Carryforward;
  readonly provisionalReturn: ExecuteResult;
  readonly provisionalAti: BoundedProvisionalATI;
  readonly limit: CalculatedBoundedForm8990Limit;
  readonly finalizedSource: FinalizedScheduleCInterestPass;
  readonly finalizedReturn: ExecuteResult;
  readonly finalizedReconciliation: FinalizedBoundedForm8990Return;
  readonly calculatedForm8990Node: NodeOutput;
  /** Internal calculated projection only; it is not an authorized export payload. */
  readonly internalProjectedPending: ExecuteResult["pending"];
  readonly unfiledNextYearCarryforward: UnfiledForm8990CarryforwardWorkpaper;
}

/**
 * Internal TY2025 one-business two-pass calculation. The result is not yet a
 * filing payload; Form 8990 node, MeF, and PDF projection must be reconciled.
 */
export function runBoundedForm8990TwoPass(args: {
  readonly returnInputs: Readonly<Record<string, unknown>>;
  /** Internal source-composed executor; preserve the exact per-pass context. */
  readonly executeGraph?: (
    inputs: Record<string, unknown>,
    context: Parameters<typeof execute>[3],
  ) => ExecuteResult;
  readonly retainedNolDeduction?: number;
  readonly receipts: readonly BusinessReceipt[];
  readonly interestExpenseRecords: readonly BusinessInterestExpenseRecord[];
  readonly priorFiledScheduleCs: readonly PriorFiledScheduleCReceipt[];
  readonly priorFiledForm8990: PriorFiledForm8990Carryforward;
}): BoundedForm8990TwoPassResult {
  const provisionalSource = stageProvisionalScheduleCInterest(
    { schedule_cs: args.returnInputs.schedule_c },
  );
  const reviewedPriorCarryforward = proveZeroPriorForm8990Carryforward(
    args.priorFiledForm8990,
    args.returnInputs.general,
  );
  reconcileBusinessInterestExpenseRecords(
    provisionalSource,
    reviewedPriorCarryforward.taxpayerSsn,
    args.interestExpenseRecords,
  );
  const nonexemptPriorReceipts = proveNonexemptPriorReceipts(
    provisionalSource,
    args.priorFiledScheduleCs,
    reviewedPriorCarryforward.taxpayerSsn,
  );
  if (
    nonexemptPriorReceipts.sourceDocuments.some((document) =>
      document.filed_schedule_c_document_reference ===
        reviewedPriorCarryforward.sourceDocumentReference
    )
  ) {
    throw new Error(
      "Form 8990 filed Schedule C and prior Form 8990 need distinct documents",
    );
  }
  const plan = buildExecutionPlan(registry);
  const executeGraph = args.executeGraph ??
    ((inputs, context) => execute(plan, registry, inputs, context));
  const retainedNolDeduction = args.retainedNolDeduction ?? 0;
  if (retainedNolDeduction !== 0 && !args.executeGraph) {
    throw new Error("Form8990 NOL composition needs an internal executor");
  }
  const provisionalReturn = executeGraph(
    { ...args.returnInputs },
    provisionalScheduleCContext(provisionalSource),
  );
  const provisionalAti = calculateBoundedProvisionalATI({
    provisional: provisionalSource,
    returnInputs: args.returnInputs,
    result: provisionalReturn,
    receipts: args.receipts,
    retainedNolDeduction,
  });
  const limit = calculateBoundedForm8990Limit(provisionalAti);
  const finalizedSource = applyCalculatedInterestAllowance(
    provisionalSource,
    limit.line30,
  );
  const finalizedInputs = {
    ...args.returnInputs,
    schedule_c: finalizedSource.source.schedule_cs,
  };
  const finalizedReturn = executeGraph(
    finalizedInputs,
    finalizedScheduleCContext(finalizedSource),
  );
  const finalizedReconciliation = reconcileBoundedForm8990FinalReturn({
    source: finalizedSource,
    provisionalAti,
    limit,
    result: finalizedReturn,
    retainedNolDeduction,
  });
  const calculatedForm8990Node = projectCalculatedBoundedForm8990Node({
    limit,
    finalized: finalizedReconciliation,
    prior: reviewedPriorCarryforward,
  });
  if (
    finalizedReturn.pending.form8990 !== undefined &&
    Object.keys(finalizedReturn.pending.form8990).length > 0
  ) {
    throw new Error(
      "Form 8990 finalized return already contains an asserted attachment",
    );
  }
  const internalProjectedPending: ExecuteResult["pending"] = {
    ...finalizedReturn.pending,
    form8990: { ...calculatedForm8990Node.fields },
  };
  const unfiledNextYearCarryforward = projectUnfiledForm8990Carryforward({
    prior: reviewedPriorCarryforward,
    limit,
    finalized: finalizedReconciliation,
  });
  return {
    provisionalSource,
    nonexemptPriorReceipts,
    reviewedPriorCarryforward,
    provisionalReturn,
    provisionalAti,
    limit,
    finalizedSource,
    finalizedReturn,
    finalizedReconciliation,
    calculatedForm8990Node,
    internalProjectedPending,
    unfiledNextYearCarryforward,
  };
}
