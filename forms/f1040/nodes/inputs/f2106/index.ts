import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { F2106_PERFORMING_ARTIST_AGI_LIMIT } from "../../config/2025.ts";

// TY2025 — Form 2106: Employee Business Expenses
// Post-TCJA (P.L. 115-97 §11045), deductible ONLY for four qualifying categories:
//   1. Armed Forces reservists (IRC §67(h)(1))
//   2. Qualified performing artists (IRC §67(h)(2), §62(b))
//   3. Fee-basis state/local government officials (IRC §67(h)(3))
//   4. Employees with impairment-related work expenses (IRC §67(h)(4))
// All four route above-the-line to Schedule 1, line 12 (IRC §62(a)(2)(E)).
// Standard mileage rate TY2025: $0.70/mile (Notice 2025-05).
// Meals subject to 50% limitation (IRC §274(n)(1)).

export enum EmployeeType {
  RESERVIST = "RESERVIST",
  PERFORMING_ARTIST = "PERFORMING_ARTIST",
  FEE_BASIS_OFFICIAL = "FEE_BASIS_OFFICIAL",
  DISABLED_IMPAIRMENT = "DISABLED_IMPAIRMENT",
}

export enum VehicleMethod {
  STANDARD_MILEAGE = "STANDARD_MILEAGE",
  ACTUAL_EXPENSE = "ACTUAL_EXPENSE",
}

// TY2025 standard mileage rate for business (Notice 2025-05)
const STANDARD_MILEAGE_RATE = 0.70;

// IRC §274(n)(1) — 50% meals limitation
const MEALS_DEDUCTION_PCT = 0.50;

// Per-form schema — one item per Form 2106 filed
export const itemSchema = z.object({
  // Category of qualifying employee — required for output; non-qualifying → no output
  employee_type: z.nativeEnum(EmployeeType),
  // Vehicle expense method: STANDARD_MILEAGE or ACTUAL_EXPENSE
  vehicle_expense_method: z.nativeEnum(VehicleMethod).optional(),
  // Line 13 — Business miles (used with STANDARD_MILEAGE method)
  business_miles: z.number().nonnegative().optional(),
  // Lines 23–25 — Actual vehicle operating expenses before business-use percentage
  actual_vehicle_expenses: z.number().nonnegative().optional(),
  // Line 14 — Business use percentage (0–100) for actual expense method
  business_use_pct: z.number().nonnegative().max(100).optional(),
  // Line 2 — Parking fees, tolls, local transportation
  parking_tolls_transportation: z.number().nonnegative().optional(),
  // Line 3 — Travel expenses away from tax home (lodging + transport, not meals)
  travel_expenses: z.number().nonnegative().optional(),
  // Line 4 — Other business expenses (tools, uniforms, dues, subscriptions)
  other_expenses: z.number().nonnegative().optional(),
  // Line 5 — Business meal expenses (before 50% limitation)
  meals_expenses: z.number().nonnegative().optional(),
  // Line 7 — Employer reimbursements not in W-2 Box 1 (reduces deductible amount)
  employer_reimbursements: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  f2106s: z.array(itemSchema).min(1),
  // AGI — required to enforce performing artist eligibility limit (IRC §62(b)(1)(C)).
  // Performing artists with combined gross income from services >$16,000 are ineligible.
  // All other employee types are not subject to an AGI limit.
  agi: z.number().nonnegative().optional(),
});

type F2106Item = z.infer<typeof itemSchema>;
type F2106Items = F2106Item[];
type F2106Input = z.infer<typeof inputSchema>;

// Returns true if performing artist AGI limit is exceeded.
// IRC §62(b)(1)(C): performing artist must have combined AGI ≤ $16,000.
function performingArtistEligible(agi: number | undefined): boolean {
  if (agi === undefined) return true; // no AGI provided — allow deduction
  return agi <= F2106_PERFORMING_ARTIST_AGI_LIMIT;
}

// Compute vehicle expense for one item.
function vehicleExpense(item: F2106Item): number {
  if (item.vehicle_expense_method === VehicleMethod.STANDARD_MILEAGE) {
    return (item.business_miles ?? 0) * STANDARD_MILEAGE_RATE;
  }
  if (item.vehicle_expense_method === VehicleMethod.ACTUAL_EXPENSE) {
    return (item.actual_vehicle_expenses ?? 0) * ((item.business_use_pct ?? 0) / 100);
  }
  return 0;
}

// Compute meals deduction for one item (50% limitation, IRC §274(n)(1)).
function mealsDeduction(item: F2106Item): number {
  return (item.meals_expenses ?? 0) * MEALS_DEDUCTION_PCT;
}

// Total deductible expenses for one item before reimbursements.
function totalExpenses(item: F2106Item): number {
  return (
    vehicleExpense(item) +
    (item.parking_tolls_transportation ?? 0) +
    (item.travel_expenses ?? 0) +
    (item.other_expenses ?? 0) +
    mealsDeduction(item)
  );
}

// Net deduction for one item (IRC §62(a)(2)(A) — net of reimbursements, floor 0).
function netDeduction(item: F2106Item): number {
  return Math.max(0, totalExpenses(item) - (item.employer_reimbursements ?? 0));
}

// Filter items to only those eligible for deduction.
// Performing artists are excluded when AGI exceeds IRC §62(b)(1)(C) limit.
function eligibleItems(items: F2106Items, agi: number | undefined): F2106Items {
  const paEligible = performingArtistEligible(agi);
  if (paEligible) return items;
  return items.filter((item) => item.employee_type !== EmployeeType.PERFORMING_ARTIST);
}

// Total deduction across all eligible items.
function totalDeduction(items: F2106Items, agi: number | undefined): number {
  return eligibleItems(items, agi).reduce((sum, item) => sum + netDeduction(item), 0);
}

function schedule1Output(items: F2106Items, agi: number | undefined): NodeOutput[] {
  const total = totalDeduction(items, agi);
  if (total === 0) return [];
  return [output(schedule1, { line12_business_expenses: total })];
}

function agiOutput(items: F2106Items, agi: number | undefined): NodeOutput[] {
  const total = totalDeduction(items, agi);
  if (total === 0) return [];
  return [output(agi_aggregator, { line12_business_expenses: total })];
}

class F2106Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f2106";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1, agi_aggregator]);

  compute(_ctx: NodeContext, input: F2106Input): NodeResult {
    const parsed = inputSchema.parse(input);
    return {
      outputs: [
        ...schedule1Output(parsed.f2106s, parsed.agi),
        ...agiOutput(parsed.f2106s, parsed.agi),
      ],
    };
  }
}

export const f2106 = new F2106Node();
