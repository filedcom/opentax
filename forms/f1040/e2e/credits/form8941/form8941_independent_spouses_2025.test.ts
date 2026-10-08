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
import { reconcileForm8941ScheduleC } from "../../../2025/mef/forms/credits/f8941_source.ts";
import { buildPdfBytes } from "../../../2025/pdf/builder.ts";
import { form8941IndependentSpouseInputs } from "../../../2025/pdf/reviews/composed/review-8941-independent-spouses.fixture.ts";
import { extractFilerIdentity } from "../../../mef/filer.ts";
import { independentSpouseForm8941 } from "../../../nodes/inputs/f8941/index.ts";
import { inputSchema as f3800Schema } from "../../../nodes/inputs/f3800/index.ts";
import {
  inputSchema as scheduleCSchema,
  projectScheduleCItems,
} from "../../../nodes/inputs/schedule_c/model.ts";

const dir = new URL(
  "../../../../../.state/research/2026-10-06-form8941-independent-spouses/",
  import.meta.url,
).pathname;
const xsd = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
const plan = buildExecutionPlan(registry);

Deno.test({
  name:
    "2025 independent MFJ spouse SHOP employers file two sourced 8941s and one section 38 credit",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const { expected, ...input } = form8941IndependentSpouseInputs();
    const filer = extractFilerIdentity(input.general)!;
    const result = execute(plan, registry, input, {
      taxYear: 2025,
      formType: "f1040",
    });
    assertEquals(result.diagnostics, []);
    assertEquals(independentSpouseForm8941(input.f8941).lines, expected.lines);
    assertEquals(
      result.pending.schedule_c.form8941_premium_reductions,
      input.schedule_c.map((business, index) => ({
        business_reference: business.business_reference,
        credit_amount: expected.lines[index].line16,
      })),
    );
    assertEquals(
      projectScheduleCItems(scheduleCSchema.parse(result.pending.schedule_c))
        .map((business) => business.line_14_employee_benefits),
      input.schedule_c.map((business, index) =>
        business.line_14_employee_benefits - expected.lines[index].line16
      ),
    );
    const form3800 = f3800Schema.parse(result.pending.f3800);
    assertEquals(
      form3800.f8941_direct_employer_credit?.credit_amount,
      expected.totalCredit,
    );
    assertEquals(
      result.pending.f1040.form8941_determined_credit,
      expected.totalCredit,
    );
    assertEquals(
      form3800.form8941_applied_credit! < expected.totalCredit,
      true,
    );
    const bundle = await buildMefBundle(buildPending(result.pending), {
      filer,
      attachments: [],
    });
    assertEquals((bundle.xml.match(/<IRS8941 /g) ?? []).length, 2);
    assertEquals((bundle.xml.match(/<IRS1040ScheduleC /g) ?? []).length, 2);
    const formIds = [...bundle.xml.matchAll(/<IRS8941 documentId="([^"]+)"/g)]
      .map((match) => match[1]);
    const detailIds = [
      ...bundle.xml.matchAll(
        /<Frm8941CYAggrgtAmtGrp referenceDocumentId="([^"]+)"/g,
      ),
    ].map((match) => match[1]);
    assertEquals(detailIds, formIds);
    assertStringIncludes(
      bundle.xml,
      "<CYGeneralBusinessCrItemCnt>2</CYGeneralBusinessCrItemCnt>",
    );
    assertStringIncludes(
      bundle.xml,
      `<SSN>${input.f8941.independent_members[0].owner_ssn}</SSN>`,
    );
    assertStringIncludes(
      bundle.xml,
      `<SSN>${input.f8941.independent_members[1].owner_ssn}</SSN>`,
    );
    await Deno.mkdir(dir, { recursive: true });
    const prefix = dir + "two-independent-spouse-employers";
    await Deno.writeTextFile(
      prefix + ".json",
      JSON.stringify({ input, expected, pending: result.pending }, null, 2),
    );
    await Deno.writeTextFile(prefix + ".xml", bundle.xml);
    const validated = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, prefix + ".xml"],
      stderr: "piped",
    }).output();
    assertEquals(validated.code, 0, new TextDecoder().decode(validated.stderr));
    await Deno.writeFile(
      prefix + ".pdf",
      await buildPdfBytes(bundle.pending, filer, dir + "irs-pdf-cache", bundle),
    );
  },
});

type Mutation = readonly [string, (source: any) => void];
const mutations: readonly Mutation[] = [
  ["other spouse directly owns interest", (s) => {
    s.spouse_exception_records[0].other_spouse_direct_ownership_percentage = 1;
  }],
  ["other spouse managerial role", (s) => {
    s.spouse_exception_records[1]
      .other_spouse_never_director_fiduciary_employee_or_manager_verified =
        false;
  }],
  ["other spouse employed", (s) => {
    s.independent_members[0].employees[0].employee_ssn =
      s.independent_members[1].owner_ssn;
  }],
  ["other spouse listed as excluded employee", (s) => {
    s.independent_members[0].excluded_workers[1].employee_ssn =
      s.independent_members[1].owner_ssn;
  }],
  ["passive share over half", (s) => {
    s.spouse_exception_records[0].royalties = 220000;
  }],
  ["spouse favored disposal", (s) => {
    s.spouse_exception_records[0]
      .no_disposal_restriction_favoring_spouse_or_under21_children_verified =
        false;
  }],
  ["cross business worker repeated", (s) => {
    s.independent_members[1].employees[0].employee_ssn =
      s.independent_members[0].employees[0].employee_ssn;
  }],
  ["cross business evidence reused", (s) => {
    s.independent_members[1].payroll_ledger_reference =
      s.independent_members[0].payroll_ledger_reference;
  }],
  ["second employer SHOP payment conflict", (s) => {
    s.independent_members[1].employees[0].employer_premium_paid += 1;
  }],
  ["second employer 121st service day absent", (s) => {
    s.independent_members[1].employees[2].seasonal_service.service_dates.pop();
  }],
  ["excluded paid premium as ordinary deduction", (s) => {
    s.independent_members[1].other_schedule_c_employee_benefits = 300;
  }],
];

Deno.test({
  name:
    "2025 spouse Form 8941 full current tax use retains two native and PDF sources",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const { expected, ...input } = form8941IndependentSpouseInputs(300000);
    const filer = extractFilerIdentity(input.general)!;
    const result = execute(plan, registry, input, {
      taxYear: 2025,
      formType: "f1040",
    });
    assertEquals(result.diagnostics, []);
    const form3800 = f3800Schema.parse(result.pending.f3800);
    assertEquals(form3800.form8941_applied_credit, expected.totalCredit);
    assertEquals(
      result.pending.f1040.line20_nonrefundable_credits,
      expected.totalCredit,
    );
    const bundle = await buildMefBundle(buildPending(result.pending), {
      filer,
      attachments: [],
    });
    const passiveBoundary: any = structuredClone(bundle.pending);
    const ordinary = passiveBoundary.f8941.spouse_exception_records[0]
      .ordinary_business_gross_income;
    passiveBoundary.f8941.spouse_exception_records[0].royalties = ordinary;
    passiveBoundary.schedule_c.schedule_cs[0].line_6_other_income = ordinary;
    assertEquals(
      reconcileForm8941ScheduleC(passiveBoundary, filer).lines.line16,
      expected.totalCredit,
    );
    passiveBoundary.f8941.spouse_exception_records[0].royalties = ordinary + 1;
    passiveBoundary.schedule_c.schedule_cs[0].line_6_other_income = ordinary +
      1;
    assertThrows(() => reconcileForm8941ScheduleC(passiveBoundary, filer));
    assertEquals((bundle.xml.match(/<IRS8941 /g) ?? []).length, 2);
    await Deno.mkdir(dir, { recursive: true });
    const prefix = dir + "two-independent-spouse-employers-full-use";
    await Deno.writeTextFile(prefix + ".xml", bundle.xml);
    const validated = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, prefix + ".xml"],
      stderr: "piped",
    }).output();
    assertEquals(validated.code, 0, new TextDecoder().decode(validated.stderr));
    await Deno.writeFile(
      prefix + ".pdf",
      await buildPdfBytes(bundle.pending, filer, dir + "irs-pdf-cache", bundle),
    );
  },
});

Deno.test({
  name:
    "2025 spouse attribution, passive gross, SHOP, payroll and direct document conflicts reject",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const { expected: _expected, ...input } = form8941IndependentSpouseInputs();
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
      const changed = structuredClone(input);
      mutate(changed.f8941);
      const executed = execute(plan, registry, changed, {
        taxYear: 2025,
        formType: "f1040",
      });
      assertEquals(executed.diagnostics.length > 0, true, name);
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
    const directConflicts: readonly Mutation[] = [
      ["second source credit changed", (p) => {
        p.f3800.f8941_direct_employer_credit.independent_spouse_credits[1]++;
      }],
      ["second business premium deduction changed", (p) => {
        p.schedule_c.schedule_cs[1].line_14_employee_benefits++;
      }],
      ["second business wage payroll changed", (p) => {
        p.schedule_c.schedule_cs[1].line_26_wages++;
      }],
      ["second business gross income ledger changed", (p) => {
        p.schedule_c.schedule_cs[1].line_6_other_income++;
      }],
    ];
    for (const [name, mutate] of directConflicts) {
      const native = structuredClone(bundle.pending);
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
