import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { EnergyType } from "../../../../../nodes/inputs/credits/business/f8835/index.ts";
import { form8835 } from "./f8835.ts";

const facility = {
  energy_type: EnergyType.Wind,
  subject_to_passive_activity_limit: false,
  kwh_produced: 1_000_000,
  kwh_sold: 1_000_000,
  facility_description: "Onshore wind turbine",
  facility_us_address: {
    line1: "100 Wind Farm Rd",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  facility_latitude: 30.267153,
  facility_longitude: -97.743061,
  facility_owned_by_filer: true,
  ac_nameplate_kw: 1_500,
  maximum_net_output_mw: 1.5,
  facility_placed_in_service_date: "2024-01-01",
  facility_construction_start_date: "2023-06-01",
  production_period_start_date: "2025-01-01",
  production_period_end_date: "2025-12-31",
  increased_credit_reason: "none" as const,
  domestic_content_bonus: false,
  energy_community_bonus: false,
  is_fiscal_year: false,
};

const closedLoop = {
  ...facility,
  energy_type: EnergyType.BiomassClosed,
  facility_description: "Closed-loop biomass facility",
  closed_loop_biomass_source: {
    facility_description: "Closed-loop biomass facility",
    planting_record_reference: "crop-planting-2025",
    planted_exclusively_for_facility_verified: true as const,
    original_facility_not_cofired_verified: true as const,
    production_meter_record_reference: "meter-2025",
    metered_kwh_produced: 1_000_000,
    unrelated_sale_invoice_reference: "utility-invoice-2025",
    invoiced_kwh_sold: 1_000_000,
    unrelated_buyer_verified: true as const,
    no_investment_credit_election_verified: true as const,
    no_section1603_grant_verified: true as const,
  },
};

const solar = {
  ...facility,
  energy_type: EnergyType.Solar,
  facility_description: "Solar production facility",
  solar_dc_nameplate_kw: 1_800,
  solar_production_source: {
    facility_description: "Solar production facility",
    construction_record_reference: "solar-construction-2023",
    construction_began_on: "2023-06-01",
    production_meter_record_reference: "solar-meter-2025",
    meter_period_start_date: "2025-01-01",
    meter_period_end_date: "2025-12-31",
    metered_kwh_produced: 1_000_000,
    unrelated_sale_invoice_reference: "solar-utility-invoice-2025",
    unrelated_sale_invoice_date: "2025-12-31",
    invoiced_kwh_sold: 1_000_000,
    unrelated_buyer_verified: true as const,
    section48_energy_credit_not_claimed_verified: true as const,
  },
};

const openLoopSource = {
  facility_description: "Open-loop biomass plant",
  feedstock_record_reference: "cellulosic-feedstock-2025",
  solid_nonhazardous_cellulosic_waste_verified: true as const,
  original_facility_not_expanded_verified: true as const,
  filer_produced_electricity_verified: true as const,
  construction_record_reference: "cellulosic-construction-2023",
  construction_began_on: "2023-06-01",
  production_meter_record_reference: "cellulosic-meter-2025",
  meter_period_start_date: "2025-01-01",
  meter_period_end_date: "2025-12-31",
  metered_kwh_produced: 1_000_000,
  unrelated_sale_invoice_reference: "cellulosic-invoice-2025",
  unrelated_sale_invoice_date: "2025-12-31",
  invoiced_kwh_sold: 1_000_000,
  unrelated_buyer_verified: true as const,
};

Deno.test("Form 8835: sourced solar maps to native line 1d and DC capacity", () => {
  const xml = form8835.build({ f8835s: [solar] })[0];
  assertStringIncludes(
    xml,
    "<KwHrsPrdcdAndSoldSolarQty>1000000</KwHrsPrdcdAndSoldSolarQty>",
  );
  assertStringIncludes(
    xml,
    "<KwHrsPrdcdAndSoldSolarCrAmt>6000</KwHrsPrdcdAndSoldSolarCrAmt>",
  );
  assertStringIncludes(xml, 'dCSolarEnergyPropCapKWQty="1800"');
  assertStringIncludes(
    xml,
    "<TotalAllowedTaxCreditAmt>6000</TotalAllowedTaxCreditAmt>",
  );
  assertThrows(
    () =>
      form8835.build({
        f8835s: [{
          ...solar,
          solar_production_source: {
            ...solar.solar_production_source,
            invoiced_kwh_sold: 999_999,
          },
        }],
      }),
    Error,
    "matching kWh",
  );
});

Deno.test("Form 8835: sourced closed-loop biomass maps to native line 1b", () => {
  const xml = form8835.build({ f8835s: [closedLoop] })[0];
  assertStringIncludes(
    xml,
    "<KwHrsPrdcdSoldClsLoopBmssQty>1000000</KwHrsPrdcdSoldClsLoopBmssQty>",
  );
  assertStringIncludes(
    xml,
    "<KwHrsPrdcdSoldClsLoopBmssCrAmt>6000</KwHrsPrdcdSoldClsLoopBmssCrAmt>",
  );
  assertThrows(
    () =>
      form8835.build({
        f8835s: [{
          ...closedLoop,
          closed_loop_biomass_source: {
            ...closedLoop.closed_loop_biomass_source,
            metered_kwh_produced: 999_999,
          },
        }],
      }),
    Error,
    "matching kWh",
  );
});

Deno.test("Form 8835: one MeF document per facility with 2025 Part I/II fields", () => {
  const documents = form8835.build({
    f8835s: [facility, {
      ...facility,
      energy_type: EnergyType.BiomassOpen,
      facility_description: "Open-loop biomass plant",
      open_loop_cellulosic_source: openLoopSource,
      facility_us_address: {
        ...facility.facility_us_address,
        line1: "200 Biomass Plant Rd",
      },
      facility_latitude: 30.367153,
    }],
  });
  assertEquals(documents.length, 2);
  assertStringIncludes(
    documents[0],
    "<FacilityLatitudeNum>+30.267153</FacilityLatitudeNum>",
  );
  assertStringIncludes(
    documents[0],
    "<FacilityLongitudeNum>-097.743061</FacilityLongitudeNum>",
  );
  assertStringIncludes(
    documents[0],
    "<NANameplateCapacityDCInd>X</NANameplateCapacityDCInd>",
  );
  assertStringIncludes(
    documents[0],
    "<KwHrsPrdcdAndSoldWindCrAmt>6000</KwHrsPrdcdAndSoldWindCrAmt>",
  );
  assertStringIncludes(
    documents[0],
    "<TotalAllowedTaxCreditAmt>6000</TotalAllowedTaxCreditAmt>",
  );
  assertStringIncludes(
    documents[1],
    "<KwHrsPrdcdSoldOpenLopBmssCrAmt>3000</KwHrsPrdcdSoldOpenLopBmssCrAmt>",
  );
});

Deno.test("Form 8835: increased-credit and domestic-content PDFs must be bundled", () => {
  const increased = {
    ...facility,
    increased_credit_reason: "construction_before_2023_01_29" as const,
    facility_construction_start_date: "2022-06-01",
    increased_credit_statement_file_name: "Increase.pdf",
  };
  assertThrows(() => form8835.build({ f8835s: [increased] }));
  const xml = form8835.build({
    f8835s: [{
      ...increased,
      domestic_content_bonus: true,
      domestic_content_statement_file_name: "Domestic.pdf",
    }],
  }, {
    binaryAttachmentFileNames: ["Increase.pdf", "Domestic.pdf"],
    documentIdsByAttachmentFileName: { "Domestic.pdf": "BinaryAttachment2" },
  })[0];
  assertStringIncludes(
    xml,
    "<QualifiedFacilitiesIncrCrAmt>30000</QualifiedFacilitiesIncrCrAmt>",
  );
  assertStringIncludes(xml, 'referenceDocumentId="BinaryAttachment2"');
  assertStringIncludes(
    xml,
    "<DomesticContentBonusCreditAmt>3000</DomesticContentBonusCreditAmt>",
  );
});

Deno.test("Form 8835: PWA increase requires its separate Form 7220 PDF", () => {
  const item = {
    ...facility,
    increased_credit_reason: "prevailing_wage_and_apprenticeship" as const,
    meets_prevailing_wage: true,
    meets_apprenticeship: true,
    increased_credit_statement_file_name: "Increase.pdf",
  };
  assertThrows(() =>
    form8835.build({ f8835s: [item] }, {
      binaryAttachmentFileNames: ["Increase.pdf"],
    })
  );
});

Deno.test("Form 8835: incomplete facility identity and unsupported fiscal period stop export", () => {
  assertThrows(() =>
    form8835.build({
      f8835s: [{ ...facility, facility_us_address: undefined }],
    })
  );
  assertThrows(() =>
    form8835.build({
      f8835s: [{ ...facility, is_fiscal_year: true, phaseout_adjustment: 0 }],
    })
  );
  assertEquals(form8835.build({ f8835s: [] }), []);
});
