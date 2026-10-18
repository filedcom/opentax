import {
  execute,
  type ExecuteResult,
} from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { registry } from "../registry.ts";

export type F1040GraphExecutor = (
  inputs: Record<string, unknown>,
) => ExecuteResult;

/** The bare node graph for one tax year; staged stages wrap it. */
export function f1040Graph(context: NodeContext): F1040GraphExecutor {
  return (inputs) =>
    execute(buildExecutionPlan(registry), registry, inputs, context);
}
