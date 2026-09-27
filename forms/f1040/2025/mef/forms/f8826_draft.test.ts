import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { calculateForm8826, f8826 } from "../../../nodes/inputs/f8826/index.ts";
import { f3800 } from "../../../nodes/inputs/f3800/index.ts";
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
    line7: 0,
    line8: 5_000,
    selfCreditAfterCap: 5_000,
    passThroughCreditsAfterCap: [],
  });
  const forwarded = f8826.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  ).outputs[0];
  assertEquals(forwarded?.nodeType, "f3800");
  const credit = f3800.inputSchema.parse(forwarded?.fields)
    .f8826_credit_entries?.[0]?.credit_amount;
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

Deno.test("Form 8826 draft: line 7 pass-through credit and combined $5,000 cap", () => {
  const mixed = {
    ...source,
    eligible_expenditures: 5_000,
    pass_through_credits: [{
      entity_type: "partnership" as const,
      entity_ein: "123456789",
      credit_amount: 3_000,
      subject_to_passive_activity_limit: false,
    }],
  };
  const lines = calculateForm8826(mixed);
  assertEquals(lines.line6, 2_375);
  assertEquals(lines.line7, 3_000);
  assertEquals(lines.line8, 5_000);
  assertEquals(lines.selfCreditAfterCap, 2_209.30);
  assertEquals(lines.passThroughCreditsAfterCap, [2_790.70]);
  const xml = buildForm8826Document(mixed);
  assertStringIncludes(
    xml,
    "<PrtshpandSCorpDisabledAcsCrAmt>3000</PrtshpandSCorpDisabledAcsCrAmt>",
  );
  assertStringIncludes(
    xml,
    "<PrtshpandSCorpReportAmt>5000</PrtshpandSCorpReportAmt>",
  );
  const output = f8826.compute(
    { taxYear: 2025, formType: "f1040" },
    mixed,
  ).outputs[0];
  assertEquals(f3800.inputSchema.parse(output?.fields).f8826_credit_entries, [
    {
      source_type: "self",
      credit_amount: 2_209.30,
      subject_to_passive_activity_limit: false,
    },
    {
      source_type: "partnership",
      source_ein: "123456789",
      credit_amount: 2_790.70,
      subject_to_passive_activity_limit: false,
    },
  ]);
});

Deno.test("Form 8826 draft: pass-through-only source goes to Form 3800 without Form 8826", () => {
  const passThroughOnly = {
    eligible_expenditures: 0,
    subject_to_passive_activity_limit: false,
    pass_through_credits: [{
      entity_type: "s_corporation" as const,
      entity_ein: "987654321",
      credit_amount: 1_250,
      subject_to_passive_activity_limit: false,
    }],
  };
  const output = f8826.compute(
    { taxYear: 2025, formType: "f1040" },
    passThroughOnly,
  ).outputs[0];
  assertEquals(
    f3800.inputSchema.parse(output?.fields).f8826_credit_entries?.[0]
      ?.credit_amount,
    1_250,
  );
  assertThrows(
    () => buildForm8826Document(passThroughOnly),
    Error,
    "without Form 8826",
  );
});

Deno.test("Form 8826 draft: passive K-1 credit and ineligible self-credit stop", () => {
  const passThrough = {
    entity_type: "partnership" as const,
    entity_ein: "123456789",
    credit_amount: 1_000,
    subject_to_passive_activity_limit: true,
  };
  assertThrows(
    () =>
      f8826.compute({ taxYear: 2025, formType: "f1040" }, {
        ...source,
        pass_through_credits: [passThrough],
      }),
    Error,
    "Form 8582-CR",
  );
  assertThrows(
    () =>
      buildForm8826Document({ ...source, pass_through_credits: [passThrough] }),
    Error,
    "Form 8582-CR",
  );
  assertThrows(
    () =>
      buildForm8826Document({
        ...source,
        eligible_expenditures: 5_000,
        prior_year_gross_receipts: 1_000_001,
        pass_through_credits: [{
          ...passThrough,
          subject_to_passive_activity_limit: false,
        }],
      }),
    Error,
    "ineligible self-earned credit",
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
  for (
    const facts of [
      source,
      {
        ...source,
        eligible_expenditures: 5_000,
        pass_through_credits: [{
          entity_type: "partnership" as const,
          entity_ein: "123456789",
          credit_amount: 3_000,
          subject_to_passive_activity_limit: false,
        }],
      },
    ]
  ) {
    const xml = buildForm8826Document(facts).replace(
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
  }
});
