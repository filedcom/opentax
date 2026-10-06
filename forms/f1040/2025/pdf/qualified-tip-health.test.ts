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
import { form7206 } from "../mef/forms/f7206.ts";
import { schedule1a } from "../mef/forms/schedule1a.ts";
import { form8995 } from "../mef/forms/f8995.ts";
import { schedule1aPdf } from "./forms/schedule1a.ts";
import { form8995Pdf } from "./forms/f8995.ts";
import { form7206Pdf } from "./forms/f7206.ts";
import { buildPdfBytes } from "./builder.ts";
import { tipHealthCases } from "./qualified-tip-health.fixture.ts";
const root = "/tmp/opentax-qualified-tip-health-evidence";
const xsd = new URL(
  "../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
// Independently calculated profit/halfSE/health/tips/QBI/QBI-deduction/AGI/TI/ordinary/total.
const expected: Record<string, number[]> = {
  "single-positive-health": [
    72000,
    5087,
    6000,
    12000,
    48913,
    6633,
    60913,
    26530,
    2945,
    13118,
  ],
  "single-w2-qbi-binding": [
    72000,
    5087,
    6000,
    12000,
    48913,
    9783,
    110913,
    73380,
    11057,
    21230,
  ],
  "single-tip-netincome-limited": [
    10000,
    707,
    6000,
    3293,
    0,
    0,
    3293,
    0,
    0,
    1413,
  ],
  "single-health-income-limited": [10000, 707, 9293, 0, 0, 0, 0, 0, 0, 1413],
  "single-fully-phased-out": [
    72000,
    5087,
    1200,
    0,
    65713,
    13143,
    165713,
    136820,
    25684,
    35857,
  ],
  "mfj-owned-cap-phaseout": [
    140000,
    5311,
    8220,
    24800,
    101669,
    20334,
    302569,
    225935,
    39918,
    51038,
  ],
  "mfj-primary-health-limited": [
    15000,
    488,
    12086,
    1000,
    1426,
    285,
    178526,
    145741,
    21891,
    22866,
  ],
  "mfj-fully-phased-out": [
    140000,
    5311,
    8220,
    0,
    126469,
    25294,
    302569,
    245775,
    44680,
    55800,
  ],
};
for (const c of tipHealthCases) {
  Deno.test(`actual tip health ${c.id} source/7206/SE/QBI/native/XSD/filledPDF`, async () => {
    const inputs = c.inputs(), r = f1040_2025.executeReturn(inputs);
    assertEquals(r.diagnostics, []);
    const p: any = normalizeAllPending(r.pending),
      f = p.f1040,
      q = p.form8995,
      filer = extractFilerIdentity(f)!;
    const e = expected[c.id],
      [profit, half, health, tips, qbi, ded, agi, ti, tax, total] = e;
    assertEquals([
      p.schedule1.line3_schedule_c,
      p.schedule1.line15_se_deduction,
      p.schedule1.line17_se_health_insurance,
      f.line13b_additional_deductions,
      q.line2 ?? 0,
      f.line13_qbi_deduction ?? 0,
      f.line11_agi,
      f.line15_taxable_income,
      f.line16_income_tax,
      f.line24_total_tax,
    ], e);
    assertEquals(p.schedule1.line26_total_adjustments, half + health);
    assertEquals(f.line10_adjustments, half + health);
    const source = q.qualified_tip_qbi_source;
    assertEquals(source.tips_deduction, tips);
    assertEquals(
      source.business_rows.reduce(
        (n: number, b: any) => n + b.qbi_tip_exclusion,
        0,
      ),
      tips,
    );
    assertEquals(profit - half - health - tips, qbi);
    for (const row of source.business_rows) {
      assertEquals(
        row.eligible_tips,
        Math.min(
          row.reported_tips,
          Math.max(
            0,
            row.net_profit - row.se_tax_deduction - row.se_health_deduction,
          ),
        ),
      );
    }
    if (c.id.startsWith("single")) {
      const net = Math.round(profit * .9235),
        se = Math.round(net * .124) + Math.round(net * .029);
      assertEquals(p.schedule2.line4_se_tax, se);
      assertEquals(half, Math.round(se / 2));
      assertEquals(
        p.form7206.line14,
        Math.min(p.form7206.line1, profit - half),
      );
      assertEquals(p.form7206.line10, profit - half);
    } else {
      const rows = p.form7206.independent_plan_filing_rows;
      assertEquals(rows.length, 2);
      assertEquals(
        rows.reduce((n: number, row: any) => n + row.line14, 0),
        health,
      );
      for (const row of rows) {
        assertEquals(row.line14, Math.min(row.line1, row.line4 - row.line7));
      }
      if (c.id === "mfj-primary-health-limited") {
        assertEquals(
          rows.map((row: any) => [row.recipient, row.line7, row.line14]),
          [["S", 354, 2220], ["T", 134, 9866]],
        );
      }
      if (c.id === "mfj-owned-cap-phaseout") {
        assertEquals(
          source.business_rows.map((
            row: any,
          ) => [
            row.recipient,
            row.se_tax_deduction,
            row.se_health_deduction,
            row.qbi_tip_exclusion,
          ]),
          [["S", 4239, 2220, 10629], ["T", 1072, 6000, 14171]],
        );
      }
    }
    if (ti >= 100000) {
      assertEquals(
        tax,
        Math.round(
          c.id.startsWith("mfj")
            ? ti < 206700 ? ti * .22 - 10172 : ti * .24 - 14306
            : ti * .24 - 7153,
        ),
      );
    } else if (ti > 0) {
      const midpoint = Math.floor(ti / 50) * 50 + 25;
      assertEquals(
        tax,
        Math.round(
          midpoint < 48475 ? midpoint * .12 - 238.5 : midpoint * .22 - 5086,
        ),
      );
    }
    if (qbi === 0) {
      assertEquals(form8995.build(q, { pending: p, filer }), "");
      assertEquals(form8995Pdf.projectFields!(q, p), {});
    }
    if (tips === 0) {
      assertEquals(schedule1a.build(p.schedule1a, { pending: p, filer }), "");
      assertEquals(schedule1aPdf.projectFields!(p.schedule1a, p), {});
    }
    const prepared = await f1040_2025.prepareReturn(p, filer),
      xml = prepared.bundle.xml;
    assertEquals(xml.includes("IRS1040Schedule1A"), tips > 0);
    assertEquals(xml.includes("<IRS8995 "), qbi > 0);
    assertEquals(
      (xml.match(/<IRS7206 /g) ?? []).length,
      c.id.startsWith("mfj") ? 2 : 1,
    );
    if (tips > 0) {
      assertStringIncludes(
        xml,
        `<QualifiedTipsDeductionAmt>${tips}</QualifiedTipsDeductionAmt>`,
      );
    }
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
    const path = await Deno.makeTempFile({ suffix: ".pdf" });
    try {
      await Deno.writeFile(path, pdf);
      const out = await new Deno.Command("pdftotext", {
        args: [path, "-"],
        stdout: "piped",
      }).output();
      assertEquals(out.code, 0);
      const text = new TextDecoder().decode(out.stdout);
      assertEquals(text.includes("Additional Deductions"), tips > 0);
      assertEquals(
        text.includes("Qualified Business Income Deduction"),
        qbi > 0,
      );
      assertStringIncludes(text, "Self-Employed Health Insurance Deduction");
    } finally {
      await Deno.remove(path);
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
    console.log(c.id, doc.getPageCount(), e);
  });
}
for (
  const id of [
    "single-positive-health",
    "single-health-income-limited",
    "mfj-primary-health-limited",
    "mfj-fully-phased-out",
  ]
) {
  Deno.test(`tip health ${id} rejects changed owned premium/source/income/omission`, async () => {
    const c = tipHealthCases.find((c) => c.id === id)!,
      r = f1040_2025.executeReturn(c.inputs());
    assertEquals(r.diagnostics, []);
    const original: any = normalizeAllPending(r.pending),
      filer = extractFilerIdentity(original.f1040)!;
    const plan = (p: any) =>
      p.form7206.single_schedule_c_plan ??
        p.form7206.independent_schedule_c_plans.plans[0];
    const healthSource = (p: any) =>
      p.schedule1a.qualified_tips_health_plan_source ??
        p.schedule1a.qualified_tips_health_plans_source.plans[0];
    const changes = [
      (p: any) => plan(p).premium_months[0].paid_premium++,
      (p: any) => healthSource(p).premium_months[0].paid_premium++,
      (p: any) =>
        plan(p).premium_months[0].payment_source_reference = "BORROWED-PAYMENT",
      (p: any) => plan(p).business_reference = "BORROWED-BUSINESS",
      (p: any) => p.schedule1.line17_se_health_insurance++,
      (p: any) => p.schedule1.line3_schedule_c++,
      (p: any) => p.f1040.line11_agi++,
      (p: any) => p.f1040.line13b_additional_deductions++,
      (p: any) =>
        p.form8995.qualified_tip_qbi_source.business_rows[0]
          .se_health_deduction++,
      (p: any) => delete p.form8995.qualified_tip_qbi_source,
      (p: any) => delete p.schedule1a.qualified_tips_health_plan_source,
      (p: any) => p.f1099nec.f1099necs[0].qualified_tips_review.amount++,
      (p: any) => p.f1099nec.f1099necs[0].recipient_ssn = "999887777",
      (p: any) =>
        delete p.schedule1a.qualified_trade_business_tips[0]
          .allocable_health_plan_identifiers,
      (p: any) =>
        p.schedule1a.qualified_trade_business_tips[0]
          .allocable_health_plan_identifiers = ["BORROWED-PLAN"],
      (p: any) =>
        p.f1099nec.f1099necs[0].qualified_tips_review
          .allocable_health_plan_identifiers = ["OTHER-OWNER-PLAN"],
    ];
    // The corresponding single/family source is required even when no Schedule1A is filed.
    if (id.startsWith("mfj")) {
      changes[10] = (p: any) =>
        delete p.schedule1a.qualified_tips_health_plans_source;
    }
    // Replay the serialized full source packet: independently retained node views must not share JS object aliases.
    for (const [i, mutate] of changes.entries()) {
      const p: any = JSON.parse(JSON.stringify(original));
      mutate(p);
      if (i !== 8 && i !== 9) {
        assertThrows(() =>
          schedule1a.build(p.schedule1a, { pending: p, filer })
        );
      }
      assertThrows(() => form8995.build(p.form8995, { pending: p, filer }));
      if (i !== 8 && i !== 9) {
        assertThrows(() => schedule1aPdf.projectFields!(p.schedule1a, p));
      }
      assertThrows(() => form8995Pdf.projectFields!(p.form8995, p));
      await assertRejects(() => f1040_2025.prepareReturn(p, filer));
      await assertRejects(() => buildPdfBytes(p, filer));
    }
    const altered: any = structuredClone(original);
    plan(altered).recipient = plan(altered).recipient === "T" ? "S" : "T";
    assertThrows(() =>
      form7206.build(altered.form7206, { pending: altered, filer })
    );
    assertThrows(() => form7206Pdf.projectFields!(altered.form7206, altered));
  });
}

Deno.test("actual advanced WOTC fully phased-out business tips omit Schedule1A after source reconciliation", async () => {
  const { advancedTipInputs } = await import(
    "./form8995-qualified-tips.fixture.ts"
  );
  const inputs = advancedTipInputs();
  inputs.schedule_c[0].line_1_gross_receipts = 500000;
  inputs.f1099nec[0].box1_nec = 500000;
  const r = f1040_2025.executeReturn(inputs);
  assertEquals(r.diagnostics, []);
  const p: any = normalizeAllPending(r.pending),
    f = p.f1040,
    filer = extractFilerIdentity(f)!;
  assertEquals([
    p.schedule1.line3_schedule_c,
    p.schedule1.line15_se_deduction,
    p.schedule2.line4_se_tax,
    p.schedule2.line11_additional_medicare,
    f.line11_agi,
    f.line13b_additional_deductions,
    f.line13_qbi_deduction,
    f.line15_taxable_income,
    f.line16_income_tax,
    f.line24_total_tax,
  ], [496400, 17565, 35130, 2326, 478835, 0, 1800, 461285, 130997, 166053]);
  assertEquals(
    f.line16_income_tax,
    Math.round(f.line15_taxable_income * .35 - 30452.75),
  );
  assertEquals(
    p.form8995a.single_schedule_c_source.qualified_tip_qbi_source
      .tips_deduction,
    0,
  );
  assertEquals(p.form8995a.qbi, 478835);
  assertEquals(p.form8995a.w2_wages, 3600);
  assertEquals(schedule1a.build(p.schedule1a, { pending: p, filer }), "");
  assertEquals(schedule1aPdf.projectFields!(p.schedule1a, p), {});
  const prepared = await f1040_2025.prepareReturn(p, filer),
    xml = prepared.bundle.xml;
  assertEquals(xml.includes("IRS1040Schedule1A"), false);
  assertEquals(xml.includes("<IRS8995A "), true);
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const out = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, path],
      stderr: "piped",
    }).output();
    assertEquals(out.code, 0, new TextDecoder().decode(out.stderr));
  } finally {
    await Deno.remove(path);
  }
  const pdf = await prepared.renderPdf(), doc = await PDFDocument.load(pdf);
  assertEquals(doc.getForm().getFields().length, 0);
  if (Deno.args.includes("--write-review-artifacts")) {
    const id = "advanced-wotc-fully-phased-out";
    await Deno.mkdir(root, { recursive: true });
    await Deno.writeTextFile(
      `${root}/${id}-source-input.json`,
      JSON.stringify({ inputs, pending: p }, null, 2),
    );
    await Deno.writeTextFile(`${root}/${id}-full-return.xml`, xml);
    await Deno.writeFile(`${root}/${id}-filled-return.pdf`, pdf);
  }
  for (
    const mutate of [
      (p: any) => p.f1040.line13b_additional_deductions = 1,
      (p: any) =>
        delete p.form8995a.single_schedule_c_source.qualified_tip_qbi_source,
      (p: any) => p.f1099nec.f1099necs[0].qualified_tips_review.amount++,
    ]
  ) {
    const q: any = structuredClone(p);
    mutate(q);
    await assertRejects(() => f1040_2025.prepareReturn(q, filer));
    await assertRejects(() => buildPdfBytes(q, filer));
  }
  console.log("advanced-wotc-fully-phased-out", doc.getPageCount());
});
