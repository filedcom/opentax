import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";
import { f1040_2025 } from "../../../index.ts";
import { normalizeAllPending } from "../../execution/pending.ts";
import {
  calculateForm5884,
  inputSchema as wotcSchema,
} from "../../../../nodes/inputs/f5884/index.ts";
import {
  calculateOwnedWotcBusinesses,
  inputSchema as qbiSchema,
} from "../../../../nodes/intermediate/forms/form8995a/index.ts";
import { form8995a } from "../../../mef/forms/business/f8995a/f8995a.ts";
import { form8995aPdf } from "../../../pdf/forms/business/f8995a.ts";
const fixtures = pdfReviewFixtures.filter((f) =>
  f.id.startsWith("joint-controlled-wotc-")
);

Deno.test("actual joint common-control sources cap shared people once and reconcile filed group/QBI/current tax use", async () => {
  for (const fixture of fixtures) {
    const result = f1040_2025.executeReturn(fixture.inputs);
    assertEquals(result.diagnostics, []);
    const p = normalizeAllPending(result.pending),
      source = wotcSchema.parse(p.f5884),
      credit = calculateForm5884(source),
      q = qbiSchema.parse(p.form8995a),
      calc = calculateOwnedWotcBusinesses(q);
    assertEquals(
      credit.groupCredit,
      fixture.id.endsWith("partial-above") ? 192000 : 2400,
    );
    assertEquals(credit.line2, credit.groupCredit);
    assertEquals(
      credit.line1bWages,
      fixture.id.endsWith("partial-above") ? 480000 : 6000,
    );
    assertEquals(
      credit.controlledGroupShares.reduce((a, r) => a + r.credit_share, 0),
      credit.groupCredit,
    );
    assertEquals(
      credit.wageDeductionAllocations.reduce((a, r) => a + r.credit_amount, 0),
      credit.line2,
    );
    assertEquals(
      q.wotc_business_sources!.map((r) => r.business.wotc_wage_reduction),
      credit.controlledGroupShares.map((r) => r.credit_share),
    );
    assertEquals(p.f1040.line13_qbi_deduction, calc.parent.line39);
    assertEquals((p.f3800.f5884_credit as any).credit_amount, credit.line2);
    assertEquals((p.schedule_se.owner_instances as any[]).length, 2);
    const spouse = (p.schedule_se.owner_instances as any[]).find((r: any) =>
      r.recipient === "S"
    );
    assertEquals(spouse.w2_ss_wages, 0);
    if (fixture.id.endsWith("fractional-phasein")) {
      assertEquals(credit.controlledGroupShares.map((r) => r.credit_share), [
        1371,
        1029,
      ]);
      assertEquals(
        (fixture.inputs.schedule_c as any[]).map((r) => r.line_26_wages),
        [4000.49, 3000.52],
      );
      assertEquals(
        credit.controlledGroupShares[0].qualified_wages,
        6000 * 4000.49 / 7001.01,
      );
      assertEquals(p.f1040.line13_qbi_deduction, 21137);
      assertEquals(p.f1040.line24_total_tax, 130972);
    } else if (fixture.id.endsWith("partial-above")) {
      assertEquals(p.f3800.allowed_credit, 118264);
      assertEquals(credit.line2 - Number(p.f3800.allowed_credit), 73736);
      assertEquals(p.f1040.line13_qbi_deduction, 83059);
      assertEquals(p.f1040.line24_total_tax, 68535);
      assertEquals(
        q.wotc_business_sources!.map((r) => r.business.wotc_wage_reduction),
        [96000, 96000],
      );
    } else {
      assertEquals(p.f1040.line13_qbi_deduction, 25716);
      assertEquals(p.f1040.line24_total_tax, 127481);
    }
    const prepared = await f1040_2025.prepareReturn(
      result.pending,
      fixture.filer,
    );
    assertStringIncludes(
      prepared.bundle.xml,
      "<ControlledGroupMemberStatement ",
    );
    assertStringIncludes(prepared.bundle.xml, "<DeductionDifferentiationStmt ");
    assertStringIncludes(
      prepared.bundle.xml,
      "filed member EINs 123456789, 987654321",
    );
    const proc = new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        new URL(
          "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
          import.meta.url,
        ).pathname,
        "-",
      ],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const writer = proc.stdin.getWriter();
    await writer.write(new TextEncoder().encode(prepared.bundle.xml));
    await writer.close();
    const out = await proc.output();
    assertEquals(out.code, 0, new TextDecoder().decode(out.stderr));
    assertEquals((await prepared.renderPdf()).length > 0, true);
  }
});

Deno.test("group shared person identity retains distinct employer certificates/payroll and rejects contradictory public sources", () => {
  const fixture = fixtures.find((f) =>
    f.id.endsWith("phasein") && !f.id.includes("fractional")
  )!;
  const mutations: ((s: any) => void)[] = [
    (s) => delete s.f5884.controlled_group.joint_filed_members_review,
    (s) =>
      s.f5884.controlled_group.joint_filed_members_review.members[1]
        .other_spouse_management_participation_confirmed = false,
    (s) =>
      s.f5884.controlled_group.joint_filed_members_review.members[1]
        .direct_owner_percent = 50,
    (s) =>
      s.f5884.controlled_group.joint_filed_members_review.members[1]
        .proprietor_ssn = "111223333",
    (s) =>
      s.f5884.controlled_group.joint_filed_members_review.members[1].ein =
        "123456789",
    (s) =>
      s.f5884.controlled_group.joint_filed_members_review
        .common_control_confirmed = false,
    (s) => delete s.f5884.f5884s[1].group_employee_identity_review,
    (s) =>
      s.f5884.f5884s[1].group_employee_identity_review
        .employee_identity_source_reference = "Different person identity",
    (s) =>
      s.f5884.f5884s[1].certification.swa_certification_reference =
        s.f5884.f5884s[0].certification.swa_certification_reference,
    (s) =>
      s.f5884.f5884s[1].wage_records[0].payroll_record_reference =
        s.f5884.f5884s[0].wage_records[0].payroll_record_reference,
    (s) => s.f5884.f5884s[1].employer_ein = "123456789",
    (s) => s.f5884.f5884s[1].direct_employer_review.proprietor_recipient = "T",
    (s) =>
      s.f5884.f5884s[1].group_employee_identity_review.group_first_workday_on =
        "2024-01-01",
  ];
  for (const change of mutations) {
    const inputs = structuredClone(fixture.inputs);
    change(inputs);
    const result = f1040_2025.executeReturn(inputs);
    if (!result.diagnostics.some((r) => r.severity === "error")) {
      const p = normalizeAllPending(result.pending);
      assertThrows(() => form8995a.build(p.form8995a as any, { pending: p }));
      assertThrows(() => form8995aPdf.projectFields!(p.form8995a, p));
    }
  }
});

Deno.test("group native and PDF joins reject filed member, payroll, reductions, owner, current-credit and parent tampering", () => {
  const fixture = fixtures[0],
    p = normalizeAllPending(f1040_2025.executeReturn(fixture.inputs).pending);
  const mutations: ((p: any) => void)[] = [
    (p) => p.f5884.controlled_group.joint_filed_members_review.members.pop(),
    (p) =>
      p.f5884.controlled_group.joint_filed_members_review.members[1]
        .business_reference = "Wrong business",
    (p) => p.f5884.controlled_group.members[1].ein = "555555555",
    (p) =>
      p.f5884.controlled_group.members[1].business_name =
        "Conflicting Employer",
    (p) =>
      p.f5884.f5884s[1].direct_employer_review.proprietor_ssn = "111223333",
    (p) => p.f5884.f5884s[1].wage_records[0].qualified_wages++,
    (p) => p.schedule_c.wotc_wage_reductions[1].credit_amount++,
    (p) => p.schedule_c.schedule_cs[1].proprietor_recipient = "T",
    (p) => p.schedule_se.owner_instances[1].line13++,
    (p) => (p.f3800.f5884_credit as any).credit_amount++,
    (p) => p.f1040.line13_qbi_deduction++,
    (p) => p.w2.w2s[0].employer_ein = "98-7654321",
    (p) => p.form8995a.wotc_business_sources[1].business.wotc_wage_reduction++,
  ];
  for (const change of mutations) {
    const copy = structuredClone(p);
    change(copy);
    assertThrows(() =>
      form8995a.build(copy.form8995a as any, { pending: copy })
    );
    assertThrows(() => form8995aPdf.projectFields!(copy.form8995a, copy));
  }
});

Deno.test("shared group hours determine minimum and rate once, while employer source copies remain distinct", () => {
  const fixture = fixtures[0];
  for (
    const [hours, credit] of [[[60, 60], 1500], [[100, 300], 2400], [
      [40, 70],
      0,
    ]] as const
  ) {
    const input = wotcSchema.parse(fixture.inputs.f5884);
    input.f5884s.forEach((e, i) => e.hours_worked = hours[i]);
    const lines = calculateForm5884(wotcSchema.parse(input));
    assertEquals(lines.line2, credit);
    assertEquals(lines.controlledGroupShares.map((r) => r.credit_share), [
      credit / 2,
      credit / 2,
    ]);
  }
  const pending = normalizeAllPending(
    f1040_2025.executeReturn(fixture.inputs).pending,
  ) as any;
  pending.schedule_c.schedule_cs[1].qbi_wotc_filing_review
    .employee_w2_records[0].source_document_reference =
      pending.schedule_c.schedule_cs[0].qbi_wotc_filing_review
        .employee_w2_records[0].source_document_reference;
  assertThrows(() => form8995a.build(pending.form8995a, { pending }));
  assertThrows(() => form8995aPdf.projectFields!(pending.form8995a, pending));
});
