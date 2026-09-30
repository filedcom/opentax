import { type FilerIdentity, FilingStatus } from "../../mef/header.ts";
import {
  DistributionCode,
  RolloverCode,
} from "../../nodes/inputs/f1099r/index.ts";
import { EnergyType } from "../../nodes/inputs/f8835/index.ts";
import { CoverageType } from "../../nodes/intermediate/forms/form8889/index.ts";
import { LanguagePreferenceCode } from "../../nodes/inputs/schedule_lep/index.ts";
import { FilingStatus as SourceFilingStatus } from "../../nodes/types.ts";

/** Synthetic source returns for the held TY2025 filled-PDF review. */
export interface PdfReviewFixture {
  readonly id: string;
  readonly inputs: Readonly<Record<string, unknown>>;
  readonly filer: FilerIdentity;
  readonly expectedPdfForms: readonly string[];
  readonly reviewFocus: readonly string[];
}

const singleFiler: FilerIdentity = {
  primarySSN: "111223333",
  firstName: "Alex",
  lastName: "Example",
  firstNameWithInitial: "Alex",
  fullName: "Alex Example",
  nameLine1: "ALEX EXAMPLE",
  nameControl: "EXAM",
  address: {
    line1: "1 Example Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  filingStatus: FilingStatus.Single,
};

const jointFiler: FilerIdentity = {
  ...singleFiler,
  filingStatus: FilingStatus.MarriedFilingJointly,
  nameLine1: "ALEX AND SAM EXAMPLE",
  fullName: "Alex Example",
  spouse: {
    ssn: "444556666",
    firstName: "Sam",
    lastName: "Example",
    nameControl: "EXAM",
  },
};

const mfsFiler: FilerIdentity = {
  ...singleFiler,
  filingStatus: FilingStatus.MarriedFilingSeparately,
  spouse: {
    ssn: "222334444",
    firstName: "Other",
    lastName: "Taxpayer",
    nameControl: "TAXP",
  },
};

const singleGeneral = {
  filing_status: SourceFilingStatus.Single,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Example",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1985-06-15",
  address_line1: "1 Example Way",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
  digital_assets: false,
};

const jointGeneral = {
  ...singleGeneral,
  filing_status: SourceFilingStatus.MFJ,
  spouse_first_name: "Sam",
  spouse_last_name: "Example",
  spouse_ssn: "444-55-6666",
  spouse_dob: "1987-03-10",
};

const childFiler: FilerIdentity = {
  ...singleFiler,
  primarySSN: "123456789",
  lastName: "Child",
  fullName: "Alex Child",
  nameLine1: "ALEX CHILD",
  nameControl: "CHIL",
};

function wage(
  wages: number,
  withholding: number,
  employerName: string,
  employerEin: string,
) {
  return {
    box1_wages: wages,
    box2_fed_withheld: withholding,
    box3_ss_wages: Math.min(wages, 176_100),
    box4_ss_withheld: Math.min(wages, 176_100) * 0.062,
    box5_medicare_wages: wages,
    box6_medicare_withheld: wages * 0.0145,
    employer_ein: employerEin,
    employer_name: employerName,
    employer_address_line1: "10 Employer Road",
    employer_address_city: "Austin",
    employer_address_state: "TX",
    employer_address_zip: "78701",
    box12_entries: [],
  };
}

function geothermalFacility(
  description: string,
  addressLine1: string,
  latitude: number,
  longitude: number,
) {
  return {
    energy_type: EnergyType.Geothermal,
    subject_to_passive_activity_limit: false,
    kwh_produced: 100_000,
    kwh_sold: 100_000,
    facility_description: description,
    facility_us_address: {
      line1: addressLine1,
      city: "Wilmington",
      state: "DE",
      zip: "19801",
    },
    facility_latitude: latitude,
    facility_longitude: longitude,
    facility_owned_by_filer: true,
    ac_nameplate_kw: 1_500,
    maximum_net_output_mw: 1.5,
    facility_placed_in_service_date: "2024-01-01",
    facility_construction_start_date: "2023-06-01",
    production_period_start_date: "2025-01-01",
    production_period_end_date: "2025-12-31",
    increased_credit_reason: "none" as const,
    domestic_content_bonus: false,
    energy_community_bonus: false,
    is_fiscal_year: false,
  };
}

function windFacility() {
  return {
    ...geothermalFacility(
      "Wind production site",
      "30 Wind Farm Rd",
      39.323456,
      -75.323456,
    ),
    energy_type: EnergyType.Wind,
  };
}

export const pdfReviewFixtures: readonly PdfReviewFixture[] = [
  {
    id: "single-child-unearned-income",
    inputs: {
      general: {
        ...singleGeneral,
        taxpayer_last_name: "Child",
        taxpayer_ssn: "123-45-6789",
        taxpayer_dob: "2011-06-15",
        taxpayer_can_be_claimed_as_dependent: true,
        dependent_earned_income: 0,
      },
      schedule_b_part_iii: {
        foreign_accounts_question: false,
        foreign_trust_question: false,
      },
      f1099int: [{ payer_name: "Domestic Bank", box1: 5_000 }],
      f8615: {
        eligibility_confirmed: true,
        parent_name: "Jane Parent",
        parent_name_control: "PARE",
        parent_ssn: "987-65-4321",
        parent_filing_status: SourceFilingStatus.MFJ,
        parent_taxable_income: 80_000,
        parent_income_tax: 9_126,
        parent_tax_method: "ordinary",
        child_unearned_income: 5_000,
        other_children_line5: [],
        other_children_qualified_dividends_line5: [],
        other_children_net_capital_gain_line5: [],
        other_children_schedule_d_tax_worksheet_used: [],
        other_children_form2555_used: [],
        parent_qualified_dividends: 0,
        parent_net_capital_gain: 0,
      },
    },
    filer: childFiler,
    expectedPdfForms: ["f1040", "schedule_b", "form8615"],
    reviewFocus: [
      "Form 8615 identifies the child and parent, checks the parent's MFJ status, and prints its calculated lines",
      "Schedule B interest and Form 1040 line 2b carry the same 5,000 once",
      "Form 8615 line 18 agrees with Form 1040 line 16 and native XML",
    ],
  },
  {
    id: "single-high-wage-no-niit",
    inputs: {
      general: singleGeneral,
      w2: [wage(220_000, 40_000, "Example Employer", "12-3456789")],
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule2", "form8959", "form8960"],
    reviewFocus: [
      "Form 8960 prints 220,000 MAGI above the 200,000 filing threshold despite zero NII and NIIT",
      "Form 8959 and Schedule 2 carry Additional Medicare Tax without a Schedule 2 NIIT amount",
      "Form 1040 tax and payments reconcile with the 220,000 W-2 wages and withholding",
    ],
  },
  {
    id: "single-w2-refund",
    inputs: {
      general: singleGeneral,
      w2: [wage(75_000, 11_000, "Example Employer", "12-3456789")],
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040"],
    reviewFocus: [
      "Two Form 1040 pages, correct year and identity on both pages",
      "Single and digital-assets No boxes, with no unrelated header box checked",
      "Lines 1a, 1z, 25a, 33 and 35a match the computed return",
      "A zero-valued line stays blank where the IRS form requires a blank",
    ],
  },
  {
    id: "single-1098-purchase-points",
    inputs: {
      general: singleGeneral,
      w2: [wage(80_000, 12_000, "Example Employer", "12-3456789")],
      f1098: [{
        lender_name: "Home Lender",
        recipient_tin: singleGeneral.taxpayer_ssn,
        source_document_reference: "Synthetic 2025 Form 1098 copy 1",
        box1_mortgage_interest: 18_000,
        box1_current_year_deductible_interest: 18_000,
        box1_deduction_workpaper_reference: "2025 interest workpaper",
        box6_points_paid: 2_400,
        box6_current_year_deductible_points: 2_400,
        box6_deduction_workpaper_reference: "2025 purchase-points workpaper",
        for_routing: "A",
      }],
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule_a"],
    reviewFocus: [
      "Schedule A line 8a prints 20,400 of reported mortgage interest and purchase points; line 8c remains blank",
      "Form 1040 line 12e matches the 20,400 itemized deduction",
      "The taxpayer name and SSN print on Schedule A and both Form 1040 pages",
    ],
  },
  {
    id: "single-1098-prior-year-recovery",
    inputs: {
      general: singleGeneral,
      w2: [wage(80_000, 12_000, "Example Employer", "12-3456789")],
      f1098: [{
        lender_name: "Home Lender",
        recipient_tin: singleGeneral.taxpayer_ssn,
        source_document_reference: "Synthetic 2025 Form 1098 recovery copy",
        box1_mortgage_interest: 18_000,
        box1_current_year_deductible_interest: 18_000,
        box1_deduction_workpaper_reference: "2025 Pub. 936 interest workpaper",
        box4_refund_overpaid: 2_000,
        box4_prior_year_refund: true,
        box4_taxable_recovery_verified_amount: 1_200,
        box4_recovery_workpaper_reference:
          "2025 Pub. 525 tax-benefit workpaper",
        for_routing: "A",
      }],
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule1", "schedule_a"],
    reviewFocus: [
      "Schedule A line 8a prints current-year interest of 18,000 without netting the prior-year refund",
      "Schedule 1 line 8z describes and reports only the reviewed 1,200 taxable recovery",
      "Form 1040 line 8 and AGI include the 1,200 recovery once",
    ],
  },
  {
    id: "single-8862-ctc-reinstatement",
    inputs: {
      general: {
        ...singleGeneral,
        main_home_in_us_over_half_year: true,
        taxpayer_ssn_valid_for_employment: true,
        taxpayer_ssn_issued_before_due_date: true,
        taxpayer_tin_issued_by_due_date: true,
        dependents: [{
          first_name: "Jamie",
          last_name: "Example",
          name_control: "EXAM",
          ssn: "222-33-4444",
          ssn_valid_for_employment: true,
          ssn_issued_before_due_date: true,
          tin_issued_by_due_date: true,
          dob: "2015-06-15",
          relationship: "daughter",
          irs_relationship_code: "DAUGHTER",
          months_in_home: 12,
          lived_in_us_over_half_year: true,
          us_citizen_national_or_resident: true,
          provided_over_half_own_support: false,
          filed_joint_return_except_refund_only: false,
        }],
      },
      w2: [wage(80_000, 12_000, "Example Employer", "12-3456789")],
      f8812: [{
        qualifying_children_count: 1,
        other_dependents_count: 0,
        filing_status: SourceFilingStatus.Single,
        agi: 80_000,
        income_tax_liability: 9_055,
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
          worksheet_b_applies: false,
        },
      }],
      f8862: {
        claim_ctc: true,
        credit_disallowance_ban_active: false,
        ctc_children: [{
          first_name: "Jamie",
          last_name: "Example",
          lived_with_over_half_year: true,
          qualifying_child: true,
          dependent: true,
          us_citizen_national_or_resident: true,
        }],
      },
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule_8812", "f8862"],
    reviewFocus: [
      "Form 8862 Part III names the same child as the Form 1040 dependent and checks the CTC eligibility answers",
      "Schedule 8812 and Form 1040 carry the restored child tax credit once",
      "The native Form 8862 child joins the finalized Form 1040 dependent credit row",
    ],
  },
  {
    id: "single-five-dependent-continuation",
    inputs: {
      general: {
        ...singleGeneral,
        main_home_in_us_over_half_year: true,
        taxpayer_tin_issued_by_due_date: true,
        dependents: ["Jamie", "Casey", "Riley", "Morgan", "Taylor"].map(
          (first_name, index) => ({
            first_name,
            last_name: "Example",
            name_control: "EXAM",
            ssn: `222-33-${String(4444 + index).padStart(4, "0")}`,
            tin_issued_by_due_date: true,
            dob: "2007-06-15",
            relationship: "daughter",
            irs_relationship_code: "DAUGHTER",
            months_in_home: 12,
            lived_in_us_over_half_year: true,
            us_citizen_national_or_resident: true,
            provided_over_half_own_support: false,
            filed_joint_return_except_refund_only: false,
          }),
        ),
      },
      w2: [wage(80_000, 12_000, "Example Employer", "12-3456789")],
      f8812: [{
        qualifying_children_count: 0,
        other_dependents_count: 5,
        filing_status: SourceFilingStatus.Single,
        agi: 80_000,
        income_tax_liability: 9_055,
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
          worksheet_b_applies: false,
        },
      }],
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule_8812"],
    reviewFocus: [
      "Form 1040 checks the overflow box, prints four dependent columns, and appends the fifth dependent's complete statement",
      "The taxpayer U.S. main-home checkbox is present in both native XML and the filled Form 1040 PDF",
      "Schedule 8812 and Form 1040 reconcile five other-dependent credit claims",
    ],
  },
  {
    id: "single-withheld-w2g",
    inputs: {
      general: singleGeneral,
      w2g: [{
        calendar_year: 2025,
        source_document_reference: "2025 Casino W-2G recipient copy",
        payer_name: "Casino Inc",
        payer_name_control: "CASI",
        payer_us_address: {
          line1: "500 Casino Way",
          city: "Las Vegas",
          state: "NV",
          zip: "89101",
        },
        payer_ein: "12-3456789",
        winner_name: "Alex Example",
        winner_us_address: {
          line1: "1 Example Way",
          city: "Austin",
          state: "TX",
          zip: "78701",
        },
        box9_winner_tin: "111-22-3333",
        box1_winnings: 10_000,
        box4_federal_withheld: 2_400,
        standard_or_nonstandard_code: "S",
      }],
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule1", "w2g"],
    reviewFocus: [
      "Schedule 1 line 8b and Form 1040 income include the $10,000 box 1 winnings once",
      "Form 1040 line 25c and the W-2G copy each show $2,400 withheld",
      "The recipient Copy B display names the same payer, winner, TIN, and address as the native W-2G",
    ],
  },
  {
    id: "single-schedule-h-three-state-futa",
    inputs: {
      general: singleGeneral,
      schedule_h: {
        employer_ein: "123456789",
        cash_wages_over_2025_limit: false,
        cash_wages_over_quarter_limit: true,
        federal_unemployment: {
          paid_only_one_state: false,
          all_contributions_paid_on_time: true,
          all_futa_wages_state_taxable: true,
          taxable_futa_wages: 3_000,
          state_rows: ["OH", "NY", "PA"].map((state) => ({
            state,
            taxable_state_wages: 1_000,
            contributions_paid_by_due_date: 30,
          })),
        },
      },
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule2", "schedule_h"],
    reviewFocus: [
      "Schedule H line 17 prints OH and NY with PA on the attached continuation",
      "The three state contribution rows sum to line 18 and the $90 FUTA tax reaches Schedule 2 line 9 once",
      "Native Schedule H contains all three state rows and the Form 1040 tax and amount owed match",
    ],
  },
  {
    id: "single-form8814-child-dividends-adjustments",
    inputs: {
      general: singleGeneral,
      w2: [wage(80_000, 12_000, "Example Employer", "12-3456789")],
      f8814: [{
        child_name: "Jamie Example",
        child_name_control: "EXAM",
        child_ssn: "222-33-4444",
        child_age_eligible: true,
        child_required_to_file: true,
        child_income_only_permitted_types: true,
        child_no_joint_return: true,
        child_no_estimated_payments: true,
        child_no_withholding: true,
        parent_eligible_to_elect: true,
        interest_income: 1_850,
        interest_adjustments: {
          nominee_distribution: 120,
          accrued_interest: 30,
          abp_adjustment: 15,
          oid_adjustment: 5,
        },
        dividend_income: 1_850,
        qualified_dividends: 1_850,
      }],
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule1", "form8814"],
    reviewFocus: [
      "Form 8814 child identity, adjusted line 1a interest, qualified dividend allocation, and linked interest statement print together",
      "Form 1040 line 3a/3b child-dividend marks, Schedule 1 line 8z, and line 16 election tax reconcile once",
      "Native Form 8814 and child-interest statement references pass local TY2025 v5.4 XSD",
    ],
  },
  {
    id: "single-ordinary-noncash-gift",
    inputs: {
      general: singleGeneral,
      w2: [wage(100_000, 16_000, "Example Employer", "12-3456789")],
      schedule_a: {
        line_5a_state_income_tax: 24_000,
        line_8a_mortgage_interest_1098: 12_000,
        current_noncash_gift_inventory_complete_confirmed: true,
        other_prior_charitable_carryovers_absent_confirmed: true,
        capital_gain_property_carryovers: [],
      },
      f8283: {
        section_a_items: [{
          property_description: "Purchased used books",
          donee_organization_name: "Community Library",
          donee_organization_us_address: {
            line1: "12 Library Lane",
            city: "Austin",
            state: "TX",
            zip: "78701",
          },
          date_acquired: "2025-02-01",
          date_contributed: "2025-11-13",
          donor_acquisition_description: "Purchase",
          fmv: 1_200,
          deduction_claimed: 1_200,
          cost_or_adjusted_basis: 1_800,
          fmv_method: "thrift_shop_value",
          charitable_limit_category: "noncash_50",
          is_capital_gain_property: false,
        }],
      },
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule_a", "form8283"],
    reviewFocus: [
      "Form 8283 Section A prints the fully sourced ordinary gift without a reduction statement",
      "Schedule A line 12 includes the 1,200 gift once and reconciles with Form 1040 itemized deductions",
      "Native Form 8283 and the filled PDF identify the same donee, property, dates, basis, and claim",
    ],
  },
  {
    id: "single-geothermal-general-business-credit",
    inputs: {
      general: singleGeneral,
      w2: [wage(150_000, 30_000, "Example Employer", "12-3456789")],
      f8835: [geothermalFacility(
        "Geothermal production site",
        "10 Plant Rd",
        39.123456,
        -75.123456,
      )],
    },
    filer: singleFiler,
    expectedPdfForms: [
      "f1040",
      "schedule3",
      "form6251",
      "form3800",
      "form8835",
    ],
    reviewFocus: [
      "One $600 geothermal credit flows from Form 8835 to Form 3800 line 38, Schedule 3 line 6a, and Form 1040 line 20",
      "All nine official Form 3800 pages print from the same typed parts and reserved IDs as native XML",
      "Form 3800 Parts III and V identify the same facility source and its $600 tax use",
    ],
  },
  {
    id: "single-two-geothermal-business-credits",
    inputs: {
      general: singleGeneral,
      w2: [wage(150_000, 30_000, "Example Employer", "12-3456789")],
      f8835: [
        geothermalFacility(
          "Geothermal production site",
          "10 Plant Rd",
          39.123456,
          -75.123456,
        ),
        geothermalFacility(
          "Second geothermal production site",
          "20 Plant Rd",
          39.223456,
          -75.223456,
        ),
      ],
    },
    filer: singleFiler,
    expectedPdfForms: [
      "f1040",
      "schedule3",
      "form6251",
      "form3800",
      "form8835",
      "form8835",
    ],
    reviewFocus: [
      "Two distinct Form 8835 facilities contribute $600 each to Form 3800 line 4e and line 38",
      "Both three-page Form 8835 copies print distinct source identities and the same taxpayer identity",
      "Form 3800's Part V source rows and $1,200 Schedule 3/Form 1040 joins match the two native Form 8835 documents",
    ],
  },
  {
    id: "single-wind-and-geothermal-business-credits",
    inputs: {
      general: singleGeneral,
      w2: [wage(150_000, 30_000, "Example Employer", "12-3456789")],
      f8835: [
        windFacility(),
        geothermalFacility(
          "Geothermal production site",
          "10 Plant Rd",
          39.123456,
          -75.123456,
        ),
      ],
    },
    filer: singleFiler,
    expectedPdfForms: [
      "f1040",
      "schedule3",
      "form6251",
      "form3800",
      "form8835",
      "form8835",
    ],
    reviewFocus: [
      "Wind and geothermal Form 8835 copies print their distinct Part I identities and Part II lines 1a and 1c",
      "Both $600 source credits reach distinct Form 3800 Part V rows and a $1,200 line 38",
      "Schedule 3 line 6a and Form 1040 line 20 match the two native source documents and printed copies",
    ],
  },
  {
    id: "single-new-markets-business-credit",
    inputs: {
      general: singleGeneral,
      w2: [wage(150_000, 30_000, "Example Employer", "12-3456789")],
      f8874: {
        investments: [{
          cde_name: "Community Development Entity",
          cde_ein: "123456789",
          cde_address: {
            line1: "10 Community Way",
            city: "Wilmington",
            state: "DE",
            zip: "19801",
          },
          initial_investment_date: "2025-04-15",
          credit_allowance_date: "2025-04-15",
          qualified_equity_investment_amount: 10_000,
          designation_notice_reference: "Synthetic 2025 QEI notice",
          held_on_credit_allowance_date: true,
          qualified_on_credit_allowance_date: true,
          recapture_notice_received: false,
          subject_to_passive_activity_limit: false,
        }],
      },
    },
    filer: singleFiler,
    expectedPdfForms: [
      "f1040",
      "schedule3",
      "form6251",
      "form3800",
      "form8874",
    ],
    reviewFocus: [
      "One sourced 10,000 qualified equity investment prints at 5% and a 500 credit on Form 8874",
      "The same 500 credit reaches Form 3800 Part III line 1i and line 38, Schedule 3 line 6a, and Form 1040 line 20",
      "One source stays on Form 3800 Part III line 1i; Part V remains blank because no same-line aggregate breakdown is required",
    ],
  },
  {
    id: "single-long-name-new-markets-investment",
    inputs: {
      general: singleGeneral,
      w2: [wage(150_000, 30_000, "Example Employer", "12-3456789")],
      f8874: {
        investments: [{
          cde_name:
            "Greater Wilmington Community Development And Neighborhood Equity Fund",
          cde_ein: "123456789",
          cde_address: {
            line1: "12345 Community Boulevard Ste 5",
            city: "Wilmington",
            state: "DE",
            zip: "19801",
          },
          initial_investment_date: "2025-04-15",
          credit_allowance_date: "2025-04-15",
          qualified_equity_investment_amount: 10_000,
          designation_notice_reference: "Synthetic long CDE QEI notice",
          held_on_credit_allowance_date: true,
          qualified_on_credit_allowance_date: true,
          recapture_notice_received: false,
          subject_to_passive_activity_limit: false,
        }],
      },
    },
    filer: singleFiler,
    expectedPdfForms: [
      "f1040",
      "schedule3",
      "form6251",
      "form3800",
      "form8874",
    ],
    reviewFocus: [
      "The long CDE name and address move to a wrapped supplemental page without clipping",
      "Form 8874 last row says See attached and carries the single 500 source credit",
      "Form 3800, Schedule 3, and Form 1040 each use the same 500 credit",
    ],
  },
  {
    id: "single-two-new-markets-investments",
    inputs: {
      general: singleGeneral,
      w2: [wage(150_000, 30_000, "Example Employer", "12-3456789")],
      f8874: {
        investments: [{
          cde_name: "First Community Entity",
          cde_ein: "123456789",
          cde_address: {
            line1: "10 Community Way",
            city: "Wilmington",
            state: "DE",
            zip: "19801",
          },
          initial_investment_date: "2025-04-15",
          credit_allowance_date: "2025-04-15",
          qualified_equity_investment_amount: 10_000,
          designation_notice_reference: "Synthetic first QEI notice",
          held_on_credit_allowance_date: true,
          qualified_on_credit_allowance_date: true,
          recapture_notice_received: false,
          subject_to_passive_activity_limit: false,
        }, {
          cde_name: "Second Community Entity",
          cde_ein: "234567890",
          cde_address: {
            line1: "20 Cedar Avenue",
            city: "Dover",
            state: "DE",
            zip: "19901",
          },
          initial_investment_date: "2022-05-10",
          credit_allowance_date: "2025-05-10",
          qualified_equity_investment_amount: 10_000,
          designation_notice_reference: "Synthetic fourth-year QEI notice",
          held_on_credit_allowance_date: true,
          qualified_on_credit_allowance_date: true,
          recapture_notice_received: false,
          subject_to_passive_activity_limit: false,
        }],
      },
    },
    filer: singleFiler,
    expectedPdfForms: [
      "f1040",
      "schedule3",
      "form6251",
      "form3800",
      "form8874",
    ],
    reviewFocus: [
      "Two CDE identities and addresses occupy separate Form 8874 rows without clipping",
      "A first-year 5% credit of 500 and fourth-year 6% credit of 600 combine to 1,100 on line 3",
      "Form 3800 Part III line 1i and line 38, Schedule 3 line 6a, and Form 1040 line 20 each show 1,100",
    ],
  },
  {
    id: "single-six-new-markets-investments",
    inputs: {
      general: singleGeneral,
      w2: [wage(150_000, 30_000, "Example Employer", "12-3456789")],
      f8874: {
        investments: Array.from({ length: 6 }, (_, index) => ({
          cde_name: `Community Entity ${index + 1}`,
          cde_ein: String(123456780 + index),
          cde_address: {
            line1: `${10 + index} Example Way`,
            city: "Dover",
            state: "DE",
            zip: "19901",
          },
          initial_investment_date: "2025-04-15",
          credit_allowance_date: "2025-04-15",
          qualified_equity_investment_amount: 10_000,
          designation_notice_reference: `Synthetic QEI notice ${index + 1}`,
          held_on_credit_allowance_date: true,
          qualified_on_credit_allowance_date: true,
          recapture_notice_received: false,
          subject_to_passive_activity_limit: false,
        })),
      },
    },
    filer: singleFiler,
    expectedPdfForms: [
      "f1040",
      "schedule3",
      "form6251",
      "form3800",
      "form8874",
    ],
    reviewFocus: [
      "Six distinct CDE identities fill all Form 8874 rows without clipping or a missing last row",
      "Six 5% credits of 500 combine to 3,000 on Form 8874 line 3",
      "Form 3800 Part III line 1i and line 38, Schedule 3 line 6a, and Form 1040 line 20 each show 3,000",
    ],
  },
  {
    id: "single-seven-new-markets-investments",
    inputs: {
      general: singleGeneral,
      w2: [wage(150_000, 30_000, "Example Employer", "12-3456789")],
      f8874: {
        investments: Array.from({ length: 7 }, (_, index) => ({
          cde_name: `Community Entity ${index + 1}`,
          cde_ein: String(123456780 + index),
          cde_address: {
            line1: `${10 + index} Example Way`,
            city: "Dover",
            state: "DE",
            zip: "19901",
          },
          initial_investment_date: "2025-04-15",
          credit_allowance_date: "2025-04-15",
          qualified_equity_investment_amount: 10_000,
          designation_notice_reference: `Synthetic QEI notice ${index + 1}`,
          held_on_credit_allowance_date: true,
          qualified_on_credit_allowance_date: true,
          recapture_notice_received: false,
          subject_to_passive_activity_limit: false,
        })),
      },
    },
    filer: singleFiler,
    expectedPdfForms: [
      "f1040",
      "schedule3",
      "form6251",
      "form3800",
      "form8874",
    ],
    reviewFocus: [
      "Five QEI investments print on Form 8874, with See attached and a 1,000 credit on its last row",
      "The supplemental page shows investments six and seven with all six source columns",
      "Seven 500 credits combine to 3,500 on Form 8874, Form 3800, Schedule 3, and Form 1040",
    ],
  },
  {
    id: "single-twenty-four-new-markets-investments",
    inputs: {
      general: singleGeneral,
      w2: [wage(500_000, 100_000, "Example Employer", "12-3456789")],
      f8874: {
        investments: Array.from({ length: 24 }, (_, index) => ({
          cde_name: `Community Entity ${index + 1}`,
          cde_ein: String(123456780 + index),
          cde_address: {
            line1: `${10 + index} Example Way`,
            city: "Dover",
            state: "DE",
            zip: "19901",
          },
          initial_investment_date: "2025-04-15",
          credit_allowance_date: "2025-04-15",
          qualified_equity_investment_amount: 10_000,
          designation_notice_reference: `Synthetic QEI notice ${index + 1}`,
          held_on_credit_allowance_date: true,
          qualified_on_credit_allowance_date: true,
          recapture_notice_received: false,
          subject_to_passive_activity_limit: false,
        })),
      },
    },
    filer: singleFiler,
    expectedPdfForms: [
      "f1040",
      "schedule2",
      "schedule3",
      "form8959",
      "form8960",
      "form6251",
      "form3800",
      "form8874",
    ],
    reviewFocus: [
      "Five direct Form 8874 rows and a last-row 9,500 attachment total reconcile with nineteen further investments",
      "The supplemental page sequence lists investments 6-23 on page one and investment 24 on page two",
      "Twenty-four 500 credits combine to 12,000 on Form 8874, Form 3800, Schedule 3, and Form 1040 alongside high-wage Schedule 2 tax",
    ],
  },
  {
    id: "single-geothermal-and-new-markets-credits",
    inputs: {
      general: singleGeneral,
      w2: [wage(150_000, 30_000, "Example Employer", "12-3456789")],
      f8835: [geothermalFacility(
        "Geothermal production site",
        "10 Plant Rd",
        39.123456,
        -75.123456,
      )],
      f8874: {
        investments: [{
          cde_name: "Community Development Entity",
          cde_ein: "123456789",
          cde_address: {
            line1: "10 Community Way",
            city: "Wilmington",
            state: "DE",
            zip: "19801",
          },
          initial_investment_date: "2025-04-15",
          credit_allowance_date: "2025-04-15",
          qualified_equity_investment_amount: 10_000,
          designation_notice_reference: "Synthetic 2025 QEI notice",
          held_on_credit_allowance_date: true,
          qualified_on_credit_allowance_date: true,
          recapture_notice_received: false,
          subject_to_passive_activity_limit: false,
        }],
      },
    },
    filer: singleFiler,
    expectedPdfForms: [
      "f1040",
      "schedule3",
      "form6251",
      "form3800",
      "form8835",
      "form8874",
    ],
    reviewFocus: [
      "Distinct Form 8835 and Form 8874 source documents and PDF pages each retain their source identity",
      "Geothermal 600 enters Form 3800 Part III line 4e and New Markets 500 enters line 1i",
      "The 1,100 Form 3800 line 38 credit reaches Schedule 3 line 6a and Form 1040 line 20 once",
    ],
  },
  {
    id: "joint-two-w2s",
    inputs: {
      general: jointGeneral,
      w2: [
        wage(85_000, 9_000, "First Example Employer", "12-3456789"),
        wage(42_000, 4_000, "Second Example Employer", "98-7654321"),
      ],
    },
    filer: jointFiler,
    expectedPdfForms: ["f1040"],
    reviewFocus: [
      "MFJ box and both names/SSNs are placed without clipping",
      "Two source W-2 amounts combine once on lines 1a and 25a",
      "No duplicate Form 1040 pages or missing page 2",
    ],
  },
  {
    id: "joint-two-w2s-schedule-lep",
    inputs: {
      general: jointGeneral,
      w2: [
        wage(42_000, 4_000, "First Example Employer", "12-3456789"),
        wage(28_000, 2_500, "Second Example Employer", "98-7654321"),
      ],
      schedule_lep: {
        requests: [
          {
            person: "taxpayer",
            language_preference_code: LanguagePreferenceCode.Spanish,
          },
          {
            person: "spouse",
            language_preference_code: LanguagePreferenceCode.French,
          },
        ],
      },
    },
    filer: jointFiler,
    expectedPdfForms: ["f1040", "schedule_lep", "schedule_lep"],
    reviewFocus: [
      "Two W-2s give $70,000 wages and $6,500 withholding on the joint return",
      "The taxpayer's separate Schedule LEP page checks Spanish and prints Alex Example/111223333",
      "The spouse's separate Schedule LEP page checks French and prints Sam Example/444556666",
    ],
  },
  {
    id: "single-mixed-final-trust-and-partnership-capital",
    inputs: {
      general: singleGeneral,
      w2: [wage(30_000, 3_000, "Example Employer", "12-3456789")],
      k1_trust: [{
        estate_trust_name: "Family Trust",
        estate_trust_ein: "123456789",
        source_document_reference: "Synthetic final trust K-1",
        box11_code_c_short_term_capital_loss_carryover: 700,
        box11_code_c_statement_reference:
          "Synthetic final capital loss statement",
        box11_final_k1: true,
        box11_beneficiary_succeeds_to_property: true,
        beneficiary_ssn: "111223333",
      }],
      k1_partnership: [{
        partnership_name: "Example Partnership",
        partnership_ein: "987654321",
        source_document_reference: "Synthetic partnership K-1",
        box8_net_st_cap_gain: 900,
        box9a_net_lt_cap_gain: 100,
      }],
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule_d"],
    reviewFocus: [
      "Trust code C negative $700 and partnership box 8 positive $900 sum to Schedule D line 5 of $200",
      "Partnership box 9a adds $100 on Schedule D line 12, making Form 1040 capital gain $300",
      "Form 1040 AGI is $30,300; no K-1 amount is counted twice",
    ],
  },
  {
    id: "single-partnership-code-l-r-ordinary",
    inputs: {
      general: singleGeneral,
      w2: [wage(30_000, 3_000, "Example Employer", "12-3456789")],
      k1_partnership: [
        {
          partnership_name: "Alpha Partnership",
          partnership_ein: "123456789",
          source_document_reference: "Synthetic Alpha 2025 K-1",
          box11_line10_ordinary: [{
            code: "L",
            gain_loss: 400,
            statement_reference: "Alpha box 11 code L statement",
            recipient_tin: "111223333",
            ordinary_character_reviewed: true,
            character_workpaper_reference: "Alpha section 751b review",
          }],
        },
        {
          partnership_name: "Beta Partnership",
          partnership_ein: "987654321",
          source_document_reference: "Synthetic Beta 2025 K-1",
          box11_line10_ordinary: [{
            code: "R",
            gain_loss: 600,
            statement_reference: "Beta box 11 code R statement",
            recipient_tin: "111223333",
            ordinary_character_reviewed: true,
            character_workpaper_reference: "Beta ordinary character review",
          }],
        },
      ],
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule1", "f4797"],
    reviewFocus: [
      "Partnership box 11 code L and R retain separate $400/$600 Form 4797 line 10 rows",
      "Form 4797 line 17/18b and Schedule 1 line 4 carry $1,000 once",
      "Form 1040 line 8 and AGI include the $1,000 once",
    ],
  },
  {
    id: "single-six-partnership-code-l-r-continuation",
    inputs: {
      general: singleGeneral,
      w2: [wage(30_000, 3_000, "Example Employer", "12-3456789")],
      k1_partnership: [100, 200, 300, -50, 400, 50].map(
        (gain_loss, index) => {
          const number = index + 1;
          const code = index % 2 === 0 ? "L" : "R";
          return {
            partnership_name: `Partnership ${number}`,
            partnership_ein: `12345678${number}`,
            source_document_reference: `Synthetic partnership ${number} K-1`,
            box11_line10_ordinary: [{
              code,
              gain_loss,
              statement_reference: `Partnership ${number} box 11 statement`,
              recipient_tin: "111223333",
              ordinary_character_reviewed: true,
              character_workpaper_reference:
                `Partnership ${number} character review`,
            }],
          };
        },
      ),
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule1", "f4797"],
    reviewFocus: [
      "Six K-1 code L/R rows total $1,000 on Form 4797 line 10",
      "First three rows print on Form 4797; row four shows an attached $400 subtotal",
      "Attached statement lists source rows four through six, including the $50 loss",
      "Schedule 1 line 4 and Form 1040 line 8/AGI each carry $1,000 once",
    ],
  },
  {
    id: "single-two-partnership-code-s-capital",
    inputs: {
      general: singleGeneral,
      w2: [wage(30_000, 3_000, "Example Employer", "12-3456789")],
      k1_partnership: [
        {
          partnership_name: "Alpha Partnership",
          partnership_ein: "123456789",
          source_document_reference: "Synthetic Alpha 2025 K-1",
          box11_code_s_nonportfolio_capital: {
            short_term_gain_loss: 400,
            long_term_gain_loss: 0,
            nonpassive_reviewed: true,
            no_special_rate_components_confirmed: true,
            statement_reference: "Alpha box 11 code S statement",
            recipient_tin: "111223333",
            character_workpaper_reference: "Alpha capital character review",
          },
        },
        {
          partnership_name: "Beta Partnership",
          partnership_ein: "987654321",
          source_document_reference: "Synthetic Beta 2025 K-1",
          box11_code_s_nonportfolio_capital: {
            short_term_gain_loss: 0,
            long_term_gain_loss: 600,
            nonpassive_reviewed: true,
            no_special_rate_components_confirmed: true,
            statement_reference: "Beta box 11 code S statement",
            recipient_tin: "111223333",
            character_workpaper_reference: "Beta capital character review",
          },
        },
      ],
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule_d"],
    reviewFocus: [
      "Two code S partnership statements retain $400 short-term and $600 long-term gain separately",
      "Schedule D lines 5 and 12 carry the respective amounts and line 16 totals $1,000",
      "Form 1040 line 7a and AGI include the gain once",
    ],
  },
  {
    id: "single-partnership-code-k-and-w2g",
    inputs: {
      general: singleGeneral,
      w2: [wage(30_000, 3_000, "Example Employer", "12-3456789")],
      w2g: [{
        calendar_year: 2025,
        source_document_reference: "Synthetic casino W-2G recipient copy",
        payer_name: "Casino Inc",
        payer_name_control: "CASI",
        payer_us_address: {
          line1: "500 Casino Way",
          city: "Las Vegas",
          state: "NV",
          zip: "89101",
        },
        payer_ein: "12-3456789",
        winner_name: "Alex Example",
        winner_us_address: {
          line1: "1 Example Way",
          city: "Austin",
          state: "TX",
          zip: "78701",
        },
        box9_winner_tin: "111-22-3333",
        box1_winnings: 200,
        box4_federal_withheld: 50,
        standard_or_nonstandard_code: "S",
      }],
      k1_partnership: [
        {
          partnership_name: "Alpha Partnership",
          partnership_ein: "123456789",
          source_document_reference: "Synthetic Alpha 2025 K-1",
          box11_code_k_gambling: {
            reported_winnings: 400,
            reported_losses: 0,
            nonbusiness_gambling_confirmed: true,
            no_overlap_with_w2g_confirmed: true,
            statement_reference: "Alpha box 11 code K statement",
            recipient_tin: "111223333",
            gambling_review_reference: "Alpha gambling income review",
          },
        },
        {
          partnership_name: "Beta Partnership",
          partnership_ein: "987654321",
          source_document_reference: "Synthetic Beta 2025 K-1",
          box11_code_k_gambling: {
            reported_winnings: 600,
            reported_losses: 0,
            nonbusiness_gambling_confirmed: true,
            no_overlap_with_w2g_confirmed: true,
            statement_reference: "Beta box 11 code K statement",
            recipient_tin: "111223333",
            gambling_review_reference: "Beta gambling income review",
          },
        },
      ],
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule1", "w2g"],
    reviewFocus: [
      "Two partnership code K winnings of $400/$600 and distinct $200 W-2G make $1,200 on Schedule 1 line 8b",
      "Form 1040 line 8 and AGI include the $1,200 once",
      "W-2G $50 withholding is included in Form 1040 line 25c",
    ],
  },
  {
    id: "single-two-partnership-code-e-cod",
    inputs: {
      general: singleGeneral,
      w2: [wage(30_000, 3_000, "Example Employer", "12-3456789")],
      k1_partnership: [
        {
          partnership_name: "Alpha Partnership",
          partnership_ein: "123456789",
          source_document_reference: "Synthetic Alpha 2025 K-1",
          box11_code_e_cod: {
            reported_amount: 400,
            debt_reference: "Alpha debt A",
            statement_reference: "Alpha box 11 code E statement",
            recipient_tin: "111223333",
            fully_taxable_reviewed: true,
            no_section108_exclusion_confirmed: true,
            not_reported_on_form1099c_confirmed: true,
            taxability_workpaper_reference: "Alpha debt taxability review",
          },
        },
        {
          partnership_name: "Beta Partnership",
          partnership_ein: "987654321",
          source_document_reference: "Synthetic Beta 2025 K-1",
          box11_code_e_cod: {
            reported_amount: 600,
            debt_reference: "Beta debt B",
            statement_reference: "Beta box 11 code E statement",
            recipient_tin: "111223333",
            fully_taxable_reviewed: true,
            no_section108_exclusion_confirmed: true,
            not_reported_on_form1099c_confirmed: true,
            taxability_workpaper_reference: "Beta debt taxability review",
          },
        },
      ],
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule1"],
    reviewFocus: [
      "Separate fully taxable K-1 code E debts of $400 and $600 make $1,000 on Schedule 1 line 8c",
      "Form 1040 line 8 and AGI include the $1,000 once",
      "No Form 982 or Form 1099-C source is present",
    ],
  },
  {
    id: "single-two-partnership-code-j-recoveries",
    inputs: {
      general: singleGeneral,
      w2: [wage(30_000, 3_000, "Example Employer", "12-3456789")],
      k1_partnership: [
        {
          partnership_name: "Alpha Partnership",
          partnership_ein: "123456789",
          source_document_reference: "Synthetic Alpha 2025 K-1",
          box11_code_j_recovery: {
            reported_amount: 500,
            taxable_amount: 400,
            prior_year_tax_benefit_reviewed: true,
            prior_year_tax_benefit_workpaper_reference: "Alpha 2024 tax review",
            statement_reference: "Alpha box 11 code J statement",
            recipient_tin: "111223333",
          },
        },
        {
          partnership_name: "Beta Partnership",
          partnership_ein: "987654321",
          source_document_reference: "Synthetic Beta 2025 K-1",
          box11_code_j_recovery: {
            reported_amount: 700,
            taxable_amount: 600,
            prior_year_tax_benefit_reviewed: true,
            prior_year_tax_benefit_workpaper_reference: "Beta 2024 tax review",
            statement_reference: "Beta box 11 code J statement",
            recipient_tin: "111223333",
          },
        },
      ],
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule1"],
    reviewFocus: [
      "Separate K-1 code J recoveries of $400 and $600 make $1,000 on Schedule 1 line 8z",
      "Form 1040 line 8 and AGI include the $1,000 recovery once",
      "The linked native statement identifies each partnership source",
    ],
  },
  {
    id: "single-sourced-collectibles-gain",
    inputs: {
      general: singleGeneral,
      w2: [wage(30_000, 3_000, "Example Employer", "12-3456789")],
      f8949: [{
        part: "E",
        description: "Collectible artwork",
        source_transaction_id: "synthetic-collectible-sale",
        date_acquired: "2023-01-10",
        date_sold: "2025-06-20",
        proceeds: 5_000,
        cost_basis: 2_000,
        adjustment_codes: "C",
        adjustment_amount: 0,
      }],
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule_d", "f8949"],
    reviewFocus: [
      "The sourced long-term collectible sale reports $3,000 gain on Form 8949 and Schedule D",
      "The 28% rate amount reaches tax calculation exactly once",
      "Form 1040 capital gain is $3,000 and AGI is $33,000",
    ],
  },
  {
    id: "single-short-and-long-form8949-sales",
    inputs: {
      general: singleGeneral,
      w2: [wage(30_000, 3_000, "Example Employer", "12-3456789")],
      f8949: [{
        part: "B",
        description: "Short-term shares",
        source_transaction_id: "synthetic-short-sale",
        date_acquired: "2025-01-10",
        date_sold: "2025-06-20",
        proceeds: 2_000,
        cost_basis: 1_000,
      }, {
        part: "F",
        description: "Long-term shares",
        source_transaction_id: "synthetic-long-sale",
        date_acquired: "2022-01-10",
        date_sold: "2025-06-20",
        proceeds: 4_000,
        cost_basis: 2_000,
      }],
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule_d", "f8949"],
    reviewFocus: [
      "The short-term sale prints on Form 8949 box B and Schedule D line 2",
      "The long-term sale prints on Form 8949 box F and Schedule D line 10",
      "The $3,000 combined gain reaches Form 1040 line 7a and $33,000 AGI",
    ],
  },
  {
    id: "single-direct-broker-basis-sales",
    inputs: {
      general: singleGeneral,
      w2: [wage(30_000, 3_000, "Example Employer", "12-3456789")],
      f8949: [{
        part: "A",
        description: "Short-term broker shares",
        source_transaction_id: "synthetic-direct-short",
        date_acquired: "2025-01-10",
        date_sold: "2025-06-20",
        proceeds: 2_000,
        cost_basis: 1_000,
      }, {
        part: "D",
        description: "Long-term broker shares",
        source_transaction_id: "synthetic-direct-long",
        date_acquired: "2022-01-10",
        date_sold: "2025-06-20",
        proceeds: 4_000,
        cost_basis: 2_000,
      }],
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule_d"],
    reviewFocus: [
      "Unadjusted basis-reported sales print on Schedule D lines 1a and 8a",
      "The native return carries both direct-reporting groups without a Form 8949 document",
      "The $3,000 capital gain reaches Form 1040 line 7a and $33,000 AGI",
    ],
  },
  {
    id: "single-direct-and-adjusted-broker-sales",
    inputs: {
      general: singleGeneral,
      w2: [wage(30_000, 3_000, "Example Employer", "12-3456789")],
      f8949: [{
        part: "A",
        description: "Direct broker shares",
        source_transaction_id: "synthetic-direct-short-mixed",
        date_acquired: "2025-01-10",
        date_sold: "2025-06-20",
        proceeds: 2_000,
        cost_basis: 1_000,
      }, {
        part: "A",
        description: "Adjusted broker shares",
        source_transaction_id: "synthetic-adjusted-short-mixed",
        date_acquired: "2025-01-10",
        date_sold: "2025-06-20",
        proceeds: 500,
        cost_basis: 1_000,
        adjustment_codes: "W",
        adjustment_amount: 300,
      }],
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule_d", "f8949"],
    reviewFocus: [
      "The direct $1,000 gain prints only on Schedule D line 1a",
      "The adjusted $200 loss prints on Form 8949 box A and Schedule D line 1b",
      "The $800 net capital gain reaches Form 1040 line 7a and $30,800 AGI",
    ],
  },
  {
    id: "single-final-trust-k1-long-term-capital-loss",
    inputs: {
      general: singleGeneral,
      w2: [wage(30_000, 3_000, "Example Employer", "12-3456789")],
      k1_trust: [{
        estate_trust_name: "Family Trust",
        estate_trust_ein: "123456789",
        source_document_reference: "Synthetic final 2025 trust K-1",
        box11_code_d_long_term_capital_loss_carryover: 900,
        box11_code_d_statement_reference:
          "Synthetic final capital loss statement",
        box11_final_k1: true,
        box11_beneficiary_succeeds_to_property: true,
        beneficiary_ssn: "111223333",
      }],
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule_d"],
    reviewFocus: [
      "The final trust K-1 code D $900 loss prints as negative $900 on Schedule D line 12",
      "Schedule D lines 15 and 16 and Form 1040 line 7a carry the $900 loss once",
      "Form 1040 AGI is $29,100 after the loss",
    ],
  },
  {
    id: "single-final-trust-k1-short-term-capital-loss",
    inputs: {
      general: singleGeneral,
      w2: [wage(30_000, 3_000, "Example Employer", "12-3456789")],
      k1_trust: [{
        estate_trust_name: "Family Trust",
        estate_trust_ein: "123456789",
        source_document_reference: "Synthetic final 2025 trust K-1",
        box11_code_c_short_term_capital_loss_carryover: 700,
        box11_code_c_statement_reference:
          "Synthetic final capital loss statement",
        box11_final_k1: true,
        box11_beneficiary_succeeds_to_property: true,
        beneficiary_ssn: "111223333",
      }],
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule_d"],
    reviewFocus: [
      "The final trust K-1 code C $700 loss prints as negative $700 on Schedule D line 5",
      "Schedule D line 7 and Form 1040 line 7a carry the $700 capital loss once",
      "Form 1040 AGI is $29,300 after the loss",
    ],
  },
  {
    id: "single-final-trust-k1-section67e-deduction",
    inputs: {
      general: singleGeneral,
      w2: [wage(30_000, 3_000, "Example Employer", "12-3456789")],
      k1_trust: [{
        estate_trust_name: "Family Trust",
        estate_trust_ein: "123456789",
        source_document_reference: "Synthetic final 2025 trust K-1",
        box11_code_a_section67e_excess_deduction: 500,
        box11_code_a_statement_reference:
          "Synthetic final-year deduction statement",
        box11_final_k1: true,
        box11_beneficiary_succeeds_to_property: true,
        beneficiary_ssn: "111223333",
      }],
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule1"],
    reviewFocus: [
      "The final trust K-1 code A $500 deduction prints on Schedule 1 line 24k and line 26",
      "Form 1040 line 10 deducts $500 and line 11 AGI is $29,500",
      "The XML and PDF each include this beneficiary deduction once",
    ],
  },
  {
    id: "single-trust-k1-box5-schedule-e",
    inputs: {
      general: singleGeneral,
      w2: [wage(30_000, 3_000, "Example Employer", "12-3456789")],
      k1_trust: [{
        estate_trust_name: "Family Trust",
        estate_trust_ein: "123456789",
        source_document_reference: "Synthetic 2025 trust K-1",
        box5_other_portfolio: 750,
      }],
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule1", "schedule_e"],
    reviewFocus: [
      "The trust name, EIN, and $750 box 5 income print on Schedule E Part III, page 2",
      "Schedule E lines 34a, 35, 37, and 41 reconcile to $750 and Schedule 1 line 5",
      "Form 1040 wages $30,000 and Schedule 1 income $750 enter AGI once",
    ],
  },
  {
    id: "single-trust-k1-passive-schedule-e",
    inputs: {
      general: singleGeneral,
      w2: [wage(30_000, 3_000, "Example Employer", "12-3456789")],
      k1_trust: [{
        estate_trust_name: "Family Trust",
        estate_trust_ein: "123456789",
        source_document_reference: "Synthetic 2025 trust K-1",
        box6_ordinary_business: 300,
        box7_rental_real_estate: 200,
        box8_other_rental: 100,
        box6_8_activity_statement: [
          {
            box: "6",
            activity_name: "Shop",
            statement_reference: "Synthetic shop statement",
            income: 300,
          },
          {
            box: "7",
            activity_name: "House",
            statement_reference: "Synthetic house statement",
            income: 200,
          },
          {
            box: "8",
            activity_name: "Equipment",
            statement_reference: "Synthetic equipment statement",
            income: 100,
          },
        ],
      }],
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule1", "schedule_e"],
    reviewFocus: [
      "Three positive activity rows reconcile to K-1 boxes 6, 7, and 8",
      "The $600 total prints only in Schedule E Part III passive column (d), line 37, and line 41",
      "Schedule 1 line 5 and Form 1040 line 8 include the $600 once",
    ],
  },
  {
    id: "single-reviewed-car-loan-schedule1a",
    inputs: {
      general: {
        ...singleGeneral,
        taxpayer_ssn_valid_for_employment: true,
        taxpayer_ssn_issued_before_due_date: true,
        taxpayer_tin_issued_by_due_date: true,
      },
      w2: [wage(80_000, 8_000, "Example Employer", "12-3456789")],
      schedule1a: {
        senior_zero_exclusions_review: {
          no_section933_puerto_rico_excluded_income: true,
          section933_review_source_reference:
            "Synthetic 2025 residency and income review",
          no_form2555_filed: true,
          form2555_review_source_reference:
            "Synthetic 2025 foreign-income review",
          no_form4563_filed: true,
          form4563_review_source_reference:
            "Synthetic 2025 Samoa-source income review",
        },
        vehicle_loans: [{
          vin: "1HGCM82633A004352",
          borrower_ssn: "111223333",
          loan_originated_date: "2025-02-01",
          vehicle_purchased_date: "2025-02-01",
          lender_name: "Test Credit Union",
          lender_interest_statement_reference:
            "Synthetic 2025 lender interest statement",
          purchase_and_lien_reference:
            "Synthetic 2025 purchase and first-lien agreement",
          final_assembly_reference: "Synthetic vehicle information label",
          original_borrower: true,
          purchase_proceeds_only: true,
          first_lien_secured: true,
          original_vehicle_use: true,
          road_vehicle_with_two_or_more_wheels: true,
          vehicle_type: "car",
          gross_vehicle_weight_under_14000_pounds: true,
          final_assembly_in_us: true,
          expected_personal_use_over_half: true,
          qualified_interest_paid: 4_000,
          interest_deducted_elsewhere: 0,
          no_other_interest_deduction_review_reference:
            "Synthetic 2025 Schedule C/E/F review",
        }],
      },
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule1a"],
    reviewFocus: [
      "Part IV line 22a prints the reviewed VIN, zero deducted elsewhere, and $4,000 interest",
      "Part IV lines 23, 24, 30, and 38 print $4,000 with line 25 at $80,000",
      "Form 1040 line 13b prints $4,000 and agrees with native XML",
    ],
  },
  {
    id: "single-three-car-loan-schedule1a",
    inputs: {
      general: {
        ...singleGeneral,
        taxpayer_ssn_valid_for_employment: true,
        taxpayer_ssn_issued_before_due_date: true,
        taxpayer_tin_issued_by_due_date: true,
      },
      w2: [wage(80_000, 8_000, "Example Employer", "12-3456789")],
      schedule1a: {
        senior_zero_exclusions_review: {
          no_section933_puerto_rico_excluded_income: true,
          section933_review_source_reference: "Synthetic 2025 residency review",
          no_form2555_filed: true,
          form2555_review_source_reference:
            "Synthetic 2025 foreign-income review",
          no_form4563_filed: true,
          form4563_review_source_reference:
            "Synthetic 2025 Samoa-source review",
        },
        vehicle_loans: [1_000, 1_500, 1_500].map((amount, index) => ({
          vin: `1HGCM82633A00435${index + 2}`,
          borrower_ssn: "111223333",
          loan_originated_date: "2025-02-01",
          vehicle_purchased_date: "2025-02-01",
          lender_name: `Test Credit Union ${index + 1}`,
          lender_interest_statement_reference:
            `Synthetic 2025 lender statement ${index + 1}`,
          purchase_and_lien_reference:
            `Synthetic 2025 purchase and first-lien agreement ${index + 1}`,
          final_assembly_reference: `Synthetic vehicle information label ${
            index + 1
          }`,
          original_borrower: true,
          purchase_proceeds_only: true,
          first_lien_secured: true,
          original_vehicle_use: true,
          road_vehicle_with_two_or_more_wheels: true,
          vehicle_type: "car",
          gross_vehicle_weight_under_14000_pounds: true,
          final_assembly_in_us: true,
          expected_personal_use_over_half: true,
          qualified_interest_paid: amount,
          interest_deducted_elsewhere: 0,
          no_other_interest_deduction_review_reference:
            `Synthetic 2025 Schedule C/E/F review ${index + 1}`,
        })),
      },
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule1a"],
    reviewFocus: [
      "Three distinct VINs and interest amounts survive native Schedule 1-A line 22",
      "The first VIN prints on line 22a, while line 22b carries the $3,000 attached subtotal",
      "The continuation lists VINs two and three separately; lines 23/24/30/38 and Form 1040 line 13b each show $4,000",
    ],
  },
  {
    id: "single-two-w2-flsa-overtime-schedule1a",
    inputs: {
      general: {
        ...singleGeneral,
        taxpayer_ssn_valid_for_employment: true,
        taxpayer_ssn_issued_before_due_date: true,
        taxpayer_tin_issued_by_due_date: true,
      },
      w2: [
        {
          ...wage(50_000, 5_000, "First Employer", "12-3456789"),
          employee_ssn: "111-22-3333",
          box14_entries: [{
            description: "FLSA Overtime Premium",
            amount: 3_000,
            is_state_sdi_pfml: false,
          }],
          flsa_overtime_review: {
            covered_nonexempt_employee: true,
            premium_included_in_box1: true,
            source_reference: "First Employer 2025 payroll statement",
          },
        },
        {
          ...wage(30_000, 3_000, "Second Employer", "98-7654321"),
          employee_ssn: "111-22-3333",
          box14_entries: [{
            description: "FLSA Overtime Premium",
            amount: 1_000,
            is_state_sdi_pfml: false,
          }],
          flsa_overtime_review: {
            covered_nonexempt_employee: true,
            premium_included_in_box1: true,
            source_reference: "Second Employer 2025 payroll statement",
          },
        },
      ],
      schedule1a: {
        senior_zero_exclusions_review: {
          no_section933_puerto_rico_excluded_income: true,
          section933_review_source_reference:
            "Synthetic 2025 residency and income review",
          no_form2555_filed: true,
          form2555_review_source_reference:
            "Synthetic 2025 foreign-income review",
          no_form4563_filed: true,
          form4563_review_source_reference:
            "Synthetic 2025 Samoa-source income review",
        },
      },
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule1a"],
    reviewFocus: [
      "Two reviewed FLSA premiums in W-2 box 14 add to Schedule 1-A Part III line 14a",
      "Schedule 1-A Part III lines 14a/14c/15/21 and line 38 print 4,000",
      "Form 1040 line 13b prints the same 4,000 with correct tax and refund",
    ],
  },
  {
    id: "single-w2-qualified-tips-schedule1a",
    inputs: {
      general: {
        ...singleGeneral,
        taxpayer_ssn_valid_for_employment: true,
        taxpayer_ssn_issued_before_due_date: true,
        taxpayer_tin_issued_by_due_date: true,
      },
      w2: [{
        ...wage(30_000, 2_500, "Example Restaurant", "12-3456789"),
        employee_ssn: "111-22-3333",
        box3_ss_wages: 25_000,
        box4_ss_withheld: 1_860,
        box7_ss_tips: 5_000,
        box14b_tipped_code: "102",
      }],
      schedule1a: {
        senior_zero_exclusions_review: {
          no_section933_puerto_rico_excluded_income: true,
          section933_review_source_reference:
            "Synthetic 2025 residency and income review",
          no_form2555_filed: true,
          form2555_review_source_reference:
            "Synthetic 2025 foreign-income review",
          no_form4563_filed: true,
          form4563_review_source_reference:
            "Synthetic 2025 Samoa-source income review",
        },
      },
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule1a"],
    reviewFocus: [
      "W-2 box 7 tips and occupation code 102 support the single-employer Part II path",
      "Schedule 1-A page 1 prints 5,000 on lines 4a, 4c, 6, 7, and 13",
      "Schedule 1-A line 38 and Form 1040 line 13b both print 5,000",
    ],
  },
  {
    id: "single-two-w2-qualified-tips-schedule1a",
    inputs: {
      general: {
        ...singleGeneral,
        taxpayer_ssn_valid_for_employment: true,
        taxpayer_ssn_issued_before_due_date: true,
        taxpayer_tin_issued_by_due_date: true,
      },
      w2: [
        {
          ...wage(30_000, 2_500, "First Restaurant", "12-3456789"),
          employee_ssn: "111-22-3333",
          box3_ss_wages: 27_000,
          box7_ss_tips: 3_000,
          box14b_tipped_code: "102",
        },
        {
          ...wage(20_000, 1_500, "Second Restaurant", "98-7654321"),
          employee_ssn: "111-22-3333",
          box3_ss_wages: 18_000,
          box7_ss_tips: 2_000,
          box14b_tipped_code: "103",
        },
      ],
      schedule1a: {
        senior_zero_exclusions_review: {
          no_section933_puerto_rico_excluded_income: true,
          section933_review_source_reference: "Synthetic 2025 residency review",
          no_form2555_filed: true,
          form2555_review_source_reference:
            "Synthetic 2025 foreign-income review",
          no_form4563_filed: true,
          form4563_review_source_reference:
            "Synthetic 2025 Samoa-source review",
        },
      },
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule1a"],
    reviewFocus: [
      "Two employer EINs and tipped occupation codes retain $3,000 and $2,000 of W-2 box 7 tips",
      "Schedule 1-A lines 4a/4b print zero and line 4c prints $5,000 from the employer worksheet",
      "Lines 6/7/13/38 and Form 1040 line 13b carry $5,000 once",
    ],
  },
  {
    id: "single-employer-statement-qualified-tips-schedule1a",
    inputs: {
      general: {
        ...singleGeneral,
        taxpayer_ssn_valid_for_employment: true,
        taxpayer_ssn_issued_before_due_date: true,
        taxpayer_tin_issued_by_due_date: true,
      },
      w2: [{
        ...wage(200_000, 35_000, "Example Restaurant", "12-3456789"),
        employee_ssn: "111-22-3333",
        box3_ss_wages: 161_100,
        box7_ss_tips: 15_000,
      }],
      schedule1a: {
        employer_tip_statements: [{
          employee_ssn: "111-22-3333",
          employer_ein: "12-3456789",
          employer_name: "Example Restaurant",
          amount: 20_000,
          occupation_code: "102",
          occupation_review_reference:
            "Synthetic 2025 restaurant occupation review",
          statement_reference: "Synthetic 2025 employer tip statement",
          furnished_to_employee: true,
          included_in_w2_box1: true,
        }],
        senior_zero_exclusions_review: {
          no_section933_puerto_rico_excluded_income: true,
          section933_review_source_reference: "Synthetic 2025 residency review",
          no_form2555_filed: true,
          form2555_review_source_reference:
            "Synthetic 2025 foreign-income review",
          no_form4563_filed: true,
          form4563_review_source_reference:
            "Synthetic 2025 Samoa-source review",
        },
      },
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule1a"],
    reviewFocus: [
      "Reviewed employer statement reports $20,000 of tips for the identified W-2 employee and employer",
      "The statement replaces the same employer's $15,000 W-2 box 7 amount",
      "Schedule 1-A lines 4a/4c show $20,000 and line 13/38 shows $15,000 after MAGI phaseout",
      "Form 1040 line 13b agrees with Schedule 1-A line 38",
    ],
  },
  {
    id: "single-w2-box14-qualified-tips-schedule1a",
    inputs: {
      general: {
        ...singleGeneral,
        taxpayer_ssn_valid_for_employment: true,
        taxpayer_ssn_issued_before_due_date: true,
        taxpayer_tin_issued_by_due_date: true,
      },
      w2: [{
        ...wage(200_000, 35_000, "Example Restaurant", "12-3456789"),
        employee_ssn: "111-22-3333",
        box3_ss_wages: 161_100,
        box7_ss_tips: 15_000,
        box14_entries: [{
          description: "Employer reported tips",
          amount: 20_000,
          is_state_sdi_pfml: false,
        }],
        qualified_tips_box14_review: {
          box14_description: "Employer reported tips",
          occupation_code: "102",
          occupation_review_reference:
            "Synthetic 2025 restaurant occupation review",
          tips_included_in_box1: true,
          source_reference: "Synthetic 2025 employer W-2 box 14 tip accounting",
        },
      }],
      schedule1a: {
        senior_zero_exclusions_review: {
          no_section933_puerto_rico_excluded_income: true,
          section933_review_source_reference: "Synthetic 2025 residency review",
          no_form2555_filed: true,
          form2555_review_source_reference:
            "Synthetic 2025 foreign-income review",
          no_form4563_filed: true,
          form4563_review_source_reference:
            "Synthetic 2025 Samoa-source review",
        },
      },
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule1a"],
    reviewFocus: [
      "Reviewed W-2 box 14 reports $20,000 of tips and replaces the same employer's $15,000 box 7 amount",
      "The 2025 W-2 omits box 14b, with occupation code 102 supplied by review",
      "Schedule 1-A lines 4a/4c show $20,000 and line 13/38 shows $15,000 after MAGI phaseout",
      "Form 1040 line 13b agrees with Schedule 1-A line 38",
    ],
  },
  {
    id: "single-form4070-high-wage-qualified-tips-schedule1a",
    inputs: {
      general: {
        ...singleGeneral,
        taxpayer_ssn_valid_for_employment: true,
        taxpayer_ssn_issued_before_due_date: true,
        taxpayer_tin_issued_by_due_date: true,
      },
      w2: [{
        ...wage(200_000, 35_000, "Example Restaurant", "12-3456789"),
        employee_ssn: "111-22-3333",
        box3_ss_wages: 161_100,
        box7_ss_tips: 15_000,
      }],
      schedule1a: {
        form4070_reports: [{
          employee_ssn: "111-22-3333",
          employer_ein: "12-3456789",
          employer_name: "Example Restaurant",
          occupation_code: "102",
          occupation_review_reference:
            "Synthetic 2025 restaurant occupation review",
          monthly_reports: Array.from({ length: 12 }, (_, index) => ({
            month: index + 1,
            cash_tips: index === 11 ? 2_400 : 1_600,
            charged_tips: 0,
            tips_paid_out: 0,
            source_reference: `Synthetic 2025 month ${
              index + 1
            } employer tip report`,
          })),
        }],
        senior_zero_exclusions_review: {
          no_section933_puerto_rico_excluded_income: true,
          section933_review_source_reference: "Synthetic 2025 residency review",
          no_form2555_filed: true,
          form2555_review_source_reference:
            "Synthetic 2025 foreign-income review",
          no_form4563_filed: true,
          form4563_review_source_reference:
            "Synthetic 2025 Samoa-source review",
        },
      },
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule1a"],
    reviewFocus: [
      "Twelve reviewed Form 4070 reports total $20,000 and replace the same employer's $15,000 W-2 box 7 value",
      "Schedule 1-A lines 4a/4c print $20,000 and line 13 prints $15,000 after the $5,000 MAGI phaseout",
      "Form 1040 line 13b agrees with Schedule 1-A line 38",
    ],
  },
  {
    id: "single-form4070-form4137-no-w2-code-schedule1a",
    inputs: {
      general: {
        ...singleGeneral,
        taxpayer_ssn_valid_for_employment: true,
        taxpayer_ssn_issued_before_due_date: true,
        taxpayer_tin_issued_by_due_date: true,
      },
      w2: [{
        ...wage(30_000, 2_500, "Example Restaurant", "12-3456789"),
        employee_ssn: "111-22-3333",
        box3_ss_wages: 25_000,
        box4_ss_withheld: 1_550,
        box7_ss_tips: 5_000,
      }],
      form4137: {
        forms: [{
          recipient: "taxpayer",
          employers: [{
            name: "Example Restaurant",
            ein: "12-3456789",
            tips_received: 6_500,
            tips_reported: 5_000,
            tipped_occupation_code: "102",
            occupation_review_reference:
              "Synthetic 2025 restaurant occupation review",
          }],
        }],
      },
      schedule1a: {
        form4070_reports: [{
          employee_ssn: "111-22-3333",
          employer_ein: "12-3456789",
          employer_name: "Example Restaurant",
          occupation_code: "102",
          occupation_review_reference:
            "Synthetic 2025 restaurant occupation review",
          monthly_reports: [
            {
              month: 1,
              cash_tips: 2_500,
              charged_tips: 0,
              tips_paid_out: 0,
              source_reference: "Synthetic January employer tip report",
            },
            {
              month: 2,
              cash_tips: 2_500,
              charged_tips: 0,
              tips_paid_out: 0,
              source_reference: "Synthetic February employer tip report",
            },
          ],
        }],
        senior_zero_exclusions_review: {
          no_section933_puerto_rico_excluded_income: true,
          section933_review_source_reference: "Synthetic 2025 residency review",
          no_form2555_filed: true,
          form2555_review_source_reference:
            "Synthetic 2025 foreign-income review",
          no_form4563_filed: true,
          form4563_review_source_reference:
            "Synthetic 2025 Samoa-source review",
        },
      },
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule1a", "schedule2", "form4137"],
    reviewFocus: [
      "W-2 has no occupation code; reviewed Form 4070 and Form 4137 rows agree on code 102",
      "Schedule 1-A lines 4a/4b/4c print $5,000/$6,500/$6,500 without double counting",
      "Form 1040 line 1c has $1,500 unreported tips and line 13b deducts $6,500",
      "Form 4137 tax reaches Schedule 2 and Form 1040 line 23",
    ],
  },
  {
    id: "single-form4137-qualified-tips-schedule1a",
    inputs: {
      general: {
        ...singleGeneral,
        taxpayer_ssn_valid_for_employment: true,
        taxpayer_ssn_issued_before_due_date: true,
        taxpayer_tin_issued_by_due_date: true,
      },
      w2: [{
        ...wage(30_000, 2_500, "Example Restaurant", "12-3456789"),
        employee_ssn: "111-22-3333",
        box3_ss_wages: 25_000,
        box4_ss_withheld: 1_550,
        box7_ss_tips: 5_000,
        box14b_tipped_code: "102",
      }],
      form4137: {
        forms: [{
          recipient: "taxpayer",
          employers: [{
            name: "Example Restaurant",
            ein: "12-3456789",
            tips_received: 6_500,
            tips_reported: 5_000,
          }],
        }],
      },
      schedule1a: {
        senior_zero_exclusions_review: {
          no_section933_puerto_rico_excluded_income: true,
          section933_review_source_reference:
            "Synthetic 2025 residency and income review",
          no_form2555_filed: true,
          form2555_review_source_reference:
            "Synthetic 2025 foreign-income review",
          no_form4563_filed: true,
          form4563_review_source_reference:
            "Synthetic 2025 Samoa-source income review",
        },
      },
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule1a", "schedule2", "form4137"],
    reviewFocus: [
      "Form 4137 reports $6,500 received, $5,000 reported, and $1,500 unreported income",
      "Schedule 1-A lines 4a/4b show $5,000/$6,500 and line 4c takes $6,500 once",
      "Form 1040 line 1c includes $1,500 while line 13b deducts $6,500",
      "Form 4137 tip tax joins Schedule 2 and Form 1040",
    ],
  },
  {
    id: "joint-senior-schedule1a",
    inputs: {
      general: {
        ...jointGeneral,
        taxpayer_dob: "1955-06-15",
        spouse_dob: "1958-03-10",
        taxpayer_ssn_valid_for_employment: true,
        taxpayer_ssn_issued_before_due_date: true,
        taxpayer_tin_issued_by_due_date: true,
        spouse_ssn_valid_for_employment: true,
        spouse_ssn_issued_before_due_date: true,
        spouse_tin_issued_by_due_date: true,
      },
      w2: [wage(160_000, 20_000, "Example Employer", "12-3456789")],
      schedule1a: {
        senior_zero_exclusions_review: {
          no_section933_puerto_rico_excluded_income: true,
          section933_review_source_reference:
            "Synthetic 2025 residency and income review",
          no_form2555_filed: true,
          form2555_review_source_reference:
            "Synthetic 2025 foreign-income review",
          no_form4563_filed: true,
          form4563_review_source_reference:
            "Synthetic 2025 Samoa-source income review",
        },
      },
    },
    filer: jointFiler,
    expectedPdfForms: ["f1040", "schedule1a"],
    reviewFocus: [
      "Both senior ages and timely employment-valid SSNs support the joint Part V deduction",
      "Schedule 1-A page 1 prints 160,000 on lines 1 and 3 and zero on line 2e",
      "Schedule 1-A page 2 prints 5,400 for each spouse and 10,800 on lines 37 and 38",
      "Form 1040 line 13b equals Schedule 1-A line 38, with the same native XML amounts",
    ],
  },
  {
    id: "joint-mixed-schedule1a",
    inputs: {
      general: {
        ...jointGeneral,
        taxpayer_dob: "1955-06-15",
        spouse_dob: "1958-03-10",
        taxpayer_ssn_valid_for_employment: true,
        taxpayer_ssn_issued_before_due_date: true,
        taxpayer_tin_issued_by_due_date: true,
        spouse_ssn_valid_for_employment: true,
        spouse_ssn_issued_before_due_date: true,
        spouse_tin_issued_by_due_date: true,
      },
      w2: [
        {
          ...wage(90_000, 12_000, "First Restaurant", "12-3456789"),
          employee_ssn: "111-22-3333",
          box3_ss_wages: 87_000,
          box4_ss_withheld: 5_394,
          box7_ss_tips: 3_000,
          box14b_tipped_code: "102",
          box14_entries: [{
            description: "FLSA Overtime Premium",
            amount: 4_000,
            is_state_sdi_pfml: false,
          }],
          flsa_overtime_review: {
            covered_nonexempt_employee: true,
            premium_included_in_box1: true,
            source_reference: "First Restaurant 2025 payroll statement",
          },
        },
        {
          ...wage(70_000, 8_000, "Second Restaurant", "98-7654321"),
          employee_ssn: "111-22-3333",
          box3_ss_wages: 68_000,
          box4_ss_withheld: 4_216,
          box7_ss_tips: 2_000,
          box14b_tipped_code: "103",
        },
      ],
      schedule1a: {
        senior_zero_exclusions_review: {
          no_section933_puerto_rico_excluded_income: true,
          section933_review_source_reference: "Synthetic 2025 residency review",
          no_form2555_filed: true,
          form2555_review_source_reference:
            "Synthetic 2025 foreign-income review",
          no_form4563_filed: true,
          form4563_review_source_reference:
            "Synthetic 2025 Samoa-source review",
        },
        vehicle_loans: [{
          vin: "1HGCM82633A004352",
          borrower_ssn: "111223333",
          loan_originated_date: "2025-02-01",
          vehicle_purchased_date: "2025-02-01",
          lender_name: "Test Credit Union",
          lender_interest_statement_reference:
            "Synthetic 2025 lender interest statement",
          purchase_and_lien_reference:
            "Synthetic 2025 purchase and first-lien agreement",
          final_assembly_reference: "Synthetic vehicle information label",
          original_borrower: true,
          purchase_proceeds_only: true,
          first_lien_secured: true,
          original_vehicle_use: true,
          road_vehicle_with_two_or_more_wheels: true,
          vehicle_type: "car",
          gross_vehicle_weight_under_14000_pounds: true,
          final_assembly_in_us: true,
          expected_personal_use_over_half: true,
          qualified_interest_paid: 4_000,
          interest_deducted_elsewhere: 0,
          no_other_interest_deduction_review_reference:
            "Synthetic 2025 Schedule C/E/F review",
        }],
      },
    },
    filer: jointFiler,
    expectedPdfForms: ["f1040", "schedule1a"],
    reviewFocus: [
      "Two employer tip rows add to $5,000 on line 4c and the attached worksheet",
      "The first W-2 contributes $4,000 of qualified overtime to Part III",
      "One reviewed VIN contributes $4,000 to Part IV and two seniors contribute $10,800 to Part V",
      "Schedule 1-A line 38 and Form 1040 line 13b both print $23,800",
    ],
  },
  {
    id: "single-schedule-c",
    inputs: {
      general: {
        ...singleGeneral,
        qbi_no_prior_loss_or_suspended_loss_confirmed: true,
        qbi_not_patron_of_specified_cooperative_confirmed: true,
      },
      schedule_c: [{
        business_reference: "synthetic-consulting-2025",
        line_a_principal_business: "Consulting",
        line_b_business_code: "541600",
        line_c_business_name: "Example Consulting",
        line_d_ein: "12-3456789",
        line_f_accounting_method: "cash",
        line_g_material_participation: true,
        line_i_made_1099_payments: false,
        qbi_no_other_adjustments_confirmed: true,
        line_1_gross_receipts: 80_000,
      }],
    },
    filer: singleFiler,
    expectedPdfForms: [
      "f1040",
      "schedule_c",
      "schedule_se",
      "schedule1",
      "schedule2",
      "form8995",
    ],
    reviewFocus: [
      "Schedule C two-page order, business identity, cash and participation boxes",
      "Schedule C line 31 reconciles through Schedules 1/SE/2 and Form 1040",
      "Form 8995 QBI amount and final amount owed reconcile without a duplicate attachment",
    ],
  },
  {
    id: "single-two-at-risk-business-losses",
    inputs: {
      general: singleGeneral,
      w2: [wage(5_000, 0, "Example Employer", "12-3456789")],
      schedule_c: [{
        business_reference: "north-loss-2025",
        line_a_principal_business: "Consulting",
        line_b_business_code: "541600",
        line_c_business_name: "North business",
        line_f_accounting_method: "cash",
        line_g_material_participation: true,
        line_i_made_1099_payments: false,
        line_32_at_risk: "b",
        line_1_gross_receipts: 1_000,
        line_8_advertising: 3_000,
        at_risk_simplified: {
          opening_adjusted_basis: 500,
          current_year_increases: 0,
          line9_decreases_and_exclusions: 0,
        },
      }, {
        business_reference: "south-loss-2025",
        line_a_principal_business: "Consulting",
        line_b_business_code: "541600",
        line_c_business_name: "South business",
        line_f_accounting_method: "cash",
        line_g_material_participation: true,
        line_i_made_1099_payments: false,
        line_32_at_risk: "b",
        line_1_gross_receipts: 1_000,
        line_8_advertising: 4_000,
        at_risk_simplified: {
          opening_adjusted_basis: 900,
          current_year_increases: 0,
          line9_decreases_and_exclusions: 0,
        },
      }, {
        business_reference: "offsetting-service-2025",
        line_a_principal_business: "Consulting",
        line_b_business_code: "541600",
        line_c_business_name: "Offsetting business",
        line_f_accounting_method: "cash",
        line_g_material_participation: true,
        line_i_made_1099_payments: false,
        line_32_at_risk: "a",
        line_1_gross_receipts: 3_000,
        line_8_advertising: 0,
      }],
    },
    filer: singleFiler,
    expectedPdfForms: [
      "f1040",
      "schedule_c",
      "schedule1",
      "schedule2",
      "schedule_se",
      "form6198",
    ],
    reviewFocus: [
      "Two Form 6198 copies show distinct North and South activity descriptions",
      "Form 6198 lines 1, 10b, 20, and 21 agree with each business's at-risk source",
      "Schedule C prints the $2,000 and $3,000 source losses, while Form 6198 limits Schedule 1 line 3 to $1,600 after the $3,000 offsetting profit",
    ],
  },
  {
    id: "single-direct-pension-rollover",
    inputs: {
      general: singleGeneral,
      f1099r: [{
        payer_name: "Example Pension Plan",
        payer_ein: "12-3456789",
        box1_gross_distribution: 20_000,
        box2a_taxable_amount: 0,
        box7_distribution_code: DistributionCode.CodeG,
        direct_rollover_confirmed: true,
      }],
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040"],
    reviewFocus: [
      "Form 1040 line 5a prints the gross pension and line 5b follows the computed taxable amount",
      "Line 5c rollover checkbox is marked only from the affirmative source fact",
      "No QCD mark is inferred from the distribution code",
    ],
  },
  {
    id: "single-ira-rollover",
    inputs: {
      general: singleGeneral,
      f1099r: [{
        payer_name: "Example IRA Custodian",
        payer_ein: "12-3456789",
        box1_gross_distribution: 5_000,
        box2a_taxable_amount: 0,
        box7_distribution_code: DistributionCode.Code7,
        box7_ira_simple_indicator: true,
        rollover_code: RolloverCode.S,
        ira_rollover: {
          source_ira_type: "traditional",
          destination: "ira",
          destination_ira_type: "traditional",
          distributed_on: "2025-06-01",
          completed_on: "2025-06-02",
          last_ira_to_ira_rollover_on: null,
        },
      }],
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040"],
    reviewFocus: [
      "Form 1040 line 4a prints the $5,000 IRA gross distribution and line 4b prints zero taxable",
      "Line 4c(1) rollover checkbox follows the dated IRA-to-IRA source fact",
      "The pension line 5c rollover checkbox remains blank",
    ],
  },
  {
    id: "single-ira-qualified-plan-rollover",
    inputs: {
      general: singleGeneral,
      f1099r: [{
        payer_name: "Example IRA Custodian",
        payer_ein: "12-3456789",
        box1_gross_distribution: 7_000,
        box2a_taxable_amount: 0,
        box7_distribution_code: DistributionCode.Code7,
        box7_ira_simple_indicator: true,
        rollover_code: RolloverCode.S,
        ira_rollover: {
          source_ira_type: "traditional",
          destination: "qualified_plan",
          destination_name: "Example 401(k)",
          distributed_on: "2025-12-01",
          completed_on: "2025-12-15",
          last_ira_to_ira_rollover_on: null,
        },
      }],
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040"],
    reviewFocus: [
      "Form 1040 line 4c(1) links a native IRA distribution statement",
      "The three-page PDF includes a matching named qualified-plan statement after Form 1040",
    ],
  },
  {
    id: "single-ira-2026-rollover",
    inputs: {
      general: singleGeneral,
      f1099r: [{
        payer_name: "Example IRA Custodian",
        payer_ein: "12-3456789",
        box1_gross_distribution: 8_000,
        box2a_taxable_amount: 0,
        box7_distribution_code: DistributionCode.Code7,
        box7_ira_simple_indicator: true,
        rollover_code: RolloverCode.S,
        ira_rollover: {
          source_ira_type: "traditional",
          destination: "ira",
          destination_ira_type: "traditional",
          distributed_on: "2025-12-15",
          completed_on: "2026-01-15",
          last_ira_to_ira_rollover_on: null,
        },
      }],
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040"],
    reviewFocus: [
      "Form 1040 line 4c(1) links a native IRA distribution statement",
      "The three-page PDF explains the 2026 completion date after Form 1040",
    ],
  },
  {
    id: "single-hsa-code2-excess",
    inputs: {
      general: singleGeneral,
      w2: [wage(75_000, 11_000, "Example Employer", "12-3456789")],
      form8889: {
        beneficiary_identity: {
          owner: "T",
          name: "Alex Example",
          ssn: "111223333",
        },
        eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.SelfOnly),
        age_55_or_older: false,
        last_month_rule_elected: false,
        married_at_year_end: false,
        taxpayer_hsa_contributions: 5_200,
        hsa_distributions: 1_000,
        form1099_sa_distributions: [{
          tax_year: 2025,
          recipient_ssn: "111223333",
          box1_gross_distribution: 1_000,
          box2_earnings_on_excess: 100,
          box3_distribution_code: "2",
          source_reference: "synthetic-1099-sa-code-2",
        }],
        hsa_excluded_distributions: {
          timely_excess_withdrawal: {
            source: "current_year_personal",
            amount_including_earnings: 1_000,
            included_earnings: 100,
            form1099_sa_source_reference: "synthetic-1099-sa-code-2",
            withdrawn_by_return_due_date: true,
          },
        },
      },
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "form8889", "schedule1"],
    reviewFocus: [
      "Form 8889 lines 14a and 14b both show 1,000, and line 14c stays zero",
      "Schedule 1 line 8z shows the 100 earnings once and line 13 shows the calculated HSA deduction",
      "Form 1040 line 8 matches Schedule 1 additional income and its HSA page identifies the primary owner",
    ],
  },
  {
    id: "joint-two-hsa-owners",
    inputs: {
      general: { ...jointGeneral, spouse_dob: "1970-03-10" },
      w2: [wage(90_000, 12_000, "Example Employer", "12-3456789")],
      form8889: {
        beneficiary_identity: {
          owner: "T",
          name: "Alex Example",
          ssn: "111223333",
        },
        eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.SelfOnly),
        age_55_or_older: false,
        last_month_rule_elected: false,
        married_at_year_end: true,
        spouse_has_separate_hsa: true,
        taxpayer_hsa_contributions: 4_000,
        spouse_hsa: {
          beneficiary_identity: {
            owner: "S",
            name: "Sam Example",
            ssn: "444556666",
          },
          eligible_hdhp_coverage_by_month: Array(12).fill(
            CoverageType.SelfOnly,
          ),
          age_55_or_older: true,
          last_month_rule_elected: false,
          married_at_year_end: true,
          spouse_has_separate_hsa: true,
          taxpayer_hsa_contributions: 5_000,
        },
      },
    },
    filer: jointFiler,
    expectedPdfForms: ["f1040", "form8889", "schedule1"],
    reviewFocus: [
      "Two separate Form 8889 pages print in primary-then-spouse order",
      "Each owner name, SSN, self-only box, contribution and deduction stay on that owner's page",
      "Combined HSA deduction appears once on Schedule 1 and Form 1040",
    ],
  },
  {
    id: "single-marketplace-aptc-repayment",
    inputs: {
      general: singleGeneral,
      w2: [wage(45_180, 5_000, "Example Employer", "12-3456789")],
      f1095a: [{
        issuer_name: "Texas Marketplace",
        policy_number: "SYNTHETIC-PTC-1",
        coverage_state: "TX",
        covered_individual_ssns: ["111223333"],
        monthly_premiums: Array(12).fill(800),
        monthly_slcsps: Array(12).fill(600),
        monthly_aptcs: Array(12).fill(700),
        annual_premium: 9_600,
        annual_slcsp: 7_200,
        annual_aptc: 8_400,
      }],
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "form8962", "schedule2"],
    reviewFocus: [
      "Form 8962 prints one named policy across its monthly rows, not a second or blank copy",
      "Household income, federal-poverty percentage, applicable figure and repayment limitation agree with the source calculation",
      "Excess APTC carries once to Schedule 2 line 1a and Form 1040 line 17",
      "Both Form 8962 pages and the Schedule 2 page have legible fields and no clipped monthly amount",
    ],
  },
  {
    id: "mfs-shared-policy-repayment",
    inputs: {
      general: {
        ...singleGeneral,
        filing_status: SourceFilingStatus.MFS,
        spouse_first_name: "Other",
        spouse_last_name: "Taxpayer",
        spouse_ssn: "222-33-4444",
        mfs_spouse_itemizing: false,
        ptc_mfs_status: {
          basis: "no_exception",
          exception_reviewed: true,
          no_one_can_claim_taxpayer: true,
          policy_scope: "shared_with_spouse",
          all_covered_individuals_lawfully_present: true,
          no_self_employed_health_insurance_deduction: true,
        },
      },
      w2: [wage(30_000, 0, "Example Employer", "12-3456789")],
      f1095a: [{
        issuer_name: "Texas Marketplace",
        policy_number: "MFS-POLICY-1",
        coverage_state: "TX",
        covered_individual_ssns: ["111223333", "222334444"],
        monthly_premiums: Array(12).fill(1_200),
        monthly_slcsps: Array(12).fill(1_500),
        monthly_aptcs: Array(12).fill(800),
        shared_policy_periods: [{
          basis: "mfs_no_exception",
          other_taxpayer_ssn: "222-33-4444",
          start_month: 1,
          end_month: 12,
        }],
      }],
    },
    filer: mfsFiler,
    expectedPdfForms: ["f1040", "form8962", "schedule2"],
    reviewFocus: [
      "Form 8962 Part IV allocates 50% of APTC with premium and SLCSP percentage cells blank",
      "The $750 excess APTC appears once on Schedule 2 line 1a and Form 1040 line 17",
      "The filer and spouse SSNs and all twelve policy months print legibly",
    ],
  },
  {
    id: "mfs-shared-policy-exception",
    inputs: {
      general: {
        ...singleGeneral,
        filing_status: SourceFilingStatus.MFS,
        spouse_first_name: "Other",
        spouse_last_name: "Taxpayer",
        spouse_ssn: "222-33-4444",
        mfs_spouse_itemizing: false,
        ptc_mfs_status: {
          basis: "domestic_abuse",
          living_apart_at_filing: true,
          unable_to_file_joint_due_to_exception: true,
          prior_consecutive_exception_years: 0,
          no_one_can_claim_taxpayer: true,
          policy_scope: "shared_with_spouse",
        },
      },
      w2: [wage(30_000, 0, "Example Employer", "12-3456789")],
      f1095a: [{
        issuer_name: "Texas Marketplace",
        policy_number: "MFS-POLICY-1",
        coverage_state: "TX",
        covered_individual_ssns: ["111223333", "222334444"],
        monthly_premiums: Array(12).fill(1_200),
        monthly_slcsps: Array(12).fill(1_500),
        monthly_aptcs: Array(12).fill(800),
        shared_policy_periods: [{
          basis: "mfs_exception",
          other_taxpayer_ssn: "222-33-4444",
          start_month: 1,
          end_month: 12,
          monthly_family_slcsps: Array(12).fill(700),
        }],
      }],
    },
    filer: mfsFiler,
    expectedPdfForms: ["f1040", "form8962", "schedule3"],
    reviewFocus: [
      "Form 8962 Part IV allocates 50% of premium and APTC with no SLCSP percentage",
      "Each month's family SLCSP is $700 and line A shows the MFS exception",
      "The $2,400 net PTC appears once on Schedule 3 line 9 and Form 1040 line 31",
    ],
  },
  {
    id: "single-iso-amt",
    inputs: {
      general: singleGeneral,
      w2: [wage(200_000, 35_000, "Example Employer", "12-3456789")],
      f3921: [{
        box2_date_option_exercised: "2025-06-02",
        box3_exercise_price_per_share: 10,
        box4_fmv_per_share: 250,
        box5_shares_transferred: 1_000,
        rights_transferable_and_not_subject_to_substantial_risk_on_exercise:
          true,
        shares_disposed_during_exercise_year: 0,
        amount_paid_for_option: 0,
      }],
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "form6251", "schedule2"],
    reviewFocus: [
      "Form 6251 line 2i prints the Form 3921 exercise-date spread of 240,000",
      "Form 6251 Part I and Part II line placements and negative-versus-positive signs match computed amounts",
      "Any AMT flows once through Schedule 2 line 1 and Form 1040 line 17",
      "Both Form 6251 pages remain readable, including the right-hand tax computation",
    ],
  },
  {
    id: "single-nonparticipating-rental-loss",
    inputs: {
      general: singleGeneral,
      w2: [wage(90_000, 12_000, "Example Employer", "12-3456789")],
      schedule_e: [{
        tsj: "T",
        activity_id: "synthetic-rental-loss-2025",
        property_description: "Example rental",
        property_type: 1,
        activity_type: "B",
        fair_rental_days: 200,
        personal_use_days: 0,
        rent_income: 5_000,
        expense_repairs: 10_000,
        form_1099_payments_made: false,
        street_address: "12 Example Street",
        city: "Austin",
        state: "TX",
        zip: "78701",
      }],
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "schedule_e", "form8582"],
    reviewFocus: [
      "Schedule E lists the identified rental once with 5,000 rent and 10,000 repairs",
      "Form 8582 Part V identifies the same activity and retains the disallowed loss in its allocation worksheets",
      "A suspended passive loss does not appear as a current Schedule 1 or Form 1040 deduction",
      "All three Form 8582 pages print in order with no missing worksheet row or clipped activity name",
    ],
  },
  {
    id: "single-elected-lump-sum-part-ii",
    inputs: {
      general: { ...singleGeneral, taxpayer_dob: "1930-01-01" },
      f1099r: [{
        payer_name: "Example Qualified Plan",
        payer_ein: "12-3456789",
        box1_gross_distribution: 100_000,
        box2a_taxable_amount: 100_000,
        box3_capital_gain: 30_000,
        box7_distribution_code: DistributionCode.CodeA,
        ts: "T",
        exclude_4972: true,
      }],
      form4972: {
        born_before_1936: true,
        entire_balance_distributed: true,
        rolled_over_any: false,
        beneficiary_distribution: false,
        participant_five_year_member: true,
        prior_election_after_1986: false,
        elect_capital_gain: true,
        elect_10yr_averaging: false,
      },
    },
    filer: singleFiler,
    expectedPdfForms: ["f1040", "form4972"],
    reviewFocus: [
      "Form 4972 Part II line 6 prints 30,000 and line 7 prints the 6,000 special tax",
      "Form 4972 Part III remains blank for the Part-II-only election",
      "The 70,000 ordinary share appears once on Form 1040 lines 5a and 5b; the elected capital-gain share is not repeated as ordinary pension income",
      "Form 1040 line 16 includes the Form 4972 tax without duplicate Form 4972 pages or clipped taxpayer identity",
    ],
  },
  {
    id: "single-foreign-interest-current-excess",
    inputs: {
      general: singleGeneral,
      schedule_b_part_iii: {
        foreign_accounts_question: true,
        fincen_form114_required: true,
        foreign_countries: [{ irs_code: "CA", name: "Canada" }],
        foreign_trust_question: false,
      },
      f1099int: [{
        payer_name: "Canadian Bank",
        box1: 50_000,
        box6: 9_000,
        box7: "Canada",
        foreign_source_interest_usd: 50_000,
        foreign_tax_irs_country_code: "CA",
        foreign_tax_source_document_reference:
          "synthetic-2025-canadian-1099-int",
      }],
      form1116_review: {
        all_foreign_sources_reviewed: true,
        foreign_qualified_dividends: 0,
        foreign_capital_gains_or_losses_present: false,
        source_document_references: ["synthetic-2025-canadian-1099-int"],
        no_amt_liability_verified: true,
        single_source_pdf_review: {
          source_document_reference: "synthetic-2025-canadian-1099-int",
          all_foreign_tax_items_identified_confirmed: true,
          all_worldwide_income_sources_identified_confirmed: true,
          all_part_i_deductions_and_losses_except_standard_zero_confirmed: true,
          no_foreign_tax_reduction_confirmed: true,
          no_high_tax_kickout_confirmed: true,
          no_foreign_income_adjustment_confirmed: true,
          no_section_960c_increase_confirmed: true,
          no_international_boycott_confirmed: true,
          no_prior_year_carryover_or_carryback_confirmed: true,
          no_preferential_rate_income_confirmed: true,
          no_other_category_credit_confirmed: true,
        },
      },
      form1116_carryover_review: {
        reviews: [{
          income_category: "passive",
          prior_year_form1116_line23_limit: 700,
          prior_year_form1116_line24_allowed_credit: 700,
          prior_year_schedule_b_line8_balance: 0,
          source_document_references: [
            "synthetic-filed-2024-passive-1116-and-schedule-b",
          ],
          no_foreign_tax_redetermination_or_special_adjustment: true,
        }],
      },
    },
    filer: singleFiler,
    expectedPdfForms: [
      "f1040",
      "form_1116",
      "form1116_schedule_b",
      "schedule3",
    ],
    reviewFocus: [
      "Form 1116 Part I line 3a, 3g, 6, and 7 allocate the standard deduction against the sole foreign interest source",
      "Form 1116 Part II shows 1099 taxes and the 9,000 U.S.-dollar foreign tax without a made-up foreign-currency amount",
      "Form 1116 Part III line 18 agrees with Form 1040 line 15, and lines 24, 27, and 35 agree with Schedule 3 line 1",
      "Schedule B line 6 and line 8 current-year columns carry only the foreign tax above the parent Form 1116 credit limit",
      "Both parent and Schedule B pages show the same passive category and taxpayer identity without clipping or omitted pages",
    ],
  },
];
