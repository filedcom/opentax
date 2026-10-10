import { PDFDocument } from "pdf-lib";
import { communityFixture } from "./form8835_community.fixture.ts";
import { form8835EarlyConstructionDeclaration } from "../../../../../nodes/inputs/credits/business/f8835/early-construction-source.ts";
import { domesticStatementFields } from "../../../../mef/forms/credits/business/f8835_domestic_statement.ts";
import { sha256Hex } from "../../../../return-processing/prepared-source.ts";

export const communityBocCases = [
  {
    id: "boc-physical-january1",
    kind: "stat2023",
    reason: "early",
    start: "2023-01-01",
    service: "2024-01-01",
    cost: false,
    history: false,
    count: 1,
    domestic: false,
  },
  {
    id: "boc-cost-january28",
    kind: "stat2023",
    reason: "early",
    start: "2023-01-28",
    service: "2024-01-01",
    cost: true,
    history: false,
    count: 1,
    domestic: false,
  },
  {
    id: "boc-january29-base",
    kind: "stat2023",
    reason: "none",
    start: "2023-01-29",
    service: "2024-01-01",
    cost: false,
    history: false,
    count: 1,
    domestic: false,
  },
  {
    id: "boc-physical-2024-small",
    kind: "stat2024",
    reason: "small",
    start: "2024-06-07",
    service: "2025-07-01",
    cost: false,
    history: false,
    count: 1,
    domestic: false,
  },
  {
    id: "boc-cost-brownfield",
    kind: "brownfield",
    reason: "none",
    start: "2023-06-01",
    service: "2024-01-01",
    cost: true,
    history: false,
    count: 1,
    domestic: false,
  },
  {
    id: "boc-physical-coal",
    kind: "coal",
    reason: "none",
    start: "2023-06-01",
    service: "2024-01-01",
    cost: false,
    history: false,
    count: 1,
    domestic: false,
  },
  {
    id: "boc-cost-continuous-efforts",
    kind: "stat2023",
    reason: "none",
    start: "2023-06-01",
    service: "2025-01-01",
    cost: true,
    history: true,
    count: 1,
    domestic: false,
  },
  {
    id: "boc-physical-continuous-construction",
    kind: "stat2023",
    reason: "none",
    start: "2023-06-01",
    service: "2025-01-01",
    cost: false,
    history: true,
    count: 1,
    domestic: false,
  },
  {
    id: "boc-two-domestic-retroactive-list",
    kind: "stat2024addition",
    reason: "small",
    start: "2023-06-01",
    service: "2024-01-01",
    cost: true,
    history: false,
    count: 2,
    domestic: true,
  },
];

export async function communityBocFixture(c: typeof communityBocCases[number]) {
  const fixture = await communityFixture({
    id: c.id,
    kind: c.kind === "brownfield"
      ? "phase_ii"
      : c.kind === "coal"
      ? "coal"
      : "old_stat",
    reason: c.reason,
    capacity: c.reason === "small"
      ? 900
      : c.kind === "brownfield"
      ? 6000
      : 1800,
    count: c.count,
    kwh: c.domestic ? 1000000 : c.history ? 300000 : 100000,
    domestic: c.domestic,
  });
  for (let i = 0; i < c.count; i++) {
    const f = fixture.input.f8835[i] as any;
    const source = f.energy_community_source;
    if (c.kind === "stat2023") {
      Object.assign(f.facility_us_address, {
        city: "Corinth",
        state: "MS",
        zip: "38834",
      });
      f.facility_latitude = 34.934167 + i / 100;
      f.facility_longitude = -88.522222;
    } else if (c.kind === "stat2024addition") {
      Object.assign(f.facility_us_address, {
        city: "Wilmington",
        state: "DE",
        zip: "19801",
      });
      f.facility_latitude = 39.74 + i / 100;
      f.facility_longitude = -75.55;
    }
    f.facility_construction_start_date = c.start;
    f.facility_placed_in_service_date = c.service;
    f.production_period_start_date = c.service > "2025-01-01"
      ? c.service
      : "2025-01-01";
    const cost = c.cost && i % 2 === 0;
    const beginning = cost
      ? {
        method: "five_percent",
        complete_final_cost_inventory_verified: true,
        paid_or_incurred_tax_timing_reviewed: true,
        final_total_cost_cents: 1000000,
        costs: [
          {
            record_reference: `Synthetic first basis cost ${i}`,
            paid_or_incurred_on: "2022-12-31",
            eligible_cost_cents: 40000,
            included_in_depreciable_basis_verified: true,
          },
          {
            record_reference: `Synthetic threshold basis cost ${i}`,
            paid_or_incurred_on: c.start,
            eligible_cost_cents: 10000,
            included_in_depreciable_basis_verified: true,
          },
          {
            record_reference: `Synthetic remaining basis cost ${i}`,
            paid_or_incurred_on: c.service,
            eligible_cost_cents: 950000,
            included_in_depreciable_basis_verified: true,
          },
        ],
      }
      : {
        method: "physical_work",
        record_reference: `Synthetic foundation work ${i}`,
        work_began_on: c.start,
        work_description:
          "Integral foundation work; reviewed as significant and not preliminary or inventory production",
        significant_integral_physical_work_verified: true,
        excludes_preliminary_and_inventory_work_verified: true,
        performer: "contractor",
        binding_contract_reference: `Synthetic binding project contract ${i}`,
        binding_contract_signed_on: "2022-12-30",
        enforceable_contract_reviewed: true,
      };
    const continuity = c.history
      ? {
        method: cost ? "continuous_efforts" : "continuous_construction",
        review_reference: `Synthetic continuity ${i}`,
        complete_history_reviewed: true,
        history: [[c.start, "2023-12-31"], ["2024-01-01", c.service]].map((
          [start, end],
          j,
        ) => ({
          period_start: start,
          period_end: end,
          record_reference: `Synthetic continuous period ${i}/${j}`,
          activity_description:
            "Reviewed construction activity through commissioning",
          supporting_record_references: [
            `Synthetic activity records ${i}/${j}`,
          ],
          continuity_requirement_for_period_reviewed: true,
        })),
      }
      : {
        method: "safe_harbor",
        review_reference: `Synthetic continuity ${i}`,
      };
    source.method = "beginning_of_construction_nameplate";
    source.qualification_date = c.start;
    delete source.units_and_capacity_as_of_qualification_date_verified;
    source.unit_locations_fixed_from_beginning_of_construction_verified = true;
    source.original_project_and_final_units_reconciled = true;
    source.independent_single_facility_reviewed = true;
    source.construction_history = {
      beginning,
      continuity,
      earliest_qualifying_start_verified: true,
    };
    for (
      const s of [
        source,
        f.small_facility_source,
        f.early_construction_source,
        f.domestic_content_source,
      ].filter(Boolean)
    ) {
      Object.assign(s, {
        facility_latitude: f.facility_latitude,
        facility_longitude: f.facility_longitude,
        construction_began_on: c.start,
        meter_period_start: f.production_period_start_date,
      });
      if (s.placed_in_service_on) s.placed_in_service_on = c.service;
      if (s.facility_city) {
        Object.assign(s, {
          facility_city: f.facility_us_address.city,
          facility_state: f.facility_us_address.state,
          facility_zip: f.facility_us_address.zip,
        });
      }
    }
    if (f.early_construction_source) {
      Object.assign(f.early_construction_source, { beginning, continuity });
    }
    for (const u of source.generating_units) {
      u.latitude = f.facility_latitude;
      u.longitude = f.facility_longitude;
    }
    const q = source.generating_units[0].qualification;
    if (c.kind.startsWith("stat")) {
      q.notice_appendix = c.kind === "stat2023"
        ? "2023-47-2"
        : c.kind === "stat2024addition"
        ? "2024-30-2"
        : "2024-48-1";
      q.county_fips = c.kind === "stat2023"
        ? "28003"
        : c.kind === "stat2024addition"
        ? "10003"
        : "02090";
      q.vintage = "vintage1";
    } else if (c.kind === "brownfield") {
      q.condition_as_of = c.start;
      q.report_completed_on = "2023-05-01";
    } else {
      q.historical_closure_review = {
        closure_type: "retired_coal_generating_unit",
        closure_occurred_on: "2015-01-01",
        closure_record_reference: "Synthetic dated retirement record",
        listed_tract_and_closure_location_review_reference:
          "Synthetic historical directly-adjoining tract review",
        qualifying_closure_or_direct_adjacency_as_of_start_verified: true,
      };
    }
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
      if (s === f.domestic_content_source) {
        for (const [key, value] of Object.entries(domesticStatementFields(f))) {
          pdf.getForm().getTextField(`Form8835Domestic.${key}`).setText(value);
        }
      } else {
        pdf.getForm().getTextField("Form8835Increase.FacilityCoordinates")
          .setText(`${f.facility_latitude}, ${f.facility_longitude}`);
        if (s === f.early_construction_source) {
          pdf.getForm().getTextField("Form8835Increase.Declaration").setText(
            form8835EarlyConstructionDeclaration(f),
          );
        }
      }
      a.bytes = await pdf.save();
      s.statement_sha256 = await sha256Hex(a.bytes);
      if (s.prior_certification) {
        s.prior_certification.originally_submitted_sha256 = s.statement_sha256;
      }
    }
    Object.assign(
      fixture.input.form3800_current_production_allocation.facilities[i],
      {
        facility_us_address: f.facility_us_address,
        facility_latitude: f.facility_latitude,
        facility_longitude: f.facility_longitude,
        facility_placed_in_service_date: c.service,
        production_period_start_date: f.production_period_start_date,
      },
    );
  }
  return fixture;
}
