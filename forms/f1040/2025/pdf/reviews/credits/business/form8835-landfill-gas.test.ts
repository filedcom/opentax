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
} from "../../../../../nodes/inputs/credits/business/f8835/index.ts";
import { f1040_2025 } from "../../../../index.ts";
import { pdfReviewFixtures } from "../../../review-fixtures.ts";
import { form8835Pdf } from "../../../forms/credits/business/f8835.ts";

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-geothermal-general-business-credit"
)!;

function landfill(): F8835Item {
  return {
    energy_type: EnergyType.Landfill,
    subject_to_passive_activity_limit: false,
    kwh_produced: 100_000,
    kwh_sold: 100_000,
    facility_description: "Municipal solid waste landfill gas plant",
    facility_us_address: {
      line1: "10 Landfill Rd",
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
    landfill_gas_source: {
      facility_description: "Municipal solid waste landfill gas plant",
      feedstock_record_reference:
        "2025 municipal solid waste landfill gas ledger",
      municipal_solid_waste_landfill_gas_verified: true,
      original_facility_verified: true,
      filer_produced_electricity_verified: true,
      section45k_nonclaim_record_reference: "2025 section 45K credit review",
      section45k_credit_not_allowed_verified: true,
      section48_biogas_nonclaim_record_reference:
        "2024-2025 section 48 biogas credit review",
      section48_biogas_credit_not_allowed_this_or_prior_year_verified: true,
      investment_election_nonclaim_record_reference:
        "2024-2025 energy credit and grant review",
      no_section48_election_or_section1603_grant_verified: true,
      construction_record_reference: "2023 landfill plant construction record",
      construction_began_on: "2023-06-01",
      production_meter_record_reference: "2025 landfill generation meter",
      meter_period_start_date: "2025-01-01",
      meter_period_end_date: "2025-12-31",
      metered_kwh_produced: 100_000,
      unrelated_sale_invoice_reference: "2025 utility power invoice",
      unrelated_sale_invoice_date: "2025-12-31",
      invoiced_kwh_sold: 100_000,
      unrelated_buyer_verified: true,
    },
  };
}

Deno.test("landfill gas Form 8835 line 1g reconciles source, Form 3800, native and PDF", async () => {
  const source = landfill();
  const result = f1040_2025.executeReturn({ ...base.inputs, f8835: [source] });
  assertEquals(result.diagnostics, []);
  assert(Array.isArray(result.pending.f3800.f8835_credit_entries));
  assertEquals(result.pending.f3800.f8835_credit_entries[0].credit_amount, 300);
  assertEquals(result.pending.schedule3.line6a_total, 300);
  assertEquals(result.pending.f1040.line20_nonrefundable_credits, 300);
  const prepared = await f1040_2025.prepareReturn(result.pending, base.filer);
  const parts = prepared.bundle.form3800Parts!;
  assertEquals(parts.currentRows[0].line, "4e");
  assertEquals(parts.currentAmounts[0].appliedCredit, 300);
  assertStringIncludes(
    prepared.bundle.xml,
    "<KwHrsPrdcdAndSoldLndfllGasQty>100000</KwHrsPrdcdAndSoldLndfllGasQty>",
  );
  assertStringIncludes(
    prepared.bundle.xml,
    "<KwHrsPrdcdAndSoldLndfllGsCrAmt>300</KwHrsPrdcdAndSoldLndfllGsCrAmt>",
  );
  const pending = result.pending as Record<string, Record<string, unknown>>;
  const [projected] = form8835Pdf.instances!({}, base.filer, pending, parts);
  assertEquals(projected.facility_type, "Landfill gas (municipal solid waste)");
  assertEquals(projected.line1g_quantity, 100_000);
  assertEquals(projected.line1g_credit, 300);
  assertEquals(projected.line1f_credit, undefined);
  assertEquals(projected.line15, 300);
  assertEquals(
    form8835Pdf.fields.find((field) => field.domainKey === "line1g_credit")
      ?.pdfField,
    "topmostSubform[0].Page2[0].Table_PartII_Lines1a-j[0].Line1g[0].f2_21[0]",
  );
  assert((await prepared.renderPdf()).length > 0);
  const changedSource = {
    ...pending,
    f8835: {
      f8835s: [{
        ...source,
        landfill_gas_source: {
          ...source.landfill_gas_source!,
          metered_kwh_produced: 99_999,
        },
      }],
    },
  };
  assertThrows(
    () => form8835Pdf.instances!({}, base.filer, changedSource, parts),
    Error,
    "matching dates and kWh",
  );
  const sameRecord = {
    ...pending,
    f8835: {
      f8835s: [{
        ...source,
        landfill_gas_source: {
          ...source.landfill_gas_source!,
          section45k_nonclaim_record_reference:
            source.landfill_gas_source!.feedstock_record_reference,
        },
      }],
    },
  };
  assertThrows(
    () => form8835Pdf.instances!({}, base.filer, sameRecord, parts),
    Error,
    "seven distinct",
  );
  const changedCredit = {
    ...pending,
    f3800: {
      ...pending.f3800,
      f8835_credit_entries: [{
        ...result.pending.f3800.f8835_credit_entries[0],
        credit_amount: 301,
      }],
    },
  };
  assertThrows(
    () => form8835Pdf.instances!({}, base.filer, changedCredit, parts),
    Error,
    "disagrees",
  );
  assertThrows(() =>
    itemSchema.parse({
      ...source,
      landfill_gas_source: {
        ...source.landfill_gas_source!,
        section48_biogas_credit_not_allowed_this_or_prior_year_verified: false,
      },
    }), Error);
});
