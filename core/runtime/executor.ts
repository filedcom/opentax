import type { NodeRegistry } from "../types/node-registry.ts";
import type { ExecutionStep } from "./planner.ts";
import type { NodeContext } from "../types/node-context.ts";

export type ExecutorDiagnosticEntry = {
  readonly severity: "error";
  readonly code: "EXECUTOR_NODE_FAILURE";
  readonly nodeType: string;
  readonly nodeId: string;
  readonly message: string;
};

export type ExecuteResult = {
  readonly pending: Readonly<Record<string, Record<string, unknown>>>;
  readonly diagnostics: readonly ExecutorDiagnosticEntry[];
};

/**
 * Merges output.fields into pending[targetId].
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
 *
 * Node failures are isolated: Zod parse errors and compute() throws produce
 * ExecutorDiagnosticEntry records in the returned diagnostics array. Execution
 * continues for all remaining nodes regardless of earlier failures.
 */
export function execute(
  plan: readonly ExecutionStep[],
  registry: NodeRegistry,
  inputs: Record<string, unknown>,
  ctx: NodeContext,
): ExecuteResult {
  const pending: Record<string, Record<string, unknown>> = {};
  pending["start"] = { ...inputs };

  const diagnostics: ExecutorDiagnosticEntry[] = [];

  for (const step of plan) {
    const node = registry[step.nodeType];
    if (!node || !node.implemented) continue;

    const input = pending[step.id] ?? {};
    const parsed = node.inputSchema.safeParse(input);

    if (!parsed.success) {
      // Empty pending slot means no upstream data was deposited — truly optional node, skip silently.
      // Non-empty pending slot with parse failure means bad data was deposited — emit diagnostic.
      if (Object.keys(input).length > 0) {
        diagnostics.push({
          severity: "error",
          code: "EXECUTOR_NODE_FAILURE",
          nodeType: step.nodeType,
          nodeId: step.id,
          message: `Zod validation failed for node "${step.nodeType}": ${parsed.error.message}`,
        });
      }
      continue;
    }

    try {
      const result = node.compute(ctx, parsed.data);
      for (const output of result.outputs) {
        mergePending(pending, output.nodeType, output.fields);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      diagnostics.push({
        severity: "error",
        code: "EXECUTOR_NODE_FAILURE",
        nodeType: step.nodeType,
        nodeId: step.id,
        message: `compute() threw for node "${step.nodeType}": ${message}`,
      });
    }
  }

  return { pending, diagnostics };
}
