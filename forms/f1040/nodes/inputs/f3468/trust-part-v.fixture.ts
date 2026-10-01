export const trustPartVStatementFixture = {
  source_document_reference: "trust-k1-2025",
  statement_reference: "solar-property-statement-2025",
  reviewed_on: "2026-02-01",
  reviewer_reference: "tax-review-3468-1",
  issuer_pdf_sha256: "a".repeat(64),
  issuer_ein: "123456789",
  beneficiary_ssn: "111223333",
  facility_type: "solar",
  facility_address: {
    line1: "100 Solar Road",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  construction_started_on: "2024-06-01",
  placed_in_service_on: "2025-03-01",
  net_output_kw_ac: 500,
  beneficiary_allocated_qualified_basis: 10_000,
  beneficiary_allocated_credit: 3_000,
  beneficiary_nonpassive_activity_reviewed: true,
  generation_emissions_rate_zero: true,
  no_prior_or_current_incompatible_section38_credit: true,
  no_interconnection_property: true,
  no_domestic_content_or_energy_community_bonus: true,
  no_subsidized_financing_or_private_activity_bonds: true,
  no_elective_payment_or_transfer: true,
  no_cooperative_credit: true,
} as const;

export const trustK1PartVFixture = {
  k1_trusts: [{
    estate_trust_name: "Solar Trust",
    entity_type: "trust",
    estate_trust_ein: "123456789",
    source_document_reference: "trust-k1-2025",
    beneficiary_ssn: "111223333",
    box14_code_m_clean_electricity_investment_information: true,
    box14_code_m_form3468_part_v_statement: trustPartVStatementFixture,
  }],
} as const;

export const trustForm3468PartVFixture = {
  trust_part_v_claims: [{
    source_type: "trust",
    source_ein: "123456789",
    source_document_reference: "trust-k1-2025",
    statement: trustPartVStatementFixture,
  }],
  trust_part_v_source_reviews: [trustPartVStatementFixture],
} as const;
