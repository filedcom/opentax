import { assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { SectionBPropertyType } from "../../../nodes/inputs/f8283/index.ts";
import { buildMefBundle } from "../builder.ts";
import { testFiler } from "../test-filer.ts";

async function pdfBytes(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.addPage([612, 792]);
  return pdf.save();
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)),
  );
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function gift(pdfSha256: string) {
  return {
    property_description: "Antique desk",
    property_type: SectionBPropertyType.Collectibles,
    physical_condition: "Good condition",
    date_acquired: "2018-05-15",
    donor_acquisition_description: "Purchase",
    date_contributed: "2025-08-21",
    fmv: 8_000,
    deduction_claimed: 8_000,
    charitable_limit_category: "capital_gain_30" as const,
    is_capital_gain_property: true,
    cost_or_adjusted_basis: 2_500,
    signed_form_attachment_file_name: "CompletedSignedForm8283.pdf",
    signed_form_source_review: {
      reviewed_by: "Test reviewer",
      reviewed_on: "2025-09-01",
      pdf_sha256: pdfSha256,
      appraiser_signature_present: true as const,
      donee_signature_present: true as const,
      matches_electronic_form_confirmed: true as const,
    },
    qualified_appraisal: {
      appraiser_first_name: "Jane",
      appraiser_last_name: "Smith",
      signed_date: "2025-08-20",
      appraiser_ein: "123456789",
      signed_by_appraiser: true as const,
      signature_attachment_file_name: "AppraiserExcerpt.pdf",
      us_address: {
        line1: "1 Art Way",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
    },
    donee_acknowledgment: {
      organization_name: "City Museum",
      ein: "987654321",
      received_date: "2025-08-21",
      signed_by_donee: true as const,
      unrelated_use: false,
      signature_attachment_file_name: "DoneeExcerpt.pdf",
      us_address: {
        line1: "2 Museum Way",
        city: "Austin",
        state: "TX",
        zip: "78702",
      },
    },
  };
}

function attachments(bytes: Uint8Array) {
  return [
    {
      fileName: "AppraiserExcerpt.pdf",
      description: "Form 8283 appraiser signature document",
      bytes,
    },
    {
      fileName: "DoneeExcerpt.pdf",
      description: "Form 8283 Donee signature document",
      bytes,
    },
    {
      fileName: "CompletedSignedForm8283.pdf",
      description: "Form 8283 completed signed Section B",
      bytes,
    },
  ];
}

Deno.test("Form 8283 Section B rejects signature excerpts without a reviewed completed signed form", async () => {
  const bytes = await pdfBytes();
  const {
    signed_form_attachment_file_name: _file,
    signed_form_source_review: _review,
    ...unsigned
  } = gift(await sha256(bytes));
  await assertRejects(
    () =>
      buildMefBundle({ f8283: { section_b_items: [unsigned] } }, {
        filer: testFiler(),
        attachments: attachments(bytes).slice(0, 2),
      }),
    Error,
    "completed signed Form 8283 PDF and documented source review",
  );
});

Deno.test("Form 8283 Section B rejects a PDF whose bytes differ from the reviewed source", async () => {
  const reviewed = await pdfBytes();
  const changed = await PDFDocument.load(reviewed);
  changed.addPage([612, 792]);
  const submitted = await changed.save();
  const reviewedSha = await sha256(reviewed);
  await assertRejects(
    () =>
      buildMefBundle({
        f8283: { section_b_items: [gift(reviewedSha)] },
      }, {
        filer: testFiler(),
        attachments: attachments(submitted),
      }),
    Error,
    "do not match the reviewed source SHA-256",
  );
});

Deno.test("Form 8283 Section B links the reviewed completed signed form as a distinct binary document", async () => {
  // Synthetic PDF bytes exercise the identity/link contract, not signature
  // authentication. Production review must inspect the completed source form.
  const bytes = await pdfBytes();
  const bundle = await buildMefBundle({
    f8283: { section_b_items: [gift(await sha256(bytes))] },
  }, {
    filer: testFiler(),
    attachments: attachments(bytes),
  });
  assertStringIncludes(
    bundle.xml,
    "<Desc>Form 8283 completed signed Section B</Desc>",
  );
  assertStringIncludes(
    bundle.xml,
    'referenceDocumentId="BinaryAttachment4 BinaryAttachment2 BinaryAttachment3"',
  );
});
