import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { execute } from "../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { registry } from "../../../2025/registry.ts";
import { buildMefBundle } from "../../../2025/mef/builder.ts";
import { buildPending } from "../../../2025/mef/execution/pending.ts";
import { buildPdfBytes } from "../../../2025/pdf/builder.ts";
import {
  form8941TierChangeInputs,
  form8941TierChangeSource,
} from "../../../2025/pdf/reviews/composed/review-8941-tier-changes.fixture.ts";
import { calculateForm8941, inputSchema } from "../../../nodes/inputs/f8941/index.ts";
import { multiplePlanWorksheet } from "../../../nodes/inputs/f8941/multiple_plans.ts";
import {
  inputSchema as scheduleCSchema,
  projectScheduleCItems,
} from "../../../nodes/inputs/schedule_c/model.ts";
import { extractFilerIdentity } from "../../../mef/filer.ts";

const dir = new URL(
  "../../../../../.state/research/2026-10-06-form8941-tier-changes/",
  import.meta.url,
).pathname;
const xsd = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
const plan = buildExecutionPlan(registry);

for (
  const [name, receipts] of [["full-use", 350000], [
    "partial-use",
    210000,
  ]] as const
) {
  Deno.test({
    name:
      `TY2025 Form8941 actual multi-QHP tier changes ${name}: full XSD and PDF`,
    sanitizeResources: false,
    sanitizeOps: false,
    async fn() {
      const input = form8941TierChangeInputs(receipts);
      const result = execute(plan, registry, input, {
        taxYear: 2025,
        formType: "f1040",
      });
      assertEquals(result.diagnostics, []);
      const lines = calculateForm8941(input.f8941);
      assertEquals([lines.line1, lines.line2, lines.line4, lines.line16], [
        6,
        5,
        31502,
        10422,
      ]);
      const worksheet = multiplePlanWorksheet(input.f8941);
      assertEquals(worksheet.rows.length, 55);
      const changed = worksheet.rows.filter((r) =>
        r.employee_reference === input.f8941.employees[1].employee_reference
      );
      assertEquals(changed.map((r) => r.coverage_tier), [
        "employee_only",
        "employee_only",
        "employee_only",
        "family",
        "family",
        "family",
        "family",
        "family",
        "family",
        "family",
        "family",
        "family",
      ]);
      assertEquals(
        changed[2].adjusted_average_premium <
          changed[3].adjusted_average_premium,
        true,
      );
      const selfAgain = worksheet.rows.filter((r) =>
        r.employee_reference === input.f8941.employees[3].employee_reference
      );
      assertEquals([
        selfAgain[2].coverage_tier,
        selfAgain[3].coverage_tier,
        selfAgain[9].coverage_tier,
      ], ["employee_only", "family", "employee_only"]);
      const benefits = input.f8941.other_schedule_c_employee_benefits +
        lines.line4 - lines.line16;
      assertEquals(
        projectScheduleCItems(
          scheduleCSchema.parse(result.pending.schedule_c),
        )[0].line_14_employee_benefits,
        benefits,
      );
      assertEquals(
        scheduleCSchema.parse(result.pending.schedule_c).schedule_cs[0]
          .line_14_employee_benefits,
        input.f8941.other_schedule_c_employee_benefits + lines.line4,
      );
    assertEquals(
      result.pending.f1040.line8_additional_income,
      receipts - 110000 - benefits,
    );
    assertEquals(
      result.pending.schedule_se.net_profit_schedule_c,
      receipts - 110000 - benefits,
    );
    assertEquals(
      result.pending.form8995.qbi_from_schedule_c,
      receipts - 110000 - benefits,
    );
      const use = Number(result.pending.f3800.form8941_applied_credit);
      assert(
        name === "full-use"
          ? use === lines.line16
          : use > 0 && use < lines.line16,
      );
      assertEquals(
        Number(result.pending.f1040.line20_nonrefundable_credits ?? 0),
        use,
      );
      const filer = extractFilerIdentity(input.general)!;
      const bundle = await buildMefBundle(buildPending(result.pending), {
        filer,
        attachments: [],
      });
      assertEquals(
        bundle.form3800Parts!.currentAmounts.find((r) => r.line === "4h")!
          .totalCredit,
        lines.line16,
      );
      assertStringIncludes(
        bundle.xml,
        `<SumSmllrAmtAndCreditForHIPAmt>${lines.line16}</SumSmllrAmtAndCreditForHIPAmt>`,
      );
      await Deno.mkdir(dir, { recursive: true });
      await Deno.writeTextFile(
        dir + name + ".json",
        JSON.stringify(
          { input, lines, pending: result.pending, worksheet },
          null,
          2,
        ),
      );
      await Deno.writeTextFile(dir + name + ".xml", bundle.xml);
      const xml = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", xsd, dir + name + ".xml"],
        stderr: "piped",
      }).output();
      assertEquals(xml.code, 0, new TextDecoder().decode(xml.stderr));
      await Deno.writeFile(
        dir + name + ".pdf",
        await buildPdfBytes(
          bundle.pending,
          filer,
          dir + "irs-pdf-cache",
          bundle,
        ),
      );
      const extraction = await new Deno.Command("pdftotext", {
        args: ["-layout", dir + name + ".pdf", "-"],
        stdout: "piped",
      }).output();
      assertEquals(extraction.code, 0);
      const packet = new TextDecoder().decode(extraction.stdout);
      await Deno.writeTextFile(dir + name + ".txt", packet);
      assertStringIncludes(packet, "Small Employer Health Insurance");
      assertStringIncludes(packet, String(lines.line16));
      assertStringIncludes(packet, String(benefits));
      assert(packet.split("\f").filter((p) => p.trim()).length >= 23);
    },
  });
}

const mutations: readonly [string, (source: any) => void][] = [
  [
    "marriage-event-missing",
    (s) => delete s.employees[1].coverage_periods[1].change_event,
  ],
  [
    "marriage-date-wrong-month",
    (s) =>
      s.employees[1].coverage_periods[1].change_event.effective_date =
        "2025-01-20",
  ],
  [
    "birth-event-wrong-relationship",
    (s) =>
      s.employees[1].coverage_periods[2].change_event.event_type = "marriage",
  ],
  [
    "birth-event-wrong-person",
    (s) =>
      s.employees[1].coverage_periods[2].change_event.dependent_reference =
        s.employees[1].covered_dependents[0].dependent_reference,
  ],
  [
    "divorce-keeps-spouse",
    (s) =>
      s.employees[1].coverage_periods[3].covered_dependent_references.push(
        s.employees[1].covered_dependents[0].dependent_reference,
      ),
  ],
  [
    "duplicated-tier-month",
    (s) => s.employees[1].coverage_periods[1].first_month = 3,
  ],
  [
    "dependent-eligibility-date",
    (s) =>
      s.employees[1].covered_dependents[1].plan_eligibility_records[1]
        .eligibility_period.first_month = 8,
  ],
  ["dependent-eligibility-before-birth", (s) => {
    for (
      const r of s.employees[1].covered_dependents[1].plan_eligibility_records
    ) {
      r.eligibility_period.first_month = 1;
      r.eligibility_period.coverage_start_date = "2025-01-01";
    }
  }],
  [
    "dependent-eligibility-reference-reused",
    (s) =>
      s.employees[1].covered_dependents[1].plan_eligibility_records[0]
        .eligibility_period.enrollment_source_reference =
          s.employees[1].covered_dependents[0].plan_eligibility_records[0]
            .eligibility_period.enrollment_source_reference,
  ],
  [
    "review-tier-period-mismatch",
    (s) =>
      s.shop_review.employee_premium_reviews[1].coverage_periods[1]
        .coverage_tier = "employee_only",
  ],
  [
    "invoice-tier-stale",
    (s) =>
      s.shop_review.employee_premium_reviews[1].monthly_premiums[3]
        .coverage_tier = "employee_only",
  ],
  [
    "invoice-dependents-stale",
    (s) =>
      s.shop_review.employee_premium_reviews[1].monthly_premiums[6]
        .covered_dependent_references.pop(),
  ],
  [
    "invoice-quote-wrong-tier",
    (s) =>
      s.shop_review.employee_premium_reviews[1].monthly_premiums[3]
        .billed_premium -= 1,
  ],
  [
    "reference-payment-wrong-tier",
    (s) =>
      s.shop_review.employee_premium_reviews[1].monthly_premiums[3]
        .employer_payment -= 1,
  ],
  ["annual-premium-differs", (s) => s.employees[1].tax_year_shop_premium -= 1],
];
for (const [name, mutate] of mutations) {
  Deno.test(`TY2025 Form8941 tier changes reject ${name}`, () => {
    const source: any = structuredClone(form8941TierChangeSource());
    mutate(source);
    assertThrows(() => calculateForm8941(inputSchema.parse(source)));
  });
}
