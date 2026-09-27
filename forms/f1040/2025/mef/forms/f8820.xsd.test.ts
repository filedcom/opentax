import { assertEquals } from "@std/assert";
import { buildForm8820Document } from "./f8820.ts";

const XSD_PATH = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/CorporateIncomeTax/Common/IRS8820/IRS8820.xsd",
  import.meta.url,
).pathname;

let xsdAvailable = false;
try {
  Deno.statSync(XSD_PATH);
  xsdAvailable = true;
} catch {
  // The official IRS schema bundle is local-only.
}

Deno.test({
  name: "XSD: Form 8820 source document maps Part I and orphan-drug details",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const xml = buildForm8820Document({
    f8820s: [{
      generic_name: "Test Orphan Drug",
      designation_application_number: "FDA-123",
      designation_date: "2024-03-15",
      qualified_clinical_testing_expenses: 100_000,
      qualifying_testing_confirmed: true,
      expenses_exclude_third_party_funding: true,
      expenses_not_used_for_research_credit: true,
    }],
    reduced_section280c_credit_election: true,
    form8932_overlapping_wage_credit: 1_250,
    subject_to_passive_activity_limit: false,
  }).replace("<IRS8820>", '<IRS8820 xmlns="http://www.irs.gov/efile">');
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
