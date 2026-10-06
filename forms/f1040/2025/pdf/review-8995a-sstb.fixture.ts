import { FilingStatus as SourceFilingStatus } from "../../nodes/types.ts";
import { FilingStatus } from "../../mef/header.ts";
import type { PdfReviewFixture } from "./review-fixtures.ts";

export function accountingSstbFixture(
  base: PdfReviewFixture,
  wageBase: PdfReviewFixture,
): PdfReviewFixture {
  return {
    id: "single-form8995a-accounting-sstb-phasein",
    filer: base.filer,
    inputs: {
      general: { ...(base.inputs.general as Record<string, unknown>) },
      w2: [{
        ...(wageBase.inputs.w2 as Record<string, unknown>[])[0],
        employee_ssn: "111-22-3333",
        box1_wages: 210000,
        box2_fed_withheld: 50000,
        box3_ss_wages: 176100,
        box4_ss_withheld: 10918.2,
        box5_medicare_wages: 210000,
        box6_medicare_withheld: 3045,
      }],
      schedule_c: [{
        business_reference: "SYNTHETIC-ACCOUNTING-2025",
        line_a_principal_business: "Accounting services",
        line_b_business_code: "541211",
        line_c_business_name: "Example Accounting",
        line_d_ein: "123456789",
        proprietor_recipient: "T",
        line_f_accounting_method: "cash",
        line_g_material_participation: true,
        line_i_made_1099_payments: false,
        line_32_at_risk: "a",
        line_1_gross_receipts: 38431,
        line_26_wages: 10000,
        qbi_specified_service: true,
        qbi_w2_wages: 10000,
        qbi_unadjusted_basis: 0,
        qbi_no_other_adjustments_confirmed: true,
        qbi_sstb_filing_review: {
          owner_ssn: "111223333",
          classification_source_reference:
            "Synthetic accounting service contracts",
          business_activity_description: "Accounting services",
          accounting_sstb_confirmed: true,
          employee_w2_records: [{
            employee_ssn: "222334444",
            employer_ein: "123456789",
            source_document_reference:
              "Synthetic issued accounting employee W2",
            box1_wages: 10000,
            box5_wages: 10000,
            ssa_filing_record_reference: "Synthetic timely SSA W2 submission",
            filed_within_60_days_of_due_date_confirmed: true,
          }],
          all_business_payroll_included_confirmed: true,
          no_other_business_or_aggregation_confirmed: true,
          no_ptp_or_loss_carryforward_confirmed: true,
          qualified_dividends_zero_confirmed: true,
          no_qualified_property_confirmed: true,
          no_adjustments_beyond_filed_half_se_tax_confirmed: true,
          review_reference: "Synthetic 2025 accounting QBI workpaper",
          reviewed_by: "Synthetic reviewer",
          reviewed_on: "2026-03-01",
        },
      }],
    },
    expectedPdfForms: [
      "f1040",
      "schedule1",
      "schedule2",
      "schedule_c",
      "schedule_se",
      "form8959",
      "form8960",
      "form8995a",
      "form8995a_schedule_a",
    ],
    reviewFocus: [
      "Owned accounting receipts38431/payroll10000 yield profit28431 and filed SE761/half381, adjusted QBI28050",
      "Taxable before QBI222300 yields50percent applicable SSTB percentage and paid wage limit; filed reduction153 leaves deduction2652",
      "Actual parent and ScheduleA business identity, specified-service flag, zero carryforward and Form1040 income/tax reconcile",
    ],
  };
}

/** Reviewed owner-only workforce; no W-2 payroll is asserted for the business. */
export function accountingSstbNoPayrollFixture(
  base: PdfReviewFixture,
): PdfReviewFixture {
  const inputs = structuredClone(base.inputs);
  const business = (inputs.schedule_c as Record<string, unknown>[])[0];
  business.line_1_gross_receipts = 28431;
  business.line_26_wages = 0;
  business.qbi_w2_wages = 0;
  const review = business.qbi_sstb_filing_review as Record<string, unknown>;
  review.employee_w2_records = [];
  review.no_business_employees_review = {
    payroll_and_expense_ledger_reference:
      "Synthetic owner-only workforce and zero-payroll expense ledger",
    sole_proprietor_only_workforce_confirmed: true,
    no_employee_w2_or_business_payroll_confirmed: true,
  };
  return {
    ...base,
    id: "single-form8995a-accounting-sstb-no-payroll",
    inputs,
    reviewFocus: [
      "Reviewed sole proprietor has no employees or payroll; actual business profit28431 and half-SE381 yield QBI28050",
      "Applicable QBI14025 and zero wage/property limit produce filed half-dollar reduction1403 and positive deduction1402",
      "Native and PDF ScheduleA/parent retain zero payroll and actual Form1040 income/tax/SE totals",
    ],
  };
}

/** Joint return, one primary-owner business and issued primary-owner wages. */
export function jointPrimaryAccountingSstbFixture(
  base: PdfReviewFixture,
  joint: PdfReviewFixture,
): PdfReviewFixture {
  const inputs = structuredClone(base.inputs) as Record<string, unknown>;
  inputs.general = {
    ...inputs.general as Record<string, unknown>,
    ...joint.inputs.general as Record<string, unknown>,
  };
  const wage = (inputs.w2 as Record<string, unknown>[])[0];
  wage.box1_wages = 420000;
  wage.box2_fed_withheld = 90000;
  wage.box5_medicare_wages = 420000;
  wage.box6_medicare_withheld = 6090;
  return {
    ...base,
    id: "joint-primary-form8995a-accounting-sstb-phasein",
    inputs,
    filer: joint.filer,
    reviewFocus: [
      "Joint filer contains both spouse identities, with one primary-owned accounting business and primary-owned issuedW2; no spouse business/payroll mixed",
      "Actual SE761/half381 and adjustedQBI28050 join joint pre-QBI taxable416550, joint threshold394600/range100000 and applicable78.05percent",
      "Filed phase-in QBI21893/potential4379/wage limit3903/reduction104/deduction4275 reconcile to actual joint1040 tax and all native/PDF pages",
    ],
  };
}

/** Separate Colorado return; reviewed full-year domicile and spouse deductions. */
export function mfsPrimaryAccountingSstbFixture(
  base: PdfReviewFixture,
): PdfReviewFixture {
  const inputs = structuredClone(base.inputs) as Record<string, unknown>;
  inputs.general = {
    ...inputs.general as Record<string, unknown>,
    filing_status: SourceFilingStatus.MFS,
    spouse_first_name: "Sam",
    spouse_last_name: "Example",
    spouse_ssn: "444-55-6666",
    mfs_spouse_itemizing: false,
    address_city: "Denver",
    address_state: "CO",
    address_zip: "80202",
  };
  const c = (inputs.schedule_c as Record<string, unknown>[])[0];
  (c.qbi_sstb_filing_review as Record<string, unknown>).mfs_filing_review = {
    domicile_state: "CO",
    spouse_domicile_state: "CO",
    full_year_noncommunity_domiciles_confirmed: true,
    spouse_domicile_record_reference:
      "Synthetic spouse Colorado voting, residence and permanent-home records",
    property_regime_record_reference:
      "Synthetic marital property and election review: no converted or elected community property",
    no_elected_community_property_regime_confirmed: true,
    no_current_or_retained_community_income_confirmed: true,
    primary_separate_earnings_record_reference:
      "Synthetic primary separate wage and accounting contract/payment records",
    business_and_wages_are_primary_separate_income_confirmed: true,
    mailing_address_state: "CO",
    domicile_record_reference:
      "Synthetic full-year Colorado domicile records for both spouses",
    spouse_ssn: "444556666",
    spouse_deduction_record_reference:
      "Synthetic spouse return and standard deduction workpaper",
    spouse_does_not_itemize_confirmed: true,
  };
  return {
    ...base,
    id: "mfs-primary-form8995a-accounting-sstb-phasein",
    inputs,
    filer: {
      ...base.filer,
      filingStatus: FilingStatus.MarriedFilingSeparately,
      address: {
        ...base.filer.address,
        city: "Denver",
        state: "CO",
        zip: "80202",
      },
      spouse: {
        ssn: "444556666",
        firstName: "Sam",
        lastName: "Example",
        nameControl: "EXAM",
      },
    },
    reviewFocus: [
      "Separate Colorado owner source and reviewed spouse standard deduction; no community property allocation",
      "Actual MFS threshold197300/range50000 and Additional Medicare threshold125000 join SE/QBI and final1040",
    ],
  };
}

/** Reviewed ordinary regimes; mailing state is not used to infer either domicile. */
export function noncommunityMfsAccountingSstbFixture(
  base: PdfReviewFixture,
  state: "NY" | "AK" | "TN" | "SD",
): PdfReviewFixture {
  const fixture = mfsPrimaryAccountingSstbFixture(base);
  const inputs = structuredClone(fixture.inputs) as Record<string, unknown>;
  const locations = {
    NY: ["Albany", "12207"],
    AK: ["Anchorage", "99501"],
    TN: ["Nashville", "37201"],
    SD: ["Pierre", "57501"],
  };
  const [city, zip] = locations[state];
  const g = inputs.general as Record<string, unknown>;
  Object.assign(g, {
    address_city: city,
    address_state: state,
    address_zip: zip,
  });
  const c = (inputs.schedule_c as Record<string, unknown>[])[0];
  const r = (c.qbi_sstb_filing_review as Record<string, unknown>)
    .mfs_filing_review as Record<string, unknown>;
  Object.assign(r, {
    domicile_state: state,
    spouse_domicile_state: state === "NY" ? "NJ" : state,
    mailing_address_state: state,
    domicile_record_reference:
      `Synthetic ${state} primary permanent-home, voting and residence records for full2025`,
    spouse_domicile_record_reference: `Synthetic ${
      state === "NY" ? "NJ" : state
    } spouse permanent-home and voting records for full2025`,
    property_regime_record_reference:
      `Synthetic ${state} marriage/property/trust/election review; no elected regime, converted property or retained community income`,
  });
  return {
    ...fixture,
    id: `mfs-${state.toLowerCase()}-primary-form8995a-accounting-sstb-phasein`,
    inputs,
    filer: {
      ...fixture.filer,
      address: { ...fixture.filer.address, city, state, zip },
    },
    reviewFocus: [
      `Actual ${state} reviewed noncommunity domicile and separate primary earnings; spouse domicile ${r.spouse_domicile_state}; explicit no-election/property review independent of mailing address`,
      ...fixture.reviewFocus.slice(1),
    ],
  };
}
