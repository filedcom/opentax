import { assertEquals } from "@std/assert";
import { z } from "zod";
import { type NodeResult, TaxNode } from "./tax-node.ts";
import { OutputNodes } from "./output-nodes.ts";

// --- Mock nodes ---

const schemaA = z.object({ value: z.number() });
class MockNodeA extends TaxNode<typeof schemaA> {
  readonly nodeType = "mock_a";
  readonly inputSchema = schemaA;
  readonly outputNodes = new OutputNodes([]);
  compute(): NodeResult {
    return { outputs: [] };
  }
}

const schemaB = z.object({ name: z.string() });
class MockNodeB extends TaxNode<typeof schemaB> {
  readonly nodeType = "mock_b";
  readonly inputSchema = schemaB;
  readonly outputNodes = new OutputNodes([]);
  compute(): NodeResult {
    return { outputs: [] };
  }
}

const nodeA = new MockNodeA();
const nodeB = new MockNodeB();

// --- OutputNodes declaration ---

Deno.test("OutputNodes: nodeTypes returns nodeType strings of all declared nodes", () => {
  const out = new OutputNodes([nodeA, nodeB]);
  assertEquals(out.nodeTypes, ["mock_a", "mock_b"]);
});

Deno.test("OutputNodes: nodeTypes is empty when no nodes declared", () => {
  const out = new OutputNodes([]);
  assertEquals(out.nodeTypes, []);
});
