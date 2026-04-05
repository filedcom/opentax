import { assertEquals } from "@std/assert";
import { z } from "zod";
import type { NodeRegistry } from "../types/node-registry.ts";
import type { NodeResult } from "../types/tax-node.ts";
import { TaxNode } from "../types/tax-node.ts";
import { OutputNodes } from "../types/output-nodes.ts";
import { execute, type ExecutorDiagnosticEntry } from "./executor.ts";
import type { ExecutionStep } from "./planner.ts";
import type { NodeContext } from "../types/node-context.ts";

// --- Mock Nodes ---
// executor tests hardcode the plan, so outputNodes content is not load-bearing —
// only the compute() logic and inputSchema matter here.

// A → B: simple 2-node chain
const aInputSchema = z.object({ value: z.number() });
class MockNodeA extends TaxNode<typeof aInputSchema> {
  readonly nodeType = "mock_a";
  readonly inputSchema = aInputSchema;
  readonly outputNodes = new OutputNodes([]);
  compute(_ctx: NodeContext, input: z.infer<typeof aInputSchema>): NodeResult {
    return {
      outputs: [{ nodeType: "mock_b", fields: { received: input.value } }],
    };
  }
}

const bInputSchema = z.object({ received: z.number() });
class MockNodeB extends TaxNode<typeof bInputSchema> {
  readonly nodeType = "mock_b";
  readonly inputSchema = bInputSchema;
  readonly outputNodes = new OutputNodes([]);
  compute(_ctx: NodeContext, input: z.infer<typeof bInputSchema>): NodeResult {
    return {
      outputs: [
        { nodeType: "mock_b_result", fields: { doubled: input.received * 2 } },
      ],
    };
  }
}

// W2 node: takes full array, aggregates internally (new model)
const w2ArrayInputSchema = z.object({
  w2s: z.array(z.object({ wages: z.number() })).min(1),
});
class MockW2ArrayNode extends TaxNode<typeof w2ArrayInputSchema> {
  readonly nodeType = "mock_w2";
  readonly inputSchema = w2ArrayInputSchema;
  readonly outputNodes = new OutputNodes([]);
  compute(_ctx: NodeContext, input: z.infer<typeof w2ArrayInputSchema>): NodeResult {
    const totalWages = input.w2s.reduce((sum, w) => sum + w.wages, 0);
    return {
      outputs: [{ nodeType: "mock_f1040", fields: { wages: totalWages } }],
    };
  }
}

// f1040 node: receives scalar wages from w2 node
const f1040InputSchema = z.object({ wages: z.number().optional() });
class MockF1040Node extends TaxNode<typeof f1040InputSchema> {
  readonly nodeType = "mock_f1040";
  readonly inputSchema = f1040InputSchema;
  readonly outputNodes = new OutputNodes([]);
  compute(_ctx: NodeContext, _input: z.infer<typeof f1040InputSchema>): NodeResult {
    return { outputs: [] };
  }
}

// Optional node: strict required field — skipped if no inputs deposited
const optionalInputSchema = z.object({ required_field: z.string() });
class MockOptionalNode extends TaxNode<typeof optionalInputSchema> {
  readonly nodeType = "mock_optional";
  readonly inputSchema = optionalInputSchema;
  readonly outputNodes = new OutputNodes([]);
  compute(_ctx: NodeContext, _input: z.infer<typeof optionalInputSchema>): NodeResult {
    return { outputs: [] };
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
    readonly outputNodes = new OutputNodes([]);
    compute(_ctx: NodeContext, input: z.infer<typeof startSchema>): NodeResult {
      return {
        outputs: [{ nodeType: "mock_a", fields: { value: input.initial } }],
      };
    }
  }

  const registry: NodeRegistry = {
    start: new TestStart(),
    mock_a: new MockNodeA(),
    mock_b: new MockNodeB(),
  };

  const result = execute(plan, registry, { initial: 42 }, { taxYear: 2025 });

  assertEquals(result.pending["mock_a"]?.["value"], 42);
  assertEquals(result.pending["mock_b"]?.["received"], 42);
});

Deno.test("executor: scalar field set — single deposit sets scalar value, not array", () => {
  const plan: readonly ExecutionStep[] = [
    { id: "start", nodeType: "start" },
    { id: "mock_a", nodeType: "mock_a" },
  ];

  const startSchema = z.object({ val: z.number() });
  class TestStart extends TaxNode<typeof startSchema> {
    readonly nodeType = "start";
    readonly inputSchema = startSchema;
    readonly outputNodes = new OutputNodes([]);
    compute(_ctx: NodeContext, input: z.infer<typeof startSchema>): NodeResult {
      return {
        outputs: [{ nodeType: "mock_a", fields: { value: input.val } }],
      };
    }
  }

  const registry: NodeRegistry = {
    start: new TestStart(),
    mock_a: new MockNodeA(),
  };

  const result = execute(plan, registry, { val: 99 }, { taxYear: 2025 });
  assertEquals(result.pending["mock_a"]?.["value"], 99);
});

Deno.test("executor: optional node skip — node with no deposited inputs is silently skipped", () => {
  const plan: readonly ExecutionStep[] = [
    { id: "start", nodeType: "start" },
    { id: "mock_optional", nodeType: "mock_optional" },
  ];

  const startSchema = z.object({ dummy: z.string().optional() });
  class TestStart extends TaxNode<typeof startSchema> {
    readonly nodeType = "start";
    readonly inputSchema = startSchema;
    readonly outputNodes = new OutputNodes([]);
    compute(_ctx: NodeContext, _input: z.infer<typeof startSchema>): NodeResult {
      return { outputs: [] };
    }
  }

  const registry: NodeRegistry = {
    start: new TestStart(),
    mock_optional: new MockOptionalNode(),
  };

  const result = execute(plan, registry, {}, { taxYear: 2025 });
  assertEquals(result.pending["mock_optional"], undefined);
});

Deno.test("executor: array-dispatch model — start dispatches full w2 array, w2 node aggregates internally, f1040 receives scalar (not array)", () => {
  // Start sends { w2s: [all w2s] } in one output — not one per item.
  // W2 node receives the full array and computes the total internally.
  // The engine never promotes scalars to arrays; aggregation is the node's responsibility.
  const plan: readonly ExecutionStep[] = [
    { id: "start", nodeType: "start" },
    { id: "mock_w2", nodeType: "mock_w2" },
    { id: "mock_f1040", nodeType: "mock_f1040" },
  ];

  const startSchema = z.object({
    w2s: z.array(z.object({ wages: z.number() })),
  });
  class TestStart extends TaxNode<typeof startSchema> {
    readonly nodeType = "start";
    readonly inputSchema = startSchema;
    readonly outputNodes = new OutputNodes([]);
    compute(_ctx: NodeContext, input: z.infer<typeof startSchema>): NodeResult {
      return {
        outputs: [{ nodeType: "mock_w2", fields: { w2s: input.w2s } }],
      };
    }
  }

  const registry: NodeRegistry = {
    start: new TestStart(),
    mock_w2: new MockW2ArrayNode(),
    mock_f1040: new MockF1040Node(),
  };

  const result = execute(plan, registry, {
    w2s: [{ wages: 85000 }, { wages: 45000 }],
  }, { taxYear: 2025 });

  const f1040Pending = result.pending["mock_f1040"];
  assertEquals(typeof f1040Pending?.["wages"], "number");
  assertEquals(f1040Pending?.["wages"], 130000);
  assertEquals(Array.isArray(f1040Pending?.["wages"]), false);
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
    readonly outputNodes = new OutputNodes([]);
    compute(_ctx: NodeContext, input: z.infer<typeof startSchema>): NodeResult {
      return {
        outputs: [{ nodeType: "mock_a", fields: { value: input.val } }],
      };
    }
  }

  const registry: NodeRegistry = {
    start: new TestStart(),
    mock_a: new MockNodeA(),
    mock_b: new MockNodeB(),
  };

  const inputs = { val: 42 };
  const result1 = execute(plan, registry, inputs, { taxYear: 2025 });
  const result2 = execute(plan, registry, inputs, { taxYear: 2025 });

  assertEquals(
    JSON.stringify(result1.pending),
    JSON.stringify(result2.pending),
  );
});

Deno.test("executor: multi-source diamond — two nodes depositing to same target, both deposits arrive as scalars", () => {
  // B and C both deposit different scalar fields to D.
  // Engine merges them; D's pending has both fields as scalars.
  const bInputSchema = z.object({ x: z.number() });
  const cInputSchema = z.object({ y: z.number() });
  const dInputSchema = z.object({
    x: z.number().optional(),
    y: z.number().optional(),
  });

  class DiamondD extends TaxNode<typeof dInputSchema> {
    readonly nodeType = "diamond_d";
    readonly inputSchema = dInputSchema;
    readonly outputNodes = new OutputNodes([]);
    compute(_ctx: NodeContext, _input: z.infer<typeof dInputSchema>): NodeResult {
      return { outputs: [] };
    }
  }
  class DiamondB extends TaxNode<typeof bInputSchema> {
    readonly nodeType = "diamond_b";
    readonly inputSchema = bInputSchema;
    readonly outputNodes = new OutputNodes([]);
    compute(_ctx: NodeContext, input: z.infer<typeof bInputSchema>): NodeResult {
      return {
        outputs: [{ nodeType: "diamond_d", fields: { x: input.x } }],
      };
    }
  }
  class DiamondC extends TaxNode<typeof cInputSchema> {
    readonly nodeType = "diamond_c";
    readonly inputSchema = cInputSchema;
    readonly outputNodes = new OutputNodes([]);
    compute(_ctx: NodeContext, input: z.infer<typeof cInputSchema>): NodeResult {
      return {
        outputs: [{ nodeType: "diamond_d", fields: { y: input.y } }],
      };
    }
  }

  const startSchema = z.object({ val: z.number() });
  class DiamondStart extends TaxNode<typeof startSchema> {
    readonly nodeType = "start";
    readonly inputSchema = startSchema;
    readonly outputNodes = new OutputNodes([]);
    compute(_ctx: NodeContext, input: z.infer<typeof startSchema>): NodeResult {
      return {
        outputs: [
          { nodeType: "diamond_b", fields: { x: input.val } },
          { nodeType: "diamond_c", fields: { y: input.val * 2 } },
        ],
      };
    }
  }

  const plan: readonly ExecutionStep[] = [
    { id: "start", nodeType: "start" },
    { id: "diamond_b", nodeType: "diamond_b" },
    { id: "diamond_c", nodeType: "diamond_c" },
    { id: "diamond_d", nodeType: "diamond_d" },
  ];

  const registry: NodeRegistry = {
    start: new DiamondStart(),
    diamond_b: new DiamondB(),
    diamond_c: new DiamondC(),
    diamond_d: new DiamondD(),
  };

  const result = execute(plan, registry, { val: 10 }, { taxYear: 2025 });

  // D's pending has both x=10 and y=20 as scalars
  assertEquals(result.pending["diamond_d"]?.["x"], 10);
  assertEquals(result.pending["diamond_d"]?.["y"], 20);
});

Deno.test("executor: Zod parse failure produces diagnostic entry, not silent skip", () => {
  // A node with a strict required string field receives a number — parse fails.
  // Expect: diagnostic entry emitted, compute() NOT called (no downstream output).
  const badParseInputSchema = z.object({ name: z.string() });
  class MockBadParseNode extends TaxNode<typeof badParseInputSchema> {
    readonly nodeType = "mock_bad_parse";
    readonly inputSchema = badParseInputSchema;
    readonly outputNodes = new OutputNodes([]);
    compute(_ctx: NodeContext, _input: z.infer<typeof badParseInputSchema>): NodeResult {
      // Should never be called — parse fails before reaching compute()
      return { outputs: [{ nodeType: "should_not_appear", fields: { sentinel: true } }] };
    }
  }

  const startSchema = z.object({ dummy: z.number() });
  class BadParseStart extends TaxNode<typeof startSchema> {
    readonly nodeType = "start";
    readonly inputSchema = startSchema;
    readonly outputNodes = new OutputNodes([]);
    compute(_ctx: NodeContext, _input: z.infer<typeof startSchema>): NodeResult {
      // Deposit { name: 123 } — a number where string is expected
      return {
        outputs: [{ nodeType: "mock_bad_parse", fields: { name: 123 } }],
      };
    }
  }

  const plan: readonly ExecutionStep[] = [
    { id: "start", nodeType: "start" },
    { id: "mock_bad_parse", nodeType: "mock_bad_parse" },
  ];

  const registry: NodeRegistry = {
    start: new BadParseStart(),
    mock_bad_parse: new MockBadParseNode(),
  };

  const result = execute(plan, registry, { dummy: 1 }, { taxYear: 2025 });

  // diagnostics must exist and have at least one entry
  assertEquals(Array.isArray(result.diagnostics), true);
  assertEquals(result.diagnostics.length >= 1, true);

  const entry: ExecutorDiagnosticEntry = result.diagnostics[0];
  assertEquals(entry.severity, "error");
  assertEquals(entry.code, "EXECUTOR_NODE_FAILURE");
  assertEquals(entry.nodeType, "mock_bad_parse");
  // message should mention parse/validation
  assertEquals(
    entry.message.toLowerCase().includes("parse") ||
      entry.message.toLowerCase().includes("validation") ||
      entry.message.toLowerCase().includes("zod"),
    true,
  );

  // compute() was NOT called — sentinel output should not appear
  assertEquals(result.pending["should_not_appear"], undefined);
});

Deno.test("executor: compute() throw produces diagnostic entry, does not abort execution", () => {
  // A node whose compute() throws — diagnostic emitted, no crash.
  const throwInputSchema = z.object({ trigger: z.number() });
  class MockThrowNode extends TaxNode<typeof throwInputSchema> {
    readonly nodeType = "mock_throw";
    readonly inputSchema = throwInputSchema;
    readonly outputNodes = new OutputNodes([]);
    compute(_ctx: NodeContext, _input: z.infer<typeof throwInputSchema>): NodeResult {
      throw new Error("intentional boom");
    }
  }

  const startSchema = z.object({ dummy: z.number() });
  class ThrowStart extends TaxNode<typeof startSchema> {
    readonly nodeType = "start";
    readonly inputSchema = startSchema;
    readonly outputNodes = new OutputNodes([]);
    compute(_ctx: NodeContext, _input: z.infer<typeof startSchema>): NodeResult {
      return {
        outputs: [{ nodeType: "mock_throw", fields: { trigger: 1 } }],
      };
    }
  }

  const plan: readonly ExecutionStep[] = [
    { id: "start", nodeType: "start" },
    { id: "mock_throw", nodeType: "mock_throw" },
  ];

  const registry: NodeRegistry = {
    start: new ThrowStart(),
    mock_throw: new MockThrowNode(),
  };

  const result = execute(plan, registry, { dummy: 1 }, { taxYear: 2025 });

  assertEquals(Array.isArray(result.diagnostics), true);
  assertEquals(result.diagnostics.length >= 1, true);

  const entry: ExecutorDiagnosticEntry = result.diagnostics[0];
  assertEquals(entry.severity, "error");
  assertEquals(entry.code, "EXECUTOR_NODE_FAILURE");
  assertEquals(entry.nodeType, "mock_throw");
  assertEquals(entry.message.includes("intentional boom"), true);
});

Deno.test("executor: remaining nodes execute after single node failure", () => {
  // 4-node plan: start -> good_a, start -> bad_b (throws), good_a -> good_c
  // bad_b throws; good_a and good_c should still execute.
  // Expect: good_c's output in pending, exactly 1 diagnostic (for bad_b).

  const goodAInputSchema = z.object({ val: z.number() });
  class GoodA extends TaxNode<typeof goodAInputSchema> {
    readonly nodeType = "good_a";
    readonly inputSchema = goodAInputSchema;
    readonly outputNodes = new OutputNodes([]);
    compute(_ctx: NodeContext, input: z.infer<typeof goodAInputSchema>): NodeResult {
      return {
        outputs: [{ nodeType: "good_c", fields: { result: input.val * 2 } }],
      };
    }
  }

  const badBInputSchema = z.object({ val: z.number() });
  class BadB extends TaxNode<typeof badBInputSchema> {
    readonly nodeType = "bad_b";
    readonly inputSchema = badBInputSchema;
    readonly outputNodes = new OutputNodes([]);
    compute(_ctx: NodeContext, _input: z.infer<typeof badBInputSchema>): NodeResult {
      throw new Error("bad_b always fails");
    }
  }

  const goodCInputSchema = z.object({ result: z.number() });
  class GoodC extends TaxNode<typeof goodCInputSchema> {
    readonly nodeType = "good_c";
    readonly inputSchema = goodCInputSchema;
    readonly outputNodes = new OutputNodes([]);
    compute(_ctx: NodeContext, _input: z.infer<typeof goodCInputSchema>): NodeResult {
      return { outputs: [] };
    }
  }

  const startSchema = z.object({ val: z.number() });
  class ContinuationStart extends TaxNode<typeof startSchema> {
    readonly nodeType = "start";
    readonly inputSchema = startSchema;
    readonly outputNodes = new OutputNodes([]);
    compute(_ctx: NodeContext, input: z.infer<typeof startSchema>): NodeResult {
      return {
        outputs: [
          { nodeType: "good_a", fields: { val: input.val } },
          { nodeType: "bad_b", fields: { val: input.val } },
        ],
      };
    }
  }

  const plan: readonly ExecutionStep[] = [
    { id: "start", nodeType: "start" },
    { id: "good_a", nodeType: "good_a" },
    { id: "bad_b", nodeType: "bad_b" },
    { id: "good_c", nodeType: "good_c" },
  ];

  const registry: NodeRegistry = {
    start: new ContinuationStart(),
    good_a: new GoodA(),
    bad_b: new BadB(),
    good_c: new GoodC(),
  };

  const result = execute(plan, registry, { val: 5 }, { taxYear: 2025 });

  // good_c received output from good_a (val=5, doubled=10)
  assertEquals(result.pending["good_c"]?.["result"], 10);

  // exactly 1 diagnostic — only bad_b failed
  assertEquals(result.diagnostics.length, 1);
  assertEquals(result.diagnostics[0].nodeType, "bad_b");
  assertEquals(result.diagnostics[0].code, "EXECUTOR_NODE_FAILURE");
});
