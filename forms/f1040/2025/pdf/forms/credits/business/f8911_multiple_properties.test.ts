import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { pdfReviewFixtures } from "../../../review-fixtures.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import {
  computePersonalCreditAmounts,
  inputSchema,
} from "../../../../../nodes/inputs/credits/business/f8911/index.ts";
import { form8911Pdf } from "./f8911.ts";
import { form8911ScheduleAPdf } from "./f8911_schedule_a.ts";

const fixture = pdfReviewFixtures.find((entry) =>
  entry.id === "single-personal-home-charger-credit"
)!;
const original = inputSchema.parse(fixture.inputs.f8911);
const property = {
  cost: 5000,
  business_use_pct: original.business_use_pct,
  fuel_type: original.fuel_type,
  property_description: "Garage charger",
  property_us_address: original.property_us_address,
  construction_began: original.construction_began,
  placed_in_service: original.placed_in_service,
  eligible_census_tract: original.eligible_census_tract,
  census_tract_geoid: original.census_tract_geoid,
  main_home_property: original.main_home_property,
};
export const multipleChargerSource = {
  properties: [
    { ...property, property_reference: "garage-unit-invoice-001" },
    {
      ...property,
      property_reference: "driveway-unit-invoice-002",
      property_description: "Driveway charger",
      cost: 1000,
    },
  ],
  regular_tax_before_credits: original.regular_tax_before_credits,
  tentative_minimum_tax: original.tentative_minimum_tax,
};

Deno.test("Form 8911 caps each identified property before applying one return tax limit", () => {
  const amounts = computePersonalCreditAmounts(multipleChargerSource)!;
  assertEquals(amounts.tentativeCredit, 1300);
  assertEquals(amounts.allowedCredit, 1300);
  const limited = computePersonalCreditAmounts({
    ...multipleChargerSource,
    regular_tax_before_credits: 1100,
  })!;
  assertEquals(limited.tentativeCredit, 1300);
  assertEquals(limited.allowedCredit, 1100);
});

Deno.test("Form 8911 rejects duplicate references and ambiguous single/multiple source shapes", () => {
  assertThrows(
    () => inputSchema.parse({ ...multipleChargerSource, cost: 6000 }),
    Error,
    "cannot mix",
  );
  assertThrows(
    () =>
      inputSchema.parse({
        ...multipleChargerSource,
        properties: [
          multipleChargerSource.properties[0],
          multipleChargerSource.properties[0],
        ],
      }),
    Error,
    "must be unique",
  );
  assertThrows(() =>
    inputSchema.parse({ ...multipleChargerSource, properties: [] })
  );
  assertThrows(
    () =>
      computePersonalCreditAmounts({
        ...multipleChargerSource,
        properties: [multipleChargerSource.properties[0], {
          ...multipleChargerSource.properties[1],
          main_home_property: false,
        }],
      }),
    Error,
    "main home",
  );
});

Deno.test("Form 8911 public return joins two native property copies to one parent and matching PDF copies", async () => {
  const inputs = { ...fixture.inputs, f8911: multipleChargerSource };
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  const pending = result.pending;
  assertEquals(pending.schedule3.line6j_alt_fuel_vehicle_refueling, 1300);
  assertEquals(pending.f1040.line20_nonrefundable_credits, 1300);
  assertEquals(pending.f1040.line24_total_tax, 2575);
  const bundle = await buildMefBundle(pending, {
    filer: fixture.filer,
    attachments: [],
  });
  assertEquals(
    (bundle.xml.match(/<IRS8911ScheduleA documentId=/g) ?? []).length,
    2,
  );
  assertStringIncludes(
    bundle.xml,
    "<TotQlfyAltFuelVehRefuelPropCnt>2</TotQlfyAltFuelVehRefuelPropCnt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<PrsnlUseRefuelingPropCrAmt>1300</PrsnlUseRefuelingPropCrAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<FacilityDesc>Garage charger</FacilityDesc>",
  );
  assertStringIncludes(
    bundle.xml,
    "<FacilityDesc>Driveway charger</FacilityDesc>",
  );
  const ids = [
    ...bundle.xml.matchAll(/<IRS8911ScheduleA documentId="([^"]+)"/g),
  ].map((match) => match[1]);
  assertEquals(new Set(ids).size, 2);
  const [parent] = form8911Pdf.instances!({}, fixture.filer, pending);
  const properties = form8911ScheduleAPdf.instances!(
    {},
    fixture.filer,
    pending,
  );
  assertEquals(parent.property_count, 2);
  assertEquals(parent.line4, 1300);
  assertEquals(parent.line10, 1300);
  assertEquals(
    properties.map((
      copy,
    ) => [copy.property_description, copy.line8, copy.line21]),
    [["Garage charger", 5000, 1000], ["Driveway charger", 1000, 300]],
  );
  assertThrows(
    () =>
      form8911Pdf.instances!({}, fixture.filer, {
        ...pending,
        schedule3: {
          ...pending.schedule3,
          line6j_alt_fuel_vehicle_refueling: 1299,
        },
      }),
    Error,
    "disagrees",
  );
});

Deno.test("Form 8911 combined property credit is limited once by the public return tax", async () => {
  const source = {
    ...multipleChargerSource,
    properties: [1, 2, 3, 4].map((number) => ({
      ...property,
      property_reference: `unit-invoice-${number}`,
      property_description: `Home charger ${number}`,
    })),
  };
  const result = f1040_2025.executeReturn({ ...fixture.inputs, f8911: source });
  assertEquals(result.diagnostics, []);
  const pending = result.pending;
  assertEquals(pending.schedule3.line6j_alt_fuel_vehicle_refueling, 3875);
  assertEquals(pending.f1040.line20_nonrefundable_credits, 3875);
  assertEquals(pending.f1040.line24_total_tax, 0);
  const bundle = await buildMefBundle(pending, {
    filer: fixture.filer,
    attachments: [],
  });
  assertEquals(
    (bundle.xml.match(/<IRS8911ScheduleA documentId=/g) ?? []).length,
    4,
  );
  assertStringIncludes(
    bundle.xml,
    "<TotQlfyAltFuelVehRefuelPropCnt>4</TotQlfyAltFuelVehRefuelPropCnt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<PrsnlUseRefuelingPropCrAmt>4000</PrsnlUseRefuelingPropCrAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<TotalPersonalUsePartOfCrAmt>3875</TotalPersonalUsePartOfCrAmt>",
  );
  const [parent] = form8911Pdf.instances!({}, fixture.filer, pending);
  const copies = form8911ScheduleAPdf.instances!({}, fixture.filer, pending);
  assertEquals([parent.property_count, parent.line4, parent.line10], [
    4,
    4000,
    3875,
  ]);
  assertEquals(copies.map((copy) => copy.line21), [1000, 1000, 1000, 1000]);
});

Deno.test("Form 8911 retains property cost cents until native and PDF filing amounts", async () => {
  const source = {
    ...multipleChargerSource,
    properties: multipleChargerSource.properties.map((item) => ({
      ...item,
      cost: 1001.49,
    })),
  };
  const result = f1040_2025.executeReturn({ ...fixture.inputs, f8911: source });
  assertEquals(result.diagnostics, []);
  const pending = result.pending;
  assertEquals(pending.schedule3.line6j_alt_fuel_vehicle_refueling, 601);
  assertEquals(pending.f1040.line20_nonrefundable_credits, 601);
  assertEquals(pending.f1040.line24_total_tax, 3274);
  const bundle = await buildMefBundle(pending, {
    filer: fixture.filer,
    attachments: [],
  });
  assertStringIncludes(
    bundle.xml,
    "<PrsnlUseRefuelingPropCrAmt>601</PrsnlUseRefuelingPropCrAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<TotalPersonalUsePartOfCrAmt>601</TotalPersonalUsePartOfCrAmt>",
  );
  assertEquals(
    (bundle.xml.match(
      /<TotalPersonalUsePartOfCrAmt>300<\/TotalPersonalUsePartOfCrAmt>/g,
    ) ?? []).length,
    2,
  );
  const [parent] = form8911Pdf.instances!({}, fixture.filer, pending);
  const copies = form8911ScheduleAPdf.instances!({}, fixture.filer, pending);
  // Preserve cents while adding; the shared renderer rounds the entered lines.
  assertEquals([parent.line4, parent.line10], [601, 601]);
  assertEquals(copies.map((copy) => [copy.line8, copy.line19, copy.line21]), [[
    1001.49,
    300.447,
    300.447,
  ], [1001.49, 300.447, 300.447]]);
});

Deno.test("Form 8911 retains each supplied permit on its own native and PDF property copy", async () => {
  const permits = ["TX-EV-2025-00000000000001", "TX-EV-2025-002"];
  const source = {
    ...multipleChargerSource,
    properties: multipleChargerSource.properties.map((item, index) => ({
      ...item,
      certification_permit_number: permits[index],
    })),
  };
  const result = f1040_2025.executeReturn({ ...fixture.inputs, f8911: source });
  assertEquals(result.diagnostics, []);
  const pending = result.pending;
  const bundle = await buildMefBundle(pending, {
    filer: fixture.filer,
    attachments: [],
  });
  const copies = [
    ...bundle.xml.matchAll(/<IRS8911ScheduleA\b[\s\S]*?<\/IRS8911ScheduleA>/g),
  ].map((match) => match[0]);
  assertEquals(copies.length, 2);
  for (const [index, xml] of copies.entries()) {
    assertStringIncludes(
      xml,
      `<CertificationOrPermitNum>${permits[index]}</CertificationOrPermitNum>`,
    );
    assertEquals(xml.includes(permits[1 - index]), false);
  }
  const pages = form8911ScheduleAPdf.instances!({}, fixture.filer, pending);
  assertEquals(pages.map((page) => page.certification_permit_number), permits);
  assertEquals(pending.f1040.line20_nonrefundable_credits, 1300);
  assertEquals(pending.f1040.line24_total_tax, 2575);
});

Deno.test("Form 8911 optional permit validates the IRS 25-character limit without inventing one", () => {
  assertEquals(
    inputSchema.parse(original).certification_permit_number,
    undefined,
  );
  assertEquals(
    inputSchema.parse({
      ...original,
      certification_permit_number: "P".repeat(25),
    }).certification_permit_number,
    "P".repeat(25),
  );
  assertThrows(() =>
    inputSchema.parse({
      ...original,
      certification_permit_number: "P".repeat(26),
    })
  );
  assertThrows(() =>
    inputSchema.parse({ ...original, certification_permit_number: "   " })
  );
});
