import { PDFDocument, StandardFonts } from "pdf-lib";
import { fixture } from "./form3800_k1_inventory.fixture.ts";
import { form8835IncreaseDescription } from "../../../../../nodes/inputs/credits/business/f8835/increase-source.ts";
import {
  increasedCreditPerjury,
  smallFacilityDeclaration,
} from "../../../../mef/forms/credits/business/f8835_increase_statement.ts";
import { sha256Hex } from "../../../../return-processing/prepared-source.ts";

export async function increasedFixture(
  count: number,
  kwh: number,
  capacity: number,
  wind: boolean,
) {
  const base = fixture({ count: 2, credit: 1000, mixed: true });
  const attachments = [];
  const facilities = [];
  for (let i = 0; i < count; i++) {
    const description = `Synthetic small facility ${i + 1}`;
    const fileName = `Increase${i + 1}.pdf`;
    const source = {
      tax_year: 2025 as const,
      taxpayer_name: "Alex Example",
      taxpayer_tin: "111223333",
      facility_description: description,
      facility_address_line1: `${10 + i} Plant Road`,
      facility_latitude: 39.123456 + i / 8,
      facility_longitude: -75.123456,
      review_reference: `Synthetic capacity and statement review ${i + 1}`,
      complete_generating_unit_inventory_verified: true as const,
      measured_in_alternating_current_verified: true as const,
      construction_record_reference: `Synthetic construction ${i + 1}`,
      construction_began_on: "2023-06-01",
      production_meter_reference: `Synthetic meter ${i + 1}`,
      meter_period_start: "2025-01-01",
      meter_period_end: "2025-12-31",
      metered_kwh: kwh + i * 10000,
      unrelated_sale_invoice_reference: `Synthetic invoice ${i + 1}`,
      invoiced_kwh: kwh + i * 10000,
      unrelated_buyer_verified: true as const,
      no_investment_credit_election_verified: true as const,
      no_section1603_grant_verified: true as const,
      generating_units: [
        Math.floor(capacity / 2),
        capacity - Math.floor(capacity / 2),
      ].map((kw, j) => ({
        unit_reference: `Synthetic generator ${i + 1}/${j + 1}`,
        capacity_record_reference: `Synthetic nameplate ${i + 1}/${j + 1}`,
        nameplate_kw_ac: kw,
      })),
      statement_file_name: fileName,
      statement_sha256: "",
      signer_name: "Alex Example",
      signer_authority_review_reference: `Synthetic signer review ${i + 1}`,
      signed_on: "2026-02-01",
      signed_perjury_declaration_reviewed: true as const,
    };
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    page.drawText("FORM 8835 INCREASED CREDIT AMOUNT STATEMENT", {
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
    const entries = {
      TaxpayerName: source.taxpayer_name,
      TaxpayerTIN: source.taxpayer_tin,
      TaxYear: "2025",
      FacilityDescription: description,
      FacilityStreet: source.facility_address_line1,
      FacilityCoordinates:
        `${source.facility_latitude}, ${source.facility_longitude}`,
      MaximumNetOutputMW: String(capacity / 1000),
      ReviewReference: source.review_reference,
      SignerName: source.signer_name,
      SignedOn: source.signed_on,
      Declaration: smallFacilityDeclaration,
      PerjuryDeclaration: increasedCreditPerjury,
    };
    let y = 706;
    for (const [key, value] of Object.entries(entries)) {
      const multiline = key.endsWith("Declaration");
      const height = multiline ? (key === "PerjuryDeclaration" ? 65 : 42) : 21;
      page.drawText(key.replace(/([A-Z])/g, " $1").trim(), {
        x: 35,
        y,
        size: 8,
        font,
      });
      const field = pdf.getForm().createTextField(`Form8835Increase.${key}`);
      if (multiline) field.enableMultiline();
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
    attachments.push({
      fileName,
      description: form8835IncreaseDescription(description),
      bytes,
    });
    facilities.push({
      energy_type: wind && i % 2 === 0 ? "WIND" : "GEOTHERMAL",
      subject_to_passive_activity_limit: false,
      kwh_produced: source.metered_kwh,
      kwh_sold: source.invoiced_kwh,
      facility_description: description,
      facility_us_address: {
        line1: source.facility_address_line1,
        city: "Wilmington",
        state: "DE",
        zip: "19801",
      },
      facility_latitude: source.facility_latitude,
      facility_longitude: source.facility_longitude,
      facility_owned_by_filer: true,
      ac_nameplate_kw: capacity,
      maximum_net_output_mw: capacity / 1000,
      facility_placed_in_service_date: "2024-01-01",
      facility_construction_start_date: "2023-06-01",
      production_period_start_date: "2025-01-01",
      production_period_end_date: "2025-12-31",
      increased_credit_reason: "under_one_mw",
      increased_credit_statement_file_name: fileName,
      small_facility_source: source,
      domestic_content_bonus: false,
      energy_community_bonus: false,
      is_fiscal_year: false,
    });
  }
  let remaining = 23049;
  const allocation = facilities.map((f) => {
    const credit = Math.round(f.kwh_sold * .006) * 5;
    const used = Math.min(credit, remaining);
    remaining -= used;
    return {
      facility_description: f.facility_description,
      facility_us_address: f.facility_us_address,
      facility_latitude: f.facility_latitude,
      facility_longitude: f.facility_longitude,
      energy_type: f.energy_type,
      facility_placed_in_service_date: f.facility_placed_in_service_date,
      production_period_start_date: f.production_period_start_date,
      production_period_end_date: f.production_period_end_date,
      form3800_line: "4e",
      credit_amount: credit,
      applied_credit: used,
    };
  });
  return {
    attachments,
    input: {
      ...base,
      f8835: facilities,
      form3800_current_orphan_allocation: {
        tax_year: 2025,
        return_primary_ssn: "111223333",
        review_reference: "Synthetic current orphan source review",
        complete_current_orphan_drug_inventory_confirmed: true,
        sources: [{
          source_type: "partnership",
          source_ein: "100000000",
          source_document_reference: "Synthetic reviewed 2025 clinical K-1 1",
          credit_amount: 1000,
          applied_credit: 1000,
        }, {
          source_type: "s_corporation",
          source_ein: "100000001",
          source_document_reference: "Synthetic reviewed 2025 clinical K-1 2",
          credit_amount: 1001,
          applied_credit: 1001,
        }],
      },
      form3800_current_production_allocation: {
        tax_year: 2025,
        return_primary_ssn: "111223333",
        review_reference: "Synthetic complete increased-credit allocation",
        complete_current_production_inventory_confirmed: true,
        facilities: allocation,
      },
    },
    expected: {
      production: allocation.reduce((s, f) => s + f.credit_amount, 0),
      productionUsed: allocation.reduce((s, f) => s + f.applied_credit, 0),
      tax: 25067 - 2001 - allocation.reduce((s, f) => s + f.applied_credit, 0),
    },
  };
}
