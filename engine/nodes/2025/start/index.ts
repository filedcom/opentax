import { TaxNode } from "../../../core/types/tax-node.ts";
import type { NodeResult } from "../../../core/types/tax-node.ts";
import { z } from "zod";

const inputSchema = z.object({
	w2s: z.array(z.object({ box1: z.number() })).optional(),
});

export class StartNode extends TaxNode<typeof inputSchema> {
	readonly nodeType = "start";
	readonly inputSchema = inputSchema;
	readonly outputNodeTypes = ["w2"] as const;

	compute(input: z.infer<typeof inputSchema>): NodeResult {
		const w2s = input.w2s ?? [];
		if (w2s.length === 0) {
			return { outputs: [] };
		}
		if (w2s.length === 1) {
			return {
				outputs: [{ nodeType: "w2", input: { w2: w2s[0] } }],
			};
		}
		// Multiple W-2s: emit suffixed nodeType IDs so planner+executor route correctly
		return {
			outputs: w2s.map((w2, i) => ({
				nodeType: `w2_${String(i + 1).padStart(2, "0")}`,
				input: { w2 },
			})),
		};
	}
}
