/** Reviewed-shape synthetic TY2025 sole-proprietor childcare contracts. */
export function form8882Fixture() {
  return {
    source_type: "direct_schedule_c" as const,
    schedule_c_business_reference: "SHOP-CHILDCARE-2025",
    proprietor_ssn: "111223333",
    no_controlled_group_or_common_control_confirmed: true as const,
    no_pass_through_credit_confirmed: true as const,
    no_prior_facility_credit_recapture_event_confirmed: true as const,
    facility_contract: {
      provider_name: "Example Childcare Center",
      provider_ein: "123456789",
      contract_reference: "FACILITY-2025-1",
      payment_ledger_reference: "PAY-FACILITY-2025-1",
      schedule_c_expense_description: "Childcare facility net of 45F credit",
      paid_or_incurred_date: "2025-09-30",
      gross_expenditure_usd: 40_000,
      available_to_employees_confirmed: true as const,
      no_highly_compensated_employee_discrimination_confirmed: true as const,
      no_other_credit_or_deduction_for_credited_portion_confirmed:
        true as const,
      facility_license_reference: "TX-CHILDCARE-LICENSE-2025-1",
      facility_license_state: "TX",
      facility_principal_use_childcare_confirmed: true as const,
      facility_complies_with_state_local_law_confirmed: true as const,
      employer_principal_trade_is_not_childcare_facility_confirmed:
        true as const,
      no_capital_property_or_residence_expenditure_confirmed: true as const,
      fair_market_value_of_care_usd: 42_000,
    },
    referral_contract: {
      provider_name: "Example Childcare Referral",
      provider_ein: "987654321",
      contract_reference: "REFERRAL-2025-1",
      payment_ledger_reference: "PAY-REFERRAL-2025-1",
      schedule_c_expense_description: "Childcare referral net of 45F credit",
      paid_or_incurred_date: "2025-10-15",
      gross_expenditure_usd: 10_000,
      available_to_employees_confirmed: true as const,
      no_highly_compensated_employee_discrimination_confirmed: true as const,
      no_other_credit_or_deduction_for_credited_portion_confirmed:
        true as const,
      childcare_resource_and_referral_services_confirmed: true as const,
    },
  };
}

export function form8882ScheduleCFixture() {
  return {
    schedule_cs: [{
      business_reference: "SHOP-CHILDCARE-2025",
      proprietor_recipient: "T",
      line_a_principal_business: "Retail shop",
      line_b_business_code: "459999",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_1_gross_receipts: 100_000,
      part_v_other_expenses: [
        { description: "Childcare facility net of 45F credit", amount: 30_000 },
        { description: "Childcare referral net of 45F credit", amount: 9_000 },
      ],
    }],
  };
}
