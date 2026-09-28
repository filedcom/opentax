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
  name: "XSD: Form 8889 contributions, distributions, and HDHP recapture",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const xml = buildMefXml({
    form8889: {
      forms: [{
        owner: "primary",
        beneficiary_name: "Alex Taxpayer",
        beneficiary_ssn: "123456789",
        print_line1_coverage: "family",
        print_line2_taxpayer_contributions: 2_000,
        print_line3_limit: 8_550,
        print_line4_archer: 0,
        print_line5: 8_550,
        print_line6: 8_550,
        print_line7_catchup: 1_000,
        print_line8: 9_550,
        print_line9_employer: 3_000,
        print_line10: 0,
        print_line11: 3_000,
        print_line12: 6_550,
        print_line13_deduction: 2_000,
        print_line14a_distributions: 4_000,
        print_line14b_excluded_distributions: 0,
        print_line14c: 4_000,
        print_line15_qualified: 3_000,
        print_line16_taxable: 1_000,
        print_line17a_exception: true,
        print_line17b_penalty: 0,
        print_line18: 300,
        print_line19: 200,
        print_line20: 500,
        print_line21: 50,
      }],
    },
  }, filer);
  assertStringIncludes(xml, "<IRS8889 documentId=");
  assertStringIncludes(xml, "<RecipientSSN>123456789</RecipientSSN>");
  assertStringIncludes(
    xml,
    "<HDHPCoverageIncomeAmt>500</HDHPCoverageIncomeAmt>",
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
  name: "XSD: distribution-only Form 8889 has no line 1 coverage box",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const xml = buildMefXml({
    form8889: {
      forms: [{
        owner: "primary",
        beneficiary_name: "Alex Taxpayer",
        beneficiary_ssn: "123456789",
        print_line14a_distributions: 800,
        print_line14c: 800,
        print_line15_qualified: 500,
        print_line16_taxable: 300,
        print_line17b_penalty: 60,
      }],
    },
  }, filer);
  assertEquals(xml.includes("HDHPSelfOnlyCoverageInd"), false);
  assertEquals(xml.includes("HDHPFamilyCoverageInd"), false);
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
