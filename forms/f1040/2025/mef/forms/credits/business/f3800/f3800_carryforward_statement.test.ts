import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form3800CarryforwardStatement } from "./f3800_carryforward_statement.ts";

const vintage = {
  source_key: "2022-new-markets-1",
  source_origin: { kind: "self" },
  credit_type: "New markets credit",
  form3800_credit_line: "1i" as const,
  originating_tax_year: 2022,
  originating_tax_year_end_date: "2022-12-31",
  source_document_reference: "2022 filed Form 8874",
  originating_return_reference: "2022 accepted Form 1040 and Form 3800",
  permitted_carryback_years: 1 as const,
  credit_generated_as_filed: 5_000,
  credit_allowed_origin_year: 2_000,
  historical_uses: [{
    tax_year: 2021,
    tax_year_end_date: "2021-12-31",
    credit_allowed: 300,
    return_reference: "2021 accepted amended return",
    kind: "carryback" as const,
  }, {
    tax_year: 2023,
    tax_year_end_date: "2023-12-31",
    credit_allowed: 500,
    return_reference: "2023 accepted return",
    kind: "carryforward" as const,
  }],
  prior_adjustments: [],
  balance_carried_to_2025: 2_200,
  original_reported_balance_carried_to_2025: 2_200,
};

const XSD_PATH = new URL(
  "../../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/CorporateIncomeTax/Corp1120/IRS3800/CarryforwardGeneralBusinessCr.xsd",
  import.meta.url,
).pathname;
let xsdAvailable = false;
try {
  Deno.statSync(XSD_PATH);
  xsdAvailable = true;
} catch {
  // The official IRS schema bundle is local-only.
}

Deno.test("Form 3800 native carryforward computation preserves origin and each use", () => {
  const pending = {
    f3800: {
      carryforward_vintages: [{
        vintage,
        subject_to_passive_activity_limit: false,
      }],
    },
  };
  const fragments = form3800CarryforwardStatement.build(undefined, {
    pending,
    documentIdsByTag: {
      CarryforwardGeneralBusinessCr: ["CarryforwardGeneralBusinessCr1"],
    },
  });
  assertEquals(fragments.length, 1);
  assertStringIncludes(
    fragments[0],
    "<CreditOriginatedTaxYr>2022-12-31</CreditOriginatedTaxYr>",
  );
  assertStringIncludes(fragments[0], "<CreditAmt>5000</CreditAmt>");
  assertStringIncludes(
    fragments[0],
    "<CreditAllowedForYrAmt>2000</CreditAllowedForYrAmt>",
  );
  assertStringIncludes(
    fragments[0],
    "<CarrybackCrRemainingGrp><CarryYr>2021-12-31</CarryYr><CarryAllowedAmt>300</CarryAllowedAmt></CarrybackCrRemainingGrp>",
  );
  assertStringIncludes(
    fragments[0],
    "<CarryforwardCrRemainingGrp><CarryYr>2023-12-31</CarryYr><CarryAllowedAmt>500</CarryAllowedAmt></CarryforwardCrRemainingGrp>",
  );
  assertThrows(
    () =>
      form3800CarryforwardStatement.build(undefined, {
        pending,
        documentIdsByTag: { CarryforwardGeneralBusinessCr: [] },
      }),
    Error,
    "one reserved document ID per vintage",
  );
});

Deno.test("Form 3800 native carryforward computation rejects a changed source year-end date", () => {
  assertThrows(
    () =>
      form3800CarryforwardStatement.build(undefined, {
        pending: {
          f3800: {
            carryforward_vintages: [{
              vintage: {
                ...vintage,
                historical_uses: [{
                  ...vintage.historical_uses[1],
                  tax_year_end_date: "2024-12-31",
                }],
              },
              subject_to_passive_activity_limit: false,
            }],
          },
        },
      }),
    Error,
    "year and year-end date do not reconcile",
  );
});

Deno.test({
  name: "Form 3800 carryforward computation validates against TY2025 v5.4 XSD",
  ignore: !xsdAvailable,
  async fn() {
    const [fragment] = form3800CarryforwardStatement.build(undefined, {
      pending: {
        f3800: {
          carryforward_vintages: [{
            vintage,
            subject_to_passive_activity_limit: false,
          }],
        },
      },
    });
    const xml = fragment.replace(
      "<CarryforwardGeneralBusinessCr>",
      '<CarryforwardGeneralBusinessCr xmlns="http://www.irs.gov/efile" documentId="CarryforwardGeneralBusinessCr1">',
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
  },
});
