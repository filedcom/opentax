import type { Form5695Fields, Form5695Input } from "../types.ts";
import { element, elements } from "../../../mef/xml.ts";


// --- Field Map ----------------------------------------------------------------

const FIELD_MAP: ReadonlyArray<readonly [keyof Form5695Fields, string]> = [
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

// --- Builder ------------------------------------------------------------------

function buildIRS5695(fields: Form5695Input): string {
  const children = FIELD_MAP.map(([key, tag]) => {
    const value = fields[key];
    if (typeof value !== "number") return "";
    return element(tag, value);
  });
  return elements("IRS5695", children);
}

import { MefNode } from "../form.ts";
import type { MefFormsPending } from "../types.ts";

class Form5695MefNode extends MefNode {
  readonly pdfUrl = "https://www.irs.gov/pub/irs-pdf/f5695.pdf";
  build(pending: MefFormsPending): string {
    return buildIRS5695(pending.form5695 ?? {});
  }
}

export const form5695 = new Form5695MefNode();
