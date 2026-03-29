import { assertEquals, assertStringIncludes } from "@std/assert";
import type { GraphNode } from "../../core/runtime/graph.ts";
import { formatMermaid, graphViewCommand } from "./graph.ts";

// ---------------------------------------------------------------------------
// Test 1: formatMermaid renders a flat tree with correct edges
// ---------------------------------------------------------------------------
Deno.test("formatMermaid: renders flat tree with --> edges", () => {
  const tree: GraphNode = {
    nodeType: "start",
    depth: 0,
    registered: true,
    children: [
      {
        nodeType: "w2",
        depth: 1,
        registered: true,
        children: [
          {
            nodeType: "line_01z_wages",
            depth: 2,
            registered: true,
            children: [],
          },
        ],
      },
    ],
  };

  const output = formatMermaid(tree);

  assertStringIncludes(output, "graph TD");
  assertStringIncludes(output, "start --> w2");
  assertStringIncludes(output, "w2 --> line_01z_wages");
});

// ---------------------------------------------------------------------------
// Test 2: formatMermaid renders a diamond (shared child) without duplicates
// ---------------------------------------------------------------------------
Deno.test("formatMermaid: deduplicates edges for diamond patterns", () => {
  const shared: GraphNode = { nodeType: "shared", depth: 2, registered: true, children: [] };
  const tree: GraphNode = {
    nodeType: "root",
    depth: 0,
    registered: true,
    children: [
      { nodeType: "a", depth: 1, registered: true, children: [shared] },
      { nodeType: "b", depth: 1, registered: true, children: [shared] },
    ],
  };

  const output = formatMermaid(tree);
  const lines = output.split("\n");

  // "a --> shared" and "b --> shared" each appear exactly once
  assertEquals(lines.filter((l) => l.includes("a --> shared")).length, 1);
  assertEquals(lines.filter((l) => l.includes("b --> shared")).length, 1);
});

// ---------------------------------------------------------------------------
// Test 3: formatMermaid marks unregistered nodes with label and style
// ---------------------------------------------------------------------------
Deno.test("formatMermaid: marks unregistered nodes with label and red style", () => {
  const tree: GraphNode = {
    nodeType: "parent",
    depth: 0,
    registered: true,
    children: [
      {
        nodeType: "nonexistent",
        depth: 1,
        registered: false,
        children: [],
      },
    ],
  };

  const output = formatMermaid(tree);

  assertStringIncludes(output, 'nonexistent["nonexistent (unregistered)"]');
  assertStringIncludes(output, "style nonexistent fill:#faa");
  assertStringIncludes(output, "parent --> nonexistent");
});

// ---------------------------------------------------------------------------
// Test 4: formatMermaid renders a leaf-only graph (no edges)
// ---------------------------------------------------------------------------
Deno.test("formatMermaid: renders leaf-only graph with just the root node", () => {
  const tree: GraphNode = {
    nodeType: "leaf",
    depth: 0,
    registered: true,
    children: [],
  };

  const output = formatMermaid(tree);

  assertStringIncludes(output, "graph TD");
  assertStringIncludes(output, "leaf");
  assertEquals(output.includes("-->"), false);
});

// ---------------------------------------------------------------------------
// Test 5: graphViewCommand with json=false prints Mermaid to stdout
// ---------------------------------------------------------------------------
Deno.test("graphViewCommand: json=false prints Mermaid diagram to stdout", () => {
  const logged: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => {
    logged.push(msg);
  };

  try {
    graphViewCommand({ nodeType: "start", depth: Infinity, json: false });
  } finally {
    console.log = originalLog;
  }

  assertEquals(logged.length > 0, true);
  const combined = logged.join("\n");
  assertStringIncludes(combined, "graph TD");
  assertStringIncludes(combined, "start");
  assertStringIncludes(combined, "w2");
});

// ---------------------------------------------------------------------------
// Test 6: graphViewCommand with json=true returns GraphNode object
// ---------------------------------------------------------------------------
Deno.test("graphViewCommand: json=true returns GraphNode object", () => {
  const result = graphViewCommand({
    nodeType: "start",
    depth: Infinity,
    json: true,
  });

  assertEquals(result !== undefined, true);
  const node = result as GraphNode;
  assertEquals(node.nodeType, "start");
  assertEquals(node.registered, true);
  assertEquals(typeof node.depth, "number");
  assertEquals(Array.isArray(node.children), true);
});
