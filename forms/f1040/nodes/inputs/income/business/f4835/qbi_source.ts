import { z } from "zod";
const ref = z.string().trim().min(1),
  tin = z.string().regex(/^\d{9}$/),
  date = z.string().date().refine((s) => s.startsWith("2025-"));
export const currentFarmRentalQbiSourceSchema = z.object({
  tax_year: z.literal(2025),
  activity_id: ref.max(64),
  activity_name: ref.max(30),
  recipient_tin: tin,
  business_name: ref.max(75),
  acquired_on: date,
  ownership_record_reference: ref,
  tenant_ein: tin,
  crop_share_lease_reference: ref,
  rented_months: z.array(z.number().int().min(1).max(12)).length(12).refine(
    (a) => a.every((m, i) => m === i + 1),
  ),
  management_source: z.object({
    agent_ein: tin,
    management_contract_reference: ref,
    recurring_rental_management_services: z.literal(true),
    taxpayer_materially_participated: z.literal(false),
  }).strict(),
  section162_domestic_rental_review_reference: ref,
  current_receipts: z.array(
    z.object({
      paid_on: date,
      payer_ein: tin,
      amount: z.number().int().positive(),
      issued_crop_settlement_reference: ref,
      deposit_reference: ref,
    }).strict(),
  ).min(1),
  current_repairs: z.array(
    z.object({
      paid_on: date,
      payee_ein: tin,
      amount: z.number().int().positive(),
      invoice_reference: ref,
      payment_reference: ref,
    }).strict(),
  ).min(1),
  prior_qbi_loss: z.literal(0),
  prior_passive_loss: z.literal(0),
}).strict();
export type CurrentFarmRentalQbiSource = z.infer<
  typeof currentFarmRentalQbiSourceSchema
>;
export function currentFarmRentalNet(s: CurrentFarmRentalQbiSource) {
  return s.current_receipts.reduce((t, r) => t + r.amount, 0) -
    s.current_repairs.reduce((t, r) => t + r.amount, 0);
}
export function reconcileCurrentFarmRentalQbi(item: Record<string, unknown>) {
  if (item.current_qbi_source === undefined) return undefined;
  const s = currentFarmRentalQbiSourceSchema.parse(item.current_qbi_source);
  const receipts = s.current_receipts.reduce((t, r) => t + r.amount, 0),
    repairs = s.current_repairs.reduce((t, r) => t + r.amount, 0);
  if (
    s.activity_id !== item.activity_id ||
    s.activity_name !== item.activity_name ||
    receipts !== item.livestock_crop_income ||
    repairs !== (item.expense_repairs_maintenance ?? 0) ||
    s.current_receipts.some((r) => r.payer_ein !== s.tenant_ein) ||
    item.actively_participated === true ||
    item.some_investment_not_at_risk === true ||
    item.at_risk_simplified !== undefined ||
    (item.prior_unallowed_passive_operating ?? 0) !== 0 ||
    Object.entries(item).some(([k, v]) =>
      typeof v === "number" && v !== 0 && k !== "livestock_crop_income" &&
      k !== "expense_repairs_maintenance"
    )
  ) {
    throw new Error(
      "Farm rental QBI source differs from its actual current lease/receipt/payment/zero-prior activity",
    );
  }
  return s;
}
