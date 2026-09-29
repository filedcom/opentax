import { type FilerIdentity, FilingStatus } from "../../mef/header.ts";
import { DistributionCode } from "../../nodes/inputs/f1099r/index.ts";
import { EnergyType } from "../../nodes/inputs/f8835/index.ts";
import { CoverageType } from "../../nodes/intermediate/forms/form8889/index.ts";
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
    ac_nameplate_kw: 500,
    facility_placed_in_service_date: "2023-01-01",
    facility_construction_start_date: "2022-12-01",
    production_period_start_date: "2025-01-01",
    production_period_end_date: "2025-12-31",
    increased_credit_reason: "none" as const,
    domestic_content_bonus: false,
    energy_community_bonus: false,
    is_fiscal_year: false,
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
      general: jointGeneral,
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
