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
 * - If target is a scalar and incoming is scalar, promote both to an array (accumulation pattern:
 *   multiple upstream nodes depositing the same key produces an array, e.g. two W-2s → wages[]).
 * - If target is a scalar and incoming is an array, replace with the array.
 */
function mergePending(
  pending: Record<string, Record<string, unknown>>,
  targetId: string,
  input: Readonly<Record<string, unknown>>,
): void {
  if (pending[targetId] === undefined) {
    pending[targetId] = {};
  }

  const target = pending[targetId];

  for (const key of Object.keys(input)) {
    const incoming = input[key];
    const existing = target[key];

    if (Array.isArray(existing)) {
      target[key] = Array.isArray(incoming)
        ? [...existing, ...incoming]
        : [...existing, incoming];
    } else if (existing !== undefined) {
      target[key] = Array.isArray(incoming)
        ? [existing, ...incoming]
        : [existing, incoming];
    } else {
      target[key] = incoming;
    }
  }
}

/**
 * Executes a topologically-sorted plan against the registry using pending dict accumulation.
 * The engine is stateless: same inputs always produce same outputs.
 */
export function execute(
  plan: readonly ExecutionStep[],
  registry: NodeRegistry,
  inputs: Record<string, unknown>,
): ExecuteResult {
  const pending: Record<string, Record<string, unknown>> = {};
  pending["start"] = { ...inputs };

  for (const step of plan) {
    const node = registry[step.nodeType];
    if (!node) continue;

    const input = pending[step.id] ?? {};
    const parsed = node.inputSchema.safeParse(input);

    if (!parsed.success) {
      // Optional node: no inputs deposited yet, Zod validation fails — skip
      continue;
    }

    const result = node.compute(parsed.data);

    for (const output of result.outputs) {
      mergePending(pending, output.nodeType, output.input);
    }
  }

  return { pending };
}
