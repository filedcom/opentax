import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { registry } from "../registry.ts";
import { buildMefBundle } from "../mef/builder.ts";
import { buildPending } from "../mef/pending.ts";
import { buildPdfBytes } from "./builder.ts";
import { pdfReviewFixtures } from "./review-fixtures.ts";

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-section-a-capital-gain-reduction-gift"
)!;

async function evidence(label: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  page.drawText(`Synthetic test evidence: ${label}`, {
    x: 48,
    y: 740,
    font: await pdf.embedFont(StandardFonts.Helvetica),
    size: 11,
  });
  return pdf.save();
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

for (const propertyType of ["equipment", "art_under_20000"] as const) {
Deno.test(`Section B purchased short-term ${propertyType} joins reviewed bytes, Schedule A, native MeF, and PDF`, async () => {
  const purchase = await evidence("invoice and basis $12,000, 2025-01-15");
  const appraisal = await evidence(`signed appraisal: ${propertyType} FMV $18,000`);
  const signedForm = await evidence(`completed signed Form 8283 for ${propertyType}`);
  const reduction = await evidence("FMV $18,000 less short-term gain $6,000 equals claim $12,000");
  const appraiserSignature = await evidence("appraiser signature");
  const doneeSignature = await evidence("donee signature");
  const address = { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" };
  const item = {
    property_description: propertyType === "equipment"
      ? "Unused personal audio equipment, serial ST-8283"
      : "Purchased framed painting, catalog ST-8283",
    property_type: propertyType,
    physical_condition: "Good used condition",
    date_acquired: "2025-01-15",
    donor_acquisition_description: "Purchase",
    date_contributed: "2025-06-01",
    fmv: 18_000,
    deduction_claimed: 12_000,
    cost_or_adjusted_basis: 12_000,
    charitable_limit_category: "noncash_50",
    is_capital_gain_property: false,
    signed_form_attachment_file_name: "Signed8283.pdf",
    signed_form_source_review: {
      reviewed_by: "Synthetic reviewer", reviewed_on: "2025-09-01",
      pdf_sha256: await sha256(signedForm),
      appraiser_signature_present: true, donee_signature_present: true,
      matches_electronic_form_confirmed: true,
    },
    qualified_appraisal: {
      appraiser_first_name: "Jane", appraiser_last_name: "Smith",
      signed_date: "2025-05-28", appraiser_ein: "123456789",
      signed_by_appraiser: true, us_address: address,
      signature_attachment_file_name: "AppraiserSignature.pdf",
      attachment_file_name: "FullAppraisal.pdf",
      full_appraisal_source_review: {
        reviewed_by: "Synthetic reviewer", reviewed_on: "2025-09-01",
        pdf_sha256: await sha256(appraisal), signed_appraisal_confirmed: true,
        donated_property_matches_confirmed: true,
        appraised_fmv_matches_confirmed: true,
      },
    },
    donee_acknowledgment: {
      organization_name: "City Charity", ein: "987654321",
      received_date: "2025-06-01", signed_by_donee: true,
      unrelated_use: false, us_address: address,
      signature_attachment_file_name: "DoneeSignature.pdf",
    },
    short_term_tangible_reduction: {
      short_term_gain_removed: 6_000,
      purchase_record_attachment_file_name: "PurchaseRecord.pdf",
      purchase_record_review: {
        reviewed_by: "Synthetic reviewer", reviewed_on: "2025-09-01",
        pdf_sha256: await sha256(purchase),
        property_dates_basis_match_confirmed: true,
        capital_asset_not_inventory_confirmed: true,
        no_depreciation_or_recapture_confirmed: true,
        donor_did_not_create_property_confirmed: true,
      },
      reduction_statement_attachment_file_name: "ReductionStatement.pdf",
      reduction_statement_review: {
        reviewed_by: "Synthetic reviewer", reviewed_on: "2025-09-01",
        pdf_sha256: await sha256(reduction),
        property_and_fmv_match_confirmed: true,
        basis_and_short_term_gain_match_confirmed: true,
        reduced_claim_matches_confirmed: true,
      },
    },
  };
  const result = execute(buildExecutionPlan(registry), registry, {
    ...base.inputs,
    schedule_a: {
      line_5a_state_income_tax: 24_000,
      line_8a_mortgage_interest_1098: 12_000,
      current_noncash_gift_inventory_complete_confirmed: true,
      other_prior_charitable_carryovers_absent_confirmed: true,
      capital_gain_property_carryovers: [],
    },
    f8283: { section_b_items: [item] },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_a.line_12_noncash_contributions, 12_000);
  assertEquals(result.pending.f1040.line12e_itemized_deductions, 48_000);
  const pending = buildPending(result.pending);
  const attachments = [
    { fileName: "PurchaseRecord.pdf", description: "Form 8283 Section B purchase and basis record", bytes: purchase },
    { fileName: "FullAppraisal.pdf", description: `Qualified Appraisal for Section B ${propertyType}`, bytes: appraisal },
    { fileName: "Signed8283.pdf", description: "Form 8283 completed signed Section B", bytes: signedForm },
    { fileName: "ReductionStatement.pdf", description: "Form 8283 Section B FMV reduction statement", bytes: reduction },
    { fileName: "AppraiserSignature.pdf", description: "Form 8283 appraiser signature document", bytes: appraiserSignature },
    { fileName: "DoneeSignature.pdf", description: "Form 8283 Donee signature document", bytes: doneeSignature },
  ];
  const bundle = await buildMefBundle(pending, { filer: base.filer, attachments });
  assertStringIncludes(bundle.xml, "<AppraisedFairMarketValueAmt>18000</AppraisedFairMarketValueAmt>");
  assertStringIncludes(bundle.xml, "<DeductionClaimedAmt>12000</DeductionClaimedAmt>");
  assertStringIncludes(bundle.xml, "<OtherThanByCashOrCheckAmt>12000</OtherThanByCashOrCheckAmt>");
  assertStringIncludes(bundle.xml, propertyType === "equipment"
    ? "<EquipmentInd>X</EquipmentInd>"
    : "<ArtWorthLssThan20000DollarsInd>X</ArtWorthLssThan20000DollarsInd>");
  const filled = await buildPdfBytes(pending, base.filer, ".pdf-cache", bundle);
  assertEquals((await PDFDocument.load(filled)).getPageCount() > 0, true);
  await assertRejects(() => buildMefBundle(pending, {
    filer: base.filer,
    attachments: attachments.map((entry) => entry.fileName === "ReductionStatement.pdf"
      ? { ...entry, bytes: purchase }
      : entry),
  }), Error, "bytes differ from reviewed SHA-256");
  await assertRejects(() => buildMefBundle({
    ...pending,
    f1040: { ...pending.f1040, line12e_itemized_deductions: 47_999 },
  }, { filer: base.filer, attachments }), Error, "itemized total");
});
}
