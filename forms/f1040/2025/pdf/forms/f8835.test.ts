import { assertEquals, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../../../mef/header.ts";
import {
  calculateForm8835,
  EnergyType,
  type F8835Item,
} from "../../../nodes/inputs/f8835/index.ts";
import { form8835Pdf } from "./f8835.ts";
import { ALL_PDF_FORMS } from "./index.ts";
import type { Form3800DocumentParts } from "../../mef/forms/f3800_document.ts";

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
    ac_nameplate_kw: 1_500,
    maximum_net_output_mw: 1.5,
    facility_placed_in_service_date: "2024-01-01",
    facility_construction_start_date: "2023-06-01",
    production_period_start_date: "2025-01-01",
    production_period_end_date: "2025-12-31",
    increased_credit_reason: "none",
    domestic_content_bonus: false,
    energy_community_bonus: false,
    is_fiscal_year: false,
  };
}

function pending(
  item: F8835Item | readonly F8835Item[] = facility(),
): Record<string, Record<string, unknown>> {
  const items = Array.isArray(item) ? item : [item];
  const lines = items.map(calculateForm8835);
  const totalCredit = lines.reduce((sum, row) => sum + row.line15, 0);
  const passiveLines = {
    line2: 0,
    line3: 0,
    line23: 0,
    line24: 0,
    line32: 0,
    line33: 0,
  };
  return {
    f8835: { f8835s: items },
    f3800: {
      f8835_credit_entries: lines.map((row) => ({
        form3800_line: row.form3800Line,
        credit_amount: row.line15,
        transfer_out_amount: 0,
        subject_to_passive_activity_limit: false,
      })),
      allowed_credit: totalCredit,
      specified_credit_allowed: totalCredit,
    },
    f1040: {
      form3800_source_credits: {
        standardCredit: 0,
        specifiedCredit: totalCredit,
        standardCarryforward: 0,
        specifiedCarryforward: 0,
        passiveLines,
      },
      line20_nonrefundable_credits: totalCredit,
    },
    schedule3: {
      line6a_total: totalCredit,
      line8_total: totalCredit,
    },
  };
}

function preparedParts(
  allPending: Record<string, Record<string, unknown>>,
): Form3800DocumentParts {
  const items = allPending.f8835?.f8835s as F8835Item[];
  const credits = items.map((item) => calculateForm8835(item).line15);
  const total = credits.reduce((sum, credit) => sum + credit, 0);
  const ids = credits.map((_, index) => `F8835-${index + 1}`);
  return {
    lines: { line37: total, line38: total } as Form3800DocumentParts["lines"],
    transferStatementIds: [],
    currentRows: [{
      line: "4e",
      xml: "",
      metadata: {
        sourceCount: credits.length,
        referenceDocumentId: ids.join(" "),
      },
      entityCredits: [],
    }],
    currentAmounts: [{
      line: "4e",
      nonpassiveCredit: total,
      transferOutCredit: 0,
      passiveBeforeLimit: 0,
      passiveAfterLimit: 0,
      totalCredit: total,
      appliedCredit: total,
    }],
    carryoverRows: [],
    currentDetails: credits.map((credit, index) => ({
      line: "4e" as const,
      credit,
      appliedCredit: credit,
      sourceDocumentId: ids[index],
    })),
    carryoverDetails: [],
    passiveCurrentDetails: [],
    passiveCarryoverDetails: [],
  };
}

function projected(allPending: Record<string, Record<string, unknown>>) {
  return form8835Pdf.instances?.(
    {},
    filer,
    allPending,
    preparedParts(allPending),
  )?.[0];
}

function projectedAll(allPending: Record<string, Record<string, unknown>>) {
  return form8835Pdf.instances?.(
    {},
    filer,
    allPending,
    preparedParts(allPending),
  ) ?? [];
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
  assertThrows(
    () => form8835Pdf.instances?.({}, filer, pending()),
    Error,
    "needs the prepared Form 3800 source parts",
  );
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

Deno.test("Form 8835 PDF rejects a changed prepared line 4e tax use", () => {
  const source = pending();
  const prepared = preparedParts(source);
  assertThrows(
    () =>
      form8835Pdf.instances?.({}, filer, source, {
        ...prepared,
        currentAmounts: prepared.currentAmounts.map((row) => ({
          ...row,
          appliedCredit: row.appliedCredit - 1,
        })),
      }),
    Error,
    "disagrees with native Form 3800",
  );
});

Deno.test("Form 8835 PDF prints two distinct facility copies and rejects a mismatched second credit", () => {
  const second = {
    ...facility(),
    facility_description: "Second geothermal production site",
    facility_us_address: {
      line1: "20 Plant Rd",
      city: "Wilmington",
      state: "DE",
      zip: "19801",
    },
    facility_latitude: 39.223456,
    facility_longitude: -75.223456,
  };
  const source = pending([facility(), second]);
  const copies = projectedAll(source);
  assertEquals(copies.length, 2);
  assertEquals(copies.map((copy) => copy.facility_description), [
    "Geothermal production site",
    "Second geothermal production site",
  ]);
  assertEquals(copies.map((copy) => copy.line15), [600, 600]);
  const changed = pending([facility(), second]);
  (changed.f3800.f8835_credit_entries as Array<Record<string, unknown>>)[1]
    .credit_amount = 500;
  assertThrows(
    () => projectedAll(changed),
    Error,
    "disagrees with native Form 3800",
  );
});

Deno.test("Form 8835 PDF prints wind on line 1a and a separate geothermal copy on line 1c", () => {
  const wind = {
    ...facility(),
    energy_type: EnergyType.Wind,
    facility_description: "Wind production site",
    facility_us_address: {
      line1: "30 Wind Farm Rd",
      city: "Wilmington",
      state: "DE",
      zip: "19801",
    },
    facility_latitude: 39.323456,
  };
  const copies = projectedAll(pending([wind, facility()]));
  assertEquals(copies.length, 2);
  assertEquals(copies[0].facility_type, "Wind");
  assertEquals(copies[0].ac_wind, true);
  assertEquals(copies[0].ac_other, false);
  assertEquals(copies[0].ac_wind_nameplate_kw, 1_500);
  assertEquals(copies[0].line1a_quantity, 100_000);
  assertEquals(copies[0].line1a_credit, 600);
  assertEquals(copies[0].line1c_quantity, undefined);
  assertEquals(copies[1].facility_type, "Geothermal");
  assertEquals(copies[1].ac_wind, false);
  assertEquals(copies[1].ac_other, true);
  assertEquals(copies[1].line1a_quantity, undefined);
  assertEquals(copies[1].line1c_quantity, 100_000);
  assertEquals(copies.map((copy) => copy.line15), [600, 600]);
  assertEquals(
    form8835Pdf.fields.find((field) => field.domainKey === "line1a_credit")
      ?.pdfField,
    "topmostSubform[0].Page2[0].Table_PartII_Lines1a-j[0].Line1a[0].f2_3[0]",
  );
});

Deno.test("Form 8835 PDF stops for bonus, duplicate facilities, and zero credit", () => {
  assertThrows(
    () => projected(pending({ ...facility(), domestic_content_bonus: true })),
    Error,
    "filer-owned nonpassive wind or geothermal facilities",
  );
  const multiple = pending();
  multiple.f8835.f8835s = [facility(), facility()];
  assertThrows(
    () => projected(multiple),
    Error,
    "repeats the same facility",
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
