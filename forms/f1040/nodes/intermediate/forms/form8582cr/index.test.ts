import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateForm8582CRPartI,
  form8582cr,
  inputSchema,
  PassiveCreditCategory,
} from "./index.ts";
import { FilingStatus } from "../../../types.ts";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import { schedule3 } from "../../aggregation/schedule3/index.ts";

function source(
  category: PassiveCreditCategory,
  current: number,
  prior = 0,
  activity = "Rental house",
) {
  return {
    activity_reference: activity,
    source_form: "Form 8820",
    source_document_reference: `2025 ${activity} credit statement`,
    category,
    current_year_credit: current,
    prior_unallowed_credit: prior,
    publicly_traded_partnership: false,
  };
}

function other(current: number, prior = 0, activity = "Clinical activity") {
  return source(PassiveCreditCategory.Other, current, prior, activity);
}

function rental(current: number, prior = 0, activity = "Rental house") {
  return source(PassiveCreditCategory.ActiveRental, current, prior, activity);
}

function compute(input: Record<string, unknown>) {
  return form8582cr.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(input),
  );
}

function allowed(result: ReturnType<typeof compute>): number {
  return fieldsOf(result.outputs, schedule3)?.line6a_general_business_credit ??
    0;
}

Deno.test("Form 8582-CR identifies each current and prior credit source", () => {
  const parsed = inputSchema.parse({
    credit_sources: [other(1_000, 500)],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 8_000,
  });
  assertEquals(
    parsed.credit_sources[0].activity_reference,
    "Clinical activity",
  );
  assertEquals(allowed(compute(parsed)), 1_500);
  assertEquals(
    inputSchema.safeParse({
      ...parsed,
      credit_sources: [other(-1)],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      ...parsed,
      credit_sources: [other(1_000), other(500)],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      ...parsed,
      credit_sources: [{ ...other(1_000), publicly_traded_partnership: true }],
    }).success,
    false,
  );
});

Deno.test("Form 8582-CR Part I keeps the four IRS categories and prior credits separate", () => {
  const lines = calculateForm8582CRPartI(inputSchema.parse({
    credit_sources: [
      rental(100, 20),
      source(
        PassiveCreditCategory.RehabilitationOrPre1990Housing,
        200,
        30,
        "Rehab",
      ),
      source(PassiveCreditCategory.LowIncomeHousing, 300, 40, "Housing"),
      other(400, 50),
    ],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 9_500,
    modified_agi: 100_000,
    form8582_line9_special_allowance_used: 0,
    filing_status: FilingStatus.Single,
  }));
  assertEquals(lines.rental, { current: 100, prior: 20, total: 120 });
  assertEquals(lines.rehabilitation, {
    current: 200,
    prior: 30,
    total: 230,
  });
  assertEquals(lines.housing, { current: 300, prior: 40, total: 340 });
  assertEquals(lines.other, { current: 400, prior: 50, total: 450 });
  assertEquals([lines.line5, lines.line6, lines.line7], [1_140, 500, 640]);
});

Deno.test("Form 8582-CR rejects negative tax inputs", () => {
  const base = {
    credit_sources: [other(1_000)],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 8_000,
  };
  assertEquals(
    inputSchema.safeParse({
      ...base,
      regular_tax_all_income: -1,
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      ...base,
      regular_tax_without_passive: -1,
    }).success,
    false,
  );
});

Deno.test("Form 8582-CR emits no credit for an empty source list", () => {
  const result = compute({
    credit_sources: [],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 8_000,
  });
  assertEquals(result.outputs, []);
});

Deno.test("Form 8582-CR limits credits to tax on net passive income", () => {
  assertEquals(
    allowed(compute({
      credit_sources: [other(2_000)],
      regular_tax_all_income: 10_000,
      regular_tax_without_passive: 7_000,
    })),
    2_000,
  );
  const capped = compute({
    credit_sources: [other(5_000)],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 9_000,
  });
  assertEquals(allowed(capped), 1_000);
  assertEquals(capped.carryforwards?.suspended_pac_8582cr, 4_000);
  assertEquals(
    allowed(compute({
      credit_sources: [other(3_000)],
      regular_tax_all_income: 10_000,
      regular_tax_without_passive: 10_000,
    })),
    0,
  );
});

Deno.test("Form 8582-CR Part II converts the dollar rental allowance to tax", () => {
  const result = compute({
    credit_sources: [rental(3_000)],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 10_000,
    modified_agi: 80_000,
    form8582_line9_special_allowance_used: 0,
    part_ii_tax_on_income_less_line14: 7_000,
    filing_status: FilingStatus.Single,
  });
  assertEquals(allowed(result), 3_000);
  assertEquals(
    allowed(compute({
      credit_sources: [rental(3_000)],
      regular_tax_all_income: 10_000,
      regular_tax_without_passive: 10_000,
      modified_agi: 120_000,
      form8582_line9_special_allowance_used: 0,
      part_ii_tax_on_income_less_line14: 9_000,
      filing_status: FilingStatus.Single,
    })),
    1_000,
  );
  assertEquals(
    allowed(compute({
      credit_sources: [rental(3_000)],
      regular_tax_all_income: 10_000,
      regular_tax_without_passive: 10_000,
      modified_agi: 160_000,
      form8582_line9_special_allowance_used: 0,
      filing_status: FilingStatus.Single,
    })),
    0,
  );
});

Deno.test("Form 8582-CR Part II subtracts the Form 8582 loss allowance", () => {
  const result = compute({
    credit_sources: [rental(3_000)],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 10_000,
    modified_agi: 100_000,
    form8582_line9_special_allowance_used: 25_000,
    filing_status: FilingStatus.Single,
  });
  assertEquals(allowed(result), 0);
});

Deno.test("Form 8582-CR MFS Part II requires lived-apart facts", () => {
  const base = {
    credit_sources: [rental(3_000)],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 10_000,
    modified_agi: 60_000,
    form8582_line9_special_allowance_used: 0,
    filing_status: FilingStatus.MFS,
  };
  assertEquals(inputSchema.safeParse(base).success, false);
  assertEquals(
    allowed(compute({
      ...base,
      mfs_lived_apart_all_year: false,
    })),
    0,
  );
  assertEquals(
    allowed(compute({
      ...base,
      mfs_lived_apart_all_year: true,
      part_ii_tax_on_income_less_line14: 8_500,
    })),
    1_500,
  );
});

Deno.test("Form 8582-CR Part II needs the tax on income less line 14", () => {
  assertThrows(
    () =>
      compute({
        credit_sources: [rental(3_000)],
        regular_tax_all_income: 10_000,
        regular_tax_without_passive: 10_000,
        modified_agi: 100_000,
        form8582_line9_special_allowance_used: 0,
        filing_status: FilingStatus.Single,
      }),
    Error,
    "line 15 needs tax on income less",
  );
});

Deno.test("Form 8582-CR professional status cannot reclassify all activities", () => {
  assertThrows(
    () =>
      compute({
        credit_sources: [other(4_000)],
        regular_tax_all_income: 20_000,
        regular_tax_without_passive: 15_000,
        is_real_estate_professional: true,
        filing_status: FilingStatus.Single,
      }),
    Error,
    "activity-level material participation",
  );
});

Deno.test("Form 8582-CR Part III limits rehabilitation credit by tax on allowance", () => {
  const result = compute({
    credit_sources: [source(
      PassiveCreditCategory.RehabilitationOrPre1990Housing,
      3_000,
      0,
      "Rehab",
    )],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 10_000,
    modified_agi: 180_000,
    form8582_line9_special_allowance_used: 0,
    part_iii_tax_on_income_less_line26: 7_000,
    filing_status: FilingStatus.Single,
  });
  assertEquals(allowed(result), 3_000);
});

Deno.test("Form 8582-CR Part IV limits post-1989 housing credit by remaining allowance tax", () => {
  const result = compute({
    credit_sources: [source(
      PassiveCreditCategory.LowIncomeHousing,
      4_000,
      0,
      "Housing",
    )],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 10_000,
    modified_agi: 300_000,
    form8582_line9_special_allowance_used: 5_000,
    part_iv_tax_on_income_less_remaining_allowance: 8_000,
    filing_status: FilingStatus.Single,
  });
  assertEquals(allowed(result), 2_000);
  assertEquals(result.carryforwards?.suspended_pac_8582cr, 2_000);
});

Deno.test("Form 8582-CR orders active rental, rehabilitation, then housing allowances", () => {
  const result = compute({
    credit_sources: [
      rental(1_000),
      source(
        PassiveCreditCategory.RehabilitationOrPre1990Housing,
        2_000,
        0,
        "Rehab",
      ),
      source(PassiveCreditCategory.LowIncomeHousing, 2_000, 0, "Housing"),
    ],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 10_000,
    modified_agi: 80_000,
    form8582_line9_special_allowance_used: 0,
    part_ii_tax_on_income_less_line14: 8_000,
    part_iv_tax_on_income_less_remaining_allowance: 6_000,
    filing_status: FilingStatus.Single,
  });
  assertEquals(allowed(result), 4_000);
  assertEquals(result.carryforwards?.suspended_pac_8582cr, 1_000);
});

Deno.test("Form 8582-CR requires Part III and IV worksheet taxes when used", () => {
  const base = {
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 10_000,
    modified_agi: 180_000,
    form8582_line9_special_allowance_used: 0,
    filing_status: FilingStatus.Single,
  };
  assertThrows(
    () =>
      compute({
        ...base,
        credit_sources: [
          source(PassiveCreditCategory.RehabilitationOrPre1990Housing, 2_000),
        ],
      }),
    Error,
    "line 27 needs tax",
  );
  assertThrows(
    () =>
      compute({
        ...base,
        credit_sources: [source(PassiveCreditCategory.LowIncomeHousing, 2_000)],
      }),
    Error,
    "line 35 needs tax",
  );
});

Deno.test("Form 8582-CR MFS lived with spouse skips all three special allowances", () => {
  const result = compute({
    credit_sources: [
      rental(1_000),
      source(PassiveCreditCategory.RehabilitationOrPre1990Housing, 1_000),
      source(PassiveCreditCategory.LowIncomeHousing, 1_000),
    ],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 9_500,
    filing_status: FilingStatus.MFS,
    mfs_lived_apart_all_year: false,
  });
  assertEquals(allowed(result), 500);
  assertEquals(result.carryforwards?.suspended_pac_8582cr, 2_500);
});

Deno.test("Form 8582-CR combines different activity credits before the tax limit", () => {
  const result = compute({
    credit_sources: [rental(5_000), other(2_000)],
    regular_tax_all_income: 12_000,
    regular_tax_without_passive: 10_000,
    modified_agi: 125_000,
    form8582_line9_special_allowance_used: 0,
    part_ii_tax_on_income_less_line14: 8_000,
    filing_status: FilingStatus.MFJ,
  });
  assertEquals(allowed(result), 6_000);
  assertEquals(result.carryforwards?.suspended_pac_8582cr, 1_000);
});
