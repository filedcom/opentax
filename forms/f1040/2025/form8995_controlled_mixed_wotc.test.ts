import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import { f1040_2025 } from "./index.ts";
import { normalizeAllPending } from "./pending.ts";
import { assertFarmWotcReturn } from "./form8995_farm_wotc_reconciliation.ts";
import {
  calculateForm5884,
  inputSchema as creditSchema,
} from "../nodes/inputs/f5884/index.ts";
import { calculateFarmWotcLines } from "../nodes/intermediate/forms/form8995a/farm-wotc.ts";
import { inputSchema as parentSchema } from "../nodes/intermediate/forms/form8995a/index.ts";
import { scheduleC } from "./mef/forms/schedule_c.ts";
import { scheduleCPdf } from "./pdf/forms/schedule_c.ts";
import { scheduleF } from "./mef/forms/schedule_f.ts";
import { scheduleFPdf } from "./pdf/forms/schedule_f.ts";
import { form5884 } from "./mef/forms/f5884.ts";
import { form5884Pdf } from "./pdf/forms/f5884.ts";
const fixtures = pdfReviewFixtures.filter((f) =>
  f.id.startsWith("owned-controlled-mixed-cf-wotc")
);
Deno.test("actual controlled mixed C/F employers file separate owner SE/QBI and joint current credit in full XSD/PDF", async () => {
  assertEquals(fixtures.length, 4);
  const expected = [
    [90402, 4372, 17206, 2400, 56765],
    [365401, 17277, 21135, 2400, 130973],
    [864002, 16288, 169543, 239748, 112690],
    [184000, 13532, 20032, 2400, 114922],
  ];
  for (const [i, f] of fixtures.entries()) {
    const r = f1040_2025.executeReturn(f.inputs),
      p = normalizeAllPending(r.pending);
    assertEquals(r.diagnostics, []);
    assertFarmWotcReturn(p.form8995a ?? p.form8995, p, f.filer);
    assertEquals([
      Number(p.schedule1.line3_schedule_c) +
      Number(p.schedule1.line6_schedule_f),
      p.schedule1.line15_se_deduction,
      p.f1040.line13_qbi_deduction,
      p.f3800.allowed_credit,
      p.f1040.line24_total_tax,
    ], expected[i]);
    const credit = calculateForm5884(creditSchema.parse(p.f5884));
    assertEquals(credit.line2, i === 2 ? 384000 : 2400);
    assertEquals(
      credit.wageDeductionAllocations.map((a) => a.credit_amount),
      i === 2 ? [192000, 192000] : i === 1 ? [1371, 1029] : [1200, 1200],
    );
    assertEquals(
      credit.controlledGroupShares.reduce((sum, m) => sum + m.credit_share, 0),
      credit.line2,
    );
    const records = (f.inputs as any).f5884.f5884s;
    assertEquals(credit.line1bWages, i === 2 ? 960000 : 6000);
    assertEquals(records.length, i === 2 ? 320 : 2);
    assertEquals(p.schedule3.line11_excess_ss ?? 0, 0);
    const owners = p.schedule_se.owner_instances as any[];
    assertEquals(
      owners.map((o) => o.owner_ssn),
      i === 3 ? ["444556666"] : ["111223333", "444556666"],
    );
    if (i === 0) {
      assertEquals(owners.map((o) => o.w2_ss_wages), [176100, 50000.49]);
      assertEquals(owners[0].line10, 0);
      assertEquals(owners[1].line10, 6321);
    }
    if (i === 3) {
      const a = calculateFarmWotcLines(parentSchema.parse(p.form8995a));
      assertEquals(a.lossSchedule?.rows.map((row) => row.line1a), [
        181669,
        -11201,
      ]);
      assertEquals(a.lossSchedule?.rows[0].line1c, 170468);
      assertEquals(a.rows[1].lines.line4, 0);
      assertEquals(a.parent.line40, 0);
    }
    console.log(
      f.id,
      JSON.stringify({
        farm: p.schedule1.line6_schedule_f,
        half: p.schedule1.line15_se_deduction,
        agi: p.f1040.line11_agi,
        qbi: p.f1040.line13_qbi_deduction,
        use: p.f3800.allowed_credit,
        tax: p.f1040.line24_total_tax,
        phase: p.form8995a
          ? calculateFarmWotcLines(parentSchema.parse(p.form8995a)).parent
            .phaseIn
          : null,
      }),
    );
    const prepared = await f1040_2025.prepareReturn(r.pending, f.filer);
    assertEquals(
      prepared.bundle.xml.includes("ControlledGroupMemberStatement"),
      true,
    );
    assertEquals(
      prepared.bundle.xml.includes("DeductionDifferentiationStmt"),
      true,
    );
    const proc = new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        "-",
      ],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const w = proc.stdin.getWriter();
    await w.write(new TextEncoder().encode(prepared.bundle.xml));
    await w.close();
    const out = await proc.output();
    assertEquals(out.code, 0, new TextDecoder().decode(out.stderr));
    assertEquals((await prepared.renderPdf()).length > 0, true);
    const detachedC = structuredClone(p.schedule_c) as any;
    detachedC.schedule_cs[0].line_22_supplies++;
    assertThrows(() =>
      scheduleC.build(detachedC, { pending: p, filer: f.filer })
    );
    assertThrows(() => scheduleCPdf.projectFields!(detachedC, p));
    if (i === 1) {
      assertEquals((f.inputs as any).schedule_c[0].line_26_wages, 4000.49);
      assertEquals(p.schedule1.line3_schedule_c, 177372);
      assertEquals(
        prepared.bundle.xml.includes(
          "<WagesLessEmploymentCreditsAmt>2629</WagesLessEmploymentCreditsAmt>",
        ),
        true,
      );
    }
  }
});
Deno.test("mixed C/F actual ownership attribution payroll and issued-income conflicts fail public native and PDF", async () => {
  const f = fixtures[1];
  for (
    const [mutationIndex, change] of [
      (i: any) => delete i.f5884.controlled_group.joint_filed_members_review,
      (i: any) =>
        i.f5884.controlled_group.joint_filed_members_review.members[1]
          .spousal_ownership_attribution_applies_confirmed = false,
      (i: any) =>
        i.f5884.controlled_group.joint_filed_members_review.members[1]
          .other_spouse_management_participation_confirmed = false,
      (i: any) =>
        i.f5884.controlled_group.members[1].business_name =
          "Conflicting farm name",
      (i: any) =>
        i.f5884.f5884s[1].group_employee_identity_review
          .employee_identity_source_reference = "Contradictory person",
      (i: any) =>
        i.schedule_f.schedule_fs[0].qbi_wotc_filing_review
          .employee_w2_records[0].employee_ssn = "666778888",
      (i: any) =>
        i.schedule_f.schedule_fs[0].qbi_wotc_filing_review
          .employee_w2_records[0].ssa_filing_record_reference =
            i.schedule_c[0].qbi_wotc_filing_review
              .employee_w2_records[0].ssa_filing_record_reference,
      (i: any) =>
        i.f5884.f5884s[1].direct_employer_review.proprietor_ssn = "111223333",
      (i: any) =>
        i.f5884.f5884s[1].wage_records[0].deduction_location.farm_id =
          "Primary-WOTC-Farm",
      (i: any) =>
        i.f5884.f5884s[1].certification.swa_certification_reference =
          "Primary issuer conflict",
      (i: any) =>
        i.schedule_f.schedule_fs[0].qbi_wotc_filing_review
          .employee_w2_records[0].source_document_reference =
            i.schedule_c[0].qbi_wotc_filing_review
              .employee_w2_records[0].source_document_reference,
      (i: any) => {
        i.f5884.f5884s[1].employee_reference = "Same worker alias";
        i.schedule_f.schedule_fs[0].qbi_wotc_filing_review
          .employee_w2_records[0].employee_reference = "Same worker alias";
      },
      (i: any) => i.f1099g[0].recipient_tin = "111223333",
      (i: any) => i.f1099nec[0].box1_nec++,
      (i: any) => i.schedule_f.farm_optional_method_elected = true,
      (i: any) =>
        delete i.schedule_c[0].qbi_wotc_filing_review.employee_w2_records[0]
          .employee_ssn,
      (i: any) =>
        i.schedule_c[0].qbi_wotc_filing_review.employee_w2_records[0]
          .box3_social_security_wages++,
      (i: any) =>
        i.schedule_c[0].qbi_wotc_filing_review.employee_w2_records[0]
          .employer_ein = "987654321",
      (i: any) =>
        i.schedule_c[0].qbi_wotc_filing_review.owner_ssn = "444556666",
      (i: any) => i.f1099nec[0].recipient_ssn = "444556666",
      (i: any) =>
        i.f5884.f5884s[0].wage_records[0].deduction_location
          .business_reference = "Spouse-WOTC-Farm",
    ].entries()
  ) {
    const inputs = structuredClone(f.inputs);
    change(inputs);
    const r = f1040_2025.executeReturn(inputs);
    if (!r.diagnostics.some((d) => d.severity === "error")) {
      await assertRejects(
        () => f1040_2025.prepareReturn(r.pending, f.filer),
        Error,
        "",
        `Public mutation ${mutationIndex}`,
      );
    }
  }
  for (const f of fixtures) {
    const original = normalizeAllPending(
      f1040_2025.executeReturn(f.inputs).pending,
    );
    for (
      const change of [
        (p: any) =>
          p.f5884.controlled_group.joint_filed_members_review.members[1]
            .proprietor_ssn = "111223333",
        (p: any) => p.schedule_f.schedule_fs[0].line22_labor_hired++,
        (p: any) => p.schedule_c.schedule_cs[0].line_26_wages++,
        (p: any) => p.schedule1.line3_schedule_c++,
        (p: any) => p.schedule_c.wotc_wage_reductions[0].credit_amount++,
        (p: any) => p.schedule_se.owner_business_sources[1].net_profit++,
        (p: any) => p.schedule_se.owner_instances[0].w2_ss_wages++,
        (p: any) => p.f3800.allowed_credit++,
        (p: any) =>
          p.f1099nec.f1099necs[0].payer_name = "Conflicting issued payer",
        (p: any) =>
          p.f1099nec.f1099necs[0].source_document_reference =
            "Conflicting issued copy",
        (p: any) => p.f1040.line13_qbi_deduction++,
      ]
    ) {
      const p = structuredClone(original);
      change(p);
      await assertRejects(() => f1040_2025.prepareReturn(p, f.filer));
      assertThrows(() =>
        assertFarmWotcReturn(p.form8995a ?? p.form8995, p, f.filer)
      );
      assertThrows(() =>
        scheduleC.build(p.schedule_c as any, { pending: p, filer: f.filer })
      );
      assertThrows(() => scheduleCPdf.projectFields!(p.schedule_c, p));
      assertThrows(() =>
        scheduleF.build(p.schedule_f as any, { pending: p, filer: f.filer })
      );
      assertThrows(() => scheduleFPdf.projectFields!(p.schedule_f, p));
      assertThrows(() =>
        form5884.build(p.f5884 as any, { pending: p, filer: f.filer })
      );
      assertThrows(() => form5884Pdf.projectFields!(p.f5884, p));
    }
  }
});
