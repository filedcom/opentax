import { assertEquals, assertThrows } from "@std/assert";
import { computeTaxGraph } from "./graph.ts";
import type { GraphNode } from "./graph.ts";
import type { NodeRegistry } from "../types/node-registry.ts";
import { TaxNode } from "../types/tax-node.ts";
import { z } from "zod";
import type { NodeResult } from "../types/tax-node.ts";
import { registry } from "../../registry.ts";

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

Deno.test("computeTaxGraph: start returns full tree start -> w2 -> line_01z_wages", () => {
  const result: GraphNode = computeTaxGraph("start", registry);

  assertEquals(result.nodeType, "start");
  assertEquals(result.depth, 0);
  assertEquals(result.registered, true);
  assertEquals(result.children.length, 1);

  const w2Node = result.children[0];
  assertEquals(w2Node.nodeType, "w2");
  assertEquals(w2Node.depth, 1);
  assertEquals(w2Node.registered, true);
  assertEquals(w2Node.children.length, 1);

  const lineNode = w2Node.children[0];
  assertEquals(lineNode.nodeType, "line_01z_wages");
  assertEquals(lineNode.depth, 2);
  assertEquals(lineNode.registered, true);
  assertEquals(lineNode.children.length, 0);
});

Deno.test("computeTaxGraph: w2 returns subtree w2 -> line_01z_wages", () => {
  const result: GraphNode = computeTaxGraph("w2", registry);

  assertEquals(result.nodeType, "w2");
  assertEquals(result.depth, 0);
  assertEquals(result.registered, true);
  assertEquals(result.children.length, 1);

  const lineNode = result.children[0];
  assertEquals(lineNode.nodeType, "line_01z_wages");
  assertEquals(lineNode.depth, 1);
  assertEquals(lineNode.registered, true);
  assertEquals(lineNode.children.length, 0);
});

Deno.test("computeTaxGraph: line_01z_wages returns leaf node with empty children", () => {
  const result: GraphNode = computeTaxGraph("line_01z_wages", registry);

  assertEquals(result.nodeType, "line_01z_wages");
  assertEquals(result.depth, 0);
  assertEquals(result.registered, true);
  assertEquals(result.children.length, 0);
});

Deno.test("computeTaxGraph: maxDepth=1 on start returns start -> [w2] with w2 children truncated", () => {
  const result: GraphNode = computeTaxGraph("start", registry, 1);

  assertEquals(result.nodeType, "start");
  assertEquals(result.depth, 0);
  assertEquals(result.children.length, 1);

  const w2Node = result.children[0];
  assertEquals(w2Node.nodeType, "w2");
  assertEquals(w2Node.depth, 1);
  // w2 is at maxDepth=1, so its children should be truncated (empty)
  assertEquals(w2Node.children.length, 0);
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
  // mock_b wants to go back to mock_a, but that creates a cycle — children should be empty
  assertEquals(bNode.children.length, 0);
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
      assertEquals(err.message.includes("line_01z_wages"), true);
    }
  }
});
