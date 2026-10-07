import { assertEquals, assertRejects } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { normalizeAllPending } from "./pending.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import {
  fullShareCentCases,
  fullShareCentInputs,
} from "./form4972_full_share_cents.fixture.ts";
import expected from "./form4972_full_share_cents.expected.json" with {
  type: "json",
};
Deno.test("full share cent-valued issued inventories match independent worksheets and full packets", async () => {
  const dir = ".state/research/2026-10-06-form4972-full-share-cents";
  await Deno.mkdir(dir, { recursive: true });
  for (const entry of fullShareCentCases) {
    const id = entry[0], input = fullShareCentInputs(entry);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, [], id);
    const p: any = normalizeAllPending(result.pending);
    const forms = p.form4972.forms;
    if (id === "fifty-rounding") {
      assertEquals(forms[0].lump_sum_amount, 100000.50);
      assertEquals(forms[0].capital_gain_amount, 10000.50);
      assertEquals(forms[0].box6_nua, 20000.50);
      assertEquals(forms[0].annuity_actuarial_value, 20000.50);
    }

    let tax = 0;
    for (const [i, form] of forms.entries()) {
      const owner = i ? "S" : "T";
      const work = (expected as any)[`${id}-${owner}`];
      for (const [key, value] of Object.entries(work)) {
        assertEquals(form[key], value, `${id}-${owner}-${key}`);
      }
      if (!entry[4]) {
        assertEquals(form.line6, undefined);
        assertEquals(form.line7, undefined);
      }
      assertEquals(
        form.source_document_references.length,
        input.f1099r.filter((r: any) => r.ts === owner).length,
      );
      tax += work.line30;
    }
    assertEquals(p.f1040.form4972_tax, tax);
    assertEquals(p.f1040.line16_income_tax, tax);
    assertEquals(p.f1040.line24_total_tax, tax);
    assertEquals(p.f1040.line5b_pension_taxable ?? 0, 0);
    const filer = extractFilerIdentity(p.f1040);
    const prepared = await f1040_2025.prepareReturn!(result.pending, filer);
    assertEquals(
      (prepared.bundle.xml.match(/<IRS4972 /g) ?? []).length,
      forms.length,
    );
    assertEquals(
      (prepared.bundle.xml.match(/<IRS1099R /g) ?? []).length,
      input.f1099r.length,
    );
    const stem = `${dir}/${id}`;
    await Deno.writeTextFile(
      `${stem}.json`,
      JSON.stringify({ input, pending: p }, null, 2),
    );
    await Deno.writeTextFile(`${stem}.xml`, prepared.bundle.xml);
    await Deno.writeFile(`${stem}.pdf`, await prepared.renderPdf());
    const x = await new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        `${stem}.xml`,
      ],
      stderr: "piped",
    }).output();
    assertEquals(x.code, 0, new TextDecoder().decode(x.stderr));
    const text = await new Deno.Command("pdftotext", {
      args: ["-layout", `${stem}.pdf`, `${stem}.txt`],
    }).output();
    assertEquals(text.code, 0);
    console.log(id, tax, input.f1099r.length);
    for (
      const change of [
        (q: any) => q.f1099r.f1099rs[0].box2a_taxable_amount += 0.01,
        (q: any) => q.f1099r.f1099rs[0].box6_nua += 0.01,
        (q: any) => q.f1099r.f1099rs[0].box8_other += 0.01,
        (q: any) => q.form4972.forms[0].line8++,
        (q: any) => q.form4972.forms[0].line30++,
        (q: any) => q.f1040.line16_income_tax++,
      ]
    ) {
      const q: any = structuredClone(result.pending);
      change(q);
      await assertRejects(() => f1040_2025.prepareReturn!(q, filer));
      await assertRejects(() => buildPdfBytes(q, filer));
    }
  }
});
Deno.test("full share cent-valued public sources reject subcent NUA and annuity amounts", () => {
  for (
    const field of [
      "box2a_taxable_amount",
      "box3_capital_gain",
      "box6_nua",
      "box8_other",
    ]
  ) {
    const input = fullShareCentInputs(fullShareCentCases[2]);
    input.f1099r[0][field] += 0.001;
    const result = f1040_2025.executeReturn(input);
    assertEquals(
      result.diagnostics.some((d) => d.severity === "error"),
      true,
      field,
    );
  }
});
