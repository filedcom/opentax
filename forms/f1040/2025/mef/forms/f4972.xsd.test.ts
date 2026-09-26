import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildMefXml } from "../builder.ts";
import { type FilerIdentity, FilingStatus } from "../types.ts";
import { TS } from "../../../nodes/types.ts";

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
  filingStatus: FilingStatus.Single,
  softwareId: "12345678",
  originator: { efin: "123456", originatorType: "ERO" },
};

Deno.test({
  name: "XSD: 2025 Form 4972 tax links to Form 1040 line 16",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const xml = buildMefXml({
    f1040: {
      filing_status: "single",
      line16_income_tax: 14_710,
      form4972_tax: 14_710,
    },
    form4972: {
      recipient: TS.T,
      born_before_1936: true,
      entire_balance_distributed: true,
      rolled_over_any: false,
      participant_five_year_member: true,
      prior_election_after_1986: false,
      line6: 10_000,
      line7: 2_000,
      line8: 90_000,
      line10: 90_000,
      line12: 90_000,
      line17: 90_000,
      line19: 90_000,
      line25: 12_710,
      line29: 12_710,
      line30: 14_710,
    },
  }, filer);
  assertStringIncludes(xml, "<Form4972Ind referenceDocumentId=");
  assertStringIncludes(
    xml,
    "<LumpSumDistributionTaxAmt>14710</LumpSumDistributionTaxAmt>",
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
