import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../index.ts";
import {
  spouseMedicareFamily,
  spouseMedicareInputs,
} from "./form7206-spouse-medicare.fixture.ts";
import { form7206 } from "../../../mef/forms/health/f7206.ts";
import { form7206Pdf } from "../../forms/health/f7206.ts";
import { form8995 } from "../../../mef/forms/business/f8995/f8995.ts";
import { form8995Pdf } from "../../forms/business/f8995/f8995.ts";
import { form8995 as qbiNode } from "../../../../nodes/intermediate/forms/form8995/index.ts";
const xsd = new URL(
  "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
for (
  const scenario of [{
    id: "spouse-only-zero-income-cap",
    wages: 0,
    excluded: 0,
    health: 2220,
    qbi: 2426,
    deduction: 0,
    agi: 2426,
    tax: 0,
    total: 707,
    refund: 0,
  }, {
    id: "issued-W2-spouse-Medicare",
    wages: 50000,
    excluded: 0,
    health: 2220,
    qbi: 2426,
    deduction: 485,
    agi: 52426,
    tax: 2043,
    total: 2750,
    refund: 2250,
  }, {
    id: "two-employer-eligible-months",
    wages: 50000,
    excluded: 2,
    health: 1850,
    qbi: 2796,
    deduction: 559,
    agi: 52796,
    tax: 2073,
    total: 2780,
    refund: 2220,
  }]
) {
  Deno.test(`source-owned Medicare7206 and joint8995 ${scenario.id} full public/XSD/PDF`, async () => {
    const f = spouseMedicareFamily(scenario.wages, scenario.excluded),
      p = f.pending,
      h = p.form7206,
      q = p.form8995,
      row = q.joint_owner_filing_rows[0];
    assertEquals([
      h.recipient_name,
      h.recipient_ssn,
      h.line1,
      h.line4,
      h.line5,
      h.line6,
      h.line7,
      h.line8,
      h.line10,
      h.line13,
      h.line14,
    ], [
      "Casey Example",
      "222334444",
      scenario.health,
      5000,
      5000,
      1,
      354,
      4646,
      4646,
      4646,
      scenario.health,
    ]);
    assertEquals([
      p.schedule1.line3_schedule_c,
      p.schedule1.line15_se_deduction,
      p.schedule1.line17_se_health_insurance,
      p.schedule2.line4_se_tax,
    ], [5000, 354, scenario.health, 707]);
    assertEquals([
      row.business_reference,
      row.recipient,
      row.tin.value,
      row.se_tax_deduction,
      row.health_insurance_deduction,
      row.raw_qbi,
      row.qbi,
    ], [
      "BIZ",
      "S",
      "222334444",
      354,
      scenario.health,
      scenario.qbi,
      scenario.qbi,
    ]);
    assertEquals(q.joint_owner_health_plan_source, h.single_schedule_c_plan);
    assertEquals([q.line2, q.line5, q.line11, q.line14, q.line15], [
      scenario.qbi,
      Math.round(scenario.qbi * .2),
      Math.max(0, scenario.agi - 31500),
      Math.round(Math.max(0, scenario.agi - 31500) * .2),
      scenario.deduction,
    ]);
    assertEquals([
      p.f1040.line1a_wages ?? 0,
      p.f1040.line9_total_income,
      p.f1040.line10_adjustments,
      p.f1040.line11_agi,
      p.f1040.line12a_standard_deduction,
      p.f1040.line13_qbi_deduction,
      p.f1040.line15_taxable_income,
      p.f1040.line16_income_tax,
      p.f1040.line24_total_tax,
      p.f1040.line35a_refund ?? 0,
    ], [
      scenario.wages,
      scenario.wages + 5000,
      354 + scenario.health,
      scenario.agi,
      31500,
      scenario.deduction,
      Math.max(0, scenario.agi - 31500 - scenario.deduction),
      scenario.tax,
      scenario.total,
      scenario.refund,
    ]);
    if (!scenario.wages) assertEquals(p.f1040.line37_amount_owed, 707);
    const b = await f1040_2025.prepareReturn(p, f.filer);
    for (
      const value of [
        "<IRS7206",
        "<IRS8995",
        "<NameLine1Txt>Casey Example</NameLine1Txt>",
        "<SSN>222334444</SSN>",
        `<SelfEmpldHealthInsDedAmt>${scenario.health}</SelfEmpldHealthInsDedAmt>`,
        `<QlfyBusinessIncomeOrLossAmt>${scenario.qbi}</QlfyBusinessIncomeOrLossAmt>`,
      ]
    ) assertStringIncludes(b.bundle.xml, value);
    const tmp = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeTextFile(tmp, b.bundle.xml);
      const v = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", xsd, tmp],
        stdout: "piped",
        stderr: "piped",
      }).output();
      assertEquals(v.code, 0, new TextDecoder().decode(v.stderr));
    } finally {
      await Deno.remove(tmp);
    }
    const pdf = await b.renderPdf(), doc = await PDFDocument.load(pdf);
    assertEquals(doc.getPageCount(), 12);
    assertEquals(doc.getForm().getFields().length, 0);
    const pt = await Deno.makeTempFile({ suffix: ".pdf" });
    try {
      await Deno.writeFile(pt, pdf);
      const t = await new Deno.Command("pdftotext", {
        args: [pt, "-"],
        stdout: "piped",
      }).output();
      const text = new TextDecoder().decode(t.stdout).replace(/\s+/g, " ");
      assertStringIncludes(text, "Casey Example");
      assertStringIncludes(text, "Casey Photography");
      assertStringIncludes(text, "100%");
      assertStringIncludes(text, String(scenario.qbi));
    } finally {
      await Deno.remove(pt);
    }
    if (Deno.args.includes("--write-review-artifacts")) {
      const dir = "/tmp/opentax-spouse-medicare-qbi-evidence";
      await Deno.mkdir(dir, { recursive: true });
      await Deno.writeTextFile(
        `${dir}/${scenario.id}-source-input.json`,
        JSON.stringify({ inputs: f.inputs, filer: f.filer }, null, 2),
      );
      await Deno.writeTextFile(
        `${dir}/${scenario.id}-full-return.xml`,
        b.bundle.xml,
      );
      await Deno.writeFile(`${dir}/${scenario.id}-filled-return.pdf`, pdf);
    }
  });
}
Deno.test("Medicare joint QBI rejects detached plan, wrong owner, premium eligibility, borrowed receipts and filed deduction tampering in native/PDF", async () => {
  const f = spouseMedicareFamily();
  const mutations: Array<(p: any) => void> = [
    (p) => p.form7206.single_schedule_c_plan.recipient = "T",
    (p) => p.form7206.single_schedule_c_plan.business_reference = "OTHER",
    (p) => p.form7206.single_schedule_c_plan.spouse_identity.ssn = "999887777",
    (p) =>
      p.form7206.single_schedule_c_plan.premium_months[0].paid_premium = 184,
    (p) =>
      p.form7206.single_schedule_c_plan.premium_months[0]
        .eligible_for_subsidized_employer_plan = true,
    (p) =>
      delete p.form7206.single_schedule_c_plan.premium_months[0]
        .payment_source_reference,
    (p) =>
      p.form7206.single_schedule_c_plan.premium_months[0].marketplace_policy =
        true,
    (p) =>
      p.form7206.single_schedule_c_plan.schedule1_line15_se_tax_deduction = 353,
    (p) =>
      p.form7206.single_schedule_c_plan.schedule_c_line31_net_profit = 5001,
    (p) => p.form7206.line14 = 2221,
    (p) => p.schedule1.line17_se_health_insurance = 2221,
    (p) => p.schedule1.line15_se_deduction = 353,
    (p) => p.schedule_c.schedule_cs[0].proprietor_recipient = "T",
    (p) => p.f1099nec.f1099necs[0].recipient_ssn = "111223333",
    (p) => p.f1099nec.f1099necs[0].box1_nec = 5001,
    (p) => p.schedule_c.f1099nec_receipt_sources[0].payer_tin = "761234567",
    (p) => p.form8995.se_health_insurance_deduction = 0,
    (p) => delete p.form8995.joint_owner_health_plan_source,
    (p) =>
      p.form8995.joint_owner_health_plan_source = structuredClone({
        ...p.form7206.single_schedule_c_plan,
        plan_identifier: "UNOWNED",
      }),
    (p) => p.form8995.joint_owner_filing_rows[0].health_insurance_deduction = 0,
    (p) => p.form8995.joint_owner_filing_rows[0].qbi = 4646,
    (p) => p.f1040.line10_adjustments = 354,
    (p) => p.f1040.line11_agi = 54646,
    (p) => p.f1040.line13_qbi_deduction = 929,
  ];
  for (const change of mutations) {
    const p = structuredClone(f.pending);
    change(p);
    assertThrows(() =>
      form8995.build(p.form8995, { pending: p, filer: f.filer })
    );
    assertThrows(() => form8995Pdf.projectFields!(p.form8995, p));
    await assertRejects(() => f1040_2025.prepareReturn(p, f.filer));
  }
  const h = structuredClone(f.pending);
  h.f1099nec.f1099necs[0].recipient_ssn = "111223333";
  assertThrows(() =>
    form7206.build(h.form7206, { pending: h, filer: f.filer })
  );
  assertThrows(() => form7206Pdf.projectFields!(h.form7206, h));
});
Deno.test("Medicare public source recalculates eligibility and rejects stale source income or unreviewed scalar health deductions", () => {
  for (
    const mutate of [
      (i: any) =>
        i.form7206.single_schedule_c_plan.schedule_c_line31_net_profit = 5001,
      (i: any) =>
        i.form7206.single_schedule_c_plan.schedule1_line15_se_tax_deduction =
          353,
      (i: any) =>
        i.form7206.single_schedule_c_plan.business_reference = "OTHER",
      (i: any) => i.form7206.single_schedule_c_plan.recipient = "T",
    ]
  ) {
    const i = spouseMedicareInputs();
    mutate(i);
    assertEquals(
      f1040_2025.executeReturn(i).diagnostics.some((d) =>
        d.severity === "error"
      ),
      true,
    );
  }
  const f = spouseMedicareFamily(),
    source = structuredClone(f.pending.form8995);
  delete source.joint_owner_health_plan_source;
  assertThrows(() =>
    qbiNode.compute({ taxYear: 2025, formType: "f1040" }, source)
  );
  const eligibility = spouseMedicareInputs();
  eligibility.form7206.single_schedule_c_plan.premium_months[0]
    .eligible_for_subsidized_employer_plan = true;
  const r = f1040_2025.executeReturn(eligibility);
  assertEquals(r.diagnostics, []);
  assertEquals(r.pending.form7206.line14, 2035);
  assertEquals(
    (r.pending.form8995.joint_owner_filing_rows as any[])[0].qbi,
    2611,
  );
});
