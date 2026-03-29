import { join } from "@std/path";
import { execute } from "../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../core/runtime/planner.ts";
import { registry } from "../../nodes/2025/registry.ts";
import { buildMefXml } from "../../forms/f1040/mef/builder.ts";
import { buildPending } from "../../forms/f1040/mef/pending.ts";
import { buildEngineInputs, loadInputs } from "../store/store.ts";

const executionPlan = buildExecutionPlan(registry);

export type ExportReturnArgs = {
  readonly returnId: string;
  readonly baseDir: string;
};

export async function exportMefCommand(
  args: ExportReturnArgs,
): Promise<string> {
  const returnPath = join(args.baseDir, args.returnId);
  const inputs = await loadInputs(returnPath);
  const engineInputs = buildEngineInputs(inputs);
  const result = execute(executionPlan, registry, engineInputs);
  return buildMefXml(buildPending(result.pending));
}
