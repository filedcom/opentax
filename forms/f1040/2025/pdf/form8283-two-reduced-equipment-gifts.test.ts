import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument, StandardFonts } from "pdf-lib";
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

Deno.test("two separately signed reduced Section B equipment gifts reach Schedule A, Form 1040, native attachments, and PDF", async () => {
  const address = {
    line1: "1 Main St",
    city: "Austin",
    state: "TX",
    zip: "78701",
  };
  const attachments: {
    fileName: string;
    description: string;
    bytes: Uint8Array;
  }[] = [];
  const items = [];
  for (
    const [index, fmv, basis, doneeEin] of [
      [1, 18_000, 12_000, "987654321"],
      [2, 19_000, 13_000, "987654322"],
    ] as const
  ) {
    const names = {
      purchase: `Purchase-${index}.pdf`,
      appraisal: `Appraisal-${index}.pdf`,
      signed: `Signed8283-${index}.pdf`,
      reduction: `Reduction-${index}.pdf`,
      appraiser: `Appraiser-${index}.pdf`,
      donee: `Donee-${index}.pdf`,
    };
    const purchase = await evidence(`equipment ${index} purchase $${basis}`);
    const appraisal = await evidence(`equipment ${index} appraised $${fmv}`);
    const signed = await evidence(`signed Form 8283 equipment ${index}`);
    const reduction = await evidence(
      `equipment ${index} FMV $${fmv} less gain $${
        fmv - basis
      } equals claim $${basis}`,
    );
    const appraiser = await evidence(`appraiser signature ${index}`);
    const donee = await evidence(`donee signature ${index}`);
    attachments.push(
      {
        fileName: names.purchase,
        description: "Form 8283 Section B purchase and basis record",
        bytes: purchase,
      },
      {
        fileName: names.appraisal,
        description: "Qualified Appraisal for Section B equipment",
        bytes: appraisal,
      },
      {
        fileName: names.signed,
        description: "Form 8283 completed signed Section B",
        bytes: signed,
      },
      {
        fileName: names.reduction,
        description: "Form 8283 Section B FMV reduction statement",
        bytes: reduction,
      },
      {
        fileName: names.appraiser,
        description: "Form 8283 appraiser signature document",
        bytes: appraiser,
      },
      {
        fileName: names.donee,
        description: "Form 8283 Donee signature document",
        bytes: donee,
      },
    );
    items.push({
      property_description: `Purchased audio equipment lot EQ-${index}`,
      property_type: "equipment",
      similar_item_group: "audio equipment",
      physical_condition: "Good used condition",
      date_acquired: "2025-01-15",
      donor_acquisition_description: "Purchase",
      date_contributed: "2025-06-01",
      fmv,
      deduction_claimed: basis,
      cost_or_adjusted_basis: basis,
      charitable_limit_category: "noncash_50",
      is_capital_gain_property: false,
      signed_form_attachment_file_name: names.signed,
      signed_form_source_review: {
        reviewed_by: "Synthetic reviewer",
        reviewed_on: "2025-09-01",
        pdf_sha256: await sha256(signed),
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
        signature_attachment_file_name: names.appraiser,
        attachment_file_name: names.appraisal,
        full_appraisal_source_review: {
          reviewed_by: "Synthetic reviewer",
          reviewed_on: "2025-09-01",
          pdf_sha256: await sha256(appraisal),
          signed_appraisal_confirmed: true,
          donated_property_matches_confirmed: true,
          appraised_fmv_matches_confirmed: true,
        },
      },
      donee_acknowledgment: {
        organization_name: `City Charity ${index}`,
        ein: doneeEin,
        received_date: "2025-06-01",
        signed_by_donee: true,
        unrelated_use: false,
        us_address: address,
        signature_attachment_file_name: names.donee,
      },
      ordinary_income_reduction: {
        reason: "purchased_short_term_capital_asset",
        gain_removed: fmv - basis,
        purchase_record_attachment_file_name: names.purchase,
        purchase_record_review: {
          reviewed_by: "Synthetic reviewer",
          reviewed_on: "2025-09-01",
          pdf_sha256: await sha256(purchase),
          property_dates_basis_match_confirmed: true,
          capital_asset_not_inventory_confirmed: true,
          no_depreciation_or_recapture_confirmed: true,
          donor_did_not_create_property_confirmed: true,
        },
        reduction_statement_attachment_file_name: names.reduction,
        reduction_statement_review: {
          reviewed_by: "Synthetic reviewer",
          reviewed_on: "2025-09-01",
          pdf_sha256: await sha256(reduction),
          property_and_fmv_match_confirmed: true,
          basis_and_gain_match_confirmed: true,
          reduced_claim_matches_confirmed: true,
        },
      },
    });
  }
  const result = execute(buildExecutionPlan(registry), registry, {
    ...base.inputs,
    schedule_a: {
      line_5a_state_income_tax: 24_000,
      line_8a_mortgage_interest_1098: 12_000,
      current_noncash_gift_inventory_complete_confirmed: true,
      other_prior_charitable_carryovers_absent_confirmed: true,
      capital_gain_property_carryovers: [],
    },
    f8283: { section_b_items: items },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_a.line_12_noncash_contributions, 25_000);
  assertEquals(result.pending.f1040.line12e_itemized_deductions, 61_000);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments,
  });
  assertEquals((bundle.xml.match(/<IRS8283\b/g) ?? []).length, 2);
  assertEquals(
    (bundle.xml.match(/<EquipmentInd>X<\/EquipmentInd>/g) ?? []).length,
    2,
  );
  assertStringIncludes(
    bundle.xml,
    "<OtherThanByCashOrCheckAmt>25000</OtherThanByCashOrCheckAmt>",
  );
  const projected = form8283Pdf.instances!(pending.f8283, base.filer, pending);
  assertEquals(projected.length, 2);
  assertEquals(projected.map((item) => item.section_b_appraised_fmv), [
    18_000,
    19_000,
  ]);
  assertEquals(projected.map((item) => item.section_b_claim), [12_000, 13_000]);
  const filled = await buildPdfBytes(pending, base.filer, ".pdf-cache", bundle);
  assertEquals((await PDFDocument.load(filled)).getPageCount() > 0, true);

  await assertRejects(
    () =>
      buildMefBundle(pending, {
        filer: base.filer,
        attachments: attachments.map((entry) =>
          entry.fileName === "Reduction-2.pdf"
            ? { ...entry, bytes: attachments[3].bytes }
            : entry
        ),
      }),
    Error,
    "bytes differ",
  );
  await assertRejects(
    () =>
      buildMefBundle({
        ...pending,
        f8283: {
          section_b_items: [items[0], {
            ...items[1],
            donee_acknowledgment: {
              ...items[1].donee_acknowledgment,
              ein: "987654321",
            },
          }],
        },
      }, { filer: base.filer, attachments }),
    Error,
    "reduced equipment sources",
  );
  await assertRejects(
    () =>
      buildMefBundle({
        ...pending,
        f1040: { ...pending.f1040, line12e_itemized_deductions: 60_999 },
      }, { filer: base.filer, attachments }),
    Error,
    "itemized total",
  );
});
