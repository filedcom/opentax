import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { normalizeAllPending } from "./pending.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "./pdf/builder.ts";
import {
  dependentSchema,
  ptcDependentsModifiedAgi,
} from "../nodes/inputs/general/index.ts";
import {
  dependentMultipleIncomeSource,
  form8962MultipleSourceInputs,
} from "./form8962_multiple_source.fixture.ts";

Deno.test("multiple dependent W2/INT/DIV sources reconcile all income and household MAGI through native and PDF", async () => {
  const out = await Deno.makeTempDir({
    prefix: "opentax-8962-multiple-dependent-source-",
  });
  console.log("Multiple dependent actual archive:", out);
  for (
    const [blind, grossOnly, id] of [[false, false, "three-employers"], [
      true,
      false,
      "blind",
    ], [true, true, "blind-gross-only"]] as const
  ) {
    const input = form8962MultipleSourceInputs(blind, grossOnly),
      result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const pending: any = normalizeAllPending(result.pending);
    assertEquals(pending.form8962.dependents_modified_agi, 16_200);
    assertEquals(pending.form8962.household_income, 40_880);
    assertEquals(pending.form8962.total_premium_tax_credit, 8_184);
    assertEquals(pending.schedule3.line9_premium_tax_credit, 8_184);
    assertEquals(pending.f1040.line1z_total_wages, 24_680);
    assertEquals(pending.f1040.line11_agi, 24_680);
    assertEquals(pending.f1040.line31_additional_payments, 8_184);
    assertEquals(pending.f1040.line16_income_tax, 893);
    assertEquals(pending.f1040.line24_total_tax, 893);
    assertEquals(pending.f1040.line33_total_payments, 11_184);
    assertEquals(pending.f1040.line35a_refund, 10_291);
    const filer = extractFilerIdentity(pending.f1040)!;
    const prepared = await f1040_2025.prepareReturn!(result.pending, filer);
    assertEquals(
      prepared.bundle.xml.includes(
        "<TotalDependentsModifiedAGIAmt>16200</TotalDependentsModifiedAGIAmt>",
      ),
      true,
    );
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    const files = {
      "source.json": input,
      "pending.json": pending,
      "prepared.json": prepared.bundle.pending,
      "carry.json": result.carryforwards,
      "origins.json": origins,
    };
    const dir = out + "/" + id;
    await Deno.mkdir(dir);
    for (const [name, data] of Object.entries(files)) {
      await Deno.writeTextFile(dir + "/" + name, JSON.stringify(data, null, 2));
    }
    await Deno.writeFile(dir + "/return.pdf", pdf);
    await Deno.writeTextFile(dir + "/return.xml", prepared.bundle.xml);
    const xsd =
      ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd";
    const validated = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, dir + "/return.xml"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(validated.code, 0, new TextDecoder().decode(validated.stderr));
    for (
      const edit of [
        (p: any) =>
          p.general.dependents[0].ptc_tax_return.dividend_forms1099[1]
            .recipient_ssn = "999999999",
        (p: any) =>
          p.general.dependents[0].ptc_tax_return.dividend_forms1099[1]
            .box1a_ordinary_dividends += 1,
        (p: any) => p.form8962.dependents_modified_agi = 16_000,
      ]
    ) {
      const changed = structuredClone(prepared.bundle.pending);
      edit(changed);
      await assertRejects(() => f1040_2025.prepareReturn!(changed, filer));
      await assertRejects(() => buildPdfBytes(changed, filer, ".pdf-cache"));
    }
  }
});
Deno.test("dependent mixed income rejects duplicated sources, conflicting collections and borrowed filed amounts", () => {
  const good = dependentMultipleIncomeSource();
  assertEquals(ptcDependentsModifiedAgi([dependentSchema.parse(good)]), 16_200);
  for (
    const edit of [
      (p: any) =>
        p.ptc_tax_return.interest_forms1099[1].source_document_id =
          p.ptc_tax_return.wage_forms_w2[0].source_document_id,
      (p: any) =>
        p.ptc_tax_return.dividend_forms1099[1].source_document_id =
          p.ptc_tax_return.filed_form1040.source_document_id,
      (p: any) =>
        p.ptc_tax_return.dividend_form1099 =
          p.ptc_tax_return.dividend_forms1099[0],
      (p: any) => p.ptc_tax_return.filed_form1040.line11b_agi += 1,
    ]
  ) {
    const source = structuredClone(good);
    edit(source);
    assertThrows(() =>
      ptcDependentsModifiedAgi([dependentSchema.parse(source)])
    );
  }
});
Deno.test("single-dependent filing thresholds retain equality, age65 and blind increments for mixed sources", () => {
  const source: any = dependentMultipleIncomeSource();
  source.ptc_tax_return.wage_forms_w2 = [{
    ...source.ptc_tax_return.wage_forms_w2[0],
    box1_wages: 15_300,
  }];
  source.ptc_tax_return.interest_forms1099 = [{
    ...source.ptc_tax_return.interest_forms1099[0],
    box1_taxable_interest: 225,
    box8_tax_exempt_interest: 200,
  }];
  source.ptc_tax_return.dividend_forms1099 = [{
    ...source.ptc_tax_return.dividend_forms1099[0],
    box1a_ordinary_dividends: 225,
  }];
  Object.assign(source.ptc_tax_return.filed_form1040, {
    line1z_wages: 15_300,
    line2b_taxable_interest: 225,
    line3b_dividends: 225,
    line11b_agi: 15_750,
  });
  assertThrows(() => ptcDependentsModifiedAgi([dependentSchema.parse(source)]));
  source.ptc_tax_return.dividend_forms1099[0].box1a_ordinary_dividends = 226;
  source.ptc_tax_return.filed_form1040.line3b_dividends = 226;
  source.ptc_tax_return.filed_form1040.line11b_agi = 15_751;
  assertEquals(
    ptcDependentsModifiedAgi([dependentSchema.parse(source)]),
    15_951,
  );
  source.dob = "1961-01-01";
  assertThrows(() => ptcDependentsModifiedAgi([dependentSchema.parse(source)]));
  source.dob = "1961-01-02";
  assertEquals(
    ptcDependentsModifiedAgi([dependentSchema.parse(source)]),
    15_951,
  );
  source.ptc_tax_return.filed_form1040.blind = true;
  assertThrows(() => ptcDependentsModifiedAgi([dependentSchema.parse(source)]));
});
