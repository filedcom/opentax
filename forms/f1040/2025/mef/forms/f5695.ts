import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  solar_electric_cost?: number | null;
  solar_water_heater_cost?: number | null;
  fuel_cell_cost?: number | null;
  fuel_cell_kw_capacity?: number | null;
  small_wind_cost?: number | null;
  geothermal_cost?: number | null;
  battery_storage_cost?: number | null;
  battery_storage_kwh_capacity?: number | null;
  prior_year_carryforward?: number | null;
  windows_cost?: number | null;
  exterior_doors_cost?: number | null;
  exterior_doors_count?: number | null;
  insulation_cost?: number | null;
  central_ac_cost?: number | null;
  gas_water_heater_cost?: number | null;
  furnace_boiler_cost?: number | null;
  panelboard_cost?: number | null;
  heat_pump_cost?: number | null;
  heat_pump_water_heater_cost?: number | null;
  biomass_cost?: number | null;
  energy_audit_cost?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["solar_electric_cost", "RsdntlSolarElecPropCostAmt"],
  ["solar_water_heater_cost", "SolarWaterHtPropCostAmt"],
  ["fuel_cell_cost", "FuelCellPropCostAmt"],
  ["fuel_cell_kw_capacity", "FuelCellPropKWCapNum"],
  ["small_wind_cost", "SmallWindEgyPropCostAmt"],
  ["geothermal_cost", "GeothermalHtPmpPropCostAmt"],
  ["battery_storage_cost", "BatteryStorageTechCostAmt"],
  ["battery_storage_kwh_capacity", "BatteryStorageKWhCapNum"],
  ["prior_year_carryforward", "PriorYearCarryforwardAmt"],
  ["windows_cost", "EgyEfcntExtWindowsAndSkyltsAmt"],
  ["exterior_doors_cost", "EgyEfcntExtDoorsAmt"],
  ["exterior_doors_count", "EgyEfcntExtDoorsCnt"],
  ["insulation_cost", "InsulationOrAirSealMtrlAmt"],
  ["central_ac_cost", "CntrlAirCondAmt"],
  ["gas_water_heater_cost", "NatGasPropnOilWtrHtrAmt"],
  ["furnace_boiler_cost", "NatGasPropnOilFurnBoilAmt"],
  ["panelboard_cost", "ElecPanelBrdSubpanelAmt"],
  ["heat_pump_cost", "ElecOrNGasHtPmpAmt"],
  ["heat_pump_water_heater_cost", "ElecOrNGasHtPmpWtrHtrAmt"],
  ["biomass_cost", "BiomassStoveOrBoilerAmt"],
  ["energy_audit_cost", "HomeEnergyAuditCostAmt"],
];

function buildIRS5695(fields: Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS5695", children);
}

export const form5695: MefFormDescriptor<"form5695", Input> = {
  pendingKey: "form5695",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f5695.pdf",
  build(fields) {
    return buildIRS5695(fields);
  },
};
