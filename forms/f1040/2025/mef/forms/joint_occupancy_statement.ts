import { element, elements } from "../../../mef/xml.ts";
import {
  calculatedFuelCellAllocation,
  calculatedHomeImprovementCredit,
  calculatedPercentage,
  type FuelCell,
  type HomeImprovement,
  HomeImprovementKind,
  inputSchema,
  type JointOccupancyStatement,
} from "../../../nodes/intermediate/forms/joint_occupancy_statement/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

const GROUP_TAG: Readonly<Record<HomeImprovementKind, string>> = {
  [HomeImprovementKind.Insulation]: "InsulationOrAirSealingGrp",
  [HomeImprovementKind.ExteriorDoors]: "ExteriorDoorsGrp",
  [HomeImprovementKind.WindowsOrSkylights]: "WindowsOrSkylightsGrp",
  [HomeImprovementKind.CentralAirConditioners]: "CentralAirConditionersGrp",
  [HomeImprovementKind.WaterHeaters]: "GasPropaneOilWaterHeatersGrp",
  [HomeImprovementKind.FurnaceOrBoilers]: "FurnaceOrHotWaterBoilersGrp",
  [HomeImprovementKind.BoardsCircuitsOrFeeders]: "BoardsCircuitsOrFeedersGrp",
  [HomeImprovementKind.HomeEnergyAudits]: "HomeEnergyAuditsGrp",
  [HomeImprovementKind.HeatPumpsBiomass]: "HeatPumpsBmssStovesBoilersGrp",
};

const GROUP_ORDER = Object.values(HomeImprovementKind);

function buildFuelCell(item: FuelCell): string {
  const amounts = calculatedFuelCellAllocation(item);
  return elements("QualifiedFuelCellPropertyGrp", [
    item.explanation === undefined
      ? ""
      : element("ExplanationTxt", item.explanation),
    element("FuelCellPropKWCapNum", String(item.kw_capacity)),
    element("MaxQualifyingCostsPerKWAmt", 1667),
    element("TotalAllocableCostAmt", amounts.maximumQualifyingCost),
    element("PaidAmt", item.paid),
    element("TotalJointOccupantPaidAmt", item.total_joint_occupants_paid),
    element("CalculatedPct", String(calculatedPercentage(item))),
    element("AllocatedFuelCellPropCostAmt", amounts.allocatedCost),
  ]);
}

function buildHomeImprovement(item: HomeImprovement): string {
  return elements(GROUP_TAG[item.kind], [
    item.explanation === undefined
      ? ""
      : element("ExplanationTxt", item.explanation),
    element("MaximumCreditAllowedAmt", item.maximum_credit_allowed),
    element("PaidAmt", item.paid),
    element("TotalJointOccupantPaidAmt", item.total_joint_occupants_paid),
    element("CalculatedPct", String(calculatedPercentage(item))),
    element("CalculatedCreditAmt", calculatedHomeImprovementCredit(item)),
  ]);
}

function buildStatement(statement: JointOccupancyStatement): string {
  return elements("JointOccupancyStatement", [
    ...(statement.fuel_cell_properties ?? []).map(buildFuelCell),
    ...GROUP_ORDER.flatMap((kind) =>
      (statement.home_improvements ?? [])
        .filter((item) => item.kind === kind)
        .map(buildHomeImprovement)
    ),
  ]);
}

type Input =
  & Partial<{
    statements: readonly JointOccupancyStatement[];
  }>
  & Record<string, unknown>;

export const jointOccupancyStatement: MefFormDescriptor<
  "joint_occupancy_statement",
  Input,
  readonly string[]
> = {
  pendingKey: "joint_occupancy_statement",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/instructions/i5695",
  build(fields) {
    if (Object.keys(fields).length === 0) return [];
    const parsed = inputSchema.parse(fields);
    return parsed.statements.map(buildStatement);
  },
};
