import {
  dependentMultipleIncomeSource,
  form8962MultipleSourceInputs,
} from "./form8962_multiple_source.fixture.ts";
import { FilingStatus } from "../nodes/types.ts";

// Synthetic reviewed source facts for the existing household-MAGI task.
export function form8962FamilySourceInputs(
  size = 4,
  region: "TX" | "AK" | "HI" = "TX",
  joint = false,
): any {
  if (!Number.isInteger(size) || size < (joint ? 3 : 2)) {
    throw Error(
      "Family source needs complete taxpayer/spouse/dependent inventory",
    );
  }
  const input: any = form8962MultipleSourceInputs();
  const dependents = Array.from(
    { length: size - (joint ? 2 : 1) },
    (_, index) => {
      const d: any = dependentMultipleIncomeSource();
      const ssn = String(987650001 + index);
      d.first_name = [
        "Casey",
        "Blair",
        "Dana",
        "Evan",
        "Finley",
        "Gale",
        "Harper",
        "Indigo",
      ][index % 8];
      d.ssn = ssn;
      if (index < 2) {
        const source = d.ptc_tax_return;
        source.filed_form1040.taxpayer_ssn = ssn;
        source.filed_form1040.source_document_id = "child" + index +
          "-filed-2025";
        for (
          const key of [
            "wage_forms_w2",
            "interest_forms1099",
            "dividend_forms1099",
          ]
        ) {
          for (const [j, row] of source[key].entries()) {
            row.source_document_id = "child" + index + "-" + key + "-" + j;
            if ("employee_ssn" in row) row.employee_ssn = ssn;
            if ("recipient_ssn" in row) row.recipient_ssn = ssn;
          }
        }
      } else {
        const id = "child" + index + "-interest-2025";
        d.ptc_tax_return = {
          filing: "not_required",
          interest_form1099: {
            source_document_id: id,
            recipient_ssn: ssn,
            box1_taxable_interest: 500,
            box8_tax_exempt_interest: 0,
          },
          filing_requirement_review: {
            source_document_id: "child" + index + "-filing-review",
            dependent_ssn: ssn,
            tax_year: 2025,
            filing_status: "single",
            blind: false,
            interest_source_document_id: id,
            other_income_reviewed_absent: true,
            other_filing_triggers_reviewed_absent: true,
            return_filed: false,
            reviewed_on: "2026-02-01",
            reviewer_name: "Source Reviewer",
          },
        };
      }
      return d;
    },
  );
  input.general.dependents = dependents;
  input.general.address_state = region;
  input.general.ptc_residence_states_2025 = [region];
  input.general.address_city = region === "TX"
    ? "Austin"
    : region === "AK"
    ? "Anchorage"
    : "Honolulu";
  input.general.address_zip = region === "TX"
    ? "78701"
    : region === "AK"
    ? "99501"
    : "96801";
  // Nine-person cases exceed the ordinary state Medicaid/CHIP income ceilings.
  // Keep household income at 350% of the IRS's TY2025 (2024) regional FPL.
  input.w2[0].box1_wages = size === 9
    ? ({ TX: 170950, AK: 221875, HI: 201505 }[region])
    : 50000;
  if (size === 9) {
    const wages = input.w2[0].box1_wages;
    input.w2[0].box3_ss_wages = Math.min(wages, 176100);
    input.w2[0].box4_ss_withheld = Math.round(Math.min(wages, 176100) * 6.2) /
      100;
    input.w2[0].box5_medicare_wages = wages;
    input.w2[0].box6_medicare_withheld = Math.round(
      (wages * 0.0145 + Math.max(0, wages - 200000) * 0.009) * 100,
    ) / 100;
  }
  if (joint) {
    input.general.filing_status = FilingStatus.MFJ;
    input.general.spouse_first_name = "Jordan";
    input.general.spouse_last_name = "Taxpayer";
    input.general.spouse_ssn = "234-56-7890";
    input.general.spouse_dob = "1986-06-15";
    input.general.spouse_can_be_claimed_as_dependent = false;
    input.general.ptc_spouse_income_review = {
      tax_year: 2025,
      spouse_ssn: "234567890",
      review_reference: "2025-Jordan-reviewed-zero-income-inventory",
      reviewed_on: "2026-02-01",
      reviewer_name: "Source Reviewer",
      inventory_complete: true,
      income_amounts: {
        wages: 0,
        taxable_interest: 0,
        tax_exempt_interest: 0,
        ordinary_dividends: 0,
        taxable_ira_distributions: 0,
        taxable_pensions: 0,
        social_security_total: 0,
        social_security_taxable: 0,
        capital_gain: 0,
        additional_income: 0,
        adjustments: 0,
        foreign_earned_income_exclusion: 0,
      },
      income_source_references: [],
    };
  }
  const policy = input.f1095a[0];
  policy.policy_number = region + "-FAMILY-" + size + "-" +
    (joint ? "JOINT" : "SINGLE");
  policy.coverage_state = region;
  policy.covered_individual_ssns = [
    "123456789",
    ...(joint ? ["234567890"] : []),
    ...dependents.map((d: any) => d.ssn),
  ];
  if (size === 9) {
    policy.monthly_premiums = Array(12).fill(3000);
    policy.annual_premium = 36000;
    for (const correction of policy.slcsp_corrections) {
      correction.corrected_slcsp = correction.month <= 6 ? 2500 : 2600;
    }
    for (const evidence of policy.no_aptc_monthly_evidence) {
      evidence.marketplace_slcsp = evidence.month <= 6 ? 2500 : 2600;
      evidence.premium_payment.amount = 3000;
    }
  }
  for (const row of policy.no_aptc_monthly_evidence) {
    // Explicit ordinary reviewed facts; these are not authenticated issued records.
    row.coverage_eligibility_review = {
      tax_year: 2025,
      policy_number: policy.policy_number,
      month: row.month,
      review_reference: policy.policy_number + "-ELIGIBILITY-" + row.month,
      reviewed_on: "2026-02-01",
      reviewer_name: "Source Reviewer",
      individuals: policy.covered_individual_ssns.map((
        individual_ssn: string,
      ) => ({
        individual_ssn,
        qhp_enrolled_for_month: true,
        lawfully_present_for_month: true,
        incarcerated_other_than_pending_disposition: false,
        employer_sponsored_mec_enrolled: false,
        employer_offer_review: "no_offer_available",
        government_mec_eligibility_review: "not_eligible",
        other_designated_mec_eligibility_review: "not_eligible",
        eligibility_record_reference: policy.policy_number + "-PERSON-" +
          individual_ssn + "-" + row.month,
      })),
    };
    row.marketplace_reference = policy.policy_number + "-SLCSP-" + row.month;
    row.premium_payment.reference = policy.policy_number + "-PAYMENT-" +
      row.month;
  }
  return input;
}
