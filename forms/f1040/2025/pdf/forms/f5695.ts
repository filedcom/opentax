import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 5695 (2025) AcroForm field names.
// Part I  — Residential Clean Energy Credit (lines 1–13).
// Part II — Energy Efficient Home Improvement Credit (lines 17–30).
export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  // Part I — Residential Clean Energy
  ["solar_electric_cost",          "topmostSubform[0].Page1[0].f1_01[0]"],
  ["solar_water_heater_cost",      "topmostSubform[0].Page1[0].f1_02[0]"],
  ["fuel_cell_cost",               "topmostSubform[0].Page1[0].f1_03[0]"],
  ["fuel_cell_kw_capacity",        "topmostSubform[0].Page1[0].f1_04[0]"],
  ["small_wind_cost",              "topmostSubform[0].Page1[0].f1_05[0]"],
  ["geothermal_cost",              "topmostSubform[0].Page1[0].f1_06[0]"],
  ["battery_storage_cost",         "topmostSubform[0].Page1[0].f1_07[0]"],
  ["battery_storage_kwh_capacity", "topmostSubform[0].Page1[0].f1_08[0]"],
  ["prior_year_carryforward",      "topmostSubform[0].Page1[0].f1_12[0]"],
  // Part II — Energy Efficient Home Improvement
  ["windows_cost",                 "topmostSubform[0].Page1[0].f1_16[0]"],
  ["exterior_doors_cost",          "topmostSubform[0].Page1[0].f1_17[0]"],
  ["exterior_doors_count",         "topmostSubform[0].Page1[0].f1_18[0]"],
  ["insulation_cost",              "topmostSubform[0].Page1[0].f1_19[0]"],
  ["central_ac_cost",              "topmostSubform[0].Page1[0].f1_20[0]"],
  ["gas_water_heater_cost",        "topmostSubform[0].Page1[0].f1_21[0]"],
  ["furnace_boiler_cost",          "topmostSubform[0].Page1[0].f1_22[0]"],
  ["panelboard_cost",              "topmostSubform[0].Page1[0].f1_23[0]"],
  ["heat_pump_cost",               "topmostSubform[0].Page1[0].f1_24[0]"],
  ["heat_pump_water_heater_cost",  "topmostSubform[0].Page1[0].f1_25[0]"],
  ["biomass_cost",                 "topmostSubform[0].Page1[0].f1_26[0]"],
  ["energy_audit_cost",            "topmostSubform[0].Page1[0].f1_27[0]"],
];

export const form5695Pdf: PdfFormDescriptor = {
  pendingKey: "form5695",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f5695.pdf",
  PDF_FIELD_MAP,
};
