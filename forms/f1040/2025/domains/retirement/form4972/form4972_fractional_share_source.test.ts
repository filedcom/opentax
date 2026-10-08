import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../index.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";
import {
  fractionalBeneficiaryCases,
  fractionalBeneficiaryInputs,
} from "../../../pdf/reviews/composed/review-4972-fractional.fixture.ts";
import expected from "../../../pdf/reviews/composed/review-4972-fractional.expected.json" with {
  type: "json",
};

const dir = ".state/research/2026-10-06-form4972-fractional-share";
const xsd =
  ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd";
Deno.test("fractional beneficiary cents retain full issued sources and independently calculated IRS worksheets in complete XML/PDF", async () => {
  await Deno.mkdir(dir, { recursive: true });
  for (const spec of fractionalBeneficiaryCases) {
    const input = fractionalBeneficiaryInputs(spec);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, [], spec.id);
    const pending: any = result.pending;
    const form = pending.form4972.forms[0];
    const e: Record<string, number> =
      expected[spec.id as keyof typeof expected];
    for (
      const key of [
        ...Array.from({ length: 25 }, (_, i) => `line${i + 6}`),
        "line6_nua_capital_gain",
        "line8_nua_included",
      ]
    ) {
      assertEquals(form[key], e[key], `${spec.id} ${key}`);
    }
    assertEquals(form.recipient_share_pct, spec.share);
    assertEquals(
      form.annuity_actuarial_value ?? 0,
      input.f1099r.reduce((s, c) => s + c.box8_other, 0),
    );
    assertEquals(
      form.lump_sum_amount,
      input.f1099r.reduce((s, c) => s + c.box2a_taxable_amount, 0),
    );
    assertEquals(pending.f1099r.f1099rs, input.f1099r);
    assertEquals([
      pending.f1040.form4972_tax,
      pending.f1040.line16_income_tax,
      pending.f1040.line24_total_tax,
    ], [e.line30, e.line30, e.line30]);
    assertEquals(pending.f1040.line5b_pension_taxable ?? 0, 0);
    const filer = extractFilerIdentity(input.general)!;
    const prepared = await f1040_2025.prepareReturn!(pending, filer);
    const xml = prepared.bundle.xml;
    assertEquals((xml.match(/<IRS4972\b/g) ?? []).length, 1);
    assertEquals((xml.match(/<IRS1099R\b/g) ?? []).length, input.f1099r.length);
    const nativeLines: Record<string, string> = {
      line6: "CapitalGainElectionAmt",
      line8: "LumpSumDistriOrdinaryIncmAmt",
      line11: "AnnuityActuarialValueAmt",
      line20: "LumpSumDistriActuarialAdjPct",
      line21: "LumpSumDistriMinAllwPercentAmt",
      line22: "LumpSumDistriAdjActuarialAmt",
      line23: "LumpSumDistriPctAdjTxblAmt",
      line24: "LumpSumDistriTaxOnPercentAmt",
      line25: "LumpSumDistriTentAvgTaxAmt",
      line26: "LumpSumDistriTxblAdjActrlAmt",
      line27: "AdjustedActuarialAmt",
      line28: "LumpSumDistriAdjAverageTaxAmt",
      line29: "LumpSumRsdlAnnuityAvgTaxAmt",
      line30: "LumpSumDistributionTaxAmt",
    };
    for (const [key, tag] of Object.entries(nativeLines)) {
      if (!(e[key] > 0)) continue;
      const emitted = xml.match(new RegExp(`<${tag}\\b[^>]*>([^<]+)</${tag}>`));
      assertEquals(Number(emitted?.[1]), e[key], `${spec.id} native ${key}`);
    }

    assertStringIncludes(
      xml,
      `<LumpSumDistributionTaxAmt>${e.line30}</LumpSumDistributionTaxAmt>`,
    );
    assertStringIncludes(xml, "LumpSumDistriMultRecipientsCd>MRD</");
    if (e.line20) {
      assertStringIncludes(
        xml,
        `<LumpSumDistriActuarialAdjPct>${
          e.line20.toFixed(5)
        }</LumpSumDistriActuarialAdjPct>`,
      );
    }
    const path = `${dir}/${spec.id}`;
    await Deno.writeTextFile(
      `${path}.json`,
      JSON.stringify({ input, pending }, null, 2),
    );
    await Deno.writeTextFile(`${path}.xml`, xml);
    const pdf = await prepared.renderPdf();
    await Deno.writeFile(`${path}.pdf`, pdf);
    const doc = await PDFDocument.load(pdf);
    assertEquals(doc.getPageCount(), 3);
    assertEquals(doc.getForm().getFields().length, 0);
    const schema = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, `${path}.xml`],
      stderr: "piped",
    }).output();
    assertEquals(schema.code, 0, new TextDecoder().decode(schema.stderr));
    const text = await new Deno.Command("pdftotext", {
      args: ["-layout", `${path}.pdf`, `${path}.txt`],
      stderr: "piped",
    }).output();
    assertEquals(text.code, 0, new TextDecoder().decode(text.stderr));
  }
});

Deno.test("fractional source exports reject detached issued boxes, source owner, allocation cents, percentages and filed worksheet tax", async () => {
  for (const id of ["two-death-estate-nua-annuity", "single-all-33333"]) {
    const spec = fractionalBeneficiaryCases.find((c) => c.id === id)!;
    const input = fractionalBeneficiaryInputs(spec);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const filer = extractFilerIdentity(input.general)!;
    const mutations: [string, (q: any) => void][] = [
      [
        "issued taxable cent",
        (q) => q.f1099r.f1099rs[0].box2a_taxable_amount += .01,
      ],
      ["issued gain cent", (q) => q.f1099r.f1099rs[0].box3_capital_gain += .01],
      ["issued NUA cent", (q) => q.f1099r.f1099rs.at(-1).box6_nua += .01],
      ["issued annuity cent", (q) => q.f1099r.f1099rs.at(-1).box8_other += .01],
      ["cash percentage", (q) => q.f1099r.f1099rs[0].box9a_pct_total += .001],
      [
        "annuity percentage",
        (q) => q.f1099r.f1099rs.at(-1).box8_pct_total += .001,
      ],
      [
        "source recipient",
        (q) => q.f1099r.f1099rs[0].recipient_ssn = "111223333",
      ],
      [
        "source plan",
        (q) => q.f1099r.f1099rs[0].form4972_plan.participant_ssn = "555667777",
      ],
      [
        "death allocated cent",
        (q) =>
          q.form4972.forms[0].death_benefit_recipient_allocated_amount += .01,
      ],
      [
        "death inventory cent",
        (q) =>
          q.form4972.forms[0].death_benefit_allocation.recipients[1]
            .excluded_amount += .01,
      ],
      [
        "estate allocated cent",
        (q) =>
          q.form4972.forms[0].partial_estate_tax_source
            .recipient_allocated_federal_estate_tax += .01,
      ],
      [
        "estate full taxable cent",
        (q) =>
          q.form4972.forms[0].partial_estate_tax_source
            .full_distribution_taxable_amount += .01,
      ],
      ["subcent source", (q) => q.form4972.forms[0].lump_sum_amount += .001],
      ...[6, 8, 11, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30].map((n) =>
        [
          `line${n}`,
          (q: any) => q.form4972.forms[0][`line${n}`] += n === 20 ? .00001 : 1,
        ] as [string, (q: any) => void]
      ),
      ["1040 tax", (q) => q.f1040.form4972_tax++],
    ];
    if (spec.copies > 1) {
      mutations.push([
        "duplicate issued reference",
        (q) =>
          q.f1099r.f1099rs[1].source_document_reference =
            q.f1099r.f1099rs[0].source_document_reference,
      ]);
    }
    for (const [label, mutate] of mutations) {
      const q = structuredClone(result.pending);
      mutate(q);
      await assertRejects(
        () => f1040_2025.prepareReturn!(q, filer),
        `${id} native ${label}`,
      );
      await assertRejects(
        () => buildPdfBytes(q, filer),
        `${id} PDF ${label}`,
      );
    }
  }
  for (
    const mutate of [
      (q: any) => q.f1099r[0].box9a_pct_total = 41.125,
      (q: any) => q.f1099r[0].box2a_taxable_amount += .001,
      (q: any) =>
        q.form4972.elections[0].death_benefit_allocation.recipients[0]
          .excluded_amount += .01,
    ]
  ) {
    const input = fractionalBeneficiaryInputs(
      fractionalBeneficiaryCases.find((c) =>
        c.id === "two-death-estate-nua-annuity"
      )!,
    );
    mutate(input);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics.length > 0, true);
  }
});
