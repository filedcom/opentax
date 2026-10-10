import { TS } from "../../../../../nodes/types.ts";
import { withRentedHomeEvidence } from "../../../../../nodes/intermediate/forms/deductions/business/form_8829/source.fixture.ts";

export const rentedHomeCases = [
  { id: "monthly-full", profit: 50000, months: 12, area: 200, prior: 100 },
  { id: "income-limited", profit: 2000, months: 12, area: 200, prior: 100 },
  { id: "zero-income", profit: 0, months: 12, area: 200, prior: 100 },
  { id: "business-loss", profit: -1000, months: 12, area: 200, prior: 100 },
  { id: "part-year", profit: 27000, months: 6, area: 200, prior: 0 },
  { id: "fractional-area", profit: 50000, months: 12, area: 333, prior: 100 },
];

export function rentedHomeFixture(c: typeof rentedHomeCases[number]) {
  const source = withRentedHomeEvidence({
    business_reference: "Tenant-consulting",
    home_identifier: "Tenant-home-2025",
    recipient: TS.T,
    business_area_sqft: c.area,
    total_area_sqft: 1000,
    schedule_c_line29_tentative_profit: c.profit,
    insurance_indirect: c.months * 100,
    rent_indirect: c.months * 1000,
    repairs_direct: 700,
    repairs_indirect: 600,
    utilities_indirect: c.months * 200,
    other_indirect: 300,
    prior_operating_carryover: c.prior,
    regular_exclusive_use_verified: true,
    actual_expense_method_verified: true,
    rented_home_verified: true,
    sole_home_and_business_verified: true,
    all_schedule_c_gross_income_attributable_to_home_verified: true,
    no_daycare_or_inventory_exception: true,
    no_home_business_gain_or_other_trade_loss: true,
    no_casualty_mortgage_tax_or_depreciation: true,
    home_expenses_excluded_from_schedule_c_verified: true,
    direct_repairs_business_area_only_verified: true,
  }, "111223333");
  const evidence = source.source_evidence!;
  const start = c.months === 6 ? "2025-07-01" : "2025-01-01";
  evidence.home_use_record.use_started_on = start;
  evidence.expenses = evidence.expenses.filter((e) =>
    !["rent_indirect", "utilities_indirect"].includes(e.category)
  ).map((e) => ({ ...e, covered_from: start }));
  for (let month = 13 - c.months; month <= 12; month++) {
    const mm = String(month).padStart(2, "0");
    const end = new Date(Date.UTC(2025, month, 0)).toISOString().slice(0, 10);
    for (
      const [category, amount] of [["rent_indirect", 1000], [
        "utilities_indirect",
        200,
      ]] as const
    ) {
      evidence.expenses.push({
        record_reference: `${category}-ledger-${mm}`,
        bill_reference: `${category}-bill-${mm}`,
        payment_reference: `${category}-payment-${mm}`,
        category,
        amount,
        covered_from: `2025-${mm}-01`,
        covered_through: end,
        paid_on: end,
        not_claimed_elsewhere_confirmed: true,
        no_reimbursement_or_tax_exempt_allocation_confirmed: true,
        direct_repairs_business_area_only_confirmed: false,
      });
    }
  }
  return {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Tenant",
      taxpayer_ssn: "111223333",
      taxpayer_dob: "1985-06-15",
      address_line1: "1 Example Way",
      address_city: "Albany",
      address_state: "NY",
      address_zip: "12207",
      digital_assets: false,
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    },
    schedule_c: [{
      business_reference: source.business_reference,
      proprietor_recipient: TS.T,
      line_a_principal_business: "Consulting",
      line_b_business_code: "541600",
      line_c_business_name: "Alex Tenant Consulting",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_i_made_1099_payments: false,
      qbi_no_other_adjustments_confirmed: true,
      line_1_gross_receipts: Math.max(0, c.profit),
      ...(c.profit < 0
        ? {
          line_17_professional_services: -c.profit,
          line_32_at_risk: "a",
        }
        : {}),
    }],
    form_8829: { rented_home: source },
  };
}
