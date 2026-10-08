import type { ExecuteResult } from "../../../../../core/runtime/executor.ts";
import { executeForm8839TwoPass } from "../credits/form8839/form8839_two_pass.ts";
import { executeForm8863TwoPass } from "../credits/form8863/form8863_two_pass.ts";
import { executeScheduleJSourceReturn } from "../business/schedule-j/schedule_j_source_return.ts";

/** Compose source-dependent stages before the QEF tax counterfactual. */
export function executePreQefSourceReturn(
  inputs: Record<string, unknown>,
  counterfactual = false,
  executeGraph?: (inputs: Record<string, unknown>) => ExecuteResult,
): ExecuteResult {
  const scheduleJGraph = (source: Record<string, unknown>) =>
    executeScheduleJSourceReturn(source, executeGraph);
  if (inputs.form8839 !== undefined) {
    return executeForm8839TwoPass(
      inputs,
      counterfactual,
      scheduleJGraph,
    );
  }
  const elected = Array.isArray(inputs.f8621) &&
    inputs.f8621.some((item) =>
      item !== null && typeof item === "object" &&
      "qef_1294_election" in item && item.qef_1294_election !== undefined
    );
  if (
    inputs.f8863 !== undefined &&
    (elected || inputs.schedule_j !== undefined || counterfactual)
  ) {
    return executeForm8863TwoPass(
      inputs,
      counterfactual,
      scheduleJGraph,
    );
  }
  return scheduleJGraph(inputs);
}
