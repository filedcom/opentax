import { PDFDocument } from "pdf-lib";
import { increasedFixture } from "./form8835_increased.fixture.ts";
import { form8835EarlyConstructionDeclaration } from "../../../../../nodes/inputs/credits/business/f8835/early-construction-source.ts";
import { sha256Hex } from "../../../../return-processing/prepared-source.ts";

export const earlyCases = [
  {
    id: "early-physical-safe",
    count: 1,
    kwh: 100000,
    start: "2022-06-01",
    service: "2024-01-01",
    cost: false,
    facts: false,
  },
  {
    id: "early-cost-january28",
    count: 1,
    kwh: 200000,
    start: "2023-01-28",
    service: "2024-01-01",
    cost: true,
    facts: false,
  },
  {
    id: "early-physical-sixyear",
    count: 1,
    kwh: 1000000,
    start: "2016-06-01",
    service: "2022-12-31",
    cost: false,
    facts: false,
  },
  {
    id: "early-cost-fiveyear",
    count: 1,
    kwh: 1000000,
    start: "2020-06-01",
    service: "2025-01-01",
    cost: true,
    facts: false,
  },
  {
    id: "early-physical-history",
    count: 1,
    kwh: 100000,
    start: "2015-06-01",
    service: "2024-01-01",
    cost: false,
    facts: true,
  },
  {
    id: "early-cost-history",
    count: 1,
    kwh: 200000,
    start: "2015-06-01",
    service: "2024-01-01",
    cost: true,
    facts: true,
  },
  {
    id: "early-two-methods",
    count: 2,
    kwh: 1000000,
    start: "2022-06-01",
    service: "2024-01-01",
    cost: false,
    facts: false,
  },
  {
    id: "early-four-histories",
    count: 4,
    kwh: 300000,
    start: "2015-06-01",
    service: "2024-01-01",
    cost: false,
    facts: true,
  },
];

export async function earlyFixture(c: typeof earlyCases[number]) {
  const fixture = await increasedFixture(c.count, c.kwh, 1800, !c.cost);
  for (let i = 0; i < c.count; i++) {
    const f = fixture.input.f8835[i] as any;
    const source = { ...f.small_facility_source };
    delete source.generating_units;
    delete source.complete_generating_unit_inventory_verified;
    source.review_reference = `Synthetic early construction review ${i + 1}`;
    source.construction_began_on = c.start;
    source.capacity_record_reference = `Synthetic capacity review ${i + 1}`;
    source.ac_nameplate_kw = 1800;
    source.maximum_net_output_mw = 1.8;
    source.placed_in_service_record_reference = `Synthetic commissioning ${
      i + 1
    }`;
    source.placed_in_service_on = c.service;
    source.independent_single_facility_reviewed = true;
    source.original_new_facility_verified = true;
    source.earliest_qualifying_start_verified = true;
    const cost = c.cost || i % 2 === 1;
    const before = new Date(Date.parse(c.start + "T00:00:00Z") - 86400000)
      .toISOString().slice(0, 10);
    source.beginning = cost
      ? {
        method: "five_percent",
        complete_final_cost_inventory_verified: true,
        paid_or_incurred_tax_timing_reviewed: true,
        final_total_cost_cents: 100000000,
        costs: [
          { paid_or_incurred_on: before, eligible_cost_cents: 3000000 },
          { paid_or_incurred_on: c.start, eligible_cost_cents: 2000000 },
          { paid_or_incurred_on: c.service, eligible_cost_cents: 95000000 },
        ].map((r, j) => ({
          ...r,
          record_reference: `Synthetic cost ${i + 1}/${j + 1}`,
          included_in_depreciable_basis_verified: true,
        })),
      }
      : {
        method: "physical_work",
        record_reference: `Synthetic foundation work ${i + 1}`,
        work_began_on: c.start,
        work_description:
          "Permanent generating equipment foundations and anchor bolts",
        significant_integral_physical_work_verified: true,
        excludes_preliminary_and_inventory_work_verified: true,
        performer: "contractor",
        binding_contract_reference: `Synthetic signed contractor agreement ${
          i + 1
        }`,
        binding_contract_signed_on: before,
        enforceable_contract_reviewed: true,
      };
    const history = [];
    for (
      let year = Number(c.start.slice(0, 4));
      year <= Number(c.service.slice(0, 4));
      year++
    ) {
      history.push({
        period_start: year === Number(c.start.slice(0, 4))
          ? c.start
          : `${year}-01-01`,
        period_end: year === Number(c.service.slice(0, 4))
          ? c.service
          : `${year}-12-31`,
        record_reference: `Synthetic continuity review ${i + 1}/${year}`,
        activity_description: cost
          ? "Reviewed payments, binding component contracts and construction progress"
          : "Reviewed continuing integral equipment construction",
        supporting_record_references: [
          `Synthetic contractor progress book ${i + 1}/${year}`,
        ],
        continuity_requirement_for_period_reviewed: true,
      });
    }
    source.continuity = c.facts
      ? {
        method: cost ? "continuous_efforts" : "continuous_construction",
        review_reference: `Synthetic complete history ${i + 1}`,
        complete_history_reviewed: true,
        history,
      }
      : {
        method: "safe_harbor",
        review_reference: `Synthetic calendar safe harbor ${i + 1}`,
      };
    delete f.small_facility_source;
    f.early_construction_source = source;
    f.increased_credit_reason = "construction_before_2023_01_29";
    f.facility_construction_start_date = c.start;
    f.facility_placed_in_service_date = c.service;
    fixture.input.form3800_current_production_allocation.facilities[i]
      .facility_placed_in_service_date = c.service;
    const pdf = await PDFDocument.load(fixture.attachments[i].bytes);
    const form = pdf.getForm();
    form.getTextField("Form8835Increase.ReviewReference").setText(
      source.review_reference,
    );
    form.getTextField("Form8835Increase.Declaration").setText(
      form8835EarlyConstructionDeclaration(f),
    );
    const bytes = await pdf.save();
    source.statement_sha256 = await sha256Hex(bytes);
    fixture.attachments[i].bytes = bytes;
  }
  return fixture;
}
