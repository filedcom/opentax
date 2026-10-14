import { PDFDocument } from "pdf-lib";
import { domesticFixture } from "./form8835_domestic.fixture.ts";
import { increasedFixture } from "./form8835_increased.fixture.ts";
import { earlyFixture } from "./form8835_early.fixture.ts";
import { sha256Hex } from "../../../../return-processing/prepared-source.ts";

export const communityCases = [
  {
    id: "community-coal-adjoining",
    kind: "coal",
    reason: "none",
    capacity: 1800,
    count: 1,
    kwh: 100000,
    domestic: false,
  },
  {
    id: "community-coal-new-small",
    kind: "new_coal",
    reason: "small",
    capacity: 900,
    count: 1,
    kwh: 100000,
    domestic: false,
  },
  {
    id: "community-statistical-early-year",
    kind: "old_stat",
    reason: "none",
    capacity: 1800,
    count: 1,
    kwh: 100000,
    domestic: false,
  },
  {
    id: "community-statistical-vintage2",
    kind: "new_stat",
    reason: "none",
    capacity: 1800,
    count: 1,
    kwh: 100000,
    domestic: false,
  },
  {
    id: "community-brownfield-phase1-5mw",
    kind: "phase_i",
    reason: "none",
    capacity: 5000,
    count: 1,
    kwh: 100000,
    domestic: false,
  },
  {
    id: "community-brownfield-phase2-6mw",
    kind: "phase_ii",
    reason: "none",
    capacity: 6000,
    count: 1,
    kwh: 100000,
    domestic: false,
  },
  {
    id: "community-brownfield-early-construction",
    kind: "phase_ii",
    reason: "early",
    capacity: 1800,
    count: 1,
    kwh: 1000000,
    domestic: false,
  },
  {
    id: "community-two-domestic-government",
    kind: "government",
    reason: "small",
    capacity: 900,
    count: 2,
    kwh: 1000000,
    domestic: true,
  },
];

export async function communityFixture(c: typeof communityCases[number]) {
  const fixture = c.domestic
    ? await domesticFixture({
      id: c.id,
      count: c.count,
      kwh: c.kwh,
      service: "2024-01-01",
      reason: "small",
      exact: true,
    })
    : c.reason === "early"
    ? await earlyFixture({
      id: c.id,
      count: c.count,
      kwh: c.kwh,
      start: "2022-06-01",
      service: "2024-01-01",
      cost: false,
      facts: false,
    })
    : await increasedFixture(c.count, c.kwh, c.capacity, true);
  if (c.reason === "none") fixture.attachments.length = 0;
  for (let i = 0; i < c.count; i++) {
    const f = fixture.input.f8835[i] as any;
    if (c.reason === "none") {
      f.increased_credit_reason = "none";
      delete f.small_facility_source;
      delete f.increased_credit_statement_file_name;
    }
    const place = c.kind === "coal"
      ? ["Bay Minette", "AL", "36507", 30.883333, -87.783333]
      : c.kind === "new_coal"
      ? ["Oneonta", "AL", "35121", 33.95, -86.47]
      : c.kind === "old_stat"
      ? ["Fairbanks", "AK", "99701", 64.837778, -147.716389]
      : c.kind === "new_stat"
      ? ["Clinton", "IL", "61727", 40.153611, -88.964444]
      : ["Wilmington", "DE", "19801", 39.74, -75.55];
    Object.assign(f.facility_us_address, {
      city: place[0],
      state: place[1],
      zip: place[2],
    });
    f.facility_latitude = Number(place[3]) + i / 100;
    f.facility_longitude = Number(place[4]);
    f.ac_nameplate_kw = c.capacity;
    f.maximum_net_output_mw = c.capacity / 1000;
    for (
      const s of [
        f.small_facility_source,
        f.early_construction_source,
        f.domestic_content_source,
      ].filter(Boolean)
    ) {
      s.facility_latitude = f.facility_latitude;
      s.facility_longitude = f.facility_longitude;
      if (s.facility_city) {
        Object.assign(s, {
          facility_city: place[0],
          facility_state: place[1],
          facility_zip: place[2],
        });
      }
    }
    const qdate = c.kind === "old_stat" ? "2025-06-22" : "2025-06-23";
    const qualification = c.kind === "coal" || c.kind === "new_coal"
      ? {
        category: "coal_closure",
        census_2020_tract_fips: c.kind === "coal"
          ? "01003010100"
          : "01009050105",
        notice_appendix: c.kind === "coal" ? "2023-29-C" : "2025-31-4",
        tract_boundary_and_unit_location_review_reference:
          `Synthetic 2020 tract location review ${i}`,
      }
      : c.kind === "old_stat" || c.kind === "new_stat"
      ? {
        category: "statistical_area",
        county_fips: c.kind === "old_stat" ? "02090" : "17039",
        notice_appendix: c.kind === "old_stat" ? "2024-48-1" : "2025-31-3",
        vintage: c.kind === "old_stat" ? "vintage1" : "vintage2",
        county_boundary_and_unit_location_review_reference:
          `Synthetic county location review ${i}`,
      }
      : {
        category: "brownfield",
        parcel_reference: `Synthetic parcel ${i}`,
        parcel_boundary_record_reference: `Synthetic parcel boundary ${i}`,
        unit_within_reviewed_parcel_verified: true,
        cercla_101_39_b_exclusions_review_reference:
          `Synthetic excluded-site review ${i}`,
        excluded_site_categories_absent_verified: true,
        condition_as_of: qdate,
        report_reference: `Synthetic environmental report ${i}`,
        report_completed_on: "2025-02-01",
        method: c.kind === "government"
          ? {
            kind: "government_assessment",
            government_authority: "Synthetic state environmental agency",
            government_level: "state",
            assessed_as_cercla_brownfield_verified: true,
          }
          : c.kind === "phase_i"
          ? {
            kind: "phase_i",
            astm_standard: "E1527",
            standard_edition: "E1527-21",
            current_applicable_standard_review_reference:
              "Synthetic standard review",
            presence_or_potential_contamination_identified_verified: true,
          }
          : {
            kind: "phase_ii",
            astm_standard: "E1903",
            standard_edition: "E1903-19",
            current_applicable_standard_review_reference:
              "Synthetic standard review",
            hazardous_substance_pollutant_or_contaminant_present_verified: true,
          },
      };
    const units = f.small_facility_source?.generating_units ??
      [0, 1].map((j) => ({
        unit_reference: `Synthetic unit ${i}/${j}`,
        capacity_record_reference: `Synthetic capacity ${i}/${j}`,
        nameplate_kw_ac: c.capacity / 2,
      }));
    f.energy_community_source = {
      tax_year: 2025,
      method: "annual_nameplate_capacity",
      taxpayer_name: "Alex Example",
      taxpayer_tin: "111223333",
      facility_description: f.facility_description,
      facility_address_line1: f.facility_us_address.line1,
      facility_city: f.facility_us_address.city,
      facility_state: f.facility_us_address.state,
      facility_zip: f.facility_us_address.zip,
      facility_latitude: f.facility_latitude,
      facility_longitude: f.facility_longitude,
      review_reference: `Synthetic annual community review ${i}`,
      qualification_date: qdate,
      original_onshore_facility_verified: true,
      complete_generating_unit_inventory_verified: true,
      units_and_capacity_as_of_qualification_date_verified: true,
      generating_units_unchanged_through_production_period_verified: true,
      ac_manufacturer_nameplate_measurement_verified: true,
      construction_record_reference: `Synthetic community construction ${i}`,
      construction_began_on: f.facility_construction_start_date,
      placed_in_service_record_reference: `Synthetic community service ${i}`,
      placed_in_service_on: f.facility_placed_in_service_date,
      production_meter_reference: `Synthetic community meter ${i}`,
      meter_period_start: f.production_period_start_date,
      meter_period_end: f.production_period_end_date,
      metered_kwh: f.kwh_produced,
      unrelated_sale_invoice_reference: `Synthetic community sale ${i}`,
      invoiced_kwh: f.kwh_sold,
      unrelated_buyer_verified: true,
      no_investment_credit_election_verified: true,
      no_section1603_grant_verified: true,
      generating_units: units.map((u: any, j: number) => ({
        ...u,
        latitude: f.facility_latitude,
        longitude: f.facility_longitude + j / 100,
        geolocation_record_reference: `Synthetic unit location ${i}/${j}`,
        us_or_territory_location_verified: true,
        qualification: j === 0 ? qualification : { category: "not_counted" },
      })),
    };
    f.energy_community_bonus = true;
    // Rewrite synthetic source forms when relocating the synthetic facility.
    // Retained real signed documents are never modified by this fixture.
    for (
      const s of [
        f.small_facility_source,
        f.early_construction_source,
        f.domestic_content_source,
      ].filter(Boolean)
    ) {
      const a = fixture.attachments.find((a) =>
        a.fileName === s.statement_file_name
      )!;
      const pdf = await PDFDocument.load(a.bytes);
      const domestic = s === f.domestic_content_source;
      const prefix = domestic ? "Form8835Domestic." : "Form8835Increase.";
      pdf.getForm().getTextField(prefix + "FacilityCoordinates").setText(
        `${f.facility_latitude}, ${f.facility_longitude}`,
      );
      if (domestic) {
        pdf.getForm().getTextField(prefix + "FacilityAddress").setText(
          `${f.facility_us_address.line1}, ${f.facility_us_address.city}, ${f.facility_us_address.state} ${f.facility_us_address.zip}`,
        );
      }
      a.bytes = await pdf.save();
      s.statement_sha256 = await sha256Hex(a.bytes);
      if (s.prior_certification) {
        s.prior_certification.originally_submitted_sha256 = s.statement_sha256;
      }
    }
  }
  let remaining = 23049;
  const allocation =
    fixture.input.form3800_current_production_allocation.facilities;
  for (let i = 0; i < allocation.length; i++) {
    const f = fixture.input.f8835[i];
    const base = Math.round(f.kwh_sold * .006) * (c.reason === "none" ? 1 : 5);
    const credit = base + Math.round(base * .1) * (c.domestic ? 2 : 1);
    Object.assign(allocation[i], {
      facility_us_address: f.facility_us_address,
      facility_latitude: f.facility_latitude,
      facility_longitude: f.facility_longitude,
      credit_amount: credit,
      applied_credit: Math.min(credit, remaining),
    });
    remaining -= allocation[i].applied_credit;
  }
  fixture.expected = {
    production: allocation.reduce((n, f) => n + f.credit_amount, 0),
    productionUsed: allocation.reduce((n, f) => n + f.applied_credit, 0),
    tax: 25067 - 2001 - allocation.reduce((n, f) => n + f.applied_credit, 0),
  };
  return fixture;
}
