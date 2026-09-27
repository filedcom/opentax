import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { buildForm8854PartI } from "../../../2025/mef/forms/f8854_part_i.ts";
import {
  buildForm8854BalanceSheet,
  buildForm8854BalanceSheetStatements,
} from "../../../2025/mef/forms/f8854_balance_sheet.ts";
import {
  buildForm8854ChangeStatement,
  buildForm8854PartIISectionA,
} from "../../../2025/mef/forms/f8854_part_ii_a.ts";
import {
  averageAnnualNetIncomeTax,
  AVG_ANNUAL_TAX_THRESHOLD_2025,
  ExpatriateType,
  f8854,
  inputSchema,
  isCoveredExpatriate,
  MARK_TO_MARKET_EXCLUSION_2025,
  NET_WORTH_THRESHOLD,
  sectionAExceptionAnswers,
} from "./index.ts";
import { allocateMarkToMarketExclusion } from "./mark-to-market.ts";
import { calculateBalanceSheet } from "./balance-sheet.ts";

function asset(
  assetId: string,
  fmv: number,
  basis: number,
) {
  return {
    asset_id: assetId,
    description: `Property ${assetId}`,
    fmv_at_expatriation: fmv,
    basis,
  };
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    expatriation_date: "2025-06-15",
    expatriate_type: ExpatriateType.CITIZEN,
    part_i: {
      mailing_address: {
        kind: "US",
        line1: "1 Main St",
        city: "Wilmington",
        state: "DE",
        zip: "19801",
      },
      telephone: { kind: "US", number: "3025550123" },
      notification: {
        kind: "CITIZEN_STATE_DEPARTMENT",
        date: "2025-06-15",
      },
      citizenships: [{ country_code: "US", acquired_date: "1980-01-01" }],
      us_citizenship_acquisition: "BIRTH",
    },
    exception_facts: { dual_citizen: null, minor: null },
    significant_asset_liability_changes_prior_5_years: false,
    prior_year_us_income_tax_less_foreign_tax_credit: priorYearTax(0),
    balance_sheet: balanceSheetWithNetWorth(0),
    certified_tax_compliance: true,
    ...overrides,
  };
}

function priorYearTax(amount: number) {
  return {
    year_2024: amount,
    year_2023: amount,
    year_2022: amount,
    year_2021: amount,
    year_2020: amount,
  };
}

function balanceSheetWithNetWorth(netWorth: number) {
  return {
    asset_categories_confirmed_complete: true,
    liabilities_confirmed_complete: true,
    cash_and_bank_deposits: {
      fair_market_value: netWorth,
      us_adjusted_basis: netWorth,
    },
    foreign_cfc_securities_within_line5: [],
    partnership_interests: [],
    owned_trust_assets: [],
    nongrantor_trust_interests: [],
    other_assets: [],
    installment_obligations_liability: 0,
    mortgage_liability: 0,
    other_liabilities: [],
  };
}

function dualCitizenPartI() {
  return {
    ...input().part_i,
    foreign_tax_residence_country_code: "FR",
    citizenships: [
      { country_code: "US", acquired_date: "1980-01-01" },
      { country_code: "FR", acquired_date: "1980-01-01" },
    ],
  };
}

Deno.test("Form 8854 uses TY2025 covered-expatriate thresholds", () => {
  assertEquals(AVG_ANNUAL_TAX_THRESHOLD_2025, 206_000);
  assertEquals(NET_WORTH_THRESHOLD, 2_000_000);
  assertEquals(MARK_TO_MARKET_EXCLUSION_2025, 890_000);
  assertEquals(
    isCoveredExpatriate(inputSchema.parse(input({
      prior_year_us_income_tax_less_foreign_tax_credit: priorYearTax(206_000),
    }))),
    false,
  );
  assertEquals(
    isCoveredExpatriate(inputSchema.parse(input({
      prior_year_us_income_tax_less_foreign_tax_credit: {
        ...priorYearTax(206_000),
        year_2024: 206_005,
      },
    }))),
    true,
  );
  assertEquals(
    averageAnnualNetIncomeTax(inputSchema.parse(input({
      prior_year_us_income_tax_less_foreign_tax_credit: {
        year_2024: 100_000,
        year_2023: 200_000,
        year_2022: 300_000,
        year_2021: 400_000,
        year_2020: 500_000,
      },
    }))),
    300_000,
  );
  assertEquals(
    isCoveredExpatriate(inputSchema.parse(input({
      balance_sheet: balanceSheetWithNetWorth(1_999_999),
    }))),
    false,
  );
  assertEquals(
    isCoveredExpatriate(inputSchema.parse(input({
      balance_sheet: balanceSheetWithNetWorth(2_000_000),
    }))),
    true,
  );
  assertEquals(
    isCoveredExpatriate(inputSchema.parse(input({
      certified_tax_compliance: false,
    }))),
    true,
  );
});

Deno.test("Form 8854 dual-citizen exception waives only tax and net-worth tests", () => {
  const dual = {
    us_citizen_at_birth: true,
    other_country_citizen_at_birth: true,
    other_country_code: "FR",
    other_country_citizen_at_expatriation: true,
    other_country_tax_resident_at_expatriation: true,
    us_resident_tax_years_in_last_15: 10,
  };
  const covered = {
    part_i: dualCitizenPartI(),
    prior_year_us_income_tax_less_foreign_tax_credit: priorYearTax(300_000),
    balance_sheet: balanceSheetWithNetWorth(4_000_000),
    exception_facts: { dual_citizen: dual, minor: null },
  };
  assertEquals(isCoveredExpatriate(inputSchema.parse(input(covered))), false);
  assertEquals(
    isCoveredExpatriate(inputSchema.parse(input({
      ...covered,
      certified_tax_compliance: false,
    }))),
    true,
  );
  assertEquals(
    isCoveredExpatriate(inputSchema.parse(input({
      ...covered,
      exception_facts: {
        dual_citizen: { ...dual, us_resident_tax_years_in_last_15: 11 },
        minor: null,
      },
    }))),
    true,
  );
  assertEquals(
    isCoveredExpatriate(inputSchema.parse(input({
      ...covered,
      exception_facts: {
        dual_citizen: {
          ...dual,
          other_country_tax_resident_at_expatriation: false,
        },
        minor: null,
      },
    }))),
    true,
  );
});

Deno.test("Form 8854 minor exception uses the strict age and residence boundaries", () => {
  const minor = {
    date_of_birth: "2007-01-01",
    us_resident_tax_years_before_expatriation: 10,
  };
  const covered = {
    prior_year_us_income_tax_less_foreign_tax_credit: priorYearTax(300_000),
    exception_facts: { dual_citizen: null, minor },
  };
  assertEquals(isCoveredExpatriate(inputSchema.parse(input(covered))), false);
  assertEquals(
    isCoveredExpatriate(inputSchema.parse(input({
      ...covered,
      exception_facts: {
        dual_citizen: null,
        minor: { ...minor, date_of_birth: "2006-12-15" },
      },
    }))),
    true,
  );
  assertEquals(
    isCoveredExpatriate(inputSchema.parse(input({
      ...covered,
      exception_facts: {
        dual_citizen: null,
        minor: { ...minor, us_resident_tax_years_before_expatriation: 11 },
      },
    }))),
    true,
  );
  assertEquals(
    isCoveredExpatriate(inputSchema.parse(input({
      ...covered,
      certified_tax_compliance: false,
    }))),
    true,
  );
});

Deno.test("Form 8854 validates its source date and asset amounts", () => {
  assertEquals(
    inputSchema.safeParse(input({
      expatriate_type: ExpatriateType.LONG_TERM_RESIDENT,
      part_i: {
        ...input().part_i,
        notification: {
          kind: "LTR_HOMELAND_SECURITY",
          date: "2025-06-15",
        },
        citizenships: [{ country_code: "CA", acquired_date: "1980-01-01" }],
        us_citizenship_acquisition: undefined,
        lawful_permanent_resident_date: "2012-01-01",
      },
    })).success,
    true,
  );
  for (const date of ["2025-02-30", "2025-13-01", "nonsense"]) {
    assertEquals(
      inputSchema.safeParse(input({ expatriation_date: date })).success,
      false,
    );
  }
  assertEquals(
    inputSchema.safeParse(input({
      expatriation_date: "2024-12-31",
    })).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse(input({
      expatriate_type: ExpatriateType.LONG_TERM_RESIDENT,
      exception_facts: {
        dual_citizen: null,
        minor: {
          date_of_birth: "2007-01-01",
          us_resident_tax_years_before_expatriation: 2,
        },
      },
    })).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse(input({
      exception_facts: {
        dual_citizen: null,
        minor: {
          date_of_birth: "2025-07-01",
          us_resident_tax_years_before_expatriation: 0,
        },
      },
    })).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse(input({
      assets: [asset("A", -1, 0)],
    })).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse(input({
      assets: [asset("A", 1, -1)],
    })).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse(input({
      assets: [asset("A", 1.001, 0)],
    })).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse(input({
      assets: [asset("A", 1, 0), asset("A", 2, 0)],
    })).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse(input({
      prior_year_us_income_tax_less_foreign_tax_credit: {
        ...priorYearTax(0),
        year_2024: -1,
      },
    })).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse(input({
      prior_year_us_income_tax_less_foreign_tax_credit: {
        year_2024: 1,
      },
    })).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse(input({
      part_i: {
        ...input().part_i,
        notification: { kind: "LTR_HOMELAND_SECURITY", date: "2025-06-15" },
      },
    })).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse(input({
      part_i: {
        ...input().part_i,
        notification: { kind: "CITIZEN_STATE_DEPARTMENT", date: "2025-06-14" },
      },
    })).success,
    false,
  );
});

Deno.test("Form 8854 Part I XML follows address, notification and citizenship order", () => {
  const xml = buildForm8854PartI(inputSchema.parse(input({
    part_i: {
      ...input().part_i,
      foreign_residence_address: {
        kind: "FOREIGN",
        line1: "2 Rue Exemple",
        city: "Paris",
        country_code: "FR",
        postal_code: "75001",
      },
      foreign_tax_residence_country_code: "FR",
      citizenships: [
        { country_code: "US", acquired_date: "1980-01-01" },
        { country_code: "FR", acquired_date: "1980-01-01" },
      ],
    },
  })));
  assertStringIncludes(xml, "<AfterExptrtMailAddrPhoneGrp><USAddress>");
  assertStringIncludes(xml, "<USTelephoneNum>3025550123</USTelephoneNum>");
  assertStringIncludes(xml, "<ForeignResidenceAddress>");
  assertStringIncludes(
    xml,
    "<InitialExptrtStmtSpcfdYrInd>X</InitialExptrtStmtSpcfdYrInd>",
  );
  assertStringIncludes(
    xml,
    "<ExptrtNotifToDeptOfStateDt>2025-06-15</ExptrtNotifToDeptOfStateDt>",
  );
  assertEquals((xml.match(/<CountryCitizenshipGrp>/g) ?? []).length, 2);
  assertEquals(
    xml.indexOf("<ForeignResidenceAddress>") <
      xml.indexOf("<InitialExptrtStmtSpcfdYrInd>"),
    true,
  );
});

Deno.test("Form 8854 Part I supports long-term dual-resident notice and foreign contact", () => {
  const xml = buildForm8854PartI(inputSchema.parse(input({
    expatriate_type: ExpatriateType.LONG_TERM_RESIDENT,
    part_i: {
      mailing_address: {
        kind: "FOREIGN",
        line1: "4 Example Road",
        city: "Toronto",
        province_or_state: "ON",
        country_code: "CA",
        postal_code: "M5H2N2",
      },
      telephone: { kind: "FOREIGN", number: "14165550123" },
      notification: { kind: "LTR_DUAL_RESIDENT", date: "2025-06-15" },
      citizenships: [{ country_code: "CA", acquired_date: "1980-01-01" }],
      lawful_permanent_resident_date: "2012-01-01",
    },
  })));
  assertStringIncludes(xml, "<AfterExptrtMailAddrPhoneGrp><ForeignAddress>");
  assertStringIncludes(xml, "<ForeignPhoneNum>14165550123</ForeignPhoneNum>");
  assertStringIncludes(xml, "<ExptrtNotifLongTermDualResGrp>");
  assertStringIncludes(
    xml,
    "<LawfulPermanentResidentDt>2012-01-01</LawfulPermanentResidentDt>",
  );
  assertEquals(xml.includes("USCitizenByBirthInd"), false);
});

Deno.test("Form 8854 Section A emits all five prior years and explicit exception answers", () => {
  const dual = {
    us_citizen_at_birth: true,
    other_country_citizen_at_birth: true,
    other_country_code: "FR",
    other_country_citizen_at_expatriation: true,
    other_country_tax_resident_at_expatriation: true,
    us_resident_tax_years_in_last_15: 10,
  };
  const parsed = inputSchema.parse(input({
    part_i: dualCitizenPartI(),
    prior_year_us_income_tax_less_foreign_tax_credit: {
      year_2024: 1,
      year_2023: 2,
      year_2022: 3,
      year_2021: 4,
      year_2020: 5,
    },
    balance_sheet: balanceSheetWithNetWorth(2_000_000),
    exception_facts: {
      dual_citizen: dual,
      minor: {
        date_of_birth: "2007-01-01",
        us_resident_tax_years_before_expatriation: 10,
      },
    },
  }));
  assertEquals(sectionAExceptionAnswers(parsed), {
    dualCitizenBirth: true,
    usResidentNoMoreThan10Of15: true,
    minorQualifies: true,
  });
  const xml = buildForm8854PartIISectionA(parsed);
  assertStringIncludes(
    xml,
    "<USIncomeTax1stYearBfrExptrtAmt>1</USIncomeTax1stYearBfrExptrtAmt>",
  );
  assertStringIncludes(
    xml,
    "<USIncomeTax5thYearBfrExptrtAmt>5</USIncomeTax5thYearBfrExptrtAmt>",
  );
  assertStringIncludes(
    xml,
    "<NetWorthOnExptrtDateAmt>2000000</NetWorthOnExptrtDateAmt>",
  );
  assertStringIncludes(
    xml,
    "<DualCitizenBirthUSOthCntryInd>true</DualCitizenBirthUSOthCntryInd>",
  );
  assertStringIncludes(
    xml,
    "<USResNoMoreThan10Of15YrInd>true</USResNoMoreThan10Of15YrInd>",
  );
  assertStringIncludes(
    xml,
    "<Under18USResLessThan10YrInd>true</Under18USResLessThan10YrInd>",
  );
  assertEquals(
    xml.indexOf("USIncomeTax1stYearBfrExptrtAmt") <
      xml.indexOf("NetWorthOnExptrtDateAmt"),
    true,
  );
});

Deno.test("Form 8854 Section A line 3 links a native explanation statement", () => {
  const parsed = inputSchema.parse(input({
    significant_asset_liability_changes_prior_5_years: true,
    significant_change_explanation: "A real property gift reduced net worth.",
  }));
  assertThrows(
    () => buildForm8854PartIISectionA(parsed),
    Error,
    "linked statement document",
  );
  const xml = buildForm8854PartIISectionA(parsed, "DOC8854CHG1");
  assertStringIncludes(
    xml,
    'referenceDocumentId="DOC8854CHG1" referenceDocumentName="ChangePreOrPostExpatriationDateStatement"',
  );
  assertStringIncludes(
    buildForm8854ChangeStatement(parsed),
    "<MediumExplanationTxt>A real property gift reduced net worth.</MediumExplanationTxt>",
  );
  assertEquals(buildForm8854ChangeStatement(inputSchema.parse(input())), "");
  assertEquals(
    inputSchema.safeParse(input({
      significant_asset_liability_changes_prior_5_years: true,
    })).success,
    false,
  );
});

Deno.test("Form 8854 Section B derives net worth without counting line 5a twice", () => {
  const sheet = {
    ...balanceSheetWithNetWorth(500_000),
    nonmarketable_foreign_securities: {
      fair_market_value: 1_600_000,
      us_adjusted_basis: 1_000_000,
    },
    foreign_cfc_securities_within_line5: [{
      fair_market_value: 500_000,
      us_adjusted_basis: 300_000,
      foreign_entity_description: "Foreign CFC",
    }],
    mortgage_liability: 200_000,
  };
  assertEquals(
    calculateBalanceSheet(
      inputSchema.parse(input({
        balance_sheet: sheet,
      })).balance_sheet,
    ),
    {
      totalAssetsFairMarketValue: 2_100_000,
      totalAssetsUsAdjustedBasis: 1_500_000,
      totalLiabilities: 200_000,
      netWorth: 1_900_000,
    },
  );
  assertEquals(
    isCoveredExpatriate(inputSchema.parse(input({
      balance_sheet: sheet,
    }))),
    false,
  );
  assertStringIncludes(
    buildForm8854PartIISectionA(inputSchema.parse(input({
      balance_sheet: sheet,
    }))),
    "<NetWorthOnExptrtDateAmt>1900000</NetWorthOnExptrtDateAmt>",
  );
  assertEquals(
    inputSchema.safeParse(input({
      balance_sheet: {
        ...sheet,
        foreign_cfc_securities_within_line5: [{
          fair_market_value: 1_600_001,
          us_adjusted_basis: 300_000,
          foreign_entity_description: "Overstated subset",
        }],
      },
    })).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse(input({
      balance_sheet: {
        ...sheet,
        asset_categories_confirmed_complete: false,
      },
    })).success,
    false,
  );
  const negative = inputSchema.parse(input({
    balance_sheet: {
      ...balanceSheetWithNetWorth(0),
      mortgage_liability: 100,
    },
  }));
  assertEquals(calculateBalanceSheet(negative.balance_sheet).netWorth, -100);
  assertEquals(isCoveredExpatriate(negative), false);
});

Deno.test("Form 8854 Section B emits ordered totals and linked detail statements", () => {
  const sheet = {
    ...balanceSheetWithNetWorth(100_000),
    partnership_interests: [{
      partnership_name: "Partnership One",
      ein: "123456789",
      fair_market_value: 400_000,
      us_adjusted_basis: 300_000,
    }],
    owned_trust_assets: [{
      trust_name: "Owned Trust",
      trust_ein: "987654321",
      asset_description: "Trust real property",
      fair_market_value: 200_000,
      us_adjusted_basis: 150_000,
    }],
    nongrantor_trust_interests: [{
      trust_name: "Beneficial Trust",
      fair_market_value: 100_000,
      us_adjusted_basis: 50_000,
    }],
    other_assets: [{
      description: "Collectibles",
      fair_market_value: 20_000,
      us_adjusted_basis: 15_000,
    }],
    other_liabilities: [{ description: "Personal loan", amount: 10_000 }],
    mortgage_liability: 40_000,
  };
  const parsed = inputSchema.parse(input({ balance_sheet: sheet }));
  assertEquals(calculateBalanceSheet(parsed.balance_sheet).netWorth, 770_000);
  assertThrows(
    () => buildForm8854BalanceSheet(parsed),
    Error,
    "linked statement document",
  );
  assertThrows(
    () =>
      buildForm8854BalanceSheet(inputSchema.parse(input()), {
        partnership: "DOC-EMPTY",
      }),
    Error,
    "cannot link an empty statement",
  );
  const xml = buildForm8854BalanceSheet(parsed, {
    partnership: "DOC-P",
    ownedTrust: "DOC-O",
    nongrantorTrust: "DOC-N",
    otherAssets: "DOC-A",
    otherLiabilities: "DOC-L",
  });
  assertStringIncludes(xml, "<FairMarketValueAmt>820000</FairMarketValueAmt>");
  assertStringIncludes(xml, "<TotalLiabilityAmt>50000</TotalLiabilityAmt>");
  assertStringIncludes(xml, "<NetWorthAmt>770000</NetWorthAmt>");
  assertStringIncludes(
    xml,
    'referenceDocumentId="DOC-P" referenceDocumentName="PartnershipInterestStatement"',
  );
  assertEquals(
    xml.indexOf("<TotalPartnershipInterestGrp") <
      xml.indexOf("<TotAssetsHeldByTrSect671679Grp"),
    true,
  );
  const statements = buildForm8854BalanceSheetStatements(parsed.balance_sheet);
  assertStringIncludes(
    statements.partnership,
    "<PartnershipInterestStatement>",
  );
  assertStringIncludes(statements.ownedTrust, "<OwnedTrustValueStatement>");
  assertStringIncludes(
    statements.nongrantorTrust,
    "<NongrantorTrBeneficialIntStmt>",
  );
  assertStringIncludes(statements.otherAssets, "<OtherAssetsNotIncludedStmt>");
  assertStringIncludes(
    statements.otherLiabilities,
    "<OtherLiabilitiesStatement>",
  );
});

Deno.test("Form 8854 dual-citizen country reconciles with Part I", () => {
  const dual = {
    us_citizen_at_birth: true,
    other_country_citizen_at_birth: true,
    other_country_code: "FR",
    other_country_citizen_at_expatriation: true,
    other_country_tax_resident_at_expatriation: true,
    us_resident_tax_years_in_last_15: 10,
  };
  assertEquals(
    inputSchema.safeParse(input({
      exception_facts: { dual_citizen: dual, minor: null },
    })).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse(input({
      part_i: {
        ...dualCitizenPartI(),
        foreign_tax_residence_country_code: "DE",
      },
      exception_facts: { dual_citizen: dual, minor: null },
    })).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse(input({
      part_i: dualCitizenPartI(),
      exception_facts: { dual_citizen: dual, minor: null },
    })).success,
    true,
  );
});

Deno.test("Form 8854 allocates the 2025 exclusion to gain assets, not losses", () => {
  const allocations = allocateMarkToMarketExclusion([
    asset("business", 2_000_000, 200_000),
    asset("stock", 1_000_000, 800_000),
    asset("loss", 500_000, 800_000),
  ]);
  assertEquals(
    allocations.map((row) => ({
      gainOrLoss: row.builtInGainOrLoss,
      exclusion: row.exclusionAllocated,
      gainAfterExclusion: row.gainAfterExclusion,
    })),
    [
      {
        gainOrLoss: 1_800_000,
        exclusion: 801_000,
        gainAfterExclusion: 999_000,
      },
      { gainOrLoss: 200_000, exclusion: 89_000, gainAfterExclusion: 111_000 },
      { gainOrLoss: -300_000, exclusion: 0, gainAfterExclusion: 0 },
    ],
  );
});

Deno.test("Form 8854 caps exclusion at total positive gain and balances cents", () => {
  assertEquals(
    allocateMarkToMarketExclusion([
      asset("A", 100, 0),
      asset("B", 50, 0),
      asset("C", 10, 20),
    ]).map((row) => [row.exclusionAllocated, row.gainAfterExclusion]),
    [[100, 0], [50, 0], [0, 0]],
  );
  const rows = allocateMarkToMarketExclusion([
    asset("A", 890_000.01, 0),
    asset("B", 890_000.01, 0),
    asset("C", 890_000.01, 0),
  ]);
  assertEquals(rows.map((row) => row.exclusionAllocated), [
    296_666.67,
    296_666.67,
    296_666.66,
  ]);
  assertEquals(
    Math.round(
      rows.reduce((sum, row) => sum + row.exclusionAllocated, 0) * 100,
    ),
    89_000_000,
  );
});

Deno.test("Form 8854 rejects duplicate asset IDs and invalid precision", () => {
  assertThrows(
    () => allocateMarkToMarketExclusion([asset("A", 1, 0), asset("A", 2, 0)]),
    Error,
    "Duplicate Form 8854 asset ID",
  );
  assertThrows(
    () => allocateMarkToMarketExclusion([asset("A", 1.001, 0)]),
  );
});

Deno.test("Form 8854 does not turn deemed gain into a dollar-for-dollar Schedule 2 tax", () => {
  assertThrows(
    () =>
      f8854.compute(
        { taxYear: 2025, formType: "f1040" },
        inputSchema.parse(input({
          balance_sheet: balanceSheetWithNetWorth(2_000_000),
          assets: [asset("A", 2_000_000, 500_000)],
        })),
      ),
    Error,
    "asset-specific deemed gain reporting and the IRS8854 attachment",
  );
});

Deno.test("Form 8854 filing never disappears silently just because no exit tax applies", () => {
  assertThrows(
    () =>
      f8854.compute(
        { taxYear: 2025, formType: "f1040" },
        inputSchema.parse(input()),
      ),
    Error,
    "IRS8854 attachment",
  );
});
