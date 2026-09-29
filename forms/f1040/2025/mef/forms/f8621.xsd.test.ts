import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildMefXml } from "../builder.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import {
  calculateExcessEvents,
  calculateSection1291Interest,
  ExcessEventKind,
} from "../../../nodes/inputs/f8621/excess_distribution.ts";
import { itemSchema, PficRegime } from "../../../nodes/inputs/f8621/index.ts";
import {
  type FilerIdentity,
  FilingStatus as MefFilingStatus,
} from "../types.ts";

const XSD_PATH = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

let xsdAvailable = false;
try {
  Deno.statSync(XSD_PATH);
  xsdAvailable = true;
} catch {
  // The IRS schema bundle is local-only.
}

const filer: FilerIdentity = {
  primarySSN: "123456789",
  fullName: "Alex Taxpayer",
  nameLine1: "TAXPAYER ALEX",
  nameControl: "TAXP",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: MefFilingStatus.Single,
  softwareId: "12345678",
  originator: { efin: "123456", originatorType: "ERO" },
};

Deno.test({
  name:
    "XSD: Form 8621 Part V links its statement, line 16 tax, and line 17p interest",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const event = {
    kind: ExcessEventKind.Distribution as const,
    holding_period_start: "2024-01-01",
    first_pfic_tax_year: 2024,
    shares_in_block: 100,
    prior_year_distributions: [{ tax_year: 2024, amount_usd: 0 }],
    current_year_distributions: [{
      date: "2025-12-31",
      amount_usd: 10_000,
      year_charges: [],
    }],
    taxable_nonexcess_dividend_usd: 0,
  };
  const item = itemSchema.parse({
    company_name: "Offshore Fund Ltd",
    company_ein_or_ref: "FUND001",
    country_of_incorporation: "Ireland",
    regime: PficRegime.EXCESS_DISTRIBUTION,
    shares_owned: 100,
    fmv_at_year_end: 10_000,
    excess_events: [event],
  });
  const interest = Math.round(
    calculateSection1291Interest(2024, 5_006.84 * 0.37),
  );
  const xml = buildMefXml({
    f1040: {
      filing_status: "single",
      line9_total_income: 4_993,
      line11_agi: 4_993,
      line15_taxable_income: 4_993,
      line16_income_tax: 1_853,
      form8621_tax: 1_853,
      line18_total_tax_before_credits: 1_853,
      line23_other_taxes: interest,
      line24_total_tax: 1_853 + interest,
    },
    schedule2: { line17p_form8621_interest: interest },
    form8621: {
      items: [{ item, excessEvents: calculateExcessEvents(event) }],
    },
  }, filer);
  assertStringIncludes(xml, "<IRS8621 documentId=");
  assertStringIncludes(
    xml,
    "<ForeignEntityReferenceIdNum>FUND001</ForeignEntityReferenceIdNum>",
  );
  assertStringIncludes(xml, "<OtherTaxAmtCd>1291TAX</OtherTaxAmtCd>");
  assertStringIncludes(
    xml,
    "<TotalPFICDistriDurCurrTYAmt>10000</TotalPFICDistriDurCurrTYAmt>",
  );
  assertStringIncludes(
    xml,
    "<DistributionsIn3PrecedingTYAmt>0</DistributionsIn3PrecedingTYAmt>",
  );
  assertStringIncludes(
    xml,
    "<AggregateIncrLessFrgnTxCrAmt>1853</AggregateIncrLessFrgnTxCrAmt>",
  );
  assertStringIncludes(
    xml,
    "<InterestOnEachNetIncrInTaxAmt referenceDocumentId=",
  );
  assertStringIncludes(xml, "<TaxationOfExcessDistriStmt documentId=");
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
