import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../index.ts";
import { preferentialFamily } from "./form8863-parent-preferential.fixture.ts";
import { irs1040 } from "../mef/forms/f1040.ts";
import { irs1040Pdf } from "./forms/f1040.ts";
import { form8615 } from "../mef/forms/f8615.ts";
import { form8615Pdf } from "./forms/f8615.ts";
const xsd = new URL(
  "../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
const evidence = "/tmp/opentax-f8863-parent-preferential-evidence";
// Independent transcription of IRS i1040gi--2025 pp38/80, not the engine tax helper.
function worksheet(ti: number, mfs: boolean) {
  const ordinary = ti - 7000,
    zero = mfs ? 48350 : 96700,
    fifteen = mfs ? 300000 : 600050;
  const ordinaryTax = (v: number) =>
    v * (mfs ? .24 : .22) - (mfs ? 7153 : 10172);
  return [
    ti,
    4000,
    3000,
    7000,
    ordinary,
    zero,
    zero,
    zero,
    0,
    7000,
    0,
    7000,
    fifteen,
    ti,
    ordinary,
    7000,
    7000,
    1050,
    7000,
    0,
    0,
    ordinaryTax(ordinary),
    ordinaryTax(ordinary) + 1050,
    ordinaryTax(ti),
    ordinaryTax(ordinary) + 1050,
  ];
}
for (const mfs of [false, true]) {
  Deno.test(`issued selected-parent preferential ${mfs ? "MFS" : "MFJ"} full family source/XSD/PDF`, async () => {
    const f = preferentialFamily(mfs),
      selected = f.parents[mfs ? 1 : 0],
      p = selected.pending;
    assertEquals(
      [
        p.f1040.line1a_wages,
        p.f1040.line3b_ordinary_dividends,
        p.f1040.line3a_qualified_dividends,
        p.f1040.line7a_cap_gain_distrib,
        p.f1040.line11_agi,
        p.f1040.line15_taxable_income,
        p.f1040.line16_income_tax,
      ],
      mfs
        ? [110000, 6000, 4000, 3000, 119000, 119000, 20777]
        : [170000, 6000, 4000, 3000, 179000, 147500, 21788],
    );
    assertEquals(p.f1099div.f1099divs.length, 2);
    assertEquals(
      p.f1099div.f1099divs.map((d: any) => d.recipient_tin),
      mfs ? ["999887777", "999887777"] : ["999887777", "111223333"],
    );
    const parentWorksheet = worksheet(mfs ? 119000 : 147500, mfs),
      familyWorksheet = worksheet(mfs ? 133500 : 162000, mfs);
    assertEquals([
      parentWorksheet[21],
      parentWorksheet[23],
      parentWorksheet[24],
    ], mfs ? [19727, 21407, 20777] : [20738, 22278, 21788]);
    assertEquals([
      familyWorksheet[21],
      familyWorksheet[23],
      familyWorksheet[24],
    ], mfs ? [23207, 24887, 24257] : [23928, 25468, 24978]);
    if (!mfs) {
      assertEquals([
        p.f1040.line29_refundable_aoc,
        p.schedule3.line3_education_credit,
        p.f1040.line19_child_tax_credit,
        p.f1040.line24_total_tax,
        p.f1040.line35a_refund,
      ], [100, 150, 1000, 20638, 5462]);
      assertEquals(selected.inputs.f8863.map((s: any) => s.filer_magi), [
        179000,
        179000,
      ]);
    } else {
      assertEquals([
        f.parents[0].pending.f1040.line11_agi,
        f.parents[0].pending.f1040.line15_taxable_income,
        f.parents[0].pending.f1040.line16_income_tax,
        f.parents[0].pending.f1040.line19_child_tax_credit,
        p.f1040.line37_amount_owed,
      ], [75000, 55000, 7020, 1000, 2777]);
      for (const r of f.parents) {
        assertEquals(r.pending.f1040.line29_refundable_aoc ?? 0, 0);
      }
    }
    for (const [i, c] of f.children.entries()) {
      const t = c.childPending.form8615;
      assertEquals([
        t.parent_ssn,
        t.parent_filing_status,
        t.line6_parent_taxable_income,
        t.line9_family_tax,
        t.line10_parent_tax,
        t.line9_preferential_tax_used,
        t.line10_preferential_tax_used,
        t.line11_children_tax,
        t.line12b_allocation_ratio,
        t.line18_child_tax,
      ], [
        "999887777",
        mfs ? "mfs" : "mfj",
        mfs ? 119000 : 147500,
        familyWorksheet[24],
        parentWorksheet[24],
        true,
        true,
        mfs ? 3480 : 3190,
        i ? .569 : .431,
        mfs ? (i ? 1980 : 1500) : (i ? 1815 : 1375),
      ]);
      assertEquals(c.childPending.f1040.line16_income_tax, t.line18_child_tax);
      assertEquals(c.childPending.f1040.line11_agi, i ? 24000 : 22000);
      assertEquals(c.childPending.f1040.line12a_standard_deduction, 15750);
      assertEquals(c.childPending.f1040.line29_refundable_aoc ?? 0, 0);
      assertEquals(c.review.education_claimant_ssn, "111223333");
    }
    const rows = [
      ...f.parents.map((r: any, i: number) => ({
        ...r,
        stem: mfs ? (i ? "Pat-parent" : "Alex-parent") : "Pat-Alex-parent",
        pages: mfs ? (i ? 3 : 5) : 9,
      })),
      ...f.children.map((c: any, i: number) => ({
        inputs: c.child,
        pending: c.childPending,
        filer: c.childFiler,
        stem: i ? "Sam-child" : "Taylor-child",
        pages: 5,
      })),
    ];
    for (const r of rows) {
      const b = await f1040_2025.prepareReturn(r.pending, r.filer),
        child = r.stem.endsWith("child");
      assertEquals(b.bundle.xml.includes("<IRS8615"), child);
      assertEquals(b.bundle.xml.includes("<IRS8863"), !mfs && !child);
      if (child) {
        for (
          const value of [
            "<FamilyCapitalGainsTaxInd>X</FamilyCapitalGainsTaxInd>",
            "<ParentCapitalGainsTaxInd>X</ParentCapitalGainsTaxInd>",
            `<FamilyTentativeTaxAmt>${
              familyWorksheet[24]
            }</FamilyTentativeTaxAmt>`,
            `<ParentTentativeTaxAmt>${
              parentWorksheet[24]
            }</ParentTentativeTaxAmt>`,
          ]
        ) assertStringIncludes(b.bundle.xml, value);
      }
      if (r.pending === p) {
        assertStringIncludes(
          b.bundle.xml,
          "<QualifiedDividendsAmt>4000</QualifiedDividendsAmt>",
        );
        assertStringIncludes(b.bundle.xml, "Pat Domestic Equity Fund");
        assertStringIncludes(b.bundle.xml, "Owned Domestic Growth Fund");
      }
      const tmp = await Deno.makeTempFile({ suffix: ".xml" });
      try {
        await Deno.writeTextFile(tmp, b.bundle.xml);
        const q = await new Deno.Command("xmllint", {
          args: ["--noout", "--schema", xsd, tmp],
          stdout: "piped",
          stderr: "piped",
        }).output();
        assertEquals(q.code, 0, new TextDecoder().decode(q.stderr));
      } finally {
        await Deno.remove(tmp);
      }
      const pdf = await b.renderPdf(), doc = await PDFDocument.load(pdf);
      assertEquals(doc.getPageCount(), r.pages);
      assertEquals(doc.getForm().getFields().length, 0);
      if (Deno.args.includes("--write-review-artifacts")) {
        await Deno.mkdir(evidence, { recursive: true });
        const stem = `${mfs ? "MFS" : "MFJ"}-${r.stem}`;
        await Deno.writeTextFile(
          `${evidence}/${stem}-source-input.json`,
          JSON.stringify({ inputs: r.inputs, filer: r.filer }, null, 2),
        );
        await Deno.writeTextFile(
          `${evidence}/${stem}-full-return.xml`,
          b.bundle.xml,
        );
        await Deno.writeFile(`${evidence}/${stem}-filled-return.pdf`, pdf);
        await Deno.writeTextFile(
          `${evidence}/${mfs ? "MFS" : "MFJ"}-independent-worksheets.json`,
          JSON.stringify(
            {
              officialSource:
                "https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf",
              parentLines1through25: parentWorksheet,
              familyLines1through25: familyWorksheet,
            },
            null,
            2,
          ),
        );
      }
    }
  });
}
for (const mfs of [false, true]) {
  Deno.test(`preferential ${mfs ? "MFS" : "MFJ"} child source, method and reciprocal export tampering rejects`, async () => {
    const c = preferentialFamily(mfs).children[0];
    const record = (p: any) =>
      p.general.dependent_education_income_review.kiddie_tax_review
        .settled_parent_return.pending;
    const mutations: Array<(p: any) => void> = [
      (p) => record(p).f1099div.f1099divs[0].recipient_tin = "222334444",
      (p) => delete record(p).f1099div.f1099divs[0].source_document_reference,
      (p) =>
        record(p).f1099div.f1099divs.push(
          structuredClone(record(p).f1099div.f1099divs[0]),
        ),
      (p) =>
        record(p).f1099div.f1099divs[0].qualified_dividend_filing_review
          .qualified_held_days_in_121_day_window = 60,
      (p) =>
        record(p).f1099div.f1099divs[0].qualified_dividend_filing_review
          .eligible_issuer_and_no_disqualified_dividend_confirmed = false,
      (p) =>
        record(p).f1099div.f1099divs[0].qualified_dividend_filing_review
          .reviewed_on = "2025-01-01",
      (p) => record(p).f1099div.f1099divs[0].box1b = 2501,
      (p) => record(p).f1099div.f1099divs[0].box2a = 2001,
      (p) => record(p).f1099div.f1099divs[0].box2b = 1,
      (p) =>
        record(p).f1099div.f1099divs[0].source_document_reference =
          record(p).w2.w2s[0].source_document_reference,
      (p) =>
        record(p).f1099div.f1099divs[0].source_document_reference =
          p.general.dependent_education_income_review.student_w2_sources[0]
            .source_document_reference,
      (p) =>
        delete record(p).f1099div.f1099divs[0].qualified_dividend_filing_review,
      (p) =>
        record(p).f1099div.f1099divs[0].qualified_dividend_filing_review
          .ex_dividend_date = "2025-02-30",
      (p) => record(p).f1099div.f1099divs[0].isNominee = true,
      (p) => record(p).f1099div.f1099divs[0].foreign_source_dividends_usd = 1,
      (p) => record(p).f1040.line3a_qualified_dividends = 0,
      (p) => record(p).income_tax_calculation.qualified_dividends = 0,
      (p) =>
        record(p).schedule_b.dividend_detail[0].payer_name = "Unowned Fund",
      (p) => record(p).schedule_b.foreign_accounts_question = true,
      (p) => record(p).f1040.line7_capital_gain = 3000,
      (p) =>
        record(p).f1040.line16_income_tax = record(p).f1040.line24_total_tax -
          1,
      (p) => p.form8615.line9_family_tax = p.form8615.line10_parent_tax,
      (p) => p.form8615.line9_preferential_tax_used = false,
      (p) => p.form8615.line10_preferential_tax_used = false,
      (p) => p.f1040.line29_refundable_aoc = 1000,
      (p) =>
        p.general.dependent_education_income_review.kiddie_tax_review
          .other_child_returns[0].pending.form8615.line9_family_tax = 1,
    ];
    for (const mutate of mutations) {
      const p = structuredClone(c.childPending);
      mutate(p);
      assertThrows(() =>
        form8615.build(p.form8615, { filer: c.childFiler, pending: p })
      );
      assertThrows(() => form8615Pdf.instances!(p.form8615, c.childFiler, p));
      assertThrows(() =>
        irs1040.build(p.f1040, { filer: c.childFiler, pending: p })
      );
      assertThrows(() => irs1040Pdf.instances!(p.f1040, c.childFiler, p));
      await assertRejects(() => f1040_2025.prepareReturn(p, c.childFiler));
    }
    const sourceMutations: Array<(p: any) => void> = [
      (p) => record(p).f1099div.f1099divs[0].recipient_tin = "222334444",
      (p) =>
        record(p).f1099div.f1099divs[0].qualified_dividend_filing_review
          .qualified_held_days_in_121_day_window = 60,
      (p) => record(p).f1099div.f1099divs[0].box2a = 2001,
    ];
    for (const mutate of sourceMutations) {
      const input = structuredClone(c.child);
      mutate(input);
      assertEquals(
        f1040_2025.executeReturn(input).diagnostics.some((d) =>
          d.severity === "error"
        ),
        true,
      );
    }
  });
}
Deno.test("actual preferential parent exports reject detached portfolio source, MAGI/credit and income joins", async () => {
  for (const mfs of [false, true]) {
    const f = preferentialFamily(mfs), r = f.parents[mfs ? 1 : 0];
    for (
      const mutate of [
        (p: any) => p.f1099div.f1099divs[0].recipient_tin = "222334444",
        (p: any) => p.f1099div.f1099divs[0].box1a = 4001,
        (p: any) => p.f1040.line11_agi += 1,
        (p: any) => p.income_tax_calculation.net_capital_gain = 0,
        (p: any) => p.f1040.line29_refundable_aoc = 999,
      ]
    ) {
      const p = structuredClone(r.pending);
      mutate(p);
      assertThrows(() =>
        irs1040.build(p.f1040, { filer: r.filer, pending: p })
      );
      assertThrows(() => irs1040Pdf.instances!(p.f1040, r.filer, p));
      await assertRejects(() => f1040_2025.prepareReturn(p, r.filer));
    }
  }
});
