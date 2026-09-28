import { assertEquals, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../../../mef/header.ts";
import {
  type F8911Input,
  FuelType,
} from "../../../nodes/inputs/f8911/index.ts";
import { form8911Pdf } from "./f8911.ts";
import { form8911ScheduleAPdf } from "./f8911_schedule_a.ts";
import { ALL_PDF_FORMS } from "./index.ts";

const filer: FilerIdentity = {
  primarySSN: "123456789",
  nameLine1: "Alex Charger",
  nameControl: "CHAR",
  address: {
    line1: "1 Main St",
    city: "Wilmington",
    state: "DE",
    zip: "19801",
  },
  filingStatus: FilingStatus.Single,
};

function source(): F8911Input {
  return {
    cost: 1_000,
    business_use_pct: 0,
    fuel_type: FuelType.ElectricCharging,
    property_description: "Home EV charger",
    property_us_address: {
      line1: "1 Main St",
      city: "Wilmington",
      state: "DE",
      zip: "19801",
    },
    construction_began: "2025-05-01",
    placed_in_service: "2025-06-01",
    eligible_census_tract: true,
    census_tract_geoid: "10003000100",
    main_home_property: true,
    regular_tax_before_credits: 400,
    foreign_tax_credit: 0,
    tentative_minimum_tax: 0,
  };
}

function pending(
  input: F8911Input = source(),
): Record<string, Record<string, unknown>> {
  return {
    f8911: { ...input },
    f1040: {
      line16_income_tax: 400,
      credit_limit_form6251_line9: 0,
      line20_nonrefundable_credits: 300,
    },
    form6251: { net_tmt: 0 },
    schedule3: { line6j_alt_fuel_vehicle_refueling: 300 },
  };
}

function parent(allPending: Record<string, Record<string, unknown>>) {
  return form8911Pdf.instances?.({}, filer, allPending)?.[0];
}

function scheduleA(allPending: Record<string, Record<string, unknown>>) {
  return form8911ScheduleAPdf.instances?.({}, filer, allPending)?.[0];
}

Deno.test("Form 8911 PDF pairs one sourced personal property with Schedule A", () => {
  const allPending = pending();
  const main = parent(allPending);
  const property = scheduleA(allPending);
  assertEquals(main?.property_count, 1);
  assertEquals(main?.line4, 300);
  assertEquals(main?.line5, 400);
  assertEquals(main?.line10, 300);
  assertEquals(property?.property_description, "Home EV charger");
  assertEquals(property?.property_address, "1 Main St, Wilmington, DE 19801");
  assertEquals(property?.construction_date, "05/01/2025");
  assertEquals(property?.service_date, "06/01/2025");
  assertEquals(property?.line8, 1_000);
  assertEquals(property?.line9, 0);
  assertEquals(property?.line10, 0);
  assertEquals(property?.line18, 1_000);
  assertEquals(property?.line19, 300);
  assertEquals(property?.line21, main?.line4);
  assertEquals(
    form8911Pdf.fields.find((field) => field.domainKey === "line10")?.pdfField,
    "topmostSubform[0].Page1[0].f1_15[0]",
  );
  assertEquals(
    form8911ScheduleAPdf.fields.find((field) =>
      field.domainKey === "census_geoid"
    )?.pdfField,
    "topmostSubform[0].Page1[0].GEOID-Comb_Ln6b[0].f1_16[0]",
  );
  assertEquals(ALL_PDF_FORMS.includes(form8911Pdf), true);
  assertEquals(ALL_PDF_FORMS.includes(form8911ScheduleAPdf), true);
});

Deno.test("Form 8911 PDF rejects an old-law source amount or mismatched filed credit", () => {
  const stale = pending({ ...source(), regular_tax_before_credits: 162 });
  assertThrows(
    () => parent(stale),
    Error,
    "disagrees with finalized Form 1040",
  );
  const changed = pending();
  changed.schedule3.line6j_alt_fuel_vehicle_refueling = 250;
  assertThrows(
    () => scheduleA(changed),
    Error,
    "disagrees with finalized Form 1040",
  );
  const noForm6251 = pending();
  delete noForm6251.form6251;
  assertThrows(
    () => parent(noForm6251),
    Error,
    "disagrees with finalized Form 1040",
  );
});

Deno.test("Form 8911 PDF stops for business use, wider credits, and fractional page amounts", () => {
  assertThrows(
    () => parent(pending({ ...source(), business_use_pct: 0.1 })),
    Error,
    "Form 3800 path",
  );
  assertThrows(
    () => parent(pending({ ...source(), certain_allowable_credits: 10 })),
    Error,
    "one personal-use electric charger",
  );
  assertThrows(
    () => parent(pending({ ...source(), cost: 1_001 })),
    Error,
    "whole-dollar source and credit lines",
  );
});

Deno.test("Form 8911 PDF emits neither page when no positive native credit exists", () => {
  const noCredit = pending({ ...source(), regular_tax_before_credits: 0 });
  assertEquals(parent(noCredit), undefined);
  assertEquals(scheduleA(noCredit), undefined);
  assertEquals(form8911Pdf.instances?.({}, filer, {}), []);
  assertEquals(form8911ScheduleAPdf.instances?.({}, filer, {}), []);
});
