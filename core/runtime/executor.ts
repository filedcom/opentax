import type { NodeRegistry } from "../types/node-registry.ts";
import type { ExecutionStep } from "./planner.ts";
import type { NodeContext } from "../types/node-context.ts";
import {
  type SourceDocumentBytes,
  type SourceDocumentClaim,
  VerifiedSourceDocuments,
} from "./source-documents.ts";

export type ExecutorDiagnosticEntry = {
  readonly severity: "error";
  readonly code: "EXECUTOR_NODE_FAILURE";
  readonly nodeType: string;
  readonly nodeId: string;
  readonly message: string;
};

/** A node's note about an incomplete source; the return still computed. */
export type ExecutorWarningEntry = {
  readonly nodeType: string;
  readonly nodeId: string;
  readonly message: string;
};

export type ExecuteResult = {
  readonly pending: Readonly<Record<string, Record<string, unknown>>>;
  readonly diagnostics: readonly ExecutorDiagnosticEntry[];
  readonly warnings?: readonly ExecutorWarningEntry[];
  readonly carryforwards: Readonly<Record<string, number>>;
  readonly replayInputs?: Readonly<
    Record<string, Readonly<Record<string, unknown>>>
  >;
};

export type DocumentBoundExecuteResult = ExecuteResult & {
  readonly verifiedSourceDocuments: VerifiedSourceDocuments;
};

/** Verify and privately retain the exact source bytes before graph execution. */
export async function executeWithSourceDocuments(
  plan: readonly ExecutionStep[],
  registry: NodeRegistry,
  inputs: Record<string, unknown>,
  ctx: NodeContext,
  claims: readonly SourceDocumentClaim[],
  documents: readonly SourceDocumentBytes[],
): Promise<DocumentBoundExecuteResult> {
  const verifiedSourceDocuments = await VerifiedSourceDocuments.verify(
    claims,
    documents,
  );
  return {
    ...execute(plan, registry, inputs, ctx),
    verifiedSourceDocuments,
  };
}

/**
 * Merges output.fields into pending[targetId].
 *
 * Rules:
 * - A computed field replaces the same field deposited directly by the start node.
 *   Derived context is authoritative for nodes that are both user inputs and output targets.
 *   Row collections are the exception: computed rows (e.g. K-1 royalty Schedule E
 *   properties) append to the rows the user entered instead of replacing them.
 * - If the target field already holds an array, append incoming scalar or concat incoming array.
 * - If the target field does not exist, set directly.
 * - If target is a scalar and incoming is scalar, promote both to an array (accumulation pattern:
 *   multiple upstream nodes depositing the same key produces an array, e.g. two W-2s → wages[]).
 * - If target is a scalar and incoming is an array, replace with the array.
 * - A node's self-output is its finalized value and replaces its accumulated input.
 */
/** An array of object rows, such as Schedule E properties. */
function isRowCollection(value: unknown): value is unknown[] {
  return Array.isArray(value) &&
    value.every((row) =>
      row !== null && typeof row === "object" && !Array.isArray(row)
    );
}

function mergePending(
  pending: Record<string, Record<string, unknown>>,
  directInputFields: Record<string, Set<string>>,
  targetId: string,
  input: Readonly<Record<string, unknown>>,
  isDirectInput: boolean,
  isSelfOutput: boolean,
): void {
  if (pending[targetId] === undefined) {
    pending[targetId] = {};
  }

  const target = pending[targetId];

  for (const key of Object.keys(input)) {
    const incoming = input[key];
    const existing = target[key];

    if (isSelfOutput) {
      target[key] = incoming;
      directInputFields[targetId]?.delete(key);
      continue;
    }

    if (isDirectInput) {
      (directInputFields[targetId] ??= new Set()).add(key);
    } else if (directInputFields[targetId]?.delete(key)) {
      target[key] = isRowCollection(existing) && isRowCollection(incoming)
        ? [...existing, ...incoming]
        : incoming;
      continue;
    }

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
  const directInputFields: Record<string, Set<string>> = {};
  pending["start"] = { ...inputs };

  const diagnostics: ExecutorDiagnosticEntry[] = [];
  const warnings: ExecutorWarningEntry[] = [];
  const carryforwards: Record<string, number> = {};
  const replayInputs: Record<string, Record<string, unknown>> = {};

  for (const step of plan) {
    const node = registry[step.nodeType];
    if (!node || !node.implemented) continue;

    const input = pending[step.id] ?? {};
    const parsed = node.inputSchema.safeParse(input);

    if (!parsed.success) {
      // Empty pending slot means no upstream data was deposited — truly optional node, skip silently.
      // A slot holding only context fields does not put the form on the return, so skip it too.
      // Any other parse failure means bad data was deposited — emit diagnostic.
      if (
        Object.keys(input).some((key) => !node.contextFields.includes(key))
      ) {
        diagnostics.push({
          severity: "error",
          code: "EXECUTOR_NODE_FAILURE",
          nodeType: step.nodeType,
          nodeId: step.id,
          message:
            `Zod validation failed for node "${step.nodeType}": ${parsed.error.message}`,
        });
      }
      continue;
    }

    try {
      const result = node.compute(ctx, parsed.data);
      if (result.replayInput !== undefined) {
        replayInputs[step.id] = structuredClone(result.replayInput);
      }
      for (const output of result.outputs) {
        mergePending(
          pending,
          directInputFields,
          output.nodeType,
          output.fields,
          step.nodeType === "start",
          output.nodeType === step.nodeType,
        );
      }
      for (const finalized of result.finalizations ?? []) {
        if (
          !registry[finalized.nodeType] ||
          pending[finalized.nodeType] === undefined
        ) {
          throw new Error(
            `Cannot finalize node "${finalized.nodeType}" before it has pending values`,
          );
        }
        mergePending(
          pending,
          directInputFields,
          finalized.nodeType,
          finalized.fields,
          false,
          true,
        );
      }
      for (const message of result.warnings ?? []) {
        warnings.push({ nodeType: step.nodeType, nodeId: step.id, message });
      }
      if (result.carryforwards) {
        Object.assign(carryforwards, result.carryforwards);
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

  return {
    pending: withoutContextOnlySlots(pending, registry),
    diagnostics,
    carryforwards,
    ...(warnings.length > 0 ? { warnings } : {}),
    ...(Object.keys(replayInputs).length > 0 ? { replayInputs } : {}),
  };
}

function withoutContextOnlySlots(
  pending: Record<string, Record<string, unknown>>,
  registry: NodeRegistry,
): Record<string, Record<string, unknown>> {
  return Object.fromEntries(
    Object.entries(pending).filter(([nodeType, fields]) => {
      const context = registry[nodeType]?.contextFields ?? [];
      return context.length === 0 ||
        Object.keys(fields).some((key) => !context.includes(key));
    }),
  );
}
