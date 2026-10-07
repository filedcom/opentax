import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import { f1040_2025 } from "./index.ts";
import { normalizeAllPending } from "./pending.ts";
import { form8995a } from "./mef/forms/f8995a.ts";
import { form8995aPdf } from "./pdf/forms/f8995a.ts";
import { form8995 } from "./mef/forms/f8995.ts";
import { form8995Pdf } from "./pdf/forms/f8995.ts";
import { scheduleF } from "./mef/forms/schedule_f.ts";
import { scheduleFPdf } from "./pdf/forms/schedule_f.ts";
import { form5884 } from "./mef/forms/f5884.ts";
import { form5884Pdf } from "./pdf/forms/f5884.ts";
import { inputSchema as aSchema } from "../nodes/intermediate/forms/form8995a/index.ts";
const fixtures = pdfReviewFixtures.filter((f) =>
  f.id.startsWith("owned-farm-wotc") && !f.id.startsWith("owned-farm-wotc-loss")
);
Deno.test("public reviewed farm WOTC rejects source owner worker payroll income and method conflicts", async () => {
  const fixture = fixtures.find((f) => f.id.endsWith("spouse-phase"))!;
  const mutations = [
    (i: any) =>
      i.schedule_f.schedule_fs[0].qbi_wotc_filing_review.owner_ssn =
        "111223333",
    (i: any) => i.schedule_f.schedule_fs[0].proprietor_recipient = "T",
    (i: any) => i.schedule_f.schedule_fs[0].line_d_ein = "999887777",
    (i: any) =>
      i.schedule_f.schedule_fs[0].qbi_wotc_filing_review.employee_w2_records[0]
        .employee_ssn = "444556666",
    (i: any) =>
      i.schedule_f.schedule_fs[0].qbi_wotc_filing_review.employee_w2_records[0]
        .swa_certification_reference = "Wrong issuer",
    (i: any) =>
      i.schedule_f.schedule_fs[0].qbi_wotc_filing_review.employee_w2_records[0]
        .box1_wages += 1,
    (i: any) => i.schedule_f.schedule_fs[0].qbi_w2_wages += 1,
    (i: any) =>
      delete i.schedule_f.schedule_fs[0].qbi_wotc_filing_review
        .farm_ownership_source_reference,
    (i: any) => i.f1099nec[0].recipient_ssn = "111223333",
    (i: any) => i.f1099nec[0].box1_nec += 1,
    (i: any) => delete i.f1099nec[0].source_document_reference,
    (i: any) =>
      i.f5884.f5884s[0].direct_employer_review.employer_ein = "999887777",
    (i: any) =>
      i.f5884.f5884s[0].direct_employer_review.proprietor_recipient = "T",
    (i: any) =>
      i.f5884.f5884s[0].wage_records[0].deduction_location.farm_id =
        "Wrong farm",
    (i: any) => i.w2[0].employer_ein = i.schedule_f.schedule_fs[0].line_d_ein,
    (i: any) => i.schedule_f.farm_optional_method_elected = true,
    (i: any) => i.f1099g[0].box_7_agriculture += 1,
    (i: any) => i.f1099g[0].recipient_tin = "111223333",
    (i: any) => delete i.f1099g[0].source_document_reference,
    (i: any) =>
      i.schedule_f.schedule_fs[0].qbi_wotc_filing_review
        .principal_income_from_farming_confirmed = false,
    (i: any) =>
      i.schedule_f.schedule_fs[0].qbi_wotc_filing_review.employee_w2_records[0]
        .box3_social_security_wages += 1,
    (i: any) =>
      i.schedule_f.schedule_fs[0].qbi_wotc_filing_review.employee_w2_records[0]
        .more_than_half_each_pay_period_agricultural_labor_confirmed = false,
    (i: any) =>
      delete i.schedule_f.schedule_fs[0].qbi_wotc_filing_review
        .employee_w2_records[0].agricultural_labor_duties_source_reference,
  ];
  for (const mutate of mutations) {
    const inputs = structuredClone(fixture.inputs);
    mutate(inputs);
    const r = f1040_2025.executeReturn(inputs);
    if (r.diagnostics.some((d) => d.severity === "error")) continue;
    await assertRejects(() =>
      f1040_2025.prepareReturn(r.pending, fixture.filer)
    );
  }
});
Deno.test("below and advanced farm WOTC direct native PDF reject retained source and final joins", () => {
  for (
    const fixture of [
      fixtures.find((f) => f.id.endsWith("single-below"))!,
      fixtures.find((f) => f.id.endsWith("spouse-phase"))!,
      fixtures.find((f) => f.id.endsWith("primary-limited"))!,
    ]
  ) {
    const original = normalizeAllPending(
      f1040_2025.executeReturn(fixture.inputs).pending,
    );
    const changes = [
      (p: any) => p.schedule_f.schedule_fs[0].line_d_ein = "999887777",
      (p: any) =>
        p.schedule_f.schedule_fs[0].qbi_wotc_filing_review.owner_ssn =
          "999887777",
      (p: any) =>
        p.schedule_f.schedule_fs[0].qbi_wotc_filing_review
          .employee_w2_records[0].employer_ein = "999887777",
      (p: any) =>
        p.schedule_f.schedule_fs[0].qbi_wotc_filing_review
          .employee_w2_records[0].payroll_record_references = ["Wrong payroll"],
      (p: any) =>
        p.f5884.f5884s[0].certification.swa_certification_reference =
          "Wrong SWA",
      (p: any) =>
        p.f5884.f5884s[0].direct_employer_review.proprietor_ssn = "999887777",
      (p: any) => p.f5884.f5884s[0].wage_records[0].qualified_wages += 1,
      (p: any) => p.f1099nec.f1099necs[0].payer_tin = "999887777",
      (p: any) =>
        p.f1099nec.f1099necs[0].source_document_reference = "Wrong copy",
      (p: any) => p.f3800.f5884_credit.credit_amount += 1,
      (p: any) => p.f3800.allowed_credit += 1,
      (p: any) => p.schedule1.line6_schedule_f += 1,
      (p: any) => p.schedule1.line15_se_deduction += 1,
      (p: any) => p.f1040.line11_agi += 1,
      (p: any) => p.f1040.line13_qbi_deduction += 1,
      (p: any) => p.general.taxpayer_ssn = "999887777",
      (p: any) => p.f1099g.f1099gs[0].box_7_agriculture += 1,
      (p: any) =>
        p.f1099g.f1099gs[0].source_document_reference = "Wrong farming copy",
      (p: any) =>
        p.schedule_f.schedule_fs[0].qbi_wotc_filing_review
          .employee_w2_records[0].box3_social_security_wages += 1,
    ];
    for (const mutate of changes) {
      const p = structuredClone(original);
      mutate(p);
      const q = p.form8995a ?? p.form8995;
      if (p.form8995a) {
        assertThrows(() =>
          form8995a.build(aSchema.parse(q), {
            pending: p,
            filer: fixture.filer,
          })
        );
        assertThrows(() => form8995aPdf.projectFields!(q, p));
      } else {
        assertThrows(() =>
          form8995.build(q as any, { pending: p, filer: fixture.filer })
        );
        assertThrows(() => form8995Pdf.projectFields!(q, p));
      }
      assertThrows(() =>
        scheduleF.build(p.schedule_f as any, {
          pending: p,
          filer: fixture.filer,
        })
      );
      assertThrows(() =>
        scheduleFPdf.instances!(p.schedule_f, fixture.filer, p)
      );
      assertThrows(() =>
        form5884.build(p.f5884, { pending: p, filer: fixture.filer })
      );
      assertThrows(() => form5884Pdf.projectFields!(p.f5884, p));
    }
    const badFiler = { ...fixture.filer, primarySSN: "999887777" };
    assertThrows(() =>
      scheduleF.build(original.schedule_f as any, {
        pending: original,
        filer: badFiler,
      })
    );
    assertThrows(() =>
      scheduleFPdf.instances!(original.schedule_f, badFiler, original)
    );
    for (const key of ["schedule_f", "f5884"] as const) {
      const raw = structuredClone(original[key]) as any;
      if (key === "schedule_f") {
        raw.schedule_fs[0].line_c_farm_name = "Wrong source farm";
      } else {raw.f5884s[0].direct_employer_review.source_review_reference =
          "Wrong source record";}
      if (key === "schedule_f") {
        assertThrows(() =>
          scheduleF.build(raw, { pending: original, filer: fixture.filer })
        );
        assertThrows(() =>
          scheduleFPdf.instances!(raw, fixture.filer, original)
        );
      } else {
        assertThrows(() =>
          form5884.build(raw, { pending: original, filer: fixture.filer })
        );
        assertThrows(() => form5884Pdf.projectFields!(raw, original));
      }
    }
  }
});
Deno.test("farm WOTC retained raw cents wage caps and full determined reduction survive zero and limited use", () => {
  for (const fixture of fixtures) {
    const p = normalizeAllPending(
      f1040_2025.executeReturn(fixture.inputs).pending,
    );
    const farm = (p.schedule_f.schedule_fs as any[])[0];
    assertEquals(
      farm.line8_other_income,
      (fixture.inputs.f1099nec as any[])[0].box1_nec,
    );
    assertEquals(
      farm.line22_labor_hired,
      (fixture.inputs.schedule_f as any).schedule_fs[0].line22_labor_hired,
    );
    const reduction =
      (p.schedule_f.wotc_wage_reductions as any[])[0].credit_amount;
    assertEquals(reduction, fixture.id.endsWith("limited") ? 192000 : 2400);
    if (fixture.id.includes("zero-use")) {
      assertEquals(p.f3800.allowed_credit, 0);
      assertEquals(p.schedule1.line6_schedule_f, 2401);
      assertEquals(p.schedule1.line15_se_deduction, 170);
      assertEquals(p.f1040.line24_total_tax, 339);
    }
    if (fixture.id.endsWith("limited")) {
      assertEquals(p.f3800.allowed_credit, 95695);
      assertEquals(p.schedule1.line6_schedule_f, 312001);
      assertEquals(p.schedule1.line15_se_deduction, 4178);
      assertEquals(p.f1040.line13_qbi_deduction, 61565);
      assertEquals(p.f1040.line24_total_tax, 34964);
    }
    if (fixture.id.endsWith("primary-below")) {
      assertEquals(
        (p.schedule_se.owner_instances as any[])[0].w2_ss_wages,
        176100,
      );
    }
    if (fixture.id === "owned-farm-wotc-spouse-phase") {
      assertEquals(
        (p.schedule_se.owner_instances as any[])[0].w2_ss_wages,
        130000.37,
      );
    }
  }
});

Deno.test("sourced Single farm retains its zero Form8995 taxable-income limitation", () => {
  const fixture = fixtures.find((f) => f.id.includes("zero-use"))!;
  const p = normalizeAllPending(
    f1040_2025.executeReturn(fixture.inputs).pending,
  );
  assertEquals(p.form8995.line1_qbi, 2231);
  assertEquals(p.form8995.line11, 0);
  assertEquals(p.form8995.line15, 0);
  assertEquals(p.f1040.line13_qbi_deduction, 0);
  assertEquals(form8995Pdf.projectFields!(p.form8995, p).line15, 0);
});
