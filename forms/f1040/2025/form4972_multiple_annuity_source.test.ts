import { assertEquals, assertRejects } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { normalizeAllPending } from "./pending.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { multipleAnnuityInputs } from "./pdf/review-4972-multiple-annuity.fixture.ts";

// Independent Form4972 worksheet and 1986 rate-schedule totals, including
// subtraction of the separate annuity tax on lines26-28.
const expectedTax: Record<number, number> = {
  1: 830,
  2: 2080,
  3: 4090,
  4: 6230,
  5: 8510,
  7: 12760,
};
Deno.test("complete same-plan cash NUA and annuity sources reconcile independent owner taxes", async () => {
  for (
    const [n, spouse, nua] of [
      [3, 0, 1],
      [5, 0, 1],
      [7, 0, 1],
      [2, 3, 1],
      [4, 5, 1],
      [1, 1, 1],
      [3, 0, 0],
    ]
  ) {
    const input = multipleAnnuityInputs(n, spouse, nua === 1);
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
      assertEquals(form.box6_nua ?? 0, nua ? c * 2000 : 0);
      assertEquals(form.line6_nua_capital_gain ?? 0, nua ? c * 200 : 0);
      assertEquals(form.line6, c * (nua ? 1200 : 1000));
      assertEquals(form.line8, c * (nua ? 10800 : 9000));
      assertEquals(form.line11, c * 2000);
      assertEquals(form.line20, nua ? 0.15625 : 0.18182);
      assertEquals(form.line30, nua ? expectedTax[c] : 3100);
      assertEquals(form.source_document_references.length, c);
    }
    const tax = counts.reduce(
      (sum, c) => sum + (nua ? expectedTax[c] : 3100),
      0,
    );
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
    const dir = ".state/research/2026-10-06-form4972-multiple-annuity-source";
    await Deno.mkdir(dir, { recursive: true });
    const id = `primary-${n}-spouse-${spouse}-nua-${nua}`;
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
        (q: any) => q.f1099r.f1099rs[0].box8_other++,
        (q: any) => q.f1099r.f1099rs[0].box8_pct_total = 99,
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
