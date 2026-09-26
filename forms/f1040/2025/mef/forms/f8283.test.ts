import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { SCENARIO_1040_02_FACTS } from "../../../e2e/ats/ty2025_cases.ts";
import {
  FMVMethod,
  SectionBPropertyType,
} from "../../../nodes/inputs/f8283/index.ts";
import { buildMefXml } from "../builder.ts";
import { testFiler } from "../test-filer.ts";
import { form8283 } from "./f8283.ts";

Deno.test("Form 8283 emits the sourced ATS Scenario 2 Section A donation", () => {
  const donation = SCENARIO_1040_02_FACTS.form8283;
  const xml = buildMefXml({
    f8283: {
      section_a_items: [{
        donee_organization_name: donation.donee,
        property_description: donation.propertyDescription,
        date_contributed: donation.donationDate,
        cost_or_adjusted_basis: donation.costBasis,
        fmv: donation.fairMarketValue,
      }],
    },
  }, testFiler());
  assertStringIncludes(xml, 'documentCnt="2"');
  assertStringIncludes(xml, '<IRS8283 documentId="IRS82831">');
  assertStringIncludes(xml, "<PropertyId>A</PropertyId>");
  assertStringIncludes(
    xml,
    "<DoneeOrganizationName><BusinessNameLine1Txt>Goodwill</BusinessNameLine1Txt></DoneeOrganizationName>",
  );
  assertStringIncludes(
    xml,
    "<DonatedPropertyDesc>Clothes and toys</DonatedPropertyDesc>",
  );
  assertStringIncludes(xml, "<ContributionDt>2025-11-13</ContributionDt>");
  assertStringIncludes(
    xml,
    "<DonorCostOrAdjustedBasisAmt>3470</DonorCostOrAdjustedBasisAmt>",
  );
  assertStringIncludes(xml, "<FairMarketValueAmt>700</FairMarketValueAmt>");
});

Deno.test("Form 8283 preserves multiple Section A rows and month-only acquisition dates", () => {
  const [xml] = form8283.build({
    section_a_items: [
      {
        property_description: "Furniture",
        date_acquired: "2022-05-19",
        date_contributed: "2025-06-03",
        donor_acquisition_description: "Purchase",
        fmv: 450,
        fmv_method: FMVMethod.ThriftShopValue,
      },
      {
        property_description: "Books",
        fmv: 125,
        fmv_method: FMVMethod.ComparableSales,
      },
    ],
  });
  assertStringIncludes(xml, "<PropertyId>A</PropertyId>");
  assertStringIncludes(xml, "<PropertyId>B</PropertyId>");
  assertStringIncludes(xml, "<DonorAcquiredDt>2022-05</DonorAcquiredDt>");
  assertStringIncludes(
    xml,
    "<FairMarketValueMethodDesc>Thrift shop value</FairMarketValueMethodDesc>",
  );
  assertStringIncludes(
    xml,
    "<FairMarketValueMethodDesc>Comparable sales</FairMarketValueMethodDesc>",
  );
});

Deno.test("Form 8283 Section A includes VIN for a vehicle claimed at $500 or less", () => {
  const [xml] = form8283.build({
    section_a_items: [{
      property_description: "2014 sedan, fair condition, 90,000 miles",
      fmv: 500,
      is_vehicle: true,
      vehicle_vin: "1HGBH41JXMN109186",
    }],
  });
  assertStringIncludes(
    xml,
    "<DonatedPropertyVehicleInd>X</DonatedPropertyVehicleInd>",
  );
  assertStringIncludes(xml, "<VIN>1HGBH41JXMN109186</VIN>");
});

Deno.test("Form 8283 Section B emits separate signed appraisal and donee documents", () => {
  const gift = {
    property_description: "Antique desk",
    property_type: SectionBPropertyType.Collectibles,
    physical_condition: "Good condition",
    date_acquired: "2018-05-15",
    donor_acquisition_description: "Purchase",
    date_contributed: "2025-08-21",
    fmv: 8_000,
    deduction_claimed: 8_000,
    cost_or_adjusted_basis: 2_500,
    qualified_appraisal: {
      appraiser_first_name: "Jane",
      appraiser_last_name: "Smith",
      signed_date: "2025-08-20",
      appraiser_ein: "123456789",
      signed_by_appraiser: true as const,
      us_address: {
        line1: "1 Art Way",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
    },
    donee_acknowledgment: {
      organization_name: "City Museum",
      ein: "987654321",
      received_date: "2025-08-21",
      signed_by_donee: true as const,
      unrelated_use: false,
      us_address: {
        line1: "2 Museum Way",
        city: "Austin",
        state: "TX",
        zip: "78702",
      },
    },
  };
  const docs = form8283.build({
    section_b_items: [gift, { ...gift, property_description: "Antique chair" }],
  });
  assertEquals(docs.length, 2);
  assertStringIncludes(docs[0], "<CollectiblesInd>X</CollectiblesInd>");
  assertStringIncludes(docs[0], "<DonorAcquiredDt>2018-05</DonorAcquiredDt>");
  assertStringIncludes(
    docs[0],
    "<DeductionClaimedAmt>8000</DeductionClaimedAmt>",
  );
  assertStringIncludes(
    docs[0],
    "<AppraiserSignedDt>2025-08-20</AppraiserSignedDt>",
  );
  assertStringIncludes(docs[0], "<DoneeEIN>987654321</DoneeEIN>");
  assertStringIncludes(docs[1], "Antique chair");
  assertThrows(
    () =>
      form8283.build({
        section_b_items: [{
          ...gift,
          property_type: SectionBPropertyType.ArtAtLeast20000,
          fmv: 25_000,
          deduction_claimed: 25_000,
        }],
      }),
    Error,
    "linked appraisal or vehicle acknowledgment attachment",
  );
});

Deno.test("Form 8283 Section B return validates against TY2025 IRS XSD", async () => {
  const xml = buildMefXml({
    f8283: {
      section_b_items: [{
        property_description: "Antique desk",
        property_type: SectionBPropertyType.Collectibles,
        physical_condition: "Good condition",
        date_acquired: "2018-05-15",
        donor_acquisition_description: "Purchase",
        date_contributed: "2025-08-21",
        fmv: 8_000,
        deduction_claimed: 8_000,
        cost_or_adjusted_basis: 2_500,
        qualified_appraisal: {
          appraiser_first_name: "Jane",
          appraiser_last_name: "Smith",
          signed_date: "2025-08-20",
          appraiser_ein: "123456789",
          signed_by_appraiser: true,
          us_address: {
            line1: "1 Art Way",
            city: "Austin",
            state: "TX",
            zip: "78701",
          },
        },
        donee_acknowledgment: {
          organization_name: "City Museum",
          ein: "987654321",
          received_date: "2025-08-21",
          signed_by_donee: true,
          unrelated_use: false,
          us_address: {
            line1: "2 Museum Way",
            city: "Austin",
            state: "TX",
            zip: "78702",
          },
        },
      }],
    },
  }, testFiler());
  const xsdPath = new URL(
    "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  try {
    await Deno.stat(xsdPath);
  } catch {
    return;
  }
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsdPath, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(path);
  }
});

Deno.test("Form 8283 still rejects gifts needing unlinked evidence", () => {
  assertThrows(
    () =>
      form8283.build({
        section_b_items: [{
          property_description: "Art",
          fmv: 6_000,
          deduction_claimed: 6_000,
        }],
      }),
    Error,
    "needs property, acquisition, qualified appraisal",
  );
  assertThrows(
    () =>
      form8283.build({
        section_a_items: [{
          property_description: "Car",
          fmv: 1_000,
          is_vehicle: true,
        }],
      }),
    Error,
    "claimed deduction",
  );
  assertEquals(form8283.build({}), []);
});

Deno.test("Form 8283 links the native donee vehicle-sale statement", async () => {
  const xml = buildMefXml({
    f8283: {
      section_a_items: [{
        property_description: "2020 Honda Civic, good condition, 60,000 miles",
        is_vehicle: true,
        vehicle_vin: "1HGBH41JXMN109186",
        date_contributed: "2025-06-01",
        fmv: 20_000,
        deduction_claimed: 15_000,
        vehicle_sale_acknowledgment: {
          copy_received_from_donee: true,
          donee_certified: true,
          donee_name: "City Charity",
          donee_ein: "987654321",
          donee_us_address: {
            line1: "1 Main St",
            city: "Austin",
            state: "TX",
            zip: "78701",
          },
          acknowledgment_received_date: "2025-07-15",
          sale_to_unrelated_party: true,
          sale_date: "2025-07-01",
          gross_proceeds: 15_000,
          vehicle_year: 2020,
          vehicle_make: "Honda",
          vehicle_model: "Civic",
          vehicle_condition: "Good condition",
          odometer_miles: 60_000,
          goods_or_services_received: false,
        },
      }],
    },
  }, testFiler());
  assertStringIncludes(xml, "<ContriVehicleBoatAirplaneStmt documentId=");
  const statementId = /<ContriVehicleBoatAirplaneStmt documentId="([^"]+)"/
    .exec(
      xml,
    )?.[1];
  assertEquals(typeof statementId, "string");
  assertStringIncludes(xml, `referenceDocumentId="${statementId}"`);
  assertStringIncludes(
    xml,
    'referenceDocumentName="ContributionsOfMotorVehiclesBoatsAndAirplanesStatement ContemporaneousWrittenAcknowledgmentStatement"',
  );
  assertStringIncludes(
    xml,
    "<GrossProceedsFromSaleOfVehAmt>15000</GrossProceedsFromSaleOfVehAmt>",
  );
  assertStringIncludes(xml, "<VIN>1HGBH41JXMN109186</VIN>");
  const xsdPath = new URL(
    "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  try {
    await Deno.stat(xsdPath);
  } catch {
    return;
  }
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsdPath, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(path);
  }
});
