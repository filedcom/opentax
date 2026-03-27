import type { z } from "zod";

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
  abstract readonly nodeType: NodeType;
  abstract readonly inputSchema: TSchema;
  abstract readonly outputNodeTypes: readonly NodeType[];
  abstract compute(input: z.infer<TSchema>): NodeResult;
}
