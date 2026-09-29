import { assertEquals, assertThrows } from "@std/assert";
import {
  form8283CarryoverAttachmentDescription,
  reviewForm8283CarryoverAttachment,
} from "./f8283_carryover_evidence.ts";
import { FMVMethod } from "../../../nodes/inputs/f8283/index.ts";

const digest = "a".repeat(64);

function evidence() {
  return {
    contribution_id: "stock-gift-2023-1",
    contribution_year: 2023,
    property_kind: "publicly_traded_securities",
    original_section_a_similar_items_total: 4_000,
    prior_form_8283: {
      source_tax_year: 2024,
      completed_section: "A",
      attachment_file_name: "filed-2024-form-8283.pdf",
      pdf_sha256: digest,
      reviewed_by: "Reviewer One",
      reviewed_on: "2025-03-01",
      filed_return_reference: "accepted-2024-return",
      filed_taxpayer_ssn: "123456789",
      original_donation_date: "2023-11-15",
      donor_acquired_date: "2020-04-01",
      donor_acquisition_description: "Purchase",
      donee_name: "Qualified Charity",
      donee_us_address: {
        line1: "100 Main Street",
        city: "Wilmington",
        state: "DE",
        zip: "19801",
      },
      property_description: "Publicly traded common stock",
      original_fmv: 4_000,
      adjusted_basis: 2_000,
      fmv_method: FMVMethod.ComparableSales,
    },
    prior_deduction_workpaper: {
      reviewed_source_reference: "filed-2024-charity-workpaper",
      total_previously_deducted_through_2024: 500,
    },
    appraisal_required_with_2024_return: false,
  };
}

function carryover() {
  return {
    contribution_id: "stock-gift-2023-1",
    contribution_year: 2023,
    original_category: "capital_gain_30",
    original_fmv: 4_000,
    adjusted_basis: 2_000,
    previously_deducted: 500,
    ordinary_carryover_rules_confirmed: true,
  };
}

function attachmentContext() {
  return {
    attachmentSha256ByFileName: { "filed-2024-form-8283.pdf": digest },
    attachmentDescriptionsByFileName: {
      "filed-2024-form-8283.pdf": form8283CarryoverAttachmentDescription(
        "filed-2024-form-8283.pdf",
      ),
    },
    documentIdsByAttachmentFileName: {
      "filed-2024-form-8283.pdf": "BinaryAttachment0001",
    },
  };
}

Deno.test("Form 8283 prior-year Section A review joins ledger, taxpayer, PDF bytes and MeF document", () => {
  const result = reviewForm8283CarryoverAttachment(
    evidence(),
    carryover(),
    "123456789",
    attachmentContext(),
  );
  assertEquals(result.contributionId, "stock-gift-2023-1");
  assertEquals(result.attachmentDocumentId, "BinaryAttachment0001");
  assertEquals(result.filed2024ReturnReference, "accepted-2024-return");
});

Deno.test("Form 8283 prior-year Section A review rejects a different gift, taxpayer or PDF", () => {
  assertThrows(() =>
    reviewForm8283CarryoverAttachment(
      evidence(),
      { ...carryover(), previously_deducted: 600 },
      "123456789",
      attachmentContext(),
    )
  );
  assertThrows(() =>
    reviewForm8283CarryoverAttachment(
      evidence(),
      carryover(),
      "987654321",
      attachmentContext(),
    )
  );
  assertThrows(() =>
    reviewForm8283CarryoverAttachment(
      evidence(),
      carryover(),
      "123456789",
      {
        ...attachmentContext(),
        attachmentSha256ByFileName: {
          "filed-2024-form-8283.pdf": "b".repeat(64),
        },
      },
    )
  );
});

Deno.test("Form 8283 prior-year Section A review rejects invalid date, value or appraisal branch", () => {
  const source = evidence();
  assertThrows(() =>
    reviewForm8283CarryoverAttachment(
      {
        ...source,
        prior_form_8283: {
          ...source.prior_form_8283,
          original_donation_date: "2023-02-30",
        },
      },
      carryover(),
      "123456789",
      attachmentContext(),
    )
  );
  assertThrows(() =>
    reviewForm8283CarryoverAttachment(
      { ...source, original_section_a_similar_items_total: 3_000 },
      carryover(),
      "123456789",
      attachmentContext(),
    )
  );
  assertThrows(() =>
    reviewForm8283CarryoverAttachment(
      { ...source, appraisal_required_with_2024_return: true },
      carryover(),
      "123456789",
      attachmentContext(),
    )
  );
  assertThrows(() =>
    reviewForm8283CarryoverAttachment(
      {
        ...source,
        prior_form_8283: {
          ...source.prior_form_8283,
          donor_acquired_date: "2023-12-01",
        },
      },
      carryover(),
      "123456789",
      attachmentContext(),
    )
  );
  assertThrows(() =>
    reviewForm8283CarryoverAttachment(
      {
        ...source,
        prior_form_8283: {
          ...source.prior_form_8283,
          donor_acquired_date: "2022-11-15",
        },
      },
      carryover(),
      "123456789",
      attachmentContext(),
    )
  );
  assertThrows(() =>
    reviewForm8283CarryoverAttachment(
      {
        ...source,
        prior_form_8283: {
          ...source.prior_form_8283,
          fmv_method: FMVMethod.Other,
        },
      },
      carryover(),
      "123456789",
      attachmentContext(),
    )
  );
});
