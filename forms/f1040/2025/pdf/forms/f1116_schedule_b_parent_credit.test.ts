import { assertEquals, assertThrows } from "@std/assert";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { registry } from "../../registry.ts";
import { pdfReviewFixtures } from "../review-fixtures.ts";
import { form1116ScheduleBPdf } from "./f1116_schedule_b.ts";
import { categorySummarySchema } from "../../../nodes/intermediate/forms/form_1116/index.ts";

function requiredNumber(value: unknown): number {
  if (typeof value !== "number") throw new Error("Expected computed amount");
  return value;
}

Deno.test("Form 1116 Schedule B PDF ties one-category credit to parent and final return", () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-foreign-interest-current-excess"
  );
  if (!fixture) throw new Error("missing foreign-interest review fixture");
  const result = execute(buildExecutionPlan(registry), registry, {
    ...fixture.inputs,
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const { pending } = result;
  const summary = categorySummarySchema.array().parse(
    pending.form_1116?.category_summaries,
  )[0];
  assertEquals(
    pending.schedule3?.line1_foreign_tax_credit,
    summary?.allowedCredit,
  );
  assertEquals(
    pending.f1040?.line20_nonrefundable_credits,
    pending.schedule3?.line8_total,
  );
  const fields = pending.form1116_schedule_b;
  const projected = form1116ScheduleBPdf.projectFields?.(fields, pending);
  assertEquals(projected?.line6_current, summary?.currentYearExcessTax);

  const altered = {
    ...pending,
    schedule3: {
      ...pending.schedule3,
      line1_foreign_tax_credit:
        requiredNumber(pending.schedule3?.line1_foreign_tax_credit) - 1,
    },
  };
  assertThrows(
    () => form1116ScheduleBPdf.projectFields?.(fields, altered),
    Error,
    "differs from Schedule 3 and Form 1040",
  );
});
