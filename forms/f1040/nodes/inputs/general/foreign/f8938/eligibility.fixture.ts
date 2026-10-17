const reviewed = (reference: string, digit: string) => ({
  document_reference: reference,
  document_sha256: digit.repeat(64),
  subject_ssn: "111223333",
  reviewer_reference: "REVIEW-8938-2025",
  reviewed_on: "2026-02-01",
});

/** Synthetic reviewed-document identities, not real taxpayer evidence. */
export function form8938UsEligibilityFixture() {
  return {
    legal_status: {
      ...reviewed("CITIZENSHIP-1", "a"),
      evidence_kind: "us_passport" as const,
    },
    return_requirement: {
      ...reviewed("RETURN-REQUIRED-1", "b"),
      determination_basis: "gross_income_threshold_workpaper" as const,
    },
    us_residence: {
      ...reviewed("US-RESIDENCE-1", "c"),
      evidence_kind: "government_address_record" as const,
    },
  };
}

export function form8938AbroadEligibilityFixture(
  presence: "physical_presence_330_days" | "bona_fide_resident_full_year",
  start: string,
  end: string,
) {
  const base = form8938UsEligibilityFixture();
  return {
    legal_status: base.legal_status,
    return_requirement: base.return_requirement,
    foreign_tax_home: {
      ...reviewed("FOREIGN-TAX-HOME-1", "d"),
      evidence_kind: "employment_or_business_record" as const,
      country: "CH",
    },
    foreign_presence: {
      ...reviewed("FOREIGN-PRESENCE-1", "e"),
      evidence_kind: presence === "physical_presence_330_days"
        ? "entry_exit_records" as const
        : "foreign_residence_determination" as const,
      qualifying_period_start: start,
      qualifying_period_end: end,
    },
  };
}
