import type { z } from "zod";
import type { TaxNode } from "./tax-node.ts";

// Class-level declaration — holds node instances for graph topology + type-checking
export class OutputNodes<TNodes extends readonly TaxNode<z.ZodTypeAny>[]> {
  readonly #nodes: TNodes;

  constructor(nodes: TNodes) {
    this.#nodes = nodes;
  }

  get nodeTypes(): readonly string[] {
    return this.#nodes.map((n) => n.nodeType);
  }
}
