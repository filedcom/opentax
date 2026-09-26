import { z } from "zod";
import type { NodeResult } from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";

export enum HomeImprovementKind {
  Insulation = "insulation",
  ExteriorDoors = "exterior_doors",
  WindowsOrSkylights = "windows_or_skylights",
  CentralAirConditioners = "central_air_conditioners",
  WaterHeaters = "water_heaters",
  FurnaceOrBoilers = "furnace_or_boilers",
  BoardsCircuitsOrFeeders = "boards_circuits_or_feeders",
  HomeEnergyAudits = "home_energy_audits",
  HeatPumpsBiomass = "heat_pumps_biomass",
}

const amountSchema = z.number().int().nonnegative();
const CREDIT_LIMIT: Readonly<Record<HomeImprovementKind, number>> = {
  [HomeImprovementKind.Insulation]: 1200,
  [HomeImprovementKind.ExteriorDoors]: 500,
  [HomeImprovementKind.WindowsOrSkylights]: 600,
  [HomeImprovementKind.CentralAirConditioners]: 600,
  [HomeImprovementKind.WaterHeaters]: 600,
  [HomeImprovementKind.FurnaceOrBoilers]: 600,
  [HomeImprovementKind.BoardsCircuitsOrFeeders]: 600,
  [HomeImprovementKind.HomeEnergyAudits]: 150,
  [HomeImprovementKind.HeatPumpsBiomass]: 2000,
};

const paidShareSchema = z.object({
  paid: amountSchema.positive(),
  total_joint_occupants_paid: amountSchema.positive(),
}).superRefine((item, context) => {
  if (item.paid >= item.total_joint_occupants_paid) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A joint-occupancy item needs payments by another occupant",
    });
  }
  if (
    Math.round(item.paid / item.total_joint_occupants_paid * 10_000) >= 10_000
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Joint-occupancy share cannot be represented in the IRS four-decimal field",
    });
  }
});

const homeImprovementSchema = z.object({
  kind: z.nativeEnum(HomeImprovementKind),
  explanation: z.string().max(9000).optional(),
  maximum_credit_allowed: amountSchema.positive(),
  paid: amountSchema.positive(),
  total_joint_occupants_paid: amountSchema.positive(),
}).superRefine((item, context) => {
  const share = paidShareSchema.safeParse(item);
  for (const issue of share.success ? [] : share.error.issues) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: issue.message });
  }
  const validLimit = item.kind === HomeImprovementKind.ExteriorDoors
    ? item.maximum_credit_allowed === 250 ||
      item.maximum_credit_allowed === 500
    : item.maximum_credit_allowed === CREDIT_LIMIT[item.kind];
  if (!validLimit) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Maximum credit must match the Form 5695 property limit",
    });
  }
});

export const fuelCellSchema = z.object({
  explanation: z.string().max(9000).optional(),
  kw_capacity: z.number().min(0.5).refine(
    (value) => Number.isInteger(value * 2),
    "Fuel-cell capacity must be in half-kilowatt increments",
  ),
  paid: amountSchema.positive(),
  total_joint_occupants_paid: amountSchema.positive(),
}).superRefine((item, context) => {
  const share = paidShareSchema.safeParse(item);
  for (const issue of share.success ? [] : share.error.issues) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: issue.message });
  }
});

export const jointOccupancyStatementSchema = z.object({
  fuel_cell_properties: z.array(fuelCellSchema).optional(),
  home_improvements: z.array(homeImprovementSchema).optional(),
}).refine(
  (statement) =>
    (statement.fuel_cell_properties?.length ?? 0) +
        (statement.home_improvements?.length ?? 0) > 0,
  "A joint-occupancy statement needs at least one allocated item",
);

export type JointOccupancyStatement = z.infer<
  typeof jointOccupancyStatementSchema
>;
export type HomeImprovement = NonNullable<
  JointOccupancyStatement["home_improvements"]
>[number];
export type FuelCell = NonNullable<
  JointOccupancyStatement["fuel_cell_properties"]
>[number];

export function calculatedPercentage(item: {
  paid: number;
  total_joint_occupants_paid: number;
}): number {
  return Math.round(item.paid / item.total_joint_occupants_paid * 10_000) /
    10_000;
}

export function calculatedHomeImprovementCredit(item: HomeImprovement): number {
  const ownTentativeCredit = Math.round(item.paid * 0.30);
  const allocableLimit = Math.round(
    item.maximum_credit_allowed * item.paid / item.total_joint_occupants_paid,
  );
  return Math.min(ownTentativeCredit, allocableLimit);
}

export function calculatedFuelCellAllocation(item: FuelCell): {
  maximumQualifyingCost: number;
  allocatedCost: number;
} {
  const maximumQualifyingCost = 1667 * item.kw_capacity * 2;
  return {
    maximumQualifyingCost,
    allocatedCost: Math.min(
      item.paid,
      Math.round(
        maximumQualifyingCost * item.paid / item.total_joint_occupants_paid,
      ),
    ),
  };
}

export const inputSchema = z.object({
  statements: z.array(jointOccupancyStatementSchema).min(1),
});

class JointOccupancyStatementNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "joint_occupancy_statement";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    inputSchema.parse(input);
    return { outputs: [] };
  }
}

export const jointOccupancyStatementNode = new JointOccupancyStatementNode();
