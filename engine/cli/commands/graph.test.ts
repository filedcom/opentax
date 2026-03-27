import { assertEquals, assertStringIncludes } from "@std/assert";
import type { GraphNode } from "../../core/runtime/graph.ts";
import { formatAsciiTree, graphViewCommand } from "./graph.ts";

// ---------------------------------------------------------------------------
// Test 1: formatAsciiTree renders a flat tree with correct connectors
// ---------------------------------------------------------------------------
Deno.test("formatAsciiTree: renders flat tree with ├── and └── connectors", () => {
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

  const output = formatAsciiTree(tree);

  // Root node appears first
  assertStringIncludes(output, "start");
  // Child appears with └── connector (only child → last)
  assertStringIncludes(output, "└── w2");
  // Grandchild appears with proper indentation
  assertStringIncludes(output, "line_01z_wages");
});

// ---------------------------------------------------------------------------
// Test 2: formatAsciiTree renders nested tree with proper indentation
// ---------------------------------------------------------------------------
Deno.test("formatAsciiTree: renders nested tree a -> [b -> [d], c] with proper indentation", () => {
  const tree: GraphNode = {
    nodeType: "a",
    depth: 0,
    registered: true,
    children: [
      {
        nodeType: "b",
        depth: 1,
        registered: true,
        children: [
          { nodeType: "d", depth: 2, registered: true, children: [] },
        ],
      },
      {
        nodeType: "c",
        depth: 1,
        registered: true,
        children: [],
      },
    ],
  };

  const output = formatAsciiTree(tree);
  const lines = output.split("\n").filter((l: string) => l.length > 0);

  assertEquals(lines[0], "a");
  // b is NOT last (c follows) → ├──
  assertStringIncludes(lines[1], "├── b");
  // d is child of b (non-last parent) → │   prefix + └──
  assertStringIncludes(lines[2], "│");
  assertStringIncludes(lines[2], "└── d");
  // c is last child of a → └──
  assertStringIncludes(lines[3], "└── c");
});

// ---------------------------------------------------------------------------
// Test 3: formatAsciiTree marks unregistered nodes
// ---------------------------------------------------------------------------
Deno.test("formatAsciiTree: marks unregistered nodes with (unregistered)", () => {
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

  const output = formatAsciiTree(tree);
  assertStringIncludes(output, "nonexistent (unregistered)");
});

// ---------------------------------------------------------------------------
// Test 4: graphViewCommand with json=false prints ASCII to stdout
// ---------------------------------------------------------------------------
Deno.test("graphViewCommand: json=false prints ASCII tree to stdout via console.log", () => {
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

  // Should have logged at least one thing
  assertEquals(logged.length > 0, true);
  const combined = logged.join("\n");
  // ASCII tree output includes the root and children
  assertStringIncludes(combined, "start");
  assertStringIncludes(combined, "w2");
});

// ---------------------------------------------------------------------------
// Test 5: graphViewCommand with json=true returns GraphNode object
// ---------------------------------------------------------------------------
Deno.test("graphViewCommand: json=true returns GraphNode object", () => {
  const result = graphViewCommand({
    nodeType: "start",
    depth: Infinity,
    json: true,
  });

  // Must return a GraphNode (not void)
  assertEquals(result !== undefined, true);
  const node = result as GraphNode;
  assertEquals(node.nodeType, "start");
  assertEquals(node.registered, true);
  assertEquals(typeof node.depth, "number");
  assertEquals(Array.isArray(node.children), true);
});
