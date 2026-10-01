import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { registry } from "../registry.ts";
import { buildMefBundle } from "../mef/builder.ts";
import { buildPending } from "../mef/pending.ts";
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

Deno.test("two similar Section B art gifts reconcile separate signed appraisals and donees through Schedule A, Form 1040, MeF, and PDF", async () => {
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
    const [index, amount, doneeEin] of [
      [1, 22_000, "987654321"],
      [2, 24_000, "987654322"],
    ] as const
  ) {
    const signedForm = await evidence(`signed Form 8283 for art ${index}`);
    const appraisal = await evidence(
      `signed appraisal for art ${index}: $${amount}`,
    );
    const appraiserSignature = await evidence(`appraiser signature ${index}`);
    const doneeSignature = await evidence(`donee signature ${index}`);
    attachments.push(
      {
        fileName: `Signed8283-${index}.pdf`,
        description: "Form 8283 completed signed Section B",
        bytes: signedForm,
      },
      {
        fileName: `Appraisal-${index}.pdf`,
        description: "Qualified Appraisal for Section B art_at_least_20000",
        bytes: appraisal,
      },
      {
        fileName: `AppraiserSignature-${index}.pdf`,
        description: "Form 8283 appraiser signature document",
        bytes: appraiserSignature,
      },
      {
        fileName: `DoneeSignature-${index}.pdf`,
        description: "Form 8283 Donee signature document",
        bytes: doneeSignature,
      },
    );
    items.push({
      property_description: `Purchased framed painting catalog ART-${index}`,
      property_type: "art_at_least_20000",
      similar_item_group: "framed paintings",
      physical_condition: "Excellent",
      date_acquired: "2025-01-15",
      donor_acquisition_description: "Purchase",
      date_contributed: "2025-06-01",
      fmv: amount,
      deduction_claimed: amount,
      cost_or_adjusted_basis: amount,
      charitable_limit_category: "noncash_50",
      is_capital_gain_property: false,
      signed_form_attachment_file_name: `Signed8283-${index}.pdf`,
      signed_form_source_review: {
        reviewed_by: "Synthetic reviewer",
        reviewed_on: "2025-09-01",
        pdf_sha256: await sha256(signedForm),
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
        signature_attachment_file_name: `AppraiserSignature-${index}.pdf`,
        attachment_file_name: `Appraisal-${index}.pdf`,
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
        organization_name: `City Museum ${index}`,
        ein: doneeEin,
        received_date: "2025-06-01",
        signed_by_donee: true,
        unrelated_use: false,
        us_address: address,
        signature_attachment_file_name: `DoneeSignature-${index}.pdf`,
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
  assertEquals(result.pending.schedule_a.line_12_noncash_contributions, 46_000);
  assertEquals(result.pending.f1040.line12e_itemized_deductions, 82_000);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments,
  });
  assertEquals(
    bundle.xml.match(
      /<ArtWorthAtLeast20000DollarsInd>X<\/ArtWorthAtLeast20000DollarsInd>/g,
    )?.length,
    2,
  );
  assertStringIncludes(
    bundle.xml,
    "<OtherThanByCashOrCheckAmt>46000</OtherThanByCashOrCheckAmt>",
  );
  const projected = form8283Pdf.instances!(pending.f8283, base.filer, pending);
  assertEquals(projected.length, 2);
  assertEquals(projected.map((item) => item.section_b_claim), [22_000, 24_000]);
  await assertRejects(
    () =>
      buildMefBundle(pending, {
        filer: base.filer,
        attachments: attachments.map((entry) =>
          entry.fileName === "Appraisal-2.pdf"
            ? { ...entry, bytes: attachments[1]!.bytes }
            : entry
        ),
      }),
    Error,
    "bytes do not match",
  );
  await assertRejects(
    () =>
      buildMefBundle(pending, {
        filer: base.filer,
        attachments: attachments.map((entry) =>
          entry.fileName === "Signed8283-2.pdf"
            ? { ...entry, bytes: attachments[0]!.bytes }
            : entry
        ),
      }),
    Error,
    "bytes do not match",
  );
  await assertRejects(
    () =>
      buildMefBundle({
        ...pending,
        f1040: { ...pending.f1040, line12e_itemized_deductions: 81_999 },
      }, { filer: base.filer, attachments }),
    Error,
    "itemized total",
  );
  await assertRejects(
    () =>
      buildMefBundle({
        ...pending,
        f8283: {
          section_b_items: [items[0], {
            ...items[1],
            donee_acknowledgment: {
              ...items[1]!.donee_acknowledgment,
              ein: "987654321",
            },
          }],
        },
      }, { filer: base.filer, attachments }),
    Error,
    "similar-art sources and donees",
  );
});
