import {
  calculateReviewedLossYear,
  reviewedLossYearSchema,
} from "../../../../nodes/inputs/nol_carryforward/reviewed_loss_year.ts";
import {
  calculateReviewedLegacyLossYear,
  reviewedLegacyLossYearSchema,
} from "./form172_legacy_loss_year.ts";

/** Explicit legacy discriminator; no year coercion in source or carry history. */
export function parseReviewedNolOrigin(raw: unknown) {
  return typeof raw === "object" && raw !== null &&
      "source_format" in raw &&
      raw.source_format === "reviewed_legacy_loss_year"
    ? reviewedLegacyLossYearSchema.parse(raw)
    : reviewedLossYearSchema.parse(raw);
}

export function calculateReviewedNolOrigin(raw: unknown) {
  const source = parseReviewedNolOrigin(raw);
  return "source_format" in source
    ? calculateReviewedLegacyLossYear(source)
    : calculateReviewedLossYear(source);
}
