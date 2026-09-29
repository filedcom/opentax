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
import {
  Form8949LossTreatment,
  type MarkToMarketAsset,
  NongrantorTrustTreatment,
  ReportedFormCode,
} from "./section-c.ts";
import {
  buildForm8854SectionC,
  buildForm8854SectionCStatements,
} from "../../../2025/mef/forms/f8854_section_c.ts";
import {
  buildForm8854DeferredPropertyStatement,
  buildForm8854SectionD,
} from "../../../2025/mef/forms/f8854_section_d.ts";
import { calculateSectionDDeferral } from "./section-d.ts";
import {
  buildForm8854InitialBundle,
  buildForm8854NativeStatementContents,
  linkForm8854NativeStatementIds,
} from "../../../2025/mef/forms/f8854_initial.ts";
import { reconcileForm8854Form8949Properties } from "./reconcile-capital.ts";

function asset(
  assetId: string,
  fmv: number,
  basis: number,
) {
  return {
    item_id: assetId,
    description: `Property ${assetId}`,
    fmv_day_before_expatriation: fmv,
    us_adjusted_basis: basis,
    basis_irrevocable_election_h2: false,
    reported_form_code: ReportedFormCode.Form8949,
    reported_transaction_id: `TX-${assetId}`,
    form8949_standard_holding_period_confirmed: true as const,
    form8949_digital_asset: false,
  };
}

function deemedSale8949(
  itemId: string,
  proceeds: number,
  basis: number,
  exclusion: number,
) {
  return {
    part: "F" as const,
    description: `Property ${itemId}`,
    source_transaction_id: `TX-${itemId}`,
    date_acquired: "2020-01-01",
    date_sold: "2025-06-14",
    proceeds,
    cost_basis: basis,
    adjustment_codes: exclusion > 0 ? "O" : undefined,
    adjustment_amount: exclusion > 0 ? -exclusion : undefined,
  };
}

function filed8949(...transactions: Record<string, unknown>[]) {
  return transactions.map((transaction) => ({
    ...transaction,
    gain_loss: Number(transaction.proceeds) -
      Number(transaction.cost_basis) +
      Number(transaction.adjustment_amount ?? 0),
    is_long_term: ["F", "L"].includes(String(transaction.part)),
  }));
}

function sectionC(markToMarketAssets: MarkToMarketAsset[] = []) {
  return {
    property_inventory_confirmed_complete: true,
    mark_to_market_assets: markToMarketAssets,
    eligible_deferred_compensation: [],
    ineligible_deferred_compensation: [],
    specified_tax_deferred_accounts: [],
    nongrantor_trust_interests: [],
  };
}

function electedDeferral(ids: string[] = ["stock"]) {
  return {
    elect_deferral: true,
    hypothetical_return_with_877a: {
      attachment_file_name: "hypothetical-with.pdf",
      form_1040_line_24_tax: 600_000,
    },
    hypothetical_return_without_877a: {
      attachment_file_name: "hypothetical-without.pdf",
      form_1040_line_24_tax: 100_000,
    },
    deferred_property_item_ids: ids,
    tax_deferral_agreement_copy_attachment_file_name: "agreement-copy.pdf",
    original_agreement_request_marked_original_confirmed: true,
    original_agreement_request_mailed_confirmed: true,
    agreement_copy_marked_copy_confirmed: true,
    adequate_security_confirmed: true,
    us_limited_agent_appointed_confirmed: true,
    treaty_collection_waiver_confirmed: true,
  };
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    expatriation_date: "2025-06-15",
    expatriate_type: ExpatriateType.CITIZEN,
    tax_status_2025: "FULL_YEAR_US_CITIZEN_OR_RESIDENT",
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
    section_c: null,
    section_d: { elect_deferral: false },
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
      section_c: sectionC([asset("A", -1, 0)]),
    })).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse(input({
      section_c: sectionC([asset("A", 1, -1)]),
    })).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse(input({
      section_c: sectionC([asset("A", 1.001, 0)]),
    })).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse(input({
      section_c: sectionC([asset("A", 1, 0), asset("A", 2, 0)]),
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

Deno.test("Form 8854 Section C separates excluded items and links native statements", () => {
  const section = {
    ...sectionC([asset("stock", 1_000_000, 100_000)]),
    eligible_deferred_compensation: [{
      item_id: "eligible",
      description: "Eligible plan",
      payor_eligible_under_877a_d1: true,
      w8ce_payor_notification_confirmed: true,
      irrevocable_treaty_waiver_confirmed: true,
    }],
    ineligible_deferred_compensation: [{
      item_id: "ineligible",
      description: "Ineligible plan",
      present_value_day_before_expatriation: 10_000,
      reported_transaction_id: "TX-INELIGIBLE",
    }],
    specified_tax_deferred_accounts: [{
      item_id: "account",
      description: "IRA",
      entire_account_balance_day_before_expatriation: 20_000,
      reported_transaction_id: "TX-IRA",
    }],
    nongrantor_trust_interests: [{
      item_id: "trust",
      description: "Trust interest",
      treatment: NongrantorTrustTreatment.TreatyWaiver,
    }],
  };
  const parsed = inputSchema.parse(input({
    balance_sheet: balanceSheetWithNetWorth(2_000_000),
    section_c: section,
  }));
  assertThrows(() => buildForm8854SectionC(parsed), Error, "linked statement");
  const xml = buildForm8854SectionC(parsed, {
    eligibleDeferredCompensation: "DOC-EDC",
    ineligibleDeferredCompensation: "DOC-IDC",
    specifiedTaxDeferredAccounts: "DOC-STDA",
    nongrantorTrust: "DOC-NGT",
    computation: "DOC-COMP",
  });
  assertStringIncludes(xml, "<EligibleDeferredCompItemsInd");
  assertStringIncludes(xml, "<NongrantorTrustInterestInd");
  assertStringIncludes(xml, "<GainOrLossAmt>900000</GainOrLossAmt>");
  assertStringIncludes(
    xml,
    '<GainAfterAllocationExclAmt referenceDocumentId="DOC-COMP"',
  );
  assertStringIncludes(
    xml,
    "<FormOrSchGainAssetReportedCd>F8949</FormOrSchGainAssetReportedCd>",
  );
  assertStringIncludes(
    xml,
    "<TotGainAfterAllocationExclAmt>10000</TotGainAfterAllocationExclAmt>",
  );
  const statements = buildForm8854SectionCStatements(parsed.section_c!);
  assertStringIncludes(
    statements.eligibleDeferredCompensation,
    "<EligDeferredCompItemStmt>",
  );
  assertStringIncludes(
    statements.ineligibleDeferredCompensation,
    "<Amt>10000</Amt>",
  );
  assertStringIncludes(
    statements.specifiedTaxDeferredAccounts,
    "<Amt>20000</Amt>",
  );
  assertStringIncludes(
    statements.nongrantorTrust,
    "<NongrantorTrustStatement>",
  );
  assertStringIncludes(
    statements.computation,
    "<ExclusionCalculationAmt>890000</ExclusionCalculationAmt>",
  );
});

Deno.test("Form 8854 Section C rejects unsupported ownership and absent covered facts", () => {
  assertEquals(
    inputSchema.safeParse(input({
      assets: [asset("legacy", 1, 0)],
    })).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse(input({
      section_c: {
        ...sectionC(),
        property_inventory_confirmed_complete: false,
      },
    })).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse(input({
      section_c: sectionC([{
        ...asset("stock", 1, 0),
        basis_irrevocable_election_h2: true,
      }]),
    })).success,
    false,
  );
  assertThrows(
    () =>
      buildForm8854SectionC(inputSchema.parse(input({
        balance_sheet: balanceSheetWithNetWorth(2_000_000),
      }))),
    Error,
    "require Form 8854 Section C",
  );
  assertThrows(
    () =>
      buildForm8854SectionC(inputSchema.parse(input({
        section_c: sectionC(),
      }))),
    Error,
    "only for covered expatriates",
  );
  assertThrows(
    () =>
      buildForm8854SectionC(
        inputSchema.parse(input({
          balance_sheet: balanceSheetWithNetWorth(2_000_000),
          section_c: sectionC(
            Array.from(
              { length: 21 },
              (_, index) => asset(String(index), 1, 0),
            ),
          ),
        })),
        { computation: "DOC-COMP" },
      ),
    Error,
    "at most 20 property rows",
  );
});

Deno.test("Form 8854 Section C XML uses consistent whole-dollar property math", () => {
  const parsed = inputSchema.parse(input({
    balance_sheet: balanceSheetWithNetWorth(2_000_000),
    section_c: sectionC([
      asset("one", 1_000_000.51, 100_000.49),
      asset("two", 20.51, 10.49),
    ]),
  }));
  const xml = buildForm8854SectionC(parsed, { computation: "DOC-COMP" });
  assertStringIncludes(
    xml,
    "<FairMarketValueDayBfrExptrtAmt>1000001</FairMarketValueDayBfrExptrtAmt>",
  );
  assertStringIncludes(
    xml,
    "<CostOrOtherBasisAmt>100000</CostOrOtherBasisAmt>",
  );
  assertStringIncludes(xml, "<GainOrLossAmt>900001</GainOrLossAmt>");
  assertStringIncludes(xml, "<TotalGainOrLossAmt>900012</TotalGainOrLossAmt>");
  assertStringIncludes(
    xml,
    "<TotGainAfterAllocationExclAmt>10012</TotGainAfterAllocationExclAmt>",
  );
  const statements = buildForm8854SectionCStatements(parsed.section_c!);
  assertStringIncludes(
    statements.computation,
    "<TotalBuiltInGainAmt>900012</TotalBuiltInGainAmt>",
  );
});

Deno.test("Form 8854 Section D allocates tax over all gain property before partial election", () => {
  const parsed = inputSchema.parse(input({
    balance_sheet: balanceSheetWithNetWorth(2_000_000),
    section_c: sectionC([
      asset("business", 2_000_000, 200_000),
      asset("stock", 1_000_000, 800_000),
      asset("loss", 500_000, 800_000),
    ]),
    section_d: electedDeferral(["stock"]),
  }));
  const allocation = calculateSectionDDeferral(
    parsed.section_c!,
    parsed.section_d,
  );
  assertEquals(allocation?.taxEligibleForDeferral, 500_000);
  assertEquals(allocation?.totalDeferredTax, 50_000);
  assertEquals(
    allocation?.properties.map((row) => [row.itemId, row.deferredTax]),
    [
      ["business", 0],
      ["stock", 50_000],
    ],
  );
  const sectionCXml = buildForm8854SectionC(parsed, {
    computation: "DOC-COMP",
    deferredPropertyTaxElection: "DOC-DEFERRED",
  });
  assertEquals((sectionCXml.match(/<DeferredTaxAmt/g) ?? []).length, 1);
  assertStringIncludes(
    sectionCXml,
    "<TotalTaxDeferredAmt>50000</TotalTaxDeferredAmt>",
  );
  const sectionDXml = buildForm8854SectionD(parsed);
  assertStringIncludes(
    sectionDXml,
    "<TotalTaxWithSect877AaAmt>600000</TotalTaxWithSect877AaAmt>",
  );
  assertStringIncludes(
    sectionDXml,
    "<TaxEligibleForDeferralAmt>500000</TaxEligibleForDeferralAmt>",
  );
  const statement = buildForm8854DeferredPropertyStatement(parsed);
  assertEquals(
    (statement.match(/<DeferredPropertyTaxElectGrp>/g) ?? []).length,
    1,
  );
  assertStringIncludes(
    statement,
    "<GainAfterAllocationExclAmt>111000</GainAfterAllocationExclAmt>",
  );
  assertStringIncludes(
    statement,
    "<TotalBuiltInGainAmt>1110000</TotalBuiltInGainAmt>",
  );
  assertStringIncludes(statement, "<DeferredTaxAmt>50000</DeferredTaxAmt>");
});

Deno.test("Form 8854 Section D rejects invalid elections and emits a no-deferral answer", () => {
  assertEquals(buildForm8854SectionD(inputSchema.parse(input())), "");
  const covered = inputSchema.parse(input({
    balance_sheet: balanceSheetWithNetWorth(2_000_000),
  }));
  assertStringIncludes(
    buildForm8854SectionD(covered),
    "<TaxDeferSect877AbElectionInd>false</TaxDeferSect877AbElectionInd>",
  );
  const section = sectionC([
    asset("business", 2_000_000, 200_000),
    asset("stock", 1_000_000, 800_000),
    asset("loss", 500_000, 800_000),
  ]);
  assertEquals(
    inputSchema.safeParse(input({
      balance_sheet: balanceSheetWithNetWorth(2_000_000),
      section_c: section,
      section_d: {
        ...electedDeferral(),
        hypothetical_return_without_877a: {
          attachment_file_name: "hypothetical-with.pdf",
          form_1040_line_24_tax: 100_000,
        },
      },
    })).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse(input({
      balance_sheet: balanceSheetWithNetWorth(2_000_000),
      section_c: section,
      section_d: {
        ...electedDeferral(),
        hypothetical_return_without_877a: {
          attachment_file_name: "hypothetical-without.pdf",
          form_1040_line_24_tax: 600_000,
        },
      },
    })).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse(input({
      balance_sheet: balanceSheetWithNetWorth(2_000_000),
      section_c: section,
      section_d: {
        ...electedDeferral(),
        original_agreement_request_mailed_confirmed: false,
      },
    })).success,
    false,
  );
  const lossElection = inputSchema.parse(input({
    balance_sheet: balanceSheetWithNetWorth(2_000_000),
    section_c: section,
    section_d: electedDeferral(["loss"]),
  }));
  assertThrows(
    () => buildForm8854SectionD(lossElection),
    Error,
    "absent or has no gain",
  );
  assertThrows(
    () =>
      buildForm8854SectionC(lossElection, {
        computation: "DOC-COMP",
        deferredPropertyTaxElection: "DOC-DEFERRED",
      }),
    Error,
    "absent or has no gain",
  );
  assertThrows(
    () =>
      buildForm8854SectionC(
        inputSchema.parse(input({
          balance_sheet: balanceSheetWithNetWorth(2_000_000),
          section_c: section,
          section_d: electedDeferral(),
        })),
        { computation: "DOC-COMP" },
      ),
    Error,
    "linked statement document",
  );
});

Deno.test("Form 8854 initial bundle assembles Parts I and II without pretending to register filing", () => {
  const noncovered = buildForm8854InitialBundle(
    inputSchema.parse(input()),
    {
      balanceSheet: {},
      sectionC: {},
      binaryAttachmentIdsByFileName: {},
    },
    { form8949: undefined },
  );
  assertStringIncludes(noncovered.formXml, "<IRS8854>");
  assertStringIncludes(
    noncovered.formXml,
    "<InitialExptrtStmtSpcfdYrInd>X</InitialExptrtStmtSpcfdYrInd>",
  );
  assertStringIncludes(noncovered.formXml, "<ExpatriationInformationGrp>");
  assertStringIncludes(noncovered.formXml, "<InitialExptrtStmtBalSheetGrp>");
  assertEquals(
    noncovered.formXml.includes("PropertyOwnedDtExpatriationGrp"),
    false,
  );
  assertEquals(
    noncovered.formXml.includes("AnnualExptrtStmtBfrSpcfdYrGrp"),
    false,
  );
  assertEquals(noncovered.nativeStatements.length, 0);

  const coveredInput = inputSchema.parse(input({
    balance_sheet: balanceSheetWithNetWorth(2_000_000),
    section_c: sectionC([asset("stock", 1_000_000, 100_000)]),
  }));
  const coveredIds = {
    balanceSheet: {},
    sectionC: { computation: "DOC-COMP" },
    binaryAttachmentIdsByFileName: {},
  };
  assertThrows(
    () =>
      buildForm8854InitialBundle(coveredInput, coveredIds, {
        form8949: undefined,
      }),
    Error,
    "needs exactly one identified Form 8949 transaction",
  );
  const covered = buildForm8854InitialBundle(
    coveredInput,
    coveredIds,
    {
      form8949: filed8949(
        deemedSale8949("stock", 1_000_000, 100_000, 890_000),
      ),
    },
  );
  assertStringIncludes(covered.formXml, "<PropertyOwnedDtExpatriationGrp>");
  assertStringIncludes(covered.formXml, "<ExptrtTaxDeferralGrp>");
  assertEquals(covered.nativeStatements.map((row) => row.documentName), [
    "Form8854ComputationStatement",
  ]);
});

Deno.test("Form 8854 native statement set is stable before document IDs are assigned", () => {
  const parsed = inputSchema.parse(input({
    balance_sheet: balanceSheetWithNetWorth(2_000_000),
    section_c: sectionC([asset("stock", 1_000_000, 100_000)]),
  }));
  const contents = buildForm8854NativeStatementContents(parsed);
  assertEquals(contents.map((statement) => statement.key), ["computation"]);
  assertEquals(contents[0].documentName, "Form8854ComputationStatement");
  assertEquals(
    buildForm8854NativeStatementContents(inputSchema.parse(input())),
    [],
  );
  const multiple = inputSchema.parse(input({
    significant_asset_liability_changes_prior_5_years: true,
    significant_change_explanation: "Sold a partnership interest.",
    balance_sheet: {
      ...balanceSheetWithNetWorth(0),
      partnership_interests: [{
        partnership_name: "Example Partnership",
        fair_market_value: 100,
        us_adjusted_basis: 50,
      }],
      other_liabilities: [{ description: "Loan", amount: 20 }],
    },
  }));
  assertEquals(
    buildForm8854NativeStatementContents(multiple).map((statement) =>
      statement.key
    ),
    ["changeStatement", "otherLiabilities", "partnership"],
  );
  const ordered = buildForm8854NativeStatementContents(multiple);
  const links = linkForm8854NativeStatementIds(
    ordered,
    ["DOC-CHANGE", "DOC-LIABILITY", "DOC-PARTNERSHIP"],
    {},
  );
  assertEquals(links.changeStatement, "DOC-CHANGE");
  assertEquals(links.balanceSheet.otherLiabilities, "DOC-LIABILITY");
  assertEquals(links.balanceSheet.partnership, "DOC-PARTNERSHIP");
  assertThrows(() =>
    linkForm8854NativeStatementIds(ordered, ["DOC-CHANGE"], {})
  );
  assertThrows(() =>
    linkForm8854NativeStatementIds(
      ordered,
      ["DOC-CHANGE", "DOC-CHANGE", "DOC-PARTNERSHIP"],
      {},
    )
  );
});

Deno.test("Form 8854 initial bundle requires actual IDs for election PDFs", () => {
  const parsed = inputSchema.parse(input({
    balance_sheet: balanceSheetWithNetWorth(2_000_000),
    section_c: sectionC([
      asset("business", 2_000_000, 200_000),
      asset("stock", 1_000_000, 800_000),
    ]),
    section_d: electedDeferral(["stock"]),
  }));
  const ids = {
    balanceSheet: {},
    sectionC: {
      computation: "DOC-COMP",
      deferredPropertyTaxElection: "DOC-DEFERRED",
    },
    binaryAttachmentIdsByFileName: {
      "hypothetical-with.pdf": "DOC-HYP-WITH",
      "hypothetical-without.pdf": "DOC-HYP-WITHOUT",
      "agreement-copy.pdf": "DOC-AGREEMENT",
    },
  };
  const filingPending = {
    form8949: filed8949(
      deemedSale8949("business", 2_000_000, 200_000, 801_000),
      deemedSale8949("stock", 1_000_000, 800_000, 89_000),
    ),
  };
  assertThrows(
    () =>
      buildForm8854InitialBundle(parsed, {
        ...ids,
        binaryAttachmentIdsByFileName: {
          "hypothetical-with.pdf": "DOC-HYP-WITH",
          "hypothetical-without.pdf": "DOC-HYP-WITHOUT",
        },
      }, filingPending),
    Error,
    "needs binary attachment agreement-copy.pdf",
  );
  const bundle = buildForm8854InitialBundle(parsed, ids, filingPending);
  assertStringIncludes(
    bundle.formXml,
    'referenceDocumentId="DOC-HYP-WITH DOC-HYP-WITHOUT DOC-AGREEMENT" referenceDocumentName="BinaryAttachment"',
  );
  assertEquals(bundle.nativeStatements.length, 2);
  assertEquals(
    bundle.nativeStatements.some((statement) =>
      statement.documentName === "DeferredPropertyTaxElectionStatement"
    ),
    true,
  );
  assertThrows(
    () =>
      buildForm8854InitialBundle(parsed, {
        ...ids,
        binaryAttachmentIdsByFileName: {
          ...ids.binaryAttachmentIdsByFileName,
          "agreement-copy.pdf": "DOC-HYP-WITH",
        },
      }, filingPending),
    Error,
    "document IDs must be unique",
  );
});

Deno.test("Form 8854 trust full-value election requires a linked valuation ruling", () => {
  const section = {
    ...sectionC(),
    nongrantor_trust_interests: [{
      item_id: "trust",
      description: "Foreign nongrantor trust",
      treatment: NongrantorTrustTreatment.ElectFullValue,
      valuation_letter_ruling_attachment_file_name: "trust-ruling.pdf",
    }],
  };
  assertEquals(
    inputSchema.safeParse(input({
      section_c: {
        ...section,
        nongrantor_trust_interests: [{
          ...section.nongrantor_trust_interests[0],
          valuation_letter_ruling_attachment_file_name: undefined,
        }],
      },
    })).success,
    false,
  );
  const parsed = inputSchema.parse(input({
    balance_sheet: balanceSheetWithNetWorth(2_000_000),
    section_c: section,
  }));
  const ids = {
    balanceSheet: {},
    sectionC: { nongrantorTrust: "DOC-TRUST" },
    binaryAttachmentIdsByFileName: { "trust-ruling.pdf": "DOC-RULING" },
  };
  assertThrows(
    () =>
      buildForm8854InitialBundle(parsed, {
        ...ids,
        binaryAttachmentIdsByFileName: {},
      }, { form8949: undefined }),
    Error,
    "needs binary attachment trust-ruling.pdf",
  );
  const bundle = buildForm8854InitialBundle(parsed, ids, {
    form8949: undefined,
  });
  assertStringIncludes(
    bundle.formXml,
    "<Section877AElectionInd>X</Section877AElectionInd>",
  );
  assertStringIncludes(bundle.formXml, 'referenceDocumentId="DOC-RULING"');
  assertEquals(bundle.nativeStatements.map((row) => row.documentName), [
    "NongrantorTrustStatement",
  ]);
});

Deno.test("Form 8854 gain property matches one identified Form 8949 deemed sale", () => {
  const parsed = inputSchema.parse(input({
    balance_sheet: balanceSheetWithNetWorth(2_000_000),
    section_c: sectionC([asset("stock", 1_000_000, 100_000)]),
  }));
  const transaction = {
    part: "F",
    description: "Property stock",
    source_transaction_id: "TX-stock",
    date_acquired: "2020-01-01",
    date_sold: "2025-06-14",
    proceeds: 1_000_000,
    cost_basis: 100_000,
    adjustment_codes: "O",
    adjustment_amount: -890_000,
  };
  assertEquals(
    reconcileForm8854Form8949Properties(parsed, filed8949(transaction)),
    [{ itemId: "stock", transactionId: "TX-stock", gainOrLoss: 10_000 }],
  );
  assertThrows(() =>
    reconcileForm8854Form8949Properties(parsed, { f8949s: [transaction] })
  );
  assertThrows(() =>
    reconcileForm8854Form8949Properties(parsed, [{
      ...filed8949(transaction)[0],
      gain_loss: 9_999,
    }])
  );
  for (
    const bad of [
      { ...transaction, source_transaction_id: undefined },
      { ...transaction, date_sold: "2025-06-15" },
      { ...transaction, proceeds: 999_999 },
      { ...transaction, adjustment_amount: -889_999 },
      { ...transaction, part: "A" },
    ]
  ) {
    assertThrows(() =>
      reconcileForm8854Form8949Properties(parsed, filed8949(bad))
    );
  }
  assertThrows(
    () =>
      reconcileForm8854Form8949Properties(
        parsed,
        filed8949(transaction, transaction),
      ),
    Error,
    "exactly one identified Form 8949 transaction",
  );
});

Deno.test("Form 8854 Form 8949 holding period follows acquisition and deemed-sale dates", () => {
  const parsed = inputSchema.parse(input({
    balance_sheet: balanceSheetWithNetWorth(2_000_000),
    section_c: sectionC([asset("stock", 1_000_000, 100_000)]),
  }));
  const sale = deemedSale8949("stock", 1_000_000, 100_000, 890_000);
  assertEquals(
    reconcileForm8854Form8949Properties(
      parsed,
      filed8949({ ...sale, date_acquired: "2024-06-14", part: "C" }),
    ).length,
    1,
  );
  for (
    const bad of [
      { ...sale, date_acquired: "2024-06-14", part: "F" },
      { ...sale, date_acquired: "2024-06-13", part: "C" },
    ]
  ) {
    assertThrows(
      () => reconcileForm8854Form8949Properties(parsed, filed8949(bad)),
      Error,
      "holding-period classification",
    );
  }
  const unconfirmed = inputSchema.parse(input({
    balance_sheet: balanceSheetWithNetWorth(2_000_000),
    section_c: sectionC([{
      ...asset("stock", 1_000_000, 100_000),
      form8949_standard_holding_period_confirmed: undefined,
    }]),
  }));
  assertThrows(
    () => reconcileForm8854Form8949Properties(unconfirmed, filed8949(sale)),
    Error,
    "needs confirmation of standard Form 8949 holding-period treatment",
  );
});

Deno.test("Form 8854 Form 8949 digital-asset fact matches the no-report box", () => {
  const base = input({
    balance_sheet: balanceSheetWithNetWorth(2_000_000),
    section_c: sectionC([asset("stock", 1_000_000, 100_000)]),
  });
  const nondigital = inputSchema.parse(base);
  const digital = inputSchema.parse({
    ...base,
    section_c: sectionC([{
      ...asset("stock", 1_000_000, 100_000),
      form8949_digital_asset: true,
    }]),
  });
  const sale = deemedSale8949("stock", 1_000_000, 100_000, 890_000);
  assertEquals(
    reconcileForm8854Form8949Properties(
      digital,
      filed8949({ ...sale, part: "L" }),
    ).length,
    1,
  );
  for (
    const [property, part] of [
      [nondigital, "L"],
      [digital, "F"],
    ] as const
  ) {
    assertThrows(
      () =>
        reconcileForm8854Form8949Properties(
          property,
          filed8949({ ...sale, part }),
        ),
      Error,
      "inconsistent Form 8949 digital-asset category",
    );
  }
  const unclassified = inputSchema.parse({
    ...base,
    section_c: sectionC([{
      ...asset("stock", 1_000_000, 100_000),
      form8949_digital_asset: undefined,
    }]),
  });
  assertThrows(
    () => reconcileForm8854Form8949Properties(unclassified, filed8949(sale)),
    Error,
    "needs explicit digital-asset classification",
  );
});

Deno.test("Form 8854 capital reconciliation refuses uncharacterized losses and duplicated IDs", () => {
  assertEquals(
    inputSchema.safeParse(input({
      balance_sheet: balanceSheetWithNetWorth(2_000_000),
      section_c: sectionC([
        asset("one", 1_000_000, 100_000),
        asset("two", 1_000_000, 100_000),
      ].map((row) => ({ ...row, reported_transaction_id: "SAME" }))),
    })).success,
    false,
  );
  const parsed = inputSchema.parse(input({
    balance_sheet: balanceSheetWithNetWorth(2_000_000),
    section_c: sectionC([asset("loss", 100, 200)]),
  }));
  assertThrows(
    () => reconcileForm8854Form8949Properties(parsed, filed8949()),
    Error,
    "needs loss-character and deductibility facts",
  );
});

Deno.test("Form 8854 deductible capital loss matches its unadjusted Form 8949 row", () => {
  const parsed = inputSchema.parse(input({
    balance_sheet: balanceSheetWithNetWorth(2_000_000),
    section_c: sectionC([{
      ...asset("stock-loss", 100, 200),
      form8949_loss_treatment: Form8949LossTreatment.DeductibleCapital,
    }]),
  }));
  const transaction = deemedSale8949("stock-loss", 100, 200, 0);
  assertEquals(
    reconcileForm8854Form8949Properties(parsed, filed8949(transaction)),
    [{
      itemId: "stock-loss",
      transactionId: "TX-stock-loss",
      gainOrLoss: -100,
    }],
  );
  assertThrows(() =>
    reconcileForm8854Form8949Properties(
      parsed,
      filed8949({
        ...transaction,
        adjustment_codes: "L",
        adjustment_amount: 100,
      }),
    )
  );
});

Deno.test("Form 8854 personal-use loss requires Form 8949 code L and zero recognized loss", () => {
  const parsed = inputSchema.parse(input({
    balance_sheet: balanceSheetWithNetWorth(2_000_000),
    section_c: sectionC([{
      ...asset("personal-loss", 100, 200),
      form8949_loss_treatment: Form8949LossTreatment.NondeductiblePersonalUse,
    }]),
  }));
  const transaction = {
    ...deemedSale8949("personal-loss", 100, 200, 0),
    adjustment_codes: "L",
    adjustment_amount: 100,
  };
  assertEquals(
    reconcileForm8854Form8949Properties(parsed, filed8949(transaction)),
    [{
      itemId: "personal-loss",
      transactionId: "TX-personal-loss",
      gainOrLoss: 0,
    }],
  );
  assertThrows(() =>
    reconcileForm8854Form8949Properties(
      parsed,
      filed8949({ ...transaction, adjustment_amount: 99 }),
    )
  );
});

Deno.test("Form 8854 Form 8949 loss treatment cannot be claimed for a gain or Form 4797 asset", () => {
  const gain = {
    ...asset("gain", 200, 100),
    form8949_loss_treatment: Form8949LossTreatment.DeductibleCapital,
  };
  const businessLoss = {
    ...asset("business-loss", 100, 200),
    reported_form_code: ReportedFormCode.Form4797,
    form8949_loss_treatment: Form8949LossTreatment.DeductibleCapital,
  };
  for (const badAsset of [gain, businessLoss]) {
    assertEquals(
      inputSchema.safeParse(input({
        balance_sheet: balanceSheetWithNetWorth(2_000_000),
        section_c: sectionC([badAsset]),
      })).success,
      false,
    );
  }
});

Deno.test("Form 8854 does not turn deemed gain into a dollar-for-dollar Schedule 2 tax", () => {
  assertEquals(
    f8854.compute(
      { taxYear: 2025, formType: "f1040" },
      inputSchema.parse(input({
        balance_sheet: balanceSheetWithNetWorth(2_000_000),
        section_c: sectionC([asset("A", 2_000_000, 500_000)]),
      })),
    ).outputs,
    [],
  );
});

Deno.test("Form 8854 calculation node rejects covered non-Form 8949 property", () => {
  assertThrows(
    () =>
      f8854.compute(
        { taxYear: 2025, formType: "f1040" },
        inputSchema.parse(input({
          balance_sheet: balanceSheetWithNetWorth(2_000_000),
          section_c: sectionC([{
            ...asset("business", 2_000_000, 500_000),
            reported_form_code: ReportedFormCode.Form4797,
            form8949_standard_holding_period_confirmed: undefined,
            form8949_digital_asset: undefined,
          }]),
        })),
      ),
    Error,
    "reconciled income forms for non-Form 8949 Section C items",
  );
});

Deno.test("Form 8854 noncovered initial input reaches the registered XML path", () => {
  assertEquals(
    f8854.compute(
      { taxYear: 2025, formType: "f1040" },
      inputSchema.parse(input()),
    ).outputs,
    [],
  );
  assertEquals(
    inputSchema.safeParse(input({ tax_status_2025: undefined })).success,
    false,
  );
  assertThrows(
    () =>
      f8854.compute(
        { taxYear: 2025, formType: "f1040" },
        inputSchema.parse(input({
          tax_status_2025: "NONRESIDENT_OR_DUAL_STATUS",
        })),
      ),
    Error,
    "nonresident or dual-status returns cannot use this Form 1040 MeF path",
  );
});
