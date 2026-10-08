import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { execute } from "../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { registry } from "../../../2025/registry.ts";
import { buildMefBundle, buildMefXml } from "../../../2025/mef/builder.ts";
import { buildPending } from "../../../2025/mef/execution/pending.ts";
import { buildPdfBytes } from "../../../2025/pdf/builder.ts";
import { form8941MixedCfInputs } from "../../../2025/pdf/reviews/composed/review-8941-mixed-cf.fixture.ts";
import { extractFilerIdentity } from "../../../mef/filer.ts";
import {
  calculateForm8941,
  commonControlForm8941Shares,
} from "../../../nodes/inputs/f8941/index.ts";
import {
  inputSchema as cSchema,
  projectScheduleCItems,
} from "../../../nodes/inputs/schedule_c/model.ts";
import {
  inputSchema as fSchema,
  projectScheduleFItems,
} from "../../../nodes/intermediate/forms/schedule_f/model.ts";

const dir = new URL(
  "../../../../../.state/research/2026-10-06-form8941-mixed-cf/",
  import.meta.url,
).pathname;
const xsd = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
const plan = buildExecutionPlan(registry);

Deno.test({
  name:
    "TY2025 controlled Schedule C and cash Schedule F SHOP: actual group, deductions, partial credit, full XSD/PDF",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const input = form8941MixedCfInputs();
    const group = commonControlForm8941Shares(input.f8941);
    assertEquals(group.memberPremiums, [39245, 26555]);
    assertEquals(group.shares, [14324, 9693]);
    const lines = calculateForm8941(input.f8941);
    assertEquals([lines.line1, lines.line2, lines.line4, lines.line16], [
      11,
      9,
      65800,
      24017,
    ]);
    const result = execute(plan, registry, input, {
      taxYear: 2025,
      formType: "f1040",
    });
    assertEquals(result.diagnostics, []);
    const p = result.pending;
    assertEquals(p.schedule_c.form8941_premium_reductions, [{
      business_reference: "SHOP-BUSINESS-1",
      credit_amount: 14324,
    }]);
    assertEquals(p.schedule_f.form8941_premium_reductions, [{
      farm_id: "SHOP-Controlled-Farm",
      credit_amount: 9693,
    }]);
    assertEquals(
      projectScheduleCItems(cSchema.parse(p.schedule_c))[0]
        .line_14_employee_benefits,
      24921,
    );
    assertEquals(
      projectScheduleFItems(fSchema.parse(p.schedule_f))[0]
        .line15_employee_benefits,
      17862,
    );
    assertEquals([
      p.schedule_se.net_profit_schedule_c,
      p.schedule_se.net_profit_schedule_f,
    ], [70079, 92138]);
    assertEquals(
      (p.form8995.multi_business_filing_rows as { qbi: number }[]).map((r) =>
        r.qbi
      ),
      [65128, 85629],
    );
    assertEquals(p.f1040.line13_qbi_deduction, 27001);
    assertEquals([
      (p.f3800.f8941_direct_employer_credit as { credit_amount: number })
        .credit_amount,
      p.f3800.form8941_applied_credit,
    ], [24017, 18768]);
    const filer = extractFilerIdentity(input.general)!;
    const bundle = await buildMefBundle(buildPending(p), {
      filer,
      attachments: [],
    });
    assertEquals((bundle.xml.match(/<IRS8941 /g) ?? []).length, 1);
    assertEquals((bundle.xml.match(/<IRS1040ScheduleC /g) ?? []).length, 1);
    assertEquals((bundle.xml.match(/<IRS1040ScheduleF /g) ?? []).length, 1);
    assertStringIncludes(
      bundle.xml,
      "<SumSmllrAmtAndCreditForHIPAmt>24017</SumSmllrAmtAndCreditForHIPAmt>",
    );
    await Deno.mkdir(dir, { recursive: true });
    const prefix = dir + "same-owner-c-f-partial-use";
    await Deno.writeTextFile(
      prefix + ".json",
      JSON.stringify({ input, group, lines, pending: p }, null, 2),
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
    const extraction = await new Deno.Command("pdftotext", {
      args: ["-layout", prefix + ".pdf", "-"],
      stdout: "piped",
    }).output();
    assertEquals(extraction.code, 0);
    const packet = new TextDecoder().decode(extraction.stdout);
    await Deno.writeTextFile(prefix + ".txt", packet);
    for (
      const value of [
        "Jane Retail Shop",
        "Owned source farm",
        "24017",
        "24921",
        "17862",
        "65128",
        "85629",
      ]
    ) assertStringIncludes(packet, value);
  },
});

Deno.test({
  name: "TY2025 mixed C/F SHOP source and direct native/PDF conflicts reject",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const input = form8941MixedCfInputs();
    const result = execute(plan, registry, input, {
      taxYear: 2025,
      formType: "f1040",
    });
    assertEquals(result.diagnostics, []);
    const filer = extractFilerIdentity(input.general)!;
    const bundle = await buildMefBundle(buildPending(result.pending), {
      filer,
      attachments: [],
    });
    const sourceMutations: readonly [string, (s: any) => void][] = [
      [
        "owner attribution",
        (s) => s.member_control_records[1].proprietor_ssn = "999887777",
      ],
      [
        "management evidence",
        (s) =>
          s.group_review.both_businesses_under_common_management_verified =
            false,
      ],
      [
        "farm ownership evidence",
        (s) => s.group_members[1].farm_ownership_source_reference = "",
      ],
      [
        "shared worker double paid",
        (s) =>
          s.group_members[1].shop_review.employee_premium_reviews[0]
            .monthly_premiums.push(
              structuredClone(
                s.group_members[0].shop_review.employee_premium_reviews[0]
                  .monthly_premiums[0],
              ),
            ),
      ],
      ["wage ceiling", (s) => {
        s.group_members[1].employees[1].social_security_medicare_wages = 800000;
        s.group_members[1].shop_review.employee_premium_reviews[1]
          .payroll_social_security_medicare_wages = 800000;
      }],
      ["payroll reference reused", (s) => {
        const ref = s.group_members[0].employees[0]
          .enrollment_and_payroll_record_reference;
        s.group_members[1].employees[0]
          .enrollment_and_payroll_record_reference = ref;
        s.group_members[1].shop_review.employee_premium_reviews[0]
          .enrollment_and_payroll_record_reference = ref;
      }],
    ];
    for (const [name, mutate] of sourceMutations) {
      const bad = structuredClone(input.f8941);
      mutate(bad);
      assertThrows(() => calculateForm8941(bad), Error, undefined, name);
      const pending = structuredClone(bundle.pending);
      mutate(pending.f8941);
      assertThrows(
        () => buildMefXml(buildPending(pending), filer),
        Error,
        undefined,
        name,
      );
      await assertRejects(
        () =>
          buildPdfBytes(pending, filer, dir + "negative-cache", {
            ...bundle,
            pending,
          }),
        Error,
        undefined,
        name,
      );
    }
    const pendingMutations: readonly [string, (p: any) => void][] = [
      ["farm EIN", (p) => p.schedule_f.schedule_fs[0].line_d_ein = "999999999"],
      [
        "farm W2 wage",
        (p) =>
          p.schedule_f.schedule_fs[0].shop_employee_w2_records[0]
            .social_security_medicare_wages++,
      ],
      ["issued 1099G", (p) => p.f1099g.f1099gs[0].box_7_agriculture++],
      [
        "issued 1099NEC",
        (p) => p.f1099nec.f1099necs[0].source_document_reference = "Wrong",
      ],
      [
        "C gross benefits",
        (p) => p.schedule_c.schedule_cs[0].line_14_employee_benefits++,
      ],
      [
        "F gross benefits",
        (p) => p.schedule_f.schedule_fs[0].line15_employee_benefits++,
      ],
      [
        "C full credit share",
        (p) => p.schedule_c.form8941_premium_reductions[0].credit_amount++,
      ],
      [
        "F full credit share",
        (p) => p.schedule_f.form8941_premium_reductions[0].credit_amount++,
      ],
      [
        "QBI SE allocation",
        (p) =>
          p.schedule_f.schedule_fs[0].qbi_se_tax_allocation_review
            .deduction_amount++,
      ],
      [
        "Form3800 group identity",
        (p) =>
          p.f3800.f8941_direct_employer_credit.group_business_references[1] =
            "Wrong",
      ],
    ];
    for (const [name, mutate] of pendingMutations) {
      const pending = structuredClone(bundle.pending);
      mutate(pending);
      assertThrows(
        () => buildMefXml(buildPending(pending), filer),
        Error,
        undefined,
        name,
      );
      await assertRejects(
        () =>
          buildPdfBytes(pending, filer, dir + "negative-cache", {
            ...bundle,
            pending,
          }),
        Error,
        undefined,
        name,
      );
    }
  },
});

Deno.test("mixed C/F SHOP QBI uses actual sourced senior deduction in its income cap", async () => {
  const base = form8941MixedCfInputs();
  const input = {
    ...base,
    general: {
      ...base.general,
      taxpayer_dob: "1930-01-01",
      taxpayer_ssn_valid_for_employment: true,
      taxpayer_ssn_issued_before_due_date: true,
      taxpayer_tin_issued_by_due_date: true,
    },
    schedule1a: {
      senior_zero_exclusions_review: {
        no_section933_puerto_rico_excluded_income: true,
        section933_review_source_reference: "2025 reviewed domestic C/F income",
        no_form2555_filed: true,
        form2555_review_source_reference:
          "2025 reviewed no foreign earned income",
        no_form4563_filed: true,
        form4563_review_source_reference: "2025 reviewed no Samoa income",
      },
    },
  };
  const result = execute(plan, registry, input, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  const p = result.pending;
  assertEquals(p.f1040.line11_agi, 150757);
  assertEquals(p.f1040.line12c_deduction_total, 17750);
  // Senior phaseout is6% of75757 excessMAGI:4545 rounded reduction.
  assertEquals(p.f1040.line13b_additional_deductions, 1455);
  assertEquals(p.form8995.line11, 131552);
  assertEquals(p.f1040.line13_qbi_deduction, 26310);
  const filer = extractFilerIdentity(input.general)!;
  const bundle = await buildMefBundle(buildPending(p), {
    filer,
    attachments: [],
  });
  const prefix = dir + "same-owner-c-f-senior-income-cap";
  await Deno.mkdir(dir, { recursive: true });
  await Deno.writeTextFile(
    prefix + ".json",
    JSON.stringify({ input, pending: p }, null, 2),
  );
  await Deno.writeTextFile(prefix + ".xml", bundle.xml);
  const x = await new Deno.Command("xmllint", {
    args: ["--noout", "--schema", xsd, prefix + ".xml"],
    stderr: "piped",
  }).output();
  assertEquals(x.code, 0, new TextDecoder().decode(x.stderr));
  await Deno.writeFile(
    prefix + ".pdf",
    await buildPdfBytes(bundle.pending, filer, dir + "irs-pdf-cache", bundle),
  );
  for (
    const q of [
      { ...p, f1040: { ...p.f1040, line13b_additional_deductions: 1456 } },
      { ...p, schedule1a: undefined },
    ]
  ) {
    await assertRejects(() =>
      buildMefBundle(buildPending(q), { filer, attachments: [] })
    );
    await assertRejects(() => buildPdfBytes(q as typeof p, filer));
  }
});
