import {
  inputSchema,
  type SectionBItem,
} from "../../../../../nodes/inputs/deductions/charitable/f8283/index.ts";
import { reviewedGiftInventory } from "./form8283-gift-inventory.fixture.ts";
import { sectionAReductionInventory } from "./form8283-section-a-reduction-inventory.fixture.ts";
import {
  completed8283Source,
  giftSourceRecord,
} from "./form8283-source-documents.fixture.ts";
async function digest(bytes: Uint8Array) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
export async function reviewedSpecialSectionBInventory(
  highFmvFoundationArt = false,
  highValueCreator = false,
) {
  const base = await reviewedGiftInventory(4);
  const attachments: typeof base.attachments = [];
  const rows: Record<string, unknown>[] = [];
  const routes = [
    [
      "donor_created_artwork",
      "creator_ordinary_income_reduction",
      "art_under_20000",
      2,
      "paintings",
    ],
    [
      "donor_prepared_manuscript",
      "manuscript_ordinary_income_reduction",
      "other",
      3,
      "manuscripts",
    ],
    [
      "private_nonoperating_foundation",
      "private_foundation_capital_gain_reduction",
      "collectibles",
      5,
      "coins",
    ],
    [
      "donor_prepared_taxidermy",
      "taxidermy_capital_gain_reduction",
      "other",
      6,
      "taxidermy mounts",
    ],
  ] as const;
  for (
    const [index, [reason, key, propertyType, sourceIndex, group]] of routes
      .entries()
  ) {
    const highArt = highFmvFoundationArt &&
      reason === "private_nonoperating_foundation";
    const largeCreator = highValueCreator && reason === "donor_created_artwork";
    const actualType = largeCreator
      ? "art_at_least_20000"
      : highArt
      ? "art_under_20000"
      : propertyType;
    const actualFmv = largeCreator ? 900000 : highArt ? 25000 : 9000;
    const actualBasis = largeCreator ? 600000 : 6000;
    const original = {
      ...sectionAReductionInventory[sourceIndex],
      ...(highArt
        ? {
          property_description:
            "Purchased painting given outright to private foundation",
        }
        : {}),
    };
    const source = structuredClone(
      (original as unknown as Record<string, unknown>)[key],
    ) as Record<string, unknown>;
    if (reason === "donor_prepared_taxidermy") {
      source.eligible_preparation_stuffing_mounting_costs = 6000;
    }
    const row = structuredClone(base.items[index]) as unknown as Record<
      string,
      unknown
    >;
    const donee = {
      ...(row.donee_acknowledgment as Record<string, unknown>),
      organization_name: original.donee_organization_name,
      us_address: original.donee_organization_us_address,
      ...(reason === "private_nonoperating_foundation"
        ? { ein: source.foundation_ein }
        : {}),
    };
    const facts = {
      property: original.property_description!,
      propertyType: actualType,
      fmv: actualFmv,
      basis: actualBasis,
      donorName: "Alex Example",
      donorSsn: "111223333",
      filerName: "ALEX EXAMPLE",
      filerSsn: "111223333",
      doneeName: String(donee.organization_name),
      doneeEin: String(donee.ein),
      doneeAddress: original.donee_organization_us_address,
      acquired: original.date_acquired!,
      contributed: "2025-06-01",
      howAcquired: original.donor_acquisition_description,
    };
    // Actual named cost/preparation/status records are separate retained bytes,
    // with the same owned property and facts as the reviewed reduction source.
    const sourceDocuments = [];
    for (
      const [recordIndex, [field, reference]] of Object.entries(source).filter((
        [field],
      ) => field.endsWith("_reference")).entries()
    ) {
      const fileName = `Special-${index + 1}-Record-${recordIndex + 1}.pdf`;
      const record = await giftSourceRecord(
        `Reviewed ${field.replaceAll("_", " ")}`,
        facts,
        [
          `Source reference: ${reference}; source reason: ${reason}.`,
          "Owned interest transferred outright; no consideration or donor benefit.",
          `Undeducted adjusted basis/preparation cost $${actualBasis}; FMV appreciation removed $${
            actualFmv - actualBasis
          }.`,
          ...Object.entries(source).filter(([field]) =>
            !field.endsWith("_reference")
          ).map(([field, value]) =>
            `${field}: ${
              typeof value === "object" ? JSON.stringify(value) : value
            }`
          ),
        ],
      );
      attachments.push({
        fileName,
        description:
          `Form 8283 Section B reduction source record: ${reference}`,
        bytes: record,
      });
      sourceDocuments.push({
        source_reference: reference,
        attachment_file_name: fileName,
        pdf_sha256: await digest(record),
      });
    }
    const signed = await completed8283Source(facts);
    const appraisal = await giftSourceRecord("Qualified appraisal", facts, [
      "Jane Smith EIN123456789,1 Main St,Austin TX78701.",
      "Comparable sales; signed2025-05-28; effective valuation2025-06-01.",
      `Identified property appraised at$${actualFmv}; basis deduction$${actualBasis} is independently computed.`,
      "/s/ Jane Smith - simulated fixture signature.",
    ]);
    const reduction = await giftSourceRecord(
      "FMV reduction computation",
      facts,
      [
        `Reviewed statutory reason: ${reason}; source references named separately.`,
        `Original FMV${actualFmv} minus gain${
          actualFmv - actualBasis
        } equals eligible basis/preparation cost${actualBasis}.`,
        "No additional deduction, other reduction, recapture or previous cost deduction.",
      ],
    );
    const appraiser = await giftSourceRecord(
      "Appraiser declaration signature record",
      facts,
      ["/s/ Jane Smith,2025-05-28 - simulated fixture signature."],
    );
    const acknowledgment = await giftSourceRecord(
      "Donee acknowledgment signature record",
      facts,
      [
        "/s/ Taylor Charity,Director,2025-06-01 - simulated fixture signature.",
        "No goods or services; exempt related use and no contribution-year disposition.",
      ],
    );
    const names = {
      signed: `Special-${index + 1}-Signed8283.pdf`,
      appraisal: `Special-${index + 1}-Appraisal.pdf`,
      reduction: `Special-${index + 1}-Reduction.pdf`,
      appraiser: `Special-${index + 1}-Appraiser.pdf`,
      donee: `Special-${index + 1}-Donee.pdf`,
    };
    attachments.push(
      {
        fileName: names.signed,
        description: `Form 8283 completed signed Section B: ${facts.property}`,
        bytes: signed,
      },
      {
        fileName: names.appraisal,
        description: `Qualified Appraisal for Section B ${facts.property}`,
        bytes: appraisal,
      },
      {
        fileName: names.reduction,
        description:
          `Form 8283 Section B reduction source record: computation ${reason}`,
        bytes: reduction,
      },
      {
        fileName: names.appraiser,
        description:
          `Form 8283 appraiser signature document: ${facts.property}`,
        bytes: appraiser,
      },
      {
        fileName: names.donee,
        description: `Form 8283 Donee signature document: ${facts.property}`,
        bytes: acknowledgment,
      },
    );
    Object.assign(row, {
      property_description: facts.property,
      property_type: actualType,
      similar_item_group: highArt ? "paintings" : group,
      date_acquired: facts.acquired,
      donor_acquisition_description: facts.howAcquired,
      fmv: actualFmv,
      deduction_claimed: actualBasis,
      cost_or_adjusted_basis: actualBasis,
      charitable_limit_category: original.charitable_limit_category,
      is_capital_gain_property: original.is_capital_gain_property,
      ordinary_income_reduction: undefined,
      donee_acknowledgment: {
        ...donee,
        signature_attachment_file_name: names.donee,
      },
      donor_ownership_review: {
        donor_name: facts.donorName,
        donor_ssn: facts.donorSsn,
        ownership_record_reference: String(sourceDocuments[0].source_reference),
        outright_full_owned_interest_contributed_verified: true,
      },
      signed_form_attachment_file_name: names.signed,
      special_fmv_reduction: {
        reason,
        source,
        source_documents: sourceDocuments,
        source_documents_review: {
          reviewed_by: "Test reviewer",
          reviewed_on: "2025-09-01",
          property_owner_dates_basis_and_reason_match_confirmed: true,
        },
        reduction_statement_attachment_file_name: names.reduction,
        reduction_statement_sha256: await digest(reduction),
      },
    });
    const appraisalFacts = row.qualified_appraisal as Record<string, unknown>;
    appraisalFacts.attachment_file_name = names.appraisal;
    appraisalFacts.signature_attachment_file_name = names.appraiser;
    (appraisalFacts.full_appraisal_source_review as Record<string, unknown>)
      .pdf_sha256 = await digest(appraisal);
    const review = row.signed_form_source_review as Record<string, unknown>;
    review.pdf_sha256 = await digest(signed);
    review.reviewed_form_fields = {
      ...(review.reviewed_form_fields as Record<string, unknown>),
      property_description: facts.property,
      property_type: actualType,
      date_acquired: facts.acquired,
      fmv: actualFmv,
      deduction_claimed: actualBasis,
      cost_or_adjusted_basis: actualBasis,
      donee_name: facts.doneeName,
      donee_ein: facts.doneeEin,
      donee_us_address: donee.us_address,
    };
    rows.push(row);
  }
  const parsed = inputSchema.parse({ section_b_items: rows });
  return {
    inputs: { ...base.inputs, f8283: parsed },
    filer: base.filer,
    attachments,
    items: parsed.section_b_items as SectionBItem[],
  };
}
