import { FilingStatus } from "../../nodes/types.ts";
import type { Schedule1A2026Input } from "../nodes/schedule1a.ts";
import {
  scopeReview2026,
  zeroExclusions2026,
} from "../nodes/schedule1a.fixture.ts";
import { syntheticVehicleLoan2026 } from "../inputs/vehicle-loan.fixture.ts";
import { calculateVehicleInterestSources2026 } from "../inputs/vehicle-loan-source.ts";
export function syntheticSchedule1A2026(): Schedule1A2026Input {
  const owner = {
    filing_status: FilingStatus.Single,
    taxpayer_ssn: "111223333",
  };
  const loans = Array.from({ length: 3 }, (_, i) => {
    const l = syntheticVehicleLoan2026();
    l.loan_id += i;
    l.original.account_number += i;
    l.original.statements[0].account_number = l.original.account_number;
    l.original.statements[0].document_id += i;
    l.vin = l.vin.slice(0, -1) + i;
    l.original.statements[0].reported_vin = l.vin;
    l.has_business_interest_allocation = i === 0;
    return l;
  });
  const vehicle = calculateVehicleInterestSources2026(loans, owner, [{
    loan_id: loans[0].loan_id,
    borrower_ssn: owner.taxpayer_ssn,
    activity_id: "synthetic-business",
    source_form: "schedule_c",
    deducted_amount: 1_000,
    limitation_result_reference: "synthetic-final-business-deduction",
  }]);
  return {
    ...owner,
    tax_year: 2026,
    magi: 80_000,
    taxpayer_has_valid_ssn: true,
    taxpayer_ssn_review_complete: true,
    taxpayer_age_65_or_older: true,
    source_scope_review: {
      ...scopeReview2026,
      has_vehicle_loan_interest: true,
    },
    part1_zero_exclusions_review: zeroExclusions2026,
    vehicle_interest_2026: vehicle.map((v) => v.row),
    w2_2026_sources: Array.from({ length: 6 }, (_, i) => ({
      employee_ssn: owner.taxpayer_ssn,
      employer_ein: `12345678${i}`,
      employer_name: `Synthetic Cafe ${i + 1}`,
      source_document_reference: `w2-${i}`,
      box1_wages: 10_000,
      statutory_employee: false,
      cash_tips: 1_000,
      qualified_overtime: 1_000,
      occupation_codes: ["102"],
    })),
    employee_tip_reviews: Array.from({ length: 6 }, (_, i) => ({
      employee_ssn: owner.taxpayer_ssn,
      employer_ein: `12345678${i}`,
      source_document_reference: `w2-${i}`,
      excluded_cash_tips: 0,
      allocations: [{
        occupation_code: "102",
        qualified_cash_tips: 1_000,
        occupation_and_tip_records_reference: `tips-${i}`,
      }],
      qualification_review_reference: `review-${i}`,
      voluntary_customer_tips_not_service_charges: true,
      no_recharacterized_wages_or_related_payor_tips: true,
      services_not_illegal_under_applicable_law: true,
      sstb_treatment: "not_sstb",
    })),
  };
}
