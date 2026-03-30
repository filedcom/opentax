import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { form_8829 } from "../../intermediate/form_8829/index.ts";
import { scheduleA as schedule_a } from "../schedule_a/index.ts";
import { scheduleC as schedule_c } from "../schedule_c/index.ts";
import { scheduleE as schedule_e } from "../schedule_e/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";

// FOR dropdown: destination schedule/form
// A = Schedule A, C = Schedule C, E = Schedule E, 8829 = Form 8829
export enum ForRouting {
  A = "A",
  C = "C",
  E = "E",
  F8829 = "8829",
}

export const itemSchema = z.object({
  // Required per context.md
  box1_mortgage_interest: z.number().nonnegative(),
  for_routing: z.nativeEnum(ForRouting).optional(),
  // Informational / routing helpers
  lender_name: z.string().optional(),
  box2_outstanding_principal: z.number().nonnegative().optional(),
  box3_origination_date: z.string().optional(),
  box4_refund_overpaid: z.number().nonnegative().optional(),
  // box4 prior-year flag: true = Scenario B (income on Sch 1 line 8z, do not reduce box1)
  box4_prior_year_refund: z.boolean().optional(),
  // box5: MIP — NOT deductible for TY2025. Collected for informational purposes only.
  box5_mip: z.number().nonnegative().optional(),
  box6_points_paid: z.number().nonnegative().optional(),
  // box7–box11: informational only, no tax routing
  box7_property_address_same: z.boolean().optional(),
  box8_property_address: z.string().optional(),
  box9_number_of_properties: z.number().nonnegative().optional(),
  // box10_other is a STRING (lender free-text) — NOT a dollar amount, NOT auto-routed
  box10_other: z.string().optional(),
  box11_acquisition_date: z.string().optional(),
  // Drake-specific: no tax effect for TY2025
  qualified_premiums_checkbox: z.boolean().optional(),
  // DEDM override: when true, box1 from this 1098 entry is ignored (DEDM screen provides deductible amount)
  dedm_override: z.boolean().optional(),
  // Binding contract exception: pre-2017 $1M limit applies even if box3 >= 12/16/2017
  binding_contract_exception: z.boolean().optional(),
  // Refinance flag: box6 points must be amortized, not fully deducted in year paid
  refinance: z.boolean().optional(),
});

export const inputSchema = z.object({
  f1098s: z.array(itemSchema),
});

type F1098Item = z.infer<typeof itemSchema>;
type F1098Items = F1098Item[];

// Net interest for a single item (Scenario A: same-year refund reduces box1)
function netInterestForItem(item: F1098Item): number {
  const box1 = item.box1_mortgage_interest;
  const box4 = item.box4_refund_overpaid ?? 0;
  const isPriorYear = item.box4_prior_year_refund === true;
  if (isPriorYear) return box1; // do NOT reduce box1 for prior-year refunds
  return box1 - box4;
}

// Interest routed to Schedule A from a single item
function scheduleAInterestForItem(item: F1098Item): number {
  if (item.dedm_override) return 0; // DEDM provides deductible amount; ignore 1098 box1
  return netInterestForItem(item);
}

// Aggregate Schedule A mortgage interest across all for_routing=A items
function aggregateScheduleAInterest(items: F1098Items): number {
  return items
    .filter((item) => (item.for_routing ?? ForRouting.A) === ForRouting.A)
    .reduce((sum, item) => sum + scheduleAInterestForItem(item), 0);
}

// Aggregate Schedule A purchase points across all for_routing=A items
function aggregateScheduleAPoints(items: F1098Items): number {
  return items
    .filter((item) => (item.for_routing ?? ForRouting.A) === ForRouting.A)
    .reduce((sum, item) => {
      if (item.dedm_override) return sum;
      return sum + (item.box6_points_paid ?? 0);
    }, 0);
}

// Aggregate Schedule E mortgage interest
function aggregateScheduleEInterest(items: F1098Items): number {
  return items
    .filter((item) => item.for_routing === ForRouting.E)
    .reduce((sum, item) => sum + netInterestForItem(item), 0);
}

// Aggregate Schedule C mortgage interest
function aggregateScheduleCInterest(items: F1098Items): number {
  return items
    .filter((item) => item.for_routing === ForRouting.C)
    .reduce((sum, item) => sum + netInterestForItem(item), 0);
}

// Aggregate Form 8829 mortgage interest
function aggregateForm8829Interest(items: F1098Items): number {
  return items
    .filter((item) => item.for_routing === ForRouting.F8829)
    .reduce((sum, item) => sum + netInterestForItem(item), 0);
}

// Aggregate prior-year refund income (Scenario B → Schedule 1 line 8z)
function aggregatePriorYearRefundIncome(items: F1098Items): number {
  return items
    .filter((item) => item.box4_prior_year_refund === true)
    .reduce((sum, item) => sum + (item.box4_refund_overpaid ?? 0), 0);
}

function scheduleAOutput(items: F1098Items): NodeOutput[] {
  const interest = aggregateScheduleAInterest(items);
  const points = aggregateScheduleAPoints(items);

  if (interest > 0 && points > 0) {
    return [output(schedule_a, { line_8a_mortgage_interest_1098: interest, line_8c_points_no_1098: points })];
  }
  if (interest > 0) {
    return [output(schedule_a, { line_8a_mortgage_interest_1098: interest })];
  }
  if (points > 0) {
    return [output(schedule_a, { line_8c_points_no_1098: points })];
  }
  return [];
}

function scheduleEOutput(items: F1098Items): NodeOutput[] {
  const interest = aggregateScheduleEInterest(items);
  if (interest <= 0) return [];
  return [output(schedule_e, { mortgage_interest: interest })];
}

function scheduleCOutput(items: F1098Items): NodeOutput[] {
  const interest = aggregateScheduleCInterest(items);
  if (interest <= 0) return [];
  return [output(schedule_c, { line16a_interest_mortgage: interest })];
}

function form8829Output(items: F1098Items): NodeOutput[] {
  const interest = aggregateForm8829Interest(items);
  if (interest <= 0) return [];
  return [output(form_8829, { mortgage_interest: interest })];
}

function schedule1Output(items: F1098Items): NodeOutput[] {
  const income = aggregatePriorYearRefundIncome(items);
  if (income <= 0) return [];
  return [output(schedule1, { line8z_other_income: income })];
}

class F1098Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1098";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule_a, schedule_c, schedule_e, form_8829, schedule1]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    const { f1098s } = input;

    const outputs: NodeOutput[] = [
      ...scheduleAOutput(f1098s),
      ...scheduleEOutput(f1098s),
      ...scheduleCOutput(f1098s),
      ...form8829Output(f1098s),
      ...schedule1Output(f1098s),
    ];

    return { outputs };
  }
}

export const f1098 = new F1098Node();
