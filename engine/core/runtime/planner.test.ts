import { assertEquals } from "@std/assert";
import { z } from "zod";
import type { NodeRegistry } from "../types/node-registry.ts";
import type { NodeResult } from "../types/tax-node.ts";
import { TaxNode } from "../types/tax-node.ts";
import { OutputNodes } from "../types/output-nodes.ts";
import { buildExecutionPlan } from "./planner.ts";

// --- Mock Nodes (defined leaf-first so instances can be passed to OutputNodes) ---

const leafInputSchema = z.object({ value: z.number().optional() });
class MockLeafNode extends TaxNode<typeof leafInputSchema> {
  readonly nodeType = "mock_leaf";
  readonly inputSchema = leafInputSchema;
  readonly outputNodes = new OutputNodes([]);
  compute(): NodeResult {
    return { outputs: [] };
  }
}
const mockLeafNode = new MockLeafNode();

// W2 node takes full array (new model)
const w2InputSchema = z.object({
  w2s: z.array(z.object({ wages: z.number() })).min(1),
});
class MockW2Node extends TaxNode<typeof w2InputSchema> {
  readonly nodeType = "mock_w2";
  readonly inputSchema = w2InputSchema;
  readonly outputNodes = new OutputNodes([mockLeafNode]);
  compute(input: z.infer<typeof w2InputSchema>): NodeResult {
    const total = input.w2s.reduce((s, w) => s + w.wages, 0);
    return {
      outputs: [{ nodeType: "mock_leaf", input: { value: total } }],
    };
  }
}
const mockW2Node = new MockW2Node();

// Start node dispatches full w2 array as single output (new model)
const startInputSchema = z.object({
  w2s: z.array(z.object({ wages: z.number() })).optional(),
});
class MockStartNode extends TaxNode<typeof startInputSchema> {
  readonly nodeType = "start";
  readonly inputSchema = startInputSchema;
  readonly outputNodes = new OutputNodes([mockW2Node]);
  compute(input: z.infer<typeof startInputSchema>): NodeResult {
    const outputs = [];
    if (input.w2s?.length) {
      outputs.push({ nodeType: "mock_w2" as const, input: { w2s: input.w2s } });
    }
    return { outputs };
  }
}

// --- Tests ---

Deno.test("planner: single node (start only, no outputs) produces [start]", () => {
  const emptyStartSchema = z.object({});
  class EmptyStartNode extends TaxNode<typeof emptyStartSchema> {
    readonly nodeType = "start";
    readonly inputSchema = emptyStartSchema;
    readonly outputNodes = new OutputNodes([]);
    compute(): NodeResult {
      return { outputs: [] };
    }
  }
  const registry: NodeRegistry = { start: new EmptyStartNode() };
  const plan = buildExecutionPlan(registry);
  assertEquals(plan.length, 1);
  assertEquals(plan[0].id, "start");
  assertEquals(plan[0].nodeType, "start");
});

Deno.test("planner: linear chain (start -> mock_w2 -> mock_leaf) produces correct topo order", () => {
  const registry: NodeRegistry = {
    start: new MockStartNode(),
    mock_w2: mockW2Node,
    mock_leaf: mockLeafNode,
  };
  const plan = buildExecutionPlan(registry);

  // 3 node types: start, mock_w2, mock_leaf
  assertEquals(plan.length, 3);
  assertEquals(plan[0].id, "start");
  assertEquals(plan[0].nodeType, "start");

  // mock_w2 before mock_leaf
  const w2Idx = plan.findIndex((s) => s.nodeType === "mock_w2");
  const leafIdx = plan.findIndex((s) => s.nodeType === "mock_leaf");
  assertEquals(w2Idx < leafIdx, true);
});

Deno.test("planner: each nodeType fires exactly once regardless of input count", () => {
  // Even with 5 W-2s in inputs, mock_w2 appears exactly once in the plan
  const registry: NodeRegistry = {
    start: new MockStartNode(),
    mock_w2: mockW2Node,
    mock_leaf: mockLeafNode,
  };
  const plan = buildExecutionPlan(registry);

  const w2Steps = plan.filter((s) => s.nodeType === "mock_w2");
  assertEquals(w2Steps.length, 1);
});

Deno.test("planner: step ID equals nodeType (no numeric suffixes)", () => {
  const registry: NodeRegistry = {
    start: new MockStartNode(),
    mock_w2: mockW2Node,
    mock_leaf: mockLeafNode,
  };
  const plan = buildExecutionPlan(registry);

  for (const step of plan) {
    assertEquals(step.id, step.nodeType);
  }
});

Deno.test("planner: diamond graph (start -> B, start -> C, B -> D, C -> D) valid topo order", () => {
  const bInputSchema = z.object({ x: z.number() });
  const cInputSchema = z.object({ y: z.number() });
  const dInputSchema = z.object({ result: z.number().optional() });

  // Define leaf-first so instances can be referenced in parent outputNodes
  class DiamondD extends TaxNode<typeof dInputSchema> {
    readonly nodeType = "diamond_d";
    readonly inputSchema = dInputSchema;
    readonly outputNodes = new OutputNodes([]);
    compute(): NodeResult {
      return { outputs: [] };
    }
  }
  const diamondD = new DiamondD();

  class DiamondB extends TaxNode<typeof bInputSchema> {
    readonly nodeType = "diamond_b";
    readonly inputSchema = bInputSchema;
    readonly outputNodes = new OutputNodes([diamondD]);
    compute(input: z.infer<typeof bInputSchema>): NodeResult {
      return {
        outputs: [{ nodeType: "diamond_d", input: { result: input.x } }],
      };
    }
  }
  const diamondB = new DiamondB();

  class DiamondC extends TaxNode<typeof cInputSchema> {
    readonly nodeType = "diamond_c";
    readonly inputSchema = cInputSchema;
    readonly outputNodes = new OutputNodes([diamondD]);
    compute(input: z.infer<typeof cInputSchema>): NodeResult {
      return {
        outputs: [{ nodeType: "diamond_d", input: { result: input.y } }],
      };
    }
  }
  const diamondC = new DiamondC();

  const diamondStartSchema = z.object({ val: z.number() });
  class DiamondStart extends TaxNode<typeof diamondStartSchema> {
    readonly nodeType = "start";
    readonly inputSchema = diamondStartSchema;
    readonly outputNodes = new OutputNodes([diamondB, diamondC]);
    compute(input: z.infer<typeof diamondStartSchema>): NodeResult {
      return {
        outputs: [
          { nodeType: "diamond_b", input: { x: input.val } },
          { nodeType: "diamond_c", input: { y: input.val } },
        ],
      };
    }
  }

  const registry: NodeRegistry = {
    start: new DiamondStart(),
    diamond_b: diamondB,
    diamond_c: diamondC,
    diamond_d: diamondD,
  };
  const plan = buildExecutionPlan(registry);

  assertEquals(plan.length, 4);
  const startIdx = plan.findIndex((s) => s.id === "start");
  const bIdx = plan.findIndex((s) => s.nodeType === "diamond_b");
  const cIdx = plan.findIndex((s) => s.nodeType === "diamond_c");
  const dIdx = plan.findIndex((s) => s.nodeType === "diamond_d");

  assertEquals(startIdx < bIdx, true);
  assertEquals(startIdx < cIdx, true);
  assertEquals(bIdx < dIdx, true);
  assertEquals(cIdx < dIdx, true);
});

Deno.test("planner: all nodes in registry appear in plan (optional nodes included — executor skips them)", () => {
  // Optional nodes (e.g. schedule_c) are included in the plan even when inputs
  // contain no schedule_c data. The executor silently skips them via Zod parse fail.
  const optionalSchema = z.object({ required_field: z.string() });
  class OptionalNode extends TaxNode<typeof optionalSchema> {
    readonly nodeType = "optional_node";
    readonly inputSchema = optionalSchema;
    readonly outputNodes = new OutputNodes([]);
    compute(): NodeResult {
      return { outputs: [] };
    }
  }

  const registry: NodeRegistry = {
    start: new MockStartNode(),
    mock_w2: mockW2Node,
    mock_leaf: mockLeafNode,
    optional_node: new OptionalNode(),
  };
  const plan = buildExecutionPlan(registry);

  assertEquals(plan.length, 4);
  const optionalStep = plan.find((s) => s.nodeType === "optional_node");
  assertEquals(optionalStep !== undefined, true);
  assertEquals(optionalStep!.id, "optional_node");
});
