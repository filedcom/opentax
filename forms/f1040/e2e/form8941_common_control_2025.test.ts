import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { registry } from "../2025/registry.ts";
import { buildMefBundle, buildMefXml } from "../2025/mef/builder.ts";
import { buildPending } from "../2025/mef/pending.ts";
import { buildPdfBytes } from "../2025/pdf/builder.ts";
import { form8941CommonControlInputs } from "../2025/pdf/review-8941-common-control.fixture.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { calculateForm8941 } from "../nodes/inputs/f8941/index.ts";
import {
  inputSchema as scheduleCSchema,
  projectScheduleCItems,
} from "../nodes/inputs/schedule_c/model.ts";

const dir = new URL(
  "../../../.state/research/2026-10-06-form8941-common-control/",
  import.meta.url,
).pathname;
const xsd = new URL(
  "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
const plan = buildExecutionPlan(registry);

Deno.test({
  name:
    "TY2025 Form8941 one proprietor, two actual controlled businesses: source through 1040, full XSD and IRS PDF",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const { expected, ...input } = form8941CommonControlInputs();
    const filer = extractFilerIdentity(input.general)!;
    const result = execute(plan, registry, input, {
      taxYear: 2025,
      formType: "f1040",
    });
    assertEquals(result.diagnostics, []);
    assertEquals(calculateForm8941(input.f8941), expected.lines);
    assertEquals(
      [
        expected.lines.line1,
        expected.lines.line2,
        expected.lines.line3,
        expected.lines.line4,
        expected.lines.line5,
        expected.lines.line13,
        expected.lines.line14,
        expected.lines.line16,
      ],
      [11, 9, 22000, 65800, 48033, 9, 7, 24017],
    );
    assertEquals(expected.shares, [14324, 9693]);
    assertEquals(
      result.pending.schedule_c.form8941_premium_reductions,
      [
        { business_reference: "SHOP-BUSINESS-1", credit_amount: 14324 },
        {
          business_reference: "SHOP-BUSINESS-1-SECOND",
          credit_amount: 9693,
        },
      ],
    );
    assertEquals(
      projectScheduleCItems(scheduleCSchema.parse(result.pending.schedule_c))
        .map((item) => item.line_14_employee_benefits),
      [24921, 16862],
    );
    assertEquals(result.pending.schedule1.line3_schedule_c, 118217);
    assertEquals(result.pending.schedule2.line4_se_tax, 16703);
    assertEquals(result.pending.f1040.line13_qbi_deduction, 18823);
    assertEquals(result.pending.f3800.form8941_applied_credit, 11475);
    assertEquals(result.pending.f1040.line20_nonrefundable_credits, 11475);
    const bundle = await buildMefBundle(buildPending(result.pending), {
      filer,
      attachments: [],
    });
    assertEquals((bundle.xml.match(/<IRS8941 /g) ?? []).length, 1);
    assertEquals((bundle.xml.match(/<IRS1040ScheduleC /g) ?? []).length, 2);
    assertStringIncludes(bundle.xml, "<SmllEmplrHIPIndivEmpldForCrCnt>11");
    await Deno.mkdir(dir, { recursive: true });
    const prefix = `${dir}same-owner-two-businesses`;
    await Deno.writeTextFile(
      prefix + ".json",
      JSON.stringify({ input, expected, pending: result.pending }, null, 2),
    );
    await Deno.writeTextFile(prefix + ".xml", bundle.xml);
    const valid = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, prefix + ".xml"],
      stderr: "piped",
    }).output();
    assertEquals(valid.code, 0, new TextDecoder().decode(valid.stderr));
    await Deno.writeFile(
      prefix + ".pdf",
      await buildPdfBytes(bundle.pending, filer, dir + "irs-pdf-cache", bundle),
    );
    const extracted = await new Deno.Command("pdftotext", {
      args: ["-layout", prefix + ".pdf", "-"],
      stdout: "piped",
    }).output();
    assertEquals(extracted.code, 0);
    const packet = new TextDecoder().decode(extracted.stdout);
    await Deno.writeTextFile(prefix + ".txt", packet);
    assertStringIncludes(packet, "Jane Second Retail Shop");
    assertStringIncludes(packet, "24017");
    assertStringIncludes(packet, "24921");
    assertStringIncludes(packet, "16862");
  },
});

type Mutation = readonly [string, (source: any) => void];
const mutations: readonly Mutation[] = [
  ["second owner differs", (s) => {
    s.group_members[1].owner_ssn = "999887777";
  }],
  ["management review denied", (s) => {
    s.group_review.both_businesses_under_common_management_verified = false;
  }],
  ["group contribution schedule evidence missing", (s) => {
    delete s.group_review.group_contribution_schedule_record_reference;
  }],
  ["second member contribution schedule differs", (s) => {
    s.group_members[1].monthly_plan_arrangements[0]
      .employee_only_rule.employer_basis_points = 6500;
  }],
  ["second ownership evidence points at another proprietor", (s) => {
    s.member_control_records[1].proprietor_ssn = "999887777";
  }],
  ["second business EIN repeats first", (s) => {
    s.group_members[1].employment_ein = s.group_members[0].employment_ein;
  }],
  ["cross-business payroll record reused", (s) => {
    const reference = s.group_members[0].employees[0]
      .enrollment_and_payroll_record_reference;
    s.group_members[1].employees[0]
      .enrollment_and_payroll_record_reference = reference;
    s.group_members[1].shop_review.employee_premium_reviews[0]
      .enrollment_and_payroll_record_reference = reference;
  }],
  ["credited worker is another member's excluded family", (s) => {
    const ssn = s.group_members[0].excluded_workers[1].employee_ssn;
    s.group_members[1].employees[1].employee_ssn = ssn;
    s.group_members[1].shop_review.employee_premium_reviews[1].employee_ssn =
      ssn;
    for (
      const review of s.group_members[1].shop_review
        .employee_premium_reviews[1].monthly_premiums
    ) {
      review.employee_ssn = ssn;
    }
  }],
  ["second member 121 service days duplicated", (s) => {
    const employee = s.group_members[1].employees[2];
    employee.seasonal_service.service_dates[120] =
      employee.seasonal_service.service_dates[119];
    s.group_members[1].shop_review.employee_premium_reviews[2]
      .seasonal_service.service_dates[120] =
        employee.seasonal_service.service_dates[119];
  }],
  ["group wage ceiling crossed", (s) => {
    s.group_members[1].employees[1].social_security_medicare_wages = 800000;
    s.group_members[1].shop_review.employee_premium_reviews[1]
      .payroll_social_security_medicare_wages = 800000;
  }],
  ["excluded paid coverage leaked to second ordinary benefits", (s) => {
    s.group_members[1].other_schedule_c_employee_benefits = 300;
  }],
];

Deno.test({
  name:
    "TY2025 Form8941 common-control source and direct native/PDF conflicts reject",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const { expected: _expected, ...input } = form8941CommonControlInputs();
    const filer = extractFilerIdentity(input.general)!;
    const result = execute(plan, registry, input, {
      taxYear: 2025,
      formType: "f1040",
    });
    assertEquals(result.diagnostics, []);
    const bundle = await buildMefBundle(buildPending(result.pending), {
      filer,
      attachments: [],
    });
    for (const [name, mutate] of mutations) {
      const badInput = structuredClone(input);
      mutate(badInput.f8941);
      assertThrows(
        () => calculateForm8941(badInput.f8941),
        Error,
        undefined,
        name,
      );
      const invalid = execute(plan, registry, badInput, {
        taxYear: 2025,
        formType: "f1040",
      });
      assertEquals(invalid.diagnostics.length > 0, true, name);
      const changed = structuredClone(bundle.pending);
      mutate(changed.f8941);
      assertThrows(
        () => buildMefXml(buildPending(changed), filer),
        Error,
        undefined,
        name,
      );
      await assertRejects(() =>
        buildPdfBytes(changed, filer, dir + "negative-cache", {
          ...bundle,
          pending: changed,
        })
      );
    }
    const badShare = structuredClone(bundle.pending);
    (badShare.schedule_c as any).form8941_premium_reductions[1]
      .credit_amount++;
    assertThrows(() => buildMefXml(buildPending(badShare), filer));
    await assertRejects(() =>
      buildPdfBytes(badShare, filer, dir + "negative-cache", {
        ...bundle,
        pending: badShare,
      })
    );
    const badWages = structuredClone(bundle.pending);
    (badWages.schedule_c as any).schedule_cs[1].line_26_wages++;
    assertThrows(() => buildMefXml(buildPending(badWages), filer));
    await assertRejects(() =>
      buildPdfBytes(badWages, filer, dir + "negative-cache", {
        ...bundle,
        pending: badWages,
      })
    );
  },
});
