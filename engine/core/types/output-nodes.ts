import type { z } from "zod";
import type { TaxNode, NodeOutput } from "./tax-node.ts";

// Class-level declaration — holds node instances for graph topology + type-checking
export class OutputNodes<TNodes extends readonly TaxNode<z.ZodTypeAny>[]> {
  readonly #nodes: TNodes;

  constructor(nodes: TNodes) {
    this.#nodes = nodes;
  }

  get nodeTypes(): readonly string[] {
    return this.#nodes.map((n) => n.nodeType);
  }

  /**
   * Type-safe factory: fields must be a partial of the target node's input schema.
   * Use this instead of constructing { nodeType, fields } literals directly.
   */
  output<T extends TNodes[number]>(
    node: T,
    fields: Partial<z.infer<T["inputSchema"]>>,
  ): NodeOutput {
    return { nodeType: node.nodeType, fields };
  }
}
