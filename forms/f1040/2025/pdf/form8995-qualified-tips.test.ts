import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../index.ts";
import { normalizeAllPending } from "../pending.ts";
import { extractFilerIdentity } from "../../mef/filer.ts";
import { form8995 } from "../mef/forms/f8995.ts";
import { form8995Pdf } from "./forms/f8995.ts";
import { form8995a } from "../mef/forms/f8995a.ts";
import { form8995aPdf } from "./forms/f8995a.ts";
import { buildPdfBytes } from "./builder.ts";
import {
  calculateOneBusiness8995ALines,
  inputSchema as advancedSchema,
} from "../../nodes/intermediate/forms/form8995a/index.ts";
import { qualifiedTipCases } from "./form8995-qualified-tips.fixture.ts";
const root = "/tmp/opentax-qbi-qualified-tip-exclusion-evidence";
const xsd = new URL(
  "../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
for (const c of qualifiedTipCases) {
  Deno.test(`actual deducted business tips ${c.id} source/SE/QBI/1040/native/XSD/filledPDF`, async () => {
    const inputs = c.inputs(), r = f1040_2025.executeReturn(inputs);
    assertEquals(r.diagnostics, []);
    const p: any = normalizeAllPending(r.pending),
      f = p.f1040,
      q = p.form8995,
      a = p.form8995a;
    const filer = extractFilerIdentity(f)!;
    assertEquals([
      p.schedule1.line3_schedule_c,
      p.schedule1.line15_se_deduction,
      p.schedule2.line4_se_tax,
      f.line11_agi,
      f.line13b_additional_deductions,
      f.line13_qbi_deduction ?? 0,
      f.line15_taxable_income,
      f.line16_income_tax,
      f.line24_total_tax,
    ], [
      c.profit,
      c.half,
      c.se,
      c.agi,
      c.tips,
      c.qbiDed,
      c.ti,
      c.ordinary,
      c.total,
    ]);
    const source = q.qualified_tip_qbi_source;
    assertEquals(source.tips_deduction, c.tips);
    const excluded = source.business_rows.reduce(
      (n: number, r: any) => n + r.qbi_tip_exclusion,
      0,
    );
    assertEquals(c.profit - c.half - excluded, c.qbi);
    if (!c.advanced && c.qbi) {
      assertEquals([q.line2, q.line5, q.line11, q.line15], [
        c.qbi,
        Math.round(c.qbi * .2),
        c.agi - Number(f.line12c_deduction_total) - c.tips,
        c.qbiDed,
      ]);
    } else if (!c.advanced) {
      assertEquals(q.line1_qbi, undefined);
      assertEquals(q.qbi_deduction, undefined);
      assertEquals(form8995.build(q, { pending: p, filer }), "");
      assertEquals(form8995Pdf.projectFields!(q, p), {});
    }
    if (c.id === "mfj-independent-owner-tips") {
      assertEquals(
        source.business_rows.map((
          r: any,
        ) => [r.recipient, r.se_tax_deduction, r.qbi_tip_exclusion]),
        [["S", 354, 4000], ["T", 134, 9000]],
      );
    }
    if (c.id === "mfj-cap-phaseout-owner-allocation") {
      assertEquals(
        source.business_rows.map((
          r: any,
        ) => [r.recipient, r.se_tax_deduction, r.qbi_tip_exclusion]),
        [["S", 4239, 10286], ["T", 1072, 13714]],
      );
    }
    if (c.id === "mfj-employee-business-tip-allocation") {
      assertEquals([
        source.total_eligible_tips,
        source.employee_deduction,
        excluded,
      ], [17000, 4706, 11294]);
      assertEquals(
        q.joint_owner_filing_rows.map((
          r: any,
        ) => [r.recipient, r.qualified_tip_exclusion, r.qbi]),
        [["S", 0, 55761], ["T", 11294, 67634]],
      );
    }
    if (c.advanced) {
      assertEquals(a.qbi, c.qbi);
      const lines = calculateOneBusiness8995ALines(advancedSchema.parse(a));
      // Independently prescribed filed equations: 45250 - round(43450 * .26396).
      assertEquals([
        lines.line2,
        lines.line3,
        lines.line4,
        lines.line5,
        lines.line10,
        lines.line19,
        lines.line25,
        lines.line26,
        lines.line33,
        lines.line36,
        lines.line39,
      ], [
        226248,
        45250,
        3600,
        1800,
        1800,
        43450,
        11469,
        33781,
        210498,
        42100,
        33781,
      ]);
      assertEquals(lines.phaseIn, .26396);
      assertEquals(p.schedule_c.wotc_wage_reductions[0].credit_amount, 2400);
    }
    // Official Tax Computation Worksheet equations, or the under100k table's $50 interval midpoint.
    if (c.ti >= 100000) {
      assertEquals(
        c.ordinary,
        Math.round(
          c.id.startsWith("mfj")
            ? (c.ti < 206700 ? c.ti * .22 - 10172 : c.ti * .24 - 14306)
            : c.ti * .24 - 7153,
        ),
      );
    } else if (c.ti > 0) {
      const midpoint = Math.floor(c.ti / 50) * 50 + 25;
      assertEquals(
        c.ordinary,
        Math.round(
          midpoint < 48475 ? midpoint * .12 - 238.5 : midpoint * .22 - 5086,
        ),
      );
    }
    const prepared = await f1040_2025.prepareReturn(p, filer),
      xml = prepared.bundle.xml;
    assertEquals(xml.includes("<IRS8995 "), !c.advanced && c.qbi > 0);
    assertEquals(xml.includes("<IRS8995A "), c.advanced);
    assertStringIncludes(
      xml,
      `<TotalAdditionalDeductionsAmt>${c.tips}</TotalAdditionalDeductionsAmt>`,
    );
    const tmp = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeTextFile(tmp, xml);
      const check = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", xsd, tmp],
        stderr: "piped",
      }).output();
      assertEquals(check.code, 0, new TextDecoder().decode(check.stderr));
    } finally {
      await Deno.remove(tmp);
    }
    const pdf = await prepared.renderPdf(), doc = await PDFDocument.load(pdf);
    assertEquals(doc.getForm().getFields().length, 0);
    const file = await Deno.makeTempFile({ suffix: ".pdf" });
    try {
      await Deno.writeFile(file, pdf);
      const t = await new Deno.Command("pdftotext", {
        args: [file, "-"],
        stdout: "piped",
      }).output();
      assertEquals(t.code, 0);
      const text = new TextDecoder().decode(t.stdout);
      assertStringIncludes(text, "Additional Deductions");
      assertStringIncludes(text, String(c.tips));
      assertEquals(
        text.includes("Qualified Business Income Deduction"),
        c.qbi > 0,
      );
      if (c.qbi > 0) assertStringIncludes(text, String(c.qbi));
    } finally {
      await Deno.remove(file);
    }
    if (Deno.args.includes("--write-review-artifacts")) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeTextFile(
        `${root}/${c.id}-source-input.json`,
        JSON.stringify({ inputs, pending: p }, null, 2),
      );
      await Deno.writeTextFile(`${root}/${c.id}-full-return.xml`, xml);
      await Deno.writeFile(`${root}/${c.id}-filled-return.pdf`, pdf);
    }
    console.log(
      c.id,
      `${doc.getPageCount()} pages`,
      JSON.stringify({
        profit: c.profit,
        half: c.half,
        se: c.se,
        tipDeduction: c.tips,
        qbi: c.qbi,
        qbiDeduction: c.qbiDed,
        agi: c.agi,
        tax: c.total,
      }),
    );
  });
}
for (
  const id of [
    "wholly-excluded-qbi",
    "issued-w2-qbi-binding",
    "mfj-cap-phaseout-owner-allocation",
    "advanced-event-wotc-tip-exclusion",
  ]
) {
  Deno.test(`qualified tip QBI ${id} rejects borrowed deduction owner payer income cap and source omission`, async () => {
    const c = qualifiedTipCases.find((c) => c.id === id)!,
      r = f1040_2025.executeReturn(c.inputs());
    assertEquals(r.diagnostics, []);
    const original = normalizeAllPending(r.pending),
      filer = extractFilerIdentity(original.f1040)!;
    const target = (p: any) =>
      c.advanced
        ? p.form8995a.single_schedule_c_source.qualified_tip_qbi_source
        : p.form8995.qualified_tip_qbi_source;
    const changes = [
      (p: any) =>
        delete target(p).schedule1a_source.qualified_trade_business_tips[0]
          .tip_records_reference,
      (p: any) => target(p).business_rows[0].qbi_tip_exclusion++,
      (p: any) =>
        target(p).business_rows[0].recipient =
          target(p).business_rows[0].recipient === "T" ? "S" : "T",
      (p: any) => target(p).business_rows[0].business_reference = "BORROWED",
      (p: any) => target(p).business_rows[0].se_tax_deduction++,
      (p: any) => target(p).tips_deduction++,
      (p: any) => target(p).employee_deduction++,
      (p: any) => target(p).allocation_method = "all_return_deductions",
      (p: any) => p.schedule1a.qualified_trade_business_tips[0].amount++,
      (p: any) => p.f1099nec.f1099necs[0].qualified_tips_review.amount++,
      (p: any) => p.f1099nec.f1099necs[0].recipient_ssn = "999887777",
      (p: any) => p.schedule1a.qualified_tips_se_deduction++,
      (p: any) => p.schedule1.line15_se_deduction++,
      (p: any) => p.schedule1.line3_schedule_c++,
      (p: any) => p.f1040.line13b_additional_deductions = 0,
      (p: any) => p.f1040.line11_agi++,
      (p: any) =>
        c.advanced
          ? delete p.form8995a.single_schedule_c_source.qualified_tip_qbi_source
          : delete p.form8995.qualified_tip_qbi_source,
    ];
    for (const [mutationIndex, mutate] of changes.entries()) {
      const p: any = structuredClone(original);
      mutate(p);
      if (c.advanced) {
        assertThrows(() => form8995a.build(p.form8995a, { pending: p, filer }));
        assertThrows(() => form8995aPdf.projectFields!(p.form8995a, p));
      } else {
        assertThrows(
          () => form8995.build(p.form8995, { pending: p, filer }),
          Error,
          "",
          `mutation ${mutationIndex}`,
        );
        assertThrows(() => form8995Pdf.projectFields!(p.form8995, p));
      }
      await assertRejects(() => f1040_2025.prepareReturn(p, filer));
      await assertRejects(() => buildPdfBytes(p, filer));
    }
    for (
      const mutate of [
        (p: any) =>
          p.f1040.line13_qbi_deduction = (p.f1040.line13_qbi_deduction ?? 0) +
            1,
        (p: any) =>
          c.advanced
            ? p.form8995a.qbi++
            : p.form8995.line2 = (p.form8995.line2 ?? 0) + 1,
      ]
    ) {
      const p: any = structuredClone(original);
      mutate(p);
      await assertRejects(() => f1040_2025.prepareReturn(p, filer));
      await assertRejects(() => buildPdfBytes(p, filer));
    }
    if (id.startsWith("mfj")) {
      for (
        const mutate of [
          (p: any) =>
            p.schedule1a.qualified_tips_owner_se_source.wages[0]
              .ss_wages_and_tips = 0,
          (p: any) => p.w2.w2s[0].employee_ssn = "222334444",
          (p: any) =>
            p.form8995.joint_owner_filing_rows[0].qualified_tip_exclusion = 0,
        ]
      ) {
        const p: any = structuredClone(original);
        mutate(p);
        await assertRejects(() => f1040_2025.prepareReturn(p, filer));
        await assertRejects(() => buildPdfBytes(p, filer));
      }
    }
  });
}
Deno.test("actual specified-service owner tips cannot create224 or QBI exclusions", () => {
  const i: any = qualifiedTipCases[1].inputs();
  i.schedule_c[0].qbi_specified_service = true;
  assertEquals(f1040_2025.executeReturn(i).diagnostics.length > 0, true);
});
