import { join } from "@std/path";
import { execute } from "../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../core/runtime/planner.ts";
import { registry } from "../../nodes/2025/registry.ts";
import { createReturn, loadInputs, loadMeta } from "../store/store.ts";
import type { InputsJson } from "../store/types.ts";

const executionPlan = buildExecutionPlan(registry);

export type CreateReturnArgs = {
  readonly year: number;
  readonly baseDir: string;
};

export async function createReturnCommand(
  args: CreateReturnArgs,
): Promise<{ returnId: string }> {
  const { returnId } = await createReturn(args.year, args.baseDir);
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

/**
 * Converts InputsJson (grouped by nodeType) into the engine's start node input shape.
 * Each nodeType bucket becomes an array keyed as `{nodeType}s` (e.g. "w2" → "w2s").
 */
function buildEngineInputs(inputs: InputsJson): Record<string, unknown> {
  const result: Record<string, unknown[]> = {};
  for (const [nodeType, entries] of Object.entries(inputs)) {
    result[`${nodeType}s`] = entries.map((e) => e.fields);
  }
  return result;
}

export async function getReturnCommand(
  args: GetReturnArgs,
): Promise<GetReturnResult> {
  const returnPath = join(args.baseDir, args.returnId);
  const [meta, inputs] = await Promise.all([
    loadMeta(returnPath),
    loadInputs(returnPath),
  ]);

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
