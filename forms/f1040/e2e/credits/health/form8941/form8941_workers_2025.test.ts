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
import {
  form8941SpouseWorkerInputs,
  form8941WorkerInputs,
} from "../../../../2025/pdf/reviews/general/composed-returns/review-8941-workers.fixture.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { calculateForm8941 } from "../../../../nodes/inputs/credits/health/f8941/index.ts";
import {
  inputSchema as scheduleCSchema,
  projectScheduleCItems,
} from "../../../../nodes/inputs/income/business/schedule_c/model.ts";

const dir = new URL(
  "../../../../../../.state/research/2026-10-06-form8941-workers/",
  import.meta.url,
).pathname;
const xsd = new URL(
  "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
const plan = buildExecutionPlan(registry);

for (const days of [120, 121] as const) {
  Deno.test({
    name:
      `TY2025 Form8941 ${days} actual seasonal service days and excluded coverage: full source, XSD and PDF`,
    sanitizeResources: false,
    sanitizeOps: false,
    async fn() {
      const input = form8941WorkerInputs(days);
      const filer = extractFilerIdentity(input.general)!;
      const result = execute(plan, registry, input, {
        taxYear: 2025,
        formType: "f1040",
      });
      assertEquals(result.diagnostics, []);
      const pending = result.pending;
      const lines = calculateForm8941(input.f8941);
      assertEquals(
        [
          lines.line1,
          lines.line2,
          lines.line3,
          lines.line4,
          lines.line5,
          lines.line13,
          lines.line14,
          lines.line16,
        ],
        days === 120
          ? [6, 4, 23000, 39245, 29228, 5, 3, 14614]
          : [6, 5, 22000, 39245, 29228, 5, 4, 14614],
      );
      const business = scheduleCSchema.parse(pending.schedule_c);
      assertEquals(business.schedule_cs[0].line_26_wages, 115000);
      assertEquals(business.schedule_cs[0].line_14_employee_benefits, 39245);
      assertEquals(
        projectScheduleCItems(business)[0].line_14_employee_benefits,
        24631,
      );
      assertEquals(pending.f3800.form8941_applied_credit, 14614);
      assertEquals(pending.f1040.line20_nonrefundable_credits, 14614);
      const bundle = await buildMefBundle(buildPending(pending), {
        filer,
        attachments: [],
      });
      assertStringIncludes(bundle.xml, "<IRS8941 ");
      assertStringIncludes(
        bundle.xml,
        `<SmllEmplrHIPFTEEmplForTaxYrCnt>${
          days === 120 ? 4 : 5
        }</SmllEmplrHIPFTEEmplForTaxYrCnt>`,
      );
      await Deno.mkdir(dir, { recursive: true });
      const prefix = `${dir}seasonal-${days}`;
      await Deno.writeTextFile(
        prefix + ".json",
        JSON.stringify(
          {
            input,
            lines,
            pending,
            preparedParts: bundle.form3800Parts,
          },
          null,
          2,
        ),
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
      const extracted = await new Deno.Command("pdftotext", {
        args: ["-layout", prefix + ".pdf", "-"],
        stdout: "piped",
      }).output();
      assertEquals(extracted.code, 0);
      const packet = new TextDecoder().decode(extracted.stdout);
      await Deno.writeTextFile(prefix + ".txt", packet);
      assertStringIncludes(packet, "Small Employer Health Insurance");
      assertStringIncludes(packet, "14614");
      assertStringIncludes(packet, "24631");
    },
  });
}

Deno.test({
  name:
    "TY2025 Form8941 excluded spouse: filed MFJ identity to full XSD and PDF",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const input = form8941SpouseWorkerInputs();
    const filer = extractFilerIdentity(input.general)!;
    const result = execute(plan, registry, input, {
      taxYear: 2025,
      formType: "f1040",
    });
    assertEquals(result.diagnostics, []);
    const lines = calculateForm8941(input.f8941);
    assertEquals([lines.line2, lines.line3, lines.line4, lines.line16], [
      4,
      23000,
      39245,
      14614,
    ]);
    assertEquals(
      scheduleCSchema.parse(result.pending.schedule_c).schedule_cs[0]
        .line_26_wages,
      124000,
    );
    const bundle = await buildMefBundle(buildPending(result.pending), {
      filer,
      attachments: [],
    });
    const prefix = `${dir}seasonal-120-spouse`;
    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(
      prefix + ".json",
      JSON.stringify({ input, lines, pending: result.pending }, null, 2),
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
    assertStringIncludes(packet, "Sam Soleproprietor");
    assertStringIncludes(packet, "14614");
  },
});

type Mutation = readonly [string, (source: any) => void];
const mutations: readonly Mutation[] = [
  ["duplicate seasonal date", (s) => {
    s.employees[2].seasonal_service.service_dates[1] =
      s.employees[2].seasonal_service.service_dates[0];
    s.shop_review.employee_premium_reviews[2].seasonal_service
      .service_dates[1] = s.employees[2].seasonal_service.service_dates[0];
  }],
  ["seasonal date outside summer", (s) => {
    s.employees[2].seasonal_service.service_dates[0] = "2025-10-01";
    s.shop_review.employee_premium_reviews[2].seasonal_service
      .service_dates[0] = "2025-10-01";
  }],
  ["seasonal reviewed days differ", (s) => {
    s.shop_review.employee_premium_reviews[2].seasonal_service.service_dates
      .pop();
  }],
  ["seasonal nature source missing", (s) => {
    delete s.employees[2].seasonal_service.seasonal_nature_source_reference;
  }],
  ["false no excluded workers", (s) => {
    s.excluded_owner_family_seasonal_and_nonbusiness_workers_none_verified =
      true;
  }],
  ["related worker SSN overlaps credited worker", (s) => {
    s.excluded_workers[1].employee_ssn = s.employees[1].employee_ssn;
    s.excluded_worker_reviews[1].employee_ssn = s.employees[1].employee_ssn;
  }],
  ["related worker relation lacks source", (s) => {
    delete s.excluded_workers[1].relationship_source_reference;
  }],
  ["excluded coverage plan unoffered", (s) => {
    s.excluded_workers[1].coverage_records[0].shop_plan_reference = "unknown";
    s.excluded_worker_reviews[1].coverage_records[0].shop_plan_reference =
      "unknown";
  }],
  ["excluded premium exceeds bill", (s) => {
    s.excluded_workers[1].coverage_records[0].employer_payment = 999;
    s.excluded_worker_reviews[1].coverage_records[0].employer_payment = 999;
  }],
  ["excluded paid coverage in other benefits", (s) => {
    s.other_schedule_c_employee_benefits = 300;
  }],
];

Deno.test({
  name:
    "TY2025 Form8941 seasonal and excluded records reject actual public and native/PDF conflicts",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const input = form8941WorkerInputs(120);
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
      assertThrows(() => calculateForm8941(badInput.f8941), Error);
      const invalid = execute(plan, registry, badInput, {
        taxYear: 2025,
        formType: "f1040",
      });
      assertEquals(invalid.diagnostics.length > 0, true, name);
      assertThrows(() => buildMefXml(buildPending(invalid.pending), filer));
      await assertRejects(() =>
        buildPdfBytes(invalid.pending, filer, dir + "negative-cache")
      );
      const changed = structuredClone(bundle.pending);
      mutate(changed.f8941);
      assertThrows(() => buildMefXml(buildPending(changed), filer));
      await assertRejects(() =>
        buildPdfBytes(changed, filer, dir + "negative-cache", {
          ...bundle,
          pending: changed,
        })
      );
    }
    const gross = structuredClone(bundle.pending);
    (gross.schedule_c as any).schedule_cs[0].line_14_employee_benefits += 300;
    assertThrows(() => buildMefXml(buildPending(gross), filer));
    await assertRejects(() =>
      buildPdfBytes(gross, filer, dir + "negative-cache", {
        ...bundle,
        pending: gross,
      })
    );
    const badSpouseInput = form8941SpouseWorkerInputs();
    badSpouseInput.general.spouse_ssn = "999887777";
    const badSpouseFiler = extractFilerIdentity(badSpouseInput.general)!;
    const badSpouseGraph = execute(plan, registry, badSpouseInput, {
      taxYear: 2025,
      formType: "f1040",
    });
    assertEquals(badSpouseGraph.diagnostics, []);
    assertThrows(
      () => buildMefXml(buildPending(badSpouseGraph.pending), badSpouseFiler),
      Error,
      "excluded spouse differs",
    );
    await assertRejects(
      () =>
        buildPdfBytes(
          badSpouseGraph.pending,
          badSpouseFiler,
          dir + "negative-cache",
        ),
      Error,
    );
    const badDependent = form8941SpouseWorkerInputs();
    badDependent.general.dependents[0].gross_income = 5200;
    const dependentGraph = execute(plan, registry, badDependent, {
      taxYear: 2025,
      formType: "f1040",
    });
    assertEquals(dependentGraph.diagnostics, []);
    const dependentFiler = extractFilerIdentity(badDependent.general)!;
    assertThrows(
      () => buildMefXml(buildPending(dependentGraph.pending), dependentFiler),
      Error,
      "excluded household dependent differs",
    );
    await assertRejects(() =>
      buildPdfBytes(
        dependentGraph.pending,
        dependentFiler,
        dir + "negative-cache",
      )
    );
  },
});
