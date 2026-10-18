import { FilingStatus } from "../../nodes/types.ts";
import { Box12Code } from "../../nodes/inputs/income/wages/w2/index.ts";
import type { Ty2026PacketTarget } from "./ty2026-ats.ts";
import type { W2Target } from "./ty2025-w2-value-coverage.ts";

/**
 * TY2026 Form 1040 ATS Scenario 6 (10 pages, draft 9/22/2026): page 1 cover,
 * 2-3 Form 1040, 4 W-2, 5 W-2G, 6-7 Schedule 1 (blank), 8-10 Schedule E
 * (page 9 Part II is the only filled page).
 * https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-6-09222026.pdf
 */
const PACKET = "irs-ty2026-ats-1040-06";

export const SCENARIO_1040_06_TY2026_FACTS = {
  // Page 1 cover and page 2.
  taxpayer: {
    firstName: "Jeremy",
    lastName: "Davidson",
    ssn: "400001059",
    dateOfBirth: "2008-01-20",
    address: {
      line1: "4703 Bucks Run",
      city: "Riverton",
      state: "WY",
      zip: "82501",
    },
    // Page 2: single, digital assets No; page 3 line 12a "You as a dependent".
    digitalAssets: false,
    claimableAsDependent: true,
  },
  // Page 4. Boxes 3 and 5 are blank although boxes 4 and 6 print tax.
  w2: {
    employerName: "Nona's Italian Kitchen",
    employerEin: "000000012",
    employerAddress: {
      line1: "3300 Fox Trail",
      city: "Riverton",
      state: "WY",
      zip: "82501",
    },
    employeeSsn: "400001059",
    box1Wages: 2_300,
    box2FederalWithholding: 985,
    box4SocialSecurityWithholding: 143,
    box6MedicareWithholding: 33,
    box12aCode: "TT",
    box12aAmount: 200,
    box14bTippedOccupationCode: "102",
  },
  // Page 5 (Form W-2G, Rev. January 2026).
  w2g: {
    payerName: "Lucky Bear Casino",
    payerTin: "000000013",
    payerAddress: {
      line1: "870 Winners Road",
      city: "Riverton",
      state: "WY",
      zip: "82501",
    },
    box1Winnings: 2_200,
    box2DateWon: "2026-02-15",
    box3TypeOfWager: "Slot Machines",
    box4FederalWithholding: 0,
    box5Transaction: "8888888",
    winnerTin: "400001059",
  },
  // Page 9: line 26 prints $0, line 27 "No"; Part II row A.
  scheduleE: {
    line26: 0,
    partnershipName: "Davidson and Davidson",
    partnershipEin: "000000022",
    nonpassiveLossAllowed: 1_000,
    nonpassiveIncome: 2_200,
  },
} as const;

const F = SCENARIO_1040_06_TY2026_FACTS;

/** Facts a guard requires that the packet does not print. None changes tax. */
export const SCENARIO_1040_06_TY2026_ASSUMPTIONS = [
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
    field: "k1_partnership[0] issued K-1, activity statement and participation",
    value:
      `box 1 $${F.scheduleE.nonpassiveIncome} nonpassive; references name page 9`,
    why:
      "Schedule E page 9 prints the row; the packet includes no Schedule K-1. Page 1 says the partnership is in the trade or business of gambling, so the income is nonpassive (column k).",
  },
  {
    field: "w2[0].box3_ss_wages, box5_medicare_wages",
    value: F.w2.box1Wages,
    why:
      "Page 4 leaves boxes 3 and 5 blank but prints box 4 $143 (6.2% of $2,300) and box 6 $33 (1.45% of $2,300); the withholding guard needs the wages it was figured on. Neither box changes income tax.",
  },
  {
    field: "general.dependent_earned_income",
    value: F.w2.box1Wages,
    why:
      "Standard Deduction Worksheet for Dependents line 1: the W-2 wages. The packet gives no K-1 box 14 self-employment earnings and lists no Schedule SE, so the partnership income is not counted as earned.",
  },
  {
    field: "w2g[0].source_document_reference",
    value: `${PACKET}-w2g-page-5`,
    why: "The issued-copy reference names the packet page of the W-2G.",
  },
] as const;

export const SCENARIO_1040_06_TY2026_RECONCILIATION = {
  conflicts: [],
  blockers: [
    "Schedule E page 9 row A prints both a $1,000 nonpassive loss allowed (column i) and $2,200 of nonpassive income (column k). The engine routes only K-1 income to Schedule E Part II; a K-1 loss needs basis, at-risk and Form 8582 allocations the packet does not give, so column (i) is not produced and AGI omits the loss.",
  ],
  notes: [
    "W-2 page 4 leaves boxes 3 and 5 blank while box 4 prints $143 (6.2% of $2,300) and box 6 $33 (1.45%); the fixture fills both with $2,300 as a recorded assumption.",
    "W-2 box 12 code TT reports $200 of qualified overtime, but the cover lists no Schedule 1-A and page 3 line 13a is blank; the return claims no overtime deduction.",
  ],
} as const;

const value = (
  page: number,
  line: string,
  path: string | null,
  expected: number | string,
): Ty2026PacketTarget => ({ page, line, path, expected });

/** Every amount the packet prints, by the MeF element that carries it. */
export const SCENARIO_1040_06_TY2026_TARGETS: readonly Ty2026PacketTarget[] = [
  value(4, "W-2 box 12a code", "IRSW2/EmployersUseGrp/EmployersUseCd", "TT"),
  value(4, "W-2 box 12a", "IRSW2/EmployersUseGrp/EmployersUseAmt", 200),
  value(
    4,
    "W-2 box 14b",
    "IRSW2/TreasuryTippedOccupationCd",
    F.w2.box14bTippedOccupationCode,
  ),
  // A W-2G without withholding is not transmitted (Form 1040 instructions,
  // line 25c); its winnings reach Schedule 1 line 8b.
  value(
    5,
    "W-2G box 1 (Schedule 1 line 8b)",
    "IRS1040Schedule1/GamblingReportableWinningAmt",
    F.w2g.box1Winnings,
  ),
  value(
    5,
    "W-2G box 4 (1040 line 25b)",
    "IRS1040/Form1099WithheldTaxAmt",
    F.w2g.box4FederalWithholding,
  ),
  value(9, "Schedule E line 26", "IRS1040ScheduleE/TotalRentalRealEstateIncomeAmt", F.scheduleE.line26),
  value(
    9,
    "Schedule E line 28A(d)",
    "IRS1040ScheduleE/PartnershipOrSCorpGroup/PartnershipOrSCorpEIN",
    F.scheduleE.partnershipEin,
  ),
  value(
    9,
    "Schedule E line 28A(i)",
    "IRS1040ScheduleE/PartnershipOrSCorpGroup/NonpassiveLossAmt",
    F.scheduleE.nonpassiveLossAllowed,
  ),
  value(
    9,
    "Schedule E line 28A(k)",
    "IRS1040ScheduleE/PartnershipOrSCorpGroup/NonpassiveIncomeAmt",
    F.scheduleE.nonpassiveIncome,
  ),
];

export const SCENARIO_1040_06_TY2026_W2_TARGETS: readonly W2Target[] = [{
  sourcePage: 4,
  employerName: F.w2.employerName,
  fields: {
    EmployeeSSN: F.w2.employeeSsn,
    EmployerEIN: F.w2.employerEin,
    WagesAmt: F.w2.box1Wages,
    WithholdingAmt: F.w2.box2FederalWithholding,
    SocialSecurityTaxAmt: F.w2.box4SocialSecurityWithholding,
    MedicareTaxWithheldAmt: F.w2.box6MedicareWithholding,
    StatutoryEmployeeInd: false,
    RetirementPlanInd: false,
  },
}];

/** Official IRS TY2026 1040 ATS Scenario 6 packet (draft, 9/22/2026). */
export function ty2026Scenario104006Input(): Record<string, unknown> {
  const { taxpayer, w2, w2g, scheduleE } = F;
  return {
    general: {
      ats_test_submission: true,
      filing_status: FilingStatus.Single,
      digital_assets: taxpayer.digitalAssets,
      taxpayer_first_name: taxpayer.firstName,
      taxpayer_last_name: taxpayer.lastName,
      taxpayer_ssn: taxpayer.ssn,
      taxpayer_dob: taxpayer.dateOfBirth,
      taxpayer_can_be_claimed_as_dependent: taxpayer.claimableAsDependent,
      dependent_earned_income: w2.box1Wages,
      taxpayer_prior_year_agi: 0,
      address_line1: taxpayer.address.line1,
      address_city: taxpayer.address.city,
      address_state: taxpayer.address.state,
      address_zip: taxpayer.address.zip,
    },
    w2: [{
      source_document_reference: `${PACKET}-w2-page-4`,
      employer_name: w2.employerName,
      employer_ein: w2.employerEin,
      employee_ssn: w2.employeeSsn,
      employer_address_line1: w2.employerAddress.line1,
      employer_address_city: w2.employerAddress.city,
      employer_address_state: w2.employerAddress.state,
      employer_address_zip: w2.employerAddress.zip,
      box1_wages: w2.box1Wages,
      box2_fed_withheld: w2.box2FederalWithholding,
      box3_ss_wages: w2.box1Wages,
      box4_ss_withheld: w2.box4SocialSecurityWithholding,
      box5_medicare_wages: w2.box1Wages,
      box6_medicare_withheld: w2.box6MedicareWithholding,
      box12_entries: [{ code: Box12Code.TT, amount: w2.box12aAmount }],
      box14b_tipped_code: w2.box14bTippedOccupationCode,
    }],
    w2g: [{
      calendar_year: 2026,
      source_document_reference: `${PACKET}-w2g-page-5`,
      payer_name: w2g.payerName,
      payer_ein: w2g.payerTin,
      payer_us_address: {
        line1: w2g.payerAddress.line1,
        city: w2g.payerAddress.city,
        state: w2g.payerAddress.state,
        zip: w2g.payerAddress.zip,
      },
      winner_name: `${taxpayer.firstName} ${taxpayer.lastName}`,
      winner_us_address: taxpayer.address,
      box1_winnings: w2g.box1Winnings,
      box2_date_won: w2g.box2DateWon,
      box3_type_of_wager: w2g.box3TypeOfWager,
      box4_federal_withheld: w2g.box4FederalWithholding,
      box5_transaction: w2g.box5Transaction,
      box9_winner_tin: w2g.winnerTin,
    }],
    k1_partnership: [{
      partnership_name: scheduleE.partnershipName,
      partnership_ein: scheduleE.partnershipEin,
      source_document_reference: `${PACKET}-schedule-e-page-9`,
      recipient_tin: taxpayer.ssn,
      box1_ordinary_business: scheduleE.nonpassiveIncome,
      eic_passive_activity_review: {
        box1: "nonpassive",
        recipient_tin: taxpayer.ssn,
        partnership_not_publicly_traded_verified: true,
        activity_statement_reference: `${PACKET}-cover-gambling-partnership`,
        participation_workpaper_reference: `${PACKET}-schedule-e-page-9`,
      },
    }],
  };
}
