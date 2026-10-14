import { z } from "zod";

export enum FishingExpenseKind {
  Insurance = "business_insurance",
  Repairs = "repairs_maintenance",
  Utilities = "business_utilities",
}

const paidExpense = z.object({
  paid_on: z.string().date().refine((date) => date.startsWith("2025-")),
  supplier: z.string().trim().min(1),
  paid_receipt_reference: z.string().trim().min(1),
  description: z.string().trim().min(1),
  amount: z.number().int().positive().refine(Number.isSafeInteger),
  entirely_for_this_fishing_business: z.literal(true),
  paid_for_2025_services: z.literal(true),
});

// Schedule C lines 15, 21 and 25. These reviewed paid expenses exclude
// capitalization, home-office allocation and personal/employee insurance.
const fishingExpenseSchema = z.discriminatedUnion("kind", [
  paidExpense.extend({
    kind: z.literal(FishingExpenseKind.Insurance),
    property_or_liability_policy: z.literal(true),
    no_health_life_lost_earnings_or_self_insurance: z.literal(true),
  }).strict(),
  paidExpense.extend({
    kind: z.literal(FishingExpenseKind.Repairs),
    incidental_maintenance_not_capital_improvement: z.literal(true),
    no_owner_labor_value: z.literal(true),
  }).strict(),
  paidExpense.extend({
    kind: z.literal(FishingExpenseKind.Utilities),
    no_personal_home_office_or_residential_phone: z.literal(true),
  }).strict(),
]);

export const fishingLedgerSchema = z.object({
  tax_year: z.literal(2025),
  taxpayer_ssn: z.string().regex(/^\d{9}$/),
  business_reference: z.string().trim().min(1),
  catch_sales_record_reference: z.string().trim().min(1),
  vessel_name: z.string().trim().min(1),
  commercial_harvest: z.literal(true),
  scientific_research_vessel: z.literal(false),
  sales: z.array(
    z.object({
      sold_on: z.string().regex(/^2025-\d{2}-\d{2}$/),
      buyer: z.string().trim().min(1),
      buyer_invoice_reference: z.string().trim().min(1),
      catch_description: z.string().trim().min(1),
      amount: z.number().int().positive(),
    }).strict(),
  ).min(1),
  supplies: z.array(
    z.object({
      paid_on: z.string().regex(/^2025-\d{2}-\d{2}$/),
      supplier: z.string().trim().min(1),
      paid_receipt_reference: z.string().trim().min(1),
      amount: z.number().int().positive(),
    }).strict(),
  ),
  expenses: z.array(fishingExpenseSchema).optional(),
}).strict();

export function fishingExpenseTotals(
  ledger: z.infer<typeof fishingLedgerSchema>,
) {
  const amount = (kind: FishingExpenseKind) =>
    (ledger.expenses ?? [])
      .filter((row) => row.kind === kind)
      .reduce((sum, row) => sum + row.amount, 0);
  return {
    line_15_insurance: amount(FishingExpenseKind.Insurance),
    line_21_repairs: amount(FishingExpenseKind.Repairs),
    line_25_utilities: amount(FishingExpenseKind.Utilities),
  };
}
