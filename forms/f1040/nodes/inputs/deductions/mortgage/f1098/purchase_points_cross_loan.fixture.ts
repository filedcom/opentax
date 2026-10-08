// Synthetic source for a 2025 purchase mortgage alongside one full-year loan.
// Authenticated lender/closing bytes remain outside this fixture.
export function purchasePointsCrossLoanFixture(recipientTin = "111-22-3333") {
  const purchaseRef = "2025 purchase Form 1098";
  const existingRef = "2025 existing Form 1098";
  const loan = (
    source_document_reference: string,
    balance: number,
    firstMonth: number,
  ) => ({
    source_document_reference,
    maximum_2025_balance: balance,
    maximum_balance_lender_reference:
      `${source_document_reference} annual maximum`,
    monthly_balance_records: Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      closing_balance: index + 1 < firstMonth ? 0 : balance,
      lender_statement_reference: `${source_document_reference} month ${
        index + 1
      }`,
    })),
  });
  return {
    f1098: [{
      lender_name: "Purchase Lender",
      recipient_tin: recipientTin,
      source_document_reference: purchaseRef,
      box2_outstanding_principal: 300_000,
      box3_origination_date: "07/15/2025",
      box1_mortgage_interest: 6_000,
      box1_current_year_deductible_interest: 6_000,
      box1_deduction_workpaper_reference: "2025 combined Pub. 936 interest",
      box6_points_paid: 3_000,
      box6_current_year_deductible_points: 3_000,
      box6_deduction_workpaper_reference: "2025 purchase points Pub. 936",
      for_routing: "A",
    }, {
      lender_name: "Existing Lender",
      recipient_tin: recipientTin,
      source_document_reference: existingRef,
      box3_origination_date: "06/15/2020",
      box1_mortgage_interest: 12_000,
      box1_current_year_deductible_interest: 12_000,
      box1_deduction_workpaper_reference: "2025 combined Pub. 936 interest",
      for_routing: "A",
    }],
    f1098_purchase_points_cross_loan_review: {
      purchase_points_cross_loan_review: {
        purchase_loan: loan(purchaseRef, 300_000, 7),
        existing_loan: loan(existingRef, 400_000, 1),
        purchase_property_reference: "2025 new principal residence",
        existing_property_reference: "2025 former main home",
        existing_second_home_review: {
          occupancy_record_reference: "2025 former-home occupancy ledger",
          qualified_second_home_election_verified: true,
          held_out_for_rent_or_resale: false,
          fair_rental_days: 0,
          personal_use_days: 0,
        },
        purchase_closing_disclosure_reference:
          "2025 purchase closing disclosure",
        pub936_points_workpaper_reference: "2025 purchase points Pub. 936",
        all_qualified_home_mortgages_included_verified: true,
        both_loans_post_2017_acquisition_debt_verified: true,
        purchase_principal_residence_verified: true,
        purchase_points_paid_from_separate_funds_verified: true,
        purchase_points_other_immediate_deduction_conditions_verified: true,
        lender_maxima_cover_every_day_verified: true,
      },
    },
  };
}
