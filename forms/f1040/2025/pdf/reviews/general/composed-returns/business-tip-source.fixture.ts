/** Existing reviewed issued source fixtures shared without importing the review catalog. */
const tip = {
  "general": {
    "filing_status": "single",
    "taxpayer_first_name": "Alex",
    "taxpayer_last_name": "Example",
    "taxpayer_ssn": "111-22-3333",
    "taxpayer_dob": "1985-06-15",
    "child_eic_filer_review": {
      "not_qualifying_child_of_another_taxpayer_verified": true,
      "relationship_age_residence_record_reference":
        "Synthetic 2025 filer family and residence review",
    },
    "prior_eic_disallowance_review": {
      "status": "none",
      "irs_account_record_reference": "Synthetic IRS account transcript review",
      "no_nonclerical_disallowance_since_1996_verified": true,
    },
    "eic_tax_residency_review": {
      "status": "all_year_resident",
      "taxpayer_status_record_reference":
        "Synthetic 2025 resident status review",
      "spouse_status_record_reference": "Synthetic 2025 spouse status review",
    },
    "address_line1": "1 Example Way",
    "address_city": "Austin",
    "address_state": "TX",
    "address_zip": "78701",
    "digital_assets": false,
    "main_home_in_us_over_half_year": true,
    "taxpayer_can_be_claimed_as_dependent": false,
    "childless_eic_review": {
      "not_qualifying_child_of_another_taxpayer_verified": true,
      "qualifying_child_status_record_reference":
        "Synthetic 2025 family review",
    },
    "taxpayer_ssn_valid_for_employment": true,
    "taxpayer_ssn_issued_before_due_date": true,
    "taxpayer_tin_issued_by_due_date": true,
    "qbi_no_prior_loss_or_suspended_loss_confirmed": true,
    "qbi_not_patron_of_specified_cooperative_confirmed": true,
  },
  "f1099nec": [
    {
      "payer_name": "Example Events",
      "payer_tin": "98-7654321",
      "recipient_ssn": "111-22-3333",
      "box1_nec": 18000,
      "for_routing": "schedule_c",
      "schedule_c_business_reference": "synthetic-event-service-2025",
      "qualified_tips_review": {
        "amount": 12000,
        "occupation_code": "102",
        "occupation_review_reference":
          "Synthetic 2025 service occupation record",
        "tip_records_reference": "Synthetic 2025 point-of-sale tip ledger",
        "included_in_box1": true,
        "no_other_allocable_deductions": true,
        "no_other_allocable_deductions_review_reference":
          "Synthetic 2025 Schedule 1 allocation review",
      },
    },
  ],
  "schedule_c": [
    {
      "business_reference": "synthetic-event-service-2025",
      "proprietor_recipient": "T",
      "line_a_principal_business": "Event food service",
      "line_b_business_code": "722320",
      "line_c_business_name": "Example Event Service",
      "line_f_accounting_method": "cash",
      "line_g_material_participation": true,
      "line_i_made_1099_payments": false,
      "qbi_no_other_adjustments_confirmed": true,
      "line_1_gross_receipts": 18000,
      "line_8_advertising": 8000,
    },
  ],
  "schedule1a": {
    "senior_zero_exclusions_review": {
      "no_section933_puerto_rico_excluded_income": true,
      "section933_review_source_reference": "Synthetic 2025 residency review",
      "no_form2555_filed": true,
      "form2555_review_source_reference":
        "Synthetic 2025 foreign-income review",
      "no_form4563_filed": true,
      "form4563_review_source_reference": "Synthetic 2025 Samoa-source review",
    },
  },
};

export function businessTipSourceInputs() {
  return structuredClone(tip);
}

const w2 = [
  {
    "box1_wages": 75000,
    "box2_fed_withheld": 11000,
    "employee_ssn": "111-22-3333",
    "box3_ss_wages": 75000,
    "box4_ss_withheld": 4650,
    "box5_medicare_wages": 75000,
    "box6_medicare_withheld": 1087.5,
    "employer_ein": "12-3456789",
    "employer_name": "Example Employer",
    "employer_address_line1": "10 Employer Road",
    "employer_address_city": "Austin",
    "employer_address_state": "TX",
    "employer_address_zip": "78701",
    "box12_entries": [],
  },
];

export function tipWageSources() {
  return structuredClone(w2);
}

const wotc = {
  "general": {
    "filing_status": "single",
    "taxpayer_first_name": "Alex",
    "taxpayer_last_name": "Example",
    "taxpayer_ssn": "111-22-3333",
    "taxpayer_dob": "1985-06-15",
    "child_eic_filer_review": {
      "not_qualifying_child_of_another_taxpayer_verified": true,
      "relationship_age_residence_record_reference":
        "Synthetic 2025 filer family and residence review",
    },
    "prior_eic_disallowance_review": {
      "status": "none",
      "irs_account_record_reference": "Synthetic IRS account transcript review",
      "no_nonclerical_disallowance_since_1996_verified": true,
    },
    "eic_tax_residency_review": {
      "status": "all_year_resident",
      "taxpayer_status_record_reference":
        "Synthetic 2025 resident status review",
      "spouse_status_record_reference": "Synthetic 2025 spouse status review",
    },
    "address_line1": "1 Example Way",
    "address_city": "Austin",
    "address_state": "TX",
    "address_zip": "78701",
    "digital_assets": false,
  },
  "w2": [
    {
      "box1_wages": 120000,
      "box2_fed_withheld": 20000,
      "employee_ssn": "111-22-3333",
      "box3_ss_wages": 120000,
      "box4_ss_withheld": 7440,
      "box5_medicare_wages": 120000,
      "box6_medicare_withheld": 1740,
      "employer_ein": "12-3456789",
      "employer_name": "Example Employer",
      "employer_address_line1": "10 Employer Road",
      "employer_address_city": "Austin",
      "employer_address_state": "TX",
      "employer_address_zip": "78701",
      "box12_entries": [],
    },
  ],
  "schedule_c": [
    {
      "business_reference": "REVIEW-WOTC-BUSINESS-1",
      "line_a_principal_business": "Retail store",
      "line_b_business_code": "459999",
      "line_f_accounting_method": "cash",
      "line_g_material_participation": true,
      "line_i_made_1099_payments": false,
      "line_1_gross_receipts": 3600,
      "line_26_wages": 6000,
    },
  ],
  "f5884": {
    "subject_to_passive_activity_limit": false,
    "f5884s": [
      {
        "employee_reference": "REVIEW-WOTC-EMP-1",
        "target_group": "1",
        "hired_on": "2025-01-15",
        "certification": {
          "path": "certified_by_start",
          "swa_certification_reference": "Synthetic SWA-001",
          "certification_received_on": "2025-01-15",
          "certification_received_before_claim_confirmed": true,
          "revocation": {
            "status": "no_notice_received",
          },
        },
        "qualified_wages_confirmed": true,
        "not_prior_employee_confirmed": true,
        "not_related_or_dependent_confirmed": true,
        "more_than_half_wages_for_trade_or_business_confirmed": true,
        "excluded_wages_removed_confirmed": true,
        "wage_records": [
          {
            "payroll_record_reference": "Synthetic payroll record PAY-001",
            "deduction_location": {
              "kind": "schedule_c",
              "business_reference": "REVIEW-WOTC-BUSINESS-1",
            },
            "service_period_start_on": "2025-02-01",
            "service_period_end_on": "2025-02-28",
            "paid_or_incurred_on": "2025-02-28",
            "qualified_wages": 6000,
          },
        ],
        "hours_worked": 400,
      },
    ],
  },
};

export function tipWotcSourceInputs() {
  return structuredClone(wotc);
}
