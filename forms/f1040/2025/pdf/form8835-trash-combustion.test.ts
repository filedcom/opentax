import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import {
  EnergyType,
  type F8835Item,
  itemSchema,
} from "../../nodes/inputs/f8835/index.ts";
import { f1040_2025 } from "../index.ts";
import { pdfReviewFixtures } from "./review-fixtures.ts";
import { form8835Pdf } from "./forms/f8835.ts";

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-geothermal-general-business-credit"
)!;

function trash(): F8835Item {
  return {
    energy_type: EnergyType.Trash,
    subject_to_passive_activity_limit: false,
    kwh_produced: 100_000,
    kwh_sold: 100_000,
    facility_description: "Municipal solid waste combustion plant",
    facility_us_address: {
      line1: "20 Combustion Rd",
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
    trash_combustion_source: {
      facility_description: "Municipal solid waste combustion plant",
      facility_address_line1: "20 Combustion Rd",
      facility_latitude: 39.123456,
      facility_longitude: -75.123456,
      municipal_waste_record_reference: "2025 municipal waste intake ledger",
      municipal_solid_waste_excluding_segregated_recyclable_paper_verified:
        true,
      original_trash_combustion_facility_verified: true,
      filer_produced_electricity_verified: true,
      election_grant_nonclaim_record_reference:
        "2024-2025 section 48 election and grant review",
      no_section48_election_or_section1603_grant_verified: true,
      construction_record_reference:
        "2023 combustion plant construction record",
      construction_began_on: "2023-06-01",
      production_meter_record_reference: "2025 combustion generation meter",
      meter_period_start_date: "2025-01-01",
      meter_period_end_date: "2025-12-31",
      metered_kwh_produced: 100_000,
      unrelated_sale_invoice_reference: "2025 combustion electricity invoice",
      unrelated_sale_invoice_date: "2025-12-31",
      invoiced_kwh_sold: 100_000,
      unrelated_buyer_verified: true,
    },
  };
}

Deno.test("trash-combustion Form 8835 line 1h reconciles source, 1040, native, and PDF", async () => {
  const source = trash();
  const result = f1040_2025.executeReturn({ ...base.inputs, f8835: [source] });
  assertEquals(result.diagnostics, []);
  assert(Array.isArray(result.pending.f3800.f8835_credit_entries));
  const creditEntries = result.pending.f3800.f8835_credit_entries;
  assertEquals(result.pending.f3800.f8835_credit_entries[0].credit_amount, 300);
  assertEquals(result.pending.schedule3.line6a_total, 300);
  assertEquals(result.pending.f1040.line20_nonrefundable_credits, 300);
  const prepared = await f1040_2025.prepareReturn(result.pending, base.filer);
  const parts = prepared.bundle.form3800Parts!;
  assertEquals(parts.currentRows[0].line, "4e");
  assertEquals(parts.currentAmounts[0].appliedCredit, 300);
  assertStringIncludes(
    prepared.bundle.xml,
    "<KwHrsPrdcdAndSoldTrashQty>100000</KwHrsPrdcdAndSoldTrashQty>",
  );
  assertStringIncludes(
    prepared.bundle.xml,
    "<KwHrsPrdcdAndSoldTrashCrAmt>300</KwHrsPrdcdAndSoldTrashCrAmt>",
  );
  const pending = result.pending as Record<string, Record<string, unknown>>;
  const [projected] = form8835Pdf.instances!({}, base.filer, pending, parts);
  assertEquals(
    projected.facility_type,
    "Trash combustion (municipal solid waste)",
  );
  assertEquals(projected.address_line1, "20 Combustion Rd");
  assertEquals(projected.line1h_quantity, 100_000);
  assertEquals(projected.line1h_credit, 300);
  assertEquals(projected.line1g_credit, undefined);
  assertEquals(projected.line15, 300);
  assertEquals(
    form8835Pdf.fields.find((field) => field.domainKey === "line1h_credit")
      ?.pdfField,
    "topmostSubform[0].Page2[0].Table_PartII_Lines1a-j[0].Line1h[0].f2_24[0]",
  );
  assert((await prepared.renderPdf()).length > 0);

  const changed = (item: F8835Item) => ({
    ...pending,
    f8835: { f8835s: [item] },
  });
  assertThrows(
    () =>
      form8835Pdf.instances!(
        {},
        base.filer,
        changed({
          ...source,
          facility_us_address: {
            ...source.facility_us_address!,
            line1: "21 Combustion Rd",
          },
        }),
        parts,
      ),
    Error,
    "matching filer-owned facility identity",
  );
  assertThrows(
    () =>
      form8835Pdf.instances!(
        {},
        base.filer,
        changed({
          ...source,
          facility_owned_by_filer: false,
          facility_owner_business: {
            name: "Other Energy LLC",
            ein: "123456789",
          },
        }),
        parts,
      ),
    Error,
    "matching filer-owned facility identity",
  );
  assertThrows(
    () =>
      form8835Pdf.instances!(
        {},
        base.filer,
        changed({
          ...source,
          trash_combustion_source: {
            ...source.trash_combustion_source!,
            metered_kwh_produced: 99_999,
          },
        }),
        parts,
      ),
    Error,
    "2025 meter and unrelated sale",
  );
  assertThrows(
    () =>
      form8835Pdf.instances!(
        {},
        base.filer,
        changed({
          ...source,
          trash_combustion_source: {
            ...source.trash_combustion_source!,
            production_meter_record_reference:
              source.trash_combustion_source!.municipal_waste_record_reference,
          },
        }),
        parts,
      ),
    Error,
    "five distinct source records",
  );
  assertThrows(
    () =>
      itemSchema.parse({
        ...source,
        trash_combustion_source: {
          ...source.trash_combustion_source!,
          municipal_solid_waste_excluding_segregated_recyclable_paper_verified:
            false,
        },
      }),
    Error,
  );
  assertThrows(
    () =>
      form8835Pdf.instances!({}, base.filer, {
        ...pending,
        f3800: {
          ...pending.f3800,
          f8835_credit_entries: [{
            ...creditEntries[0],
            credit_amount: 301,
          }],
        },
      }, parts),
    Error,
    "disagrees",
  );
});
