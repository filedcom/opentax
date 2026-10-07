import type { ExecuteResult } from "../../../core/runtime/executor.ts";
import { applyForm8621QefRefigure } from "./form8621_1294_refigure.ts";
import { executePreQefSourceReturn } from "./staged_source_return.ts";

/** Whole public source return, reused by the Schedule J export replay. */
export function executeComposedSourceReturn(
  inputs: Record<string, unknown>,
): ExecuteResult {
  return applyForm8621QefRefigure(
    inputs,
    executePreQefSourceReturn(inputs),
  );
}
