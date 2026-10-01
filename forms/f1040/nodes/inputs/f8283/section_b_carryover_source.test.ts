import { assertRejects } from "@std/assert";
import { sha256Hex } from "../../../2025/prepared-source.ts";
import { bindForm8283SectionBCarryoverSource } from "./section_b_carryover_source.ts";

const priorFormBytes = new TextEncoder().encode(
  "%PDF-1.7 reviewed prior Section B fixture",
);
const appraisalBytes = new TextEncoder().encode(
  "%PDF-1.7 reviewed qualified appraisal fixture",
);

Deno.test("Form 8283 binds a prior Section B artwork and required appraisal to one carryover", async () => {
  const source = {
    contribution_id: "artwork-2024-1",
    contribution_year: 2024,
    property_kind: "purchased_artwork",
    original_donation_date: "2024-12-01",
    donor_acquired_date: "2022-10-01",
    donee_name: "Public Art Museum",
    filed_return_reference: "2024-accepted-return-1",
    filed_taxpayer_ssn: "123456789",
    original_fmv: 30_000,
    original_2024_deduction_claim: 30_000,
    adjusted_basis: 20_000,
    previously_deducted_through_2024: 15_000,
    completed_prior_form: {
      source_document_reference: "prior-form-8283-section-b",
      file_name: "prior-8283.pdf",
      sha256: await sha256Hex(priorFormBytes),
      reviewed_by: "Reviewer A",
      reviewed_on: "2026-09-30",
    },
    required_qualified_appraisal: {
      source_document_reference: "prior-art-appraisal",
      file_name: "art-appraisal.pdf",
      sha256: await sha256Hex(appraisalBytes),
      reviewed_by: "Reviewer A",
      reviewed_on: "2026-09-30",
    },
    section_b_appraiser_and_donee_signatures_reviewed: true,
    appraisal_was_attached_to_2024_return_reviewed: true,
  };
  const carryover = {
    contribution_id: "artwork-2024-1",
    contribution_year: 2024,
    original_category: "capital_gain_30",
    original_fmv: 30_000,
    adjusted_basis: 20_000,
    previously_deducted: 15_000,
    ordinary_carryover_rules_confirmed: true,
  };
  const bind = (
    review: unknown,
    prior: Uint8Array = priorFormBytes,
    appraisal: Uint8Array = appraisalBytes,
    row: unknown = carryover,
  ) =>
    bindForm8283SectionBCarryoverSource(
      review,
      row,
      "123456789",
      prior,
      appraisal,
    );
  await bind(source);
  await assertRejects(() =>
    bind(source, new TextEncoder().encode("%PDF-1.7 changed prior form"))
  );
  await assertRejects(() =>
    bind(
      source,
      priorFormBytes,
      new TextEncoder().encode("%PDF-1.7 changed appraisal"),
    )
  );
  await assertRejects(() =>
    bind({ ...source, original_2024_deduction_claim: 19_999 })
  );
  await assertRejects(() =>
    bind({ ...source, filed_taxpayer_ssn: "987654321" })
  );
  await assertRejects(() =>
    bind(source, priorFormBytes, appraisalBytes, {
      ...carryover,
      previously_deducted: 14_999,
    })
  );
  await assertRejects(() =>
    bind({ ...source, appraisal_was_attached_to_2024_return_reviewed: false })
  );
});
