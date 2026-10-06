import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "./index.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { partialBeneficiaryMultipleInputs } from "./pdf/review-4972-partial-multiple.fixture.ts";

const dir = ".state/research/2026-10-06-form4972-beneficiary-multiple-partial";
const xsd =
  ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd";
const expected = {
  2: {
    taxable: 20000,
    gain: 4000,
    nua: 2000,
    annuity: 1500,
    line6: 4400,
    line8: 35200,
    line11: 6000,
    line29: 1910,
    tax: 2790,
  },
  3: {
    taxable: 30000,
    gain: 6000,
    nua: 4000,
    annuity: 3000,
    line6: 6800,
    line8: 54400,
    line11: 12000,
    line29: 3760,
    tax: 5120,
  },
};

Deno.test("same-participant partial beneficiary combines two and three issued cash, NUA and annuity copies", async () => {
  await Deno.mkdir(dir, { recursive: true });
  for (const count of [2, 3] as const) {
    const input = partialBeneficiaryMultipleInputs(count);
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
    assertEquals(form.lump_sum_amount, e.taxable);
    assertEquals(form.capital_gain_amount, e.gain);
    assertEquals(form.box6_nua, e.nua);
    assertEquals(form.annuity_actuarial_value, e.annuity);
    assertEquals(form.recipient_share_pct, 50);
    assertEquals(form.annuity_share_pct, 25);
    assertEquals([
      form.line6,
      form.line8,
      form.line11,
      form.line29,
      form.line30,
    ], [e.line6, e.line8, e.line11, e.line29, e.tax]);
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
    const id = `beneficiary-${count}-copies`;
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
    assertStringIncludes(text, String(e.tax));
    assertStringIncludes(text, String(e.line11));
    assertStringIncludes(text, "MRD");
    await Deno.writeTextFile(`${dir}/${id}.txt`, text);
    for (
      const mutate of [
        (q: any) => q.f1099r.f1099rs.pop(),
        (q: any) => q.f1099r.f1099rs[0].box9a_pct_total = 40,
        (q: any) => q.f1099r.f1099rs[1].box8_pct_total = 50,
        (q: any) => q.f1099r.f1099rs[1].box8_other++,
        (q: any) => q.f1099r.f1099rs[1].box1_gross_distribution++,
        (q: any) => q.f1099r.f1099rs[1].box6_nua++,
        (q: any) => q.f1099r.f1099rs[1].box3_capital_gain++,
        (q: any) => q.f1099r.f1099rs[0].box2a_taxable_amount++,
        (q: any) =>
          q.f1099r.f1099rs[1].form4972_plan.plan_reference = "other-plan",
        (q: any) => q.f1099r.f1099rs[1].recipient_ssn = "111223333",
        (q: any) =>
          q.f1099r.f1099rs[1].source_document_reference =
            q.f1099r.f1099rs[0].source_document_reference,
        (q: any) => q.form4972.forms[0].line11++,
        (q: any) => q.f1040.line16_income_tax++,
      ]
    ) {
      const q: any = structuredClone(pending);
      mutate(q);
      await assertRejects(() => f1040_2025.prepareReturn!(q, filer));
      await assertRejects(() => buildPdfBytes(q, filer));
    }
  }
});

Deno.test("partial beneficiary source rejects unequal or unsupported share facts before graph", () => {
  const base = partialBeneficiaryMultipleInputs(3);
  for (
    const mutate of [
      (q: any) => q.f1099r[1].box9a_pct_total = 25,
      (q: any) => q.f1099r[2].box8_pct_total = 50,
      (q: any) => q.f1099r[1].box2a_taxable_amount = 10001,
      (q: any) => q.f1099r[1].box6_nua = 2001,
      (q: any) => q.f1099r[1].box1_gross_distribution++,
      (q: any) => q.f1099r[1].box7_distribution_code = "7",
      (q: any) => q.f1099r[1].recipient_ssn = "987654321",
      (q: any) =>
        q.f1099r.push({
          ...q.f1099r[2],
          source_document_reference: "unelected-fourth-issued-copy",
        }),
    ]
  ) {
    const q: any = structuredClone(base);
    mutate(q);
    const result = f1040_2025.executeReturn(q);
    assertEquals(result.diagnostics.length > 0, true);
  }
});
