import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildMefXml } from "../builder.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import {
  type FilerIdentity,
  FilingStatus as MefFilingStatus,
} from "../types.ts";

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
  filingStatus: MefFilingStatus.Single,
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
        credit_kind: "new_clean_vehicle",
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

Deno.test({
  name:
    "XSD: mixed-use new clean vehicle links Form 8936 and Form 3800 line 1y",
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
      line16_income_tax: 10_000,
      line18_total_tax_before_credits: 10_000,
      line20_nonrefundable_credits: 7_500,
      line21_credits_total: 7_500,
    },
    schedule3: {
      line6a_total: 1_875,
      line6f_total: 5_625,
      line7_total: 7_500,
      line8_total: 7_500,
    },
    form6251: { line11_amt: 0, net_tmt: 0, must_file_for_credit: true },
    f3800: {
      f8936_new_vehicle_credit: {
        credit_amount: 1_875,
        subject_to_passive_activity_limit: false,
      },
      tax_context: {
        filingStatus: FilingStatus.Single,
        regularTax: 10_000,
        alternativeMinimumTax: 0,
        foreignTaxCredit: 0,
        priorAllowableCredits: 5_625,
        tentativeMinimumTax: 0,
        standardCredit: 1_875,
        specifiedCredit: 0,
      },
      allowed_credit: 1_875,
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
        credit_kind: "new_clean_vehicle",
        credit_amount: 7_500,
        msrp: 45_000,
        vehicle_type: "other",
        business_credit_subject_to_passive_activity_limit: false,
        business_use: {
          kind: "mileage",
          business_miles: 250,
          commuting_miles: 0,
          total_miles: 1_000,
          months_in_business_use: 12,
        },
      }],
    },
  }, filer);
  assertStringIncludes(xml, "<Form8936PartIICYCreditsGrp");
  assertStringIncludes(
    xml,
    "<BusinessInvestmentUseAmt>1875</BusinessInvestmentUseAmt>",
  );
  assertStringIncludes(
    xml,
    "<BusinessInvestmentUsePct>0.25000</BusinessInvestmentUsePct>",
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

Deno.test({
  name:
    "XSD: disqualified dealer transfer links Schedule 2 repayment to the parent Form 8936",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const xml = buildMefXml({
    f1040: {
      filing_status: "single",
      line9_total_income: 200_000,
      line11_agi: 200_000,
      line15_taxable_income: 200_000,
      line16_income_tax: 0,
      line17_additional_taxes: 7_500,
      line18_total_tax_before_credits: 7_500,
      line24_total_tax: 7_500,
    },
    schedule2: { line1b_new_clean_vehicle_repayment: 7_500 },
    f8936: {
      current_year_magi: { adjusted_gross_income: 200_000 },
      prior_year_magi: { adjusted_gross_income: 200_000 },
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
        transferred_to_dealer: true,
        transferred_amount: 7_500,
        resold_within_30_days: false,
        acquired_for_use_not_resale: true,
        credit_kind: "new_clean_vehicle",
        credit_amount: 7_500,
        msrp: 45_000,
        vehicle_type: "other",
      }],
    },
  }, filer);
  assertStringIncludes(xml, "<IRS8936 documentId=");
  assertStringIncludes(xml, "<IRS8936ScheduleA documentId=");
  assertStringIncludes(xml, '<CrTrnsfrDlrSaleAmt referenceDocumentId="IRS8936');
  assertStringIncludes(
    xml,
    'referenceDocumentName="IRS8936">7500</CrTrnsfrDlrSaleAmt>',
  );
  assertStringIncludes(
    xml,
    "<NotAllowedClaimClnVehCrInd>X</NotAllowedClaimClnVehCrInd>",
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
