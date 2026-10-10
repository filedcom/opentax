import { PDFDocument, StandardFonts } from "pdf-lib";
import { increasedFixture } from "./form8835_increased.fixture.ts";
import { earlyFixture } from "./form8835_early.fixture.ts";
import { domesticStatementFields } from "../../../../mef/forms/credits/business/f8835_domestic_statement.ts";
import { form8835DomesticDescription } from "../../../../../nodes/inputs/credits/business/f8835/domestic-source.ts";
import {
  calculateForm8835,
  inputSchema,
} from "../../../../../nodes/inputs/credits/business/f8835/index.ts";
import { sha256Hex } from "../../../../return-processing/prepared-source.ts";

export const domesticCases = [
  {
    id: "domestic-base-current",
    count: 1,
    kwh: 100000,
    service: "2025-01-01",
    reason: "none",
    exact: true,
  },
  {
    id: "domestic-small-prior",
    count: 1,
    kwh: 100000,
    service: "2024-01-01",
    reason: "small",
    exact: false,
  },
  {
    id: "domestic-early-current",
    count: 1,
    kwh: 1000000,
    service: "2025-01-01",
    reason: "early",
    exact: false,
  },
  {
    id: "domestic-two-prior",
    count: 2,
    kwh: 1000000,
    service: "2023-12-01",
    reason: "small",
    exact: true,
  },
];

export async function domesticFixture(c: typeof domesticCases[number]) {
  const fixture = c.reason === "early"
    ? await earlyFixture({
      id: c.id,
      count: c.count,
      kwh: c.kwh,
      start: "2022-06-01",
      service: c.service,
      cost: false,
      facts: false,
    })
    : await increasedFixture(c.count, c.kwh, 900, true);
  if (c.reason === "none") fixture.attachments.length = 0;
  for (let i = 0; i < c.count; i++) {
    const f = fixture.input.f8835[i] as any;
    f.facility_placed_in_service_date = c.service;
    if (c.reason === "none") {
      f.increased_credit_reason = "none";
      f.ac_nameplate_kw = 1800;
      f.maximum_net_output_mw = 1.8;
      delete f.small_facility_source;
      delete f.increased_credit_statement_file_name;
    }
    const baseReview =
      (f.small_facility_source ?? f.early_construction_source) as any;
    const record = (name: string) => ({
      item_reference: `${i}/${name}`,
      description: `Synthetic ${name}`,
      manufacturer_reference: `Synthetic producer ${name}`,
      origin_record_reference: `Synthetic origin ${i}/${name}`,
    });
    const product = (
      name: string,
      cost: number,
      components: Array<[number, boolean]>,
    ) => ({
      ...record(name),
      total_direct_cost_cents: cost,
      all_manufacturing_processes_us: true,
      cost_record_reference: `Synthetic cost ${i}/${name}`,
      complete_component_inventory_verified: true,
      components: components.map(([amount, us], j) => ({
        ...record(`${name}/${j}`),
        manufacturer_direct_cost_cents: amount,
        all_manufacturing_processes_us: us,
        cost_record_reference: `Synthetic cost ${i}/${name}/${j}`,
      })),
    });
    const year = Number(c.service.slice(0, 4));
    const source = {
      tax_year: 2025,
      taxpayer_name: "Alex Example",
      taxpayer_tin: "111223333",
      facility_description: f.facility_description,
      facility_address_line1: f.facility_us_address.line1,
      facility_city: f.facility_us_address.city,
      facility_state: f.facility_us_address.state,
      facility_zip: f.facility_us_address.zip,
      facility_latitude: f.facility_latitude,
      facility_longitude: f.facility_longitude,
      review_reference: `Synthetic domestic review ${i}`,
      construction_record_reference: `Synthetic construction ${i}`,
      construction_began_on: f.facility_construction_start_date,
      production_meter_reference: `Synthetic meter ${i}`,
      meter_period_start: f.production_period_start_date,
      meter_period_end: f.production_period_end_date,
      metered_kwh: f.kwh_produced,
      unrelated_sale_invoice_reference: `Synthetic invoice ${i}`,
      invoiced_kwh: f.kwh_sold,
      unrelated_buyer_verified: true,
      no_investment_credit_election_verified: true,
      no_section1603_grant_verified: true,
      statement_file_name: `Domestic${i + 1}.pdf`,
      statement_sha256: "a".repeat(64),
      signer_name: "Alex Example",
      signer_authority_review_reference: `Synthetic signer review ${i}`,
      signed_on: `${year + 1}-02-01`,
      signed_perjury_declaration_reviewed: true,
      method: "actual_manufacturer_direct_costs",
      independent_new_facility_verified: true,
      complete_project_component_inventory_verified: true,
      steel_iron_and_manufactured_classification_review_reference:
        `Synthetic engineering classification ${i}`,
      manufacturer_paid_or_incurred_direct_costs_reviewed: true,
      installation_costs_excluded_verified: true,
      placed_in_service_on: c.service,
      steel_iron: [{
        ...record("structural steel"),
        all_manufacturing_processes_us_except_metallurgical_additives: true,
      }],
      manufactured_products: c.exact
        ? [product("turbine", 1000000, [[400000, true], [500000, false]])]
        : [
          product("product one", 10000, [[3000, true], [4500, true]]),
          product("product two", 20000, [[3000, true], [5000, true], [
            10000,
            false,
          ]]),
        ],
      certification_year: year,
      first_year_bonus_credit: 123,
      prior_certification: year < 2025
        ? {
          filed_return_reference:
            `Synthetic ${year} return with original certification ${i}`,
          originally_submitted_sha256: "a".repeat(64),
          original_certification_and_filing_reviewed: true,
        }
        : undefined,
    };
    f.domestic_content_bonus = true;
    f.domestic_content_statement_file_name = source.statement_file_name;
    f.domestic_content_source = source;
    if (year === 2025) {
      source.first_year_bonus_credit =
        calculateForm8835(inputSchema.parse({ f8835s: [f] }).f8835s[0]).line10;
    }
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    let page = pdf.addPage([612, 792]);
    const heading = () => {
      page.drawText("FORM 8835 DOMESTIC CONTENT CERTIFICATION", {
        x: 35,
        y: 760,
        size: 13,
        font,
      });
      page.drawText("SYNTHETIC TEST SOURCE - NOT A SIGNED FILING", {
        x: 35,
        y: 739,
        size: 10,
        font,
      });
    };
    heading();
    let y = 706;
    for (const [key, value] of Object.entries(domesticStatementFields(f))) {
      const height = key.endsWith("Declaration")
        ? 68
        : key === "FacilityAddress"
        ? 35
        : 21;
      if (y - height < 40) {
        page = pdf.addPage([612, 792]);
        heading();
        y = 706;
      }
      page.drawText(key.replace(/([A-Z])/g, " $1").trim(), {
        x: 35,
        y,
        size: 8,
        font,
      });
      const field = pdf.getForm().createTextField(`Form8835Domestic.${key}`);
      field.enableMultiline();
      field.setText(value);
      field.addToPage(page, {
        x: 35,
        y: y - height - 4,
        width: 542,
        height,
        borderWidth: 0,
      });
      field.setFontSize(10);
      field.enableReadOnly();
      y -= height + 21;
    }
    pdf.getForm().updateFieldAppearances(font);
    const bytes = await pdf.save();
    source.statement_sha256 = await sha256Hex(bytes);
    if (source.prior_certification) {
      source.prior_certification.originally_submitted_sha256 =
        source.statement_sha256;
    }
    fixture.attachments.push({
      fileName: source.statement_file_name,
      description: form8835DomesticDescription(f.facility_description),
      bytes,
    });
    // The separate increased-credit review remains independently joined.
    if (baseReview) baseReview.invoiced_kwh = f.kwh_sold;
  }
  let remaining = 23049;
  const allocation =
    fixture.input.form3800_current_production_allocation.facilities;
  for (let i = 0; i < allocation.length; i++) {
    const f = fixture.input.f8835[i];
    const gross = Math.round(f.kwh_sold * .006) * (c.reason === "none" ? 1 : 5);
    const credit = gross + Math.round(gross * .1);
    Object.assign(allocation[i], {
      facility_placed_in_service_date: c.service,
      credit_amount: credit,
      applied_credit: Math.min(credit, remaining),
    });
    remaining -= allocation[i].applied_credit;
  }
  fixture.expected = {
    production: allocation.reduce((sum, f) => sum + f.credit_amount, 0),
    productionUsed: allocation.reduce((sum, f) => sum + f.applied_credit, 0),
    tax: 25067 - 2001 -
      allocation.reduce((sum, f) => sum + f.applied_credit, 0),
  };
  return fixture;
}
