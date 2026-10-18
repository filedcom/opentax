/**
 * IRS TY2026 MeF ATS Form 1040 case inventory, from the draft packets dated
 * September 22, 2026 on the IRS TY2026 ATS page. As in TY2025, a case is
 * `partial-facts` when some source facts are transcribed and `inventory-only`
 * when only its forms are identified; neither means an accepted transmission.
 *
 * `ty2025Comparison` contrasts each packet with the TY2025 scenario of the
 * same number in `ty2025_cases.ts`. `inputs` are the public input keys the
 * packet's facts enter through.
 * `unsupportedFacts` have no input in any year, and `schemaGaps` have no
 * element in the IRS 2026v1.0 schema the engine targets.
 */

import type { AtsCase } from "./ty2025_cases.ts";

export type Ty2026AtsCase = AtsCase & {
  readonly sourceSha256: string;
  readonly pages: number;
  readonly taxpayer: string;
  readonly ty2025Comparison: string;
  readonly inputs: readonly string[];
  readonly unsupportedFacts: readonly string[];
  readonly schemaGaps: readonly string[];
};

export const TY2026_ATS_CASES: readonly Ty2026AtsCase[] = [
  {
    id: "1040-01",
    returnType: "1040",
    scenario: 1,
    sourceUrl:
      "https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-1-09222026.pdf",
    sourceSha256:
      "9c50096468515ff0e46698cf24c342cf68acdf59dca6cb884e01dfa1603cf5c4",
    pages: 11,
    taxpayer: "Sadie Long, 400-00-1032",
    forms: [
      "1040",
      "W-2",
      "W-2",
      "Schedule 2",
      "Schedule 3",
      "Schedule H",
      "5695",
    ],
    ty2025Comparison:
      "Same form list as TY2025 scenario 1, but Form 5695 is the four-line 2026 carryforward-only form ($200 TY2025 line 1 carryforward) instead of itemized door and air-conditioner credits, and the cover assumes Form 1062 and Form 1062 Schedule A (1040 line 24b prints $200).",
    inputs: ["general", "w2", "schedule_h", "f5695"],
    unsupportedFacts: [],
    schemaGaps: [
      "Form 1062 and its Schedule A (1040 line 24b, 24c; Schedule 3 line 13e)",
    ],
    capture: "partial-facts",
  },
  {
    id: "1040-02",
    returnType: "1040",
    scenario: 2,
    sourceUrl:
      "https://www.irs.gov/pub/irs-efile/1040-mef-ats-%20scenario-2-09222026.pdf",
    sourceSha256:
      "b2d58c490b489294cb80137c5755e28f2bba806aa9329248311b81e58d932915",
    pages: 13,
    taxpayer: "James and June Brown, 400-00-1038, married filing jointly",
    forms: [
      "1040",
      "W-2",
      "W-2",
      "Schedule 1",
      "Schedule A",
      "Schedule C",
      "8283",
    ],
    requiredBinaryAttachmentDescriptions: [],
    ty2025Comparison:
      "Same form list as TY2025 scenario 2, without its nonresident-spouse choice statement: both spouses are U.S. citizens. Adds a statutory-employee W-2 that belongs on Schedule C, pre-July 2026 mileage (72.5 cents), a $300 2025 overpayment applied to 2026, a 2010 dependent, the 1040 line 27c EIC opt-out, a spouse IP PIN and cooperative-patron status.",
    inputs: [
      "general",
      "w2",
      "schedule_c",
      "schedule_a",
      "f1098",
      "f8283",
      "f1040es",
      "f8812_credit_limit_worksheet",
      "f8812_earned_income_worksheet",
      "preparer",
    ],
    unsupportedFacts: [],
    schemaGaps: [
      "Business rule SA-F1040-018 (2026v1.0) requires Schedule A MortgageInsurancePremiumsAmt to be zero; page 8 line 8d prints $2,316, deductible for 2026 under IRC §163(h)(3)(E) as amended by P.L. 119-21 §70108",
    ],
    capture: "partial-facts",
  },
  {
    id: "1040-03",
    returnType: "1040",
    scenario: 3,
    sourceUrl:
      "https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-3-09222026.pdf",
    sourceSha256:
      "c52160656064f83aed27b72683d3247b654f3c81b30f02a4c50ac76041c1bc79",
    pages: 18,
    taxpayer: "Lynette Heather, 400-00-1035",
    forms: [
      "1040",
      "1099-R",
      "Schedule 1",
      "Schedule 2",
      "Schedule D",
      "Schedule E",
      "Schedule F",
      "Schedule SE",
      "4835",
    ],
    ty2025Comparison:
      "Same form list as TY2025 scenario 3. New facts: IP PIN 876534, taxable state refund $4,089, the Schedule SE farm optional method, specified-cooperative patron status, no income averaging and no QOF investment; the 2026 Schedule F, E and Form 4835 add vehicle-loan interest lines.",
    inputs: [
      "general",
      "f1099r",
      "f1099g",
      "f1099b",
      "schedule_d",
      "schedule_e",
      "schedule_f",
      "f4835",
    ],
    unsupportedFacts: [],
    schemaGaps: [],
    capture: "partial-facts",
  },
  {
    id: "1040-04",
    returnType: "1040",
    scenario: 4,
    sourceUrl:
      "https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-4-09222026.pdf",
    sourceSha256:
      "ae8c0996690b9dc0430f2ecb86a6cf6d5f907be18a80a4c17719ee597bb1599f",
    pages: 18,
    taxpayer: "Dani Lozano, 400-00-1039, head of household",
    forms: [
      "1040",
      "W-2",
      "Schedule 1",
      "Schedule 3",
      "Schedule 3-A",
      "2441",
      "8862",
      "8863",
      "Schedule EIC",
      "Schedule 8812",
    ],
    ty2025Comparison:
      "Not the TY2025 scenario 4 clean-vehicle and electricity-credit return (3800, 8835, 8936); it resembles TY2025 scenario 5 (HOH, 2441, 8862, 8863, EIC, 8812) plus the new Schedule 3-A, a blind taxpayer, $890 of adjusted education expenses and $1,325 of moving expenses.",
    inputs: [
      "general",
      "w2",
      "f2441",
      "f8862",
      "f8863",
      "f8812_credit_limit_worksheet",
      "f8812_earned_income_worksheet",
    ],
    unsupportedFacts: [],
    schemaGaps: [
      "Schedule 3-A (1040 line 32b)",
      "Form 2441 CareExpensesDecimalAmt enumerates 0.20-0.35; the 2026 credit rate for $35,545 of AGI is 39% (IRC §21(a)(2) as amended by P.L. 119-21 §70405)",
    ],
    capture: "partial-facts",
  },
  {
    id: "1040-05",
    returnType: "1040",
    scenario: 5,
    sourceUrl:
      "https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-5-09222026.pdf",
    sourceSha256:
      "fb94f6a34c6419243e2ca55a94e060a6664bc2730ebfc20cbaef1a893031b30b",
    pages: 5,
    taxpayer: "Sam Wheat, 400-00-1037, single",
    forms: ["1040", "W-2", "8888"],
    requiredBinaryAttachmentDescriptions: [],
    ty2025Comparison:
      "Not the TY2025 scenario 5 HOH credit return: a single-W-2 return whose refund is split on Form 8888, $1,000 to savings and the remainder to checking.",
    inputs: ["general", "w2", "f8888"],
    unsupportedFacts: [],
    schemaGaps: [],
    capture: "partial-facts",
  },
  {
    id: "1040-06",
    returnType: "1040",
    scenario: 6,
    sourceUrl:
      "https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-6-09222026.pdf",
    sourceSha256:
      "43e5eeb8eb511cab7eda09148c57df9cdc962b0dcdb88365236536a408ba01fa",
    pages: 10,
    taxpayer: "Jeremy Davidson, 400-00-1059, single, claimable dependent",
    forms: ["1040", "W-2", "W-2G", "Schedule 1", "Schedule E"],
    ty2025Comparison:
      "No TY2025 Form 1040 scenario 6 exists (TY2025 scenario 6 was a 1040-SS return). New: a dependent filer born 2008 with W-2 overtime (box 12 TT $200), W-2G slot winnings and a gambling partnership on Schedule E Part II.",
    inputs: ["general", "w2", "w2g", "k1_partnership"],
    unsupportedFacts: [
      "Schedule E Part II row A column (i) $1,000 nonpassive loss allowed (page 9): no input carries a K-1 loss to Part II without basis, at-risk and Form 8582 facts",
    ],
    schemaGaps: [],
    capture: "partial-facts",
  },
  {
    id: "1040-12",
    returnType: "1040",
    scenario: 12,
    sourceUrl:
      "https://www.irs.gov/pub/irs-efile/ty26-1040-ats-scenario-12.pdf",
    sourceSha256:
      "6d44ae53fe842b804258ca1a49400f0cc5d15a17b6fdb0cc74c016927b54c9bf",
    pages: 37,
    taxpayer: "Sam Gardenia, 400-00-1212",
    forms: [
      "1040",
      "Schedule 1",
      "Schedule 2",
      "Schedule 3",
      "Schedule C",
      "Schedule SE",
      "3800",
      "3800 Schedule A",
      "4562-B",
      "7205",
      "7207",
      "7220",
      "W-2",
    ],
    requiredBinaryAttachmentDescriptions: [
      "Schedule A Form 3800 signature",
      "Form 3800 Schedule A statement",
      "Form 7205 certification",
      "Form 7207 Designer Allocation",
    ],
    ty2025Comparison:
      "TY2025 scenario 12 was Schedule C/SE with Forms 7206 and 7217. TY2026 keeps Schedule C/SE and the W-2 but replaces 7206/7217 with a credit-transfer return: Forms 3800 and 3800 Schedule A, 4562-B, 7205, 7207, 7220 and four binary attachments.",
    inputs: ["general", "w2", "schedule_c"],
    unsupportedFacts: [
      "Forms 4562-B, 7205 and 7220: no input exists for any tax year",
      "Form 3800 Part III line 1b transferred Form 7207 credit and its Schedule A (pages 13-15, 35): Form 3800 carries section 6418 transfers only for Form 8835",
      "The four cover-listed binary attachments are not in the packet",
    ],
    schemaGaps: ["Form 4562-B", "Form 7220"],
    capture: "partial-facts",
  },
  {
    id: "1040-13",
    returnType: "1040",
    scenario: 13,
    sourceUrl:
      "https://www.irs.gov/pub/irs-efile/ty26-1040-ats-scenario-13.pdf",
    sourceSha256:
      "b5160868f1b46ad83a49c9018f5452f02b0cd3596c731ee359e958b916feafdd",
    pages: 30,
    taxpayer: "William and Nancy Birch, 400-00-1313",
    forms: [
      "1040",
      "Schedule 1",
      "Schedule 1-A",
      "Schedule 2",
      "Schedule 3",
      "Schedule F",
      "Schedule SE",
      "4136",
      "4136 Schedule A",
      "4136 Schedule A",
      "1062",
      "1062 Schedule A",
      "W-2",
    ],
    ty2025Comparison:
      "TY2025 scenario 13 was Schedule 3 with Forms 6251 and 8911. TY2026 is a farm return: Schedule F/SE, Schedule 1-A, Form 4136 with two Schedules A, and Form 1062 with its Schedule A.",
    inputs: ["general", "w2", "f1099div", "schedule_f", "schedule1a", "f4136"],
    unsupportedFacts: [
      "Form 1062 and its Schedule A (pages 28-29): no input carries a section 1062 qualified farmland sale or its net tax liability installment (Schedule 3 line 13z '1062NL')",
      "W-2 box 12 code TT qualified overtime (page 30) and Schedule 1-A Part III (page 7): the overtime deduction reads only the TY2025 box 14 statement route",
    ],
    schemaGaps: [
      "Form 1062 and its Schedule A; 1040 lines 24b, 24c and 32c (pages 3, 28-29)",
      "Schedule 1-A line 16a per-employer overtime rows (page 7)",
    ],
    capture: "partial-facts",
  },
  {
    id: "1040-14",
    returnType: "1040",
    scenario: 14,
    sourceUrl:
      "https://www.irs.gov/pub/irs-efile/ty26-1040-ats-scenario-14.pdf",
    sourceSha256:
      "56b3ee3429ee3c6adfa295514cec2134b106ff274171cbc5dd955ecb95167fd1",
    pages: 8,
    taxpayer: "John Rosen, 400-00-1414, single with two dependents",
    forms: ["1040", "Schedule 3-A", "Schedule EIC", "Schedule 8812", "W-2"],
    ty2025Comparison:
      "No TY2025 Form 1040 scenario 14 exists. A W-2 return claiming EIC and the child tax credit, which on the 2026 form brings in Schedule 3-A.",
    inputs: [
      "general",
      "w2",
      "f8812_credit_limit_worksheet",
      "f8812_earned_income_worksheet",
    ],
    unsupportedFacts: [],
    schemaGaps: [
      "Schedule 3-A (page 4); 1040 lines 11b, 24c, 32b and 32c (page 3)",
    ],
    capture: "partial-facts",
  },
];

/** Every printed fact of TY2026 1040 Scenario 5, by packet page. */
export const SCENARIO_1040_05_TY2026_FACTS = {
  taxYear: 2026,
  // Page 1 (cover).
  taxpayer: {
    firstName: "Sam",
    lastName: "Wheat",
    ssn: "400001037",
    dateOfBirth: "1986-02-07",
    usCitizen: true,
    // Page 2.
    filingStatus: "single",
    digitalAssets: false,
    address: {
      line1: "2525 Main Street",
      city: "Round Rock",
      state: "TX",
      zip: "78680",
    },
  },
  refundInstruction: { savingsAmount: 1_000, remainderTo: "checking" },
  // Pages 2-3: every Form 1040 amount line is blank; the line 35a Form 8888
  // box is unchecked although the form is attached.
  printedForm1040AmountsBlank: true,
  // Page 4.
  w2: {
    employerName: "Doughnut Castle",
    employerEin: "000000057",
    employerAddress: {
      line1: "1518 North Mays Lane",
      city: "Round Rock",
      state: "TX",
      zip: "78664",
    },
    employeeSsn: "400001037",
    box1Wages: 50_510,
    box2FederalWithholding: 10_268,
    box3SocialSecurityWages: 50_510,
    box4SocialSecurityWithholding: 3_132,
    box5MedicareWages: 50_510,
    box6MedicareWithholding: 732,
  },
  // Page 5: Form 8888 (Rev. December 2026); lines 1a, 2a and 5 are blank.
  form8888: {
    first: {
      routingNumber: "012345672",
      accountNumber: "12345678",
      accountType: "checking",
    },
    second: {
      routingNumber: "012345672",
      accountNumber: "1234567",
      accountType: "savings",
    },
    thirdAccountBlank: true,
  },
} as const;

/**
 * Elements the IRS public TY2026 stylesheets (2026-07-29) render that the
 * 2026v1.0 schema lacks. The export stays valid against 2026v1.0 and emits
 * none of them; each is an assumption until a later 2026 schema is held.
 */
export const TY2026_SCHEMA_GAPS: readonly {
  readonly stylesheet: string;
  readonly elements: readonly string[];
  readonly assumption: string;
}[] = [
  {
    stylesheet: "IRS1040Schedule1A.xsl",
    elements: [
      "QualifiedTipsEmployeeGrp",
      "QualifiedTipsTradeOrBusGrp",
      "QualifiedOvertimeWagesGrp",
      "QualifiedOvertimeForm1099Grp",
      "NoTaxCarLoanInterestGrp",
      "OriginalUseStartedWithFilerInd",
      "VehicleFinalAssemblyInUSInd",
    ],
    assumption:
      "Schedule 1-A tips, overtime and car-loan interest are regrouped; TY2026 files them in the 2025-layout elements 2026v1.0 holds and omits the per-employer rows.",
  },
  {
    stylesheet: "IRS1040.xsl",
    elements: [
      "FiledPursuantToSect30191002Cd",
      "FirstInstallmentSect1062TaxAmt",
      "TotalTaxAfter1062TaxAmt",
    ],
    assumption:
      "Form 1062 farmland installment lines (1040 line 24b) are not emitted; no supported TY2026 input produces them.",
  },
  {
    stylesheet: "IRS1040Schedule3.xsl",
    elements: ["TotalLiabilitySect1062TaxAmt"],
    assumption: "Schedule 3 Form 1062 liability is not emitted.",
  },
  {
    stylesheet: "IRS1040ScheduleA.xsl",
    elements: ["ItemizedDeductionsLimitedInd"],
    assumption:
      "Schedule A is not available for TY2026, so the itemized-deduction limitation indicator is never needed.",
  },
  {
    stylesheet: "IRS1040Schedule3A.xsl",
    elements: [
      "FederalPublicBenefitInd",
      "FederalPublicBenefitAmt",
      "FederalPublicBenefitLimitAmt",
      "ReceiveFederalPublicBenefitInd",
      "RfdblCrSubjToPRWORAAmt",
      "USCtznUSNatlQlfyAlienInd",
      "USCtznUSNatlQlfyAlienAmt",
    ],
    assumption:
      "Schedule 3-A (refundable credits subject to PRWORA) is not emitted, so an EIC or ACTC return exports without it (ATS scenario 14).",
  },
];
