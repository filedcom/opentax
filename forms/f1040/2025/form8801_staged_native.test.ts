import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { fixture, packageFacts } from "./form8801_reviewed_return.fixture.ts";
import {
  form8801NativeLineMap,
  stageForm8801NativeDocument,
} from "./form8801_staged_native.ts";
import { assertAttachmentCoverage } from "./attachment-coverage.ts";

const schema = new URL(
  "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Common/IRS8801/IRS8801.xsd",
  import.meta.url,
).pathname;
let schemaAvailable = false;
try {
  Deno.statSync(schema);
  schemaAvailable = true;
} catch { /* Private IRS bundle. */ }

async function validate(xml: string) {
  const directory = await Deno.makeTempDir({ prefix: "8801-native-" });
  try {
    const file = `${directory}/document.xml`;
    await Deno.writeTextFile(
      file,
      xml.replace(
        "<IRS8801>",
        '<IRS8801 xmlns="http://www.irs.gov/efile" documentId="Staged8801">',
      ),
    );
    const r = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", schema, file],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(r.code, 0, new TextDecoder().decode(r.stderr));
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
}

Deno.test({
  name: "8801 native sequence covers every IRS schema line in exact order",
  ignore: !schemaAvailable,
}, async () => {
  const xsd = await Deno.readTextFile(schema);
  const sequence = xsd.slice(
    xsd.indexOf('<xsd:complexType name="IRS8801Type">'),
  );
  const rows = [
    ...sequence.matchAll(
      /<xsd:element name="([^"]+)"[^>]*>[\s\S]*?<LineNumber>(\d+)<\/LineNumber>[\s\S]*?<\/xsd:element>/g,
    ),
  ].map((m) => [Number(m[2]), m[1]]);
  assertEquals(rows.length, 53);
  assertEquals<unknown>(form8801NativeLineMap, rows);
});

Deno.test({
  name: "8801 native ordinary credit matches settled tax and partial carry",
  ignore: !schemaAvailable,
}, async () => {
  const f = await fixture();
  f.inputs.w2[0].box1_wages = 30_000;
  const r = await stageForm8801NativeDocument(f.inputs, f.binding, f.documents);
  assertStringIncludes(r.native_xml!, "<MinAMTCrAmt>1475</MinAMTCrAmt>");
  assertStringIncludes(
    r.native_xml!,
    "<AMTCrCarryforwardToNextYearAmt>3707</AMTCrCarryforwardToNextYearAmt>",
  );
  assertStringIncludes(
    r.native_xml!,
    "<NetMinTaxOnExclusionItemsAmt>918</NetMinTaxOnExclusionItemsAmt>",
  );
  assertEquals(r.native_xml!.includes("<NetMinTaxLessDeductionsAmt>"), false);
  assertEquals(r.final_form1040.line22_tax_after_credits, 0);
  assertEquals(r.filingReady, false);
  for (const format of ["mef", "pdf"] as const) {
    assertThrows(
      () => assertAttachmentCoverage(r.projected_pending, format),
      Error,
      "Form 8801",
    );
  }
  await validate(r.native_xml!);
});

Deno.test({
  name:
    "8801 native preserves signed exclusions and net deferral with a positive available carry",
  ignore: !schemaAvailable,
}, async () => {
  const facts = packageFacts();
  facts.prior_form6251.line10 = 0;
  facts.prior_credit_carryforward.amount = 10_000;
  const f = await fixture(facts);
  const r = await stageForm8801NativeDocument(f.inputs, f.binding, f.documents);
  assertStringIncludes(
    r.native_xml!,
    "<NetAlternativeMinimumTaxAmt>-3918</NetAlternativeMinimumTaxAmt>",
  );
  assertStringIncludes(
    r.native_xml!,
    "<AMTCarryforwardPlusNegativeAmt>6182</AMTCarryforwardPlusNegativeAmt>",
  );
  await validate(r.native_xml!);
  facts.prior_form6251.line2a = -20_000;
  const g = await fixture(facts);
  const negative = await stageForm8801NativeDocument(
    g.inputs,
    g.binding,
    g.documents,
  );
  assertStringIncludes(
    negative.native_xml!,
    "<NetMinTaxExclusionItemsAmt>-20000</NetMinTaxExclusionItemsAmt>",
  );
  assertEquals(
    negative.native_xml!.includes("<NetMinTaxTimesTaxRateAmt>"),
    false,
  );
  await validate(negative.native_xml!);
});

Deno.test({
  name:
    "8801 native Schedule D includes the 25 percent computation and all represented capital lines",
  ignore: !schemaAvailable,
}, async () => {
  const facts = packageFacts();
  facts.prior_form6251.line1 = 300_000;
  facts.prior_credit_carryforward.amount = 100_000;
  const f = await fixture({
    ...facts,
    capital_rate_workpaper: {
      reference: "reviewed capital workpaper",
      method: "schedule_d_worksheet",
      line28: 100_000,
      line29: 30_000,
      schedule_d_line10: 130_000,
      line35: 0,
      line42: 0,
      amt_and_foreign_modifications_reviewed: true,
    },
  });
  const r = await stageForm8801NativeDocument(f.inputs, f.binding, f.documents);
  for (
    const fragment of [
      "<PYUnrecapturedS1250GainAmt>30000</PYUnrecapturedS1250GainAmt>",
      "<NetSchDOrAdjNetGainTimesPctAmt>7500</NetSchDOrAdjNetGainTimesPctAmt>",
      "<TaxOnAlternativeMinimumGainAmt>42564</TaxOnAlternativeMinimumGainAmt>",
    ]
  ) assertStringIncludes(r.native_xml!, fragment);
  assertEquals(
    [...r.native_xml!.matchAll(/<([A-Za-z0-9]+)>-?\d+<\//g)].length,
    53,
  );
  await validate(r.native_xml!);
});

Deno.test({
  name: "8801 native zero allowed credit retains a positive carry attachment",
  ignore: !schemaAvailable,
}, async () => {
  const f = await fixture();
  f.inputs.w2[0].box1_wages = 10_000;
  const r = await stageForm8801NativeDocument(f.inputs, f.binding, f.documents);
  assertEquals(r.lines[25], 0);
  assertStringIncludes(r.native_xml!, "<MinAMTCrAmt>0</MinAMTCrAmt>");
  assertStringIncludes(
    r.native_xml!,
    "<AMTCrCarryforwardToNextYearAmt>5182</AMTCrCarryforwardToNextYearAmt>",
  );
  await validate(r.native_xml!);
});

Deno.test({
  name: "8801 native qualified-dividend method omits skipped Schedule D cells",
  ignore: !schemaAvailable,
}, async () => {
  const f = await fixture({
    ...packageFacts(),
    capital_rate_workpaper: {
      reference: "reviewed QD workpaper",
      method: "qualified_dividends_worksheet",
      line28: 10_000,
      line29: 0,
      line35: 0,
      line42: 0,
      amt_and_foreign_modifications_reviewed: true,
    },
  });
  const r = await stageForm8801NativeDocument(f.inputs, f.binding, f.documents);
  assertStringIncludes(
    r.native_xml!,
    "<TaxOnAlternativeMinimumGainAmt>6318</TaxOnAlternativeMinimumGainAmt>",
  );
  for (
    const tag of [
      "PYUnrecapturedS1250GainAmt",
      "TotalNetAmt",
      "NetSmallerSchDOrAdjNetGainAmt",
      "NetSchDOrAdjNetGainTimesPctAmt",
    ]
  ) assertEquals(r.native_xml!.includes(`<${tag}>`), false);
  await validate(r.native_xml!);
});

Deno.test("8801 native nonpositive stop emits no attachment and rejects detached or modified source", async () => {
  const facts = packageFacts();
  facts.prior_form6251.line10 = 0;
  const f = await fixture(facts);
  const r = await stageForm8801NativeDocument(f.inputs, f.binding, f.documents);
  assertEquals(r.native_xml, undefined);
  await assertRejects(() =>
    stageForm8801NativeDocument(
      f.inputs,
      { ...f.binding, lines: r.lines },
      f.documents,
    )
  );
  const changed = f.documents.map((d) => ({
    ...d,
    bytes: new TextEncoder().encode("{}"),
  }));
  await assertRejects(() =>
    stageForm8801NativeDocument(f.inputs, f.binding, changed)
  );
});
