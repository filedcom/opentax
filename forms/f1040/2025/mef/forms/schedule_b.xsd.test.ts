import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildMefXml } from "../builder.ts";
import { type FilerIdentity, FilingStatus } from "../types.ts";
import { scheduleB } from "./schedule_b.ts";

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

function buildScheduleBXml(
  fields: Parameters<typeof scheduleB.build>[0],
): string {
  // These cases validate the descriptor's native XML shape. The full return
  // exporter separately requires source-backed calculated pending fields.
  const base = buildMefXml({
    f1040: { filing_status: "single", digital_assets: false },
  }, filer);
  const fragment = scheduleB.build(fields);
  if (!fragment) throw new Error("Schedule B descriptor returned no document");
  const withId = fragment.replace(
    "<IRS1040ScheduleB>",
    '<IRS1040ScheduleB documentId="IRS1040ScheduleB0">',
  );
  return base.replace('documentCnt="1"', 'documentCnt="2"').replace(
    "</ReturnData>",
    `${withId}</ReturnData>`,
  );
}

Deno.test({
  name: "XSD: Schedule B Part III-only FBAR filing and country codes",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const xml = buildScheduleBXml({
    foreign_accounts_question: true,
    fincen_form114_required: true,
    foreign_country_codes: ["CA", "FR"],
    foreign_trust_question: false,
  });
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
  const xml = buildScheduleBXml({
    dividend_rows: Array.from({ length: 16 }, (_, index) => ({
      payerName: `Fund ${index + 1}`,
      amount: 100,
    })),
    print_line6_total: 1_600,
    foreign_accounts_question: false,
    foreign_trust_question: false,
  });
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
  const xml = buildScheduleBXml({
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
  });
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
  const xml = buildScheduleBXml({
    dividend_rows: [{ payerName: "Fund", amount: 1_000 }],
    dividend_line5_subtotal: 1_000,
    dividend_nominee: 400,
    print_line6_total: 600,
    foreign_accounts_question: false,
    foreign_trust_question: false,
  });
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
  const xml = buildScheduleBXml({
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
