import { assertEquals, assertThrows } from "@std/assert";
import { buildExecutionPlan } from "../../../../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../../../../core/runtime/executor.ts";
import { registry } from "../../../../../registry.ts";
import { form1116 as form1116Mef } from "../../../../../mef/forms/credits/foreign/f1116/f1116.ts";
import { pdfReviewFixtures } from "../../../../review-fixtures.ts";
import { form1116Pdf } from "./f1116.ts";
import { categorySummarySchema } from "../../../../../../nodes/intermediate/forms/credits/foreign/form_1116/index.ts";

function requiredNumber(value: unknown): number {
  if (typeof value !== "number") throw new Error("Expected computed amount");
  return value;
}

Deno.test("current-year excess Form 1116 parent checks final Schedule 3 and Form 1040 credit", () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-foreign-interest-current-excess"
  );
  if (!fixture) throw new Error("missing foreign-interest review fixture");
  const result = execute(buildExecutionPlan(registry), registry, {
    ...fixture.inputs,
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const { pending } = result;
  const fields = pending.form_1116;
  const summary =
    categorySummarySchema.array().parse(fields?.category_summaries)[0];
  assertEquals(pending.form1116_schedule_b?.case, "current_year_excess");
  assertEquals(
    pending.schedule3?.line1_foreign_tax_credit,
    summary?.allowedCredit,
  );
  assertEquals(
    pending.f1040?.line20_nonrefundable_credits,
    pending.schedule3?.line8_total,
  );
  assertEquals(
    form1116Pdf.projectFields?.(fields, pending)?.pdf_line35,
    summary?.allowedCredit,
  );
  assertEquals(
    form1116Mef.build(fields as Parameters<typeof form1116Mef.build>[0], {
      pending,
    }).length,
    1,
  );

  for (
    const changed of [
      {
        ...pending,
        f1040: {
          ...pending.f1040,
          line20_nonrefundable_credits:
            requiredNumber(pending.f1040?.line20_nonrefundable_credits) - 1,
        },
      },
      {
        ...pending,
        schedule3: {
          ...pending.schedule3,
          line8_total: requiredNumber(pending.schedule3?.line8_total) + 1,
        },
      },
    ]
  ) {
    assertThrows(
      () => form1116Pdf.projectFields?.(fields, changed),
      Error,
      "Form 1040",
    );
    assertThrows(
      () =>
        form1116Mef.build(fields as Parameters<typeof form1116Mef.build>[0], {
          pending: changed,
        }),
      Error,
      "Form 1040 line 20",
    );
  }
});
