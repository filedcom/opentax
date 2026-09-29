import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { buildPending } from "../pending.ts";
import { scheduleB } from "./schedule_b.ts";

function assertNotIncludes(actual: string, expected: string) {
  assertEquals(
    actual.includes(expected),
    false,
    `Expected string NOT to include: ${expected}`,
  );
}

// ---------------------------------------------------------------------------
// Section 1: Empty input
// ---------------------------------------------------------------------------

Deno.test("schedule_b: empty object returns empty string", () => {
  assertEquals(scheduleB.build({}), "");
});

// ---------------------------------------------------------------------------
// Section 2: Unknown keys ignored
// ---------------------------------------------------------------------------

Deno.test("schedule_b: all unknown keys returns empty string", () => {
  assertEquals(
    scheduleB.build({ junk: 999, foo: "bar", payer_name: "Bank" }),
    "",
  );
});

// ---------------------------------------------------------------------------
// Section 3: Below-threshold input
// ---------------------------------------------------------------------------

Deno.test("schedule_b: zero taxable interest does not file the form", () => {
  const result = scheduleB.build({ taxable_interest_net: 0 });
  assertEquals(result, "");
});

// ---------------------------------------------------------------------------
// Section 4: Per-field mapping (one test per field, 3 fields)
// ---------------------------------------------------------------------------

Deno.test("schedule_b: taxable_interest_net maps to TaxableInterestSubtotalAmt", () => {
  const result = scheduleB.build({
    taxable_interest_net: 3000,
    foreign_accounts_question: false,
    foreign_trust_question: false,
  });
  assertStringIncludes(
    result,
    "<TaxableInterestSubtotalAmt>3000</TaxableInterestSubtotalAmt>",
  );
});

Deno.test("schedule_b: gross interest and adjustment lines reconcile to line 2", () => {
  const xml = scheduleB.build({
    interest_rows: [{ payerName: "Bond Bank", amount: 2_000 }],
    interest_line1_subtotal: 2_000,
    interest_nominee: 100,
    interest_accrued: 50,
    interest_oid_adjustment: 75,
    interest_bond_premium: 125,
    print_line2_total: 1_650,
    print_line4_total: 1_650,
    foreign_accounts_question: false,
    foreign_trust_question: false,
  });
  assertStringIncludes(
    xml,
    '<InterestSubtotalAmt interestSubtotalLiteralCd="INTEREST SUBTOTAL">2000</InterestSubtotalAmt>',
  );
  assertStringIncludes(
    xml,
    '<NomineeInterestAmt nomineeInterestLiteralCd="NOMINEE DISTRIBUTION">100</NomineeInterestAmt>',
  );
  assertStringIncludes(
    xml,
    '<AccruedInterestAmt accruedInterestLiteralCd="ACCRUED INTEREST">50</AccruedInterestAmt>',
  );
  assertStringIncludes(
    xml,
    '<OriginalIssueDiscountAdjAmt originalIssueDiscountAdjLitCd="OID ADJUSTMENT">75</OriginalIssueDiscountAdjAmt>',
  );
  assertStringIncludes(
    xml,
    '<AmortizableBondPremAdjAmt amortizableBondPremiumAdjLitCd="ABP ADJUSTMENT">125</AmortizableBondPremAdjAmt>',
  );
  assertStringIncludes(
    xml,
    "<TaxableInterestSubtotalAmt>1650</TaxableInterestSubtotalAmt>",
  );
  assertThrows(() =>
    scheduleB.build({
      interest_rows: [{ payerName: "Bond Bank", amount: 2_000 }],
      interest_nominee: 100,
      print_line2_total: 1_650,
      foreign_accounts_question: false,
      foreign_trust_question: false,
    })
  );
});

Deno.test("schedule_b: seller-financed buyer row precedes ordinary interest", () => {
  const seller = {
    buyer: {
      address_type: "us" as const,
      name: "Jane Buyer",
      ssn: "123456789",
      address_line1: "456 Oak Ave",
      city: "Austin",
      state: "TX",
      zip: "78701",
    },
    amount: 200,
  };
  const xml = scheduleB.build({
    seller_financed_rows: [seller],
    interest_rows: [{ payerName: "Bank", amount: 100 }],
    interest_line1_subtotal: 300,
    print_line2_total: 300,
    print_line4_total: 300,
    foreign_accounts_question: false,
    foreign_trust_question: false,
  });
  assertStringIncludes(xml, "<SellerFinancedNm>Jane Buyer</SellerFinancedNm>");
  assertStringIncludes(xml, "<AddressLine1Txt>456 Oak Ave</AddressLine1Txt>");
  assertStringIncludes(xml, "<SellerFinancedSSN>123456789</SellerFinancedSSN>");
  assertStringIncludes(
    xml,
    "<TotalSellerFinancedMortgIntAmt>200</TotalSellerFinancedMortgIntAmt>",
  );
  assertEquals(
    xml.indexOf("<Form1040SchBPartIGroup1>") <
      xml.indexOf("<Form1040SchBPartIGroup2>"),
    true,
  );
  assertThrows(() =>
    scheduleB.build({
      seller_financed_rows: [seller],
      print_line2_total: 100,
      foreign_accounts_question: false,
      foreign_trust_question: false,
    })
  );
});

Deno.test("schedule_b: foreign seller-financed buyer uses the foreign address choice", () => {
  const xml = scheduleB.build({
    seller_financed_rows: [{
      buyer: {
        address_type: "foreign",
        name: "Jane Buyer",
        ssn: "123456789",
        address_line1: "10 Queen St",
        city: "Toronto",
        province_or_state: "Ontario",
        country_code: "CA",
        foreign_postal_code: "M5H2N2",
      },
      amount: 900,
    }],
    interest_line1_subtotal: 900,
    print_line2_total: 900,
    print_line4_total: 900,
    foreign_accounts_question: false,
    foreign_trust_question: false,
  });
  assertStringIncludes(xml, "<SellerFinancedAddressForeign>");
  assertStringIncludes(xml, "<ProvinceOrStateNm>Ontario</ProvinceOrStateNm>");
  assertStringIncludes(xml, "<CountryCd>CA</CountryCd>");
  assertStringIncludes(xml, "<ForeignPostalCd>M5H2N2</ForeignPostalCd>");
  assertNotIncludes(xml, "<SellerFinancedAddressUS>");
});

Deno.test("schedule_b: MeF refuses a required Part III with unanswered questions", () => {
  assertThrows(() => scheduleB.build({ taxable_interest_net: 1_501 }));
  assertThrows(() =>
    scheduleB.build({
      ordinaryDividends: 1_501,
      foreign_accounts_question: false,
    })
  );
});

Deno.test("schedule_b: ee_bond_exclusion maps to ExcludableSavingsBondIntAmt", () => {
  const result = scheduleB.build({
    taxable_interest_net: 1_000,
    ee_bond_exclusion: 500,
    foreign_accounts_question: false,
    foreign_trust_question: false,
  });
  assertStringIncludes(
    result,
    "<ExcludableSavingsBondIntAmt>500</ExcludableSavingsBondIntAmt>",
  );
});

Deno.test("schedule_b: below-threshold ordinary dividends do not file the form", () => {
  const result = scheduleB.build({ ordinaryDividends: 1200 });
  assertEquals(result, "");
});

Deno.test("schedule_b: nominee dividends reconcile gross line 5 to net line 6", () => {
  const xml = scheduleB.build({
    dividend_rows: [{ payerName: "Fund", amount: 1_000 }],
    dividend_line5_subtotal: 1_000,
    dividend_nominee: 400,
    print_line6_total: 600,
    foreign_accounts_question: false,
    foreign_trust_question: false,
  });
  assertStringIncludes(xml, "<DividendAmt>1000</DividendAmt>");
  assertStringIncludes(
    xml,
    '<OrdinaryDividendSubtotalAmt dividendSubtotalLiteralCd="DIVIDEND SUBTOTAL">1000</OrdinaryDividendSubtotalAmt>',
  );
  assertStringIncludes(
    xml,
    '<NomineeDividendAmt nomineeDividendLiteralCd="NOMINEE DISTRIBUTION">400</NomineeDividendAmt>',
  );
  assertStringIncludes(
    xml,
    "<TotalOrdinaryDividendsAmt>600</TotalOrdinaryDividendsAmt>",
  );
  assertThrows(() =>
    scheduleB.build({
      dividend_rows: [{ payerName: "Fund", amount: 1_000 }],
      dividend_nominee: 400,
      print_line6_total: 700,
      foreign_accounts_question: false,
      foreign_trust_question: false,
    })
  );
});

Deno.test("schedule_b: combined parent and Form 8814 dividends include payer rows", () => {
  const xml = scheduleB.build({
    dividend_info: [{ payerName: "Fund A", amount: 1_200 }],
    form8814_dividends: 500,
    print_line6_total: 1_700,
    dividend_rows: [
      { payerName: "Fund A", amount: 1_200 },
      { payerName: "Form 8814", amount: 500 },
    ],
    foreign_accounts_question: false,
    foreign_trust_question: false,
  });
  assertStringIncludes(
    xml,
    "<BusinessNameLine1Txt>Fund A</BusinessNameLine1Txt>",
  );
  assertStringIncludes(
    xml,
    "<BusinessNameLine1Txt>Form 8814</BusinessNameLine1Txt>",
  );
  assertStringIncludes(
    xml,
    "<TotalOrdinaryDividendsAmt>1700</TotalOrdinaryDividendsAmt>",
  );
});

Deno.test("schedule_b: all 16 dividend payer rows enter native MeF", () => {
  const xml = scheduleB.build({
    dividend_rows: Array.from({ length: 16 }, (_, index) => ({
      payerName: `Fund ${index + 1}`,
      amount: 100,
    })),
    print_line6_total: 1_600,
    foreign_accounts_question: false,
    foreign_trust_question: false,
  });
  assertEquals((xml.match(/<Form1040SchBPartII>/g) ?? []).length, 16);
  assertStringIncludes(
    xml,
    "<BusinessNameLine1Txt>Fund 16</BusinessNameLine1Txt>",
  );
  assertStringIncludes(
    xml,
    "<TotalOrdinaryDividendsAmt>1600</TotalOrdinaryDividendsAmt>",
  );
});

Deno.test("schedule_b: information-only below-threshold dividends do not file the form", () => {
  assertEquals(
    scheduleB.build({
      dividend_info: [{ payerName: "Fund A", amount: 1_200 }],
      print_line6_total: 1_200,
    }),
    "",
  );
});

Deno.test("schedule_b: No foreign answers do not force a below-threshold filing", () => {
  assertEquals(
    scheduleB.build({
      dividend_info: [{ payerName: "Fund A", amount: 1_200 }],
      print_line6_total: 1_200,
      foreign_accounts_question: false,
      foreign_trust_question: false,
    }),
    "",
  );
});

Deno.test("schedule_b: $1,500 income thresholds are separate and strict", () => {
  assertEquals(
    scheduleB.build({
      taxable_interest_net: 800,
      ordinaryDividends: 900,
    }),
    "",
  );
  assertEquals(scheduleB.build({ taxable_interest_net: 1_500 }), "");
  assertEquals(scheduleB.build({ ordinaryDividends: 1_500 }), "");
  assertStringIncludes(
    scheduleB.build({
      taxable_interest_net: 1_501,
      foreign_accounts_question: false,
      foreign_trust_question: false,
    }),
    "<IRS1040ScheduleB>",
  );
  assertStringIncludes(
    scheduleB.build({
      ordinaryDividends: 1_501,
      foreign_accounts_question: false,
      foreign_trust_question: false,
    }),
    "<IRS1040ScheduleB>",
  );
});

Deno.test("schedule_b: savings bond exclusion requires enough line 2 interest", () => {
  assertThrows(() => scheduleB.build({ ee_bond_exclusion: 1 }));
  assertThrows(() =>
    scheduleB.build({
      taxable_interest_net: 300,
      ee_bond_exclusion: 500,
    })
  );
  assertThrows(() =>
    scheduleB.build({
      taxable_interest_net: 1_000,
      ee_bond_exclusion: 500,
      print_line4_total: 600,
    })
  );
});

Deno.test("schedule_b: Part III No answers alone do not create a document", () => {
  assertEquals(
    scheduleB.build({
      foreign_accounts_question: false,
      foreign_trust_question: false,
    }),
    "",
  );
});

Deno.test("schedule_b: Form 8814 foreign-account and trust answers file Part III", () => {
  const xml = scheduleB.build({
    form8814_foreign_account: true,
    foreign_accounts_question: true,
    fincen_form114_required: false,
    form8814_foreign_trust: true,
    foreign_trust_question: true,
  });
  assertStringIncludes(xml, "<Form8814LiteralCd>FORM8814</Form8814LiteralCd>");
  assertStringIncludes(
    xml,
    "<ForeignAccountsQuestionInd>true</ForeignAccountsQuestionInd>",
  );
  assertStringIncludes(xml, "<FinCENForm114Ind>false</FinCENForm114Ind>");
  assertStringIncludes(
    xml,
    "<TrustFormLiteralCd>FORM8814</TrustFormLiteralCd>",
  );
  assertStringIncludes(
    xml,
    "<ForeignTrustQuestionInd>true</ForeignTrustQuestionInd>",
  );
});

Deno.test("schedule_b: FBAR Yes carries ordered IRS country codes", () => {
  const xml = scheduleB.build({
    foreign_accounts_question: true,
    fincen_form114_required: true,
    foreign_country_codes: ["CA", "FR"],
    foreign_trust_question: false,
  });
  assertStringIncludes(xml, "<FinCENForm114Ind>true</FinCENForm114Ind>");
  assertStringIncludes(
    xml,
    "<ForeignCountryCd>CA</ForeignCountryCd><ForeignCountryCd>FR</ForeignCountryCd>",
  );
  assertStringIncludes(
    xml,
    "<ForeignTrustQuestionInd>false</ForeignTrustQuestionInd>",
  );
});

// ---------------------------------------------------------------------------
// Section 5: Sparse output
// ---------------------------------------------------------------------------

Deno.test("schedule_b: single income category emits only its elements", () => {
  const result = scheduleB.build({
    taxable_interest_net: 1_600,
    foreign_accounts_question: false,
    foreign_trust_question: false,
  });
  assertStringIncludes(
    result,
    "<TaxableInterestSubtotalAmt>1600</TaxableInterestSubtotalAmt>",
  );
  assertNotIncludes(result, "<ExcludableSavingsBondIntAmt>");
  assertNotIncludes(result, "<TotalOrdinaryDividendsAmt>");
});

// ---------------------------------------------------------------------------
// Section 6: All fields present
// ---------------------------------------------------------------------------

const allFields = {
  taxable_interest_net: 3000,
  ee_bond_exclusion: 500,
  ordinaryDividends: 1200,
  foreign_accounts_question: false,
  foreign_trust_question: false,
};

Deno.test("schedule_b: all 3 fields present: output wrapped in IRS1040ScheduleB tag", () => {
  const result = scheduleB.build(allFields);
  assertStringIncludes(result, "<IRS1040ScheduleB>");
  assertStringIncludes(result, "</IRS1040ScheduleB>");
});

Deno.test("schedule_b: all 3 fields present: all elements emitted", () => {
  const result = scheduleB.build(allFields);
  assertStringIncludes(
    result,
    "<TaxableInterestSubtotalAmt>3000</TaxableInterestSubtotalAmt>",
  );
  assertStringIncludes(
    result,
    "<ExcludableSavingsBondIntAmt>500</ExcludableSavingsBondIntAmt>",
  );
  assertStringIncludes(
    result,
    "<TotalOrdinaryDividendsAmt>1200</TotalOrdinaryDividendsAmt>",
  );
});

// ---------------------------------------------------------------------------
// Section 7: Source-backed interest rows
// ---------------------------------------------------------------------------

Deno.test("schedule_b: payer name and amount emit an IRS interest row", () => {
  const result = scheduleB.build({
    payer_name: "Bank of America",
    taxable_interest_net: 3000,
    foreign_accounts_question: false,
    foreign_trust_question: false,
  });
  assertStringIncludes(
    result,
    "<TaxableInterestSubtotalAmt>3000</TaxableInterestSubtotalAmt>",
  );
  assertStringIncludes(
    result,
    "<BusinessNameLine1Txt>Bank of America</BusinessNameLine1Txt>",
  );
  assertStringIncludes(result, "<InterestAmt>3000</InterestAmt>");
  assertStringIncludes(result, 'interestSubtotalLiteralCd="INTEREST SUBTOTAL"');
  assertStringIncludes(
    result,
    "<CalculatedTotalTaxableIntAmt>3000</CalculatedTotalTaxableIntAmt>",
  );
});

Deno.test("schedule_b: multiple source interest rows reconcile to line 2", () => {
  const xml = scheduleB.build({
    payer_name: ["Bank A", "Bond issuer"],
    taxable_interest_net: [100, 275],
    print_line2_total: 375,
    print_line4_total: 375,
    foreign_accounts_question: false,
    foreign_trust_question: true,
  });
  assertEquals(xml.split("<Form1040SchBPartIGroup2>").length - 1, 2);
  assertStringIncludes(
    xml,
    "<TaxableInterestSubtotalAmt>375</TaxableInterestSubtotalAmt>",
  );
  assertThrows(
    () =>
      scheduleB.build({
        payer_name: ["Bank A"],
        taxable_interest_net: [100, 275],
        foreign_accounts_question: false,
        foreign_trust_question: true,
      }),
    Error,
    "pair one-to-one",
  );
});

Deno.test("schedule_b: normalized graph output keeps every source interest row", () => {
  const pending = buildPending({
    schedule_b: {
      payer_name: ["Bank A", "Bond issuer"],
      taxable_interest_net: [100, 275],
      interest_rows: [
        { payerName: "Bank A", amount: 100 },
        { payerName: "Bond issuer", amount: 275 },
      ],
      print_line2_total: 375,
      print_line4_total: 375,
      foreign_accounts_question: false,
      foreign_trust_question: true,
    },
  });
  const xml = scheduleB.build(pending.schedule_b ?? {});
  assertEquals(xml.split("<Form1040SchBPartIGroup2>").length - 1, 2);
  assertStringIncludes(xml, "<InterestAmt>100</InterestAmt>");
  assertStringIncludes(xml, "<InterestAmt>275</InterestAmt>");
});

Deno.test("schedule_b: source interest detail follows the IRS 2025 schema", async () => {
  const xsd = new URL(
    "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Common/IRS1040ScheduleB/IRS1040ScheduleB.xsd",
    import.meta.url,
  ).pathname;
  try {
    await Deno.stat(xsd);
  } catch {
    return;
  }
  const xml = scheduleB.build({
    payer_name: ["Bank A", "Bond issuer"],
    taxable_interest_net: [100, 275],
    foreign_accounts_question: false,
    foreign_trust_question: true,
  }).replace(
    "<IRS1040ScheduleB>",
    '<IRS1040ScheduleB xmlns="http://www.irs.gov/efile" documentId="IRS1040ScheduleB1">',
  );
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(path);
  }
});
