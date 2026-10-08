import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { registry } from "../../../../2025/registry.ts";
import { buildMefBundle } from "../../../../2025/mef/builder.ts";
import { buildPending } from "../../../../2025/mef/execution/pending.ts";
import { buildPdfBytes } from "../../../../2025/pdf/builder.ts";
import {
  form8941PartMonthInputs,
  form8941PartMonthSource,
} from "../../../../2025/pdf/reviews/general/composed-returns/review-8941-partmonth.fixture.ts";
import { calculateForm8941, inputSchema } from "../../../../nodes/inputs/credits/health/f8941/index.ts";
import { multiplePlanWorksheet } from "../../../../nodes/inputs/credits/health/f8941/multiple_plans.ts";
import {
  inputSchema as scheduleCSchema,
  projectScheduleCItems,
} from "../../../../nodes/inputs/income/business/schedule_c/model.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";

const dir = new URL(
  "../../../../../../.state/research/2026-10-06-form8941-partmonth/",
  import.meta.url,
).pathname;
const xsd = new URL(
  "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
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
      `TY2025 Form8941 dated part-month ${name}: actual source, full XSD and PDF`,
    sanitizeResources: false,
    sanitizeOps: false,
    async fn() {
      const input = form8941PartMonthInputs(receipts);
      const result = execute(plan, registry, input, {
        taxYear: 2025,
        formType: "f1040",
      });
      assertEquals(result.diagnostics, []);
      const lines = calculateForm8941(input.f8941),
        worksheet = multiplePlanWorksheet(input.f8941);
      assertEquals([
        lines.line1,
        lines.line2,
        lines.line4,
        lines.line5,
        lines.line16,
      ], [6, 5, 58744, 42749, 21375]);
      assertEquals(worksheet.rows.length, 60);
      const March = worksheet.rows.filter((r) =>
        r.employee_reference === input.f8941.employees[1].employee_reference &&
        r.month === 3
      );
      assertEquals(March.map((r) => r.coverage_tier), [
        "employee_only",
        "family",
      ]);
      const June = worksheet.rows.filter((r) =>
        r.employee_reference === input.f8941.employees[1].employee_reference &&
        r.month === 6
      );
      assertEquals(June.map((r) => r.coverage_tier), ["family", "family"]);
      const September = worksheet.rows.filter((r) =>
        r.employee_reference === input.f8941.employees[3].employee_reference &&
        r.month === 9
      );
      assertEquals(September.map((r) => r.coverage_tier), [
        "family",
        "employee_only",
      ]);
      const benefits = input.f8941.other_schedule_c_employee_benefits +
        lines.line4 - lines.line16;
      const profit = receipts - 110000 - benefits;
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
      assertEquals(result.pending.schedule_se.net_profit_schedule_c, profit);
      assertEquals(result.pending.form8995.qbi_from_schedule_c, profit);
      assertEquals(result.pending.f1040.line8_additional_income, profit);
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
      const valid = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", xsd, dir + name + ".xml"],
        stderr: "piped",
      }).output();
      assertEquals(valid.code, 0, new TextDecoder().decode(valid.stderr));
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

const conflicts: readonly [string, (s: any) => void][] = [
  [
    "no-carrier-rule",
    (s) =>
      delete s.shop_review.employee_premium_reviews[1].monthly_premiums[2]
        .carrier_daily_proration_rule_source_reference,
  ],
  [
    "wrong-event-day",
    (s) =>
      s.shop_review.employee_premium_reviews[1].monthly_premiums[2]
        .coverage_segments[1].coverage_start_date = "2025-03-21",
  ],
  [
    "overlap",
    (s) =>
      s.shop_review.employee_premium_reviews[1].monthly_premiums[2]
        .coverage_segments[0].coverage_end_date = "2025-03-20",
  ],
  [
    "wrong-segment-tier",
    (s) =>
      s.shop_review.employee_premium_reviews[1].monthly_premiums[2]
        .coverage_segments[1].coverage_tier = "employee_only",
  ],
  [
    "wrong-child-membership",
    (s) =>
      s.shop_review.employee_premium_reviews[1].monthly_premiums[5]
        .coverage_segments[1].covered_dependent_references.pop(),
  ],
  [
    "ineligible-child-month",
    (s) => {
      const record = s.employees[1].covered_dependents[1]
        .plan_eligibility_records[1];
      record.eligibility_period.first_month = 7;
      record.eligibility_period.coverage_start_date = "2025-07-01";
      record.eligibility_effective_date = "2025-07-01";
      s.shop_review.employee_premium_reviews[1].covered_dependents =
        structuredClone(s.employees[1].covered_dependents);
    },
  ],
  [
    "dependent-effective-before-birth",
    (s) => {
      for (
        const record of s.employees[1].covered_dependents[1]
          .plan_eligibility_records
      ) {
        record.eligibility_effective_date = "2025-06-01";
      }
      s.shop_review.employee_premium_reviews[1].covered_dependents =
        structuredClone(s.employees[1].covered_dependents);
    },
  ],
  [
    "wrong-prorated-bill",
    (s) =>
      s.shop_review.employee_premium_reviews[1].monthly_premiums[2]
        .coverage_segments[1].billed_premium += 1,
  ],
  [
    "wrong-prorated-payment",
    (s) =>
      s.shop_review.employee_premium_reviews[1].monthly_premiums[2]
        .coverage_segments[1].employer_payment += 1,
  ],
  [
    "wrong-monthly-total",
    (s) =>
      s.shop_review.employee_premium_reviews[1].monthly_premiums[2]
        .billed_premium += 1,
  ],
  [
    "unpaid-segment",
    (s) =>
      s.shop_review.employee_premium_reviews[1].monthly_premiums[2]
        .coverage_segments[1].employer_payment = 0,
  ],
  [
    "segment-invoice-reused",
    (s) =>
      s.shop_review.employee_premium_reviews[1].monthly_premiums[2]
        .coverage_segments[1].shop_invoice_reference =
          s.shop_review.employee_premium_reviews[1].monthly_premiums[2]
            .coverage_segments[0].shop_invoice_reference,
  ],
  [
    "segment-payment-before-invoice",
    (s) =>
      s.shop_review.employee_premium_reviews[1].monthly_premiums[2]
        .coverage_segments[1].payment_date = "2025-03-01",
  ],
];
for (const [name, change] of conflicts) {
  Deno.test(`TY2025 Form8941 part-month rejects ${name}`, () => {
    const source: any = structuredClone(form8941PartMonthSource());
    change(source);
    assertThrows(() => calculateForm8941(inputSchema.parse(source)));
  });
}
