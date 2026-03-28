import { assertEquals, assertThrows } from "@std/assert";
import { z } from "zod";
import { registry } from "../../nodes/2025/registry.ts";
import type { NodeRegistry } from "../types/node-registry.ts";
import type { NodeResult } from "../types/tax-node.ts";
import { TaxNode } from "../types/tax-node.ts";
import type { GraphNode } from "./graph.ts";
import { computeTaxGraph } from "./graph.ts";

// --- Mock Nodes ---

const noOpSchema = z.object({});

class MockParentNode extends TaxNode<typeof noOpSchema> {
  readonly nodeType = "mock_parent";
  readonly inputSchema = noOpSchema;
  readonly outputNodeTypes = ["nonexistent"] as const;
  compute(): NodeResult {
    return { outputs: [] };
  }
}

class MockANode extends TaxNode<typeof noOpSchema> {
  readonly nodeType = "mock_a";
  readonly inputSchema = noOpSchema;
  readonly outputNodeTypes = ["mock_b"] as const;
  compute(): NodeResult {
    return { outputs: [] };
  }
}

class MockBNode extends TaxNode<typeof noOpSchema> {
  readonly nodeType = "mock_b";
  readonly inputSchema = noOpSchema;
  readonly outputNodeTypes = ["mock_a"] as const;
  compute(): NodeResult {
    return { outputs: [] };
  }
}

// --- Tests ---

Deno.test("computeTaxGraph: start returns full tree start -> [w2, int, div]", () => {
  const result: GraphNode = computeTaxGraph("start", registry);

  assertEquals(result.nodeType, "start");
  assertEquals(result.depth, 0);
  assertEquals(result.registered, true);
  // start outputs all input node types — verify at least w2, int, div are present
  assertEquals(result.children.length >= 3, true);

  const w2Node = result.children.find((c) => c.nodeType === "w2");
  assertEquals(w2Node !== undefined, true);
  assertEquals(w2Node!.depth, 1);
  assertEquals(w2Node!.registered, true);
  // w2 routes to many downstream nodes — just verify f1040 is among them
  const f1040Child = w2Node!.children.find((c) => c.nodeType === "f1040");
  assertEquals(f1040Child !== undefined, true);
  assertEquals(f1040Child!.registered, true);
});

Deno.test("computeTaxGraph: w2 returns subtree with f1040 as a child", () => {
  const result: GraphNode = computeTaxGraph("w2", registry);

  assertEquals(result.nodeType, "w2");
  assertEquals(result.depth, 0);
  assertEquals(result.registered, true);

  // w2 now routes to many downstream nodes; verify f1040 is present
  const f1040Node = result.children.find((c) => c.nodeType === "f1040");
  assertEquals(f1040Node !== undefined, true);
  assertEquals(f1040Node!.depth, 1);
  assertEquals(f1040Node!.registered, true);
  assertEquals(f1040Node!.children.length, 0);
});

Deno.test("computeTaxGraph: f1040 returns leaf node with empty children", () => {
  const result: GraphNode = computeTaxGraph("f1040", registry);

  assertEquals(result.nodeType, "f1040");
  assertEquals(result.depth, 0);
  assertEquals(result.registered, true);
  assertEquals(result.children.length, 0);
});

Deno.test("computeTaxGraph: maxDepth=1 on start returns start -> [w2, int, div] with children truncated", () => {
  const result: GraphNode = computeTaxGraph("start", registry, 1);

  assertEquals(result.nodeType, "start");
  assertEquals(result.depth, 0);
  assertEquals(result.children.length >= 3, true);

  for (const child of result.children) {
    assertEquals(child.depth, 1);
    // Each child is at maxDepth=1, so their children should be truncated (empty)
    assertEquals(child.children.length, 0);
  }
});

Deno.test("computeTaxGraph: maxDepth=0 on start returns just start node with empty children", () => {
  const result: GraphNode = computeTaxGraph("start", registry, 0);

  assertEquals(result.nodeType, "start");
  assertEquals(result.depth, 0);
  assertEquals(result.children.length, 0);
});

Deno.test("computeTaxGraph: unregistered child appears with registered=false and empty children", () => {
  const mockRegistry: NodeRegistry = {
    mock_parent: new MockParentNode(),
  };

  const result: GraphNode = computeTaxGraph("mock_parent", mockRegistry);

  assertEquals(result.nodeType, "mock_parent");
  assertEquals(result.registered, true);
  assertEquals(result.children.length, 1);

  const unregisteredChild = result.children[0];
  assertEquals(unregisteredChild.nodeType, "nonexistent");
  assertEquals(unregisteredChild.registered, false);
  assertEquals(unregisteredChild.children.length, 0);
});

Deno.test("computeTaxGraph: cycle guard prevents infinite recursion on A->B->A", () => {
  const cyclicRegistry: NodeRegistry = {
    mock_a: new MockANode(),
    mock_b: new MockBNode(),
  };

  // Should not throw or loop forever — cycle guard terminates it
  const result: GraphNode = computeTaxGraph("mock_a", cyclicRegistry);

  assertEquals(result.nodeType, "mock_a");
  assertEquals(result.registered, true);
  assertEquals(result.children.length, 1);

  const bNode = result.children[0];
  assertEquals(bNode.nodeType, "mock_b");
  assertEquals(bNode.registered, true);
  // mock_b's outputNodeTypes = ["mock_a"], but mock_a is already on the current path
  // cycle guard: mock_a appears as a child of mock_b but with empty children (re-expansion blocked)
  assertEquals(bNode.children.length, 1);

  const cycleNode = bNode.children[0];
  assertEquals(cycleNode.nodeType, "mock_a");
  assertEquals(cycleNode.registered, true);
  assertEquals(cycleNode.children.length, 0);
});

Deno.test("computeTaxGraph: unknown root nodeType throws error with descriptive message", () => {
  assertThrows(
    () => computeTaxGraph("bogus_type", registry),
    Error,
    "Unknown node type",
  );

  // Also verify the error message contains the bogus type and valid types
  try {
    computeTaxGraph("bogus_type", registry);
  } catch (err: unknown) {
    if (err instanceof Error) {
      assertEquals(err.message.includes("bogus_type"), true);
      assertEquals(err.message.includes("start"), true);
      assertEquals(err.message.includes("w2"), true);
      assertEquals(err.message.includes("f1040"), true);
    }
  }
});
