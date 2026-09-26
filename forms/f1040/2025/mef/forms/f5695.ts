import { element, elements } from "../../../mef/xml.ts";
import { FilingStatus } from "../../../mef/header.ts";
import {
  computeForm5695PartIAmounts,
  computeForm5695PartIIAmounts,
  type Form5695Input,
  inputSchema,
  sectionBQualifiedItems,
} from "../../../nodes/intermediate/forms/form5695/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";
import {
  additionalQmidLines,
  buildAdditionalQmidAttachment,
} from "./f5695_qmid_attachment.ts";

type Input = Partial<Form5695Input> & Record<string, unknown>;
type PartIIAmounts = ReturnType<typeof computeForm5695PartIIAmounts>;

const PART_II_COST_FIELDS = [
  "windows_cost",
  "exterior_doors_cost",
  "insulation_cost",
  "central_ac_cost",
  "gas_water_heater_cost",
  "furnace_boiler_cost",
  "panelboard_cost",
  "heat_pump_cost",
  "heat_pump_water_heater_cost",
  "biomass_cost",
  "energy_audit_cost",
] as const;

const PART_I_COST_FIELDS = [
  "solar_electric_cost",
  "solar_water_heater_cost",
  "small_wind_cost",
  "geothermal_cost",
  "battery_storage_cost",
] as const;

function amount(tag: string, value: number | undefined): string {
  return value === undefined ? "" : element(tag, value);
}

function sectionAChildren(
  input: Form5695Input,
  amounts: PartIIAmounts,
): string[] {
  const section = input.part_ii_section_a;
  if (!section) return [];
  const doors = [...(section.exterior_doors ?? [])].sort((a, b) =>
    b.cost - a.cost
  );
  const windows = [...(section.windows ?? [])].sort((a, b) => b.cost - a.cost);
  const firstDoor = doors[0];
  const nextDoors = doors.slice(1, 3);
  const nextDoorCost = nextDoors.reduce(
    (sum, item) => sum + item.cost,
    0,
  );
  const otherDoorCost = doors.slice(3).reduce(
    (sum, item) => sum + item.cost,
    0,
  );
  const firstWindowCost = windows.slice(0, 4).reduce(
    (sum, item) => sum + item.cost,
    0,
  );
  const otherWindowCost = windows.slice(4).reduce(
    (sum, item) => sum + item.cost,
    0,
  );
  const windowCost = firstWindowCost + otherWindowCost;
  const address = section.home_address;
  const doorXml = firstDoor
    ? elements("ExteriorDoorEgyStarRqrGrp", [
      element("MostExpnsExtrDoorCostAmt", firstDoor.cost),
      element("MostExpnsExtrDoorQMID", firstDoor.qmid),
      element(
        "MostExpnsExtrDoorsStdPctCrAmt",
        amounts.firstDoorCredit,
      ),
      doors.length > 1
        ? elements("OthExteriorDoorEgyStarRqrGrp", [
          ...nextDoors.map((door) =>
            elements("NextMostExpnsExtrDoorGrp", [
              element("QMID", door.qmid),
              element("CostAmt", door.cost),
            ])
          ),
          element("NextMostExpnsExtrDoorCostAmt", nextDoorCost),
          otherDoorCost > 0
            ? element("OtherQlfyExtrDoorsCostAmt", otherDoorCost)
            : "",
          element(
            "TotalOtherQlfyExtrDoorsCostAmt",
            nextDoorCost + otherDoorCost,
          ),
          element(
            "OtherQlfyExtrDoorsStdPctCrAmt",
            Math.round((nextDoorCost + otherDoorCost) * 0.30),
          ),
        ])
        : "",
      element("TotalExtrDoorsCreditAmt", amounts.doorsCredit),
    ])
    : "";
  const windowXml = windows.length > 0
    ? elements("ExtrWndwSkyltEgyStarRqrGrp", [
      ...windows.slice(0, 4).map((window) =>
        elements("MostExpnsExtrWndwSkyltGrp", [
          element("QMID", window.qmid),
          element("CostAmt", window.cost),
        ])
      ),
      element("MostExpnsExtrWndwSkyltCostAmt", firstWindowCost),
      otherWindowCost > 0
        ? element("OthQlfyExtrWndwSkyltCostAmt", otherWindowCost)
        : "",
      element("ExteriorWndwOrSkylightCostAmt", windowCost),
      element("ExtrWndwSkylightStdPctCrAmt", amounts.windowsCredit),
    ])
    : "";
  return [
    element("HomeLocatedInUSAInd", String(section.main_home_in_us)),
    element("OriginalUserInd", String(section.original_user)),
    element("FiveYearUseExpectationInd", String(section.five_year_use)),
    elements("HomeAddress", [
      element("AddressLine1Txt", address.line1),
      address.line2 ? element("AddressLine2Txt", address.line2) : "",
      element("CityNm", address.city),
      element("StateAbbreviationCd", address.state),
      element("ZIPCd", address.zip),
    ]),
    element("ImprvRltdToConstMainHomeInd", String(section.related_to_new_home)),
    amount("InsulationOrSysHtGnLossCostAmt", section.insulation_cost),
    section.insulation_cost === undefined
      ? ""
      : element("InsulationOrSysHtStdPctCrAmt", amounts.insulationCredit),
    doorXml,
    windowXml,
  ];
}

function qmidCostGroup(
  tag: string,
  item: { cost: number; qmid: string },
): string {
  return elements(tag, [
    element("QMID", item.qmid),
    element("CostAmt", item.cost),
  ]);
}

function sectionBChildren(
  input: Form5695Input,
  amounts: PartIIAmounts,
): string[] {
  const section = input.part_ii_section_b;
  if (!section) return [];
  const qualified = sectionBQualifiedItems(section);
  const ac = qualified.centralAirConditioners[0];
  const acOtherCost = qualified.centralAirConditioners.slice(1).reduce(
    (sum, item) => sum + item.cost,
    0,
  );
  const heaters = qualified.waterHeaters;
  const firstHeatersCost = heaters.slice(0, 2).reduce(
    (sum, item) => sum + item.cost,
    0,
  );
  const otherHeatersCost = heaters.slice(2).reduce(
    (sum, item) => sum + item.cost,
    0,
  );
  const heaterCost = heaters.reduce((sum, item) => sum + item.cost, 0);
  const furnace = qualified.furnacesOrBoilers[0];
  const otherFurnaceCost = qualified.furnacesOrBoilers.slice(1).reduce(
    (sum, item) => sum + item.cost,
    0,
  );
  const panelboard = section.panelboard;
  return [
    element("QlfyEnergyPropCostsUSHomeInd", String(section.home_in_us)),
    element(
      "OriginallyPlacedInServiceInd",
      String(section.originally_placed_in_service),
    ),
    ...section.home_addresses.map((address) =>
      elements("QualifiedEnergyPropertyAddress", [
        element("AddressLine1Txt", address.line1),
        address.line2 ? element("AddressLine2Txt", address.line2) : "",
        element("CityNm", address.city),
        element("StateAbbreviationCd", address.state),
        element("ZIPCd", address.zip),
      ])
    ),
    ac
      ? elements("CentralAirConditionerGrp", [
        element("MostExpnsCentralAirCondQMID", ac.qmid),
        element("MostExpnsCentralAirCondCostAmt", ac.cost),
        acOtherCost > 0 ? element("OthCentralAirCondCostAmt", acOtherCost) : "",
        element("CentralAirCondCostAmt", ac.cost + acOtherCost),
        element("CentralAirCondCostStdPctCrAmt", amounts.centralAirCredit),
      ])
      : "",
    heaters.length > 0
      ? elements("WaterHeaterGrp", [
        ...heaters.slice(0, 2).map((item) =>
          qmidCostGroup("MostExpnsWaterHtrGrp", item)
        ),
        element("MostExpnsWaterHtCostAmt", firstHeatersCost),
        otherHeatersCost > 0
          ? element("OthNatGasPrpnOilWtrHtrCostAmt", otherHeatersCost)
          : "",
        element("NatGasPrpnOilWtrHtrCostAmt", heaterCost),
        element("NatGasPrpnOilWtrHtrStdPctCrAmt", amounts.waterHeaterCredit),
      ])
      : "",
    furnace
      ? elements("FrncHotWtrBlrGrp", [
        element("MostExpnsFrncHotWtrBlrQMID", furnace.qmid),
        element("MostExpnsFrncHotWtrBlrCostAmt", furnace.cost),
        otherFurnaceCost > 0
          ? element("OthFrncHotWtrBlrCostAmt", otherFurnaceCost)
          : "",
        element(
          "NatGasPrpnOilHotWtrBlrCostAmt",
          furnace.cost + otherFurnaceCost,
        ),
        element("NatGasPrpnOilHotWtrBlrPctAmt", amounts.furnaceCredit),
      ])
      : "",
    panelboard ? element("PanelboardCktFeederInd", "true") : "",
    panelboard
      ? elements("EnablingPropertyGrp", [
        ...panelboard.enabled_property_type_codes.map((code) =>
          element("EnabledPropertyTypeCd", code)
        ),
        element("PanelboardCktFeederCostAmt", panelboard.cost),
        ...panelboard.qmids.map((qmid) => element("QMID", qmid)),
        element("PanelboardCktFeederStdPctCrAmt", amounts.panelboardCredit),
      ])
      : "",
  ];
}

function heatPumpBiomassGroup(
  input: Form5695Input,
  amounts: PartIIAmounts,
): string {
  const section = input.part_ii_section_b;
  if (!section) return "";
  const qualified = sectionBQualifiedItems(section);
  const hp = qualified.heatPumps[0];
  const hwh = qualified.heatPumpWaterHeaters[0];
  const biomass = qualified.biomassStovesOrBoilers[0];
  if (!hp && !hwh && !biomass) return "";
  const otherHpCost = qualified.heatPumps.slice(1).reduce(
    (sum, item) => sum + item.cost,
    0,
  );
  const otherHwhCost = qualified.heatPumpWaterHeaters.slice(1).reduce(
    (sum, item) => sum + item.cost,
    0,
  );
  const otherBiomassCost = qualified.biomassStovesOrBoilers.slice(1).reduce(
    (sum, item) => sum + item.cost,
    0,
  );
  const cost = [
    ...qualified.heatPumps,
    ...qualified.heatPumpWaterHeaters,
    ...qualified.biomassStovesOrBoilers,
  ].reduce((sum, item) => sum + item.cost, 0);
  return elements("HtPumpWtrHeaterBmssStoveBlrGrp", [
    hp ? qmidCostGroup("MostExpnsElecGasHtPumpGrp", hp) : "",
    otherHpCost > 0 ? element("OthElecGasHtPumpCostAmt", otherHpCost) : "",
    hwh ? qmidCostGroup("MostExpnsHtPumpWtrHtrGrp", hwh) : "",
    otherHwhCost > 0
      ? element("OthElecGasHtPumpWtrHtCostAmt", otherHwhCost)
      : "",
    biomass ? qmidCostGroup("MostExpnsBmssStoveBlrGrp", biomass) : "",
    otherBiomassCost > 0
      ? element("OthBmssStoveBlrCostAmt", otherBiomassCost)
      : "",
    element("HtPumpWtrHeaterBmssCostAmt", cost),
    element("HtPumpWtrHeaterBmssStdPctCrAmt", amounts.heatPumpBiomass),
  ]);
}

function buildIRS5695(fields: Input, context: MefBuildContext): string {
  if (Object.keys(fields).length === 0) return "";
  const input = inputSchema.parse(fields);
  if (
    additionalQmidLines(input).length > 0 &&
    !context.binaryAttachmentFileNames?.includes("AdditionalQMIDStatement.pdf")
  ) {
    throw new Error(
      "Form 5695 extra QMID items require an AdditionalQMIDStatement.pdf bundle attachment",
    );
  }
  if (PART_II_COST_FIELDS.some((key) => (input[key] ?? 0) > 0)) {
    throw new Error(
      "Form 5695 Part II MeF needs item-level eligibility and QMID facts",
    );
  }
  const hasFuelCell = (input.fuel_cell_cost ?? 0) > 0;
  const currentYearCost = PART_I_COST_FIELDS.some((key) =>
    (input[key] ?? 0) > 0
  );
  const hasPartI = currentYearCost || hasFuelCell ||
    (input.prior_year_carryforward ?? 0) > 0;
  const sectionA = input.part_ii_section_a;
  const hasSectionA = !!sectionA && (
    (sectionA.insulation_cost ?? 0) > 0 ||
    (sectionA.exterior_doors?.length ?? 0) > 0 ||
    (sectionA.windows?.length ?? 0) > 0
  );
  const sectionB = input.part_ii_section_b;
  const qualifiedB = sectionBQualifiedItems(sectionB);
  const hasSectionB = !!sectionB && (
    qualifiedB.centralAirConditioners.length > 0 ||
    qualifiedB.waterHeaters.length > 0 ||
    qualifiedB.furnacesOrBoilers.length > 0 ||
    !!sectionB.panelboard ||
    qualifiedB.heatPumps.length > 0 ||
    qualifiedB.heatPumpWaterHeaters.length > 0 ||
    qualifiedB.biomassStovesOrBoilers.length > 0
  );
  const hasAudit = !!input.part_ii_energy_audit;
  if (!hasPartI && !hasSectionA && !hasSectionB && !hasAudit) return "";

  const filer = context.filer;
  if (!filer?.fullName) throw new Error("Form 5695 needs filer identity");
  if (
    (input.fuel_cell_joint_occupancy || input.part_ii_joint_occupancy) &&
    filer.filingStatus === FilingStatus.MarriedFilingJointly
  ) {
    throw new Error(
      "Form 5695 fuel-cell joint-occupancy allocation does not apply to a joint return",
    );
  }
  const amounts = computeForm5695PartIAmounts(input);
  const jointOccupancyDocumentIds =
    context.documentIdsByPendingKey?.joint_occupancy_statement ?? [];
  if (
    input.fuel_cell_joint_occupancy &&
    context.documentIdsByPendingKey &&
    jointOccupancyDocumentIds.length === 0
  ) {
    throw new Error("Form 5695 joint occupancy needs its statement document");
  }
  if (amounts.available === 0 && !hasSectionA && !hasSectionB && !hasAudit) {
    return "";
  }
  if (currentYearCost && !input.part_i_home_address) {
    throw new Error("Form 5695 Part I needs the clean-energy home address");
  }
  const address = input.part_i_home_address;
  const addressXml = address
    ? elements("ResidentialCleanEgyHomeAddress", [
      element("AddressLine1Txt", address.line1),
      address.line2 ? element("AddressLine2Txt", address.line2) : "",
      element("CityNm", address.city),
      element("StateAbbreviationCd", address.state),
      element("ZIPCd", address.zip),
    ])
    : "";
  const fuelCellAddress = input.fuel_cell_home_address;
  const fuelCellAddressXml = fuelCellAddress
    ? elements("QlfyFuelCellPropertyHmAddress", [
      element("AddressLine1Txt", fuelCellAddress.line1),
      fuelCellAddress.line2
        ? element("AddressLine2Txt", fuelCellAddress.line2)
        : "",
      element("CityNm", fuelCellAddress.city),
      element("StateAbbreviationCd", fuelCellAddress.state),
      element("ZIPCd", fuelCellAddress.zip),
    ])
    : "";
  const partII = hasSectionA || hasSectionB || hasAudit
    ? computeForm5695PartIIAmounts(input)
    : null;
  const partIIGroup = partII
    ? elements("EgyEffcntHmImprvCrGrp", [
      ...sectionAChildren(input, partII),
      ...sectionBChildren(input, partII),
      hasAudit ? element("MainHomeEgyAuditCostInd", "true") : "",
      hasAudit
        ? element("MainHomeEgyAuditCostAmt", input.part_ii_energy_audit!.cost)
        : "",
      hasAudit
        ? element("MainHomeEgyAuditStdPctCrAmt", partII.auditCredit)
        : "",
      element("EgyEffcntImprvCreditSubtlAmt", partII.standardSubtotal),
      element("EnergyEffcntImprvAllwblCostAmt", partII.cappedStandard),
      heatPumpBiomassGroup(input, partII),
      element("AdjustedCreditLimitAmt", partII.available),
      element("TaxesLessCreditsAmt", input.part_ii_tax_limit!),
      element("EgyEffcntHmImprvCrAmt", partII.allowed),
      input.part_ii_joint_occupancy
        ? element(
          "JointOccupancyInd",
          "X",
          jointOccupancyDocumentIds.length > 0
            ? {
              referenceDocumentId: jointOccupancyDocumentIds.join(" "),
              referenceDocumentName: "JointOccupancyStatement",
            }
            : undefined,
        )
        : "",
    ])
    : "";

  return elements("IRS5695", [
    element("NameLine1Txt", filer.fullName),
    element("SSN", filer.primarySSN.replace(/\D/g, "")),
    amounts.available > 0
      ? elements("ResidentialCleanEnergyCrGrp", [
        addressXml,
        amount("SolarElecPropCostAmt", input.solar_electric_cost),
        amount("SolarWaterHtPropCostAmt", input.solar_water_heater_cost),
        amount("SmallWindPropCostAmt", input.small_wind_cost),
        amount("GeothrmlHtPumpPropCostAmt", input.geothermal_cost),
        input.battery_storage_cost === undefined ? "" : element(
          "QlfyBatteryStorageTechInd",
          String(amounts.batteryCost > 0),
        ),
        amounts.batteryCost > 0
          ? element("QlfyBatteryStorageTechCostsAmt", amounts.batteryCost)
          : "",
        currentYearCost
          ? element("TotalEnergyCreditsAmt", amounts.otherCost)
          : "",
        currentYearCost
          ? element("TotalEnergyCreditsStdPctCrAmt", amounts.otherCredit)
          : "",
        hasFuelCell ? element("QlfyFuelCellPropertyInUSInd", "true") : "",
        hasFuelCell ? fuelCellAddressXml : "",
        input.fuel_cell_joint_occupancy
          ? element(
            "JointOccupancyInd",
            "X",
            jointOccupancyDocumentIds.length > 0
              ? {
                referenceDocumentId: jointOccupancyDocumentIds.join(" "),
                referenceDocumentName: "JointOccupancyStatement",
              }
              : undefined,
          )
          : "",
        hasFuelCell ? element("FuelCellPropCostAmt", amounts.fuelCellCost) : "",
        hasFuelCell
          ? element("FuelCellPropStdPctCrAmt", amounts.fuelCellStandardCredit)
          : "",
        hasFuelCell
          ? element("FuelCellPropKWCapNum", String(input.fuel_cell_kw_capacity))
          : "",
        hasFuelCell
          ? element("FuelCellPropKWCapAmt", amounts.fuelCellCapacityLimit)
          : "",
        hasFuelCell
          ? element("FuelCellPropAllwblCostAmt", amounts.fuelCellCredit)
          : "",
        amount("PYCfwdRsdntlCleanEnergyCrAmt", input.prior_year_carryforward),
        element("TotalOfEnergyCreditsAmt", amounts.available),
        element("TaxLessCreditsAmt", input.part_i_tax_limit!),
        element("ResidentialCleanEnergyCrAmt", amounts.allowed),
        amounts.carryforwardToNextYear > 0
          ? element(
            "CfwdRsdntlCleanEnergyCrAmt",
            amounts.carryforwardToNextYear,
          )
          : "",
      ])
      : "",
    partIIGroup,
  ]);
}

export const form5695: MefFormDescriptor<"form5695", Input> = {
  pendingKey: "form5695",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f5695.pdf",
  build(fields, context = {}) {
    return buildIRS5695(fields, context);
  },
  async buildBinaryAttachments(fields, context = {}) {
    const attachment = await buildAdditionalQmidAttachment(
      inputSchema.parse(fields),
      context.filer,
    );
    return attachment ? [attachment] : [];
  },
};
