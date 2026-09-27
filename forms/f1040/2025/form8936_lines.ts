import { z } from "zod";
import {
  computeNewVehicleCreditParts,
  computeVehiclePersonalCredit,
  type F8936Input,
} from "../nodes/inputs/f8936/index.ts";

const pendingSchema = z.object({
  f1040: z.object({
    line11_agi: z.number(),
    line18_total_tax_before_credits: z.number(),
  }),
  schedule3: z.object({
    line1_total: z.number().optional(),
    line2_childcare_credit: z.number().optional(),
    line3_education_credit: z.number().optional(),
    line4_retirement_savings_credit: z.number().optional(),
    line5b_energy_efficient_home: z.number().optional(),
    line6d_elderly_disabled_credit: z.number().optional(),
    line6i_qualified_electric_vehicle_credit: z.number().optional(),
    line6f_total: z.number().optional(),
    line6m_total: z.number().optional(),
  }).optional(),
  schedule2: z.object({
    line1b_new_clean_vehicle_repayment: z.number().optional(),
    line1c_prev_owned_clean_vehicle_repayment: z.number().optional(),
  }).optional(),
});

export type Form8936Lines = {
  readonly line9TentativeNew: number;
  readonly line10TaxBeforeCredits: number;
  readonly line11OtherCredits: number;
  readonly line12NewAvailable: number;
  readonly line13AllowedNew: number;
  readonly line14TentativeUsed: number;
  readonly line15TaxBeforeCredits: number;
  readonly line16OtherCredits: number;
  readonly line17UsedAvailable: number;
  readonly line18AllowedUsed: number;
};

/** Derive the filed Form 8936 lines from source vehicles and finalized return amounts. */
export function form8936Lines(
  input: F8936Input,
  pending: unknown,
): Form8936Lines | undefined {
  if (
    input.f8936s.some((item) =>
      item.is_new_vehicle === true &&
      computeNewVehicleCreditParts(item, input).business > 0
    )
  ) {
    throw new Error("Form 8936 business-use credit needs Form 3800 routing");
  }
  const active = input.f8936s.filter((item) =>
    item.transferred_to_dealer === true ||
    computeVehiclePersonalCredit(item, input) > 0
  );
  if (active.length === 0) return undefined;
  const transferred = active.filter((item) =>
    item.transferred_to_dealer === true
  );
  if (transferred.some((item) => (item.transferred_amount ?? 0) <= 0)) {
    throw new Error(
      "Form 8936 dealer transfer needs a positive transferred amount",
    );
  }
  const claimable = active.filter((item) =>
    item.transferred_to_dealer !== true
  );

  const finalized = pendingSchema.parse(pending);
  const line18 = finalized.f1040.line18_total_tax_before_credits;
  if (
    finalized.f1040.line11_agi !==
      input.current_year_magi.adjusted_gross_income
  ) {
    throw new Error(
      "Form 8936 current-year AGI does not match Form 1040 line 11",
    );
  }
  const schedule3 = finalized.schedule3 ?? {};
  const repaymentNew = transferred.filter((item) =>
    item.is_new_vehicle === true &&
    computeVehiclePersonalCredit(item, input) === 0
  ).reduce((sum, item) => sum + (item.transferred_amount ?? 0), 0);
  const repaymentUsed = transferred.filter((item) =>
    item.is_new_vehicle === false &&
    computeVehiclePersonalCredit(item, input) === 0
  ).reduce((sum, item) => sum + (item.transferred_amount ?? 0), 0);
  if (
    (finalized.schedule2?.line1b_new_clean_vehicle_repayment ?? 0) !==
      repaymentNew ||
    (finalized.schedule2?.line1c_prev_owned_clean_vehicle_repayment ?? 0) !==
      repaymentUsed
  ) {
    throw new Error(
      "Form 8936 dealer repayment does not reconcile with Schedule 2 lines 1b and 1c",
    );
  }
  const otherCredits = (schedule3.line1_total ?? 0) +
    (schedule3.line2_childcare_credit ?? 0) +
    (schedule3.line3_education_credit ?? 0) +
    (schedule3.line4_retirement_savings_credit ?? 0) +
    (schedule3.line5b_energy_efficient_home ?? 0) +
    (schedule3.line6d_elderly_disabled_credit ?? 0) +
    (schedule3.line6i_qualified_electric_vehicle_credit ?? 0);
  const tentativeNew = claimable.filter((item) => item.is_new_vehicle === true)
    .reduce((sum, item) => sum + computeVehiclePersonalCredit(item, input), 0);
  const tentativeUsed = claimable.filter((item) =>
    item.is_new_vehicle === false
  )
    .reduce((sum, item) => sum + computeVehiclePersonalCredit(item, input), 0);
  const usedAvailable = Math.max(0, line18 - otherCredits);
  const usedCredit = Math.min(tentativeUsed, usedAvailable);
  const newAvailable = Math.max(0, line18 - otherCredits - usedCredit);
  const newCredit = Math.min(tentativeNew, newAvailable);
  if (
    (schedule3.line6f_total ?? 0) !== newCredit ||
    (schedule3.line6m_total ?? 0) !== usedCredit
  ) {
    throw new Error(
      "Form 8936 credit does not reconcile with Schedule 3 lines 6f and 6m",
    );
  }
  return {
    line9TentativeNew: tentativeNew,
    line10TaxBeforeCredits: line18,
    line11OtherCredits: otherCredits + usedCredit,
    line12NewAvailable: newAvailable,
    line13AllowedNew: newCredit,
    line14TentativeUsed: tentativeUsed,
    line15TaxBeforeCredits: line18,
    line16OtherCredits: otherCredits,
    line17UsedAvailable: usedAvailable,
    line18AllowedUsed: usedCredit,
  };
}
