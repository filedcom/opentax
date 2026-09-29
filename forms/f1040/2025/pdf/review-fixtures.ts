import { type FilerIdentity, FilingStatus } from "../../mef/header.ts";
import { DistributionCode } from "../../nodes/inputs/f1099r/index.ts";
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
    box12_entries: [],
  };
}

export const pdfReviewFixtures: readonly PdfReviewFixture[] = [
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
