import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { f3800 } from "../f3800/index.ts";

const drugSchema = z.object({
  generic_name: z.string().min(1),
  designation_application_number: z.string().min(1),
  designation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  qualified_clinical_testing_expenses: z.number().finite().nonnegative(),
  qualifying_testing_confirmed: z.literal(true),
  expenses_exclude_third_party_funding: z.literal(true),
  expenses_not_used_for_research_credit: z.literal(true),
});

export const inputSchema = z.object({
  f8820s: z.array(drugSchema).min(1),
  reduced_section280c_credit_election: z.boolean(),
  form8932_overlapping_wage_credit: z.number().int().nonnegative(),
  subject_to_passive_activity_limit: z.boolean(),
  expense_reduction_statement_file_name: z.string().min(1).optional(),
});

export type F8820Input = z.infer<typeof inputSchema>;

export interface Form8820Lines {
  line1: number;
  line2a: number;
  line2b: number;
  line2c: number;
  line4: number;
}

function validDesignationDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value && value <= "2025-12-31";
}

export function calculateForm8820(raw: F8820Input): Form8820Lines {
  const input = inputSchema.parse(raw);
  const designations = new Set<string>();
  for (const drug of input.f8820s) {
    if (!validDesignationDate(drug.designation_date)) {
      throw new Error("Form 8820 needs a valid orphan-drug designation date");
    }
    if (designations.has(drug.designation_application_number)) {
      throw new Error("Form 8820 has a duplicate drug designation number");
    }
    designations.add(drug.designation_application_number);
  }
  const line1 = Math.round(input.f8820s.reduce(
    (sum, drug) => sum + drug.qualified_clinical_testing_expenses,
    0,
  ));
  const line2a = Math.round(
    line1 * (input.reduced_section280c_credit_election ? 0.1975 : 0.25),
  );
  const line2b = input.form8932_overlapping_wage_credit;
  if (line2b > line2a) {
    throw new Error("Form 8820 overlapping wage credit exceeds line 2a");
  }
  if (
    line2a > 0 && !input.reduced_section280c_credit_election &&
    !input.expense_reduction_statement_file_name
  ) {
    throw new Error(
      "Form 8820 non-reduced credit needs the expense-reduction statement",
    );
  }
  if (
    input.reduced_section280c_credit_election &&
    input.expense_reduction_statement_file_name
  ) {
    throw new Error(
      "Form 8820 reduced-credit election cannot claim an expense reduction",
    );
  }
  const line2c = Math.max(0, line2a - line2b);
  return { line1, line2a, line2b, line2c, line4: line2c };
}

class F8820Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8820";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f3800]);

  compute(_ctx: NodeContext, raw: F8820Input): NodeResult {
    const input = inputSchema.parse(raw);
    const lines = calculateForm8820(input);
    if (lines.line4 === 0) return { outputs: [] };
    return {
      outputs: [this.outputNodes.output(f3800, {
        f8820_credit: {
          credit_amount: lines.line4,
          subject_to_passive_activity_limit:
            input.subject_to_passive_activity_limit,
        },
      })],
    };
  }
}

export const f8820 = new F8820Node();
