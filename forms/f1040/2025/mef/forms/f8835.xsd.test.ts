import { assertEquals, assertStringIncludes } from "@std/assert";
import { EnergyType } from "../../../nodes/inputs/f8835/index.ts";
import { buildMefXml } from "../builder.ts";
import { testFiler } from "../test-filer.ts";

const XSD_PATH = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

let xsdAvailable = false;
try {
  Deno.statSync(XSD_PATH);
  xsdAvailable = true;
} catch {
  // The IRS schema bundle is local-only.
}

Deno.test({
  name:
    "XSD: two 2025 Form 8835 facility documents follow ReturnData1040 order",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
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
  const xml = buildMefXml({
    f1040: {
      filing_status: "single",
      line9_total_income: 50_000,
      line11_agi: 50_000,
      line15_taxable_income: 50_000,
      line16_income_tax: 5_000,
      line18_total_tax_before_credits: 5_000,
    },
    f8835: {
      f8835s: [facility, {
        ...facility,
        energy_type: EnergyType.BiomassOpen,
        facility_description: "Biomass plant",
        facility_us_address: {
          ...facility.facility_us_address,
          line1: "200 Biomass Plant Rd",
        },
        facility_latitude: 30.367153,
      }],
    },
  }, testFiler());
  assertStringIncludes(xml, "<IRS8835 documentId=");
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const result = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", XSD_PATH, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
  } finally {
    await Deno.remove(path);
  }
});
