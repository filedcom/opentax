import { z } from "zod";

export type NodeType = string;

// What a node passes to a downstream node
export type NodeOutput = {
  readonly nodeType: NodeType;
  readonly input: Readonly<Record<string, unknown>>;
};

// What compute() returns
export type NodeResult = {
  readonly outputs: readonly NodeOutput[];
};

// Abstract base class - every tax node extends this
export abstract class TaxNode<TSchema extends z.ZodTypeAny = z.ZodTypeAny> {
  readonly implemented: boolean = true as const;
  abstract readonly nodeType: NodeType;
  abstract readonly inputSchema: TSchema;
  abstract readonly outputNodeTypes: readonly NodeType[];
  abstract compute(input: z.infer<TSchema>): NodeResult;
}

export class UnimplementedTaxNode extends TaxNode {
  override readonly implemented = false as const;
  readonly inputSchema = z.object({});
  nodeType: NodeType;
  outputNodeTypes: readonly NodeType[];

  constructor(nodeType: NodeType, outputNodeTypes: readonly NodeType[]) {
    super();
    this.nodeType = nodeType;
    this.outputNodeTypes = outputNodeTypes;
  }

  compute(): NodeResult {
    throw new Error(`Node '${this.nodeType}' is not yet implemented.`);
  }
}
