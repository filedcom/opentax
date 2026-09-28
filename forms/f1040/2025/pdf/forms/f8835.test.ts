import { assertEquals, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../../../mef/header.ts";
import {
  calculateForm8835,
  EnergyType,
  type F8835Item,
} from "../../../nodes/inputs/f8835/index.ts";
import { form8835Pdf } from "./f8835.ts";
import { ALL_PDF_FORMS } from "./index.ts";

const filer: FilerIdentity = {
  primarySSN: "123456789",
  nameLine1: "Alex Producer",
  nameControl: "PROD",
  address: {
    line1: "1 Main St",
    city: "Wilmington",
    state: "DE",
    zip: "19801",
  },
  filingStatus: FilingStatus.Single,
};

function facility(): F8835Item {
  return {
    energy_type: EnergyType.Geothermal,
    subject_to_passive_activity_limit: false,
    kwh_produced: 100_000,
    kwh_sold: 100_000,
    facility_description: "Geothermal production site",
    facility_us_address: {
      line1: "10 Plant Rd",
      city: "Wilmington",
      state: "DE",
      zip: "19801",
    },
    facility_latitude: 39.123456,
    facility_longitude: -75.123456,
    facility_owned_by_filer: true,
    ac_nameplate_kw: 500,
    facility_placed_in_service_date: "2023-01-01",
    facility_construction_start_date: "2022-12-01",
    production_period_start_date: "2025-01-01",
    production_period_end_date: "2025-12-31",
    increased_credit_reason: "none",
    domestic_content_bonus: false,
    energy_community_bonus: false,
    is_fiscal_year: false,
  };
}

function pending(
  item: F8835Item = facility(),
): Record<string, Record<string, unknown>> {
  const lines = calculateForm8835(item);
  const passiveLines = {
    line2: 0,
    line3: 0,
    line23: 0,
    line24: 0,
    line32: 0,
    line33: 0,
  };
  return {
    f8835: { f8835s: [item] },
    f3800: {
      f8835_credit_entries: [{
        form3800_line: lines.form3800Line,
        credit_amount: lines.line15,
        transfer_out_amount: 0,
        subject_to_passive_activity_limit: false,
      }],
      allowed_credit: lines.line15,
      specified_credit_allowed: lines.line15,
    },
    f1040: {
      form3800_source_credits: {
        standardCredit: 0,
        specifiedCredit: lines.line15,
        passiveLines,
      },
      line20_nonrefundable_credits: lines.line15,
    },
    schedule3: {
      line6a_total: lines.line15,
      line8_total: lines.line15,
    },
  };
}

function projected(allPending: Record<string, Record<string, unknown>>) {
  return form8835Pdf.instances?.({}, filer, allPending)?.[0];
}

Deno.test("Form 8835 PDF prints one fully used geothermal facility across all three pages", () => {
  const fields = projected(pending());
  assertEquals(fields?.filer_name, "Alex Producer");
  assertEquals(fields?.facility_type, "Geothermal");
  assertEquals(fields?.address_line1, "10 Plant Rd");
  assertEquals(fields?.lat_sign, "+");
  assertEquals(fields?.lat_degrees, "39");
  assertEquals(fields?.lat_fraction, "123456");
  assertEquals(fields?.long_sign, "-");
  assertEquals(fields?.long_degrees, "075");
  assertEquals(fields?.long_fraction, "123456");
  assertEquals(fields?.no_increased_credit, true);
  assertEquals(fields?.no_domestic_bonus, true);
  assertEquals(fields?.no_energy_community_bonus, true);
  assertEquals(fields?.line1c_quantity, 100_000);
  assertEquals(fields?.line1c_credit, 600);
  assertEquals(fields?.line2, 600);
  assertEquals(fields?.line9, 600);
  assertEquals(fields?.line10, 0);
  assertEquals(fields?.line11, 0);
  assertEquals(fields?.line15, 600);
  assertEquals(form8835Pdf.pageIndices, undefined);
  assertEquals(ALL_PDF_FORMS.includes(form8835Pdf), true);
  assertEquals(
    form8835Pdf.fields.find((field) => field.domainKey === "line1c_credit")
      ?.pdfField,
    "topmostSubform[0].Page2[0].Table_PartII_Lines1a-j[0].Line1c[0].f2_9[0]",
  );
  assertEquals(
    form8835Pdf.fields.find((field) => field.domainKey === "line15")?.pdfField,
    "topmostSubform[0].Page3[0].f3_2[0]",
  );
});

Deno.test("Form 8835 PDF rejects source-only and overstated final credit", () => {
  const sourceOnly = pending();
  delete sourceOnly.f3800;
  assertThrows(() => projected(sourceOnly));
  const overstated = pending();
  overstated.f3800.allowed_credit = 500;
  assertThrows(
    () => projected(overstated),
    Error,
    "disagrees with native Form 3800",
  );
});

Deno.test("Form 8835 PDF stops for bonus, other facilities, and zero credit", () => {
  assertThrows(
    () => projected(pending({ ...facility(), domestic_content_bonus: true })),
    Error,
    "one filer-owned nonpassive geothermal facility",
  );
  const multiple = pending();
  multiple.f8835.f8835s = [facility(), facility()];
  assertThrows(
    () => projected(multiple),
    Error,
    "one facility per return",
  );
  const zero = facility();
  zero.kwh_sold = 0;
  assertThrows(
    () => projected(pending(zero)),
    Error,
    "zero-credit facility",
  );
  assertEquals(form8835Pdf.instances?.({}, filer, {}), []);
});
