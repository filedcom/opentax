import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { schedule1a_2026 } from "../nodes/schedule1a.ts";
import {
  calculateVehicleInterestSources2026,
  vehicleBusinessDeductionSchema,
  vehicleLoan2026Schema,
} from "./vehicle-loan-source.ts";
export { vehicleLoan2026Schema } from "./vehicle-loan-source.ts";
const ssn = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
export const inputSchema = z.object({
  // First field is the shared router's repeated-source key.
  vehicle_loans: z.array(vehicleLoan2026Schema).default([]),
  filing_status: z.nativeEnum(FilingStatus),
  taxpayer_ssn: ssn,
  spouse_ssn: ssn.optional(),
  business_vehicle_vins_2026: z.array(z.string()).default([]),
  business_interest_deductions_2026: z.array(vehicleBusinessDeductionSchema)
    .optional(),
}).strict();
class VehicleLoanInterest2026Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "vehicle_loan_interest";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1a_2026]);
  compute(ctx: NodeContext, raw: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Vehicle interest needs f1040:2026 context");
    }
    const input = inputSchema.parse(raw);
    if (
      input.vehicle_loans.some((loan) =>
        input.business_vehicle_vins_2026.includes(loan.vin.toUpperCase())
      )
    ) {
      throw new Error(
        "Shared vehicle needs Schedule C/Schedule 1-A loan and interest reconciliation",
      );
    }
    const sources = calculateVehicleInterestSources2026(
      input.vehicle_loans,
      input,
      input.business_interest_deductions_2026,
    );
    if (!sources.length) return { outputs: [] };
    return {
      outputs: [
        {
          nodeType: this.nodeType,
          fields: { reviewed_vehicle_sources_2026: sources },
        },
        {
          nodeType: "schedule1a",
          fields: { vehicle_interest_2026: sources.map((s) => s.row) },
        },
      ],
    };
  }
}
export const vehicle_loan_interest_2026 = new VehicleLoanInterest2026Node();
