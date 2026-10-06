import { PDFDocument, StandardFonts } from "pdf-lib";
import { inputSchema as form8283InputSchema } from "../../nodes/inputs/f8283/index.ts";
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

export async function reviewedGiftInventory(
  count: number,
  sameDonee = false,
  mixed = false,
) {
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
  const items: Array<
    Record<string, unknown> & {
      donee_acknowledgment: Record<string, unknown>;
      ordinary_income_reduction: Record<string, unknown>;
    }
  > = [];
  for (let index = 1; index <= count; index++) {
    const fmv = 9000 + 100 * index, basis = 6000 + 100 * index;
    const doneeEin = sameDonee ? "987654321" : String(987654320 + index);
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
        description:
          `Form 8283 Section B purchase and basis record: lot ${index}`,
        bytes: purchase,
      },
      {
        fileName: names.appraisal,
        description: `Qualified Appraisal for Section B equipment lot ${index}`,
        bytes: appraisal,
      },
      {
        fileName: names.signed,
        description: `Form 8283 completed signed Section B: lot ${index}`,
        bytes: signed,
      },
      {
        fileName: names.reduction,
        description:
          `Form 8283 Section B FMV reduction statement: lot ${index}`,
        bytes: reduction,
      },
      {
        fileName: names.appraiser,
        description: `Form 8283 appraiser signature document: lot ${index}`,
        bytes: appraiser,
      },
      {
        fileName: names.donee,
        description: `Form 8283 Donee signature document: lot ${index}`,
        bytes: donee,
      },
    );
    items.push({
      property_description: mixed && index % 2 === 0
        ? `Purchased painting lot ART-${index}`
        : `Purchased audio equipment lot EQ-${index}`,
      property_type: mixed && index % 2 === 0 ? "art_under_20000" : "equipment",
      similar_item_group: mixed && index % 2 === 0
        ? "paintings"
        : "audio equipment",
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
        reviewed_form_fields: {
          property_description: mixed && index % 2 === 0
            ? `Purchased painting lot ART-${index}`
            : `Purchased audio equipment lot EQ-${index}`,
          property_type: mixed && index % 2 === 0
            ? "art_under_20000"
            : "equipment",
          date_acquired: "2025-01-15",
          date_contributed: "2025-06-01",
          fmv,
          deduction_claimed: basis,
          cost_or_adjusted_basis: basis,
          donee_name: `City Charity ${sameDonee ? 1 : index}`,
          donee_ein: doneeEin,
          donee_received_date: "2025-06-01",
        },
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
        organization_name: `City Charity ${sameDonee ? 1 : index}`,
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
  return {
    items: form8283InputSchema.parse({ section_b_items: items })
      .section_b_items!,
    inputs: {
      ...base.inputs,
      schedule_a: {
        line_5a_state_income_tax: 24000,
        current_noncash_gift_inventory_complete_confirmed: true,
        other_prior_charitable_carryovers_absent_confirmed: true,
        capital_gain_property_carryovers: [],
      },
      f8283: { section_b_items: items },
    },
    filer: base.filer,
    attachments,
  };
}
