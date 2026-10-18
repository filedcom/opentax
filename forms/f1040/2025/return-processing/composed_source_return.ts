import type { ExecuteResult } from "../../../../core/runtime/executor.ts";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { applyForm8621QefRefigure } from "../domains/income/foreign/form8621/form8621_1294_refigure.ts";
import { executePreQefSourceReturn } from "./staged_source_return.ts";

/** Whole public source return, reused by the Schedule J export replay. */
export function executeComposedSourceReturn(
  inputs: Record<string, unknown>,
  context: NodeContext,
): ExecuteResult {
  return applyForm8621QefRefigure(
    inputs,
    executePreQefSourceReturn(inputs, context),
    context,
  );
}
