import { assertEquals, assertStringIncludes } from "@std/assert";
import { createHash } from "node:crypto";
import { buildMefXml } from "../../../builder.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";
import {
  calculateExcessEvents,
  calculateSection1291Interest,
  ExcessEventKind,
} from "../../../../../nodes/inputs/income/foreign/f8621/excess_distribution.ts";
import { itemSchema, PficRegime } from "../../../../../nodes/inputs/income/foreign/f8621/index.ts";
import {
  type FilerIdentity,
  FilingStatus as MefFilingStatus,
} from "../../../types.ts";

const XSD_PATH = new URL(
  "../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
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
const copy = (document_id: string, content: string) => {
  const bytes = new TextEncoder().encode(content);
  return {
    document_id,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes_base64: btoa(String.fromCharCode(...bytes)),
  };
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
    parent_source: {
      corporation_address: {
        line1: "1 Fund Quay",
        city: "Dublin",
        country_code: "EI",
      },
      corporation_tax_year_start: "2025-01-01",
      corporation_tax_year_end: "2025-12-31",
      share_classes: [{
        description: "Ordinary",
        year_end_shares: 100,
        year_end_value_usd: 10_000,
      }],
      jointly_owned_with_spouse: false,
      shares_acquired_during_2025: false,
      election_status: "section1291_no_new_election",
      no_outstanding_section1294_election: true,
      issuer_record: copy("issuer-2025", "2025 issuer holdings"),
      section1291_prior_distribution_records: [{
        source_event_index: 0,
        tax_year: 2024,
        currency_code: "USD",
        amount: 0,
        ...copy("issuer-2024", "2024 issuer distributions zero"),
      }],
    },
    excess_events: [event],
  });
  const interest = Math.round(
    calculateSection1291Interest(2024, 5_006.84 * 0.37),
  );
  const excessEvents = calculateExcessEvents(event);
  const section1291Income = excessEvents.reduce(
    (sum, result) => sum + result.line16b_current_and_pre_pfic_income,
    0,
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
    schedule1: { line8z_form8621_section1291: section1291Income },
    schedule2: { line17p_form8621_interest: interest },
    form8621: {
      items: [{ item, excessEvents }],
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
