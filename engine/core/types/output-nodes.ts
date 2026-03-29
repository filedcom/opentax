import type { z } from "zod";
import type { AtLeastOne, NodeOutput, TaxNode } from "./tax-node.ts";
import { output } from "./tax-node.ts";

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
   * Type-safe factory with declared-node check — node must be in outputNodes.
   * Delegates to the standalone output() for construction.
   */
  output<T extends TNodes[number]>(
    node: T,
    fields: AtLeastOne<z.infer<T["inputSchema"]>>,
  ): NodeOutput {
    return output(node, fields);
  }
}
