import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import type { GraphNode } from "../../core/runtime/graph.ts";
import { catalog } from "../../catalog.ts";
import { formatMermaid, graphViewCommand } from "./graph.ts";
import { nodeInspectCommand, nodeListCommand } from "./node.ts";

const registry = catalog["f1040:2025"].registry;

function captureLog(fn: () => void): string {
  const lines: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => lines.push(args.join(" "));
  try {
    fn();
  } finally {
    console.log = original;
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// nodeListCommand
// ---------------------------------------------------------------------------

Deno.test("nodeListCommand: includes count header", () => {
  const out = captureLog(() => nodeListCommand());
  const expected = `Registered Nodes (${Object.keys(registry).length})`;
  assertStringIncludes(out, expected);
});

Deno.test("nodeListCommand: includes every registered node type", () => {
  const out = captureLog(() => nodeListCommand());
  for (const nodeType of Object.keys(registry)) {
    assertStringIncludes(out, nodeType);
  }
});

Deno.test("nodeListCommand: output is sorted alphabetically", () => {
  const out = captureLog(() => nodeListCommand());
  const types = Object.keys(registry).sort();
  const firstType = types[0];
  const lastType = types[types.length - 1];
  const firstPos = out.indexOf(firstType);
  const lastPos = out.indexOf(lastType);
  assertEquals(firstPos < lastPos, true);
});

// ---------------------------------------------------------------------------
// nodeInspectCommand — unknown node
// ---------------------------------------------------------------------------

Deno.test("nodeInspectCommand: unknown nodeType throws with message", () => {
  assertThrows(
    () => nodeInspectCommand({ nodeType: "nonexistent", json: false }),
    Error,
    "Unknown node type: nonexistent",
  );
});

// ---------------------------------------------------------------------------
// nodeInspectCommand — text output (w2)
// ---------------------------------------------------------------------------

Deno.test("nodeInspectCommand: prints node name header", () => {
  const out = captureLog(() => nodeInspectCommand({ nodeType: "w2", json: false }));
  assertStringIncludes(out, "Node: w2");
});

Deno.test("nodeInspectCommand: prints Input Schema section", () => {
  const out = captureLog(() => nodeInspectCommand({ nodeType: "w2", json: false }));
  assertStringIncludes(out, "Input Schema:");
});

Deno.test("nodeInspectCommand: prints schema fields from w2 inputSchema", () => {
  const out = captureLog(() => nodeInspectCommand({ nodeType: "w2", json: false }));
  // w2 has a top-level array field 'w2s'
  assertStringIncludes(out, "w2s");
  assertStringIncludes(out, "box1_wages");
});

Deno.test("nodeInspectCommand: prints Output Nodes section", () => {
  const out = captureLog(() => nodeInspectCommand({ nodeType: "w2", json: false }));
  assertStringIncludes(out, "Output Nodes");
  assertStringIncludes(out, "f1040");
});

Deno.test("nodeInspectCommand: output node count matches node.outputNodeTypes", () => {
  const out = captureLog(() => nodeInspectCommand({ nodeType: "w2", json: false }));
  const count = registry["w2"].outputNodeTypes.length;
  assertStringIncludes(out, `Output Nodes (${count})`);
});

// ---------------------------------------------------------------------------
// nodeInspectCommand — leaf node (no outputs)
// ---------------------------------------------------------------------------

Deno.test("nodeInspectCommand: leaf output node shows (none) for outputs", () => {
  // f1040 is an output node with no downstream outputs
  const f1040 = registry["f1040"];
  if (f1040.outputNodeTypes.length > 0) return; // skip if it gains outputs
  const out = captureLog(() => nodeInspectCommand({ nodeType: "f1040", json: false }));
  assertStringIncludes(out, "(none)");
});

// ---------------------------------------------------------------------------
// nodeInspectCommand — JSON output
// ---------------------------------------------------------------------------

Deno.test("nodeInspectCommand: json=true prints valid JSON to stdout", () => {
  const lines: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => lines.push(args.join(" "));
  try {
    nodeInspectCommand({ nodeType: "w2", json: true });
  } finally {
    console.log = original;
  }
  const parsed = JSON.parse(lines.join("\n"));
  assertEquals(parsed.nodeType, "w2");
  assertEquals(Array.isArray(parsed.schema), true);
  assertEquals(Array.isArray(parsed.outputNodes), true);
});

Deno.test("nodeInspectCommand: json=true includes all outputNodeTypes", () => {
  const lines: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => lines.push(args.join(" "));
  try {
    nodeInspectCommand({ nodeType: "w2", json: true });
  } finally {
    console.log = original;
  }
  const parsed = JSON.parse(lines.join("\n"));
  const expected = registry["w2"].outputNodeTypes;
  assertEquals(parsed.outputNodes, expected);
});

Deno.test("nodeInspectCommand: json=true includes implemented flag", () => {
  const lines: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => lines.push(args.join(" "));
  try {
    nodeInspectCommand({ nodeType: "w2", json: true });
  } finally {
    console.log = original;
  }
  const parsed = JSON.parse(lines.join("\n"));
  assertEquals(typeof parsed.implemented, "boolean");
});

// ---------------------------------------------------------------------------
// node graph — formatMermaid
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

  assertEquals(lines.filter((l) => l.includes("a --> shared")).length, 1);
  assertEquals(lines.filter((l) => l.includes("b --> shared")).length, 1);
});

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
// node graph — graphViewCommand
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
