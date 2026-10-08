import { inputSchema } from "../../../../nodes/inputs/f8283/index.ts";
import { reviewedGiftInventory } from "./form8283-gift-inventory.fixture.ts";
import {
  completed8283Source,
  giftSourceRecord,
} from "./form8283-source-documents.fixture.ts";
const digest = async (bytes: Uint8Array) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
export async function reviewedUnreducedBookGroup(longHeld = false) {
  const base = await reviewedGiftInventory(3);
  const items = structuredClone(base.items);
  const attachments: typeof base.attachments = [];
  for (const [index, row] of items.entries()) {
    const fmv = [2000, 2500, 900][index], basis = 5000 + 100 * index;
    const property = `Purchased rare book lot BOOK-${index + 1}`;
    const facts = {
      property,
      propertyType: "collectibles",
      fmv,
      basis,
      claim: fmv,
      donorName: "Alex Example",
      donorSsn: "111223333",
      filerName: "ALEX EXAMPLE",
      filerSsn: "111223333",
      doneeName: row.donee_acknowledgment!.organization_name,
      doneeEin: row.donee_acknowledgment!.ein,
      acquired: longHeld ? "2010-01-15" : "2025-01-15",
      contributed: "2025-06-01",
    };
    const names = {
      purchase: `Books-${index + 1}-Purchase.pdf`,
      appraisal: `Books-${index + 1}-Appraisal.pdf`,
      signed: `Books-${index + 1}-Signed8283.pdf`,
      appraiser: `Books-${index + 1}-Appraiser.pdf`,
      donee: `Books-${index + 1}-Donee.pdf`,
    };
    const purchase = await giftSourceRecord(
      "Owned book purchase and adjusted cost record",
      facts,
      [
        `Purchase invoice BOOK-${
          index + 1
        }; original paid cost$${basis}; no subsequent adjustment or earlier deduction.`,
        "Personal-use nondepreciable purchased property, not inventory; donor did not create it.",
        `Held since${facts.acquired}; value declined below basis; no gain at hypothetical FMV sale, depreciation, recapture or other reduction.`,
        "Outright entire owned interest contributed; no goods, services, consideration or retained benefit.",
      ],
    );
    const appraisal = await giftSourceRecord(
      "Qualified signed book appraisal",
      facts,
      [
        "Jane Smith EIN123456789,1 Main St,Austin,TX78701; qualified regular book appraiser.",
        `Comparable sales reviewed2025-05-28; effective2025-06-01 value$${fmv}.`,
        "/s/ Jane Smith - simulated fixture signature.",
      ],
    );
    const signed = await completed8283Source(facts);
    const appraiser = await giftSourceRecord(
      "Appraiser declaration signature record",
      facts,
      ["/s/ Jane Smith,2025-05-28 - simulated fixture signature."],
    );
    const donee = await giftSourceRecord(
      "Donee acknowledgment signature record",
      facts,
      [
        "/s/ Taylor Charity,Director,2025-06-01 - simulated fixture signature.",
        `Public charity/50% limit organization status record CHARITY-${facts.doneeEin}; no goods or services; related exempt use; no contribution-year disposition.`,
      ],
    );
    attachments.push(
      {
        fileName: names.purchase,
        description: `Form 8283 unreduced property purchase record: book${
          index + 1
        }`,
        bytes: purchase,
      },
      {
        fileName: names.appraisal,
        description: `Qualified Appraisal purchased book: ${index + 1}`,
        bytes: appraisal,
      },
      {
        fileName: names.signed,
        description: `Form 8283 completed signed Section B: purchased book${
          index + 1
        }`,
        bytes: signed,
      },
      {
        fileName: names.appraiser,
        description: `Form 8283 appraiser signature document: book${index + 1}`,
        bytes: appraiser,
      },
      {
        fileName: names.donee,
        description: `Form 8283 Donee signature document: book${index + 1}`,
        bytes: donee,
      },
    );
    const reason = row.ordinary_income_reduction!;
    if (reason.reason !== "purchased_short_term_capital_asset") {
      throw new Error(
        "Book fixture needs the retained purchased short-term source",
      );
    }
    const purchaseReview = reason.purchase_record_review;
    row.ordinary_income_reduction = undefined;
    row.unreduced_purchased_property = {
      purchase_record_attachment_file_name: names.purchase,
      purchase_record_review: {
        ...purchaseReview,
        pdf_sha256: await digest(purchase),
      },
      fmv_not_above_adjusted_basis_verified: true,
      donee_50_percent_limit_organization_verified: true,
      donee_status_record_reference: `CHARITY-${facts.doneeEin}`,
      personal_use_non_depreciable_property_verified: true,
      no_other_reduction_reason_verified: true,
    };
    Object.assign(row, {
      date_acquired: facts.acquired,
      property_description: property,
      property_type: "collectibles",
      fmv,
      deduction_claimed: fmv,
      cost_or_adjusted_basis: basis,
      similar_item_group: "books",
      signed_form_attachment_file_name: names.signed,
    });
    const review = row.signed_form_source_review!;
    review.pdf_sha256 = await digest(signed);
    Object.assign(review.reviewed_form_fields!, {
      date_acquired: facts.acquired,
      property_description: property,
      property_type: "collectibles",
      fmv,
      deduction_claimed: fmv,
      cost_or_adjusted_basis: basis,
    });
    row.qualified_appraisal!.attachment_file_name = names.appraisal;
    row.qualified_appraisal!.full_appraisal_source_review!.pdf_sha256 =
      await digest(appraisal);
    row.qualified_appraisal!.signature_attachment_file_name = names.appraiser;
    row.donee_acknowledgment!.signature_attachment_file_name = names.donee;
  }
  const parsed = inputSchema.parse({ section_b_items: items });
  return {
    inputs: { ...base.inputs, f8283: parsed },
    filer: base.filer,
    attachments,
    items: parsed.section_b_items!,
  };
}
