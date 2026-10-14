import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { form8995 } from "../../../../mef/forms/deductions/business/f8995/f8995.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
Deno.test("actual ScheduleC tip deduction and personal-sale capital sources retain positive QBI zero and positive income caps", async () => {
  for (
    const [kind, positive] of [["tips", false], ["tips", true], [
      "capital",
      false,
    ], ["capital", true]] as const
  ) {
    const f = pdfReviewFixtures.find((f) =>
      f.id ===
        (kind === "tips"
          ? "single-1099nec-trade-business-tips-schedule1a"
          : "single-k-mixed-business-personal")
    )!;
    const input: any = structuredClone(f.inputs);
    if (positive) {
      if (kind === "tips") {
        input.f1099nec[0].box1_nec = 80000;
        input.schedule_c[0].line_1_gross_receipts = 80000;
      } else {
        input.f1099k[0].box1a_gross_payments = 50800;
        input.f1099k[0].schedule_c_receipts_review
          .included_in_schedule_c_gross_receipts = 50000;
        input.schedule_c[0].line_1_gross_receipts = 50000;
      }
    }
    const r = f1040_2025.executeReturn(input);
    assertEquals(r.diagnostics, []);
    const p: any = normalizeAllPending(r.pending);
    const whollyExcluded = kind === "tips" && !positive;
    if (whollyExcluded) {
      assertEquals(p.form8995.line1_qbi, undefined);
      assertEquals(p.form8995.line15, undefined);
      assertEquals(
        p.form8995.qualified_tip_qbi_source.business_rows[0].qbi_tip_exclusion,
        9293,
      );
    } else {
      assertEquals(typeof p.form8995.line1_qbi, "number");
      assertEquals(typeof p.form8995.line15, "number");
      assertEquals(Number(p.form8995.line1_qbi) > 0, true);
      assertEquals(Number(p.form8995.line15) > 0, positive);
      assertEquals(p.form8995.line12, kind === "capital" ? 500 : 0);
    }
    assertEquals(
      whollyExcluded ? 0 : p.form8995.line11,
      Math.round(
        Math.max(
          0,
          Number(p.f1040.line11_agi) - Number(p.f1040.line12c_deduction_total) -
            Number(p.f1040.line13b_additional_deductions ?? 0),
        ),
      ),
    );
    const prepared = await f1040_2025.prepareReturn!(r.pending, f.filer);
    assertEquals(prepared.bundle.xml.includes("<IRS8995 "), !whollyExcluded);
    const id = kind + (positive ? "-positive" : "-zero");
    const dir = ".state/research/2026-10-06-form8995-schedule1a-capital-source";
    await Deno.mkdir(dir, { recursive: true });
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
    console.log(id, JSON.stringify(p.form8995));
    for (
      const change of [
        (q: any) => q.form8995.line12++,
        (q: any) => q.form8995.line11++,
        (q: any) => q.form8995.line15++,
        (q: any) =>
          kind === "tips"
            ? q.schedule1a.qualified_trade_business_tips[0].amount++
            : q.schedule_d.print_line15_lt_total++,
        (q: any) =>
          kind === "tips"
            ? q.f1040.line13b_additional_deductions = 0
            : (Array.isArray(q.schedule_d.transaction)
              ? q.schedule_d.transaction[0]
              : q.schedule_d.transaction).gain_loss++,
      ]
    ) {
      const q: any = structuredClone(r.pending);
      change(q);
      await assertRejects(() => f1040_2025.prepareReturn!(q, f.filer));
      await assertRejects(() => buildPdfBytes(q, f.filer));
    }
  }
});
