import { assertEquals, assertRejects } from "@std/assert";
import { f1040_2025 } from "../../../index.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { normalizeAllPending } from "../../execution/pending.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";
import { multipleNuaInputs } from "../../../pdf/reviews/composed/review-4972-multiple-nua.fixture.ts";

const expectedTax: Record<number, number> = {
  2: 1790,
  3: 3630,
  4: 5680,
  5: 7790,
  7: 12080,
};
Deno.test("all actual same-plan NUA source copies and two spouses independently reconcile full returns", async () => {
  for (const [n, spouse] of [[3, 0], [5, 0], [7, 0], [2, 3], [4, 5]]) {
    const input = multipleNuaInputs(n, spouse);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const p: any = normalizeAllPending(result.pending);
    const counts = spouse ? [n, spouse] : [n];
    const forms = p.form4972.forms;
    assertEquals(forms.length, counts.length);
    for (let i = 0; i < counts.length; i++) {
      const c = counts[i];
      const form = forms[i];
      assertEquals(form.lump_sum_amount, c * 10000);
      assertEquals(form.capital_gain_amount, c * 1000);
      assertEquals(form.box6_nua, c * 2000);
      assertEquals(form.line6_nua_capital_gain, c * 200);
      assertEquals(form.line6, c * 1200);
      assertEquals(form.line8, c * 10800);
      assertEquals(form.line30, expectedTax[c]);
      assertEquals(form.source_document_references.length, c);
    }
    const tax = counts.reduce((sum, c) => sum + expectedTax[c], 0);
    assertEquals(p.f1040.form4972_tax, tax);
    assertEquals(p.f1040.line16_income_tax, tax);
    assertEquals(p.f1040.line24_total_tax, tax);
    assertEquals(p.f1040.line5b_pension_taxable ?? 0, 0);
    const filer = extractFilerIdentity(p.f1040);
    const prepared = await f1040_2025.prepareReturn!(result.pending, filer);
    assertEquals(
      (prepared.bundle.xml.match(/<IRS4972 /g) ?? []).length,
      counts.length,
    );
    const dir = ".state/research/2026-10-06-form4972-multiple-nua-source";
    await Deno.mkdir(dir, { recursive: true });
    const id = `primary-${n}-spouse-${spouse}`;
    await Deno.writeTextFile(
      `${dir}/${id}.json`,
      JSON.stringify({ input, pending: p }, null, 2),
    );
    await Deno.writeTextFile(`${dir}/${id}.xml`, prepared.bundle.xml);
    await Deno.writeFile(`${dir}/${id}.pdf`, await prepared.renderPdf());
    const x = await new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        `${dir}/${id}.xml`,
      ],
      stderr: "piped",
    }).output();
    assertEquals(x.code, 0, new TextDecoder().decode(x.stderr));
    console.log(id, counts, tax);
    for (
      const mutate of [
        (q: any) => q.f1099r.f1099rs.pop(),
        (q: any) => q.f1099r.f1099rs[0].box6_nua++,
        (q: any) => q.f1099r.f1099rs[0].box3_capital_gain++,
        (q: any) =>
          q.f1099r.f1099rs[0].form4972_plan.plan_reference = "other plan",
        (q: any) =>
          q.f1099r.f1099rs[0].source_document_reference =
            q.f1099r.f1099rs[1].source_document_reference,
        (q: any) => q.form4972.forms[0].line6++,
        (q: any) => q.f1040.line16_income_tax++,
        (q: any) => q.f1099r.f1099rs[0].recipient_ssn = "111223333",
      ]
    ) {
      const q: any = structuredClone(result.pending);
      mutate(q);
      await assertRejects(() => f1040_2025.prepareReturn!(q, filer));
      await assertRejects(() => buildPdfBytes(q, filer));
    }
  }
});
