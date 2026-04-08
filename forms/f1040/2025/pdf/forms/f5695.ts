import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 5695 (2025) AcroForm field names.
// Part I  — Residential Clean Energy Credit (lines 1–13).
// Part II — Energy Efficient Home Improvement Credit (lines 17–30).
const fields: ReadonlyArray<PdfFieldEntry> = [
  // Part I — Residential Clean Energy
  { kind: "text", domainKey: "solar_electric_cost", pdfField: "topmostSubform[0].Page1[0].f1_01[0]" },
  { kind: "text", domainKey: "solar_water_heater_cost", pdfField: "topmostSubform[0].Page1[0].f1_02[0]" },
  { kind: "text", domainKey: "fuel_cell_cost", pdfField: "topmostSubform[0].Page1[0].f1_03[0]" },
  { kind: "text", domainKey: "fuel_cell_kw_capacity", pdfField: "topmostSubform[0].Page1[0].f1_04[0]" },
  { kind: "text", domainKey: "small_wind_cost", pdfField: "topmostSubform[0].Page1[0].f1_05[0]" },
  { kind: "text", domainKey: "geothermal_cost", pdfField: "topmostSubform[0].Page1[0].f1_06[0]" },
  { kind: "text", domainKey: "battery_storage_cost", pdfField: "topmostSubform[0].Page1[0].f1_07[0]" },
  { kind: "text", domainKey: "battery_storage_kwh_capacity", pdfField: "topmostSubform[0].Page1[0].f1_08[0]" },
  { kind: "text", domainKey: "prior_year_carryforward", pdfField: "topmostSubform[0].Page1[0].f1_12[0]" },
  // Part II — Energy Efficient Home Improvement
  { kind: "text", domainKey: "windows_cost", pdfField: "topmostSubform[0].Page1[0].f1_16[0]" },
  { kind: "text", domainKey: "exterior_doors_cost", pdfField: "topmostSubform[0].Page1[0].f1_17[0]" },
  { kind: "text", domainKey: "exterior_doors_count", pdfField: "topmostSubform[0].Page1[0].f1_18[0]" },
  { kind: "text", domainKey: "insulation_cost", pdfField: "topmostSubform[0].Page1[0].f1_19[0]" },
  { kind: "text", domainKey: "central_ac_cost", pdfField: "topmostSubform[0].Page1[0].f1_20[0]" },
  { kind: "text", domainKey: "gas_water_heater_cost", pdfField: "topmostSubform[0].Page1[0].f1_21[0]" },
  { kind: "text", domainKey: "furnace_boiler_cost", pdfField: "topmostSubform[0].Page1[0].f1_22[0]" },
  { kind: "text", domainKey: "panelboard_cost", pdfField: "topmostSubform[0].Page1[0].f1_23[0]" },
  { kind: "text", domainKey: "heat_pump_cost", pdfField: "topmostSubform[0].Page1[0].f1_24[0]" },
  { kind: "text", domainKey: "heat_pump_water_heater_cost", pdfField: "topmostSubform[0].Page1[0].f1_25[0]" },
  { kind: "text", domainKey: "biomass_cost", pdfField: "topmostSubform[0].Page1[0].f1_26[0]" },
  { kind: "text", domainKey: "energy_audit_cost", pdfField: "topmostSubform[0].Page1[0].f1_27[0]" },
];

export const form5695Pdf: PdfFormDescriptor = {
  pendingKey: "form5695",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f5695.pdf",
  fields,
};
