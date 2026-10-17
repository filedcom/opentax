import { PDFDocument, StandardFonts } from "pdf-lib";
import { FilingStatus } from "../../nodes/types.ts";
import {
  DependentRelationship,
  IRSDependentRelationshipCode,
} from "../../nodes/inputs/general/filing/general/index.ts";
import { FMVMethod } from "../../nodes/inputs/deductions/charitable/f8283/fmv-method.ts";
import type { MefPdfAttachment } from "../../2025/mef/form-descriptor.ts";
import { withSyntheticForm1098Copy } from "../../2025/pdf/reviews/deductions/mortgage/review-1098-copy.fixture.ts";
import { sha256Hex } from "../../2025/return-processing/prepared-source.ts";
import { SCENARIO_1040_02_FACTS } from "./ty2025_cases.ts";

/**
 * TY2025 Form 1040 ATS Scenario 2.
 * https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-2-12012025.pdf
 * Page 1 additional information, 2-3 Form 1040, 4-5 W-2s, 6-7 Schedule 1,
 * 8 Schedule A, 9-10 Schedule C, 11-12 Form 8283.
 *
 * The first W-2 is statutory-employee business income. The packet leaves
 * Schedule C line 1 blank, so its issued W-2 box 1 supplies that amount.
 */
export async function scenario104002Input(): Promise<Record<string, unknown>> {
  const facts = SCENARIO_1040_02_FACTS;
  const mortgage = await withSyntheticForm1098Copy("ats-1040-02", {
    lender_name: SCENARIO_1040_02_ASSUMED.lenderName,
    recipient_tin: facts.taxpayer.ssn,
    source_document_reference: "ats-1040-02-assumed-form-1098",
    box1_mortgage_interest: facts.scheduleA.mortgageInterestReportedOn1098,
  });
  const statement = await scenario104002Attachments();
  return {
    general: {
      // Visually verified on official packet page 2; marks are absent from text extraction.
      filing_status: FilingStatus.MFJ,
      digital_assets: false,
      taxpayer_first_name: facts.taxpayer.firstName,
      taxpayer_last_name: facts.taxpayer.lastName,
      taxpayer_ssn: facts.taxpayer.ssn,
      taxpayer_dob: facts.taxpayer.dateOfBirth,
      taxpayer_tin_issued_by_due_date: true,
      spouse_first_name: facts.spouse.firstName,
      spouse_last_name: facts.spouse.lastName,
      spouse_ssn: facts.spouse.ssn,
      spouse_dob: facts.spouse.dateOfBirth,
      spouse_tin_issued_by_due_date: true,
      address_line1: facts.taxpayer.address.line1,
      address_city: facts.taxpayer.address.city,
      address_state: facts.taxpayer.address.state,
      address_zip: facts.taxpayer.address.zip,
      address_in_care_of: SCENARIO_1040_02_ASSUMED.inCareOfName,
      ats_test_submission: true,
      taxpayer_prior_year_agi: 0,
      spouse_prior_year_agi: 0,
      spouse_deceased: true,
      spouse_death_date: facts.spouse.dateOfDeath,
      surviving_spouse_joint_return_review: {
        death_record_reference: "ats-1040-02-packet-page-1-date-of-death",
        no_personal_representative_appointed_verified: true,
        surviving_spouse_signs_verified: true,
      },
      spouse_ip_pin: facts.spouse.identityProtectionPin,
      presidential_campaign_fund_taxpayer: true,
      do_not_claim_eic: true,
      qbi_deduction_not_claimed: true,
      eic_tax_residency_review: {
        status: "joint_new_election",
        elected_person: "spouse",
        elected_spouse_nonresident_at_year_end_verified: true,
        other_spouse_citizen_or_resident_at_year_end_verified: true,
        worldwide_income_included_verified: true,
        status_record_reference: "ats-1040-02-packet-page-2-resident-election",
        signed_statement_file_name: statement[0].fileName,
        signed_statement_pdf_sha256: await sha256Hex(statement[0].bytes),
        statement_signed_by_both_verified: true,
      },
      dependents: [{
        first_name: facts.dependent.firstName,
        last_name: facts.dependent.lastName,
        name_control: "JONE",
        ssn: facts.dependent.ssn,
        tin_issued_by_due_date: true,
        dob: facts.dependent.dateOfBirth,
        relationship: DependentRelationship.Son,
        irs_relationship_code: IRSDependentRelationshipCode.Son,
        months_in_home: 12,
        months_lived_with_you_in_us: 12,
        lived_in_us_over_half_year: true,
        full_time_student: facts.dependent.fullTimeHighSchoolStudent,
        filed_joint_return_except_refund_only: false,
        us_citizen_national_or_resident: true,
        provided_over_half_own_support: false,
      }],
    },
    w2: facts.w2.map((form, index) => ({
      source_document_reference: `irs-ty2025-ats-1040-02-w2-page-${index + 4}`,
      schedule_c_business_reference: form.statutoryEmployee
        ? "ats-1040-02-statutory-business"
        : undefined,
      employee_ssn: form.employeeSsn,
      employer_name: form.employerName,
      employer_ein: form.employerEin,
      employer_address_line1: form.employerAddress.line1,
      employer_address_line2: "line2" in form.employerAddress
        ? form.employerAddress.line2
        : undefined,
      employer_address_city: form.employerAddress.city,
      employer_address_state: form.employerAddress.state,
      employer_address_zip: form.employerAddress.zip,
      box1_wages: form.box1Wages,
      box2_fed_withheld: form.box2FederalWithholding,
      box3_ss_wages: form.box3SocialSecurityWages,
      box4_ss_withheld: form.box4SocialSecurityWithholding,
      box5_medicare_wages: form.box5MedicareWages,
      box6_medicare_withheld: form.box6MedicareWithholding,
      box13_statutory_employee: form.statutoryEmployee,
      box15_state: form.state,
      box16_state_wages: form.stateWages,
      box17_state_withheld: form.stateIncomeTaxWithheld,
    })),
    f8812_credit_limit_worksheet: {
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
    },
    f1040es: {
      applied_from_prior_year: facts.estimatedTaxAppliedFrom2024,
      prior_year_applied_credit_review: {
        accepted_2024_return_reference:
          "ats-1040-02-assumed-accepted-2024-joint-return",
        irs_account_credit_record_reference:
          "ats-1040-02-assumed-2025-account-credit",
        applied_amount: facts.estimatedTaxAppliedFrom2024,
        joint_2024_former_spouse_ssn: facts.formerSpouseSsn,
      },
    },
    preparer: {
      name: facts.preparer.name,
      ptin: facts.preparer.ptin,
      self_employed: facts.preparer.selfEmployed,
      signature_date: facts.preparer.signatureDate,
      phone: facts.preparer.phone,
      firm_name: facts.preparer.firmName,
      firm_ein: facts.preparer.firmEin,
      firm_address_line1: facts.preparer.firmAddress.line1,
      firm_city: facts.preparer.firmAddress.city,
      firm_state: facts.preparer.firmAddress.state,
      firm_zip: facts.preparer.firmAddress.zip,
    },
    schedule_a: {
      // Page 8 marks line 18. This is a partial Schedule A until gifts reconcile.
      force_itemized: true,
      line_5b_real_estate_tax: facts.scheduleA.realEstateTax,
      line_8c_points_no_1098: facts.scheduleA.pointsNotReportedOn1098,
      cash_contributions_to_50_percent_organizations:
        facts.scheduleA.cashContributionLine11,
      line_11_qualified_contributions:
        facts.scheduleA.qualifiedCashContributionDottedLine,
    },
    f1098: [{
      ...mortgage,
      box1_current_year_deductible_interest:
        facts.scheduleA.mortgageInterestReportedOn1098,
      box1_deduction_workpaper_reference: "ats-1040-02-assumed-pub936-review",
    }],
    f8283: {
      section_a_items: [{
        donee_organization_name: facts.form8283.donee,
        donee_organization_us_address: facts.form8283.doneeAddress,
        date_acquired_various: true,
        donor_acquisition_description: facts.form8283.howAcquired,
        fmv_method: FMVMethod.ThriftShopValue,
        fmv_method_description: facts.form8283.fairMarketValueMethod,
        property_description: facts.form8283.propertyDescription,
        date_contributed: facts.form8283.donationDate,
        cost_or_adjusted_basis: facts.form8283.costBasis,
        fmv: facts.form8283.fairMarketValue,
        charitable_limit_category: "noncash_50",
        is_capital_gain_property: false,
      }],
    },
    schedule_c: [{
      business_reference: "ats-1040-02-statutory-business",
      proprietor_recipient: "T",
      line_a_principal_business: facts.scheduleC.businessDescription,
      line_b_business_code: facts.scheduleC.businessCode,
      line_e_business_address: facts.scheduleC.businessAddress,
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_i_made_1099_payments: false,
      statutory_employee: true,
      line_1_gross_receipts: facts.w2[0].box1Wages,
      line_8_advertising: facts.scheduleC.advertising,
      line_9_car_truck_expenses: facts.scheduleC.carAndTruckExpenses,
      line_19_pension_plans: facts.scheduleC.pensionAndProfitSharing,
      line_22_supplies: facts.scheduleC.supplies,
      line_23_taxes_licenses: facts.scheduleC.taxesAndLicenses,
      line_44b_business_miles: facts.scheduleC.businessMiles,
      line_44c_commuting_miles: facts.scheduleC.commutingMiles,
      line_44d_other_miles: facts.scheduleC.otherMiles,
      line_43_date_in_service: facts.scheduleC.vehiclePlacedInService,
      line_45_personal_use: facts.scheduleC.vehicleAvailableForPersonalUse,
      line_46_another_vehicle: facts.scheduleC.anotherVehicleAvailable,
      line_47a_evidence: facts.scheduleC.mileageEvidence,
      line_47b_written_evidence: facts.scheduleC.mileageEvidenceWritten,
    }],
  };
}

/** Statement the packet says to assume attached; its text is not printed. */
export async function scenario104002Attachments(): Promise<
  MefPdfAttachment[]
> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([612, 792]);
  [
    "Nonresident Spouse Choice Statement",
    "John Jones 400-00-1038 and Judy Jones 400-00-1071 choose under",
    "IRC section 6013(g) to treat Judy Jones as a U.S. resident for 2025.",
  ].forEach((line, index) =>
    page.drawText(line, { x: 72, y: 720 - index * 18, size: 11, font })
  );
  pdf.setCreationDate(new Date("2026-04-05T00:00:00Z"));
  pdf.setModificationDate(new Date("2026-04-05T00:00:00Z"));
  return [{
    fileName: "NonresidentSpouseChoiceStatement.pdf",
    description: "Nonresident Spouse Choice Statement",
    bytes: await pdf.save(),
  }];
}

export const SCENARIO_1040_02_ASSUMED = {
  lenderName: "ATS Assumed Mortgage Lender",
  inCareOfName: "John Jones",
} as const;

/** Facts a guard requires that the packet does not print. None changes tax. */
export const SCENARIO_1040_02_ASSUMPTIONS = [
  {
    field: "general.taxpayer_prior_year_agi, general.spouse_prior_year_agi",
    value: 0,
    why: "Packet prints no 2024 AGI.",
  },
  {
    field: "f1098[0] issuer Copy B",
    value:
      `lender "${SCENARIO_1040_02_ASSUMED.lenderName}", borrower John Jones, box 1 $11,000, synthetic Copy B bytes`,
    why:
      "Schedule A line 8a prints $11,000 as interest reported on Form 1098; the packet includes no Form 1098.",
  },
  {
    field: "f1098[0].box1_current_year_deductible_interest",
    value: 11_000,
    why: "Line 8a prints the full $11,000 as deductible.",
  },
  {
    field: "general.eic_tax_residency_review",
    value: "joint_new_election for the spouse, signed statement PDF generated",
    why:
      "Page 2 checks the nonresident-spouse election naming Judy Jones; page 1 says to assume the Nonresident Spouse Choice Statement is attached.",
  },
  {
    field: "general.surviving_spouse_joint_return_review",
    value: "no personal representative; surviving spouse signs",
    why:
      "Page 2 marks Deceased with the spouse's 09/11/2025 date and names no representative.",
  },
  {
    field: "general.address_in_care_of",
    value: SCENARIO_1040_02_ASSUMED.inCareOfName,
    why:
      "IND-019-02 requires an in-care-of name when SpouseDeathDt is filed; the packet prints none.",
  },
  {
    field: "f1040es.prior_year_applied_credit_review",
    value: "accepted 2024 joint return with the former spouse 400-00-1037",
    why:
      "Page 1 says the $300 was applied from the 2024 return; page 3 line 26 prints the former spouse SSN.",
  },
  {
    field:
      "general.taxpayer_tin_issued_by_due_date, spouse_tin_issued_by_due_date, dependents[0].tin_issued_by_due_date",
    value: true,
    why: "The packet prints each SSN; none is described as late.",
  },
  {
    field:
      "dependents[0].filed_joint_return_except_refund_only / provided_over_half_own_support / us_citizen_national_or_resident",
    value: "false / false / true",
    why:
      "Page 2 lists Jacob as a son who lived with the filer all year in the U.S.; a full-time high school student.",
  },
  {
    field: "f8812_credit_limit_worksheet",
    value: "all Schedule 3 credit lines 0",
    why: "The return has no Schedule 3.",
  },
  {
    field: "f8283 section A item category",
    value: "noncash_50 ordinary-income property",
    why:
      "Used clothes and toys given to Goodwill, a 50% organization; FMV $700 is below the $3,470 basis.",
  },
] as const;

export const SCENARIO_1040_02_RECONCILIATION = {
  statutoryW2Receipts: 29_513,
  regularW2Wages: 8_513,
  totalW2Withholding: 1_164,
  scheduleCExpenses: 2_534,
  scheduleCProfit: 26_979,
  scheduleA: {
    line5a: 1_028,
    line5b: 8_972,
    line8a: 11_000,
    line8c: 251,
    line11: 250,
    line11QualifiedContributions: 200,
    line12: 700,
    line17: 22_201,
  },
  form1040: {
    line9: 35_492,
    line11: 35_492,
    line12e: 22_201,
    line15: 13_291,
    // 2025 Tax Table, MFJ, $13,250-$13,300.
    line16: 1_328,
    line19: 500,
    line24: 828,
    line25d: 1_164,
    line26: 300,
    line33: 1_464,
    line34: 636,
  },
  missing: [
    "The printed 1040 leaves every result line and the dependent credit boxes blank. Jacob (19, full-time student, lived with the filer) is a qualifying child for the $500 credit for other dependents, which the return claims.",
    "Page 1 says the filers do not qualify for the QBI deduction as specified agricultural cooperative patrons; the return files no Form 8995, though a statutory employee's Schedule C profit is ordinarily QBI.",
    "The packet includes no Form 1098, nonresident-spouse statement text, 2024 return or payroll details; the fixture supplies the recorded assumptions.",
  ],
} as const;
