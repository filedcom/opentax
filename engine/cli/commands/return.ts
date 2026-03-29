import { join } from "@std/path";
import { execute } from "../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../core/runtime/planner.ts";
import { registry } from "../../nodes/2025/registry.ts";
import { buildEngineInputs, createReturn, loadReturn } from "../store/store.ts";

const executionPlan = buildExecutionPlan(registry);

export type CreateReturnArgs = {
  readonly year: number;
  readonly formType?: string;
  readonly baseDir: string;
};

export async function createReturnCommand(
  args: CreateReturnArgs,
): Promise<{ returnId: string }> {
  const { returnId } = await createReturn(args.year, args.baseDir, args.formType);
  return { returnId };
}

export type GetReturnArgs = {
  readonly returnId: string;
  readonly baseDir: string;
};

export type GetReturnResult = {
  readonly returnId: string;
  readonly year: number;
  readonly lines: {
    readonly line_1a: number;
  };
};

export async function getReturnCommand(
  args: GetReturnArgs,
): Promise<GetReturnResult> {
  const returnPath = join(args.baseDir, args.returnId);
  const { meta, inputs } = await loadReturn(returnPath);

  const engineInputs = buildEngineInputs(inputs);
  const result = execute(executionPlan, registry, engineInputs);

  const line1aRaw = result.pending["f1040"]?.["line1a_wages"];
  const line_1a = typeof line1aRaw === "number" ? line1aRaw : 0;

  return {
    returnId: meta.returnId,
    year: meta.year,
    lines: { line_1a },
  };
}
