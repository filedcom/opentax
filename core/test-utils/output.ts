import type { z } from "zod";
import type { NodeOutput, TaxNode } from "../types/tax-node.ts";

/**
 * Finds the first output targeting the given node and returns its fields typed
 * to that node's input schema. Returns undefined if no matching output exists.
 */
export function fieldsOf<T extends TaxNode<z.ZodTypeAny>>(
  outputs: readonly NodeOutput[],
  node: T,
): Partial<z.infer<T["inputSchema"]>> | undefined {
  const match = outputs.find((o) => o.nodeType === node.nodeType);
  if (!match) return undefined;
  return match.fields as Partial<z.infer<T["inputSchema"]>>;
}
