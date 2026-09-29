import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { EnergyType } from "../../../nodes/inputs/f8835/index.ts";
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
  ac_nameplate_kw: 900,
  facility_placed_in_service_date: "2023-01-01",
  facility_construction_start_date: "2022-12-01",
  production_period_start_date: "2025-01-01",
  production_period_end_date: "2025-12-31",
  increased_credit_reason: "none" as const,
  domestic_content_bonus: false,
  energy_community_bonus: false,
  is_fiscal_year: false,
};

Deno.test("Form 8835: one MeF document per facility with 2025 Part I/II fields", () => {
  const documents = form8835.build({
    f8835s: [facility, {
      ...facility,
      energy_type: EnergyType.BiomassOpen,
      facility_description: "Open-loop biomass plant",
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
    increased_credit_reason: "under_one_mw" as const,
    maximum_net_output_mw: 0.9,
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
