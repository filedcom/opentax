import { FilingStatus } from "../../nodes/types.ts";
import type { Ty2026PacketTarget } from "./ty2026-ats.ts";
import type { W2Target } from "./ty2025-w2-value-coverage.ts";

/**
 * TY2026 Form 1040 ATS Scenario 1 (11 pages): page 1 cover, 2-3 Form 1040,
 * 4-5 W-2s, 6-7 Schedule 2, 8 Schedule 3, 9-10 Schedule H, 11 Form 5695.
 * https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-1-09222026.pdf
 */
const PACKET = "irs-ty2026-ats-1040-01";

export const SCENARIO_1040_01_TY2026_FACTS = {
  // Page 2.
  taxpayer: {
    firstName: "Sadie",
    lastName: "Long",
    ssn: "400001032",
    address: {
      line1: "1600 Pitts Avenue",
      city: "Burlington",
      state: "VT",
      zip: "05401",
    },
    filingStatus: "single",
    digitalAssets: false,
  },
  // Page 1 cover.
  form5695Line1CarryforwardFrom2025: 200,
  // Page 3: the only amount printed on Form 1040.
  form1040Line24bForm1062: 200,
  // Pages 4 and 5; both print EIN 00-0000007 and VT state ID 00-0000008.
  w2: [
    {
      page: 4,
      employerName: "Garden Path",
      employerEin: "000000007",
      employerAddress: {
        line1: "102 Logan Street",
        city: "Burlington",
        state: "VT",
        zip: "05401",
      },
      employeeSsn: "400001032",
      box1Wages: 30_000,
      box2FederalWithholding: 1_650,
      box3SocialSecurityWages: 30_000,
      box4SocialSecurityWithholding: 1_860,
      box5MedicareWages: 30_000,
      box6MedicareWithholding: 435,
      box16StateWages: 30_000,
      box17StateIncomeTax: 450,
    },
    {
      page: 5,
      employerName: "Dobbin's Hardware",
      employerEin: "000000007",
      employerAddress: {
        line1: "1255 6th Ave",
        city: "Burlington",
        state: "VT",
        zip: "05401",
      },
      employeeSsn: "400001032",
      box1Wages: 18_100,
      box2FederalWithholding: 2_400,
      box3SocialSecurityWages: 18_100,
      box4SocialSecurityWithholding: 1_122,
      box5MedicareWages: 18_100,
      box6MedicareWithholding: 262,
      box16StateWages: 18_100,
      box17StateIncomeTax: 305,
    },
  ],
  // Page 9: line A Yes; line B and C unanswered; line 9 "No. Stop".
  scheduleH: {
    employerEin: "000000029",
    lineACashWagesOverLimit: true,
    line9QuarterOver1000: false,
    line1SocialSecurityWages: 4_100,
    line3MedicareWages: 4_100,
    line5AdditionalMedicareWages: 0,
    line6AdditionalMedicareWithholding: 0,
    line7FederalWithholding: 0,
  },
} as const;

const H = SCENARIO_1040_01_TY2026_FACTS.scheduleH;
const EVEN_QUARTER = H.line1SocialSecurityWages / 4;

/** Facts a guard requires that the packet does not print. None changes tax. */
export const SCENARIO_1040_01_TY2026_ASSUMPTIONS = [
  {
    field: "general.taxpayer_dob",
    value: "1985-04-15",
    why:
      "The packet prints no birth date; line 12d 'born before January 2, 1962' is unchecked. Same date as the TY2025 scenario 1 fixture.",
  },
  {
    field: "general.taxpayer_prior_year_agi",
    value: 0,
    why: "The packet gives no 2025 AGI for the Self-Select PIN signature.",
  },
  {
    field: "general.ats_test_submission",
    value: true,
    why: "Marks the ATS test return so the 00 SSN and EIN test prefixes apply.",
  },
  {
    field: "w2[i].source_document_reference",
    value: `${PACKET}-w2-page-4, ${PACKET}-w2-page-5`,
    why: "Both W-2s print the same EIN; the page references keep them apart.",
  },
  {
    field: "schedule_h.fica_only_payroll.employee_wages[0]",
    value:
      `one unrelated adult employee, $${H.line1SocialSecurityWages} cash wages paid $${EVEN_QUARTER} per quarter, no Form W-4 withholding`,
    why:
      "Schedule H prints only the line 1 and 3 aggregates; the export guard needs the employee payroll behind them. Any split of $4,100 over four quarters has a quarter of $1,000 or more (see the reconciliation).",
  },
  {
    field: "schedule_h.fica_only_payroll.prior_year_quarter_cash_wages",
    value: [0, 0, 0, 0],
    why: "Line 9 'No' means no 2025 quarter reached $1,000.",
  },
  {
    field: "f5695.part_i_tax_limit",
    value: 3_595,
    why:
      "Residential Clean Energy Credit Limit Worksheet: 1040 line 18 less no credits. $48,100 wages less the $16,100 standard deduction is $32,000; the 2026 Tax Table row midpoint gives $1,240 + 12% x ($32,025 - $12,400) = $3,595 (Rev. Proc. 2025-32 §§4.01, 4.14). Any limit of $200 or more allows the whole carryforward.",
  },
] as const;

export const SCENARIO_1040_01_TY2026_RECONCILIATION = {
  conflicts: [],
  blockers: [
    "Schedule H page 9 prints $4,100 of 2026 cash wages on lines 1 and 3 with line 9 'No' (no 2025 or 2026 calendar quarter with $1,000 or more of cash wages). Four quarters below $1,000 total at most $3,999.96, so the page contradicts itself: line 9 'Yes' needs Part II FUTA facts the packet omits. The FICA-only export guard refuses the return as printed.",
    "Form 1040 page 3 line 24b prints $200 from Form 1062 (cover: 'Assume Form 1062 and Form 1062 Schedule A are attached'); the 2026v1.0 schema has no Form 1062 or line 24b element and no input carries Form 1062.",
  ],
} as const;

/** Every amount the packet prints, by the MeF element that carries it; null has no 2026v1.0 element. */
export const SCENARIO_1040_01_TY2026_TARGETS: readonly Ty2026PacketTarget[] = [
  {
    page: 3,
    line: "1040 line 24b",
    path: null,
    expected: SCENARIO_1040_01_TY2026_FACTS.form1040Line24bForm1062,
  },
  ...([
    ["EIN", "EmployerEIN", H.employerEin],
    ["line 1", "SocialSecurityTaxCashWagesAmt", H.line1SocialSecurityWages],
    ["line 3", "MedicareTaxCashWagesAmt", H.line3MedicareWages],
    ["line 5", "TotMedcrTaxCashWagesAddnlWhAmt", H.line5AdditionalMedicareWages],
    [
      "line 6",
      "AddnlMedicareTaxWithholdingAmt",
      H.line6AdditionalMedicareWithholding,
    ],
    ["line 7", "FederalIncomeTaxWithheldAmt", H.line7FederalWithholding],
  ] as const).map(([line, element, expected]) => ({
    page: 9,
    line: `Schedule H ${line}`,
    path: `IRS1040ScheduleH/${element}`,
    expected,
  })),
];

export const SCENARIO_1040_01_TY2026_W2_TARGETS: readonly W2Target[] =
  SCENARIO_1040_01_TY2026_FACTS.w2.map((w2) => ({
    sourcePage: w2.page,
    employerName: w2.employerName,
    fields: {
      EmployeeSSN: w2.employeeSsn,
      EmployerEIN: w2.employerEin,
      WagesAmt: w2.box1Wages,
      WithholdingAmt: w2.box2FederalWithholding,
      SocialSecurityWagesAmt: w2.box3SocialSecurityWages,
      SocialSecurityTaxAmt: w2.box4SocialSecurityWithholding,
      MedicareWagesAndTipsAmt: w2.box5MedicareWages,
      MedicareTaxWithheldAmt: w2.box6MedicareWithholding,
      StatutoryEmployeeInd: false,
      RetirementPlanInd: false,
    },
  }));

/** Official IRS TY2026 1040 ATS Scenario 1 packet (draft, 9/22/2026). */
export function ty2026Scenario104001Input(): Record<string, unknown> {
  const { taxpayer, w2 } = SCENARIO_1040_01_TY2026_FACTS;
  return {
    general: {
      ats_test_submission: true,
      filing_status: FilingStatus.Single,
      taxpayer_first_name: taxpayer.firstName,
      taxpayer_last_name: taxpayer.lastName,
      taxpayer_ssn: taxpayer.ssn,
      taxpayer_dob: SCENARIO_1040_01_TY2026_ASSUMPTIONS[0].value,
      taxpayer_prior_year_agi: SCENARIO_1040_01_TY2026_ASSUMPTIONS[1].value,
      address_line1: taxpayer.address.line1,
      address_city: taxpayer.address.city,
      address_state: taxpayer.address.state,
      address_zip: taxpayer.address.zip,
      digital_assets: taxpayer.digitalAssets,
    },
    w2: w2.map((form) => ({
      source_document_reference: `${PACKET}-w2-page-${form.page}`,
      employer_name: form.employerName,
      employer_ein: form.employerEin,
      employee_ssn: form.employeeSsn,
      employer_address_line1: form.employerAddress.line1,
      employer_address_city: form.employerAddress.city,
      employer_address_state: form.employerAddress.state,
      employer_address_zip: form.employerAddress.zip,
      box1_wages: form.box1Wages,
      box2_fed_withheld: form.box2FederalWithholding,
      box3_ss_wages: form.box3SocialSecurityWages,
      box4_ss_withheld: form.box4SocialSecurityWithholding,
      box5_medicare_wages: form.box5MedicareWages,
      box6_medicare_withheld: form.box6MedicareWithholding,
      box15_state: form.employerAddress.state,
      box16_state_wages: form.box16StateWages,
      box17_state_withheld: form.box17StateIncomeTax,
    })),
    schedule_h: {
      employer_ein: H.employerEin,
      cash_wages_over_2025_limit: H.lineACashWagesOverLimit,
      cash_wages_over_quarter_limit: H.line9QuarterOver1000,
      ss_wages: H.line1SocialSecurityWages,
      medicare_wages: H.line3MedicareWages,
      additional_medicare_wages: H.line5AdditionalMedicareWages,
      federal_income_tax_withheld: H.line7FederalWithholding,
      fica_only_payroll: {
        all_household_employees_included: true,
        prior_year_payroll_source_reference: `${PACKET}-assumed-2025-payroll`,
        prior_year_quarter_cash_wages:
          SCENARIO_1040_01_TY2026_ASSUMPTIONS[5].value,
        employee_wages: [{
          employee_id: `${PACKET}-household-employee-1`,
          payroll_source_reference: `${PACKET}-assumed-2026-payroll`,
          relationship: "unrelated",
          age_18_or_older_for_fica: true,
          ordinary_cash_only: true,
          annual_cash_wages: H.line1SocialSecurityWages,
          quarterly_cash_wages: [
            EVEN_QUARTER,
            EVEN_QUARTER,
            EVEN_QUARTER,
            EVEN_QUARTER,
          ],
          w2: {
            source_reference: `${PACKET}-assumed-household-w2`,
            box2_federal_income_tax_withheld: H.line7FederalWithholding,
            box3_social_security_wages: H.line1SocialSecurityWages,
            box5_medicare_wages: H.line3MedicareWages,
          },
        }],
      },
    },
    f5695: {
      prior_year_carryforward:
        SCENARIO_1040_01_TY2026_FACTS.form5695Line1CarryforwardFrom2025,
      part_i_tax_limit: SCENARIO_1040_01_TY2026_ASSUMPTIONS[6].value,
    },
  };
}
