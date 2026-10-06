import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../index.ts";
import { spouseMedicareFamily } from "./form7206-spouse-medicare.fixture.ts";
import { form7206 } from "../mef/forms/f7206.ts";
import { form7206Pdf } from "./forms/f7206.ts";
import { form8995 } from "../mef/forms/f8995.ts";
import { form8995Pdf } from "./forms/f8995.ts";
const xsd = new URL(
  "../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
for (
  const scenario of [{
    id: "issued-W2-all-employer-eligible",
    wages: 50000,
    agi: 54646,
    deduction: 929,
    taxable: 22217,
    tax: 2223,
    total: 2930,
    refund: 2070,
  }, {
    id: "no-W2-all-employer-eligible",
    wages: 0,
    agi: 4646,
    deduction: 0,
    taxable: 0,
    tax: 0,
    total: 707,
    refund: 0,
  }]
) {
  Deno.test(`all actual Medicare months employer-eligible ${scenario.id} source/native/XSD/PDF without7206`, async () => {
    const f = spouseMedicareFamily(scenario.wages, 12),
      p = f.pending,
      h = p.form7206,
      q = p.form8995,
      row = q.joint_owner_filing_rows[0];
    assertEquals(h.single_schedule_c_plan.premium_months.length, 12);
    assertEquals(
      h.single_schedule_c_plan.premium_months.every((m: any) =>
        m.paid_premium === 185 &&
        m.eligible_for_subsidized_employer_plan === true &&
        m.payment_source_reference && m.employer_plan_review_reference
      ),
      true,
    );
    assertEquals([
      h.line1,
      h.line3,
      h.line4,
      h.line5,
      h.line6,
      h.line7,
      h.line8,
      h.line10,
      h.line13,
      h.line14,
    ], [0, 0, 5000, 5000, 1, 354, 4646, 4646, 4646, 0]);
    assertEquals([
      p.schedule1.line15_se_deduction,
      p.schedule1.line17_se_health_insurance,
      p.schedule1.line26_total_adjustments,
      p.schedule2.line4_se_tax,
    ], [354, 0, 354, 707]);
    assertEquals([
      row.recipient,
      row.tin.value,
      row.se_tax_deduction,
      row.health_insurance_deduction,
      row.qbi,
      q.qbi_deduction,
    ], ["S", "222334444", 354, 0, 4646, scenario.deduction]);
    assertEquals([
      p.f1040.line10_adjustments,
      p.f1040.line11_agi,
      p.f1040.line12c_deduction_total,
      p.f1040.line13_qbi_deduction,
      p.f1040.line15_taxable_income,
      p.f1040.line16_income_tax,
      p.f1040.line24_total_tax,
      Number(p.f1040.line35a_refund ?? 0),
    ], [
      354,
      scenario.agi,
      31500,
      scenario.deduction,
      scenario.taxable,
      scenario.tax,
      scenario.total,
      scenario.refund,
    ]);
    if (!scenario.wages) assertEquals(p.f1040.line37_amount_owed, 707);
    assertEquals(form7206.build(h, { pending: p, filer: f.filer }), "");
    const projected = form7206Pdf.projectFields!(h, p);
    assertEquals(projected.line14, 0);
    assertEquals(form7206Pdf.includeWhen!(projected, p), false);
    const prepared = await f1040_2025.prepareReturn(p, f.filer),
      xml = prepared.bundle.xml;
    assertEquals(xml.includes("<IRS7206"), false);
    assertStringIncludes(xml, "<IRS8995");
    assertStringIncludes(
      xml,
      "<QlfyBusinessIncomeOrLossAmt>4646</QlfyBusinessIncomeOrLossAmt>",
    );
    const temp = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeTextFile(temp, xml);
      const v = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", xsd, temp],
        stdout: "piped",
        stderr: "piped",
      }).output();
      assertEquals(v.code, 0, new TextDecoder().decode(v.stderr));
    } finally {
      await Deno.remove(temp);
    }
    const pdf = await prepared.renderPdf(), doc = await PDFDocument.load(pdf);
    assertEquals(doc.getPageCount(), 11);
    assertEquals(doc.getForm().getFields().length, 0);
    const tmpPdf = await Deno.makeTempFile({ suffix: ".pdf" });
    try {
      await Deno.writeFile(tmpPdf, pdf);
      const t = await new Deno.Command("pdftotext", {
        args: [tmpPdf, "-"],
        stdout: "piped",
      }).output();
      const text = new TextDecoder().decode(t.stdout);
      assertEquals(
        text.includes("Self-Employed Health Insurance Deduction"),
        false,
      );
      assertStringIncludes(text, "Casey Photography");
      assertStringIncludes(text, "4646");
    } finally {
      await Deno.remove(tmpPdf);
    }
    if (Deno.args.includes("--write-review-artifacts")) {
      const dir = "/tmp/opentax-medicare-zero-eligible-evidence";
      await Deno.mkdir(dir, { recursive: true });
      await Deno.writeTextFile(
        `${dir}/${scenario.id}-source-input.json`,
        JSON.stringify({ inputs: f.inputs, filer: f.filer }, null, 2),
      );
      await Deno.writeTextFile(`${dir}/${scenario.id}-full-return.xml`, xml);
      await Deno.writeFile(`${dir}/${scenario.id}-filled-return.pdf`, pdf);
    }
  });
}
Deno.test("zero health filing suppression still rejects source eligibility ownership and filed-income tampering", async () => {
  const f = spouseMedicareFamily(50000, 12);
  const mutations: Array<(p: any) => void> = [
    (p) =>
      p.form7206.single_schedule_c_plan.premium_months[0]
        .eligible_for_subsidized_employer_plan = false,
    (p) => {
      p.form7206.single_schedule_c_plan.premium_months[0]
        .eligible_for_subsidized_employer_plan = false;
      p.form7206.single_schedule_c_plan.premium_months[0].paid_premium = 0;
    },
    (p) =>
      delete p.form7206.single_schedule_c_plan.premium_months[0]
        .employer_plan_review_reference,
    (p) =>
      delete p.form7206.single_schedule_c_plan.premium_months[0]
        .payment_source_reference,
    (p) => p.form7206.single_schedule_c_plan.recipient = "T",
    (p) => p.form7206.single_schedule_c_plan.business_reference = "UNOWNED",
    (p) =>
      p.form7206.single_schedule_c_plan.schedule_c_line31_net_profit = 5001,
    (p) =>
      p.form7206.single_schedule_c_plan.schedule1_line15_se_tax_deduction = 353,
    (p) => p.form7206.line1 = 2220,
    (p) => p.form7206.line14 = 2220,
    (p) => p.schedule1.line17_se_health_insurance = 2220,
    (p) => p.form8995.se_health_insurance_deduction = 2220,
    (p) => delete p.form8995.joint_owner_health_plan_source,
    (p) =>
      p.form8995.joint_owner_filing_rows[0].health_insurance_deduction = 2220,
    (p) => p.form8995.joint_owner_filing_rows[0].qbi = 2426,
    (p) => p.f1099nec.f1099necs[0].recipient_ssn = "111223333",
    (p) => p.schedule_c.schedule_cs[0].proprietor_recipient = "T",
    (p) => p.f1040.line10_adjustments = 2574,
    (p) => p.f1040.line11_agi = 52426,
    (p) => p.f1040.line13_qbi_deduction = 485,
  ];
  for (const mutate of mutations) {
    const p = structuredClone(f.pending);
    mutate(p);
    assertThrows(() =>
      form8995.build(p.form8995, { pending: p, filer: f.filer })
    );
    assertThrows(() => form8995Pdf.projectFields!(p.form8995, p));
    await assertRejects(() => f1040_2025.prepareReturn(p, f.filer));
  }
  const p = structuredClone(f.pending);
  p.form7206.single_schedule_c_plan.premium_months[0]
    .eligible_for_subsidized_employer_plan = false;
  assertThrows(() =>
    form7206.build(p.form7206, { pending: p, filer: f.filer })
  );
  assertThrows(() => form7206Pdf.projectFields!(p.form7206, p));
  const positive = spouseMedicareFamily();
  positive.pending.form7206.line14 = 0;
  assertThrows(() =>
    form7206.build(positive.pending.form7206, {
      pending: positive.pending,
      filer: positive.filer,
    })
  );
  assertThrows(() =>
    form7206Pdf.projectFields!(positive.pending.form7206, positive.pending)
  );
  const changed = spouseMedicareFamily(50000, 11);
  assertEquals(changed.pending.form7206.line14, 185);
  assertEquals(changed.pending.form8995.joint_owner_filing_rows[0].qbi, 4461);
  assertEquals(
    form7206Pdf.includeWhen!(
      form7206Pdf.projectFields!(changed.pending.form7206, changed.pending),
      changed.pending,
    ),
    true,
  );
  assertStringIncludes(
    String(form7206.build(changed.pending.form7206, {
      pending: changed.pending,
      filer: changed.filer,
    })),
    "<IRS7206",
  );
});
