import { assertEquals, assertThrows } from "@std/assert";
import {
  IncomeCategory,
  priorYearCarryoverSchema,
} from "../../../../intermediate/forms/credits/foreign/form_1116/index.ts";
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

const originated2019 = {
  ...originated2020,
  vintages: [{
    vintage_tax_year: 2019 as const,
    prior_year_schedule_b_line8_vintage_amount: 100,
  }],
  source_document_references: [
    "Filed 2024 Schedule B line 8, credit originating in 2019",
  ],
};

const originated2018 = {
  ...originated2020,
  vintages: [{
    vintage_tax_year: 2018 as const,
    prior_year_schedule_b_line8_vintage_amount: 100,
  }],
  source_document_references: [
    "Filed 2024 Schedule B line 8, credit originating in 2018",
  ],
};

const originated2017 = {
  ...originated2020,
  vintages: [{
    vintage_tax_year: 2017 as const,
    prior_year_schedule_b_line8_vintage_amount: 100,
  }],
  source_document_references: [
    "Filed 2024 passive Schedule B line 8, credit originating in 2017",
  ],
};

const originated2016 = {
  ...originated2020,
  vintages: [{
    vintage_tax_year: 2016 as const,
    prior_year_schedule_b_line8_vintage_amount: 100,
  }],
  source_document_references: [
    "Filed 2024 passive Schedule B line 8, credit originating in 2016",
  ],
};

const originated2015 = {
  ...originated2020,
  vintages: [{
    vintage_tax_year: 2015 as const,
    prior_year_schedule_b_line8_vintage_amount: 100,
  }],
  source_document_references: [
    "Filed 2024 passive Schedule B line 8, credit originating in 2015",
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
              vintage_tax_year: 2014,
              prior_year_schedule_b_line8_vintage_amount: 100,
            }],
          }],
        },
      ),
    Error,
  );
});

Deno.test("Form 1116 prior-year source retains a 2019-origin credit", () => {
  const result = form1116_prior_carryover.compute(
    { taxYear: 2025, formType: "f1040" },
    { carryovers: [originated2019] },
  );
  const emitted = priorYearCarryoverSchema.array().parse(
    result.outputs[0].fields.prior_year_carryovers,
  );
  assertEquals(emitted[0].vintages[0].vintage_tax_year, 2019);
});

Deno.test("Form 1116 prior-year source retains a 2018-origin credit", () => {
  const result = form1116_prior_carryover.compute(
    { taxYear: 2025, formType: "f1040" },
    { carryovers: [originated2018] },
  );
  const emitted = priorYearCarryoverSchema.array().parse(
    result.outputs[0].fields.prior_year_carryovers,
  );
  assertEquals(emitted[0].vintages[0].vintage_tax_year, 2018);
});

Deno.test("Form 1116 prior-year source retains passive 2017 origin and rejects unsourced general allocation", () => {
  const result = form1116_prior_carryover.compute(
    { taxYear: 2025, formType: "f1040" },
    { carryovers: [originated2017] },
  );
  const emitted = priorYearCarryoverSchema.array().parse(
    result.outputs[0].fields.prior_year_carryovers,
  );
  assertEquals(emitted[0].vintages[0].vintage_tax_year, 2017);
  assertThrows(
    () => inputSchema.parse({ carryovers: [{
      ...originated2017,
      income_category: IncomeCategory.General,
    }] }),
    Error,
    "pre-2018 general-category carryover needs separate foreign-branch allocation evidence",
  );
});

Deno.test("Form 1116 prior-year source retains passive 2016 origin and rejects unsourced general allocation", () => {
  const result = form1116_prior_carryover.compute(
    { taxYear: 2025, formType: "f1040" },
    { carryovers: [originated2016] },
  );
  const emitted = priorYearCarryoverSchema.array().parse(
    result.outputs[0].fields.prior_year_carryovers,
  );
  assertEquals(emitted[0].vintages[0].vintage_tax_year, 2016);
  assertThrows(
    () => inputSchema.parse({ carryovers: [{
      ...originated2016,
      income_category: IncomeCategory.General,
    }] }),
    Error,
    "pre-2018 general-category carryover needs separate foreign-branch allocation evidence",
  );
});

Deno.test("Form 1116 prior-year source retains passive 2015 origin and rejects unsourced general allocation", () => {
  const result = form1116_prior_carryover.compute(
    { taxYear: 2025, formType: "f1040" },
    { carryovers: [originated2015] },
  );
  const emitted = priorYearCarryoverSchema.array().parse(
    result.outputs[0].fields.prior_year_carryovers,
  );
  assertEquals(emitted[0].vintages[0].vintage_tax_year, 2015);
  assertThrows(
    () => inputSchema.parse({ carryovers: [{
      ...originated2015,
      income_category: IncomeCategory.General,
    }] }),
    Error,
    "pre-2018 general-category carryover needs separate foreign-branch allocation evidence",
  );
});
