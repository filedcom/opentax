import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../../../mef/header.ts";
import {
  calculateForm8835,
  EnergyType,
  type F8835Item,
} from "../../../nodes/inputs/f8835/index.ts";
import { form8835Pdf } from "./f8835.ts";
import { ALL_PDF_FORMS } from "./index.ts";
import type { Form3800DocumentParts } from "../../mef/forms/f3800_document.ts";
import { f1040_2025 } from "../../index.ts";
import { pdfReviewFixtures } from "../review-fixtures.ts";

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

function closedLoopFacility(): F8835Item {
  return {
    ...facility(),
    energy_type: EnergyType.BiomassClosed,
    facility_description: "Closed-loop biomass production site",
    closed_loop_biomass_source: {
      facility_description: "Closed-loop biomass production site",
      planting_record_reference: "crop-planting-2025",
      planted_exclusively_for_facility_verified: true,
      original_facility_not_cofired_verified: true,
      production_meter_record_reference: "meter-2025",
      metered_kwh_produced: 100_000,
      unrelated_sale_invoice_reference: "utility-invoice-2025",
      invoiced_kwh_sold: 100_000,
      unrelated_buyer_verified: true,
      no_investment_credit_election_verified: true,
      no_section1603_grant_verified: true,
    },
  };
}

function solarFacility(): F8835Item {
  return {
    ...facility(),
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
      metered_kwh_produced: 100_000,
      unrelated_sale_invoice_reference: "solar-utility-invoice-2025",
      unrelated_sale_invoice_date: "2025-12-31",
      invoiced_kwh_sold: 100_000,
      unrelated_buyer_verified: true,
      section48_energy_credit_not_claimed_verified: true,
    },
  };
}

function openLoopCellulosicFacility(): F8835Item {
  return {
    ...facility(),
    energy_type: EnergyType.BiomassOpen,
    facility_description: "Open-loop cellulosic waste generation site",
    open_loop_cellulosic_source: {
      facility_description: "Open-loop cellulosic waste generation site",
      feedstock_record_reference: "2025 cellulosic waste feedstock ledger",
      solid_nonhazardous_cellulosic_waste_verified: true,
      original_facility_not_expanded_verified: true,
      filer_produced_electricity_verified: true,
      construction_record_reference: "2023 cellulosic construction file",
      construction_began_on: "2023-06-01",
      production_meter_record_reference: "2025 cellulosic generation meter",
      meter_period_start_date: "2025-01-01",
      meter_period_end_date: "2025-12-31",
      metered_kwh_produced: 100_000,
      unrelated_sale_invoice_reference: "2025 cellulosic utility invoice",
      unrelated_sale_invoice_date: "2025-12-31",
      invoiced_kwh_sold: 100_000,
      unrelated_buyer_verified: true,
    },
  };
}

function openLoopLivestockFacility(): F8835Item {
  return {
    ...facility(),
    energy_type: EnergyType.BiomassOpen,
    facility_description: "Livestock nutrient biomass facility",
    open_loop_livestock_source: {
      facility_description: "Livestock nutrient biomass facility",
      feedstock_record_reference: "2025 manure nutrient intake ledger",
      agricultural_livestock_waste_nutrients_verified: true,
      original_facility_not_expanded_verified: true,
      filer_produced_electricity_verified: true,
      construction_record_reference: "2023 livestock plant construction file",
      construction_began_on: "2023-06-01",
      nameplate_capacity_record_reference:
        "2024 signed 1500 kW nameplate record",
      nameplate_capacity_kw: 1_500,
      production_meter_record_reference: "2025 livestock generation meter",
      meter_period_start_date: "2025-01-01",
      meter_period_end_date: "2025-12-31",
      metered_kwh_produced: 100_000,
      unrelated_sale_invoice_reference: "2025 livestock utility invoice",
      unrelated_sale_invoice_date: "2025-12-31",
      invoiced_kwh_sold: 100_000,
      unrelated_buyer_verified: true,
    },
  };
}

Deno.test("open-loop cellulosic Form 8835 line 1f reconciles source, Form 3800, return, native and PDF", async () => {
  const base = pdfReviewFixtures.find((fixture) =>
    fixture.id === "single-geothermal-general-business-credit"
  )!;
  const source = openLoopCellulosicFacility();
  const result = f1040_2025.executeReturn({
    ...base.inputs,
    f8835: [source],
  });
  assertEquals(result.diagnostics, []);
  assert(Array.isArray(result.pending.f3800.f8835_credit_entries));
  assertEquals(
    (result.pending.f3800.f8835_credit_entries as { credit_amount: number }[])[
      0
    ]
      .credit_amount,
    300,
  );
  assertEquals(result.pending.schedule3.line6a_total, 300);
  assertEquals(result.pending.f1040.line20_nonrefundable_credits, 300);
  const prepared = await f1040_2025.prepareReturn(result.pending, base.filer);
  const parts = prepared.bundle.form3800Parts!;
  assertEquals(parts.currentRows[0].line, "4e");
  assertEquals(parts.currentAmounts[0].appliedCredit, 300);
  assertStringIncludes(
    prepared.bundle.xml,
    "<KwHrsPrdcdSoldOpenLopBmssCrAmt>300</KwHrsPrdcdSoldOpenLopBmssCrAmt>",
  );
  const projected = form8835Pdf.instances?.(
    {},
    base.filer,
    result.pending as Record<string, Record<string, unknown>>,
    parts,
  )?.[0];
  assertEquals(
    projected?.facility_type,
    "Open-loop biomass (cellulosic waste)",
  );
  assertEquals(projected?.line1f_quantity, 100_000);
  assertEquals(projected?.line1f_credit, 300);
  assertEquals(projected?.line1c_credit, undefined);
  assertEquals(projected?.line15, 300);
  assertEquals(
    form8835Pdf.fields.find((field) => field.domainKey === "line1f_credit")
      ?.pdfField,
    "topmostSubform[0].Page2[0].Table_PartII_Lines1a-j[0].Line1f[0].f2_18[0]",
  );
  assert((await prepared.renderPdf()).length > 0);
  const pendingSource = result.pending as Record<
    string,
    Record<string, unknown>
  >;
  const changedMeter = {
    ...pendingSource,
    f8835: {
      f8835s: [{
        ...source,
        open_loop_cellulosic_source: {
          ...source.open_loop_cellulosic_source!,
          metered_kwh_produced: 99_999,
        },
      }],
    },
  };
  assertThrows(
    () => form8835Pdf.instances?.({}, base.filer, changedMeter, parts),
    Error,
    "matching dates and kWh",
  );
  const changedCredit = {
    ...pendingSource,
    f3800: {
      ...pendingSource.f3800,
      f8835_credit_entries: [{
        form3800_line: "4e",
        credit_amount: 299,
        transfer_out_amount: 0,
        subject_to_passive_activity_limit: false,
      }],
    },
  };
  assertThrows(
    () => form8835Pdf.instances?.({}, base.filer, changedCredit, parts),
    Error,
    "disagrees with native Form 3800",
  );
  assertThrows(
    () =>
      calculateForm8835({
        ...source,
        open_loop_cellulosic_source: {
          ...source.open_loop_cellulosic_source!,
          feedstock_record_reference: "2025 cellulosic generation meter",
        },
      }),
    Error,
    "distinct feedstock",
  );
});

Deno.test("agricultural livestock waste Form 8835 line 1f reaches Form 3800 and the finalized return", async () => {
  const base = pdfReviewFixtures.find((fixture) =>
    fixture.id === "single-geothermal-general-business-credit"
  )!;
  const source = openLoopLivestockFacility();
  const result = f1040_2025.executeReturn({
    ...base.inputs,
    f8835: [source],
  });
  assertEquals(result.diagnostics, []);
  assert(Array.isArray(result.pending.f3800.f8835_credit_entries));
  assertEquals(
    (result.pending.f3800.f8835_credit_entries as { credit_amount: number }[])[
      0
    ]
      .credit_amount,
    300,
  );
  assertEquals(result.pending.schedule3.line6a_total, 300);
  assertEquals(result.pending.f1040.line20_nonrefundable_credits, 300);
  const prepared = await f1040_2025.prepareReturn(result.pending, base.filer);
  const parts = prepared.bundle.form3800Parts!;
  assertEquals(parts.currentRows[0].line, "4e");
  assertEquals(parts.currentAmounts[0].appliedCredit, 300);
  assertStringIncludes(
    prepared.bundle.xml,
    "<KwHrsPrdcdSoldOpenLopBmssCrAmt>300</KwHrsPrdcdSoldOpenLopBmssCrAmt>",
  );
  const projected = form8835Pdf.instances?.(
    {},
    base.filer,
    result.pending as Record<string, Record<string, unknown>>,
    parts,
  )?.[0];
  assertEquals(projected?.facility_type, "Open-loop biomass (livestock waste)");
  assertEquals(projected?.line1f_quantity, 100_000);
  assertEquals(projected?.line1f_credit, 300);
  assertEquals(projected?.line15, 300);
  const pending = result.pending as Record<string, Record<string, unknown>>;
  for (
    const changed of [
      { nameplate_capacity_kw: 149 },
      { nameplate_capacity_kw: 1_499 },
      { metered_kwh_produced: 99_999 },
      { invoiced_kwh_sold: 99_999 },
      { construction_began_on: "2024-01-01" },
      { feedstock_record_reference: "2025 livestock generation meter" },
    ]
  ) {
    const altered = {
      ...pending,
      f8835: {
        f8835s: [{
          ...source,
          open_loop_livestock_source: {
            ...source.open_loop_livestock_source!,
            ...changed,
          },
        }],
      },
    };
    assertThrows(
      () => form8835Pdf.instances?.({}, base.filer, altered, parts),
      Error,
    );
  }
  const changedCredit = {
    ...pending,
    f3800: {
      ...pending.f3800,
      f8835_credit_entries: [{
        form3800_line: "4e",
        credit_amount: 299,
        transfer_out_amount: 0,
        subject_to_passive_activity_limit: false,
      }],
    },
  };
  assertThrows(
    () => form8835Pdf.instances?.({}, base.filer, changedCredit, parts),
    Error,
    "disagrees with native Form 3800",
  );
  assert((await prepared.renderPdf()).length > 0);
});

Deno.test("Form 8835 PDF prints sourced solar on line 1d and reconciles Form 3800", () => {
  const source = pending(solarFacility());
  const fields = projected(source);
  assertEquals(fields?.facility_type, "Solar");
  assertEquals(fields?.dc_solar, true);
  assertEquals(fields?.dc_not_applicable, false);
  assertEquals(fields?.dc_solar_nameplate_kw, 1_800);
  assertEquals(fields?.line1d_quantity, 100_000);
  assertEquals(fields?.line1d_credit, 600);
  assertEquals(fields?.line1c_credit, undefined);
  assertEquals(fields?.line15, 600);
  assertEquals(
    form8835Pdf.fields.find((field) => field.domainKey === "line1d_credit")
      ?.pdfField,
    "topmostSubform[0].Page2[0].Table_PartII_Lines1a-j[0].Line1d[0].f2_12[0]",
  );
  const altered = pending(solarFacility());
  (altered.f3800.f8835_credit_entries as Array<Record<string, unknown>>)[0]
    .credit_amount = 599;
  assertThrows(
    () => projected(altered),
    Error,
    "disagrees with native Form 3800",
  );
  const mismatchedSource = pending(solarFacility());
  const sourceRows = mismatchedSource.f8835.f8835s as F8835Item[];
  sourceRows[0] = {
    ...sourceRows[0],
    solar_production_source: {
      ...sourceRows[0].solar_production_source!,
      metered_kwh_produced: 99_999,
    },
  };
  assertThrows(() => projected(mismatchedSource), Error, "matching kWh");
});

Deno.test("Form 8835 PDF prints sourced closed-loop biomass on line 1b", () => {
  const fields = projected(pending(closedLoopFacility()));
  assertEquals(fields?.facility_type, "Closed-loop biomass");
  assertEquals(fields?.ac_other, true);
  assertEquals(fields?.line1b_quantity, 100_000);
  assertEquals(fields?.line1b_credit, 600);
  assertEquals(fields?.line1a_quantity, undefined);
  assertEquals(fields?.line1c_quantity, undefined);
  assertEquals(fields?.line15, 600);
  assertEquals(
    form8835Pdf.fields.find((field) => field.domainKey === "line1b_credit")
      ?.pdfField,
    "topmostSubform[0].Page2[0].Table_PartII_Lines1a-j[0].Line1b[0].f2_6[0]",
  );
  const altered = pending(closedLoopFacility());
  (altered.f3800.f8835_credit_entries as Array<Record<string, unknown>>)[0]
    .credit_amount = 599;
  assertThrows(
    () => projected(altered),
    Error,
    "disagrees with native Form 3800",
  );
});

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
    form8835DocumentIds: ids,
    transferStatementIds: [],
    carryforwardSources: [],
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

Deno.test("Form 8835 PDF binds each facility to its reserved native document ID", () => {
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
  const prepared = preparedParts(source);
  assertEquals(
    form8835Pdf.instances?.({}, filer, source, prepared)?.length,
    2,
  );
  const swappedIds = [...prepared.form8835DocumentIds!].reverse();
  assertThrows(
    () =>
      form8835Pdf.instances?.({}, filer, source, {
        ...prepared,
        form8835DocumentIds: swappedIds,
      }),
    Error,
    "disagrees with native Form 3800",
  );
  const counterfeitId = prepared.currentDetails.map((detail, index) => ({
    ...detail,
    sourceDocumentId: index === 1 ? "OTHER-DOCUMENT" : detail.sourceDocumentId,
  }));
  assertThrows(
    () =>
      form8835Pdf.instances?.({}, filer, source, {
        ...prepared,
        currentRows: prepared.currentRows.map((row) => ({
          ...row,
          metadata: {
            ...row.metadata,
            referenceDocumentId: counterfeitId.map((detail) =>
              detail.sourceDocumentId
            ).join(" "),
          },
        })),
        currentDetails: counterfeitId,
      }),
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
    "filer-owned nonpassive wind, geothermal",
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

function nonownerCellulosicLessee(): F8835Item {
  const item = openLoopCellulosicFacility();
  return {
    ...item,
    facility_owned_by_filer: false,
    facility_owner_business: {
      name: "Owner Biomass LLC",
      ein: "987654321",
    },
    open_loop_nonowner_lessee_source: {
      facility_description: item.facility_description!,
      facility_address_line1: item.facility_us_address!.line1,
      facility_latitude: item.facility_latitude!,
      facility_longitude: item.facility_longitude!,
      owner_business_name: "Owner Biomass LLC",
      owner_business_ein: "987654321",
      lease_agreement_reference: "2024 biomass facility lease",
      owner_producer_acknowledgment_reference:
        "2025 owner production and credit acknowledgment",
      filer_is_lessee_and_electricity_producer_verified: true,
      owner_not_producer_or_claimant_for_2025_verified: true,
    },
  };
}

function nonownerLivestockLessee(): F8835Item {
  const item = openLoopLivestockFacility();
  return {
    ...item,
    facility_owned_by_filer: false,
    facility_owner_business: {
      name: "Owner Nutrient Energy LLC",
      ein: "987654321",
    },
    open_loop_nonowner_lessee_source: {
      facility_description: item.facility_description!,
      facility_address_line1: item.facility_us_address!.line1,
      facility_latitude: item.facility_latitude!,
      facility_longitude: item.facility_longitude!,
      owner_business_name: "Owner Nutrient Energy LLC",
      owner_business_ein: "987654321",
      lease_agreement_reference: "2024 nutrient facility lease",
      owner_producer_acknowledgment_reference:
        "2025 owner nonproduction and credit acknowledgment",
      filer_is_lessee_and_electricity_producer_verified: true,
      owner_not_producer_or_claimant_for_2025_verified: true,
    },
  };
}

Deno.test("non-owner livestock-waste lessee joins Form 8835, Form 3800, native, PDF, and Form 1040", async () => {
  const base = pdfReviewFixtures.find((fixture) =>
    fixture.id === "single-geothermal-general-business-credit"
  )!;
  const source = nonownerLivestockLessee();
  const result = f1040_2025.executeReturn({
    ...base.inputs,
    f8835: [source],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(
    (result.pending.f3800.f8835_credit_entries as { credit_amount: number }[])[
      0
    ]
      .credit_amount,
    300,
  );
  assertEquals(result.pending.schedule3.line6a_total, 300);
  assertEquals(result.pending.f1040.line20_nonrefundable_credits, 300);
  const prepared = await f1040_2025.prepareReturn(result.pending, base.filer);
  assertStringIncludes(
    prepared.bundle.xml,
    "<FacilityOwnerEIN>987654321</FacilityOwnerEIN>",
  );
  assertStringIncludes(
    prepared.bundle.xml,
    "<KwHrsPrdcdSoldOpenLopBmssCrAmt>300</KwHrsPrdcdSoldOpenLopBmssCrAmt>",
  );
  const parts = prepared.bundle.form3800Parts!;
  assertEquals(parts.currentRows[0].line, "4e");
  assertEquals(parts.currentAmounts[0].appliedCredit, 300);
  const pending = result.pending as Record<string, Record<string, unknown>>;
  const [projected] = form8835Pdf.instances!({}, base.filer, pending, parts);
  assertEquals(projected.owner_name, "Owner Nutrient Energy LLC");
  assertEquals(projected.owner_tin, "987654321");
  assertEquals(projected.line1f_credit, 300);
  const changed = (item: F8835Item) => ({
    ...pending,
    f8835: { f8835s: [item] },
  });
  for (
    const altered of [
      {
        ...source,
        facility_owner_business: { name: "Other Owner", ein: "987654321" },
      },
      { ...source, open_loop_nonowner_lessee_source: undefined },
      {
        ...source,
        open_loop_nonowner_lessee_source: {
          ...source.open_loop_nonowner_lessee_source!,
          lease_agreement_reference: source.open_loop_livestock_source!
            .nameplate_capacity_record_reference,
        },
      },
      {
        ...source,
        open_loop_nonowner_lessee_source: {
          ...source.open_loop_nonowner_lessee_source!,
          facility_latitude: source.facility_latitude! + 1,
        },
      },
    ]
  ) {
    assertThrows(() => calculateForm8835(altered));
    assertThrows(() =>
      form8835Pdf.instances!({}, base.filer, changed(altered), parts)
    );
  }
  assertThrows(() =>
    form8835Pdf.instances!({}, base.filer, {
      ...pending,
      f1040: { ...pending.f1040, line20_nonrefundable_credits: 299 },
    }, parts)
  );
});

Deno.test("non-owner open-loop biomass lessee joins Form 8835 owner, Form 3800, native, and PDF", async () => {
  const base = pdfReviewFixtures.find((fixture) =>
    fixture.id === "single-geothermal-general-business-credit"
  )!;
  const source = nonownerCellulosicLessee();
  const result = f1040_2025.executeReturn({
    ...base.inputs,
    f8835: [source],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(
    (result.pending.f3800.f8835_credit_entries as { credit_amount: number }[])[
      0
    ]
      .credit_amount,
    300,
  );
  assertEquals(result.pending.schedule3.line6a_total, 300);
  assertEquals(result.pending.f1040.line20_nonrefundable_credits, 300);
  const prepared = await f1040_2025.prepareReturn(result.pending, base.filer);
  assertStringIncludes(
    prepared.bundle.xml,
    "<FacilityOwnerEIN>987654321</FacilityOwnerEIN>",
  );
  assertStringIncludes(
    prepared.bundle.xml,
    "<KwHrsPrdcdSoldOpenLopBmssCrAmt>300</KwHrsPrdcdSoldOpenLopBmssCrAmt>",
  );
  const parts = prepared.bundle.form3800Parts!;
  assertEquals(parts.currentRows[0].line, "4e");
  assertEquals(parts.currentAmounts[0].appliedCredit, 300);
  const pendingSource = result.pending as Record<
    string,
    Record<string, unknown>
  >;
  const [projected] = form8835Pdf.instances!(
    {},
    base.filer,
    pendingSource,
    parts,
  );
  assertEquals(projected.owner_name, "Owner Biomass LLC");
  assertEquals(projected.owner_tin, "987654321");
  assertEquals(projected.line1f_credit, 300);
  assertEquals(projected.line15, 300);
  assertEquals(
    form8835Pdf.fields.find((field) => field.domainKey === "owner_tin")
      ?.pdfField,
    "topmostSubform[0].Page1[0].f1_7[0]",
  );
  const changed = (item: F8835Item) => ({
    ...pendingSource,
    f8835: { f8835s: [item] },
  });
  assertThrows(() =>
    form8835Pdf.instances!(
      {},
      base.filer,
      changed({
        ...source,
        facility_owner_business: {
          ...source.facility_owner_business!,
          ein: "111223333",
        },
      }),
      parts,
    )
  );
  assertThrows(() =>
    form8835Pdf.instances!(
      {},
      base.filer,
      changed({
        ...source,
        open_loop_nonowner_lessee_source: {
          ...source.open_loop_nonowner_lessee_source!,
          lease_agreement_reference:
            source.open_loop_cellulosic_source!.feedstock_record_reference,
        },
      }),
      parts,
    )
  );
  assertThrows(() =>
    form8835Pdf.instances!(
      {},
      base.filer,
      changed({ ...source, open_loop_nonowner_lessee_source: undefined }),
      parts,
    )
  );
  assertThrows(() =>
    form8835Pdf.instances!(
      {},
      base.filer,
      {
        ...pendingSource,
        f3800: {
          ...pendingSource.f3800,
          f8835_credit_entries: [{
            form3800_line: "4e",
            credit_amount: 299,
            transfer_out_amount: 0,
            subject_to_passive_activity_limit: false,
          }],
        },
      },
      parts,
    )
  );
});
