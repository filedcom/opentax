import { assertEquals } from "@std/assert";
import { execute } from "./executor.ts";
import type { NodeRegistry } from "../types/node-registry.ts";
import { TaxNode } from "../types/tax-node.ts";
import { z } from "zod";
import type { NodeResult } from "../types/tax-node.ts";
import type { ExecutionStep } from "./planner.ts";

// --- Mock Nodes ---

// Simple A node: deposits a value to B
const aInputSchema = z.object({ value: z.number() });
class MockNodeA extends TaxNode<typeof aInputSchema> {
  readonly nodeType = "mock_a";
  readonly inputSchema = aInputSchema;
  readonly outputNodeTypes = ["mock_b"] as const;
  compute(input: z.infer<typeof aInputSchema>): NodeResult {
    return {
      outputs: [{ nodeType: "mock_b", input: { received: input.value } }],
    };
  }
}

// Simple B node: leaf, receives from A
const bInputSchema = z.object({ received: z.number() });
class MockNodeB extends TaxNode<typeof bInputSchema> {
  readonly nodeType = "mock_b";
  readonly inputSchema = bInputSchema;
  readonly outputNodeTypes = [] as const;
  compute(input: z.infer<typeof bInputSchema>): NodeResult {
    return {
      outputs: [
        { nodeType: "mock_b_result", input: { doubled: input.received * 2 } },
      ],
    };
  }
}

// W2-like node: deposits wages array entry to aggregator
const w2InputSchema = z.object({ wages: z.number() });
class _MockW2Node extends TaxNode<typeof w2InputSchema> {
  readonly nodeType = "mock_w2";
  readonly inputSchema = w2InputSchema;
  readonly outputNodeTypes = ["mock_aggregator"] as const;
  compute(input: z.infer<typeof w2InputSchema>): NodeResult {
    return {
      outputs: [{ nodeType: "mock_aggregator", input: { wages: input.wages } }],
    };
  }
}

// Aggregator node: receives wages (becomes array via accumulation)
const aggregatorInputSchema = z.object({
  wages: z.union([z.number(), z.array(z.number())]).optional(),
});
class MockAggregatorNode extends TaxNode<typeof aggregatorInputSchema> {
  readonly nodeType = "mock_aggregator";
  readonly inputSchema = aggregatorInputSchema;
  readonly outputNodeTypes = [] as const;
  compute(input: z.infer<typeof aggregatorInputSchema>): NodeResult {
    const wages = Array.isArray(input.wages)
      ? input.wages
      : input.wages !== undefined
      ? [input.wages]
      : [];
    const total = wages.reduce((sum, w) => sum + w, 0);
    return {
      outputs: [{ nodeType: "mock_total", input: { total } }],
    };
  }
}

// Optional node: requires strict fields (will fail safeParse if no inputs deposited)
const optionalInputSchema = z.object({
  required_field: z.string(),
});
class MockOptionalNode extends TaxNode<typeof optionalInputSchema> {
  readonly nodeType = "mock_optional";
  readonly inputSchema = optionalInputSchema;
  readonly outputNodeTypes = [] as const;
  compute(): NodeResult {
    return { outputs: [] };
  }
}

// Start node for the full W-2 scenario
const startInputSchema = z.object({
  w2s: z.array(z.object({ wages: z.number() })),
});
class _MockStartNode extends TaxNode<typeof startInputSchema> {
  readonly nodeType = "start";
  readonly inputSchema = startInputSchema;
  readonly outputNodeTypes = ["mock_w2"] as const;
  compute(input: z.infer<typeof startInputSchema>): NodeResult {
    return {
      outputs: input.w2s.map((w2, i) => ({
        nodeType: `mock_w2_${String(i + 1).padStart(2, "0")}` as string,
        input: { wages: w2.wages },
      })),
    };
  }
}

// --- Tests ---

Deno.test("executor: 2-node DAG (A -> B) executes in order, B receives A's output", () => {
  const plan: readonly ExecutionStep[] = [
    { id: "start", nodeType: "start" },
    { id: "mock_a", nodeType: "mock_a" },
    { id: "mock_b", nodeType: "mock_b" },
  ];

  const startSchema = z.object({ initial: z.number() });
  class TestStart extends TaxNode<typeof startSchema> {
    readonly nodeType = "start";
    readonly inputSchema = startSchema;
    readonly outputNodeTypes = ["mock_a"] as const;
    compute(input: z.infer<typeof startSchema>): NodeResult {
      return {
        outputs: [{ nodeType: "mock_a", input: { value: input.initial } }],
      };
    }
  }

  const registry: NodeRegistry = {
    start: new TestStart(),
    mock_a: new MockNodeA(),
    mock_b: new MockNodeB(),
  };

  const result = execute(plan, registry, { initial: 42 });

  // A's pending should have value=42
  assertEquals(result.pending["mock_a"]?.["value"], 42);
  // B should have received=42
  assertEquals(result.pending["mock_b"]?.["received"], 42);
});

Deno.test("executor: array accumulation — two W-2 instances deposit wages into same array field", () => {
  // Plan with two w2 instances depositing to aggregator
  const plan: readonly ExecutionStep[] = [
    { id: "start", nodeType: "start" },
    { id: "w2_01", nodeType: "mock_w2" },
    { id: "w2_02", nodeType: "mock_w2" },
    { id: "mock_aggregator", nodeType: "mock_aggregator" },
  ];

  const startSchema = z.object({
    w2s: z.array(z.object({ wages: z.number() })),
  });
  class TestStart extends TaxNode<typeof startSchema> {
    readonly nodeType = "start";
    readonly inputSchema = startSchema;
    readonly outputNodeTypes = ["mock_w2"] as const;
    compute(input: z.infer<typeof startSchema>): NodeResult {
      return {
        outputs: input.w2s.map((w2, i) => ({
          nodeType: `w2_0${i + 1}` as string,
          input: { wages: w2.wages },
        })),
      };
    }
  }

  // W2 that deposits wages to aggregator
  const w2Schema = z.object({ wages: z.number() });
  class TestW2 extends TaxNode<typeof w2Schema> {
    readonly nodeType = "mock_w2";
    readonly inputSchema = w2Schema;
    readonly outputNodeTypes = ["mock_aggregator"] as const;
    compute(input: z.infer<typeof w2Schema>): NodeResult {
      return {
        outputs: [
          { nodeType: "mock_aggregator", input: { wages: input.wages } },
        ],
      };
    }
  }

  const registry: NodeRegistry = {
    start: new TestStart(),
    mock_w2: new TestW2(),
    mock_aggregator: new MockAggregatorNode(),
  };

  const result = execute(plan, registry, {
    w2s: [{ wages: 85000 }, { wages: 45000 }],
  });

  // After both W-2s deposit, aggregator should have wages as an array
  const aggPending = result.pending["mock_aggregator"];
  const wages = aggPending?.["wages"];
  assertEquals(Array.isArray(wages), true);
  assertEquals((wages as number[]).length, 2);
  assertEquals((wages as number[]).includes(85000), true);
  assertEquals((wages as number[]).includes(45000), true);
});

Deno.test("executor: scalar field set — single deposit sets scalar value", () => {
  const plan: readonly ExecutionStep[] = [
    { id: "start", nodeType: "start" },
    { id: "mock_a", nodeType: "mock_a" },
  ];

  const startSchema = z.object({ val: z.number() });
  class TestStart extends TaxNode<typeof startSchema> {
    readonly nodeType = "start";
    readonly inputSchema = startSchema;
    readonly outputNodeTypes = ["mock_a"] as const;
    compute(input: z.infer<typeof startSchema>): NodeResult {
      return {
        outputs: [{ nodeType: "mock_a", input: { value: input.val } }],
      };
    }
  }

  const registry: NodeRegistry = {
    start: new TestStart(),
    mock_a: new MockNodeA(),
  };

  const result = execute(plan, registry, { val: 99 });
  assertEquals(result.pending["mock_a"]?.["value"], 99);
});

Deno.test("executor: optional node skip — node with no deposited inputs is silently skipped, no error thrown", () => {
  // Plan includes optional node but nothing deposits into it
  const plan: readonly ExecutionStep[] = [
    { id: "start", nodeType: "start" },
    { id: "mock_optional", nodeType: "mock_optional" },
  ];

  const startSchema = z.object({ dummy: z.string().optional() });
  class TestStart extends TaxNode<typeof startSchema> {
    readonly nodeType = "start";
    readonly inputSchema = startSchema;
    readonly outputNodeTypes = [] as const;
    compute(): NodeResult {
      // Deposits nothing to mock_optional
      return { outputs: [] };
    }
  }

  const registry: NodeRegistry = {
    start: new TestStart(),
    mock_optional: new MockOptionalNode(),
  };

  // Should NOT throw — optional node is silently skipped
  const result = execute(plan, registry, {});
  // mock_optional should not have any result (skipped)
  assertEquals(result.pending["mock_optional"], undefined);
});

Deno.test("executor: full W-2 scenario — start dispatches 2 W-2s, aggregator receives [85000, 45000]", () => {
  const plan: readonly ExecutionStep[] = [
    { id: "start", nodeType: "start" },
    { id: "w2_01", nodeType: "mock_w2" },
    { id: "w2_02", nodeType: "mock_w2" },
    { id: "mock_aggregator", nodeType: "mock_aggregator" },
  ];

  const startSchema = z.object({
    w2s: z.array(z.object({ wages: z.number() })),
  });
  class FullScenarioStart extends TaxNode<typeof startSchema> {
    readonly nodeType = "start";
    readonly inputSchema = startSchema;
    readonly outputNodeTypes = ["mock_w2"] as const;
    compute(input: z.infer<typeof startSchema>): NodeResult {
      return {
        outputs: input.w2s.map((w2, i) => ({
          nodeType: `w2_0${i + 1}` as string,
          input: { wages: w2.wages },
        })),
      };
    }
  }

  const w2Schema = z.object({ wages: z.number() });
  class FullW2Node extends TaxNode<typeof w2Schema> {
    readonly nodeType = "mock_w2";
    readonly inputSchema = w2Schema;
    readonly outputNodeTypes = ["mock_aggregator"] as const;
    compute(input: z.infer<typeof w2Schema>): NodeResult {
      return {
        outputs: [
          { nodeType: "mock_aggregator", input: { wages: input.wages } },
        ],
      };
    }
  }

  const registry: NodeRegistry = {
    start: new FullScenarioStart(),
    mock_w2: new FullW2Node(),
    mock_aggregator: new MockAggregatorNode(),
  };

  const result = execute(plan, registry, {
    w2s: [{ wages: 85000 }, { wages: 45000 }],
  });

  const wages = result.pending["mock_aggregator"]?.["wages"] as number[];
  assertEquals(Array.isArray(wages), true);
  assertEquals(wages.length, 2);
  assertEquals(wages.includes(85000), true);
  assertEquals(wages.includes(45000), true);
});

Deno.test("executor: stateless — same inputs produce identical outputs on repeated execution", () => {
  const plan: readonly ExecutionStep[] = [
    { id: "start", nodeType: "start" },
    { id: "mock_a", nodeType: "mock_a" },
    { id: "mock_b", nodeType: "mock_b" },
  ];

  const startSchema = z.object({ val: z.number() });
  class TestStart extends TaxNode<typeof startSchema> {
    readonly nodeType = "start";
    readonly inputSchema = startSchema;
    readonly outputNodeTypes = ["mock_a"] as const;
    compute(input: z.infer<typeof startSchema>): NodeResult {
      return {
        outputs: [{ nodeType: "mock_a", input: { value: input.val } }],
      };
    }
  }

  const registry: NodeRegistry = {
    start: new TestStart(),
    mock_a: new MockNodeA(),
    mock_b: new MockNodeB(),
  };

  const inputs = { val: 42 };
  const result1 = execute(plan, registry, inputs);
  const result2 = execute(plan, registry, inputs);

  assertEquals(
    JSON.stringify(result1.pending),
    JSON.stringify(result2.pending),
  );
});
