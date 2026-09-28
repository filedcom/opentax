import { assertEquals, assertThrows } from "@std/assert";
import {
  IncomeCategory,
  priorYearCarryoverSchema,
} from "../../intermediate/forms/form_1116/index.ts";
import { form1116_prior_carryover, inputSchema } from "./index.ts";

const originated2020 = {
  income_category: IncomeCategory.Passive,
  vintages: [{
    vintage_tax_year: 2020 as const,
    prior_year_schedule_b_line8_vintage_amount: 100,
  }],
  prior_year_schedule_b_line8_total: 100,
  prior_year_schedule_b_line8_other_vintages_total: 0 as const,
  no_intervening_adjustments: true as const,
  source_document_references: [
    "Filed 2024 Schedule B line 8, credit originating in 2020",
  ],
};

Deno.test("Form 1116 prior-year source retains a 2020-origin credit", () => {
  const result = form1116_prior_carryover.compute(
    { taxYear: 2025, formType: "f1040" },
    { carryovers: [originated2020] },
  );
  assertEquals(result.outputs[0].nodeType, "form_1116");
  const emitted = priorYearCarryoverSchema.array().parse(
    result.outputs[0].fields.prior_year_carryovers,
  );
  assertEquals(emitted[0].vintages[0].vintage_tax_year, 2020);
  assertThrows(
    () =>
      inputSchema.parse(
        {
          carryovers: [{
            ...originated2020,
            vintages: [{
              vintage_tax_year: 2019,
              prior_year_schedule_b_line8_vintage_amount: 100,
            }],
          }],
        },
      ),
    Error,
  );
});
