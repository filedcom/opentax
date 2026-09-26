import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../types.ts";
import { form5695 } from "./f5695.ts";

const filer: FilerIdentity = {
  primarySSN: "400001032",
  nameLine1: "BLACK TARA",
  nameControl: "BLAC",
  fullName: "Tara Black",
  address: {
    line1: "17 Lexington Drive",
    city: "Cincinnati",
    state: "OH",
    zip: "45223",
  },
  filingStatus: FilingStatus.Single,
};

Deno.test("Form 5695 Part I emits ordered 2025 MeF fields and carryforward", () => {
  const xml = form5695.build({
    part_i_home_address: filer.address,
    solar_electric_cost: 10_000,
    battery_storage_cost: 2_000,
    battery_storage_kwh_capacity: 3,
    prior_year_carryforward: 100,
    part_i_tax_limit: 2_000,
  }, { filer });
  assertStringIncludes(xml, "<NameLine1Txt>Tara Black</NameLine1Txt>");
  assertStringIncludes(xml, "<ResidentialCleanEnergyCrGrp>");
  assertStringIncludes(
    xml,
    "<SolarElecPropCostAmt>10000</SolarElecPropCostAmt>",
  );
  assertStringIncludes(
    xml,
    "<QlfyBatteryStorageTechInd>true</QlfyBatteryStorageTechInd>",
  );
  assertStringIncludes(
    xml,
    "<TotalEnergyCreditsAmt>12000</TotalEnergyCreditsAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalEnergyCreditsStdPctCrAmt>3600</TotalEnergyCreditsStdPctCrAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalOfEnergyCreditsAmt>3700</TotalOfEnergyCreditsAmt>",
  );
  assertStringIncludes(
    xml,
    "<ResidentialCleanEnergyCrAmt>2000</ResidentialCleanEnergyCrAmt>",
  );
  assertStringIncludes(
    xml,
    "<CfwdRsdntlCleanEnergyCrAmt>1700</CfwdRsdntlCleanEnergyCrAmt>",
  );
  assertEquals(xml.includes("RsdntlSolarElecPropCostAmt"), false);
});

Deno.test("Form 5695 carryforward-only does not invent current-year costs or address", () => {
  const xml = form5695.build({
    prior_year_carryforward: 900,
    part_i_tax_limit: 400,
  }, { filer });
  assertStringIncludes(
    xml,
    "<PYCfwdRsdntlCleanEnergyCrAmt>900</PYCfwdRsdntlCleanEnergyCrAmt>",
  );
  assertStringIncludes(
    xml,
    "<ResidentialCleanEnergyCrAmt>400</ResidentialCleanEnergyCrAmt>",
  );
  assertEquals(xml.includes("ResidentialCleanEgyHomeAddress"), false);
  assertEquals(xml.includes("TotalEnergyCreditsAmt"), false);
});

Deno.test("Form 5695 does not file a claim for an ineligible battery alone", () => {
  assertEquals(
    form5695.build({
      battery_storage_cost: 2_000,
      battery_storage_kwh_capacity: 2,
    }, { filer }),
    "",
  );
});

Deno.test("Form 5695 fuel-cell claim preserves half-kW capacity and cap", () => {
  const xml = form5695.build({
    fuel_cell_cost: 3_000,
    fuel_cell_kw_capacity: 0.5,
    fuel_cell_home_in_us: true,
    fuel_cell_home_address: filer.address,
    fuel_cell_joint_occupancy: false,
    part_i_tax_limit: 1_000,
  }, { filer });
  assertStringIncludes(
    xml,
    "<QlfyFuelCellPropertyInUSInd>true</QlfyFuelCellPropertyInUSInd>",
  );
  assertStringIncludes(xml, "<FuelCellPropKWCapNum>0.5</FuelCellPropKWCapNum>");
  assertStringIncludes(xml, "<FuelCellPropKWCapAmt>500</FuelCellPropKWCapAmt>");
  assertStringIncludes(
    xml,
    "<FuelCellPropAllwblCostAmt>500</FuelCellPropAllwblCostAmt>",
  );
  assertEquals(xml.includes("ResidentialCleanEgyHomeAddress"), false);
});

Deno.test("Form 5695 fuel-cell joint occupancy is not used on an MFJ return", () => {
  assertThrows(() =>
    form5695.build({
      fuel_cell_cost: 12_000,
      fuel_cell_kw_capacity: 5,
      fuel_cell_home_in_us: true,
      fuel_cell_home_address: filer.address,
      fuel_cell_joint_occupancy: true,
      fuel_cell_total_joint_occupants_paid: 20_000,
      part_i_tax_limit: 10_000,
    }, {
      filer: { ...filer, filingStatus: FilingStatus.MarriedFilingJointly },
    })
  );
});

Deno.test("Form 5695 itemized Section A emits ordered QMID groups and exact credits", () => {
  const xml = form5695.build({
    part_ii_section_a: {
      main_home_in_us: true,
      original_user: true,
      five_year_use: true,
      home_address: filer.address,
      related_to_new_home: false,
      exterior_doors: [
        { cost: 10, qmid: "C3D4" },
        { cost: 5_000, qmid: "A1B2" },
      ],
      windows: [{ cost: 600, qmid: "E5F6" }],
      insulation_cost: 400,
    },
    part_ii_tax_limit: 1_000,
  }, { filer });
  assertStringIncludes(
    xml,
    "<MostExpnsExtrDoorQMID>A1B2</MostExpnsExtrDoorQMID>",
  );
  assertStringIncludes(
    xml,
    "<NextMostExpnsExtrDoorGrp><QMID>C3D4</QMID><CostAmt>10</CostAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalExtrDoorsCreditAmt>253</TotalExtrDoorsCreditAmt>",
  );
  assertStringIncludes(
    xml,
    "<ExtrWndwSkylightStdPctCrAmt>180</ExtrWndwSkylightStdPctCrAmt>",
  );
  assertStringIncludes(
    xml,
    "<EgyEffcntImprvCreditSubtlAmt>553</EgyEffcntImprvCreditSubtlAmt>",
  );
  assertStringIncludes(
    xml,
    "<EgyEffcntHmImprvCrAmt>553</EgyEffcntHmImprvCrAmt>",
  );
  assertEquals(xml.includes("ResidentialCleanEnergyCrGrp"), false);
});

Deno.test("Form 5695 puts door and window overflow totals on the printed lines", () => {
  const fields = {
    part_ii_section_a: {
      main_home_in_us: true,
      original_user: true,
      five_year_use: true,
      home_address: filer.address,
      related_to_new_home: false,
      exterior_doors: [
        { cost: 1_000, qmid: "A1B2" },
        { cost: 900, qmid: "C3D4" },
        { cost: 800, qmid: "E5F6" },
        { cost: 700, qmid: "G7H8" },
      ],
      windows: [
        { cost: 500, qmid: "J9K0" },
        { cost: 400, qmid: "L1M2" },
        { cost: 300, qmid: "N3P4" },
        { cost: 200, qmid: "R5S6" },
        { cost: 100, qmid: "T7U8" },
      ],
    },
    part_ii_tax_limit: 1_000,
  };
  assertThrows(
    () => form5695.build(fields, { filer }),
    Error,
    "AdditionalQMIDStatement.pdf bundle attachment",
  );
  const xml = form5695.build(fields, {
    filer,
    binaryAttachmentFileNames: ["AdditionalQMIDStatement.pdf"],
  });
  assertStringIncludes(
    xml,
    "<NextMostExpnsExtrDoorCostAmt>1700</NextMostExpnsExtrDoorCostAmt>",
  );
  assertStringIncludes(
    xml,
    "<OtherQlfyExtrDoorsCostAmt>700</OtherQlfyExtrDoorsCostAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalOtherQlfyExtrDoorsCostAmt>2400</TotalOtherQlfyExtrDoorsCostAmt>",
  );
  assertStringIncludes(
    xml,
    "<MostExpnsExtrWndwSkyltCostAmt>1400</MostExpnsExtrWndwSkyltCostAmt>",
  );
  assertStringIncludes(
    xml,
    "<OthQlfyExtrWndwSkyltCostAmt>100</OthQlfyExtrWndwSkyltCostAmt>",
  );
  assertStringIncludes(
    xml,
    "<ExteriorWndwOrSkylightCostAmt>1500</ExteriorWndwOrSkylightCostAmt>",
  );
  assertEquals(xml.includes("<QMID>G7H8</QMID>"), false);
  assertEquals(xml.includes("<QMID>T7U8</QMID>"), false);
});

Deno.test("Form 5695 Section A line 18b does not exceed its $1,200 limit", () => {
  const xml = form5695.build({
    part_ii_section_a: {
      main_home_in_us: true,
      original_user: true,
      five_year_use: true,
      home_address: filer.address,
      related_to_new_home: false,
      insulation_cost: 10_000,
    },
    part_ii_tax_limit: 2_000,
  }, { filer });
  assertStringIncludes(
    xml,
    "<InsulationOrSysHtStdPctCrAmt>1200</InsulationOrSysHtStdPctCrAmt>",
  );
  assertStringIncludes(
    xml,
    "<EgyEffcntHmImprvCrAmt>1200</EgyEffcntHmImprvCrAmt>",
  );
});

Deno.test("Form 5695 itemized Section B emits property QMIDs and separate limits", () => {
  const xml = form5695.build({
    part_ii_section_b: {
      home_in_us: true,
      originally_placed_in_service: true,
      home_addresses: [filer.address],
      central_air_conditioner: { cost: 2_000, qmid: "A1B2" },
      water_heaters: [{ cost: 1_000, qmid: "C3D4" }],
      furnace_or_boiler: { cost: 2_000, qmid: "E5F6" },
      heat_pump: { cost: 2_000, qmid: "G7H8" },
      heat_pump_water_heater: { cost: 2_000, qmid: "J9K0" },
      biomass_stove_or_boiler: { cost: 2_000, qmid: "L1M2" },
    },
    part_ii_tax_limit: 3_500,
  }, { filer });
  assertStringIncludes(
    xml,
    "<MostExpnsCentralAirCondQMID>A1B2</MostExpnsCentralAirCondQMID>",
  );
  assertStringIncludes(
    xml,
    "<MostExpnsWaterHtrGrp><QMID>C3D4</QMID><CostAmt>1000</CostAmt>",
  );
  assertStringIncludes(
    xml,
    "<MostExpnsFrncHotWtrBlrQMID>E5F6</MostExpnsFrncHotWtrBlrQMID>",
  );
  assertStringIncludes(
    xml,
    "<HtPumpWtrHeaterBmssStdPctCrAmt>1800</HtPumpWtrHeaterBmssStdPctCrAmt>",
  );
  assertStringIncludes(
    xml,
    "<EgyEffcntHmImprvCrAmt>3000</EgyEffcntHmImprvCrAmt>",
  );
});

Deno.test("Form 5695 emits panelboard relationship and qualified audit lines", () => {
  const xml = form5695.build({
    part_ii_section_b: {
      home_in_us: true,
      originally_placed_in_service: true,
      home_addresses: [filer.address],
      central_air_conditioner: { cost: 1_000, qmid: "A1B2" },
      panelboard: {
        cost: 2_000,
        qmids: ["C3D4"],
        enabled_property_type_codes: ["B"],
        meets_200_amp_and_nec: true,
        enabled_property_qualified: true,
        enabling_installed_year: 2025,
        enabled_installed_year: 2025,
      },
    },
    part_ii_energy_audit: {
      cost: 600,
      main_home_in_us: true,
      written_report: true,
      certified_auditor: true,
    },
    part_ii_tax_limit: 2_000,
  }, { filer });
  assertStringIncludes(
    xml,
    "<PanelboardCktFeederInd>true</PanelboardCktFeederInd>",
  );
  assertStringIncludes(xml, "<EnabledPropertyTypeCd>B</EnabledPropertyTypeCd>");
  assertStringIncludes(xml, "<QMID>C3D4</QMID>");
  assertStringIncludes(
    xml,
    "<PanelboardCktFeederStdPctCrAmt>600</PanelboardCktFeederStdPctCrAmt>",
  );
  assertStringIncludes(
    xml,
    "<MainHomeEgyAuditStdPctCrAmt>150</MainHomeEgyAuditStdPctCrAmt>",
  );
  assertStringIncludes(
    xml,
    "<EgyEffcntHmImprvCrAmt>1050</EgyEffcntHmImprvCrAmt>",
  );
});

Deno.test("Form 5695 rejects claims missing required facts or unsupported MeF details", () => {
  assertEquals(form5695.build({}), "");
  const solar = { solar_electric_cost: 100, part_i_tax_limit: 30 };
  assertThrows(() => form5695.build(solar), Error, "filer identity");
  assertThrows(() => form5695.build(solar, { filer }), Error, "home address");
  assertThrows(
    () =>
      form5695.build({
        ...solar,
        part_i_home_address: filer.address,
        part_i_tax_limit: undefined,
      }, { filer }),
    Error,
    "tax-liability limit",
  );
  assertThrows(
    () =>
      form5695.build({ windows_cost: 600, part_ii_tax_limit: 180 }, { filer }),
    Error,
    "QMID",
  );
  assertThrows(
    () =>
      form5695.build({
        fuel_cell_cost: 1000,
        fuel_cell_kw_capacity: 2,
        part_i_tax_limit: 300,
      }, { filer }),
    Error,
    "main-home-in-US",
  );
});
