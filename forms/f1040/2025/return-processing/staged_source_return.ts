import type { ExecuteResult } from "../../../../core/runtime/executor.ts";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { executeForm5695TaxLimits } from "../domains/credits/individual/form5695/form5695_tax_limits.ts";
import { executeForm8839TwoPass } from "../domains/credits/individual/form8839/form8839_two_pass.ts";
import {
  assertForm8863ReturnFacts,
  executeForm8863TwoPass,
  form8863NeedsReturnFacts,
} from "../domains/credits/individual/form8863/form8863_two_pass.ts";
import { executeScheduleJSourceReturn } from "../domains/taxes/income-averaging/schedule-j/schedule_j_source_return.ts";
import { f1040Graph, type F1040GraphExecutor } from "./graph.ts";

/** Compose source-dependent stages before the QEF tax counterfactual. */
export function executePreQefSourceReturn(
  inputs: Record<string, unknown>,
  context: NodeContext,
  counterfactual = false,
  executeGraph: F1040GraphExecutor = f1040Graph(context),
): ExecuteResult {
  // Form 5695 limits follow every credit they subtract, education included.
  const result = executeForm5695TaxLimits(
    inputs,
    counterfactual,
    (source) =>
      executeCreditStages(source, context, counterfactual, executeGraph),
  );
  if (!counterfactual) assertForm8863ReturnFacts(inputs, result);
  return result;
}

function executeCreditStages(
  inputs: Record<string, unknown>,
  context: NodeContext,
  counterfactual: boolean,
  executeGraph: F1040GraphExecutor,
): ExecuteResult {
  const scheduleJGraph = (source: Record<string, unknown>) =>
    executeScheduleJSourceReturn(source, executeGraph);
  const elected = Array.isArray(inputs.f8621) &&
    inputs.f8621.some((item) =>
      item !== null && typeof item === "object" &&
      "qef_1294_election" in item && item.qef_1294_election !== undefined
    );
  if (inputs.form8839 !== undefined) {
    // Education precedes adoption in the Form 8839 credit-limit worksheet.
    // The adoption runner removes its source before invoking this graph.
    const preAdoptionGraph = (source: Record<string, unknown>) =>
      source.f8863 !== undefined &&
        (elected || counterfactual || form8863NeedsReturnFacts(source))
        ? executeForm8863TwoPass(source, counterfactual, scheduleJGraph)
        : scheduleJGraph(source);
    return executeForm8839TwoPass(
      inputs,
      context,
      counterfactual,
      preAdoptionGraph,
    );
  }
  if (
    inputs.f8863 !== undefined &&
    (elected || inputs.schedule_j !== undefined || counterfactual ||
      form8863NeedsReturnFacts(inputs))
  ) {
    return executeForm8863TwoPass(
      inputs,
      counterfactual,
      scheduleJGraph,
    );
  }
  return scheduleJGraph(inputs);
}
