import { z } from "zod";
import type { InputNodeEntry } from "../../../core/types/form-definition.ts";
import type { NodeRegistry } from "../../../core/types/node-registry.ts";
import type { NodeContext } from "../../../core/types/node-context.ts";
import type { NodeResult } from "../../../core/types/tax-node.ts";
import { TaxNode } from "../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../core/types/output-nodes.ts";
import { f4868 } from "../nodes/inputs/general/filing/f4868/index.ts";
import { form4868 } from "../nodes/outputs/general/filing/form4868/index.ts";
import { inputNodes } from "./inputs.ts";

/** The extension's start node routes each singleton source to its node. */
function buildStartNode(entries: readonly InputNodeEntry[]): TaxNode {
  const singletons = entries.flatMap((entry) => entry.isArray ? [] : [entry]);
  if (singletons.length !== entries.length) {
    throw new Error("Form 4868 inputs are singletons");
  }
  const schema = z.object(
    Object.fromEntries(
      singletons.map((entry) => [
        entry.inputKey ?? entry.node.nodeType,
        entry.inputSchema.optional(),
      ]),
    ),
  ).strict();

  class GeneratedStartNode extends TaxNode<typeof schema> {
    readonly nodeType = "start";
    readonly inputSchema = schema;
    readonly outputNodes = new OutputNodes(
      singletons.map((entry) => entry.node),
    );

    compute(_ctx: NodeContext, input: z.infer<typeof schema>): NodeResult {
      const values: Readonly<Record<string, unknown>> = input;
      return {
        outputs: singletons.flatMap((entry) => {
          const value = values[entry.inputKey ?? entry.node.nodeType];
          return value === undefined || value === null ? [] : [{
            nodeType: entry.node.nodeType,
            fields: value as Readonly<Record<string, unknown>>,
          }];
        }),
      };
    }
  }
  return new GeneratedStartNode();
}

export const registry: NodeRegistry = {
  start: buildStartNode(inputNodes),
  f4868,
  form4868,
};
