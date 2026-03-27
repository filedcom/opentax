import { assertEquals } from "@std/assert";
import { z } from "zod";
import { type NodeResult, TaxNode } from "./tax-node.ts";

// A concrete subclass for testing
const addSchema = z.object({
  a: z.number(),
  b: z.number(),
});

class MockAddNode extends TaxNode<typeof addSchema> {
  readonly nodeType = "mock_add";
  readonly inputSchema = addSchema;
  readonly outputNodeTypes = ["mock_output"] as const;

  compute(input: z.infer<typeof addSchema>): NodeResult {
    const sum = input.a + input.b;
    return {
      outputs: [{ nodeType: "mock_output", input: { sum } }],
    };
  }
}

Deno.test("MockAddNode: can be instantiated", () => {
  const node = new MockAddNode();
  assertEquals(node.nodeType, "mock_add");
  assertEquals(node.outputNodeTypes, ["mock_output"]);
});

Deno.test("MockAddNode: compute() returns a valid NodeResult with outputs array", () => {
  const node = new MockAddNode();
  const result = node.compute({ a: 3, b: 4 });
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "mock_output");
  assertEquals((result.outputs[0].input as { sum: number }).sum, 7);
});

Deno.test("MockAddNode: inputSchema validates valid input via safeParse", () => {
  const node = new MockAddNode();
  const parsed = node.inputSchema.safeParse({ a: 10, b: 20 });
  assertEquals(parsed.success, true);
  if (parsed.success) {
    assertEquals(parsed.data.a, 10);
    assertEquals(parsed.data.b, 20);
  }
});

Deno.test("MockAddNode: inputSchema rejects invalid input via safeParse", () => {
  const node = new MockAddNode();
  const parsed = node.inputSchema.safeParse({ a: "not-a-number", b: 20 });
  assertEquals(parsed.success, false);
});

Deno.test("MockAddNode: inputSchema rejects missing fields via safeParse", () => {
  const node = new MockAddNode();
  const parsed = node.inputSchema.safeParse({ a: 5 });
  assertEquals(parsed.success, false);
});
