import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildMefXml } from "../builder.ts";
import { type FilerIdentity, FilingStatus } from "../types.ts";

const XSD_PATH = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

let xsdAvailable = false;
try {
  Deno.statSync(XSD_PATH);
  xsdAvailable = true;
} catch {
  // The official IRS schema bundle is local-only.
}

const filer: FilerIdentity = {
  primarySSN: "123456789",
  nameLine1: "TAXPAYER TEST",
  nameControl: "TAXP",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
  softwareId: "12345678",
  originator: { efin: "123456", originatorType: "ERO" },
};

Deno.test({
  name: "XSD: Schedule B Part III-only FBAR filing and country codes",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const xml = buildMefXml({
    f1040: { filing_status: "single" },
    schedule_b: {
      foreign_accounts_question: true,
      fincen_form114_required: true,
      foreign_country_codes: ["CA", "FR"],
      foreign_trust_question: false,
    },
  }, filer);
  assertStringIncludes(xml, "<IRS1040ScheduleB");
  assertStringIncludes(xml, "<FinCENForm114Ind>true</FinCENForm114Ind>");
  assertStringIncludes(xml, "<ForeignCountryCd>CA</ForeignCountryCd>");
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const result = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", XSD_PATH, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
  } finally {
    await Deno.remove(path);
  }
});

Deno.test({
  name: "XSD: Schedule B accepts more than 15 native dividend payers",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const xml = buildMefXml({
    f1040: { filing_status: "single", line3b_ordinary_dividends: 1_600 },
    schedule_b: {
      dividend_rows: Array.from({ length: 16 }, (_, index) => ({
        payerName: `Fund ${index + 1}`,
        amount: 100,
      })),
      print_line6_total: 1_600,
      foreign_accounts_question: false,
      foreign_trust_question: false,
    },
  }, filer);
  assertEquals((xml.match(/<Form1040SchBPartII>/g) ?? []).length, 16);
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const result = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", XSD_PATH, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
  } finally {
    await Deno.remove(path);
  }
});

Deno.test({
  name: "XSD: Schedule B seller-financed buyer and interest adjustments",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const xml = buildMefXml({
    f1040: { filing_status: "single", line2b_taxable_interest: 1_850 },
    schedule_b: {
      seller_financed_rows: [{
        buyer: {
          address_type: "us",
          name: "Jane Buyer",
          ssn: "123456789",
          address_line1: "456 Oak Ave",
          city: "Austin",
          state: "TX",
          zip: "78701",
        },
        amount: 200,
      }],
      interest_rows: [{ payerName: "Bond Bank", amount: 2_000 }],
      interest_line1_subtotal: 2_200,
      interest_nominee: 100,
      interest_accrued: 50,
      interest_oid_adjustment: 75,
      interest_bond_premium: 125,
      print_line2_total: 1_850,
      print_line4_total: 1_850,
      foreign_accounts_question: false,
      foreign_trust_question: false,
    },
  }, filer);
  assertStringIncludes(xml, "<SellerFinancedNm>Jane Buyer</SellerFinancedNm>");
  assertStringIncludes(
    xml,
    "<TaxableInterestSubtotalAmt>1850</TaxableInterestSubtotalAmt>",
  );
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const result = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", XSD_PATH, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
  } finally {
    await Deno.remove(path);
  }
});

Deno.test({
  name: "XSD: Schedule B nominee dividends report gross line 5 and net line 6",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const xml = buildMefXml({
    f1040: { filing_status: "single", line3b_ordinary_dividends: 600 },
    schedule_b: {
      dividend_rows: [{ payerName: "Fund", amount: 1_000 }],
      dividend_line5_subtotal: 1_000,
      dividend_nominee: 400,
      print_line6_total: 600,
      foreign_accounts_question: false,
      foreign_trust_question: false,
    },
  }, filer);
  assertStringIncludes(xml, "<NomineeDividendAmt ");
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const result = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", XSD_PATH, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
  } finally {
    await Deno.remove(path);
  }
});

Deno.test({
  name: "XSD: Schedule B seller-financed foreign buyer address",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const xml = buildMefXml({
    f1040: { filing_status: "single", line2b_taxable_interest: 900 },
    schedule_b: {
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
    },
  }, filer);
  assertStringIncludes(xml, "<SellerFinancedAddressForeign>");
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const result = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", XSD_PATH, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
  } finally {
    await Deno.remove(path);
  }
});
