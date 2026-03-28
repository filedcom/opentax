import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";

const box12EntrySchema = z.object({
  code: z.string(),
  amount: z.number().nonnegative(),
});

export const inputSchema = z.object({
  box1_wages: z.number().nonnegative(),
  box2_fed_withheld: z.number().nonnegative(),
  box3_ss_wages: z.number().nonnegative().optional(),
  box4_ss_withheld: z.number().nonnegative().optional(),
  box5_medicare_wages: z.number().nonnegative().optional(),
  box6_medicare_withheld: z.number().nonnegative().optional(),
  box7_ss_tips: z.number().nonnegative().optional(),
  box8_allocated_tips: z.number().nonnegative().optional(),
  box10_dep_care: z.number().nonnegative().optional(),
  box11_nonqual_plans: z.number().nonnegative().optional(),
  box12_entries: z.array(box12EntrySchema).optional(),
  box13_statutory_employee: z.boolean().optional(),
  box13_retirement_plan: z.boolean().optional(),
  box13_third_party_sick: z.boolean().optional(),
  box14b_tipped_code: z.string().optional(),
});

type W2Input = z.infer<typeof inputSchema>;

// Box 12 code routing map
const BOX12_ROUTES: Record<string, (amount: number) => NodeOutput> = {
  H: (amount) => ({
    nodeType: "schedule1",
    input: { line24f_501c18d: amount },
  }),
  Q: (amount) => ({
    nodeType: "f1040",
    input: { line1i_combat_pay: amount },
  }),
  W: (amount) => ({
    nodeType: "form8889",
    input: { employer_hsa_contributions: amount },
  }),
  R: (amount) => ({
    nodeType: "form8853",
    input: { employer_archer_msa: amount },
  }),
  T: (amount) => ({
    nodeType: "form8839",
    input: { adoption_benefits: amount },
  }),
  A: (amount) => ({
    nodeType: "schedule2",
    input: { uncollected_fica: amount },
  }),
  B: (amount) => ({
    nodeType: "schedule2",
    input: { uncollected_fica: amount },
  }),
  M: (amount) => ({
    nodeType: "schedule2",
    input: { uncollected_fica_gtl: amount },
  }),
  N: (amount) => ({
    nodeType: "schedule2",
    input: { uncollected_fica_gtl: amount },
  }),
  K: (amount) => ({
    nodeType: "schedule2",
    input: { golden_parachute_excise: amount },
  }),
  Z: (amount) => ({
    nodeType: "schedule2",
    input: { section409a_excise: amount },
  }),
};

class W2Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "w2";
  readonly inputSchema = inputSchema;
  readonly outputNodeTypes = [
    "f1040",
    "schedule1",
    "schedule2",
    "schedule_c",
    "form4137",
    "form2441",
    "form8959",
    "form8889",
    "form8853",
    "form8839",
  ] as const;

  compute(input: W2Input): NodeResult {
    const outputs: NodeOutput[] = [];

    const isStatutory = input.box13_statutory_employee === true;

    // Collect all f1040 fields to emit as a single output
    const f1040Fields: Record<string, number> = {};

    if (isStatutory) {
      // Statutory employee: wages go to Schedule C; withholding still credited on f1040
      outputs.push({
        nodeType: "schedule_c",
        input: {
          statutory_wages: input.box1_wages,
          withholding: input.box2_fed_withheld,
        },
      });
    } else {
      f1040Fields.line1a_wages = input.box1_wages;
    }
    f1040Fields.line25a_w2_withheld = input.box2_fed_withheld;

    // Medicare wages/withheld → form8959
    if (
      input.box5_medicare_wages !== undefined ||
      input.box6_medicare_withheld !== undefined
    ) {
      outputs.push({
        nodeType: "form8959",
        input: {
          medicare_wages: input.box5_medicare_wages,
          medicare_withheld: input.box6_medicare_withheld,
        },
      });
    }

    // Allocated tips → form4137
    if (
      input.box8_allocated_tips !== undefined &&
      input.box8_allocated_tips > 0
    ) {
      outputs.push({
        nodeType: "form4137",
        input: { allocated_tips: input.box8_allocated_tips },
      });
    }

    // Dependent care benefits → form2441
    if (input.box10_dep_care !== undefined && input.box10_dep_care > 0) {
      outputs.push({
        nodeType: "form2441",
        input: { dep_care_benefits: input.box10_dep_care },
      });
    }

    // Box 12 code routing — collect f1040 fields, emit others separately
    for (const entry of input.box12_entries ?? []) {
      const code = entry.code.toUpperCase();
      const routeFn = BOX12_ROUTES[code];
      if (routeFn !== undefined) {
        const routed = routeFn(entry.amount);
        if (routed.nodeType === "f1040") {
          // Merge into single f1040 output
          Object.assign(f1040Fields, routed.input);
        } else {
          outputs.push(routed);
        }
      }
    }

    // Emit single consolidated f1040 output
    outputs.push({ nodeType: "f1040", input: { ...f1040Fields } });

    return { outputs };
  }
}

export const w2 = new W2Node();
