import { z } from "zod";
import type { InputNodeEntry } from "../../../core/types/form-definition.ts";
import type { NodeOutput, NodeResult } from "../../../core/types/tax-node.ts";
import { TaxNode } from "../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../core/types/node-context.ts";
import { inputNodes } from "./inputs.ts";

export { inputNodes };

/**
 * Builds a Zod schema for the start node from the inputNodes list.
 * Array entries: key = nodeType, value = z.array(itemSchema).optional()
 * Singleton entries: key = nodeType, value = inputSchema.optional()
 */
function buildInputSchema(entries: readonly InputNodeEntry[]): z.ZodObject<z.ZodRawShape> {
  const shape: z.ZodRawShape = {};
  for (const entry of entries) {
    if (entry.isArray) {
      shape[entry.node.nodeType] = z.array(entry.itemSchema).optional();
    } else {
      shape[entry.node.nodeType] = entry.inputSchema.optional();
    }
  }
  return z.object(shape);
}

/**
 * Gets the pluralized key that a downstream array node expects in its inputSchema.
 * For example, the w2 node expects { w2s: [...] }, so this returns "w2s".
 */
function getArrayNodeKey(entry: Extract<InputNodeEntry, { isArray: true }>): string {
  const nodeInputSchema = entry.node.inputSchema as z.ZodObject<z.ZodRawShape>;
  const keys = Object.keys(nodeInputSchema.shape);
  return keys[0];
}

/**
 * Factory that creates a StartNode class from an inputNodes list and returns a singleton.
 * The generated start node uses nodeType (non-pluralized) as schema keys,
 * and routes each present input to the correct downstream node.
 */
export function buildStartNode(entries: readonly InputNodeEntry[]): TaxNode {
  const generatedSchema = buildInputSchema(entries);
  type StartInput = z.infer<typeof generatedSchema>;

  class GeneratedStartNode extends TaxNode<typeof generatedSchema> {
    readonly nodeType = "start";
    readonly inputSchema = generatedSchema;
    readonly outputNodes = new OutputNodes(entries.map((e) => e.node) as TaxNode[]);

    compute(_ctx: NodeContext, input: StartInput): NodeResult {
      const outputs: NodeOutput[] = [];
      for (const entry of entries) {
        const key = entry.node.nodeType;
        const value = (input as Record<string, unknown>)[key];
        if (value == null) continue;
        if (entry.isArray) {
          const arr = value as unknown[];
          if (arr.length === 0) continue;
          const downstreamKey = getArrayNodeKey(entry);
          outputs.push({
            nodeType: entry.node.nodeType,
            fields: { [downstreamKey]: arr },
          });
        } else {
          outputs.push({
            nodeType: entry.node.nodeType,
            fields: value as Record<string, unknown>,
          });
        }
      }
      return { outputs };
    }
  }

  return new GeneratedStartNode();
}
