import {
  foreignAssetEvidence2026 as evidence,
  foreignAssetsFixture2026,
} from "./foreign-assets.fixture.ts";
import { ForeignAssetType } from "../../nodes/inputs/general/foreign/f8938/index.ts";
import type { z } from "zod";
import type { foreignBeneficialInterest2026Schema } from "./foreign-beneficial-interest.ts";

type BeneficialInterest = z.input<typeof foreignBeneficialInterest2026Schema>;
export function foreignBeneficialFixture2026(
  kind: BeneficialInterest["kind"] = "foreign_pension",
  known = true,
) {
  const s = foreignAssetsFixture2026(), a = s.claim.assets[0];
  a.asset_id = "foreign-interest-1";
  a.asset_identifier = "INTEREST-1001";
  a.description = "Synthetic foreign beneficial interest";
  a.institution_or_issuer_name = "Synthetic Foreign Administrator";
  a.ownership_and_classification_document = evidence(
    "beneficial-interest-owner",
  );
  for (const snapshot of s.claim.valuation_snapshots) {
    snapshot.values[0].asset_reference = a.asset_id;
    if (!known) delete snapshot.values[0].native_value;
  }
  a.valuation_method = "beneficial_interest_workpaper";
  a.asset_type = kind === "foreign_trust_beneficiary"
    ? ForeignAssetType.ForeignTrustInterest
    : kind === "foreign_estate"
    ? ForeignAssetType.ForeignEntityInterest
    : kind === "foreign_pension"
    ? ForeignAssetType.ForeignPensionInterest
    : ForeignAssetType.Other;
  if (kind === "foreign_trust_beneficiary" || kind === "foreign_estate") {
    a.foreign_entity_type = kind === "foreign_estate" ? "estate" : "trust";
  } else {
    a.issuer_or_counterparty_role = "counterparty";
    a.issuer_or_counterparty_type = "corporation";
    a.issuer_or_counterparty_is_us_person = false;
  }
  const threshold: BeneficialInterest["threshold_fmv_review"] = known
    ? {
      kind: "known",
      source_document: evidence("available-interest-values"),
      available_fair_market_values_for_the_year_reviewed: true,
    }
    : {
      kind: "not_readily_accessible",
      source_document: evidence("unknown-interest-values"),
      neither_known_nor_reason_to_know_from_readily_accessible_information_verified:
        true,
    };
  const base = {
    record_reference: "annual-beneficial-interest-review",
    reviewed_on: "2027-02-01",
    reviewer_reference: "synthetic-interest-reviewer",
    beneficiary_tin: s.taxpayer_ssn,
    interest_and_beneficiary_document: evidence("governing-interest-document"),
    complete_current_distribution_inventory_reviewed: true as const,
    threshold_fmv_review: threshold,
    distributions: [{
      record_reference: "cash-distribution",
      kind: "cash" as const,
      received_on: "2026-05-01",
      recipient_tin: s.taxpayer_ssn,
      currency_code: "CHF",
      amount_native: 8000,
      receipt_document: evidence("cash-distribution-receipt"),
    }, {
      record_reference: "property-distribution",
      kind: "property" as const,
      received_on: "2026-08-01",
      recipient_tin: s.taxpayer_ssn,
      currency_code: "CHF",
      property_description: "Distributed investment property",
      valued_on: "2026-12-31" as const,
      year_end_fair_market_value_native: 4000,
      receipt_document: evidence("property-distribution-receipt"),
      valuation_document: evidence("property-year-end-appraisal"),
    }],
  };
  a.beneficial_interest = kind === "foreign_trust_beneficiary"
    ? {
      ...base,
      kind,
      non_grantor_beneficial_interest_verified: true,
      mandatory_distribution_rights: {
        kind: "section7520_valuation",
        governing_instrument_document: evidence("mandatory-rights-instrument"),
        valued_on: "2026-12-31",
        value_native: 30000,
        section7520_valuation_document: evidence(
          "section7520-year-end-valuation",
        ),
        applicable_section7520_tables_and_rate_reviewed: true,
      },
    }
    : {
      ...base,
      kind,
      year_end_interest: known
        ? {
          kind: "known",
          valued_on: "2026-12-31",
          value_native: 44000,
          source_document: evidence("year-end-beneficial-interest-value"),
        }
        : {
          kind: "not_readily_accessible",
          source_document: evidence("unknown-year-end-interest-value"),
          neither_known_nor_reason_to_know_from_readily_accessible_information_verified:
            true,
        },
    };
  return s;
}
