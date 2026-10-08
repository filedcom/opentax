import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { registry } from "../../../../2025/registry.ts";
import { buildMefBundle, buildMefXml } from "../../../../2025/mef/builder.ts";
import { buildPending } from "../../../../2025/mef/execution/pending.ts";
import { buildPdfBytes } from "../../../../2025/pdf/builder.ts";
import { form8941MixedThreeInputs } from "../../../../2025/pdf/reviews/general/composed-returns/review-8941-mixed-three.fixture.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import {
  calculateForm8941,
  commonControlForm8941Shares,
} from "../../../../nodes/inputs/credits/health/f8941/index.ts";
import {
  inputSchema as cSchema,
  projectScheduleCItems,
} from "../../../../nodes/inputs/income/business/schedule_c/model.ts";
import {
  inputSchema as fSchema,
  projectScheduleFItems,
} from "../../../../nodes/intermediate/forms/income/business/schedule_f/model.ts";

const dir = new URL(
  "../../../../../../.state/research/2026-10-06-form8941-mixed-three/",
  import.meta.url,
).pathname;
const xsd = new URL(
  "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
const plan = buildExecutionPlan(registry);

for (
  const [name, agriculture, first, second, current] of [
    ["full", 180000, 210000, 180000, 26735],
    ["partial", 170000, 210000, 180000, 25940],
    ["zero", 85000, 145000, 140000, 0],
  ] as const
) {
  Deno.test({
    name:
      `TY2025 two retail and one farm controlled SHOP ${name} current use: actual sources, XSD, all PDF pages`,
    sanitizeResources: false,
    sanitizeOps: false,
    async fn() {
      const input = form8941MixedThreeInputs(agriculture, first, second);
      const group = commonControlForm8941Shares(input.f8941);
      assertEquals([
        group.lines.line1,
        group.lines.line2,
        group.lines.line4,
        group.lines.line16,
      ], [16, 13, 92355, 26735]);
      assertEquals(group.memberPremiums, [39245, 26555, 26555]);
      assertEquals(group.shares, [11361, 7687, 7687]);
      const result = execute(plan, registry, input, {
        taxYear: 2025,
        formType: "f1040",
      });
      assertEquals(result.diagnostics, []);
      const p = result.pending;
      assertEquals(
        (p.schedule_c.form8941_premium_reductions as {
          credit_amount: number;
        }[]).map((row) => row.credit_amount),
        [11361, 7687],
      );
      assertEquals(p.schedule_f.form8941_premium_reductions, [{
        farm_id: "SHOP-Controlled-Farm",
        credit_amount: 7687,
      }]);
      assertEquals(
        projectScheduleCItems(cSchema.parse(p.schedule_c)).map((row) =>
          row.line_14_employee_benefits
        ),
        [27884, 18868],
      );
      assertEquals(
        projectScheduleFItems(fSchema.parse(p.schedule_f))[0]
          .line15_employee_benefits,
        19868,
      );
      assertEquals(
        (p.form8995.multi_business_filing_rows as unknown[]).length,
        3,
      );
      assertEquals(p.f3800.form8941_applied_credit, current);
      assertEquals(p.f1040.line20_nonrefundable_credits, current);
      const filer = extractFilerIdentity(input.general)!;
      const bundle = await buildMefBundle(buildPending(p), {
        filer,
        attachments: [],
      });
      assertEquals((bundle.xml.match(/<IRS8941 /g) ?? []).length, 1);
      assertEquals((bundle.xml.match(/<IRS1040ScheduleC /g) ?? []).length, 2);
      assertEquals((bundle.xml.match(/<IRS1040ScheduleF /g) ?? []).length, 1);
      assertStringIncludes(
        bundle.xml,
        "<SumSmllrAmtAndCreditForHIPAmt>26735</SumSmllrAmtAndCreditForHIPAmt>",
      );
      await Deno.mkdir(dir, { recursive: true });
      const prefix = dir + `two-c-one-f-${name}`;
      await Deno.writeTextFile(
        prefix + ".json",
        JSON.stringify({ input, group, pending: p }, null, 2),
      );
      await Deno.writeTextFile(prefix + ".xml", bundle.xml);
      const valid = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", xsd, prefix + ".xml"],
        stderr: "piped",
      }).output();
      assertEquals(valid.code, 0, new TextDecoder().decode(valid.stderr));
      await Deno.writeFile(
        prefix + ".pdf",
        await buildPdfBytes(
          bundle.pending,
          filer,
          dir + "irs-pdf-cache",
          bundle,
        ),
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
          "Jane Second Retail Shop",
          "Owned source farm",
          "26735",
          "27884",
          "18868",
          "19868",
        ]
      ) assertStringIncludes(packet, value);
    },
  });
}

Deno.test({
  name:
    "TY2025 mixed C/C/F SHOP rejects shared-worker, ownership, payroll, receipts, allocation and direct native/PDF conflicts",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const input = form8941MixedThreeInputs();
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
    const sourceMutations: readonly [string, (source: any) => void][] = [
      [
        "third ownership record",
        (s) => s.member_control_records[2].proprietor_ssn = "999887777",
      ],
      [
        "third management evidence",
        (s) =>
          s.group_review.all_businesses_under_common_management_verified =
            false,
      ],
      [
        "third farm payroll identity",
        (s) => s.group_members[2].employees[0].employee_ssn = "999887777",
      ],
      ["third payroll ref reused", (s) => {
        const ref = s.group_members[0].employees[0]
          .enrollment_and_payroll_record_reference;
        s.group_members[2].employees[0]
          .enrollment_and_payroll_record_reference = ref;
        s.group_members[2].shop_review.employee_premium_reviews[0]
          .enrollment_and_payroll_record_reference = ref;
      }],
      [
        "shared worker paid twice",
        (s) =>
          s.group_members[2].shop_review.employee_premium_reviews[0]
            .monthly_premiums.push(
              structuredClone(
                s.group_members[0].shop_review.employee_premium_reviews[0]
                  .monthly_premiums[0],
              ),
            ),
      ],
      ["third wage ceiling", (s) => {
        s.group_members[2].employees[1].social_security_medicare_wages = 800000;
        s.group_members[2].shop_review.employee_premium_reviews[1]
          .payroll_social_security_medicare_wages = 800000;
      }],
    ];
    for (const [name, mutate] of sourceMutations) {
      const source = structuredClone(input.f8941);
      mutate(source);
      assertThrows(() => calculateForm8941(source), Error, undefined, name);
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
    const filedMutations: readonly [string, (p: any) => void][] = [
      ["second C wages", (p) => p.schedule_c.schedule_cs[1].line_26_wages++],
      [
        "second C full reduction",
        (p) => p.schedule_c.form8941_premium_reductions[1].credit_amount++,
      ],
      ["farm EIN", (p) => p.schedule_f.schedule_fs[0].line_d_ein = "999999999"],
      [
        "farm W2 shared hours",
        (p) =>
          p.schedule_f.schedule_fs[0].shop_employee_w2_records[0]
            .hours_of_service++,
      ],
      ["farm issued 1099G", (p) => p.f1099g.f1099gs[0].box_7_agriculture++],
      [
        "farm issued 1099NEC",
        (p) => p.f1099nec.f1099necs[0].source_document_reference = "Wrong",
      ],
      [
        "farm full reduction",
        (p) => p.schedule_f.form8941_premium_reductions[0].credit_amount++,
      ],
      [
        "third SE allocation",
        (p) =>
          p.schedule_f.schedule_fs[0].qbi_se_tax_allocation_review
            .deduction_amount++,
      ],
      [
        "Form3800 third reference",
        (p) =>
          p.f3800.f8941_direct_employer_credit.group_business_references[2] =
            "Wrong",
      ],
    ];
    for (const [name, mutate] of filedMutations) {
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
