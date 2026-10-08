import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../index.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";
import {
  type AllocationRoute,
  partialBeneficiaryMultipleAllocationInputs,
} from "../../../pdf/reviews/composed/review-4972-partial-multiple-death-estate.fixture.ts";

const dir =
  ".state/research/2026-10-06-form4972-beneficiary-multicopy-death-estate";
const xsd =
  ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd";
const expected = {
  2: {
    taxable: 20000,
    gain: 4000,
    nua: 2000,
    annuity: 1500,
    fullTaxable: 44000,
    line6: 3700,
    line7: 740,
    line8: 35200,
    line9: 4000,
    line11: 6000,
    line18: 1600,
    line29: 1475,
    tax: 2215,
  },
  3: {
    taxable: 30000,
    gain: 6000,
    nua: 4000,
    annuity: 3000,
    fullTaxable: 68000,
    line6: 6100,
    line7: 1220,
    line8: 54400,
    line9: 4000,
    line11: 12000,
    line18: 1600,
    line29: 3290,
    tax: 4510,
  },
};

Deno.test("two and three issued beneficiary copies reconcile death exclusion, estate tax, NUA and annuity through full XML and PDF", async () => {
  await Deno.mkdir(dir, { recursive: true });
  for (const count of [2, 3] as const) {
    const input = partialBeneficiaryMultipleAllocationInputs(
      count,
      "death-estate-nua-annuity",
    );
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const pending: any = result.pending;
    const form = pending.form4972.forms[0];
    const e = expected[count];
    assertEquals(pending.form4972.forms.length, 1);
    assertEquals(
      form.source_document_references,
      input.f1099r.map((copy) => copy.source_document_reference),
    );
    assertEquals([
      form.lump_sum_amount,
      form.capital_gain_amount,
      form.box6_nua,
      form.annuity_actuarial_value,
    ], [e.taxable, e.gain, e.nua, e.annuity]);
    assertEquals(
      form.partial_estate_tax_source.full_distribution_taxable_amount,
      e.fullTaxable,
    );
    assertEquals([
      form.line6,
      form.line7,
      form.line8,
      form.line9,
      form.line11,
      form.line18,
      form.line29,
      form.line30,
    ], [
      e.line6,
      e.line7,
      e.line8,
      e.line9,
      e.line11,
      e.line18,
      e.line29,
      e.tax,
    ]);
    assertEquals(pending.f1040.form4972_tax, e.tax);
    assertEquals(pending.f1040.line16_income_tax, e.tax);
    assertEquals(pending.f1040.line5b_pension_taxable ?? 0, 0);
    const filer = extractFilerIdentity(input.general)!;
    const prepared = await f1040_2025.prepareReturn!(pending, filer);
    const xml = prepared.bundle.xml;
    assertEquals((xml.match(/<IRS4972\b/g) ?? []).length, 1);
    assertStringIncludes(
      xml,
      `<LumpSumDistributionTaxAmt>${e.tax}</LumpSumDistributionTaxAmt>`,
    );
    assertStringIncludes(xml, "LumpSumDistriMultRecipientsCd>MRD</");
    const id = `beneficiary-${count}-death-estate`;
    const xmlPath = `${dir}/${id}.xml`;
    const pdfPath = `${dir}/${id}.pdf`;
    await Deno.writeTextFile(
      `${dir}/${id}.json`,
      JSON.stringify({ input, pending }, null, 2),
    );
    await Deno.writeTextFile(xmlPath, xml);
    const pdf = await prepared.renderPdf();
    await Deno.writeFile(pdfPath, pdf);
    const document = await PDFDocument.load(pdf);
    assertEquals(document.getPageCount(), 3);
    assertEquals(document.getForm().getFields().length, 0);
    const schema = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stderr: "piped",
    }).output();
    assertEquals(schema.code, 0, new TextDecoder().decode(schema.stderr));
    const extracted = await new Deno.Command("pdftotext", {
      args: ["-layout", pdfPath, "-"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(extracted.code, 0, new TextDecoder().decode(extracted.stderr));
    const text = new TextDecoder().decode(extracted.stdout);
    for (const value of [e.tax, e.line6, e.line9, e.line18]) {
      assertStringIncludes(text, String(value));
    }
    assertStringIncludes(text, "MRD");
    await Deno.writeTextFile(`${dir}/${id}.txt`, text);
    for (
      const mutate of [
        (q: any) => q.f1099r.f1099rs.pop(),
        (q: any) => q.f1099r.f1099rs[0].box9a_pct_total = 40,
        (q: any) => q.f1099r.f1099rs[1].box6_nua++,
        (q: any) => q.f1099r.f1099rs[1].box8_other++,
        (q: any) =>
          q.form4972.forms[0].death_benefit_allocation.participant_ssn =
            "111223333",
        (q: any) =>
          q.form4972.forms[0].death_benefit_allocation.elected_recipient_ssn =
            "987654321",
        (q: any) =>
          q.form4972.forms[0].death_benefit_allocation.recipients[0]
            .excluded_amount++,
        (q: any) =>
          q.form4972.forms[0].partial_estate_tax_source
            .full_distribution_taxable_amount++,
        (q: any) =>
          q.form4972.forms[0].partial_estate_tax_source
            .recipient_allocated_federal_estate_tax++,
        (q: any) =>
          q.form4972.forms[0].partial_estate_tax_source
            .estate_tax_return_reference =
              q.f1099r.f1099rs[0].source_document_reference,
        (q: any) => q.form4972.forms[0].line6++,
        (q: any) => q.f1040.form4972_tax++,
      ]
    ) {
      const q: any = structuredClone(pending);
      mutate(q);
      await assertRejects(() => f1040_2025.prepareReturn!(q, filer));
      await assertRejects(() => buildPdfBytes(q, filer));
    }
  }
});

Deno.test("death and estate group rejects incomplete beneficiary, owner, source and allocation facts before graph", () => {
  const base = partialBeneficiaryMultipleAllocationInputs(
    3,
    "death-estate-nua-annuity",
  );
  for (
    const [index, mutate] of [
      (q: any) =>
        q.f1099r[1].source_document_reference =
          q.f1099r[0].source_document_reference,
      (q: any) =>
        q.f1099r[1].form4972_plan = {
          ...q.f1099r[1].form4972_plan,
          plan_reference: "other-plan",
        },
      (q: any) => q.f1099r[1].recipient_ssn = "987654321",
      // A nonintegral NUA split is now applicable; exceeding the issued
      // taxable distribution remains an invalid capital source.
      (q: any) =>
        q.f1099r[2].box3_capital_gain = q.f1099r[2].box2a_taxable_amount + 1,
      (q: any) =>
        q.form4972.elections[0].death_benefit_allocation.participant_ssn =
          "111223333",
      (q: any) =>
        q.form4972.elections[0].death_benefit_allocation.recipients[1]
          .excluded_amount++,
      (q: any) =>
        q.form4972.elections[0].death_benefit_recipient_allocated_amount++,
      (q: any) =>
        q.form4972.elections[0].partial_estate_tax_source
          .full_distribution_taxable_amount++,
      (q: any) =>
        q.form4972.elections[0].partial_estate_tax_source
          .recipient_allocated_federal_estate_tax++,
      (q: any) =>
        q.form4972.elections[0].partial_estate_tax_source
          .administrator_statement_reference =
            q.form4972.elections[0].death_benefit_exclusion_source_reference,
      (q: any) =>
        q.form4972.elections[0].participant_died_before_1996_08_21 = false,
    ].entries()
  ) {
    const q: any = structuredClone(base);
    mutate(q);
    assertEquals(
      f1040_2025.executeReturn(q).diagnostics.length > 0,
      true,
      `mutation ${index}`,
    );
  }
});

const allocationTax: Record<AllocationRoute, readonly [number, number]> = {
  "death-estate-nua-annuity": [2215, 4510],
  "estate-nua-annuity-part3": [2490, 4735],
  "death-nua-part3": [2010, 4105],
  "estate-nua-part3": [2290, 4405],
  "death-nua": [2135, 4235],
  "estate-nua": [2420, 4535],
  "death-estate-nua": [1990, 4075],
  "death-annuity": [1895, 3810],
  "estate-annuity": [2165, 4095],
  "death-estate-annuity": [1755, 3660],
  death: [1675, 3385],
  estate: [1955, 3685],
  "death-estate": [1535, 3235],
};

Deno.test("all sourced death-only, estate-only, and combined two/three-copy routes retain native and PDF 4972", async () => {
  for (
    const [route, taxes] of Object.entries(allocationTax) as [
      AllocationRoute,
      readonly [number, number],
    ][]
  ) {
    for (const count of [2, 3] as const) {
      const input = partialBeneficiaryMultipleAllocationInputs(count, route);
      const result = f1040_2025.executeReturn(input);
      assertEquals(result.diagnostics, [], `${route}/${count}`);
      const pending: any = result.pending;
      const form = pending.form4972.forms[0];
      const tax = taxes[count - 2];
      assertEquals(form.line30, tax, `${route}/${count}`);
      assertEquals(pending.f1040.line16_income_tax, tax, `${route}/${count}`);
      assertEquals(
        form.source_document_references,
        input.f1099r.map((copy) => copy.source_document_reference),
      );
      const filer = extractFilerIdentity(input.general)!;
      const prepared = await f1040_2025.prepareReturn!(pending, filer);
      const xml = prepared.bundle.xml;
      assertEquals((xml.match(/<IRS4972\b/g) ?? []).length, 1);
      assertStringIncludes(
        xml,
        `<LumpSumDistributionTaxAmt>${tax}</LumpSumDistributionTaxAmt>`,
      );
      const id = `beneficiary-${count}-${route}`;
      const xmlPath = `${dir}/${id}.xml`;
      const pdfPath = `${dir}/${id}.pdf`;
      await Deno.writeTextFile(
        `${dir}/${id}.json`,
        JSON.stringify({ input, pending }, null, 2),
      );
      await Deno.writeTextFile(xmlPath, xml);
      const pdf = await prepared.renderPdf();
      await Deno.writeFile(pdfPath, pdf);
      const document = await PDFDocument.load(pdf);
      assertEquals(document.getPageCount(), 3, id);
      assertEquals(document.getForm().getFields().length, 0, id);
      const schema = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", xsd, xmlPath],
        stderr: "piped",
      }).output();
      assertEquals(
        schema.code,
        0,
        `${id}: ${new TextDecoder().decode(schema.stderr)}`,
      );
      const extracted = await new Deno.Command("pdftotext", {
        args: ["-layout", pdfPath, "-"],
        stdout: "piped",
        stderr: "piped",
      }).output();
      assertEquals(extracted.code, 0, id);
      const text = new TextDecoder().decode(extracted.stdout);
      assertStringIncludes(text, String(tax));
      assertStringIncludes(text, "MRD");
      await Deno.writeTextFile(`${dir}/${id}.txt`, text);
    }
  }
});
