import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import {
  calculateOneBusiness8995ALines,
  inputSchema,
} from "../../../../../nodes/intermediate/forms/deductions/business/form8995a/index.ts";
import { form8995a } from "../../../../mef/forms/deductions/business/f8995a/f8995a.ts";
import { form8995aPdf } from "../../../../pdf/forms/deductions/business/f8995a.ts";
const fixtures = pdfReviewFixtures.filter((f) =>
  f.id.startsWith("joint-primary-wotc-")
);
Deno.test("joint primary WOTC preserves spouse W2 and full wage reduction through phase-in/native/PDF/XSD", async () => {
  for (const fixture of fixtures) {
    const r = f1040_2025.executeReturn(fixture.inputs);
    assertEquals(r.diagnostics, []);
    const p = normalizeAllPending(r.pending),
      q = inputSchema.parse(p.form8995a),
      lines = calculateOneBusiness8995ALines(q);
    assertEquals(p.schedule_se.owner_instances instanceof Array, true);
    assertEquals((p.schedule_se.owner_instances as any[])[0].w2_ss_wages, 0);
    assertEquals(
      q.single_schedule_c_source?.joint_se_source?.wages[0].employee_ssn,
      "444556666",
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
    if (fixture.id.endsWith("phasein")) {
      assertEquals(lines.phaseIn, .54743);
      assertEquals(lines.line39, 30931);
      assertEquals(
        form8995aPdf.projectFields!(p.form8995a, p).line24,
        "54.743",
      );
    }
    if (fixture.id.endsWith("partial-above")) {
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
      "../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
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
Deno.test("joint WOTC native and PDF reject owned wage/credit/phase-in/source conflicts", () => {
  const fixture = fixtures[0], r = f1040_2025.executeReturn(fixture.inputs);
  assertEquals(r.diagnostics, []);
  const original = normalizeAllPending(r.pending);
  for (
    const mutate of [
      (p: any) => p.w2.w2s[0].employee_ssn = "111223333",
      (p: any) => p.w2.w2s[0].box1_wages += 1,
      (p: any) => p.general.spouse_ssn = "999887777",
      (p: any) => p.schedule_c.schedule_cs[0].proprietor_recipient = "S",
      (p: any) =>
        p.schedule_c.schedule_cs[0].qbi_wotc_filing_review.owner_ssn =
          "444556666",
      (p: any) => p.schedule_se.owner_instances[0].line13 += 1,
      (p: any) => p.f5884.f5884s[0].wage_records[0].qualified_wages += 1,
      (p: any) => p.form8995a.taxable_income += 1,
      (p: any) => p.f1040.line13_qbi_deduction += 1,
      (p: any) => p.f1040.line1a_wages += 1,
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
});

Deno.test("joint WOTC parent rejects conflicting actual filed primary and spouse identities", () => {
  const fixture = fixtures[0],
    r = f1040_2025.executeReturn(fixture.inputs),
    p = normalizeAllPending(r.pending);
  for (
    const filer of [{ ...fixture.filer, primarySSN: "999887777" }, {
      ...fixture.filer,
      spouse: { ...fixture.filer.spouse!, ssn: "999887777" },
    }]
  ) {
    assertThrows(() =>
      form8995a.build(inputSchema.parse(p.form8995a), { pending: p, filer })
    );
  }
});

Deno.test("joint WOTC public source rejects missing owner review or W2 owned by neither spouse", () => {
  for (
    const mutate of [
      (inputs: any) =>
        delete inputs.schedule_c[0].qbi_wotc_filing_review.owner_ssn,
      (inputs: any) => inputs.w2[0].employee_ssn = "999887777",
      (inputs: any) => inputs.schedule_c[0].proprietor_recipient = "S",
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
