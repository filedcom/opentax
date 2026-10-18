import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../../../../../../../scripts/support/sys.ts";
import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { execute } from "../../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../../core/runtime/planner.ts";
import { TS } from "../../../../../nodes/types.ts";
import { registry } from "../../../../registry.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import { irs1040Pdf } from "../../../../pdf/forms/general/return-assembly/f1040.ts";
import { buildMefXml } from "../../../builder.ts";
import { assertLine1hSupportedSource } from "../../../../domains/income/other/line1h-source.ts";
import { buildPending } from "../../../execution/pending.ts";

// Instructions for Form 1040 (2025), line 1h (page 25): disability pensions
// shown on Form 1099-R before the employer's minimum retirement age are other
// earned income on line 1h, and lines 5a and 5b (page 28) exclude them.
// IRS1040.xsd (2025v5.4) OtherEarnedIncomeAmt references
// NonW2DisabilityPaymentStatement; business rule IND-471 makes
// WagesSalariesAndTipsAmt (line 1z) the sum of lines 1a through 1h.

const XSD_PATH = new URL(
  "../../../../../../../irs/mef/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

let xsdAvailable = false;
try {
  sys.statSync(XSD_PATH);
  xsdAvailable = true;
} catch {
  // The local IRS schema bundle is optional in CI.
}

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-w2-refund"
)!;

const pension = {
  payer_name: "Transit Workers Pension Fund",
  payer_ein: "39-0000001",
  recipient_ssn: "111223333",
  ts: TS.T,
  source_document_reference: "2025 Form 1099-R disability pension",
  box1_gross_distribution: 11_000,
  box2a_taxable_amount: 11_000,
  box4_federal_withheld: 1_100,
  box7_distribution_code: "3",
  box7_ira_simple_indicator: false,
  disability_flag: true,
  disability_as_wages: true,
};

function run(extra: Record<string, unknown> = {}) {
  const result = execute(buildExecutionPlan(registry), registry, {
    ...base.inputs,
    f1099r: [pension],
    ...extra,
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  return result;
}

function filing(extra: Record<string, unknown> = {}) {
  return buildPending(run(extra).pending);
}

async function validateXsd(xml: string): Promise<void> {
  const tmpPath = await sys.makeTempFile({ suffix: ".xml" });
  try {
    await fs.writeFile(tmpPath, xml);
    const output = await new sys.Command("xmllint", {
      args: ["--noout", "--schema", XSD_PATH, tmpPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(output.code, 0, new TextDecoder().decode(output.stderr));
  } finally {
    await sys.remove(tmpPath);
  }
}

test("disability pension before minimum retirement age files on line 1h with its statement", async () => {
  const pending = filing();
  assertEquals(pending.f1040?.line1h_other_earned, 11_000);
  assertEquals(pending.f1040?.line1z_total_wages, 86_000);
  assertEquals(pending.f1040?.line5a_pension_gross, undefined);
  assertEquals(pending.f1040?.line5b_pension_taxable, undefined);
  const xml = buildMefXml(pending, base.filer);
  assertStringIncludes(xml, "<WagesAmt>75000</WagesAmt>");
  assertStringIncludes(
    xml,
    '<OtherEarnedIncomeAmt referenceDocumentId="NonW2DisabilityPaymentStmt',
  );
  assertStringIncludes(
    xml,
    'referenceDocumentName="NonW2DisabilityPaymentStatement WagesNotShownSchedule">11000</OtherEarnedIncomeAmt>',
  );
  assertStringIncludes(
    xml,
    "<WagesSalariesAndTipsAmt>86000</WagesSalariesAndTipsAmt>",
  );
  assertStringIncludes(xml, "<NonW2DisabilityPaymentStmt documentId=");
  assertStringIncludes(xml, "received before minimum retirement age");
  assertEquals(xml.includes("<WagesNotShownSchedule"), false);
  if (xsdAvailable) await validateXsd(xml);
});

test("disability pension prints DISABILITY PENSION beside PDF line 1h", async () => {
  const raw = run().pending;
  assertEquals(
    irs1040Pdf.projectFields?.(raw.f1040, raw)?.print_line1h_type,
    "DISABILITY PENSION",
  );
  const pending = buildPending(raw);
  const pdf = await buildPdfBytes(pending, base.filer);
  if (pdf.byteLength === 0) throw new Error("Missing filled PDF");
});

test("disability pension line 1h must match its retained Form 1099-R", () => {
  const pending = filing();
  assertThrows(
    () =>
      assertLine1hSupportedSource(
        { ...pending.f1040, line1h_other_earned: 10_999 },
        2025,
        pending,
      ),
    Error,
    "line 1h needs exactly one supported retained source",
  );
});

test("disability pension cannot share line 1h with a corrective distribution", () => {
  const pending = filing({
    f1099r: [pension, {
      ...pension,
      source_document_reference: "2025 corrective Form 1099-R",
      payer_ein: "98-7654321",
      box1_gross_distribution: 1_200,
      box2a_taxable_amount: 1_000,
      box4_federal_withheld: 0,
      box7_distribution_code: "8",
      disability_flag: undefined,
      disability_as_wages: undefined,
    }],
  });
  assertEquals(pending.f1040?.line1h_other_earned, 12_000);
  assertThrows(
    () => buildMefXml(pending, base.filer),
    Error,
  );
});
