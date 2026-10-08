import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";
import { f1040_2025 } from "../../../index.ts";
import { normalizeAllPending } from "../../execution/pending.ts";
import {
  calculateOneBusiness8995ALines,
  calculateOwnedWotcBusinesses,
  inputSchema,
} from "../../../../nodes/intermediate/forms/form8995a/index.ts";
import { form8995a } from "../../../mef/forms/business/f8995a/f8995a.ts";
import { form8995aPdf } from "../../../pdf/forms/business/f8995a.ts";
const fixtures = pdfReviewFixtures.filter((f) =>
  f.id.startsWith("joint-spouse-wotc-") ||
  f.id.startsWith("joint-both-owner-wotc-")
);
Deno.test("spouse and both-owner WOTC preserve actual owner credit/QBI joins and native/PDF/XSD", async () => {
  for (const fixture of fixtures) {
    const r = f1040_2025.executeReturn(fixture.inputs);
    assertEquals(r.diagnostics, []);
    const p = normalizeAllPending(r.pending),
      q = inputSchema.parse(p.form8995a),
      lines = q.wotc_business_sources
        ? calculateOwnedWotcBusinesses(q).parent
        : calculateOneBusiness8995ALines(q);
    assertEquals(p.schedule_se.owner_instances instanceof Array, true);
    const owners = p.schedule_se.owner_instances as any[];
    const spouse = owners.find((row) => row.recipient === "S")!;
    assertEquals(spouse.w2_ss_wages, 0);
    assertEquals(q.wotc_business_sources?.length ?? 1, owners.length);
    assertEquals(
      (q.single_schedule_c_source?.joint_se_source ??
        q.wotc_business_sources![0].joint_se_source).wages[0].employee_ssn,
      "111223333",
    );
    assertEquals(lines.line39, p.f1040.line13_qbi_deduction);
    assertEquals(p.w2.w2s instanceof Array, true);
    assertEquals(
      (p.w2.w2s as any[])[0].box1_wages,
      (fixture.inputs.w2 as any[])[0].box1_wages,
    );
    assertEquals(
      p.f1040.line11_agi,
      Number(p.f1040.line1a_wages) + Number(p.schedule1.line3_schedule_c) -
        Number(p.schedule1.line15_se_deduction),
    );
    if (fixture.id.endsWith("threshold-edge")) {
      assertEquals(q.taxable_income, 394601);
      assertEquals(lines.phaseIn, .00001);
    }
    if (fixture.id.endsWith("upper-edge")) {
      assertEquals(q.taxable_income, 494600);
      assertEquals(lines.phaseIn, 1);
      assertEquals(lines.line39, 1800);
    }
    if (fixture.id.endsWith("upper-plus-one")) {
      assertEquals(q.taxable_income, 494601);
      assertEquals(lines.phaseInRequired, false);
    }
    if (
      fixture.id.startsWith("joint-spouse") && fixture.id.endsWith("phasein")
    ) {
      assertEquals(lines.phaseIn, .54743);
      assertEquals(lines.line39, 30931);
      assertEquals(
        form8995aPdf.projectFields!(p.form8995a, p).line24,
        "54.743",
      );
    }
    if (
      fixture.id.startsWith("joint-spouse") &&
      fixture.id.endsWith("partial-above")
    ) {
      assertEquals(
        q.single_schedule_c_source?.business.wotc_wage_reduction,
        192000,
      );
      assertEquals(p.schedule1.line3_schedule_c, 312000);
      assertEquals(p.schedule1.line15_se_deduction, 15096);
      assertEquals(p.f3800.allowed_credit, 93402);
      assertEquals(p.f1040.line24_total_tax, 56036);
    }
    const prepared = await f1040_2025.prepareReturn(r.pending, fixture.filer);
    assertStringIncludes(prepared.bundle.xml, "<IRS8995A ");
    const xsd = new URL(
      "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
      import.meta.url,
    ).pathname;
    const proc = new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, "-"],
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

Deno.test("both-owner WOTC preserves independent wage caps, full reductions and limited joint use", () => {
  const cases = fixtures.filter((f) =>
    f.id.startsWith("joint-both-owner") && !f.id.endsWith("one-phasein")
  );
  for (const fixture of cases) {
    const p = normalizeAllPending(
        f1040_2025.executeReturn(fixture.inputs).pending,
      ),
      q = inputSchema.parse(p.form8995a),
      calc = calculateOwnedWotcBusinesses(q);
    const partial = fixture.id.endsWith("partial-above");
    assertEquals(
      q.wotc_business_sources!.map((s) => s.business.wotc_wage_reduction),
      partial ? [192000, 192000] : [2400, 2400],
    );
    assertEquals(
      q.wotc_business_sources!.map((s) => s.se_tax_deduction),
      partial ? [4178, 15096] : [3980, 13169],
    );
    assertEquals(calc.parent.line39, partial ? 120945 : 23553);
    assertEquals(p.f3800.allowed_credit, partial ? 158054 : 4800);
    assertEquals(p.f1040.line24_total_tax, partial ? 88536 : 126729);
    assertEquals(p.schedule1.line15_se_deduction, partial ? 19274 : 17149);
    assertEquals(
      calc.parent.line16,
      calc.rows.reduce((sum, r) => sum + r.lines.line15, 0),
    );
    if (!partial) assertEquals(calc.parent.phaseIn, .69551);
  }
});
Deno.test("spouse/both-owner WOTC native and PDF reject employer owner certification payroll and final-return conflicts", () => {
  for (
    const fixture of [
      fixtures[0],
      fixtures.find((f) => f.id === "joint-spouse-wotc-phasein")!,
    ]
  ) {
    const original = normalizeAllPending(
      f1040_2025.executeReturn(fixture.inputs).pending,
    );
    for (
      const mutate of [
        (p: any) =>
          p.f5884.f5884s[0].direct_employer_review.employer_ein = "999887777",
        (p: any) =>
          p.f5884.f5884s[0].direct_employer_review.proprietor_ssn = "999887777",
        (p: any) =>
          p.f5884.f5884s[0].direct_employer_review.proprietor_recipient = "X",
        (p: any) =>
          p.f5884.f5884s[0].direct_employer_review.business_reference = "wrong",
        (p: any) => delete p.f5884.f5884s[0].direct_employer_review,
        (p: any) => p.schedule_c.schedule_cs[0].proprietor_recipient = "X",
        (p: any) => p.schedule_c.schedule_cs[0].line_d_ein = "999887777",
        (p: any) => p.schedule_se.owner_instances[0].line13 += 1,
        (p: any) => p.f5884.f5884s[0].wage_records[0].qualified_wages += 1,
        (p: any) =>
          p.f5884.f5884s[0].wage_records[0].deduction_location
            .business_reference = "wrong",
        (p: any) => p.w2.w2s[0].employee_ssn = "999887777",
        (p: any) =>
          p.w2.w2s[0].employer_ein = p.schedule_c.schedule_cs[0].line_d_ein,
        (p: any) => p.f3800.f5884_credit.credit_amount += 1,
        (p: any) => p.f1040.line13_qbi_deduction += 1,
        (p: any) => p.form8995a.qbi += 1,
        (p: any) => p.general.spouse_ssn = "999887777",
      ]
    ) {
      const p = structuredClone(original);
      mutate(p);
      assertThrows(() =>
        form8995a.build(inputSchema.parse(p.form8995a), {
          pending: p,
          filer: fixture.filer,
        })
      );
      assertThrows(() => form8995aPdf.projectFields!(p.form8995a, p));
    }
    for (
      const filer of [{ ...fixture.filer, primarySSN: "999887777" }, {
        ...fixture.filer,
        spouse: { ...fixture.filer.spouse!, ssn: "999887777" },
      }]
    ) {
      assertThrows(() =>
        form8995a.build(inputSchema.parse(original.form8995a), {
          pending: original,
          filer,
        })
      );
    }
  }
});
Deno.test("both-owner public source blocks conflicting proprietor and missing other-business review", () => {
  for (
    const mutate of [
      (p: any) => p.schedule_c[1].proprietor_recipient = "T",
      (p: any) =>
        p.schedule_c[1].qbi_wotc_filing_review.owner_ssn = "111223333",
      (p: any) =>
        delete p.schedule_c[1].qbi_wotc_filing_review
          .reviewed_other_business_references,
      (p: any) => delete p.f5884.ordinary_joint_employer_control_review,
      (p: any) =>
        p.f5884.ordinary_joint_employer_control_review.businesses[0]
          .other_spouse_no_direct_interest_confirmed = false,
      (p: any) =>
        p.f5884.ordinary_joint_employer_control_review.businesses[0]
          .employer_ein = "999887777",
    ]
  ) {
    const inputs = structuredClone(fixtures[0].inputs);
    mutate(inputs);
    assertEquals(
      f1040_2025.executeReturn(inputs).diagnostics.some((d) =>
        d.severity === "error"
      ),
      true,
    );
  }
});

Deno.test("owned WOTC PartIII follows the spouse row when only that wage limit binds", () => {
  const f = fixtures.find((f) => f.id.endsWith("one-phasein"))!,
    p = normalizeAllPending(f1040_2025.executeReturn(f.inputs).pending),
    calc = calculateOwnedWotcBusinesses(inputSchema.parse(p.form8995a)),
    pdf = form8995aPdf.projectFields!(p.form8995a, p);
  assertEquals(calc.rows.map((row) => row.lines.phaseInRequired), [
    false,
    true,
  ]);
  assertEquals(calc.parent.phaseInRequired, true);
  assertEquals(pdf.line17, undefined);
  assertEquals(pdf.line17_b, calc.rows[1].lines.line3);
  assertEquals(pdf.line27, calc.parent.line16);
  assertEquals(pdf.line19, undefined);
  assertEquals(pdf.line25, undefined);
  assertEquals(pdf.line20, calc.parent.line33);
  assertEquals(pdf.line24, String(calc.parent.phaseIn! * 100));
});
