import { z } from "zod";
import type { NodeContext } from "./node-context.ts";
import { OutputNodes } from "./output-nodes.ts";

export type NodeType = string;

// What a node passes to a downstream node
export type NodeOutput = {
  readonly nodeType: NodeType;
  readonly fields: Readonly<Record<string, unknown>>;
};

// What compute() returns
export type NodeResult = {
  readonly outputs: readonly NodeOutput[];
  // Carryforward amounts to next tax year (key = descriptive label, value = positive amount)
  readonly carryforwards?: Readonly<Record<string, number>>;
};

// Requires at least one key from T to be present
export type AtLeastOne<T> = {
  [K in keyof T]: Pick<Required<T>, K> & Partial<Omit<T, K>>;
}[keyof T];

// Standalone factory — type-safe fields, usable in pure helper functions
export function output<T extends TaxNode<z.ZodTypeAny>>(
  node: T,
  fields: AtLeastOne<z.infer<T["inputSchema"]>>,
): NodeOutput {
  return { nodeType: node.nodeType, fields };
}

// Abstract base class - every tax node extends this
export abstract class TaxNode<TSchema extends z.ZodTypeAny = z.ZodTypeAny> {
  readonly implemented: boolean = true as const;
  abstract readonly nodeType: NodeType;
  abstract readonly inputSchema: TSchema;
  abstract readonly outputNodes: OutputNodes<readonly TaxNode<z.ZodTypeAny>[]>;
  abstract compute(ctx: NodeContext, input: z.infer<TSchema>): NodeResult;

  get outputNodeTypes(): readonly NodeType[] {
    return this.outputNodes.nodeTypes;
  }
}

export class UnimplementedTaxNode extends TaxNode {
  override readonly implemented = false as const;
  readonly inputSchema = z.object({});
  readonly nodeType: NodeType;
  readonly outputNodes: OutputNodes<[]>;

  constructor(nodeType: NodeType) {
    super();
    this.nodeType = nodeType;
    this.outputNodes = new OutputNodes([]);
  }

  compute(_ctx: NodeContext, _input: unknown): NodeResult {
    throw new Error(`Node '${this.nodeType}' is not yet implemented.`);
  }
}
