import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { inputSchema as form8283InputSchema } from "../../nodes/inputs/f8283/index.ts";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { registry } from "../registry.ts";
import { buildMefBundle } from "../mef/builder.ts";
import { buildPending } from "../mef/pending.ts";
import { buildPdfBytes } from "./builder.ts";
import { form8283Pdf } from "./forms/f8283.ts";
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
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)),
  );
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

Deno.test("Section B unrelated-use camera equipment joins source, Schedule A, native MeF, and PDF", async () => {
  const files = await Promise.all([
    evidence("purchased vintage camera equipment, 2023-01-15, basis $12000"),
    evidence(
      "donee displays camera equipment in executive office unrelated to education; no 2025 disposition",
    ),
    evidence(
      "FMV $18000 less unrelated-use appreciation $6000 equals claim $12000",
    ),
    evidence("signed appraisal of purchased camera equipment FMV $18000"),
    evidence("completed signed Form 8283, appraiser and donee"),
    evidence("appraiser signature"),
    evidence("donee signature"),
  ]);
  const [
    purchase,
    use,
    reduction,
    appraisal,
    signed,
    appraiserSign,
    doneeSign,
  ] = files;
  const review = async (bytes: Uint8Array) => ({
    reviewed_by: "Synthetic reviewer",
    reviewed_on: "2025-09-01",
    pdf_sha256: await sha256(bytes),
  });
  const address = {
    line1: "1 Main St",
    city: "Austin",
    state: "TX",
    zip: "78701",
  };
  const item = {
    property_description: "Purchased vintage camera equipment, lot CAM-15",
    property_type: "equipment",
    physical_condition: "Good used condition",
    date_acquired: "2023-01-15",
    donor_acquisition_description: "Purchase",
    date_contributed: "2025-06-01",
    fmv: 18_000,
    deduction_claimed: 12_000,
    cost_or_adjusted_basis: 12_000,
    charitable_limit_category: "noncash_50",
    is_capital_gain_property: true,
    signed_form_attachment_file_name: "Signed8283.pdf",
    signed_form_source_review: {
      ...await review(signed),
      appraiser_signature_present: true,
      donee_signature_present: true,
      matches_electronic_form_confirmed: true,
    },
    qualified_appraisal: {
      appraiser_first_name: "Jane",
      appraiser_last_name: "Smith",
      signed_date: "2025-05-28",
      appraiser_ein: "123456789",
      signed_by_appraiser: true,
      us_address: address,
      signature_attachment_file_name: "AppraiserSignature.pdf",
      attachment_file_name: "FullAppraisal.pdf",
      full_appraisal_source_review: {
        ...await review(appraisal),
        signed_appraisal_confirmed: true,
        donated_property_matches_confirmed: true,
        appraised_fmv_matches_confirmed: true,
      },
    },
    donee_acknowledgment: {
      organization_name: "City Education Charity",
      ein: "987654321",
      received_date: "2025-06-01",
      signed_by_donee: true,
      unrelated_use: true,
      us_address: address,
      signature_attachment_file_name: "DoneeSignature.pdf",
    },
    unrelated_use_capital_gain_reduction: {
      appreciation_removed: 6_000,
      purchase_record_attachment_file_name: "PurchaseRecord.pdf",
      purchase_record_review: {
        ...await review(purchase),
        property_dates_basis_match_confirmed: true,
        capital_asset_not_inventory_confirmed: true,
        no_depreciation_or_recapture_confirmed: true,
        personal_use_non_depreciable_equipment_confirmed: true,
      },
      donee_use_attachment_file_name: "DoneeUse.pdf",
      donee_use_review: {
        ...await review(use),
        same_property_and_donee_confirmed: true,
        actual_use_unrelated_to_exempt_purpose_confirmed: true,
        no_disposition_in_contribution_year_confirmed: true,
      },
      reduction_statement_attachment_file_name: "ReductionStatement.pdf",
      reduction_statement_review: {
        ...await review(reduction),
        property_and_fmv_match_confirmed: true,
        basis_and_appreciation_match_confirmed: true,
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
    {
      fileName: "PurchaseRecord.pdf",
      description: "Form 8283 Section B purchase and basis record",
      bytes: purchase,
    },
    {
      fileName: "DoneeUse.pdf",
      description: "Form 8283 Section B unrelated-use donee statement",
      bytes: use,
    },
    {
      fileName: "ReductionStatement.pdf",
      description: "Form 8283 Section B FMV reduction statement",
      bytes: reduction,
    },
    {
      fileName: "FullAppraisal.pdf",
      description: "Qualified Appraisal for Section B equipment",
      bytes: appraisal,
    },
    {
      fileName: "Signed8283.pdf",
      description: "Form 8283 completed signed Section B",
      bytes: signed,
    },
    {
      fileName: "AppraiserSignature.pdf",
      description: "Form 8283 appraiser signature document",
      bytes: appraiserSign,
    },
    {
      fileName: "DoneeSignature.pdf",
      description: "Form 8283 Donee signature document",
      bytes: doneeSign,
    },
  ];
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments,
  });
  assertStringIncludes(
    bundle.xml,
    "<AppraisedFairMarketValueAmt>18000</AppraisedFairMarketValueAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<DeductionClaimedAmt>12000</DeductionClaimedAmt>",
  );
  assertStringIncludes(bundle.xml, "<EquipmentInd>X</EquipmentInd>");
  assertStringIncludes(
    bundle.xml,
    "<UsePropertyForUnrelatedUseInd>true</UsePropertyForUnrelatedUseInd>",
  );
  assertStringIncludes(
    bundle.xml,
    "<OtherThanByCashOrCheckAmt>12000</OtherThanByCashOrCheckAmt>",
  );
  const [projected] = form8283Pdf.instances!(
    pending.f8283!,
    base.filer,
    {
      f8283: pending.f8283!,
      schedule_a: pending.schedule_a!,
      f1040: pending.f1040!,
    },
  );
  assertEquals(projected.section_b_claim, 12_000);
  assertEquals(projected.section_b_equipment, true);
  assertEquals(projected.section_b_unrelated_use_yes, true);
  assertStringIncludes(
    (projected.reduction_statements as string[])[0],
    "section 170(e)(1)(B)(i)",
  );
  const filled = await buildPdfBytes(pending, base.filer, ".pdf-cache", bundle);
  assertEquals((await PDFDocument.load(filled)).getPageCount() > 0, true);
  const typedItem = form8283InputSchema.parse({ section_b_items: [item] })
    .section_b_items![0];
  await assertRejects(
    () =>
      buildMefBundle(pending, {
        filer: base.filer,
        attachments: attachments.map((entry) =>
          entry.fileName === "DoneeUse.pdf"
            ? { ...entry, bytes: purchase }
            : entry
        ),
      }),
    Error,
    "bytes differ from reviewed SHA-256",
  );
  await assertRejects(() =>
    buildMefBundle({
      ...pending,
      f8283: {
        section_b_items: [{
          ...typedItem,
          donee_acknowledgment: {
            ...typedItem.donee_acknowledgment!,
            unrelated_use: false,
          },
        }],
      },
    }, { filer: base.filer, attachments }), Error);
  await assertRejects(() =>
    buildMefBundle({
      ...pending,
      f8283: {
        section_b_items: [{ ...typedItem, deduction_claimed: 18_000 }],
      },
    }, { filer: base.filer, attachments }), Error);
  await assertRejects(() =>
    buildMefBundle({
      ...pending,
      f8283: {
        section_b_items: [{
          ...typedItem,
          unrelated_use_capital_gain_reduction: {
            ...typedItem.unrelated_use_capital_gain_reduction!,
            purchase_record_review: {
              ...typedItem.unrelated_use_capital_gain_reduction!
                .purchase_record_review,
              personal_use_non_depreciable_equipment_confirmed: false as never,
            },
          },
        }],
      },
    }, { filer: base.filer, attachments }), Error);
  await assertRejects(
    () =>
      buildMefBundle({
        ...pending,
        f1040: { ...pending.f1040, line12e_itemized_deductions: 47_999 },
      }, { filer: base.filer, attachments }),
    Error,
    "itemized total",
  );
});
