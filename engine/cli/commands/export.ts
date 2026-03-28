import { join } from "@std/path";
import { execute } from "../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../core/runtime/planner.ts";
import { registry } from "../../nodes/2025/registry.ts";
import { buildMefXml } from "../../export/mef/builder.ts";
import { loadInputs } from "../store/store.ts";
import type { InputsJson } from "../store/types.ts";
import type { MefFormsPending } from "../../export/mef/types.ts";

const executionPlan = buildExecutionPlan(registry);

export type ExportReturnArgs = {
  readonly returnId: string;
  readonly baseDir: string;
};

function buildEngineInputs(inputs: InputsJson): Record<string, unknown> {
  const result: Record<string, unknown[]> = {};
  for (const [nodeType, entries] of Object.entries(inputs)) {
    result[`${nodeType}s`] = entries.map((e) => e.fields);
  }
  return result;
}

export async function exportMefCommand(
  args: ExportReturnArgs,
): Promise<string> {
  const returnPath = join(args.baseDir, args.returnId);
  const inputs = await loadInputs(returnPath);
  const engineInputs = buildEngineInputs(inputs);
  const result = execute(executionPlan, registry, engineInputs);
  const pending: MefFormsPending = {
    f1040: result.pending["f1040"] as MefFormsPending["f1040"],
    schedule1: result.pending["schedule1"] as MefFormsPending["schedule1"],
  };
  return buildMefXml(pending);
}
