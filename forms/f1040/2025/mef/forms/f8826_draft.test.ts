import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { calculateForm8826, f8826 } from "../../../nodes/inputs/f8826/index.ts";
import { buildForm8826Document } from "./f8826_draft.ts";

const source = {
  eligible_expenditures: 20_000,
  prior_year_gross_receipts: 900_000,
  prior_year_full_time_employee_count: 40,
  subject_to_passive_activity_limit: false,
};

Deno.test("Form 8826 draft: source credit, numbered lines, and XML reconcile", () => {
  const lines = calculateForm8826(source);
  assertEquals(lines, {
    line1: 20_000,
    line3: 19_750,
    line5: 10_000,
    line6: 5_000,
    line8: 5_000,
  });
  const credit = f8826.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  ).outputs[0]?.fields.line6a_general_business_credit;
  assertEquals(credit, lines.line8);
  const xml = buildForm8826Document(source);
  assertStringIncludes(
    xml,
    "<TotalEligibleAccessExpendAmt>20000</TotalEligibleAccessExpendAmt>",
  );
  assertStringIncludes(
    xml,
    "<EligExpendAndMinDifferenceAmt>19750</EligExpendAndMinDifferenceAmt>",
  );
  assertStringIncludes(
    xml,
    "<SmallerFromDifferenceOrMaxAmt>10000</SmallerFromDifferenceOrMaxAmt>",
  );
  assertStringIncludes(xml, "<ShareOfCreditAmt>5000</ShareOfCreditAmt>");
  assertStringIncludes(
    xml,
    "<PrtshpandSCorpReportAmt>5000</PrtshpandSCorpReportAmt>",
  );
});

Deno.test("Form 8826 draft: absent eligibility facts or non-creditable expenses stop", () => {
  assertThrows(
    () => buildForm8826Document({ eligible_expenditures: 5_000 }),
  );
  assertThrows(
    () => buildForm8826Document({ ...source, eligible_expenditures: 250 }),
    Error,
    "no eligible source credit",
  );
  assertThrows(
    () =>
      buildForm8826Document({
        ...source,
        prior_year_gross_receipts: 1_000_001,
      }),
    Error,
    "no eligible source credit",
  );
  assertThrows(
    () =>
      buildForm8826Document({
        ...source,
        subject_to_passive_activity_limit: true,
      }),
    Error,
    "Form 8582-CR",
  );
});

Deno.test("Form 8826 draft: local TY2025 MeF source schema", async () => {
  const xsd = new URL(
    "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/CorporateIncomeTax/Common/IRS8826/IRS8826.xsd",
    import.meta.url,
  ).pathname;
  try {
    await Deno.stat(xsd);
  } catch {
    return;
  }
  const xml = buildForm8826Document(source).replace(
    "<IRS8826>",
    '<IRS8826 xmlns="http://www.irs.gov/efile">',
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
