import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";
import { f1040_2025 } from "../../../index.ts";
import { normalizeAllPending } from "../../execution/pending.ts";
import { assertFarmWotcReturn } from "./form8995_farm_wotc_reconciliation.ts";
import {
  calculateForm5884,
  inputSchema as creditSchema,
} from "../../../../nodes/inputs/f5884/index.ts";
import { calculateFarmWotcLines } from "../../../../nodes/intermediate/forms/form8995a/farm-wotc.ts";
import { inputSchema as parentSchema } from "../../../../nodes/intermediate/forms/form8995a/index.ts";
import { scheduleF } from "../../../mef/forms/business/schedule_f.ts";
import { scheduleFPdf } from "../../../pdf/forms/business/schedule_f.ts";
import { form5884 } from "../../../mef/forms/credits/f5884.ts";
import { form5884Pdf } from "../../../pdf/forms/credits/f5884.ts";
const fixtures = pdfReviewFixtures.filter((f) =>
  f.id.startsWith("owned-two-farm-wotc")
);
Deno.test("two actual independent farm employers file separate owner SE/QBI and joint current credit in full XSD/PDF", async () => {
  assertEquals(fixtures.length, 4);
  const expected = [
    [92802, 4473, 17666, 4800, 55028],
    [362802, 17149, 23552, 4800, 126730],
    [624002, 13074, 122186, 187181, 86745],
    [186400, 13548, 19249, 4800, 113577],
  ];
  for (const [i, f] of fixtures.entries()) {
    const r = f1040_2025.executeReturn(f.inputs),
      p = normalizeAllPending(r.pending);
    assertEquals(r.diagnostics, []);
    assertFarmWotcReturn(p.form8995a ?? p.form8995, p, f.filer);
    assertEquals([
      p.schedule1.line6_schedule_f,
      p.schedule1.line15_se_deduction,
      p.f1040.line13_qbi_deduction,
      p.f3800.allowed_credit,
      p.f1040.line24_total_tax,
    ], expected[i]);
    const credit = calculateForm5884(creditSchema.parse(p.f5884));
    assertEquals(credit.line2, i === 2 ? 384000 : 4800);
    assertEquals(
      credit.wageDeductionAllocations.map((a) => a.credit_amount),
      i === 2 ? [192000, 192000] : [2400, 2400],
    );
    assertEquals(p.schedule3.line11_excess_ss ?? 0, 0);
    const owners = p.schedule_se.owner_instances as any[];
    assertEquals(
      owners.map((o) => o.owner_ssn),
      i === 3 ? ["444556666"] : ["111223333", "444556666"],
    );
    if (i === 0) {
      assertEquals(owners.map((o) => o.w2_ss_wages), [176100, 50000.49]);
      assertEquals(owners[0].line10, 0);
      assertEquals(owners[1].line10, 6459);
    }
    if (i === 3) {
      const a = calculateFarmWotcLines(parentSchema.parse(p.form8995a));
      assertEquals(a.lossSchedule?.rows.map((row) => row.line1a), [
        -10001,
        182853,
      ]);
      assertEquals(a.lossSchedule?.rows[1].line1c, 172852);
      assertEquals(a.rows[0].lines.line4, 0);
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
  }
});
Deno.test("two farm actual ownership attribution payroll and issued-income conflicts fail public native and PDF", async () => {
  const f = fixtures[1];
  for (
    const [mutationIndex, change] of [
      (i: any) => delete i.f5884.ordinary_joint_employer_control_review,
      (i: any) =>
        i.f5884.ordinary_joint_employer_control_review.businesses[1]
          .other_spouse_no_direct_interest_confirmed = false,
      (i: any) =>
        i.f5884.ordinary_joint_employer_control_review.businesses[1]
          .other_spouse_no_director_fiduciary_employee_or_management_confirmed =
            false,
      (i: any) =>
        i.f5884.ordinary_joint_employer_control_review.businesses[1]
          .passive_gross_income_not_more_than_half_confirmed = false,
      (i: any) =>
        i.f5884.ordinary_joint_employer_control_review.businesses[1]
          .no_disposition_restrictions_favoring_spouse_or_minor_children_confirmed =
            false,
      (i: any) =>
        i.f5884.ordinary_joint_employer_control_review
          .no_other_common_control_ownership_or_options_confirmed = false,
      (i: any) =>
        i.f5884.f5884s[1].direct_employer_review.proprietor_ssn = "111223333",
      (i: any) =>
        i.f5884.f5884s[1].wage_records[0].deduction_location.farm_id =
          "Primary-WOTC-Farm",
      (i: any) =>
        i.f5884.f5884s[1].certification.swa_certification_reference =
          "Primary issuer conflict",
      (i: any) =>
        i.schedule_f.schedule_fs[1].qbi_wotc_filing_review
          .employee_w2_records[0].source_document_reference =
            i.schedule_f.schedule_fs[0].qbi_wotc_filing_review
              .employee_w2_records[0].source_document_reference,
      (i: any) => i.f1099g[1].recipient_tin = "111223333",
      (i: any) => i.f1099nec[1].box1_nec++,
      (i: any) => i.schedule_f.farm_optional_method_elected = true,
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
          p.f5884.ordinary_joint_employer_control_review.businesses[1]
            .proprietor_ssn = "111223333",
        (p: any) => p.schedule_f.schedule_fs[1].line22_labor_hired++,
        (p: any) => p.schedule_se.owner_business_sources[1].net_profit++,
        (p: any) => p.schedule_se.owner_instances[0].w2_ss_wages++,
        (p: any) => p.f3800.allowed_credit++,
        (p: any) => p.f1040.line13_qbi_deduction++,
      ]
    ) {
      const p = structuredClone(original);
      change(p);
      assertThrows(() =>
        assertFarmWotcReturn(p.form8995a ?? p.form8995, p, f.filer)
      );
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
Deno.test("actual MFJ external W2 excess Social Security is per owner and multiple employers", async () => {
  const f = fixtures[0], inputs: any = structuredClone(f.inputs);
  inputs.w2.push({
    ...inputs.w2[0],
    employer_ein: "234567899",
    source_document_reference: "Synthetic second primary issued W2",
    box1_wages: 20000.50,
    box3_ss_wages: 20000.50,
    box4_ss_withheld: 1240.03,
    box5_medicare_wages: 20000.50,
    box6_medicare_withheld: 290.01,
    box2_fed_withheld: 1000,
  });
  const r = f1040_2025.executeReturn(inputs);
  assertEquals(r.diagnostics, []);
  const p = normalizeAllPending(r.pending);
  assertEquals(p.schedule3.line11_excess_ss, 1240);
  await f1040_2025.prepareReturn(r.pending, f.filer);
});
