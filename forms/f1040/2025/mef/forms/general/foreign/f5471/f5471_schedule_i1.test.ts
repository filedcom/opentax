import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  form8992Cfc,
  form8992Filer,
  form8992Pending,
} from "../../../../../domains/income/foreign/form8992/form8992.fixture.ts";
import { form5471ScheduleI1 } from "./f5471_schedule_i1.ts";

const xsd = new URL(
  "../../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/Shared/IRS5471ScheduleI1/IRS5471ScheduleI1.xsd",
  import.meta.url,
).pathname;
let schemaAvailable = false;
try {
  schemaAvailable = Deno.statSync(xsd).isFile;
} catch {
  // The research schema bundle is optional in other workspaces.
}

Deno.test("Category 5a Schedule I-1 reconciles functional and USD columns", () => {
  const xml = form5471ScheduleI1.build({}, {
    filer: form8992Filer,
    pending: form8992Pending,
  });
  assertStringIncludes(xml, "<SeparateCategoryCd>GEN</SeparateCategoryCd>");
  assertStringIncludes(xml, "<GrossIncomeAmt>65000</GrossIncomeAmt>");
  assertStringIncludes(
    xml,
    "<TotalIncomeExclusionAmt>10000</TotalIncomeExclusionAmt>",
  );
  assertStringIncludes(
    xml,
    "<GrossIncomeLessTotIncmExclAmt>55000</GrossIncomeLessTotIncmExclAmt>",
  );
  assertStringIncludes(
    xml,
    "<TestedIncomeLossGrp><FunctionalCurrencyAmt>50000</FunctionalCurrencyAmt><ConversionRt>1.0000</ConversionRt><USDollarAmt>50000</USDollarAmt></TestedIncomeLossGrp>",
  );
  assertStringIncludes(
    xml,
    "<ProRataShareQBAIGrp><FunctionalCurrencyAmt>100000</FunctionalCurrencyAmt><ConversionRt>1.0000</ConversionRt><USDollarAmt>100000</USDollarAmt></ProRataShareQBAIGrp>",
  );
  assertStringIncludes(
    xml,
    "<TestedInterestExpenseGrp><FunctionalCurrencyAmt>3000</FunctionalCurrencyAmt><ConversionRt>1.0000</ConversionRt><USDollarAmt>3000</USDollarAmt></TestedInterestExpenseGrp>",
  );
});

Deno.test("Schedule I-1 rejects mismatched reviewed worksheet and shareholder", () => {
  assertThrows(() =>
    form5471ScheduleI1.build({}, {
      filer: form8992Filer,
      pending: {
        ...form8992Pending,
        f5471: {
          f5471s: [{
            ...form8992Cfc,
            schedule_i1: {
              ...form8992Cfc.schedule_i1,
              gross_income_functional: 64_000,
            },
          }],
        },
      },
    }), Error);
  assertThrows(
    () =>
      form5471ScheduleI1.build({}, {
        filer: { ...form8992Filer, primarySSN: "999887777" },
        pending: form8992Pending,
      }),
    Error,
    "shareholder TIN differs",
  );
});

Deno.test({
  name: "Category 5a Schedule I-1 standalone XML satisfies TY2025 v5.4 XSD",
  ignore: !schemaAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const xml = form5471ScheduleI1.build({}, {
      filer: form8992Filer,
      pending: form8992Pending,
    }).replace(
      /^<IRS5471ScheduleI1/,
      '<IRS5471ScheduleI1 xmlns="http://www.irs.gov/efile" documentId="IRS5471ScheduleI1Test1"',
    );
    const command = new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, "-"],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const writer = command.stdin.getWriter();
    await writer.write(new TextEncoder().encode(xml));
    await writer.close();
    const result = await command.output();
    assertEquals(result.success, true, new TextDecoder().decode(result.stderr));
  },
});
