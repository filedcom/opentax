import { z } from "zod";
import { OutputNodes } from "./output-nodes.ts";

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
  abstract readonly outputNodes: OutputNodes<readonly TaxNode<z.ZodTypeAny>[]>;
  abstract compute(input: z.infer<TSchema>): NodeResult;

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

  compute(): NodeResult {
    throw new Error(`Node '${this.nodeType}' is not yet implemented.`);
  }
}
