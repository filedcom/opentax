import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../index.ts";
import {
  independentHealthFamily,
  independentHealthInputs,
} from "./form7206-independent-owner.fixture.ts";
import { form7206 } from "../mef/forms/f7206.ts";
import { form7206Pdf } from "./forms/f7206.ts";
import { form8995 } from "../mef/forms/f8995.ts";
import { form8995Pdf } from "./forms/f8995.ts";
import { calculateIndependentOwnerHealth } from "../../nodes/intermediate/forms/form7206/independent-owner.ts";
const xsd = new URL(
  "../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
const cases = [
  {
    id: "both-full",
    premium: 500,
    excludedT: 0,
    excludedS: 0,
    primaryPlan: true,
    healthT: 6000,
    healthS: 2220,
    agi: 182392,
    qbiT: 3866,
    qbiS: 2426,
    deduction: 1258,
    taxable: 149634,
    tax: 22747,
    total: 23722,
    refund: 6278,
    copies: 2,
  },
  {
    id: "primary-income-limited",
    premium: 1200,
    excludedT: 0,
    excludedS: 0,
    primaryPlan: true,
    healthT: 9866,
    healthS: 2220,
    agi: 178526,
    qbiT: 0,
    qbiS: 2426,
    deduction: 485,
    taxable: 146541,
    tax: 22067,
    total: 23042,
    refund: 6958,
    copies: 2,
  },
  {
    id: "primary-months-excluded",
    premium: 500,
    excludedT: 12,
    excludedS: 0,
    primaryPlan: true,
    healthT: 0,
    healthS: 2220,
    agi: 188392,
    qbiT: 9866,
    qbiS: 2426,
    deduction: 2458,
    taxable: 154434,
    tax: 23803,
    total: 24778,
    refund: 5222,
    copies: 2,
  },
  {
    id: "both-months-excluded",
    premium: 500,
    excludedT: 12,
    excludedS: 12,
    primaryPlan: true,
    healthT: 0,
    healthS: 0,
    agi: 190612,
    qbiT: 9866,
    qbiS: 4646,
    deduction: 2902,
    taxable: 156210,
    tax: 24194,
    total: 25169,
    refund: 4831,
    copies: 2,
  },
  {
    id: "one-established-plan-two-owned-businesses",
    premium: 500,
    excludedT: 0,
    excludedS: 0,
    primaryPlan: false,
    healthT: 0,
    healthS: 2220,
    agi: 188392,
    qbiT: 9866,
    qbiS: 2426,
    deduction: 2458,
    taxable: 154434,
    tax: 23803,
    total: 24778,
    refund: 5222,
    copies: 1,
  },
  {
    id: "different-owner-eligible-months",
    premium: 500,
    excludedT: 2,
    excludedS: 4,
    primaryPlan: true,
    healthT: 5000,
    healthS: 1480,
    agi: 184132,
    qbiT: 4866,
    qbiS: 3166,
    deduction: 1606,
    taxable: 151026,
    tax: 23054,
    total: 24029,
    refund: 5971,
    copies: 2,
  },
];
for (const c of cases) {
  Deno.test(`actual independent owner health ${c.id} source/1040/native/XSD/filledPDF`, async () => {
    const f = independentHealthFamily(
        c.premium,
        c.excludedT,
        c.excludedS,
        c.primaryPlan,
      ),
      p = f.pending,
      h = p.form7206,
      q = p.form8995,
      rows = h.independent_plan_filing_rows;
    assertEquals(
      p.schedule_se.owner_instances.map((
        r: any,
      ) => [
        r.recipient,
        r.w2_ss_wages,
        r.line10,
        r.line11,
        r.line12,
        r.line13,
      ]),
      [["T", 176100, 0, 268, 268, 134], ["S", 0, 573, 134, 707, 354]],
    );
    assertEquals([
      p.schedule1.line3_schedule_c,
      p.schedule1.line15_se_deduction,
      p.schedule1.line17_se_health_insurance,
      p.schedule1.line26_total_adjustments,
      p.schedule2.line4_se_tax,
    ], [15000, 488, c.healthT + c.healthS, 488 + c.healthT + c.healthS, 975]);
    assertEquals(rows.length, c.copies);
    for (const r of rows) {
      const primary = r.recipient === "T";
      assertEquals([
        r.recipient_name,
        r.recipient_ssn,
        r.line4,
        r.line5,
        r.line6,
        r.line7,
        r.line8,
        r.line10,
        r.line13,
        r.line14,
      ], [
        primary ? "Alex Example" : "Casey Example",
        primary ? "111223333" : "222334444",
        primary ? 10000 : 5000,
        primary ? 10000 : 5000,
        1,
        primary ? 134 : 354,
        primary ? 9866 : 4646,
        primary ? 9866 : 4646,
        primary ? 9866 : 4646,
        primary ? c.healthT : c.healthS,
      ]);
      assertEquals(
        r.line1,
        primary ? c.premium * (12 - c.excludedT) : 185 * (12 - c.excludedS),
      );
    }
    assertEquals(
      q.joint_owner_filing_rows.map((
        r: any,
      ) => [
        r.recipient,
        r.se_tax_deduction,
        r.health_insurance_deduction,
        r.qbi,
      ]),
      [["S", 354, c.healthS, c.qbiS], ["T", 134, c.healthT, c.qbiT]],
    );
    assertEquals(q.line2, c.qbiT + c.qbiS);
    assertEquals(q.line5, Math.round((c.qbiT + c.qbiS) * .2));
    assertEquals(q.line11, c.agi - 31500);
    assertEquals(q.line14, Math.round((c.agi - 31500) * .2));
    // Independent 2025 Form1040 SectionB computation:22% minus10172, not a library call.
    assertEquals(c.tax, Math.round(c.taxable * .22 - 10172));
    assertEquals([
      p.f1040.line1a_wages,
      p.f1040.line10_adjustments,
      p.f1040.line11_agi,
      p.f1040.line12c_deduction_total,
      p.f1040.line13_qbi_deduction,
      p.f1040.line15_taxable_income,
      p.f1040.line16_income_tax,
      p.f1040.line24_total_tax,
      p.f1040.line35a_refund,
    ], [
      176100,
      488 + c.healthT + c.healthS,
      c.agi,
      31500,
      c.deduction,
      c.taxable,
      c.tax,
      c.total,
      c.refund,
    ]);
    const fragments = form7206.build(h, { pending: p, filer: f.filer });
    assertEquals(Array.isArray(fragments), true);
    assertEquals(fragments.length, c.copies);
    for (let n = 0; n < rows.length; n++) {
      assertStringIncludes(
        fragments[n],
        `<NameLine1Txt>${rows[n].recipient_name}</NameLine1Txt>`,
      );
      assertStringIncludes(fragments[n], `<SSN>${rows[n].recipient_ssn}</SSN>`);
      assertStringIncludes(
        fragments[n],
        `<SelfEmpldHealthInsDedAmt>${
          rows[n].line14
        }</SelfEmpldHealthInsDedAmt>`,
      );
    }
    const pdfCopies = form7206Pdf.instances!(h, f.filer, p);
    assertEquals(pdfCopies.length, c.copies);
    for (const row of pdfCopies) {
      const projected = form7206Pdf.projectFields!(row, p);
      assertEquals(projected.line6_pct, "100%");
      assertEquals(form7206Pdf.includeWhen!(projected, p), true);
    }
    const prepared = await f1040_2025.prepareReturn(p, f.filer),
      xml = prepared.bundle.xml;
    assertEquals((xml.match(/<IRS7206 /g) ?? []).length, c.copies);
    assertStringIncludes(xml, "<IRS8995");
    assertStringIncludes(
      xml,
      `<AdjustedGrossIncomeAmt>${c.agi}</AdjustedGrossIncomeAmt>`,
    );
    const tmp = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeTextFile(tmp, xml);
      const v = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", xsd, tmp],
        stdout: "piped",
        stderr: "piped",
      }).output();
      assertEquals(v.code, 0, new TextDecoder().decode(v.stderr));
    } finally {
      await Deno.remove(tmp);
    }
    const pdf = await prepared.renderPdf(), doc = await PDFDocument.load(pdf);
    assertEquals(doc.getPageCount(), 15 + c.copies);
    assertEquals(doc.getForm().getFields().length, 0);
    const tmpPdf = await Deno.makeTempFile({ suffix: ".pdf" });
    try {
      await Deno.writeFile(tmpPdf, pdf);
      const t = await new Deno.Command("pdftotext", {
        args: [tmpPdf, "-"],
        stdout: "piped",
      }).output();
      const text = new TextDecoder().decode(t.stdout);
      // The builder projects before expanding instances: each actual copy must
      // retain its percentage display field, not only the numeric source ratio.
      assertEquals((text.match(/100%/g) ?? []).length, c.copies);
      assertEquals(
        (text.match(/Self-Employed Health Insurance Deduction/g) ?? []).length,
        c.copies,
      );
      assertStringIncludes(text, "Alex Design");
      assertStringIncludes(text, "Casey Photography");
    } finally {
      await Deno.remove(tmpPdf);
    }
    if (Deno.args.includes("--write-review-artifacts")) {
      const dir = "/tmp/opentax-independent-spouse-health-plans-evidence";
      await Deno.mkdir(dir, { recursive: true });
      await Deno.writeTextFile(
        `${dir}/${c.id}-source-input.json`,
        JSON.stringify({ inputs: f.inputs, filer: f.filer }, null, 2),
      );
      await Deno.writeTextFile(`${dir}/${c.id}-full-return.xml`, xml);
      await Deno.writeFile(`${dir}/${c.id}-filled-return.pdf`, pdf);
    }
  });
}
Deno.test("independent health plans reject borrowed owner profit SE receipts inventory payments and filed deductions", async () => {
  const f = independentHealthFamily(),
    family = (p: any) => p.form7206.independent_schedule_c_plans;
  const sourceMutations: Array<(p: any) => void> = [
    (p) => family(p).plans[0].recipient = "S",
    (p) => family(p).plans[0].business_reference = "BIZ-S",
    (p) =>
      family(p).plans[0].plan_identifier = family(p).plans[1].plan_identifier,
    (p) =>
      family(p).plans[1].premium_months[0].payment_source_reference =
        family(p).plans[0].premium_months[0].payment_source_reference,
    (p) => family(p).plans[0].establishment_source_reference = "",
    (p) =>
      delete family(p).plans[0].premium_months[0]
        .employer_plan_review_reference,
    (p) => delete family(p).plans[0].premium_months[0].payment_source_reference,
    (p) => family(p).plans[0].premium_months[0].marketplace_policy = true,
    (p) => family(p).plans[0].premium_months[0].long_term_care_policy = true,
    (p) =>
      family(p).plans[0].premium_months[0]
        .eligible_for_subsidized_employer_plan = true,
    (p) => family(p).plans[0].premium_months[0].paid_premium = 501,
    (p) => family(p).plans.pop(),
    (p) => family(p).business_plan_reviews[0].plan_identifiers = [],
    (p) => family(p).business_plan_reviews[1].business_reference = "BIZ-T",
    (p) => delete family(p).business_plan_reviews[0].no_other_plans_confirmed,
    (p) => family(p).taxpayer_identity.ssn = "222334444",
    (p) => family(p).spouse_identity.name = "Borrowed Owner",
    (p) => p.schedule_c.schedule_cs[0].proprietor_recipient = "S",
    (p) => p.schedule_c.schedule_cs[0].line_1_gross_receipts = 10001,
    (p) => p.w2.w2s[0].box3_ss_wages = 176099,
    (p) => p.f1099nec.f1099necs[1].recipient_ssn = "222334444",
    (p) =>
      p.form7206.schedule_se_source.owner_source.businesses[0].net_profit =
        5001,
    (p) => p.form7206.independent_plan_filing_rows[1].line5 = 15000,
    (p) => p.form7206.independent_plan_filing_rows[1].line6 = 2 / 3,
    (p) => p.form7206.independent_plan_filing_rows[1].line7 = 325,
    (p) =>
      p.form7206.independent_plan_filing_rows[1].recipient_ssn = "222334444",
    (p) => p.form7206.independent_plan_filing_rows[0].line14 = 6000,
    (p) => p.form7206.independent_plan_filing_rows.pop(),
    (p) => p.form7206.line14 = 8220,
    (p) => p.schedule1.line17_se_health_insurance = 6000,
    (p) => p.schedule1.line15_se_deduction = 134,
    (p) => delete p.form8995.joint_owner_health_plans_source,
    (p) => p.form8995.se_health_insurance_deduction = 6000,
    (p) => p.f1040.line10_adjustments = 488,
    (p) => p.f1040.line11_agi = 190612,
  ];
  for (const mutate of sourceMutations) {
    const p = structuredClone(f.pending);
    mutate(p);
    assertThrows(() =>
      form7206.build(p.form7206, { pending: p, filer: f.filer })
    );
    assertThrows(() => form7206Pdf.projectFields!(p.form7206, p));
    assertThrows(() =>
      form8995.build(p.form8995, { pending: p, filer: f.filer })
    );
    assertThrows(() => form8995Pdf.projectFields!(p.form8995, p));
    await assertRejects(() => f1040_2025.prepareReturn(p, f.filer));
  }
  for (
    const mutate of [
      (p: any) =>
        p.form8995.joint_owner_filing_rows[1].health_insurance_deduction = 2220,
      (p: any) => p.form8995.joint_owner_filing_rows[1].qbi = 9866,
      (p: any) => p.form8995.joint_owner_filing_rows[0].tin.value = "111223333",
      (p: any) => p.f1040.line13_qbi_deduction = 2458,
    ]
  ) {
    const p = structuredClone(f.pending);
    mutate(p);
    assertThrows(() =>
      form8995.build(p.form8995, { pending: p, filer: f.filer })
    );
    assertThrows(() => form8995Pdf.projectFields!(p.form8995, p));
    await assertRejects(() => f1040_2025.prepareReturn(p, f.filer));
  }
  const copies = form7206Pdf.instances!(f.pending.form7206, f.filer, f.pending);
  const bad = structuredClone(copies[0]);
  bad.line14 = 0;
  assertThrows(() => form7206Pdf.projectFields!(bad, f.pending));
  const owner = structuredClone(f.filer);
  owner.spouse.ssn = "999887777";
  assertThrows(() =>
    form7206.build(f.pending.form7206, { pending: f.pending, filer: owner })
  );
  assertThrows(() =>
    form7206Pdf.instances!(f.pending.form7206, owner, f.pending)
  );
});
Deno.test("independent health public source cannot supply income scalars or merge plan routes and reconciles other-owner W2 changes", () => {
  for (
    const mutate of [
      (i: any) =>
        i.form7206.independent_schedule_c_plans.plans[0]
          .schedule_c_line31_net_profit = 10000,
      (i: any) =>
        i.form7206.independent_schedule_c_plans.plans[0].half_se_deduction =
          134,
      (i: any) => i.form7206.single_schedule_c_plan = {},
      (i: any) => i.form7206.marketplace_ptc_premium_overlap = true,
      (i: any) => i.schedule_c[1].proprietor_recipient = "T",
    ]
  ) {
    const i = independentHealthInputs();
    mutate(i);
    assertEquals(
      f1040_2025.executeReturn(i).diagnostics.some((d) =>
        d.severity === "error"
      ),
      true,
    );
  }
  const f = independentHealthFamily(1200),
    raw = structuredClone(
      f.pending.schedule_se.owner_source ??
        {
          identity: f.pending.schedule_se.owner_identity,
          businesses: f.pending.schedule_se.owner_business_sources,
          wages: f.pending.schedule_se.owner_wage_sources,
        },
    );
  raw.wages[0].ss_wages_and_tips = 0;
  const changed = calculateIndependentOwnerHealth(
    f.pending.form7206.independent_schedule_c_plans,
    raw,
    176100,
  );
  const primary = changed.rows.find((r) => r.recipient === "T")!;
  assertEquals(primary.line7, 707);
  assertEquals(primary.line14, 9293);
  assertEquals(changed.rows.find((r) => r.recipient === "S")!.line7, 354);
});
