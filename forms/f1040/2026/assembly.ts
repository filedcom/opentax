import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { buildStartNode } from "../start.ts";
import { f1040_2026_node, inputSchema } from "./nodes/f1040.ts";
import { schedule3a } from "./nodes/schedule3a.ts";
import type { z } from "zod";

/** Internal finalization graph; its inputs are calculated amounts, not public facts. */
const assemblyRegistry = {
  start: buildStartNode([
    { node: f1040_2026_node, inputSchema, isArray: false },
  ]),
  f1040: f1040_2026_node,
  schedule3a,
};
const plan = buildExecutionPlan(assemblyRegistry);

/**
 * Assemble the 2026 printed return lines and its Schedule 3-A after upstream
 * source calculations. This does not establish source eligibility or filing
 * readiness; it is the final stage of the future full 2026 product graph.
 */
export function assembleReturn2026(input: z.input<typeof inputSchema>) {
  return execute(plan, assemblyRegistry, { f1040: input }, {
    formType: "f1040",
    taxYear: 2026,
  });
}
