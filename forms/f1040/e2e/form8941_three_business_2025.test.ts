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
import { form8941ThreeBusinessInputs } from "../2025/pdf/review-8941-three-business.fixture.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import {
  calculateForm8941,
  commonControlForm8941Shares,
} from "../nodes/inputs/f8941/index.ts";
import {
  inputSchema as scheduleCSchema,
  projectScheduleCItems,
} from "../nodes/inputs/schedule_c/model.ts";
import { inputSchema as form3800Schema } from "../nodes/inputs/f3800/index.ts";

const dir = new URL(
  "../../../.state/research/2026-10-06-form8941-three-business/",
  import.meta.url,
).pathname;
const xsd = new URL(
  "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
const plan = buildExecutionPlan(registry);

async function packet(thirdReceipts: number, name: string) {
  const { expected, paidThird: _paidThird, ...input } =
    form8941ThreeBusinessInputs(thirdReceipts);
  const filer = extractFilerIdentity(input.general)!;
  const result = execute(plan, registry, input, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  assertEquals(calculateForm8941(input.f8941), expected.lines);
  assertEquals(
    commonControlForm8941Shares(input.f8941).shares,
    expected.shares,
  );
  assertEquals(
    result.pending.schedule_c.form8941_premium_reductions,
    input.schedule_c.map((business, index) => ({
      business_reference: business.business_reference,
      credit_amount: expected.shares[index],
    })),
  );
  assertEquals(
    projectScheduleCItems(scheduleCSchema.parse(result.pending.schedule_c))
      .map((business) => business.line_14_employee_benefits),
    input.schedule_c.map((business, index) =>
      business.line_14_employee_benefits - expected.shares[index]
    ),
  );
  const form3800 = form3800Schema.parse(result.pending.f3800);
  assertEquals(
    form3800.f8941_direct_employer_credit?.credit_amount,
    expected.lines.line16,
  );
  assertEquals(
    form3800.f8941_direct_employer_credit?.group_business_references,
    input.schedule_c.map((business) => business.business_reference),
  );
  assertEquals(
    result.pending.f1040.form8941_determined_credit,
    expected.lines.line16,
  );
  const bundle = await buildMefBundle(buildPending(result.pending), {
    filer,
    attachments: [],
  });
  assertEquals((bundle.xml.match(/<IRS8941 /g) ?? []).length, 1);
  assertEquals((bundle.xml.match(/<IRS1040ScheduleC /g) ?? []).length, 3);
  assertStringIncludes(
    bundle.xml,
    "<SmllEmplrHIPIndivEmpldForCrCnt>16</SmllEmplrHIPIndivEmpldForCrCnt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<SmllEmplrHIPFTEEmplForTaxYrCnt>13</SmllEmplrHIPFTEEmplForTaxYrCnt>",
  );
  assertEquals((bundle.xml.match(/<Form8941CYCreditsGrp /g) ?? []).length, 1);
  await Deno.mkdir(dir, { recursive: true });
  const prefix = dir + name;
  await Deno.writeTextFile(
    prefix + ".json",
    JSON.stringify({ input, expected, pending: result.pending }, null, 2),
  );
  await Deno.writeTextFile(prefix + ".xml", bundle.xml);
  const validation = await new Deno.Command("xmllint", {
    args: ["--noout", "--schema", xsd, prefix + ".xml"],
    stderr: "piped",
  }).output();
  assertEquals(validation.code, 0, new TextDecoder().decode(validation.stderr));
  await Deno.writeFile(
    prefix + ".pdf",
    await buildPdfBytes(bundle.pending, filer, dir + "irs-pdf-cache", bundle),
  );
  const extracted = await new Deno.Command("pdftotext", {
    args: ["-layout", prefix + ".pdf", "-"],
    stdout: "piped",
  }).output();
  assertEquals(extracted.code, 0);
  const text = new TextDecoder().decode(extracted.stdout);
  await Deno.writeTextFile(prefix + ".txt", text);
  assertStringIncludes(text, "Jane Third Retail Shop");
  assertStringIncludes(text, String(expected.lines.line16));
  assertStringIncludes(
    text,
    String(expected.memberPremiums[2] - expected.shares[2]),
  );
  return { input, expected, filer, result, bundle, form3800 };
}

Deno.test({
  name:
    "2025 three real same-owner SHOP businesses aggregate one 8941, cap shared worker and reduce each Schedule C before current use",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const { input, expected, form3800 } = await packet(
      150000,
      "same-owner-three-businesses-partial",
    );
    assertEquals([
      expected.lines.line1,
      expected.lines.line2,
      expected.lines.line3,
      expected.lines.line4,
      expected.lines.line5,
      expected.lines.line16,
    ], [16, 13, 24000, 92355, 66837, 26735]);
    assertEquals(expected.shares, [11361, 7687, 7687]);
    assertEquals(form3800.form8941_applied_credit, 13301);
    const unique = structuredClone(input.f8941);
    const repeated = unique.group_members[2].employees[0].employee_ssn;
    unique.group_members[2] = JSON.parse(
      JSON.stringify(unique.group_members[2])
        .replaceAll(repeated, "999991111"),
    );
    const independentlyCounted = calculateForm8941(unique);
    assertEquals([independentlyCounted.line1, independentlyCounted.line2], [
      17,
      14,
    ]);
  },
});

Deno.test({
  name:
    "2025 three-business group full current use keeps one native and PDF 8941",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const { expected, form3800, result } = await packet(
      240000,
      "same-owner-three-businesses-full",
    );
    assertEquals(form3800.form8941_applied_credit, expected.lines.line16);
    assertEquals(
      result.pending.f1040.line20_nonrefundable_credits,
      expected.lines.line16,
    );
  },
});

type Mutation = readonly [string, (source: any) => void];
const mutations: readonly Mutation[] = [
  ["third member omitted", (s) => {
    s.group_members.pop();
  }],
  ["third control record omitted", (s) => {
    s.member_control_records.pop();
  }],
  ["three-management review absent", (s) => {
    delete s.group_review.all_businesses_under_common_management_verified;
  }],
  ["third owner differs", (s) => {
    s.member_control_records[2].proprietor_ssn = "999887777";
  }],
  ["third EIN repeats", (s) => {
    s.group_members[2].employment_ein = s.group_members[0].employment_ein;
  }],
  ["third contribution schedule differs", (s) => {
    s.group_members[2].monthly_plan_arrangements[0].employee_only_rule
      .employer_basis_points = 6500;
  }],
  ["third payroll source reference reused", (s) => {
    s.group_members[2].payroll_ledger_reference =
      s.group_members[1].payroll_ledger_reference;
  }],
  ["third worker is excluded by first", (s) => {
    s.group_members[2].employees[1].employee_ssn =
      s.group_members[0].excluded_workers[1].employee_ssn;
  }],
  ["third seasonal service day duplicated", (s) => {
    s.group_members[2].employees[2].seasonal_service.service_dates[120] =
      s.group_members[2].employees[2].seasonal_service.service_dates[119];
  }],
  ["third excluded premium leaked to benefits", (s) => {
    s.group_members[2].other_schedule_c_employee_benefits = 300;
  }],
];

Deno.test({
  name:
    "2025 third business inventory, identity, coverage, payroll and native/PDF conflicts reject",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const { input, filer, bundle } = await packet(
      150000,
      "three-business-negative-base",
    );
    const paid = form8941ThreeBusinessInputs().paidThird;
    const doubleCoverage = structuredClone(input.f8941);
    doubleCoverage.group_members[2] = {
      ...paid,
      no_other_trades_or_common_control_verified: false,
    };
    assertThrows(
      () => calculateForm8941(doubleCoverage),
      Error,
      "paid coverage in multiple members",
    );
    for (const [name, mutate] of mutations) {
      const bad = structuredClone(input);
      mutate(bad.f8941);
      assertThrows(() => calculateForm8941(bad.f8941), Error, undefined, name);
      assertEquals(
        execute(plan, registry, bad, { taxYear: 2025, formType: "f1040" })
          .diagnostics.length > 0,
        true,
        name,
      );
      const native = structuredClone(bundle.pending);
      mutate(native.f8941);
      assertThrows(
        () => buildMefXml(buildPending(native), filer),
        Error,
        undefined,
        name,
      );
      await assertRejects(
        () =>
          buildPdfBytes(native, filer, dir + "negative-cache", {
            ...bundle,
            pending: native,
          }),
        Error,
        undefined,
        name,
      );
    }
    for (
      const [name, mutate] of [
        ["third reduction changed", (p: any) => {
          p.schedule_c.form8941_premium_reductions[2].credit_amount++;
        }],
        ["third payroll changed", (p: any) => {
          p.schedule_c.schedule_cs[2].line_26_wages++;
        }],
        ["third benefits changed", (p: any) => {
          p.schedule_c.schedule_cs[2].line_14_employee_benefits++;
        }],
        ["third Form3800 reference absent", (p: any) => {
          p.f3800.f8941_direct_employer_credit.group_business_references.pop();
        }],
      ] as const
    ) {
      const native: any = structuredClone(bundle.pending);
      mutate(native);
      assertThrows(
        () => buildMefXml(buildPending(native), filer),
        Error,
        undefined,
        name,
      );
      await assertRejects(
        () =>
          buildPdfBytes(native, filer, dir + "negative-cache", {
            ...bundle,
            pending: native,
          }),
        Error,
        undefined,
        name,
      );
    }
  },
});
