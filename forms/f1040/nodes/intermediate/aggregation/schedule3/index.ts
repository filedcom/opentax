import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import {
  type AtLeastOne,
  TaxNode,
} from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";

// Executor accumulation pattern: multiple upstream nodes (f1099int, f1099div) may
// each deposit line1_foreign_tax_1099, causing it to accumulate as an array.
const accumulable = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([schema, z.array(schema)]);

function sumAccumulable(value: number | number[] | undefined): number {
  if (value === undefined) return 0;
  if (Array.isArray(value)) return value.reduce((s, n) => s + n, 0);
  return value;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

// Schedule 3 aggregates nonrefundable credits (Part I → line 8 → f1040 line 20)
// and additional payments (Part II → line 15 → f1040 line 31).
// All fields are optional — any subset may be present on a given return.
export const inputSchema = z.object({
  // ── Part I — Nonrefundable Credits ─────────────────────────────────────────

  // Line 1 — Foreign tax credit (from Form 1116 line 35)
  // IRC §901; Form 1116 line 35 → Schedule 3 line 1
  line1_foreign_tax_credit: z.number().nonnegative().optional(),

  // Line 1 — Foreign tax credit reported directly from 1099-DIV/1099-INT (de minimis)
  // When total foreign taxes ≤ $300 ($600 MFJ), Form 1116 is not required.
  // Both line1 fields are summed into Part I line 1.
  // Accumulable: f1099int and f1099div each route here, so the executor may
  // deposit multiple values (e.g. [75, 45]) that must be summed.
  // IRC §901; Treas. Reg. §1.901-1
  line1_foreign_tax_1099: accumulable(z.number().nonnegative()).optional(),

  // Line 2 — Child and dependent care credit (from Form 2441 line 11)
  // IRC §21; Form 2441 line 11 → Schedule 3 line 2
  line2_childcare_credit: z.number().nonnegative().optional(),

  // Line 3 — Education credits (from Form 8863 line 19 — LLC or nonrefundable AOC)
  // IRC §25A; Form 8863 line 19 → Schedule 3 line 3
  line3_education_credit: z.number().nonnegative().optional(),

  // Line 4 — Retirement savings contributions credit (from Form 8880 line 12)
  // IRC §25B; Form 8880 line 12 → Schedule 3 line 4
  line4_retirement_savings_credit: z.number().nonnegative().optional(),

  // Line 6c — Adoption credit (from Form 8839 Part II — nonrefundable portion)
  // IRC §23; Form 8839 → Schedule 3 line 6c
  line6c_adoption_credit: z.number().nonnegative().optional(),

  // ── Part II — Other Payments and Credits ───────────────────────────────────

  // Line 10 — Amount paid with extension request (Form 4868 line 7)
  // IRC §6081; Form 4868 line 7 → Schedule 3 line 10
  line10_amount_paid_extension: z.number().nonnegative().optional(),

  // Line 11 — Excess social security tax withheld
  // IRC §31(b); excess SS over wage base across multiple employers → Schedule 3 line 11
  line11_excess_ss: z.number().nonnegative().optional(),

  // Form 5695 lines 15 and 32 must remain distinct for Schedule 3 and MeF.
  line5a_residential_clean_energy: z.number().nonnegative().optional(),
  line5b_energy_efficient_home: z.number().nonnegative().optional(),

  // Line 6f — personal new clean vehicle credit from Form 8936 line 13.
  line6f_clean_vehicle_credit: accumulable(z.number().nonnegative()).optional(),
  // Line 6m — previously owned clean vehicle credit from Form 8936 line 18.
  line6m_prev_owned_clean_vehicle_credit: accumulable(z.number().nonnegative())
    .optional(),

  // Line 6d — Credit for the elderly or disabled (from Schedule R line 22)
  // IRC §22; Schedule R line 22 → Schedule 3 line 6d
  line6d_elderly_disabled_credit: z.number().nonnegative().optional(),

  // Line 6g — Mortgage interest credit (Form 8396 line 11)
  // IRC §25; Form 8396 line 11 → Schedule 3 line 6g
  line6g_mortgage_interest_credit: z.number().nonnegative().optional(),

  // Line 6j — allowed personal-use alternative fuel refueling property credit
  // from Form 8911 line 10, after the regular-tax / AMT limitation.
  line6j_alt_fuel_vehicle_refueling: z.number().nonnegative().optional(),
  // Line 6l — negative Form 8978 adjustment after the Form 1040 line 18 cap.
  line6l_form8978_credit: z.number().int().nonnegative().optional(),

  // Line 9 — Net premium tax credit (Form 8962 line 26)
  // IRC §36B; Form 8962 line 26 → Schedule 3 line 9 (Part II refundable credit)
  line9_premium_tax_credit: z.number().nonnegative().optional(),

  // Line 6a — General business credit (from Form 3800).
  line6a_general_business_credit: accumulable(z.number().nonnegative())
    .optional(),

  // Line 6b — Credit for prior year minimum tax (from Form 8801).
  line6b_prior_year_min_tax_credit: z.number().nonnegative().optional(),

  // Low-income housing credit (from Form 8609 / Form 8586 / IRC §42)
  // A separate producer until Form 3800 combines all source credits.
  line6a_low_income_housing_credit: accumulable(z.number().nonnegative())
    .optional(),

});

type Schedule3Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Part I, Line 1 — total foreign tax credit.
// Combines Form 1116 allowed credit and de minimis 1099 foreign taxes.
// line1_foreign_tax_1099 may arrive as an array when multiple 1099 forms
// (e.g. f1099int + f1099div) each route their foreign tax to schedule3.
// IRC §901, Treas. Reg. §1.901-1
function line1(input: Schedule3Input): number {
  return (input.line1_foreign_tax_credit ?? 0) +
    sumAccumulable(
      input.line1_foreign_tax_1099 as number | number[] | undefined,
    );
}

// Part I, Line 8 — total nonrefundable credits.
function line6a(input: Schedule3Input): number {
  return sumAccumulable(input.line6a_general_business_credit) +
    sumAccumulable(input.line6a_low_income_housing_credit);
}

function line7(input: Schedule3Input): number {
  return line6a(input) +
    (input.line6b_prior_year_min_tax_credit ?? 0) +
    (input.line6c_adoption_credit ?? 0) +
    (input.line6d_elderly_disabled_credit ?? 0) +
    sumAccumulable(input.line6f_clean_vehicle_credit) +
    (input.line6g_mortgage_interest_credit ?? 0) +
    (input.line6j_alt_fuel_vehicle_refueling ?? 0) +
    (input.line6l_form8978_credit ?? 0) +
    sumAccumulable(input.line6m_prev_owned_clean_vehicle_credit);
}

function partITotal(input: Schedule3Input): number {
  return (
    line1(input) +
    (input.line2_childcare_credit ?? 0) +
    (input.line3_education_credit ?? 0) +
    (input.line4_retirement_savings_credit ?? 0) +
    (input.line5a_residential_clean_energy ?? 0) +
    (input.line5b_energy_efficient_home ?? 0) +
    line7(input)
  );
}

// Part II, Line 15 — total additional payments and credits.
function partIITotal(input: Schedule3Input): number {
  return (
    (input.line9_premium_tax_credit ?? 0) +
    (input.line10_amount_paid_extension ?? 0) +
    (input.line11_excess_ss ?? 0)
  );
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Schedule3Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule3";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040]);

  compute(_ctx: NodeContext, rawInput: Schedule3Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    const credits = partITotal(input);
    const payments = partIITotal(input);

    if (credits === 0 && payments === 0) return { outputs: [] };

    const f1040Input: Partial<z.infer<typeof f1040["inputSchema"]>> = {};
    if (credits > 0) f1040Input.line20_nonrefundable_credits = credits;
    if (payments > 0) f1040Input.line31_additional_payments = payments;

    const outputs: NodeOutput[] = [
      this.outputNodes.output(
        f1040,
        f1040Input as AtLeastOne<z.infer<typeof f1040["inputSchema"]>>,
      ),
    ];
    // Self-emit computed line values into this node's own pending dict so the
    // PDF/MeF builders can print the schedule (same pattern as the f1040 node).
    // Keys are distinct from inputSchema keys to avoid executor merge-accumulation.
    const printFields: Record<string, number> = {};
    const line1Total = line1(input);
    if (line1Total > 0) printFields.line1_total = line1Total;
    if (line6a(input) > 0) printFields.line6a_total = line6a(input);
    const cleanNew = sumAccumulable(input.line6f_clean_vehicle_credit);
    const cleanUsed = sumAccumulable(input.line6m_prev_owned_clean_vehicle_credit);
    if (cleanNew > 0) printFields.line6f_total = cleanNew;
    if (cleanUsed > 0) printFields.line6m_total = cleanUsed;
    if (line7(input) > 0) printFields.line7_total = line7(input);
    if (credits > 0) printFields.line8_total = credits;
    if (payments > 0) printFields.line15_total = payments;
    if (Object.keys(printFields).length > 0) {
      outputs.push({ nodeType: this.nodeType, fields: printFields });
    }

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const schedule3 = new Schedule3Node();
