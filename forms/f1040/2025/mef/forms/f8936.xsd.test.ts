import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildMefXml } from "../builder.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import type { FilerIdentity } from "../types.ts";

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

const filer: FilerIdentity = {
  primarySSN: "123456789",
  fullName: "Alex Taxpayer",
  nameLine1: "TAXPAYER ALEX",
  nameControl: "TAXP",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
  softwareId: "12345678",
  originator: { efin: "123456", originatorType: "ERO" },
};

Deno.test({
  name:
    "XSD: Form 8936 parent and Schedule A reconcile a liability-limited new credit",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const xml = buildMefXml({
    f1040: {
      filing_status: "single",
      line9_total_income: 50_000,
      line11_agi: 50_000,
      line15_taxable_income: 50_000,
      line16_income_tax: 5_000,
      line18_total_tax_before_credits: 5_000,
      line20_nonrefundable_credits: 5_000,
      line21_credits_total: 5_000,
    },
    schedule3: {
      line6f_total: 5_000,
      line7_total: 5_000,
      line8_total: 5_000,
    },
    f8936: {
      current_year_magi: { adjusted_gross_income: 50_000 },
      prior_year_magi: { adjusted_gross_income: 48_000 },
      filing_status: FilingStatus.Single,
      prior_year_filing_status: FilingStatus.Single,
      f8936s: [{
        vin: "1HGCM82633A004352",
        vehicle_year: 2025,
        vehicle_make: "Example",
        vehicle_model: "EV",
        placed_in_service_date: "2025-09-30",
        acquisition_date: "2025-09-30",
        seller_report_received: true,
        transferred_to_dealer: false,
        resold_within_30_days: false,
        acquired_for_use_not_resale: true,
        is_new_vehicle: true,
        credit_amount: 7_500,
        msrp: 45_000,
        vehicle_type: "other",
      }],
    },
  }, filer);
  assertStringIncludes(xml, "<IRS8936 documentId=");
  assertStringIncludes(xml, "<IRS8936ScheduleA documentId=");
  assertStringIncludes(
    xml,
    "<PrsnlUseNewCleanVehicleCrAmt>7500</PrsnlUseNewCleanVehicleCrAmt>",
  );
  assertStringIncludes(
    xml,
    "<CleanVehPrsnlUsePartCrAmt>5000</CleanVehPrsnlUsePartCrAmt>",
  );

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
