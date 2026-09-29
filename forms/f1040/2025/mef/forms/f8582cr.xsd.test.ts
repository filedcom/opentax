import { assertEquals } from "@std/assert";
import {
  PassiveCreditCategory,
  PassiveCreditReportingRoute,
  PassiveCreditSourceOrigin,
} from "../../../nodes/intermediate/forms/form8582cr/index.ts";
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
      source_origin: { kind: PassiveCreditSourceOrigin.Self },
      source_document_reference: "2025 rental credit statement",
      category: PassiveCreditCategory.ActiveRental,
      reporting_route: PassiveCreditReportingRoute.Form3800Line3,
      form3800_credit_line: "1f",
      current_year_credit: 3_000,
      prior_unallowed_credits: [{
        originating_tax_year: 2024,
        credit_amount: 500,
        source_document_reference: "2024 rental credit carryover statement",
        actively_participated_origin_year: true,
      }],
      publicly_traded_partnership: false,
    }],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 10_000,
    filing_status: "single",
    modified_agi: 120_000,
    form8582_line9_special_allowance_used: 5_000,
    part_ii_tax_on_income_less_line14: 9_000,
  }).replace("<IRS8582CR>", '<IRS8582CR documentId="IRS8582CR0" xmlns="http://www.irs.gov/efile">');
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
  name: "XSD: Form 8582-CR rehabilitation and post-1989 housing limits",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const xml = form8582cr.build({
    credit_sources: [{
      activity_reference: "Rehabilitation building",
      source_form: "Form 3468",
      source_origin: { kind: PassiveCreditSourceOrigin.Self },
      source_document_reference: "2025 rehabilitation credit statement",
      category: PassiveCreditCategory.RehabilitationOrPre1990Housing,
      reporting_route: PassiveCreditReportingRoute.Form3800Line3,
      form3800_credit_line: "1a",
      current_year_credit: 2_000,
      prior_unallowed_credits: [],
      publicly_traded_partnership: false,
    }, {
      activity_reference: "Housing project",
      source_form: "Form 8586",
      source_origin: { kind: PassiveCreditSourceOrigin.Self },
      source_document_reference: "2025 low-income housing credit statement",
      category: PassiveCreditCategory.LowIncomeHousing,
      reporting_route: PassiveCreditReportingRoute.Form3800Line33,
      form3800_credit_line: "4d",
      current_year_credit: 2_000,
      prior_unallowed_credits: [],
      publicly_traded_partnership: false,
    }],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 10_000,
    filing_status: "single",
    modified_agi: 180_000,
    form8582_line9_special_allowance_used: 0,
    part_iii_tax_on_income_less_line26: 8_500,
    part_iv_tax_on_income_less_remaining_allowance: 7_000,
  }).replace("<IRS8582CR>", '<IRS8582CR documentId="IRS8582CR0" xmlns="http://www.irs.gov/efile">');
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
