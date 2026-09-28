import { assertEquals, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../../../mef/header.ts";
import {
  ForeignTaxCreditMethod,
  ForeignTaxKind,
  IncomeCategory,
} from "../../../nodes/intermediate/forms/form_1116/index.ts";
import { form1116ScheduleBPdf } from "./f1116_schedule_b.ts";

const filer: FilerIdentity = {
  primarySSN: "123456789",
  fullName: "Alex Taxpayer",
  nameLine1: "TAXPAYER ALEX",
  nameControl: "TAXP",
  filingStatus: FilingStatus.Single,
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
};

function parentSummary(
  category: IncomeCategory,
  currentYearExcessTax: number,
  priorYearCarryover?: number,
  usedPriorYearCarryover?: number,
) {
  return {
    category,
    items: [{
      foreign_tax_paid: 500,
      foreign_gross_income: 5_000,
      income_category: category,
      irs_country_code: "CA",
      tax_paid_or_accrued_date: "2025-11-01",
      tax_kind: ForeignTaxKind.Interest,
      tax_credit_method: ForeignTaxCreditMethod.Paid,
    }],
    foreignTaxPaid: 500,
    foreignGrossIncome: 5_000,
    includedForeignIncome: 5_000,
    directlyAllocableDeductions: 0,
    explicitlyApportionedDeductions: 0,
    automaticallyApportionedDeductions: 0,
    foreignTaxableIncome: 5_000,
    allowedCredit: 450,
    currentYearExcessTax,
    ...(priorYearCarryover !== undefined ? { priorYearCarryover } : {}),
    ...(usedPriorYearCarryover !== undefined ? { usedPriorYearCarryover } : {}),
  };
}

const currentFields = {
  case: "current_year_excess" as const,
  category: IncomeCategory.Passive,
  current_year_excess_tax: 50,
  prior_year_review: {
    income_category: IncomeCategory.Passive,
    prior_year_form1116_line23_limit: 500,
    prior_year_form1116_line24_allowed_credit: 500,
    prior_year_schedule_b_line8_balance: 0 as const,
    source_document_references: ["Filed 2024 passive Form 1116 and Schedule B"],
    no_foreign_tax_redetermination_or_special_adjustment: true as const,
  },
};

const priorFields = {
  case: "prior_year_use" as const,
  category: IncomeCategory.General,
  prior_year_carryover: 600,
  used_prior_year_carryover: 250,
  remaining_prior_year_carryover: 350,
  prior_year_carryover_source: {
    income_category: IncomeCategory.General,
    vintages: [
      {
        vintage_tax_year: 2024 as const,
        prior_year_schedule_b_line8_vintage_amount: 300,
      },
      {
        vintage_tax_year: 2022 as const,
        prior_year_schedule_b_line8_vintage_amount: 100,
      },
      {
        vintage_tax_year: 2023 as const,
        prior_year_schedule_b_line8_vintage_amount: 200,
      },
    ],
    prior_year_schedule_b_line8_total: 600,
    prior_year_schedule_b_line8_other_vintages_total: 0 as const,
    no_intervening_adjustments: true as const,
    source_document_references: ["Filed 2024 general Schedule B line 8"],
  },
};

Deno.test("Form 1116 Schedule B PDF uses canonical two-page 2025 field paths", () => {
  const byKey = new Map(form1116ScheduleBPdf.fields.map((field) => [
    field.domainKey,
    field.pdfField,
  ]));
  assertEquals(form1116ScheduleBPdf.pageIndices?.({}), [0, 1]);
  assertEquals(
    byKey.get("line6_current"),
    "topmostSubform[0].Page2[0].Table_Page2[0].Line6[0].f2_88[0]",
  );
  assertEquals(
    byKey.get("line1_2021"),
    "topmostSubform[0].Page2[0].Table_Page2[0].Line1[0].f2_02[0]",
  );
  assertEquals(
    byKey.get("line1_2020"),
    "topmostSubform[0].Page1[0].Table_Page1[0].Line1[0].f1_15[0]",
  );
  assertEquals(
    byKey.get("line4_2020"),
    "topmostSubform[0].Page1[0].Table_Page1[0].Line4[0].f1_83[0]",
  );
  assertEquals(
    byKey.get("line1_2022"),
    "topmostSubform[0].Page2[0].Table_Page2[0].Line1[0].f2_03[0]",
  );
  assertEquals(
    byKey.get("line4_2024"),
    "topmostSubform[0].Page2[0].Table_Page2[0].Line4[0].f2_73[0]",
  );
  assertEquals(
    byKey.get("line8_total"),
    "topmostSubform[0].Page2[0].Table_Page2[0].Line8[0].f2_103[0]",
  );
});

Deno.test("Form 1116 Schedule B PDF projects a 2021 fourth-preceding vintage", () => {
  const source = {
    ...priorFields,
    prior_year_carryover: 700,
    used_prior_year_carryover: 250,
    remaining_prior_year_carryover: 450,
    prior_year_carryover_source: {
      ...priorFields.prior_year_carryover_source,
      vintages: [
        ...priorFields.prior_year_carryover_source.vintages,
        {
          vintage_tax_year: 2021 as const,
          prior_year_schedule_b_line8_vintage_amount: 100,
        },
      ],
      prior_year_schedule_b_line8_total: 700,
    },
  };
  const projected = form1116ScheduleBPdf.projectFields?.(source, {
    form_1116: {
      category_summaries: [parentSummary(IncomeCategory.General, 0, 700, 250)],
    },
  }) ?? {};
  assertEquals(projected.line1_2021, 100);
  assertEquals(projected.line3_2021, 100);
  assertEquals(projected.line4_2021, -100);
  assertEquals(projected.line8_2021, 0);
  assertEquals(projected.line4_2022, -100);
  assertEquals(projected.line4_2023, -50);
  assertEquals(projected.line8_total, 450);
});

Deno.test("Form 1116 Schedule B PDF carries 2020 through page-1 and page-2 subtotals", () => {
  const source = {
    ...priorFields,
    category: IncomeCategory.General,
    prior_year_carryover: 300,
    used_prior_year_carryover: 150,
    remaining_prior_year_carryover: 150,
    prior_year_carryover_source: {
      ...priorFields.prior_year_carryover_source,
      vintages: [
        {
          vintage_tax_year: 2020 as const,
          prior_year_schedule_b_line8_vintage_amount: 100,
        },
        {
          vintage_tax_year: 2021 as const,
          prior_year_schedule_b_line8_vintage_amount: 200,
        },
      ],
      prior_year_schedule_b_line8_total: 300,
      source_document_references: [
        "Filed 2024 Schedule B line 8, original 2020 and 2021 vintages",
      ],
    },
  };
  const projected = form1116ScheduleBPdf.projectFields?.(source, {
    form_1116: {
      category_summaries: [parentSummary(IncomeCategory.General, 0, 300, 150)],
    },
  }) ?? {};
  assertEquals(projected.line1_2020, 100);
  assertEquals(projected.line3_2020, 100);
  assertEquals(projected.line4_2020, -100);
  assertEquals(projected.line8_2020, 0);
  assertEquals(projected.line1_page1_subtotal, 100);
  assertEquals(projected.line1_page2_subtotal, 100);
  assertEquals(projected.line4_page1_subtotal, -100);
  assertEquals(projected.line4_page2_subtotal, -100);
  assertEquals(projected.line8_page1_subtotal, 0);
  assertEquals(projected.line8_page2_subtotal, 0);
  assertEquals(projected.line4_2021, -50);
  assertEquals(projected.line8_total, 150);
  assertThrows(
    () =>
      form1116ScheduleBPdf.projectFields?.(source, {
        form_1116: {
          category_summaries: [
            parentSummary(IncomeCategory.General, 0, 300, 149),
          ],
        },
      }),
    Error,
    "matching Form 1116 category summary",
  );
});

Deno.test("Form 1116 Schedule B PDF prints current-year excess in column xiii and total", () => {
  const projected = form1116ScheduleBPdf.projectFields?.(currentFields, {
    form_1116: {
      category_summaries: [parentSummary(IncomeCategory.Passive, 50)],
    },
  }) ?? {};
  assertEquals(projected.line6_current, 50);
  assertEquals(projected.line6_total, 50);
  assertEquals(projected.line8_current, 50);
  assertEquals(projected.line8_total, 50);
  assertEquals(projected.line1_total, undefined);
  assertEquals(projected.category, IncomeCategory.Passive);
  const instances = form1116ScheduleBPdf.instances?.(projected, filer) ?? [];
  assertEquals(instances.length, 1);
  assertEquals(instances[0].filer_name, "Alex Taxpayer");
  assertEquals(instances[0].filer_ssn, "123456789");
});

Deno.test("Form 1116 Schedule B PDF combines retained 2024 balance and 2025 excess", () => {
  const fields = {
    case: "combined_current_excess_prior_balance" as const,
    category: IncomeCategory.Passive,
    current_year_excess_tax: 50,
    prior_year_review: {
      ...currentFields.prior_year_review,
      prior_year_schedule_b_line8_balance: 600,
    },
    prior_year_carryover: 600,
    used_prior_year_carryover: 0 as const,
    remaining_prior_year_carryover: 600,
    prior_year_carryover_source: {
      income_category: IncomeCategory.Passive,
      vintages: [{
        vintage_tax_year: 2024 as const,
        prior_year_schedule_b_line8_vintage_amount: 600,
      }],
      prior_year_schedule_b_line8_total: 600,
      prior_year_schedule_b_line8_other_vintages_total: 0 as const,
      no_intervening_adjustments: true as const,
      source_document_references: ["Filed 2024 passive Schedule B line 8"],
    },
  };
  const projected = form1116ScheduleBPdf.projectFields?.(fields, {
    form_1116: {
      category_summaries: [parentSummary(
        IncomeCategory.Passive,
        50,
        600,
        0,
      )],
    },
  }) ?? {};
  assertEquals(projected.line1_2024, 600);
  assertEquals(projected.line3_2024, 600);
  assertEquals(projected.line4_2024, undefined);
  assertEquals(projected.line6_current, 50);
  assertEquals(projected.line8_2024, 600);
  assertEquals(projected.line8_current, 50);
  assertEquals(projected.line8_total, 650);
  assertThrows(
    () =>
      form1116ScheduleBPdf.projectFields?.({
        ...fields,
        prior_year_review: {
          ...fields.prior_year_review,
          prior_year_schedule_b_line8_balance: 0,
        },
      }, {
        form_1116: {
          category_summaries: [parentSummary(
            IncomeCategory.Passive,
            50,
            600,
            0,
          )],
        },
      }),
    Error,
    "does not match its prior-year source",
  );
});

Deno.test("Form 1116 Schedule B PDF allocates 2022-2024 oldest first across lines 1, 3, 4, and 8", () => {
  const projected = form1116ScheduleBPdf.projectFields?.(priorFields, {
    form_1116: {
      category_summaries: [parentSummary(IncomeCategory.General, 0, 600, 250)],
    },
  }) ?? {};
  assertEquals([
    projected.line1_2022,
    projected.line1_2023,
    projected.line1_2024,
  ], [100, 200, 300]);
  assertEquals([
    projected.line4_2022,
    projected.line4_2023,
    projected.line4_2024,
  ], [-100, -150, undefined]);
  assertEquals([
    projected.line8_2022,
    projected.line8_2023,
    projected.line8_2024,
  ], [0, 50, 300]);
  assertEquals([
    projected.line1_total,
    projected.line3_total,
    projected.line4_total,
    projected.line8_total,
  ], [600, 600, -250, 350]);
  assertEquals(projected.category, IncomeCategory.General);
});

Deno.test("Form 1116 Schedule B PDF fails closed on source and parent mismatches", () => {
  assertThrows(
    () =>
      form1116ScheduleBPdf.projectFields?.(currentFields, {
        form_1116: {
          category_summaries: [parentSummary(IncomeCategory.Passive, 49)],
        },
      }),
    Error,
    "matching Form 1116 category summary",
  );
  assertThrows(
    () =>
      form1116ScheduleBPdf.projectFields?.({
        ...priorFields,
        remaining_prior_year_carryover: 351,
      }, {
        form_1116: {
          category_summaries: [
            parentSummary(IncomeCategory.General, 0, 600, 250),
          ],
        },
      }),
    Error,
    "do not reconcile",
  );
  assertEquals(form1116ScheduleBPdf.instances?.({}, filer), []);
});
