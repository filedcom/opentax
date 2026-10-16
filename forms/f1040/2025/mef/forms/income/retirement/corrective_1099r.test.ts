import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { execute } from "../../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../../core/runtime/planner.ts";
import { TS } from "../../../../../nodes/types.ts";
import { registry } from "../../../../registry.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { buildMefXml } from "../../../builder.ts";
import { buildPending } from "../../../execution/pending.ts";

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-w2-refund"
)!;

const corrective = {
  payer_name: "Example Retirement Plan",
  payer_ein: "98-7654321",
  recipient_ssn: "111223333",
  ts: TS.T,
  source_document_reference: "2025 corrective Form 1099-R A",
  box1_gross_distribution: 1_200,
  box2a_taxable_amount: 1_000,
  box7_distribution_code: "8",
  box7_ira_simple_indicator: false,
};

function filing(items: readonly Record<string, unknown>[]) {
  return execute(buildExecutionPlan(registry), registry, {
    ...base.inputs,
    f1099r: items,
  }, { taxYear: 2025, formType: "f1040" });
}

Deno.test("non-IRA code-8 taxable correction reaches line 1h and one native statement", () => {
  const result = filing([corrective]);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertEquals(pending.f1040?.line1h_other_earned, 1_000);
  assertEquals(pending.f1040?.line5a_pension_gross, undefined);
  assertEquals(pending.f1040?.line5b_pension_taxable, undefined);
  const xml = buildMefXml(pending, base.filer);
  assertStringIncludes(xml, "<OtherEarnedIncomeAmt referenceDocumentId=");
  assertStringIncludes(
    xml,
    "<OtherWagesNotShownTxt>CORRECTIVE DISTRIBUTION</OtherWagesNotShownTxt>",
  );
  assertStringIncludes(xml, "<WagesNotShownAmt>1000</WagesNotShownAmt>");
  assertStringIncludes(
    xml,
    "<GrossDistributionAmt>1200</GrossDistributionAmt>",
  );
  assertStringIncludes(xml, "<TaxableAmt>1000</TaxableAmt>");
});

Deno.test("code-8 correction rejects a wrong 1099-R recipient at native export", () => {
  const result = filing([{ ...corrective, recipient_ssn: "444556666" }]);
  assertEquals(result.diagnostics, []);
  assertThrows(
    () => buildMefXml(buildPending(result.pending), base.filer),
    Error,
    "issued recipient SSN differs",
  );
});

Deno.test("IRA code 8 and ordinary pension code 7 do not become corrective line 1h", () => {
  const ira = filing([{
    ...corrective,
    box7_ira_simple_indicator: true,
  }]);
  assertEquals(ira.diagnostics, []);
  assertEquals(buildPending(ira.pending).f1040?.line1h_other_earned, undefined);
  assertEquals(buildPending(ira.pending).f1040?.line4b_ira_taxable, 1_000);

  const ordinary = filing([{
    ...corrective,
    box7_distribution_code: "7",
  }]);
  assertEquals(ordinary.diagnostics, []);
  assertEquals(
    buildPending(ordinary.pending).f1040?.line1h_other_earned,
    undefined,
  );
  assertEquals(
    buildPending(ordinary.pending).f1040?.line5b_pension_taxable,
    1_000,
  );
});

Deno.test("code-8 correction rejects missing taxable evidence and duplicate source references", () => {
  const missing = filing([{ ...corrective, box2a_taxable_amount: undefined }]);
  assertEquals(missing.diagnostics.length > 0, true);
  const duplicate = filing([corrective, corrective]);
  assertEquals(duplicate.diagnostics.length > 0, true);
});

Deno.test("two distinct code-8 copies aggregate only their taxable amounts", () => {
  const result = filing([corrective, {
    ...corrective,
    source_document_reference: "2025 corrective Form 1099-R B",
    box1_gross_distribution: 700,
    box2a_taxable_amount: 600,
  }]);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertEquals(pending.f1040?.line1h_other_earned, 1_600);
  const xml = buildMefXml(pending, base.filer);
  assertEquals((xml.match(/<IRS1099R documentId=/g) ?? []).length, 2);
  assertEquals((xml.match(/<WagesNotShownSch>/g) ?? []).length, 1);
  assertStringIncludes(xml, "<WagesNotShownAmt>1600</WagesNotShownAmt>");
});

Deno.test("code-8 correction cannot mask a second line 1h wage source", () => {
  const fecFixture = pdfReviewFixtures.find((fixture) =>
    fixture.id === "single-standalone-fec-line1h"
  )!;
  const result = execute(buildExecutionPlan(registry), registry, {
    ...base.inputs,
    f1099r: [corrective],
    fec: fecFixture.inputs.fec,
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertThrows(
    () => buildMefXml(buildPending(result.pending), base.filer),
    Error,
    "line 1h needs exactly one supported retained source",
  );
});

Deno.test("disability wages reach line 1h without becoming a corrective distribution statement", () => {
  const disability = {
    ...corrective,
    source_document_reference: "2025 disability Form 1099-R",
    box1_gross_distribution: 12_000,
    box2a_taxable_amount: 10_000,
    box4_federal_withheld: 1_200,
    box7_distribution_code: "3",
    disability_flag: true,
    disability_as_wages: true,
  };
  const baseline = buildPending(
    execute(
      buildExecutionPlan(registry),
      registry,
      base.inputs,
      { taxYear: 2025, formType: "f1040" },
    ).pending,
  );
  for (const items of [[disability], [disability, corrective]]) {
    const result = filing(items);
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending);
    const otherWages = items.length === 1 ? 10_000 : 11_000;
    assertEquals(pending.f1040?.line1a_wages, baseline.f1040?.line1a_wages);
    assertEquals(pending.f1040?.line1h_other_earned, otherWages);
    assertEquals(pending.f1040?.line5a_pension_gross, undefined);
    assertEquals(pending.f1040?.line5b_pension_taxable, undefined);
    assertEquals(pending.f1040?.line25b_withheld_1099, 1_200);
    assertEquals(
      pending.f1040?.line11_agi,
      Number(baseline.f1040?.line11_agi) + otherWages,
    );
    // The source-backed native disability statement is still required work.
    // Corrective support must not disguise these wages as a code-8 statement.
    assertThrows(
      () => buildMefXml(pending, base.filer),
      Error,
      "line 1h needs exactly one supported retained source",
    );
  }
});
