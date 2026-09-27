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
// Section 3: Zero value emitted
// ---------------------------------------------------------------------------

Deno.test("schedule_b: taxable_interest_net at zero is emitted", () => {
  const result = scheduleB.build({ taxable_interest_net: 0 });
  assertStringIncludes(
    result,
    "<TaxableInterestSubtotalAmt>0</TaxableInterestSubtotalAmt>",
  );
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
  const result = scheduleB.build({ ee_bond_exclusion: 500 });
  assertStringIncludes(
    result,
    "<ExcludableSavingsBondIntAmt>500</ExcludableSavingsBondIntAmt>",
  );
});

Deno.test("schedule_b: ordinaryDividends maps to TotalOrdinaryDividendsAmt", () => {
  const result = scheduleB.build({ ordinaryDividends: 1200 });
  assertStringIncludes(
    result,
    "<TotalOrdinaryDividendsAmt>1200</TotalOrdinaryDividendsAmt>",
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

Deno.test("schedule_b: single known field emits only that element, absent fields omitted", () => {
  const result = scheduleB.build({ taxable_interest_net: 1000 });
  assertStringIncludes(
    result,
    "<TaxableInterestSubtotalAmt>1000</TaxableInterestSubtotalAmt>",
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
  }).replace(
    "<IRS1040ScheduleB>",
    '<IRS1040ScheduleB xmlns="http://www.irs.gov/efile">',
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
