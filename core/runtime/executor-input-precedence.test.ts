import { assertEquals } from "@std/assert";
import { z } from "zod";
import type { NodeContext } from "../types/node-context.ts";
import type { NodeRegistry } from "../types/node-registry.ts";
import { OutputNodes } from "../types/output-nodes.ts";
import { type NodeResult, TaxNode } from "../types/tax-node.ts";
import { execute } from "./executor.ts";
import type { ExecutionStep } from "./planner.ts";

const consumerInputSchema = z.object({ value: z.number() });

class ConsumerNode extends TaxNode<typeof consumerInputSchema> {
  readonly nodeType = "consumer";
  readonly inputSchema = consumerInputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(
    _ctx: NodeContext,
    _input: z.infer<typeof consumerInputSchema>,
  ): NodeResult {
    return { outputs: [] };
  }
}

const producerInputSchema = z.object({ value: z.number() });

class ProducerNode extends TaxNode<typeof producerInputSchema> {
  readonly nodeType = "producer";
  readonly inputSchema = producerInputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(
    _ctx: NodeContext,
    input: z.infer<typeof producerInputSchema>,
  ): NodeResult {
    return {
      outputs: [{ nodeType: "consumer", fields: { value: input.value } }],
    };
  }
}

const startSchema = z.object({ direct: z.number(), computed: z.number() });

class TestStart extends TaxNode<typeof startSchema> {
  readonly nodeType = "start";
  readonly inputSchema = startSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: z.infer<typeof startSchema>): NodeResult {
    return {
      outputs: [
        { nodeType: "consumer", fields: { value: input.direct } },
        { nodeType: "producer", fields: { value: input.computed } },
      ],
    };
  }
}

Deno.test("executor: computed fields replace matching direct-input fields", () => {
  const plan: readonly ExecutionStep[] = [
    { id: "start", nodeType: "start" },
    { id: "producer", nodeType: "producer" },
    { id: "consumer", nodeType: "consumer" },
  ];
  const registry: NodeRegistry = {
    start: new TestStart(),
    producer: new ProducerNode(),
    consumer: new ConsumerNode(),
  };

  const result = execute(plan, registry, { direct: 10, computed: 20 }, {
    taxYear: 2025,
    formType: "f1040",
  });

  assertEquals(result.pending["consumer"]?.["value"], 20);
  assertEquals(result.diagnostics, []);
});
