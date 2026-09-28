import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import {
  execute,
  type ExecuteResult,
} from "../../../../../../core/runtime/executor.ts";
import type { NodeOutput } from "../../../../../../core/types/tax-node.ts";
import { registry } from "../../../../2025/registry.ts";
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
  readonly receipts: readonly BusinessReceipt[];
  readonly interestExpenseRecords: readonly BusinessInterestExpenseRecord[];
  readonly priorFiledScheduleCs: readonly PriorFiledScheduleCReceipt[];
  readonly priorFiledForm8990: PriorFiledForm8990Carryforward;
}): BoundedForm8990TwoPassResult {
  const provisionalSource = stageProvisionalScheduleCInterest(
    { schedule_cs: args.returnInputs.schedule_c },
  );
  reconcileBusinessInterestExpenseRecords(
    provisionalSource,
    args.interestExpenseRecords,
  );
  const nonexemptPriorReceipts = proveNonexemptPriorReceipts(
    provisionalSource,
    args.priorFiledScheduleCs,
  );
  const reviewedPriorCarryforward = proveZeroPriorForm8990Carryforward(
    args.priorFiledForm8990,
    args.returnInputs.general,
  );
  const plan = buildExecutionPlan(registry);
  const provisionalReturn = execute(
    plan,
    registry,
    { ...args.returnInputs },
    provisionalScheduleCContext(provisionalSource),
  );
  const provisionalAti = calculateBoundedProvisionalATI({
    provisional: provisionalSource,
    returnInputs: args.returnInputs,
    result: provisionalReturn,
    receipts: args.receipts,
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
  const finalizedReturn = execute(
    plan,
    registry,
    finalizedInputs,
    finalizedScheduleCContext(finalizedSource),
  );
  const finalizedReconciliation = reconcileBoundedForm8990FinalReturn({
    source: finalizedSource,
    provisionalAti,
    limit,
    result: finalizedReturn,
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
