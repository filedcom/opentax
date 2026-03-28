import type { z } from "zod";
import type { NodeOutput, NodeResult, TaxNode } from "./tax-node.ts";

// Per-compute() accumulator — created fresh by OutputNodes.builder()
export class OutputBuilder<TNodes extends readonly TaxNode<z.ZodTypeAny>[]> {
  readonly #entries: NodeOutput[] = [];

  constructor(_nodes: TNodes) {}

  // Type-safe: node must be declared in outputNodes, input must match its schema
  add<T extends TNodes[number]>(
    node: T,
    input: z.infer<T["inputSchema"]>,
  ): this {
    this.#entries.push({ nodeType: node.nodeType, input });
    return this;
  }

  build(): NodeResult {
    return { outputs: [...this.#entries] };
  }
}

// Class-level declaration — holds node instances for graph topology + type-checking
export class OutputNodes<TNodes extends readonly TaxNode<z.ZodTypeAny>[]> {
  readonly #nodes: TNodes;

  constructor(nodes: TNodes) {
    this.#nodes = nodes;
  }

  get nodeTypes(): readonly string[] {
    return this.#nodes.map((n) => n.nodeType);
  }

  // Returns a fresh, empty builder for one compute() call
  builder(): OutputBuilder<TNodes> {
    return new OutputBuilder(this.#nodes);
  }
}
