import { assertEquals, assertRejects } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { normalizeAllPending } from "./pending.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "./pdf/builder.ts";
import {
  preferentialAmtCases,
  preferentialAmtInputs,
} from "./form4972_preferential_amt.fixture.ts";
import expected from "./form4972_preferential_amt.expected.json" with {
  type: "json",
};
import specialExpected from "./form4972_full_share_cents.expected.json" with {
  type: "json",
};
Deno.test("complete issued Form4972 inventories reconcile preferential source income, ISO AMT and phaseout through full packets", async () => {
  const dir = Deno.env.get("FORM4972_PREFERENTIAL_AMT_EVIDENCE_DIR") ??
    ".state/research/4972-preferential-amt-source";
  await Deno.mkdir(dir, { recursive: true });
  for (const entry of preferentialAmtCases) {
    const id = entry[0],
      input = preferentialAmtInputs(entry),
      want = expected[id];
    const r = f1040_2025.executeReturn(input);
    assertEquals(r.diagnostics, [], id);
    const p: any = normalizeAllPending(r.pending);
    assertEquals(p.f1040.line11_agi, want.agi, id);
    assertEquals(p.f1040.line12a_standard_deduction, want.standard, id);
    assertEquals(p.f1040.line13b_additional_deductions ?? 0, want.senior, id);
    assertEquals(p.f1040.line15_taxable_income, want.taxable, id);
    assertEquals(p.f1040.form4972_tax, want.form4972_tax, id);
    assertEquals(p.f1040.line16_income_tax, want.line16, id);
    assertEquals(p.f1040.line17_additional_taxes, want.amt, id);
    assertEquals(p.f1040.line23_other_taxes ?? 0, want.niit, id);
    assertEquals(p.f1040.line24_total_tax, want.total_tax, id);
    assertEquals(p.f1040.line37_amount_owed, want.amount_owed, id);
    assertEquals(p.f1040.line5b_pension_taxable ?? 0, 0, id);
    const amt = p.form6251;
    assertEquals(amt.form4972_tax, want.form4972_tax, id);
    assertEquals(amt.iso_adjustment, want.iso_adjustment, id);
    assertEquals(amt.amti, want.amti, id);
    assertEquals(amt.exemption, want.exemption, id);
    assertEquals(amt.taxable_excess, want.taxable_excess, id);
    assertEquals(amt.regular_tax, want.regular_tax, id);
    assertEquals(amt.tentative_tax, want.part3.line40, id);
    assertEquals(amt.net_tmt, want.part3.line40, id);
    assertEquals(amt.line11_amt, want.amt, id);
    assertEquals(p.schedule2.line2_amt, want.amt, id);
    for (const [key, value] of Object.entries(want.part3)) {
      assertEquals(amt[key], value, `${id} AMT ${key}`);
    }
    for (const [i, form] of p.form4972.forms.entries()) {
      const work = (specialExpected as any)[`${id}-${i ? "S" : "T"}`];
      for (const [key, value] of Object.entries(work)) {
        assertEquals(form[key], value, `${id} ${form.ts} ${key}`);
      }
    }
    const filer = extractFilerIdentity(p.f1040)!;
    const prepared = await f1040_2025.prepareReturn!(r.pending, filer);
    assertEquals(
      (prepared.bundle.xml.match(/<IRS1099R /g) ?? []).length,
      input.f1099r.length,
      id,
    );
    assertEquals(
      (prepared.bundle.xml.match(/<IRS4972 /g) ?? []).length,
      p.form4972.forms.length,
      id,
    );
    assertEquals((prepared.bundle.xml.match(/<IRS6251 /g) ?? []).length, 1, id);
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    await Deno.writeTextFile(
      `${dir}/${id}.json`,
      JSON.stringify({ input, pending: p }, null, 2),
    );
    await Deno.writeTextFile(`${dir}/${id}.xml`, prepared.bundle.xml);
    await Deno.writeFile(`${dir}/${id}.pdf`, pdf);
    await Deno.writeTextFile(
      `${dir}/${id}.origins.json`,
      JSON.stringify(origins, null, 2),
    );
    const x = await new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        `${dir}/${id}.xml`,
      ],
    }).output();
    assertEquals(x.code, 0, new TextDecoder().decode(x.stderr));
    const text = await new Deno.Command("pdftotext", {
      args: ["-layout", `${dir}/${id}.pdf`, `${dir}/${id}.txt`],
    }).output();
    assertEquals(text.code, 0);
    console.log(
      id,
      "tax",
      want.total_tax,
      "AMT",
      want.amt,
      "pages",
      origins.length,
    );
    const mutations = [
      (q: any) => q.f1099r.f1099rs[0].box2a_taxable_amount += 0.01,
      (q: any) => q.f3921.f3921s[0].box4_fmv_per_share += 1,
      (q: any) => q.f3921.f3921s[0].employee_tin = "555667777",
      (q: any) => q.f1099div.f1099divs[0].box1b += 1,
      (q: any) =>
        q.f1099div.f1099divs[0].qualified_dividend_filing_review
          .qualified_held_days_in_121_day_window = 60,
      (q: any) => q.form6251.form4972_tax = 0,
      (q: any) => q.form6251.exemption += 1,
      (q: any) => {
        q.form6251.regular_tax += want.form4972_tax;
        q.form6251.line11_amt -= want.form4972_tax;
        q.schedule2.line2_amt -= want.form4972_tax;
        for (
          const key of [
            "line17_additional_taxes",
            "line18_total_tax_before_credits",
            "line22_tax_after_credits",
            "line24_total_tax",
            "line37_amount_owed",
          ]
        ) q.f1040[key] -= want.form4972_tax;
      },
    ];
    for (const [mutationIndex, change] of mutations.entries()) {
      console.log(id, "final mutation", mutationIndex);
      const q = structuredClone(p);
      change(q);
      await assertRejects(() => f1040_2025.prepareReturn!(q, filer), Error);
      await assertRejects(() => buildPdfBytes(q, filer, ".pdf-cache"), Error);
    }
  }
});
Deno.test("preferential AMT sources reject incomplete ownership, issuer, holding and exercise inventories before filing", async () => {
  const source = preferentialAmtInputs(preferentialAmtCases[0]);
  for (
    const change of [
      (q: any) => q.f1099div[0].recipient_tin = "555667777",
      (q: any) =>
        q.f1099div[0].qualified_dividend_filing_review
          .qualified_held_days_in_121_day_window = 60,
      (q: any) => q.f3921.push(structuredClone(q.f3921[0])),
      (q: any) => delete q.schedule_b_part_iii,
    ]
  ) {
    const q = structuredClone(source);
    change(q);
    let rejected = false;
    try {
      rejected = f1040_2025.executeReturn(q).diagnostics.length > 0;
    } catch {
      rejected = true;
    }
    if (!rejected) {
      const r = f1040_2025.executeReturn(q);
      const p: any = normalizeAllPending(r.pending);
      await assertRejects(
        () =>
          f1040_2025.prepareReturn!(r.pending, extractFilerIdentity(p.f1040)!),
        Error,
      );
    }
  }
});
