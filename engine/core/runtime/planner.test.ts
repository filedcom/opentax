import { assertEquals } from "jsr:@std/assert";
import { buildExecutionPlan } from "./planner.ts";
import type { NodeRegistry } from "../types/node-registry.ts";
import { TaxNode } from "../types/tax-node.ts";
import { z } from "zod";
import type { NodeResult } from "../types/tax-node.ts";

// --- Mock Nodes ---

// A leaf node (no outputs)
const leafInputSchema = z.object({
	value: z.number().optional(),
});
class MockLeafNode extends TaxNode<typeof leafInputSchema> {
	readonly nodeType = "mock_leaf";
	readonly inputSchema = leafInputSchema;
	readonly outputNodeTypes = [] as const;
	compute(): NodeResult {
		return { outputs: [] };
	}
}

// A W2-like node that deposits to a leaf
const w2InputSchema = z.object({
	wages: z.number(),
});
class MockW2Node extends TaxNode<typeof w2InputSchema> {
	readonly nodeType = "mock_w2";
	readonly inputSchema = w2InputSchema;
	readonly outputNodeTypes = ["mock_leaf"] as const;
	compute(input: z.infer<typeof w2InputSchema>): NodeResult {
		return {
			outputs: [{ nodeType: "mock_leaf", input: { value: input.wages } }],
		};
	}
}

// A start node that dispatches to one mock_w2
const singleW2InputSchema = z.object({
	w2s: z.array(z.object({ wages: z.number() })).optional(),
});
class MockSingleStartNode extends TaxNode<typeof singleW2InputSchema> {
	readonly nodeType = "start";
	readonly inputSchema = singleW2InputSchema;
	readonly outputNodeTypes = ["mock_w2"] as const;
	compute(input: z.infer<typeof singleW2InputSchema>): NodeResult {
		const outputs = (input.w2s ?? []).map((w2) => ({
			nodeType: "mock_w2" as const,
			input: { wages: w2.wages },
		}));
		return { outputs };
	}
}

// A start node that dispatches multiple W-2 instances
const multiW2InputSchema = z.object({
	w2s: z.array(z.object({ wages: z.number() })),
});
class MockMultiStartNode extends TaxNode<typeof multiW2InputSchema> {
	readonly nodeType = "start";
	readonly inputSchema = multiW2InputSchema;
	readonly outputNodeTypes = ["mock_w2"] as const;
	compute(input: z.infer<typeof multiW2InputSchema>): NodeResult {
		return {
			outputs: input.w2s.map((w2) => ({
				nodeType: "mock_w2" as const,
				input: { wages: w2.wages },
			})),
		};
	}
}

// An aggregator node (receives from multiple upstream, outputs to nothing)
const aggregatorInputSchema = z.object({
	wages: z.array(z.number()).optional(),
});
class MockAggregatorNode extends TaxNode<typeof aggregatorInputSchema> {
	readonly nodeType = "mock_aggregator";
	readonly inputSchema = aggregatorInputSchema;
	readonly outputNodeTypes = [] as const;
	compute(): NodeResult {
		return { outputs: [] };
	}
}

// A W2 node that deposits to aggregator
const w2ToAggSchema = z.object({
	wages: z.number(),
});
class MockW2ToAggNode extends TaxNode<typeof w2ToAggSchema> {
	readonly nodeType = "mock_w2_agg";
	readonly inputSchema = w2ToAggSchema;
	readonly outputNodeTypes = ["mock_aggregator"] as const;
	compute(input: z.infer<typeof w2ToAggSchema>): NodeResult {
		return {
			outputs: [{ nodeType: "mock_aggregator", input: { wages: input.wages } }],
		};
	}
}

// Start node for multi-instance + aggregator scenario
const multiAggInputSchema = z.object({
	w2s: z.array(z.object({ wages: z.number() })),
});
class MockMultiAggStartNode extends TaxNode<typeof multiAggInputSchema> {
	readonly nodeType = "start";
	readonly inputSchema = multiAggInputSchema;
	readonly outputNodeTypes = ["mock_w2_agg"] as const;
	compute(input: z.infer<typeof multiAggInputSchema>): NodeResult {
		return {
			outputs: input.w2s.map((w2) => ({
				nodeType: "mock_w2_agg" as const,
				input: { wages: w2.wages },
			})),
		};
	}
}

// --- Tests ---

Deno.test("planner: single node (start only, no outputs) produces [start]", () => {
	const emptyStartSchema = z.object({});
	class EmptyStartNode extends TaxNode<typeof emptyStartSchema> {
		readonly nodeType = "start";
		readonly inputSchema = emptyStartSchema;
		readonly outputNodeTypes = [] as const;
		compute(): NodeResult {
			return { outputs: [] };
		}
	}
	const registry: NodeRegistry = {
		start: new EmptyStartNode(),
	};
	const plan = buildExecutionPlan(registry, {});
	assertEquals(plan.length, 1);
	assertEquals(plan[0].id, "start");
	assertEquals(plan[0].nodeType, "start");
});

Deno.test("planner: linear chain (start -> mock_w2 -> mock_leaf) produces correct topo order", () => {
	const registry: NodeRegistry = {
		start: new MockSingleStartNode(),
		mock_w2: new MockW2Node(),
		mock_leaf: new MockLeafNode(),
	};
	const inputs = { w2s: [{ wages: 50000 }] };
	const plan = buildExecutionPlan(registry, inputs);

	// Should be: start, mock_w2, mock_leaf
	assertEquals(plan.length, 3);
	assertEquals(plan[0].id, "start");
	assertEquals(plan[0].nodeType, "start");

	// mock_w2 must come before mock_leaf
	const w2Idx = plan.findIndex((s) => s.nodeType === "mock_w2");
	const leafIdx = plan.findIndex((s) => s.nodeType === "mock_leaf");
	assertEquals(w2Idx < leafIdx, true);
});

Deno.test("planner: multi-instance expansion (start dispatches w2_01, w2_02) creates separate instances", () => {
	const registry: NodeRegistry = {
		start: new MockMultiAggStartNode(),
		mock_w2_agg: new MockW2ToAggNode(),
		mock_aggregator: new MockAggregatorNode(),
	};
	const inputs = {
		w2s: [{ wages: 85000 }, { wages: 45000 }],
	};
	const plan = buildExecutionPlan(registry, inputs);

	// Should have: start, mock_w2_agg_01, mock_w2_agg_02, mock_aggregator
	assertEquals(plan.length, 4);
	assertEquals(plan[0].id, "start");

	// Two w2_agg instances
	const w2Instances = plan.filter((s) => s.nodeType === "mock_w2_agg");
	assertEquals(w2Instances.length, 2);
	assertEquals(w2Instances[0].id, "mock_w2_agg_01");
	assertEquals(w2Instances[1].id, "mock_w2_agg_02");

	// Both w2 instances before aggregator
	const aggIdx = plan.findIndex((s) => s.nodeType === "mock_aggregator");
	const w2Idx1 = plan.findIndex((s) => s.id === "mock_w2_agg_01");
	const w2Idx2 = plan.findIndex((s) => s.id === "mock_w2_agg_02");
	assertEquals(w2Idx1 < aggIdx, true);
	assertEquals(w2Idx2 < aggIdx, true);
});

Deno.test("planner: single instance does NOT get numeric suffix (uses nodeType as ID)", () => {
	const registry: NodeRegistry = {
		start: new MockSingleStartNode(),
		mock_w2: new MockW2Node(),
		mock_leaf: new MockLeafNode(),
	};
	const inputs = { w2s: [{ wages: 60000 }] };
	const plan = buildExecutionPlan(registry, inputs);

	// Single w2 dispatch → ID should be "mock_w2", not "mock_w2_01"
	const w2Step = plan.find((s) => s.nodeType === "mock_w2");
	assertEquals(w2Step?.id, "mock_w2");
});

Deno.test("planner: diamond graph (A -> B, A -> C, B -> D, C -> D) produces valid topo order", () => {
	// We simulate a diamond using a start that dispatches B and C,
	// and both B and C output to D.
	const bInputSchema = z.object({ x: z.number() });
	const cInputSchema = z.object({ y: z.number() });
	const dInputSchema = z.object({ result: z.number().optional() });

	class DiamondD extends TaxNode<typeof dInputSchema> {
		readonly nodeType = "diamond_d";
		readonly inputSchema = dInputSchema;
		readonly outputNodeTypes = [] as const;
		compute(): NodeResult {
			return { outputs: [] };
		}
	}
	class DiamondB extends TaxNode<typeof bInputSchema> {
		readonly nodeType = "diamond_b";
		readonly inputSchema = bInputSchema;
		readonly outputNodeTypes = ["diamond_d"] as const;
		compute(input: z.infer<typeof bInputSchema>): NodeResult {
			return {
				outputs: [{ nodeType: "diamond_d", input: { result: input.x } }],
			};
		}
	}
	class DiamondC extends TaxNode<typeof cInputSchema> {
		readonly nodeType = "diamond_c";
		readonly inputSchema = cInputSchema;
		readonly outputNodeTypes = ["diamond_d"] as const;
		compute(input: z.infer<typeof cInputSchema>): NodeResult {
			return {
				outputs: [{ nodeType: "diamond_d", input: { result: input.y } }],
			};
		}
	}
	const diamondStartSchema = z.object({ val: z.number() });
	class DiamondStart extends TaxNode<typeof diamondStartSchema> {
		readonly nodeType = "start";
		readonly inputSchema = diamondStartSchema;
		readonly outputNodeTypes = ["diamond_b", "diamond_c"] as const;
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
		diamond_b: new DiamondB(),
		diamond_c: new DiamondC(),
		diamond_d: new DiamondD(),
	};
	const plan = buildExecutionPlan(registry, { val: 10 });

	assertEquals(plan.length, 4);
	const startIdx = plan.findIndex((s) => s.id === "start");
	const bIdx = plan.findIndex((s) => s.nodeType === "diamond_b");
	const cIdx = plan.findIndex((s) => s.nodeType === "diamond_c");
	const dIdx = plan.findIndex((s) => s.nodeType === "diamond_d");

	// start before B and C
	assertEquals(startIdx < bIdx, true);
	assertEquals(startIdx < cIdx, true);
	// B and C before D
	assertEquals(bIdx < dIdx, true);
	assertEquals(cIdx < dIdx, true);
});
