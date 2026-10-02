import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { registry } from "./registry.ts";
import { buildPending } from "./mef/pending.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { irs1040Pdf } from "./pdf/forms/f1040.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import { Box12Code } from "../nodes/inputs/w2/index.ts";

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-standalone-fec-line1h"
)!;
const [wage] = base.inputs.w2 as Record<string, unknown>[];
const deferralW2 = (ein: string, amount: number) => ({
  ...wage,
  employer_ein: ein,
  box12_entries: [{ code: Box12Code.D, amount }],
  box13_retirement_plan: true,
  excess_deferral_review: {
    plan_type: "non_simple_401k" as const,
    plan_review_reference: `2025 plan review ${ein}`,
    employee_birth_date: "1985-06-15",
    birth_date_source_reference: "2025 identity review",
    w2_source_reference: `2025 issued W-2 ${ein}`,
  },
});

function filing() {
  const result = execute(buildExecutionPlan(registry), registry, {
    ...base.inputs,
    w2: [
      deferralW2("12-3456789", 15_000),
      deferralW2("98-7654321", 12_000),
    ],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  return buildPending(result.pending);
}

Deno.test("foreign employer wages and separate W-2 excess deferrals join Form 1040 line 1h, native statement, and PDF", async () => {
  const pending = filing();
  assertEquals(pending.f1040?.line1h_other_earned, 6_500);
  const xml = buildMefXml(pending, base.filer);
  assertStringIncludes(xml, "<OtherEarnedIncomeAmt");
  assertStringIncludes(xml, ">6500</OtherEarnedIncomeAmt>");
  assertStringIncludes(xml, "<WagesLiteralCd>FEC</WagesLiteralCd>");
  assertStringIncludes(xml, "<WagesNotShownAmt>3000</WagesNotShownAmt>");
  assertStringIncludes(
    xml,
    "<OtherWagesNotShownTxt>EXCESS DEFERRALS</OtherWagesNotShownTxt>",
  );
  assertStringIncludes(xml, "<WagesNotShownAmt>3500</WagesNotShownAmt>");
  assertEquals((xml.match(/<WagesNotShownSch>/g) ?? []).length, 2);
  assertEquals(
    irs1040Pdf.projectFields?.(
      pending.f1040!,
      pending as unknown as Record<string, Record<string, unknown>>,
    )
      ?.print_line1h_type,
    "FEC + EXCESS DEFERRALS",
  );
  const pdf = await buildPdfBytes(pending, base.filer);
  if (pdf.byteLength === 0) throw new Error("Missing filled PDF");

  const changed = {
    ...pending,
    f1040: { ...pending.f1040, line1h_other_earned: 6_499 },
  };
  assertThrows(() => buildMefXml(changed, base.filer), Error, "line 1z");
  await assertRejects(() => buildPdfBytes(changed, base.filer), Error);
  await assertRejects(
    () =>
      buildPdfBytes(pending, {
        ...base.filer,
        primarySSN: "999887777",
      }),
    Error,
  );
});

Deno.test({
  name:
    "foreign employer wages plus W-2 excess validates against the 2025 MeF XSD",
  ignore: !(() => {
    try {
      Deno.statSync(
        new URL(
          "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
          import.meta.url,
        ),
      );
      return true;
    } catch {
      return false;
    }
  })(),
}, async () => {
  const xml = buildMefXml(filing(), base.filer);
  const xsd = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const result = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, path],
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
  } finally {
    await Deno.remove(path);
  }
});
