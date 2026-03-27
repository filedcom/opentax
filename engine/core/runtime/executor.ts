import type { NodeRegistry } from "../types/node-registry.ts";
import type { ExecutionStep } from "./planner.ts";

export type ExecuteResult = {
  readonly pending: Readonly<Record<string, Record<string, unknown>>>;
};

/**
 * Merges output.input fields into pending[targetId].
 *
 * Rules:
 * - If the target field already holds an array, append incoming scalar or concat incoming array.
 * - If the target field does not exist, set directly.
 * - If target is a scalar and incoming is scalar, overwrite (last-writer-wins).
 * - If target is a scalar and incoming is an array, replace with the array.
 */
function mergePending(
  pending: Record<string, Record<string, unknown>>,
  targetId: string,
  input: Readonly<Record<string, unknown>>,
): void {
  if (pending[targetId] === undefined) {
    // Create a fresh mutable copy (never mutate the incoming input object)
    pending[targetId] = {};
  }

  const target = pending[targetId];

  for (const key of Object.keys(input)) {
    const incoming = input[key];
    const existing = target[key];

    if (Array.isArray(existing)) {
      // Existing is array — append or concat
      if (Array.isArray(incoming)) {
        target[key] = [...existing, ...incoming];
      } else {
        target[key] = [...existing, incoming];
      }
    } else if (existing !== undefined) {
      // Existing is scalar — promote to array on second deposit
      // This is the core accumulation pattern: multiple upstream nodes
      // depositing the same key produces an array (e.g., two W-2s → wages array)
      if (Array.isArray(incoming)) {
        target[key] = [existing, ...incoming];
      } else {
        target[key] = [existing, incoming];
      }
    } else {
      // No existing value — set directly
      target[key] = incoming;
    }
  }
}

/**
 * Executes a topologically-sorted plan against the registry using pending dict accumulation.
 *
 * Algorithm:
 * 1. Initialize pending dict, seed start: pending["start"] = inputs.
 * 2. For each step in plan order:
 *    a. Look up node from registry[step.nodeType].
 *    b. Get input from pending[step.id] ?? {}.
 *    c. Run node.inputSchema.safeParse(input).
 *    d. If parse fails, skip silently (optional node with no deposited inputs).
 *    e. If parse succeeds, call node.compute(parsed.data).
 *    f. For each output in result.outputs: mergePending(pending, output.nodeType, output.input).
 * 3. Return { pending }.
 *
 * The engine is stateless: same inputs always produce same outputs.
 */
export function execute(
  plan: readonly ExecutionStep[],
  registry: NodeRegistry,
  inputs: Record<string, unknown>,
): ExecuteResult {
  // Initialize pending — fresh object each call (stateless)
  const pending: Record<string, Record<string, unknown>> = {};

  // Seed the start node with the raw inputs
  pending["start"] = { ...inputs };

  for (const step of plan) {
    const node = registry[step.nodeType];
    if (!node) continue; // node not in registry — skip

    const input = pending[step.id] ?? {};
    const parsed = node.inputSchema.safeParse(input);

    if (!parsed.success) {
      // Optional node: no inputs deposited, Zod validation fails — silently skip
      continue;
    }

    const result = node.compute(parsed.data);

    for (const output of result.outputs) {
      mergePending(pending, output.nodeType, output.input);
    }
  }

  return { pending };
}
