import { FilingStatus } from "../../../../../mef/header.ts";
import type { PdfReviewFixture } from "../../../review-fixtures.ts";

// MFJ wages, a spouse Schedule C and ordinary 1099-INT/DIV/B investment income.
const jointInputs = {
  general: {
    filing_status: "mfj",
    taxpayer_first_name: "Jordan",
    taxpayer_last_name: "Rivera",
    taxpayer_dob: "1984-04-12",
    taxpayer_ssn: "400-11-2222",
    taxpayer_occupation: "Engineer",
    taxpayer_ssn_valid_for_employment: true,
    taxpayer_ssn_issued_before_due_date: true,
    taxpayer_tin_issued_by_due_date: true,
    spouse_first_name: "Casey",
    spouse_last_name: "Rivera",
    spouse_dob: "1986-09-30",
    spouse_ssn: "400-11-3333",
    spouse_occupation: "Designer",
    spouse_ssn_valid_for_employment: true,
    spouse_ssn_issued_before_due_date: true,
    spouse_tin_issued_by_due_date: true,
    address_line1: "742 Evergreen Terrace",
    address_city: "Denver",
    address_state: "CO",
    address_zip: "80203",
    main_home_in_us_over_half_year: true,
    taxpayer_can_be_claimed_as_dependent: false,
    dependents: [
      {
        first_name: "Mia",
        last_name: "Rivera",
        dob: "2017-02-14",
        relationship: "daughter",
        months_in_home: 12,
        ssn: "400-11-4444",
        qualifying_child_for_ctc: true,
        ssn_valid_for_employment: true,
        ssn_issued_before_due_date: true,
        tin_issued_by_due_date: true,
        us_citizen_national_or_resident: true,
        provided_over_half_own_support: false,
        filed_joint_return_except_refund_only: false,
        dependent_on_another_return: false,
        lived_in_us_over_half_year: true,
        months_lived_with_you_in_us: 12,
        name_control: "RIVE",
        irs_relationship_code: "DAUGHTER"
      },
      {
        first_name: "Leo",
        last_name: "Rivera",
        dob: "2021-07-03",
        relationship: "son",
        months_in_home: 12,
        ssn: "400-11-5555",
        qualifying_child_for_ctc: true,
        ssn_valid_for_employment: true,
        ssn_issued_before_due_date: true,
        tin_issued_by_due_date: true,
        us_citizen_national_or_resident: true,
        provided_over_half_own_support: false,
        filed_joint_return_except_refund_only: false,
        dependent_on_another_return: false,
        lived_in_us_over_half_year: true,
        months_lived_with_you_in_us: 12,
        name_control: "RIVE",
        irs_relationship_code: "SON"
      }
    ],
    taxpayer_signature_pin: "12345",
    spouse_signature_pin: "23456",
    taxpayer_signature_date: "2026-03-02",
    spouse_signature_date: "2026-03-02",
    taxpayer_prior_year_agi: 148200,
    spouse_prior_year_agi: 148200,
    taxpayer_daytime_phone: "3035550142",
    digital_assets: false,
    qbi_no_prior_loss_or_suspended_loss_confirmed: true,
    qbi_not_patron_of_specified_cooperative_confirmed: true
  },
  w2: [
    {
      employer_name: "SUMMIT ROBOTICS INC",
      employer_ein: "84-1234567",
      employer_address_line1: "1600 Market St",
      employer_address_city: "Denver",
      employer_address_state: "CO",
      employer_address_zip: "80202",
      employee_ssn: "400-11-2222",
      box1_wages: 118500,
      box2_fed_withheld: 14200,
      box3_ss_wages: 126000,
      box4_ss_withheld: 7812,
      box5_medicare_wages: 126000,
      box6_medicare_withheld: 1827,
      box12_entries: [
        {
          code: "D",
          amount: 7500
        },
        {
          code: "W",
          amount: 2400
        },
        {
          code: "DD",
          amount: 9800
        }
      ],
      source_document_reference: "W2-2025-1"
    },
    {
      employer_name: "FRONT RANGE STUDIO LLC",
      employer_ein: "84-7654321",
      employer_address_line1: "55 Pearl St",
      employer_address_city: "Boulder",
      employer_address_state: "CO",
      employer_address_zip: "80302",
      employee_ssn: "400-11-3333",
      box1_wages: 46200,
      box2_fed_withheld: 3900,
      box3_ss_wages: 46200,
      box4_ss_withheld: 2864.4,
      box5_medicare_wages: 46200,
      box6_medicare_withheld: 669.9,
      box10_dep_care: 0,
      source_document_reference: "W2-2025-2"
    }
  ],
  f1099int: [
    {
      payer_name: "MOUNTAIN CREDIT UNION",
      payer_tin: "841111111",
      box1: 1240.55,
      recipient_tin: "400112222",
      source_document_reference: "1099INT-MCU-2025"
    }
  ],
  f1099div: [
    {
      payerName: "VANGUARD BROKERAGE",
      isNominee: false,
      box11: false,
      box1a: 3820,
      recipient_tin: "400112222",
      source_document_reference: "1099DIV-VANGUARD-2025",
      box1b: 960,
      box2a: 950,
      payerTin: "843333333"
    }
  ],
  schedule_c: [
    {
      line_a_principal_business: "Freelance graphic design",
      line_b_business_code: "541430",
      line_c_business_name: "Rivera Design",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_1_gross_receipts: 38400,
      line_8_advertising: 650,
      line_18_office_expense: 1200,
      line_22_supplies: 980,
      line_25_utilities: 720,
      line_30_home_office: 0,
      proprietor_recipient: "S",
      business_reference: "SCH-C-RIVERA-DESIGN",
      qbi_no_other_adjustments_confirmed: true,
      line_i_made_1099_payments: false
    }
  ],
  schedule_b_part_iii: {
    foreign_accounts_question: false,
    foreign_trust_question: false
  },
  f8812_credit_limit_worksheet: {
    credit_limit_worksheet: {
      schedule3_line1: 0,
      schedule3_line2: 0,
      schedule3_line3: 0,
      schedule3_line4: 0,
      schedule3_line5b: 0,
      schedule3_line6d: 0,
      schedule3_line6f: 0,
      schedule3_line6l: 0,
      schedule3_line6m: 0,
      worksheet_b_applies: false
    }
  },
  form8889: {
    beneficiary_identity: {
      owner: "T",
      name: "Jordan Rivera",
      ssn: "400-11-2222"
    },
    eligible_hdhp_coverage_by_month: [
      "family",
      "family",
      "family",
      "family",
      "family",
      "family",
      "family",
      "family",
      "family",
      "family",
      "family",
      "family"
    ],
    employer_contribution_years: {
      made_in_2025_for_2024_in_w2: 0,
      made_in_2026_for_2025: 0
    },
    age_55_or_older: false,
    last_month_rule_elected: false,
    married_at_year_end: true,
    spouse_has_separate_hsa: false
  },
  f1099b: [
    {
      description: "100 SH ACME CORP",
      part: "A",
      date_acquired: "2025-03-15",
      date_sold: "2025-09-20",
      proceeds: 8450,
      cost_basis: 7200,
      recipient_ssn: "400112222",
      payer_tin: "842222222",
      account_number: "VB-55190",
      transaction_id: "TX-1"
    },
    {
      description: "50 SH GLOBEX",
      part: "D",
      date_acquired: "2021-06-01",
      date_sold: "2025-11-04",
      proceeds: 15600,
      cost_basis: 9100,
      recipient_ssn: "400112222",
      payer_tin: "842222222",
      account_number: "VB-55190",
      transaction_id: "TX-2"
    }
  ]
};

export function jointInvestmentQbiInputs() {
  return structuredClone(jointInputs);
}

export function singleInvestmentQbiInputs() {
  const i = jointInvestmentQbiInputs();
  const general = Object.fromEntries(
    Object.entries(i.general).filter(([key]) => !key.startsWith("spouse")),
  );
  const w2 = {
    ...i.w2[0],
    box12_entries: [
      { code: "D", amount: 7500 },
      { code: "W", amount: 2000 },
      { code: "DD", amount: 9800 },
    ],
  };
  const { f8812_credit_limit_worksheet: _, form8889, ...rest } = i;
  const { spouse_has_separate_hsa: __, ...hsa } = form8889;
  return {
    ...rest,
    general: { ...general, filing_status: "single", dependents: [] },
    w2: [w2],
    schedule_c: [{ ...i.schedule_c[0], proprietor_recipient: "T" }],
    form8889: {
      ...hsa,
      eligible_hdhp_coverage_by_month: Array(12).fill("self_only"),
      married_at_year_end: false,
    },
  };
}

const address = {
  line1: "742 Evergreen Terrace",
  city: "Denver",
  state: "CO",
  zip: "80203",
};
const singleFiler = {
  primarySSN: "400112222",
  firstName: "Jordan",
  lastName: "Rivera",
  firstNameWithInitial: "Jordan",
  fullName: "Jordan Rivera",
  nameLine1: "JORDAN RIVERA",
  nameControl: "RIVE",
  address,
  filingStatus: FilingStatus.Single,
};

export const form8995InvestmentReviewFixtures: readonly PdfReviewFixture[] = [
  {
    id: "joint-spouse-c-qbi-investment-income",
    inputs: jointInvestmentQbiInputs(),
    filer: {
      ...singleFiler,
      nameLine1: "JORDAN & CASEY RIVERA",
      filingStatus: FilingStatus.MarriedFilingJointly,
      spouse: {
        ssn: "400113333",
        firstName: "Casey",
        lastName: "Rivera",
        nameControl: "RIVE",
      },
    },
    expectedPdfForms: [
      "f1040",
      "schedule1",
      "schedule2",
      "schedule_b",
      "schedule_c",
      "schedule_d",
      "schedule_se",
      "f8812",
      "form8889",
      "form8995",
    ],
    reviewFocus: [
      "Form 8995 line 11 is AGI 210,849 less the 31,500 standard deduction",
      "Form 8995 line 12 is 960 qualified dividends plus 7,450 Schedule D net capital gain",
      "Form 8995 line 15 is the 6,478 QBI component under the 34,188 income limit",
      "No Form 8960 below the 250,000 MFJ MAGI threshold",
    ],
  },
  {
    id: "single-c-qbi-investment-income",
    inputs: singleInvestmentQbiInputs(),
    filer: singleFiler,
    expectedPdfForms: [
      "f1040",
      "schedule1",
      "schedule2",
      "schedule_b",
      "schedule_c",
      "schedule_d",
      "schedule_se",
      "form8889",
      "form8995",
    ],
    reviewFocus: [
      "Form 8995 line 11 is AGI 164,649 less the 15,750 standard deduction",
      "Form 8995 line 12 is 960 qualified dividends plus 7,450 Schedule D net capital gain",
    ],
  },
];
