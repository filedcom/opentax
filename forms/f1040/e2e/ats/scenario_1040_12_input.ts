import { FilingStatus, TS } from "../../nodes/types.ts";
import { Box12Code } from "../../nodes/inputs/income/wages/w2/index.ts";
import { Form7217PropertyTreatment } from "../../nodes/inputs/income/business/f7217/index.ts";
import { SCENARIO_1040_12_FACTS } from "./ty2025_cases.ts";

/** Printed wage/business slice, not the complete Scenario 12 filing claim. */
export function scenario104012PartialInput() {
  const { taxpayer, w2, scheduleC: business } = SCENARIO_1040_12_FACTS;
  return {
    general: {
      taxpayer_first_name: taxpayer.firstName,
      taxpayer_last_name: taxpayer.lastName,
      taxpayer_ssn: taxpayer.ssn,
      address_line1: taxpayer.address.line1,
      address_city: taxpayer.address.city,
      address_state: taxpayer.address.state,
      address_zip: taxpayer.address.zip,
      filing_status: FilingStatus.Single,
      digital_assets: taxpayer.digitalAssets,
      ats_test_submission: true as const,
    },
    w2: [{
      source_document_reference: "irs-ty2025-ats-1040-12-w2-page-15",
      employee_ssn: w2.employeeSsn,
      employer_name: w2.employerName,
      employer_ein: w2.employerEin,
      employer_address_line1: w2.employerAddress.line1,
      employer_address_city: w2.employerAddress.city,
      employer_address_state: w2.employerAddress.state,
      employer_address_zip: w2.employerAddress.zip,
      box1_wages: w2.box1Wages,
      box2_fed_withheld: w2.box2FederalWithholding,
      box3_ss_wages: w2.box3SocialSecurityWages,
      box4_ss_withheld: w2.box4SocialSecurityWithholding,
      box5_medicare_wages: w2.box5MedicareWages,
      box6_medicare_withheld: w2.box6MedicareWithholding,
      box12_entries: [{ code: Box12Code.DD, amount: w2.box12CodeDD }],
      box13_retirement_plan: w2.retirementPlanChecked,
      box15_state: "KY",
      box16_state_wages: w2.stateWages,
      box17_state_withheld: w2.stateWithholding,
    }],
    schedule_c: [{
      business_reference: BUSINESS_REFERENCE,
      proprietor_recipient: TS.T,
      line_a_principal_business: business.principalBusiness,
      line_b_business_code: business.businessCode,
      line_c_business_name: business.businessName,
      line_e_business_address: business.businessAddress,
      line_f_accounting_method: "cash" as const,
      line_g_material_participation: business.materialParticipation,
      line_i_made_1099_payments: business.made1099Payments,
      line_1_gross_receipts: business.grossReceipts,
      line_15_insurance: business.insurance,
      line_17_professional_services: business.professionalServices,
      line_18_office_expense: business.officeExpense,
      line_20b_rent_other: business.rentOtherBusinessProperty,
      line_22_supplies: business.supplies,
      line_23_taxes_licenses: business.taxesAndLicenses,
    }],
  };
}

const BUSINESS_REFERENCE = "irs-ty2025-ats-1040-12-schedule-c-page-8";
const POLICY_REFERENCE = "ats-1040-12-assumed-health-policy-record";
const PLAN_ID = "ATS-1040-12-HEALTH";
const ISSUER_EIN = "000001212";
const PAID_MONTHS = 4;

/** Recorded fill-ins for facts the packet does not print but guards require. */
export const SCENARIO_1040_12_ASSUMPTIONS = [
  {
    field: "general.taxpayer_dob",
    value: "1985-06-12",
    why: "Packet gives no birth date; Form 1040 line 12d is unchecked, so any date after 1961-01-01 is consistent.",
  },
  {
    field: "general.taxpayer_prior_year_agi",
    value: 0,
    why: "Packet gives no prior-year AGI.",
  },
  {
    field: "general.qbi_no_prior_loss_or_suspended_loss_confirmed",
    value: true,
    why: "Packet shows no QBI loss carryforward or suspended loss.",
  },
  {
    field: "general.qbi_not_patron_of_specified_cooperative_confirmed",
    value: true,
    why: "Packet shows no cooperative patronage (no Form 1099-PATR).",
  },
  {
    field: "schedule_c[0].qbi_no_other_adjustments_confirmed",
    value: true,
    why: "Schedule C pp. 8-9 shows no other QBI adjustments.",
  },
  {
    field: "form7206.single_schedule_c_plan.premium_months",
    value: "250 paid in each of Jan-Apr; May-Dec employer-plan eligible, 0 paid",
    why: "Form 7206 line 1 prints 1,000 total but no monthly detail; W-2 box 12 DD shows employer coverage, so the premium is placed in months before that coverage. The 1,000 total is unchanged.",
  },
  {
    field: "form7206.single_schedule_c_plan.issued_policy_record",
    value: `${PLAN_ID}, issuer EIN ${ISSUER_EIN}`,
    why: "Packet gives no policy or premium payment records.",
  },
  {
    field: "f7217[0].distributed_properties[0].fair_market_value",
    value: 32_507,
    why: "Form 7217 Part II column (d) is blank; FMV assumed equal to the partnership's basis. It enters no tax computation.",
  },
  {
    field: "f7217[0].distributed_properties[0].partner_basis_after_section_732",
    value: 6_000,
    why: "Part II column (e) prints 4,000 but Part I line 10 prints 6,000; the line 10 instruction requires them to match, so line 10 is used.",
  },
] as const;

function healthPlan() {
  const { taxpayer } = SCENARIO_1040_12_FACTS;
  const months = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    return {
      month,
      paid_premium: month <= PAID_MONTHS ? 250 : 0,
      policy_source_reference: POLICY_REFERENCE,
      payment_source_reference: `ats-1040-12-assumed-premium-payment-${month}`,
      covered_person: "taxpayer" as const,
      eligible_for_subsidized_employer_plan: month > PAID_MONTHS,
      employer_plan_review_reference:
        `ats-1040-12-assumed-employer-plan-review-${month}`,
      marketplace_policy: false,
      long_term_care_policy: false,
      public_safety_officer_excluded_amount: 0,
    };
  });
  return {
    business_reference: BUSINESS_REFERENCE,
    plan_identifier: PLAN_ID,
    recipient: TS.T,
    taxpayer_identity: {
      name: `${taxpayer.firstName} ${taxpayer.lastName}`,
      ssn: taxpayer.ssn,
    },
    issued_policy_record: {
      issuer_name: "ATS SCENARIO 12 HEALTH INSURER",
      issuer_ein: ISSUER_EIN,
      policy_number: PLAN_ID,
      policyholder_ssn: taxpayer.ssn,
      source_document_reference: POLICY_REFERENCE,
    },
    issued_premium_records: months.map((m) => ({
      month: m.month,
      issuer_ein: ISSUER_EIN,
      policy_number: PLAN_ID,
      policyholder_ssn: taxpayer.ssn,
      payer_ssn: taxpayer.ssn,
      covered_person: m.covered_person,
      paid_premium: m.paid_premium,
      paid_on: `2025-${String(m.month).padStart(2, "0")}-15`,
      policy_source_reference: m.policy_source_reference,
      payment_source_reference: m.payment_source_reference,
    })),
    premium_months: months,
    schedule_c_line31_net_profit:
      SCENARIO_1040_12_FACTS.scheduleC.printedNetProfit,
    schedule1_line15_se_tax_deduction:
      SCENARIO_1040_12_FACTS.scheduleSE.printedHalfTaxDeduction,
    schedule1_line16_retirement_deduction: 0,
    plan_established_under_business: true as const,
    sole_positive_business_verified: true as const,
    no_form2555: true as const,
    no_schedule_se_optional_method: true as const,
    no_other_earned_income: true as const,
  };
}

/**
 * Complete TY2025 ATS Scenario 12 return (packet pp. 1-15) with the
 * assumptions above. Current law applies: 15,750 standard deduction and a
 * Form 8995 deduction the packet omits.
 */
export function scenario104012Input() {
  const source = scenario104012PartialInput();
  const { form7217 } = SCENARIO_1040_12_FACTS;
  const [property] = form7217.distributedProperties;
  return {
    ...source,
    general: {
      ...source.general,
      taxpayer_dob: "1985-06-12",
      taxpayer_prior_year_agi: 0,
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    },
    schedule_c: source.schedule_c.map((business) => ({
      ...business,
      qbi_no_other_adjustments_confirmed: true,
    })),
    form7206: {
      single_schedule_c_plan: healthPlan(),
      marketplace_ptc_premium_overlap: false,
    },
    f7217: {
      form7217s: [{
        partnership_name: form7217.partnershipName,
        partnership_ein: form7217.partnershipEin,
        distribution_date: form7217.distributionDate,
        complete_liquidation: form7217.completeLiquidation,
        section_751b_sale_or_exchange: form7217.section751bSaleOrExchange,
        partner_adjusted_basis_before_distribution:
          form7217.partnerAdjustedBasisBeforeDistribution,
        cash_received: form7217.cashReceived,
        distributed_properties: [{
          description: property.description,
          property_treatment: Form7217PropertyTreatment.Section732Property,
          partnership_basis_before_distribution:
            property.partnershipBasisBeforeDistribution,
          section_734b_basis_adjustment: property.section734bBasisAdjustment,
          fair_market_value: property.partnershipBasisBeforeDistribution,
          partner_basis_after_section_732:
            form7217.printedBasisAllocatedToProperty,
        }],
      }],
    },
  };
}

export const SCENARIO_1040_12_RECONCILIATION = {
  sourceUrl:
    "https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-12-10292025.pdf",
  sourceSha256:
    "f0bfcfda3c29e216687ba74c78a5c73f33d11487f82aab0808ee9cd128146c83",
  sourcePages: {
    form1040: [2, 3],
    schedule1: [4, 5],
    schedule2: [6, 7],
    scheduleC: [8, 9],
    scheduleSE: [10, 11],
    form7206: 12,
    form7217: [13, 14],
    w2: 15,
  },
  printedScheduleSELine9: 62_722,
  reconciledScheduleSELine9: 70_222,
  missing: [
    "Packet p.3 line 12e prints 15,000; current law and the form's own margin give 15,750 for single filers.",
    "Packet p.3 line 13a is blank; Form 8995 allows 4,322 on 21,609 of qualified business income (not an SSTB, below threshold).",
    "Packet p.10 Schedule SE line 9 prints 62,722; 176,100 less 105,878 is 70,222. Tax is unchanged.",
    "Packet p.14 Form 7217 Part II column (e) total prints 4,000; Part I line 10 prints 6,000 and the instructions require them to match.",
    "Packet p.12 Form 7206 claims 1,000 while W-2 box 12 DD shows employer coverage; premium months are a recorded assumption.",
  ],
  /** Printed answer-key values that differ from the current-law return. */
  conflicts: [
    { page: 3, line: "1040 line 12e", printed: 15_000, current: 15_750 },
    { page: 3, line: "1040 line 13a", printed: 0, current: 4_322 },
    { page: 3, line: "1040 line 14", printed: 15_000, current: 20_072 },
    { page: 3, line: "1040 line 15", printed: 107_445, current: 102_373 },
    { page: 3, line: "1040 line 16", printed: 18_634, current: 17_436 },
    { page: 3, line: "1040 line 18", printed: 18_634, current: 17_436 },
    { page: 3, line: "1040 line 22", printed: 18_634, current: 17_436 },
    { page: 3, line: "1040 line 24", printed: 22_072, current: 20_874 },
    { page: 3, line: "1040 line 37", printed: 7_628, current: 6_430 },
    { page: 10, line: "Schedule SE line 9", printed: 62_722, current: 70_222 },
    {
      page: 14,
      line: "Form 7217 Part II (e) total",
      printed: 4_000,
      current: 6_000,
    },
  ],
} as const;
