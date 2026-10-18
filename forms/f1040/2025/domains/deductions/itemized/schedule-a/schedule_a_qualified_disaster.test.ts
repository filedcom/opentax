import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../../../../../../../scripts/support/sys.ts";
import { assertEquals, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { form6251 } from "../../../../mef/forms/taxes/amt/f6251.ts";
import { PersonalCasualtyKind } from "../../../../../nodes/intermediate/forms/deductions/casualty/form4684/index.ts";

const base = pdfReviewFixtures.find((x) => x.id === "single-w2-refund")!;
const xsd = new URL(
  "../../../../../../../irs/mef/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
let xsdAvailable = false;
try {
  sys.statSync(xsd);
  xsdAvailable = true;
} catch {
  // IRS schema bundle is optional in CI.
}

function property(overrides: Record<string, unknown>) {
  return {
    property_type: "House",
    address_line1: "1 Main St",
    city: "Juneau",
    state: "AK",
    zip: "99801",
    acquired_date: "2000-01-01",
    basis: 15_000,
    insurance: 2_000,
    fmv_before: 14_000,
    fmv_after: 2_000,
    ...overrides,
  };
}

const form4684 = {
  personal_casualties: [
    {
      description: "Fire",
      casualty_date: "2025-01-01",
      kind: PersonalCasualtyKind.FederallyDeclaredDisaster,
      fema_declaration_number: "EM-1234",
      properties: [property({})],
    },
    {
      description: "Monsoon",
      casualty_date: "2025-02-01",
      kind: PersonalCasualtyKind.QualifiedDisaster,
      fema_declaration_number: "EM-2345",
      qualified_disaster_confirmed: true,
      properties: [property({
        property_type: "Shed",
        basis: 12_000,
        fmv_before: 11_000,
        fmv_after: 6_000,
      })],
    },
    {
      description: "Hurricane",
      casualty_date: "2025-03-01",
      kind: PersonalCasualtyKind.NotFederallyDeclared,
      properties: [property({
        property_type: "Barn",
        basis: 8_000,
        insurance: 0,
        fmv_before: 7_000,
        fmv_after: 3_000,
      })],
    },
  ],
};

async function assertXsdValid(xml: string) {
  const temp = await sys.makeTempFile({ suffix: ".xml" });
  try {
    await fs.writeFile(temp, xml);
    const check = await new sys.Command("xmllint", {
      args: ["--noout", "--schema", xsd, temp],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(check.code, 0, new TextDecoder().decode(check.stderr));
  } finally {
    await sys.remove(temp);
  }
}

async function file(inputs: Record<string, unknown>) {
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(result.pending.f1040)!;
  const bundle = await buildMefBundle(pending, { filer, attachments: [] });
  const origins: PdfPageOrigin[] = [];
  await buildPdfBytes(bundle.pending, filer, ".pdf-cache", bundle, origins);
  return { result, xml: bundle.xml, origins };
}

// Fire: line 9 is $12,000 less $2,000 insurance; line 12 $9,900. Monsoon, a
// qualified disaster: $3,000 less $500 is line 15, the net qualified disaster
// loss. Hurricane, not federally declared, has no gains to offset (Worksheet
// 1-1). Line 18 is $9,900 less 10% of the $75,000 AGI = $2,400.
// A non-itemizer adds line 15 to the $15,750 standard deduction and files
// Schedule A line 16 with both amounts (2025 Instructions for Form 1040,
// Line 12e, Exception 5; Instructions for Form 4684, Increased standard
// deduction reporting).
test.skipIf(!xsdAvailable)("a net qualified disaster loss increases the filed standard deduction", async () => {
  const { result, xml, origins } = await file({
    ...structuredClone(base.inputs),
    form4684,
  });
  assertEquals(result.pending.f1040.line12a_standard_deduction, 18_250);
  assertEquals(result.pending.f1040.line12e_itemized_deductions, undefined);
  const scheduleA = xml.match(
    /<IRS1040ScheduleA\b[\s\S]*?<\/IRS1040ScheduleA>/,
  )![0];
  assertEquals(scheduleA.includes("CalcAdjGroIncmMnsTotNetLossAmt"), false);
  assertEquals(
    /<OtherMiscellaneousDedAmt[^>]*>18250</.test(scheduleA),
    true,
  );
  assertEquals(
    scheduleA.includes(
      "<TotalItemizedDeductionsAmt>18250</TotalItemizedDeductionsAmt>",
    ),
    true,
  );
  assertEquals(
    xml.includes(
      "<MiscellaneousDeductionTypeDesc>STANDARD DEDUCTION CLAIMED WITH QUALIFIED DISASTER LOSS</MiscellaneousDeductionTypeDesc><MiscellaneousDeductionAmt>15750</MiscellaneousDeductionAmt>",
    ),
    true,
  );
  assertEquals(xml.match(/<IRS4684\b/g)?.length, 3);
  assertEquals(
    xml.includes(
      "<TotalItemizedOrStandardDedAmt>18250</TotalItemizedOrStandardDedAmt>",
    ),
    true,
  );
  assertEquals(origins.filter((x) => x.formKey === "form4684").length, 3);
  assertEquals(origins.filter((x) => x.formKey === "schedule_a").length, 1);
  await assertXsdValid(xml);
}, 120_000);

// Itemizing: line 15 is Form 4684 line 18 and line 16 the net qualified
// disaster loss (2025 Instructions for Form 4684, Line 15 and Line 18).
test.skipIf(!xsdAvailable)("an itemizer files line 15 from Form 4684 and the loss on line 16", async () => {
  const { result, xml, origins } = await file({
    ...structuredClone(base.inputs),
    form4684,
    schedule_a: { line_5a_state_income_tax: 20_000 },
  });
  assertEquals(result.pending.f1040.line12e_itemized_deductions, 24_900);
  assertEquals(
    xml.includes(
      "<CalcAdjGroIncmMnsTotNetLossAmt referenceDocumentId=",
    ) && xml.includes(">2400</CalcAdjGroIncmMnsTotNetLossAmt>"),
    true,
  );
  assertEquals(/<OtherMiscellaneousDedAmt[^>]*>2500</.test(xml), true);
  assertEquals(
    xml.includes(
      "<TenPercentOfAGIAmt>7500</TenPercentOfAGIAmt><CalcAdjGroIncmMnsTotNetLossAmt>2400</CalcAdjGroIncmMnsTotNetLossAmt>",
    ),
    true,
  );
  assertEquals(origins.filter((x) => x.formKey === "schedule_a").length, 1);
  await assertXsdValid(xml);
}, 120_000);

// With the increased standard deduction, Form 6251 line 2a is zero and the
// pre-increase standard deduction is on line 3 (2025 Instructions for Form
// 4684, Taxpayers who also file the 2025 Form 6251); that split is refused.
test("Form 6251 is refused with a standard deduction increased by a disaster loss", () => {
  assertThrows(
    () =>
      form6251.build({ line11_amt: 100, regular_tax: 0, tentative_tax: 100 }, {
        pending: {
          f1040: { line12a_standard_deduction: 18_250 },
          standard_deduction: { net_qualified_disaster_loss: 2_500 },
        },
      }),
    Error,
    "line 2a zero",
  );
});
