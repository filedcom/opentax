import {
  assertEquals,
  assertNotStrictEquals,
  assertStrictEquals,
} from "@std/assert";
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

Deno.test("OutputNodes: builder() returns a fresh OutputBuilder each time", () => {
  const out = new OutputNodes([nodeA]);
  const b1 = out.builder();
  const b2 = out.builder();
  assertNotStrictEquals(b1, b2);
});

Deno.test("OutputNodes: two builder() calls produce independent builders (no shared state)", () => {
  const out = new OutputNodes([nodeA]);
  const b1 = out.builder();
  b1.add(nodeA, { value: 1 });
  const b2 = out.builder(); // should not inherit b1's entries
  assertEquals(b2.build().outputs.length, 0);
});

// --- OutputBuilder ---

Deno.test("OutputBuilder: build() on empty builder returns empty NodeResult", () => {
  const out = new OutputNodes([nodeA]);
  assertEquals(out.builder().build().outputs.length, 0);
});

Deno.test("OutputBuilder: add() stores entry with correct nodeType and input", () => {
  const result = new OutputNodes([nodeA]).builder()
    .add(nodeA, { value: 42 })
    .build();
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "mock_a");
  assertEquals(result.outputs[0].input, { value: 42 });
});

Deno.test("OutputBuilder: add() returns this for chaining", () => {
  const builder = new OutputNodes([nodeA]).builder();
  assertStrictEquals(builder.add(nodeA, { value: 1 }), builder);
});

Deno.test("OutputBuilder: add() multiple calls accumulate entries in order", () => {
  const result = new OutputNodes([nodeA, nodeB]).builder()
    .add(nodeA, { value: 1 })
    .add(nodeB, { name: "hello" })
    .build();
  assertEquals(result.outputs.length, 2);
  assertEquals(result.outputs[0].nodeType, "mock_a");
  assertEquals(result.outputs[1].nodeType, "mock_b");
});

Deno.test("OutputBuilder: add() same node twice produces two entries", () => {
  const result = new OutputNodes([nodeA]).builder()
    .add(nodeA, { value: 1 })
    .add(nodeA, { value: 2 })
    .build();
  assertEquals(result.outputs.length, 2);
  assertEquals((result.outputs[0].input as { value: number }).value, 1);
  assertEquals((result.outputs[1].input as { value: number }).value, 2);
});

// Compile-time checks — TypeScript must reject these:

// @ts-expect-error nodeB is not in the declared nodes list
new OutputNodes([nodeA]).builder().add(nodeB, { name: "x" });

// @ts-expect-error wrong input type for nodeA (name is not in schemaA)
new OutputNodes([nodeA]).builder().add(nodeA, { name: "wrong" });
