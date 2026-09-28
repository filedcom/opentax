/**
 * IRS TY2025 MeF ATS case inventory.
 *
 * These are source-case definitions, not accepted transmissions. A case is
 * `partial-facts` when some source facts below have been transcribed from the
 * linked IRS PDF. `inventory-only` means only the forms have been identified.
 * Neither status represents a complete return or an accepted transmission.
 */

export type AtsCase = {
  readonly id: string;
  readonly returnType: "1040" | "1040-NR" | "1040-SS" | "4868";
  readonly scenario: number;
  readonly sourceUrl: string;
  readonly forms: readonly string[];
  readonly capture: "inventory-only" | "partial-facts";
};

export const TY2025_ATS_CASES: readonly AtsCase[] = [
  {
    id: "1040-01",
    returnType: "1040",
    scenario: 1,
    sourceUrl:
      "https://www.irs.gov/pub/irs-efile/ty25-1040-mef-ats-scenario-1-12012025.pdf",
    forms: [
      "1040",
      "W-2",
      "W-2",
      "Schedule 2",
      "Schedule 3",
      "Schedule H",
      "5695",
    ],
    capture: "partial-facts",
  },
  {
    id: "1040-02",
    returnType: "1040",
    scenario: 2,
    sourceUrl:
      "https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-2-12012025.pdf",
    forms: [
      "1040",
      "W-2",
      "W-2",
      "Schedule 1",
      "Schedule A",
      "Schedule C",
      "8283",
    ],
    capture: "partial-facts",
  },
  {
    id: "1040-03",
    returnType: "1040",
    scenario: 3,
    sourceUrl:
      "https://www.irs.gov/pub/irs-efile/ty25-1040-mef-ats-scenario-3-10202025.pdf",
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
    capture: "partial-facts",
  },
  {
    id: "1040-04",
    returnType: "1040",
    scenario: 4,
    sourceUrl:
      "https://www.irs.gov/pub/irs-efile/ty25-1040-mef-ats-scenario-4-10212025.pdf",
    forms: [
      "1040",
      "W-2",
      "Schedule 3",
      "3800",
      "8835",
      "8936",
      "8936 Schedule A",
    ],
    capture: "partial-facts",
  },
  {
    id: "1040-05",
    returnType: "1040",
    scenario: 5,
    sourceUrl:
      "https://www.irs.gov/pub/irs-efile/ty25-1040-mef-ats-scenario-5-10202025.pdf",
    forms: [
      "1040",
      "W-2",
      "Schedule 1",
      "Schedule 3",
      "2441",
      "8862",
      "8863",
      "Schedule EIC",
      "Schedule 8812",
    ],
    capture: "partial-facts",
  },
  {
    id: "1040-08",
    returnType: "1040",
    scenario: 8,
    sourceUrl:
      "https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-8-10212025.pdf",
    forms: ["1040", "1099-R", "1099-R"],
    capture: "partial-facts",
  },
  {
    id: "1040-12",
    returnType: "1040",
    scenario: 12,
    sourceUrl:
      "https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-12-10292025.pdf",
    forms: [
      "1040",
      "Schedule 1",
      "Schedule 2",
      "Schedule C",
      "Schedule SE",
      "7206",
      "7217",
      "W-2",
    ],
    capture: "partial-facts",
  },
  {
    id: "1040-13",
    returnType: "1040",
    scenario: 13,
    sourceUrl: "https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-13.pdf",
    forms: ["1040", "Schedule 3", "6251", "8911", "8911 Schedule A", "W-2"],
    capture: "partial-facts",
  },
  {
    id: "1040-NR-01",
    returnType: "1040-NR",
    scenario: 1,
    sourceUrl:
      "https://www.irs.gov/pub/irs-efile/ty25-1040-nr-mef-ats-scenario-1-10202025.pdf",
    forms: [
      "1040-NR",
      "W-2",
      "W-2",
      "Schedule 1",
      "Schedule 2",
      "Schedule C",
      "Schedule SE",
      "5329",
    ],
    capture: "partial-facts",
  },
  {
    id: "1040-NR-02",
    returnType: "1040-NR",
    scenario: 2,
    sourceUrl:
      "https://www.irs.gov/pub/irs-efile/ty25-form-1040-nr-mef-ats-scenario-2-10202025.pdf",
    forms: [
      "1040-NR",
      "W-2",
      "1040-NR Schedule NEC",
      "1040-NR Schedule OI",
      "Schedule 1",
      "Schedule E",
    ],
    capture: "partial-facts",
  },
  {
    id: "1040-NR-03",
    returnType: "1040-NR",
    scenario: 3,
    sourceUrl:
      "https://www.irs.gov/pub/irs-efile/ty25-1040-nr-mef-ats-scenario-3-12012025.pdf",
    forms: ["1040-NR", "W-2", "1040-NR Schedule A", "8283", "8888"],
    capture: "partial-facts",
  },
  {
    id: "1040-NR-04",
    returnType: "1040-NR",
    scenario: 4,
    sourceUrl:
      "https://www.irs.gov/pub/irs-efile/ty25-1040-nr-mef-ats-scenario-4-10212025.pdf",
    forms: [
      "1040-NR",
      "W-2",
      "Schedule 2",
      "Schedule 3",
      "3800",
      "8835",
      "8936",
      "8936 Schedule A",
    ],
    capture: "partial-facts",
  },
  {
    id: "1040-NR-12",
    returnType: "1040-NR",
    scenario: 12,
    sourceUrl:
      "https://www.irs.gov/pub/irs-efile/ty2025-form-1040-nr-scenario-12.pdf",
    forms: [
      "1040-NR",
      "1040-NR Schedule A",
      "1040-NR Schedule P",
      "Schedule D",
      "8949",
    ],
    capture: "partial-facts",
  },
  {
    id: "1040-SS-06",
    returnType: "1040-SS",
    scenario: 6,
    sourceUrl:
      "https://www.irs.gov/pub/irs-efile/1040ss-mef-ats-scenario-6-10202025.pdf",
    forms: ["1040-SS", "499R-2/W-2PR", "Schedule C", "Schedule SE"],
    capture: "partial-facts",
  },
  {
    id: "4868-07",
    returnType: "4868",
    scenario: 7,
    sourceUrl:
      "https://www.irs.gov/pub/irs-efile/1040_mef_ats_scenario_7_09152025.pdf",
    forms: ["4868"],
    capture: "partial-facts",
  },
];

/** Selected printed and cover-sheet entries from 1040-NR Scenario 4. */
export const SCENARIO_1040_NR_04_FACTS = {
  taxYear: 2025,
  taxpayer: {
    firstName: "Isaac",
    lastName: "Hill",
    ssn: "123005555",
    filingStatus: "qualifying-surviving-spouse",
    spouseDeathDatePrinted: "2024-02-18",
    federalDisasterMarked: true,
    digitalAssets: false,
    address: {
      line1: "123 Sukhumvit Road",
      city: "Khlong Toei",
      province: "Bangkok",
      country: "Thailand",
      postalCode: "10110",
    },
  },
  priorYear: { filingStatus: "single", modifiedAdjustedGrossIncome: 47_511 },
  printedForm1040NR: {
    line4aIraDistribution: 6_200,
    line4bTaxableIraDistribution: 3_200,
  },
  w2: {
    employeeFirstNamePrinted: "Issac",
    employerName: "Pink Paradise LLC",
    employerEin: "005559992",
    box1Wages: 53_792,
    box2FederalWithholding: 8_493,
  },
  form8936ScheduleA: {
    vehicleYear: 2024,
    vehicleMake: "GMC",
    vehicleModel: "Sierra",
    vin: "1HGBH41JXMN108186",
    placedInService: "2025-03-20",
    tentativeCreditPartIILine9: 3_500,
    businessUsePercent: 10,
  },
  facilityFinancedByTaxExemptBonds: false,
  binaryAttachmentNames: ["Substantiate VIN", "Transfer Election Statement"],
} as const;

/** Selected printed inputs and cover-sheet requirements from 1040-NR Scenario 3. */
export const SCENARIO_1040_NR_03_FACTS = {
  taxYear: 2025,
  taxpayer: {
    firstName: "Jace",
    lastName: "Alfaro",
    ssn: "123004444",
    digitalAssets: false,
    address: {
      line1: "147 Tomato Street",
      city: "Logrono",
      province: "La Rioja",
      country: "Spain",
      postalCode: "26001",
    },
  },
  w2: {
    employerName: "Spain Bar and Grill",
    employerEin: "033211167",
    box1Wages: 72_102,
    box2FederalWithholding: 21_750,
    box3SocialSecurityWages: 72_102,
    box4SocialSecurityWithholding: 4_470,
    box5MedicareWages: 72_102,
    box6MedicareWithholding: 1_045,
  },
  scheduleA: {
    line1aStateAndLocalIncomeTax: 18_860,
    line1bAllowedProvided: false,
  },
  attachmentsRequiredByCoverSheet: [
    "1098-C",
    "Motor Vehicles Boats and Airplanes Statement",
  ],
  refundAllocation: {
    savingsAccounts: 2,
    amountToEachSavingsAccount: 1_000,
    remainderToChecking: true,
  },
} as const;

/** Selected printed inputs from 1040-NR Scenario 2, not a computed return. */
export const SCENARIO_1040_NR_02_FACTS = {
  taxYear: 2025,
  taxpayer: {
    firstName: "Genesis",
    lastName: "DeSilva",
    ssn: "123003333",
    address: {
      line1: "29 Woodlawn Avenue East",
      city: "Toronto",
      province: "ON",
      country: "Canada",
      postalCode: "M4T 1B9",
    },
  },
  w2: {
    employerName: "Panaderia Luna de Azucar",
    employerEin: "005559991",
    box1Wages: 25_988,
    box2FederalWithholding: 2_916,
    box3SocialSecurityWages: 25_988,
    box4SocialSecurityWithholding: 1_611,
    box5MedicareWages: 25_988,
    box6MedicareWithholding: 377,
  },
  scheduleNEC: {
    otherIncomeDescription: "LTC",
    printedLine12OtherIncome: 1_100,
  },
  scheduleOI: {
    citizenshipCountry: "CA",
    taxResidenceCountry: "CA",
    appliedForGreenCard: true,
    previouslyCitizenOrGreenCardHolder: false,
    immigrationStatus: "Visa Waiver",
    priorYearUSPresenceDays: { year2023: 110, year2024: 110 },
    currentYearUSPresenceDays: 110,
  },
  schedule1: { printedLine5RentalAndRoyaltyIncome: 500 },
} as const;

/** Scenario 1's cover-sheet IRA amount differs from its printed 1040-NR line 4a. */
export const SCENARIO_1040_NR_01_FACTS = {
  taxYear: 2025,
  taxpayer: {
    firstName: "Lucas",
    lastName: "LeBlanc",
    ssn: "123001111",
    dateOfBirth: "1951-03-17",
    address: {
      line1: "105 Yonge Street",
      city: "Toronto",
      province: "Ontario",
      country: "Canada",
      postalCode: "M4R-1A2",
    },
  },
  administrative: {
    simplifiedRefundMethod: true,
    selfSelectSignaturePin: true,
    form4361OnFile: true,
  },
  ira: {
    coverSheetMinimumDistribution: 10_000,
    coverSheetDistribution: 4_500,
    printedForm1040NRLine4aDistribution: 6_500,
    printedLine4aNonTaxable: true,
  },
  w2: [
    {
      employerName: "Google",
      employerEin: "000000055",
      box1Wages: 33_255,
      box2FederalWithholding: 4_788,
    },
    {
      employerName: "Children of God",
      employerEin: "000000013",
      box1Wages: 600,
      box2FederalWithholding: 0,
    },
  ],
} as const;

/** Printed entries from 1040-NR Scenario 12, including its Schedule A cap. */
export const SCENARIO_1040_NR_12_FACTS = {
  taxYear: 2025,
  taxpayer: {
    firstName: "John",
    lastName: "Harrier",
    ssn: "123001112",
    filingStatus: "single",
    digitalAssets: false,
    address: {
      line1: "500 WATHEROO ST",
      city: "MELBOURNE",
      country: "AUSTRALIA",
      province: "VIC",
      postalCode: "3000",
    },
  },
  scheduleA: {
    line1aStateAndLocalIncomeTax: 5_432,
    printedLine1bAllowed: 5_000,
    printedLine8Total: 5_000,
  },
  scheduleP: {
    partnershipName: "IRIDIUM PARTNERSHIP",
    partnershipEin: "005159901",
    percentTransferred: 10,
    acquired: "2025-06-15",
    transferred: "2025-12-31",
    proceeds: 375_000,
    outsideBasis: 25_000,
    outsideGain: 350_000,
  },
  form8949: {
    proceeds: 375_000,
    basis: 25_000,
    shortTermGain: 350_000,
  },
  printedForm1040NR: {
    line7aCapitalGain: 350_000,
    line9TotalEffectivelyConnectedIncome: 350_000,
    line12ItemizedDeductions: 5_000,
    line15TaxableIncome: 345_000,
    line16Tax: 90_297,
    line24TotalTax: 90_297,
    line26EstimatedTaxPayments: 90_297,
    line33TotalPayments: 90_297,
  },
} as const;

/** Printed source entries from 1040-SS Scenario 6; blank computed lines stay blank. */
export const SCENARIO_1040_SS_06_FACTS = {
  taxYear: 2025,
  taxpayer: {
    firstName: "Juan",
    lastName: "Torres",
    ssn: "400001041",
    dateOfBirth: "1987-02-07",
    filingStatus: "single",
    digitalAssets: false,
    address: {
      line1: "1225 Calle Aurora",
      city: "Mayaguez",
      territory: "PR",
      zip: "00680-1225",
    },
  },
  qualifyingChildren: [
    {
      firstName: "Juan",
      lastName: "Torres Jr",
      ssn: "400001074",
      relationship: "son",
      dateOfBirth: "2015-04-16",
    },
    {
      firstName: "Carmen",
      lastName: "Torres",
      ssn: "400001072",
      relationship: "daughter",
      dateOfBirth: "2016-08-19",
    },
    {
      firstName: "Miguel",
      lastName: "Torres",
      ssn: "400001073",
      relationship: "son",
      dateOfBirth: "2017-06-22",
    },
  ],
  priorYearOverpaymentAppliedTo2025: 3_000,
  form499R2W2PR: {
    employerName: "Torres Electrical",
    employerEin: "000000055",
    wages: 42_980,
    puertoRicoTaxWithheld: 3_625,
    socialSecurityWages: 42_980,
    socialSecurityTaxWithheld: 2_665,
    medicareWages: 42_980,
    medicareTaxWithheld: 623,
  },
  scheduleC: {
    business: "Electrical Contractor",
    businessCode: "238210",
    cashAccounting: true,
    grossReceiptsProvided: false,
    advertising: 2_352,
    contractLabor: 3_560,
    officeExpense: 1_725,
    repairsAndMaintenance: 560,
    beginningInventory: 7_650,
    purchases: 8_550,
    labor: 11_900,
    materialsAndSupplies: 16_300,
    endingInventory: 21_450,
  },
} as const;

/** IRS synthetic ATS data. Payment instructions and the printed Form 4868 are separate source facts. */
export const SCENARIO_4868_07_FACTS = {
  taxYear: 2025,
  taxpayer: {
    firstName: "Charlie",
    lastName: "Boone",
    ssn: "400001042",
    address: {
      line1: "4486 SW 122nd Ave",
      city: "Beaverton",
      state: "OR",
      zip: "97005",
    },
  },
  paymentInstructions: {
    routingTransitNumber: "012345672",
    bankAccountNumber: "1234567",
    bankAccountType: "checking",
    amount: 3_000,
    dueDate: "2026-03-28",
  },
  printedForm4868: {
    line4EstimatedTotalTax: 12_000,
    line5TotalPayments: 7_500,
    line6BalanceDueProvided: false,
    line7AmountPayingProvided: false,
    line8OutOfCountryChecked: false,
    line9NonresidentNoWithheldWagesChecked: false,
  },
} as const;

/** Exact source amounts from Form 1040 ATS Scenario 1, not computed outputs. */
export const SCENARIO_1040_01_FACTS = {
  taxpayer: {
    firstName: "Tara",
    lastName: "Black",
    ssn: "400001032",
    filingStatus: "single",
    digitalAssets: false,
    address: {
      line1: "17 Lexington Drive",
      city: "Cincinnati",
      state: "OH",
      zip: "45223",
    },
  },
  w2: [
    {
      employerName: "The Green Ladies",
      employerEin: "000000007",
      employerAddress: {
        line1: "14 Forest Lane",
        city: "Atlanta",
        state: "GA",
        zip: "30033",
      },
      employeeSsn: "400001032",
      box1Wages: 22_970,
      box2FederalWithholding: 1_073,
      box3SocialSecurityWages: 22_970,
      box4SocialSecurityWithholding: 1_424,
      box5MedicareWages: 22_970,
      box6MedicareWithholding: 333,
      stateWages: 22_970,
      stateIncomeTaxWithheld: 320,
    },
    {
      employerName: "C&R",
      employerEin: "000000007",
      employerAddress: {
        line1: "1121 W Fourth Street",
        city: "Cincinnati",
        state: "OH",
        zip: "45223",
      },
      employeeSsn: "400001032",
      box1Wages: 19_500,
      box2FederalWithholding: 1_640,
      box3SocialSecurityWages: 19_500,
      box4SocialSecurityWithholding: 1_209,
      box5MedicareWages: 19_500,
      box6MedicareWithholding: 283,
      stateWages: 19_500,
      stateIncomeTaxWithheld: 416,
    },
  ],
  scheduleH: {
    employerEin: "000000029",
    cashWagesOver2025Limit: true,
    // Schedule H page 1, line 9 has the "No. Stop" box checked.
    cashWagesOverQuarterLimit: false,
    socialSecurityWages: 3_100,
    medicareWages: 3_100,
    additionalMedicareWages: 0,
    federalWithholding: 0,
  },
  form5695: {
    exteriorDoors: [
      { cost: 1_020, qmid: "A1B2" },
      { cost: 920, qmid: "A1B3" },
      { cost: 800, qmid: "A1B4" },
    ],
    // The PDF separately prints 2,740 on line 19e ("all other" doors),
    // even though the three itemized doors above also total 2,740.
    // Keep the source discrepancy visible until IRS guidance resolves it.
    line19eOtherDoorsCost: 2_740,
    windows: [{ cost: 600, qmid: "A1B5" }],
    centralAirConditioners: [{ cost: 2_100, qmid: "A1B6" }, { cost: 400 }],
  },
} as const;

/** Selected source entries from Form 1040 ATS Scenario 2, not computed outputs. */
export const SCENARIO_1040_02_FACTS = {
  taxpayer: {
    firstName: "John",
    lastName: "Jones",
    ssn: "400001038",
    dateOfBirth: "1965-08-02",
    address: {
      line1: "800 Gooseneck Point Road",
      city: "Oceanport",
      state: "NJ",
      zip: "07757",
    },
  },
  spouse: {
    firstName: "Judy",
    lastName: "Jones",
    ssn: "400001071",
    dateOfBirth: "1966-03-19",
    dateOfDeath: "2025-09-11",
    identityProtectionPin: "876543",
  },
  dependent: {
    firstName: "Jacob",
    lastName: "Jones",
    ssn: "400001070",
    dateOfBirth: "2006-07-20",
  },
  w2: [
    {
      employeeSsn: "400001038",
      employerName: "Southwest Airlines",
      employerEin: "001111111",
      employerAddress: {
        line1: "5000 Flight Street",
        line2: "77 North Washington Street",
        city: "Boston",
        state: "MA",
        zip: "02114",
      },
      box1Wages: 29_513,
      box2FederalWithholding: 1_003,
      box3SocialSecurityWages: 29_513,
      box4SocialSecurityWithholding: 1_830,
      box5MedicareWages: 29_513,
      box6MedicareWithholding: 428,
      statutoryEmployee: true,
      stateIncomeTaxWithheld: 927,
    },
    {
      employeeSsn: "400001071",
      employerName: "Target Corporation",
      employerEin: "000000013",
      employerAddress: {
        line1: "8652 James Street",
        city: "Poughkeepsie",
        state: "NY",
        zip: "12601",
      },
      box1Wages: 8_513,
      box2FederalWithholding: 161,
      box3SocialSecurityWages: 8_513,
      box4SocialSecurityWithholding: 528,
      box5MedicareWages: 8_513,
      box6MedicareWithholding: 123,
      statutoryEmployee: false,
      stateIncomeTaxWithheld: 101,
    },
  ],
  estimatedTaxAppliedFrom2024: 300,
  scheduleA: {
    stateAndLocalIncomeTax: 1_028,
    realEstateTax: 8_972,
    mortgageInterestReportedOn1098: 11_000,
    pointsNotReportedOn1098: 251,
    qualifiedCashContributionDottedLine: 200,
    cashContributionLine11: 250,
  },
  scheduleC: {
    businessDescription: "Furniture Sales",
    businessCode: "449110",
    businessAddress: {
      line1: "800 Gooseneck Point Road",
      city: "Oceanport",
      state: "NJ",
      zip: "07757",
    },
    printedLine1GrossReceiptsProvided: false,
    advertising: 850,
    carAndTruckExpenses: 466,
    pensionAndProfitSharing: 550,
    supplies: 610,
    taxesAndLicenses: 58,
    businessMiles: 665,
    commutingMiles: 710,
    otherMiles: 15_151,
  },
  form8283: {
    donee: "Goodwill",
    propertyDescription: "Clothes and toys",
    donationDate: "2025-11-13",
    costBasis: 3_470,
    fairMarketValue: 700,
  },
  qualifiedBusinessIncomeDeductionEligible: false,
} as const;

/** Selected source entries from Form 1040 ATS Scenario 3, not computed outputs. */
export const SCENARIO_1040_03_FACTS = {
  taxpayer: {
    firstName: "Lynette",
    lastName: "Heather",
    ssn: "400001035",
    dateOfBirth: "1965-10-29",
    identityProtectionPin: "876534",
    address: {
      line1: "2525 Juniper Street",
      city: "Paul",
      state: "ID",
      zip: "83347",
    },
  },
  form1099R: {
    payerName: "Primrose Retirement Fund",
    payerEin: "000000009",
    distributionCode: "7",
    grossDistribution: 53_778,
    taxableAmount: 43_100,
    federalWithholding: 3_405,
    iraSepSimple: false,
  },
  taxableStateTaxRefund: 3_110,
  farmOptionalMethodElected: true,
  specifiedAgriculturalCooperativePatron: true,
  incomeAveragingElected: false,
  qualifiedOpportunityFundInvestment: false,
} as const;

/** Selected source entries from Form 1040 ATS Scenario 4, not computed outputs. */
export const SCENARIO_1040_04_FACTS = {
  taxpayer: {
    firstName: "Sarah",
    lastName: "Smith",
    ssn: "400001037",
    dateOfBirth: "1989-07-08",
    filingStatus: "single",
    priorYearFilingStatus: "single",
    digitalAssets: false,
    address: {
      line1: "6712 Kittery Drive",
      city: "Las Vegas",
      state: "NV",
      zip: "89107",
    },
  },
  w2: {
    employerName: "Capital One Bank",
    employerEin: "000000057",
    employerAddress: {
      line1: "495 South Main Street",
      city: "Las Vegas",
      state: "NV",
      zip: "89139",
    },
    box1Wages: 36_014,
    box2FederalWithholding: 4_581,
    box3SocialSecurityWages: 36_014,
    box4SocialSecurityWithholding: 2_233,
    box5MedicareWages: 36_014,
    box6MedicareWithholding: 522,
  },
  form3800: {
    partIIIline1f: {
      registrationNumber: "PAZ12305555",
      transferorEinEntry: "APPLD FOR",
      creditTransferElectionAmount: 13_200,
      combinedCredit: 13_200,
      appliedAgainstTax: 13_200,
    },
    partIIIline1y: {
      transferorEinEntry: "APPLD FOR",
      creditNotSubjectToPassiveLimits: 130,
      combinedCredit: 130,
      appliedAgainstTax: 130,
    },
  },
  form8835: {
    registrationNumber: "PAZ12305555",
    facilityOwner: "Texas Solar Energy",
    facilityOwnerTin: "000000029",
    facilityAddress: "808 Spring Love Lane, Houston, TX 77004",
    constructionBegan: "2017-08-15",
    placedInService: "2023-09-22",
    solarKilowattHoursProducedAndSold: 440_000,
    printedSolarRate: 0.006,
  },
  form8936ScheduleA: {
    vehicleYear: 2024,
    make: "BMW",
    model: "i4 Gran Coupe",
    vin: "1HGBH41JXMN108186",
    placedInService: "2025-01-25",
    creditTransferredToDealer: false,
    newCleanVehicle: true,
  },
  requiredBinaryAttachmentDescription: "Transfer Election Statement",
} as const;

/** Selected source entries from Form 1040 ATS Scenario 5, not computed outputs. */
export const SCENARIO_1040_05_FACTS = {
  taxpayer: {
    firstName: "Bobby",
    lastName: "Barker",
    ssn: "400001039",
    dateOfBirth: "1990-02-05",
    filingStatus: "head-of-household",
    blind: true,
    fullTimeStudent: true,
    digitalAssets: false,
    presidentialCampaignFund: true,
    address: {
      line1: "6834 Hollywood Boulevard",
      city: "Newark",
      state: "DE",
      zip: "19702",
    },
  },
  dependents: [
    {
      firstName: "Skylar",
      lastName: "Barker",
      ssn: "400001057",
      dateOfBirth: "2015-07-04",
      relationship: "son",
      monthsInHome: 12,
      childTaxCredit: true,
      careExpenses: 1_300,
    },
    {
      firstName: "Kaylee",
      lastName: "Barker",
      ssn: "400001058",
      dateOfBirth: "2016-01-23",
      relationship: "daughter",
      monthsInHome: 12,
      childTaxCredit: true,
      careExpenses: 520,
    },
  ],
  w2: {
    employerName: "Apple Electronics & Technology",
    employerEin: "000000029",
    employerAddress: {
      line1: "132 Christiana Mall",
      city: "Newark",
      state: "DE",
      zip: "19702",
    },
    box1Wages: 31_232,
    box2FederalWithholding: 1_754,
    box3SocialSecurityWages: 31_232,
    box4SocialSecurityWithholding: 1_936,
    box5MedicareWages: 31_232,
    box6MedicareWithholding: 453,
  },
  form2441: {
    providers: [
      {
        name: "Kid Korner",
        ein: "000000041",
        amountPaid: 1_300,
        address: "227 Maze Street, Seattle, WA 98104",
        householdEmployee: false,
      },
      {
        name: "Little Genius",
        ein: "000000042",
        amountPaid: 520,
        address: "7311 Apple Road, Seattle, WA 98104",
        householdEmployee: false,
      },
    ],
  },
  schedule1: {
    movingExpenses: 1_475,
    line14ArmedForcesCheck: true,
  },
  form8862: {
    eicDisallowedForIncomeReportingOnly: false,
    taxpayerQualifyingChildOfAnotherTaxpayer: false,
    child1DaysInUnitedStates: 365,
    child2DaysInUnitedStates: 365,
    child1QualifiesForChildTaxCredit: true,
    child2QualifiesForChildTaxCredit: true,
    studentEligibleForAotc: true,
    studentClaimedAotcForFourYears: false,
  },
  form8863: {
    studentName: "Bobby Barker",
    institutionName: "University of Texas",
    institutionEin: "000000004",
    adjustedQualifiedEducationExpenses: 980,
    received1098TFor2025: false,
    received1098TFor2024: false,
    enrolledAtLeastHalfTime: true,
    completedFirstFourYearsBefore2025: false,
    felonyDrugConviction: false,
  },
  bonaFidePuertoRicoResident: false,
  optOutOfAdditionalChildTaxCredit: true,
} as const;

/** Printed source entries and expected totals from Form 1040 ATS Scenario 12. */
export const SCENARIO_1040_12_FACTS = {
  taxpayer: {
    firstName: "Sam",
    lastName: "Gardenia",
    ssn: "400001212",
    filingStatus: "single",
    digitalAssets: false,
    address: {
      line1: "231 Red Run Street",
      city: "Anytown",
      state: "KY",
      zip: "41011",
    },
  },
  w2: {
    employerName: "DESIGN LLC",
    employerEin: "000000011",
    employerAddress: {
      line1: "426 Build St",
      city: "Anytown",
      state: "KY",
      zip: "41011",
    },
    box1Wages: 100_836,
    box2FederalWithholding: 14_444,
    box3SocialSecurityWages: 105_878,
    box4SocialSecurityWithholding: 6_564,
    box5MedicareWages: 105_878,
    box6MedicareWithholding: 1_535,
    box12CodeDD: 10_315,
    retirementPlanChecked: true,
    stateWages: 100_836,
    stateWithholding: 3_420,
  },
  scheduleC: {
    principalBusiness: "DESIGNER",
    businessCode: "541310",
    businessName: "ENERGY BUILD",
    businessAddress: {
      line1: "654 W 3rd St",
      city: "Anytown",
      state: "KY",
      zip: "41011",
    },
    cashAccounting: true,
    materialParticipation: true,
    made1099Payments: false,
    grossReceipts: 35_235,
    insurance: 550,
    professionalServices: 125,
    officeExpense: 1_000,
    rentOtherBusinessProperty: 2_500,
    supplies: 6_532,
    taxesAndLicenses: 200,
    printedTotalExpenses: 10_907,
    printedNetProfit: 24_328,
  },
  scheduleSE: {
    printedNetEarnings: 22_467,
    printedSocialSecurityWages: 105_878,
    printedSocialSecurityTax: 2_786,
    printedMedicareTax: 652,
    printedTotalTax: 3_438,
    printedHalfTaxDeduction: 1_719,
  },
  form7206: {
    healthInsurancePaid: 1_000,
    printedDeduction: 1_000,
  },
  form7217: {
    formRevision: "2024-12",
    partnershipName: "ENERGY BUILD",
    partnershipEin: "001040012",
    distributionDate: "2025-03-01",
    completeLiquidation: false,
    section751bSaleOrExchange: false,
    aggregateBasisBeforeDistribution: 32_507,
    partnerAdjustedBasisBeforeDistribution: 10_000,
    cashReceived: 4_000,
    printedGainRecognized: 0,
    printedRemainingPartnerBasis: 6_000,
    printedBasisAllocatedToProperty: 6_000,
    distributedProperties: [{
      description: "CASH",
      partnershipBasisBeforeDistribution: 32_507,
      section734bBasisAdjustment: true,
      partnerBasisAfterSection732: 4_000,
    }],
    printedPartIITotalPartnerBasis: 4_000,
  },
  printedForm1040: {
    line1aWages: 100_836,
    line8AdditionalIncome: 24_328,
    line9TotalIncome: 125_164,
    line10Adjustments: 2_719,
    line11AdjustedGrossIncome: 122_445,
    line12StandardDeduction: 15_000,
    line15TaxableIncome: 107_445,
    line16Tax: 18_634,
    line23OtherTaxes: 3_438,
    line24TotalTax: 22_072,
    line25aW2Withholding: 14_444,
    line37AmountOwed: 7_628,
  },
} as const;

/** Printed source entries and expected totals from Form 1040 ATS Scenario 13. */
export const SCENARIO_1040_13_FACTS = {
  taxpayer: {
    firstName: "William",
    lastName: "Birch",
    ssn: "400001313",
    filingStatus: "married-filing-jointly",
    digitalAssets: false,
    address: {
      line1: "13 Elm Street",
      city: "Anytown",
      state: "TX",
      zip: "77013",
    },
  },
  spouse: {
    firstName: "Nancy",
    lastName: "Birch",
    ssn: "400001234",
  },
  w2: {
    employerName: "OAK SUPPLY CO",
    employerEin: "000000014",
    employerAddress: {
      line1: "201 Elm Drive",
      city: "Anytown",
      state: "TX",
      zip: "77013",
    },
    box1Wages: 31_620,
    box2FederalWithholding: 609,
    box3SocialSecurityWages: 31_620,
    box4SocialSecurityWithholding: 1_960,
    box5MedicareWages: 31_620,
    box6MedicareWithholding: 458,
  },
  form6251: {
    line1aDeduction: 30_000,
    line1bIncomeLessDeduction: 1_620,
    line2aScheduleATaxesOrStandardDeduction: 30_000,
    line4AlternativeMinimumTaxableIncome: 31_620,
    line5Exemption: 137_000,
    line11AlternativeMinimumTax: 0,
  },
  form8911ScheduleA: {
    propertyDescription: "ELECTRIC CHARGER",
    propertyAddress: "13 Elm Street, Anytown, TX 77013",
    constructionBegan: "2025-03-01",
    placedInService: "2025-03-01",
    eligibleCensusTract: true,
    censusTractGeoid: "48201100000",
    mainHomeProperty: true,
    qualifiedCost: 1_000,
    businessUsePercentage: 0,
    printedTentativePersonalCredit: 300,
  },
  form8911: {
    printedTentativePersonalCredit: 300,
    printedRegularTaxBeforeCredits: 162,
    printedTentativeMinimumTax: 0,
    printedAllowedPersonalCredit: 162,
  },
  printedForm1040: {
    line1aWages: 31_620,
    line11AdjustedGrossIncome: 31_620,
    line12StandardDeduction: 30_000,
    line15TaxableIncome: 1_620,
    line16Tax: 162,
    line20Schedule3Credit: 162,
    line24TotalTax: 0,
    line25aW2Withholding: 609,
    line34Overpayment: 609,
    line35aRefund: 609,
  },
} as const;

/** Exact source amounts from Form 1040 ATS Scenario 8, not computed outputs. */
export const SCENARIO_1040_08_FACTS = {
  taxpayer: {
    firstName: "Carter",
    lastName: "Lewis",
    ssn: "400001039",
    dateOfBirth: "1953-10-29",
    filingStatus: "mfs",
    address: {
      line1: "807 Sahara Drive",
      city: "Las Vegas",
      state: "NV",
      zip: "89101",
    },
    livedApartFromSpouseAllYear: true,
  },
  spouse: { firstName: "Elizabeth", lastName: "Lewis", ssn: "400001057" },
  form1040: {
    digitalAssets: false,
    presidentialCampaignFundTaxpayer: true,
    line4cQcdChecked: true,
    line5cRolloverChecked: true,
    line6dMfsLivedApartChecked: true,
    line7bScheduleDNotRequiredChecked: true,
    enhancedSeniorDeductionClaimed: false,
  },
  form1099R: [
    {
      payerName: "Liberty Trust Company",
      payerEin: "000000009",
      payerAddress: {
        line1: "6000 Fremont Street",
        city: "Las Vegas",
        state: "NV",
        zip: "89101",
      },
      recipientAddress: {
        line1: "807 Sahara Drive",
        city: "Las Vegas",
        state: "NV",
        zip: "89117",
      },
      distributionCode: "Q",
      grossDistribution: 35_800,
      taxableAmount: 0,
      federalWithholding: 0,
    },
    {
      payerName: "Jubilee Retirement Fund",
      payerEin: "000000009",
      payerAddress: {
        line1: "1347 Carson Street",
        city: "Las Vegas",
        state: "NV",
        zip: "89104",
      },
      recipientAddress: {
        line1: "807 Sahara Drive",
        city: "Las Vegas",
        state: "NV",
        zip: "89117",
      },
      distributionCode: "G",
      grossDistribution: 20_300,
      taxableAmount: 10_300,
      federalWithholding: 2_555,
    },
  ],
  socialSecurityBenefits: { gross: 1_000, taxable: 0 },
  realEstateInvestmentTrustCapitalGainDistribution: 7_500,
  scheduleDRequired: false,
} as const;
