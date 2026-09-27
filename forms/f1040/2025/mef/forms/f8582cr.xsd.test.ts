import { assertEquals } from "@std/assert";
import { PassiveCreditCategory } from "../../../nodes/intermediate/forms/form8582cr/index.ts";
import { form8582cr } from "./f8582cr.ts";

const XSD_PATH = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Common/IRS8582CR/IRS8582CR.xsd",
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
  name: "XSD: Form 8582-CR Part I and active-rental Part II",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const xml = form8582cr.build({
    credit_sources: [{
      activity_reference: "Rental house",
      source_form: "Form 8835",
      source_document_reference: "2025 rental credit statement",
      category: PassiveCreditCategory.ActiveRental,
      current_year_credit: 3_000,
      prior_unallowed_credit: 500,
      publicly_traded_partnership: false,
    }],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 10_000,
    filing_status: "single",
    modified_agi: 120_000,
    form8582_line9_special_allowance_used: 5_000,
    part_ii_tax_on_income_less_line14: 9_000,
  }).replace("<IRS8582CR>", '<IRS8582CR xmlns="http://www.irs.gov/efile">');
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
