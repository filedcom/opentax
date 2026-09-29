import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateForm8582CR,
  calculateForm8582CRPartI,
  form8582cr,
  inputSchema,
  PassiveCreditCategory,
  PassiveCreditReportingRoute,
  PassiveCreditSourceOrigin,
} from "./index.ts";
import { FilingStatus } from "../../../types.ts";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import { f3800 } from "../../../inputs/f3800/index.ts";
import { creditSourceSchema } from "./source.ts";

function source(
  category: PassiveCreditCategory,
  current: number,
  prior = 0,
  activity = "Rental house",
) {
  return {
    activity_reference: activity,
    source_form: "Form 8820",
    source_origin: { kind: PassiveCreditSourceOrigin.Self },
    source_document_reference: `2025 ${activity} credit statement`,
    category,
    reporting_route: PassiveCreditReportingRoute.Form3800Line3,
    form3800_credit_line: "1h" as const,
    current_year_credit: current,
    prior_unallowed_credits: prior > 0
      ? [{
        originating_tax_year: 2024,
        credit_amount: prior,
        source_document_reference:
          `2024 ${activity} credit carryover statement`,
        actively_participated_origin_year: category ===
            PassiveCreditCategory.ActiveRental
          ? true
          : undefined,
      }]
      : [],
    publicly_traded_partnership: false,
  };
}

function other(current: number, prior = 0, activity = "Clinical activity") {
  return source(PassiveCreditCategory.Other, current, prior, activity);
}

function rental(current: number, prior = 0, activity = "Rental house") {
  return source(PassiveCreditCategory.ActiveRental, current, prior, activity);
}

Deno.test("Form 8582-CR requires the passive K-1 orphan-drug amount in activity sources", () => {
  const evidence = {
    source_type: "partnership" as const,
    source_ein: "123456789",
    source_document_reference: "2025 clinical K-1",
    credit_amount: 500,
  };
  const activity = {
    ...other(500),
    source_document_reference: evidence.source_document_reference,
    source_origin: {
      kind: PassiveCreditSourceOrigin.Partnership,
      entity_reference: "Clinical partnership",
      ein: evidence.source_ein,
    },
  };
  const facts = {
    credit_sources: [activity],
    required_orphan_drug_k1_credits: [evidence],
    regular_tax_all_income: 0,
    regular_tax_without_passive: 0,
  };
  assertEquals(inputSchema.safeParse(facts).success, true);
  assertEquals(
    inputSchema.safeParse({
      ...facts,
      credit_sources: [],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      ...facts,
      credit_sources: [{ ...activity, current_year_credit: 499 }],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      ...facts,
      credit_sources: [
        {
          ...activity,
          activity_reference: "Clinical site A",
          current_year_credit: 200,
        },
        {
          ...activity,
          activity_reference: "Clinical site B",
          current_year_credit: 300,
        },
      ],
    }).success,
    true,
  );
});

Deno.test("Form 8582-CR requires passive New Markets K-1 activity and statement identity", () => {
  const evidence = {
    source_type: "trust" as const,
    source_ein: "123456789",
    source_document_reference: "2025 trust K-1",
    source_statement_reference: "New Markets statement",
    credit_amount: 500,
  };
  const activity = {
    ...other(500),
    source_form: "Form 8874",
    form3800_credit_line: "1i" as const,
    source_document_reference: evidence.source_document_reference,
    source_statement_reference: evidence.source_statement_reference,
    source_origin: {
      kind: PassiveCreditSourceOrigin.Trust,
      entity_reference: "Community trust",
      ein: evidence.source_ein,
    },
  };
  const facts = {
    credit_sources: [activity],
    required_new_markets_k1_credits: [evidence],
    regular_tax_all_income: 0,
    regular_tax_without_passive: 0,
  };
  assertEquals(inputSchema.safeParse(facts).success, true);
  assertEquals(
    inputSchema.safeParse({
      ...facts,
      credit_sources: [{ ...activity, current_year_credit: 499 }],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      ...facts,
      credit_sources: [{
        ...activity,
        source_statement_reference: "Other statement",
      }],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      ...facts,
      required_new_markets_k1_credits: [{
        ...evidence,
        source_statement_reference: undefined,
      }],
    }).success,
    false,
  );
});

Deno.test("Form 8582-CR matches each self-earned passive New Markets activity", () => {
  const activity = {
    ...other(500, 0, "Community venture"),
    source_form: "Form 8874",
    form3800_credit_line: "1i" as const,
    source_document_reference: "2025 community venture QEI",
  };
  const evidence = {
    activity_reference: activity.activity_reference,
    source_document_reference: activity.source_document_reference,
    credit_amount: 500,
  };
  const facts = {
    credit_sources: [activity],
    required_new_markets_self_credits: [evidence],
    regular_tax_all_income: 2_000,
    regular_tax_without_passive: 1_500,
  };
  assertEquals(inputSchema.safeParse(facts).success, true);
  assertEquals(
    inputSchema.safeParse({
      ...facts,
      credit_sources: [{ ...activity, current_year_credit: 499 }],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      ...facts,
      credit_sources: [{ ...activity, source_document_reference: "Other QEI" }],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      ...facts,
      required_new_markets_self_credits: [evidence, evidence],
    }).success,
    false,
  );
});

Deno.test("Form 8582-CR reconciles rounded disabled-access K-1 activity credits", () => {
  const evidence = {
    source_type: "partnership" as const,
    source_ein: "123456789",
    source_document_reference: "2025 access K-1",
    credit_amount: 500.25,
  };
  const activity = {
    ...other(500),
    source_form: "Form 8826",
    form3800_credit_line: "1e" as const,
    source_document_reference: evidence.source_document_reference,
    source_origin: {
      kind: PassiveCreditSourceOrigin.Partnership,
      entity_reference: "Access partnership",
      ein: evidence.source_ein,
    },
  };
  const facts = {
    credit_sources: [activity],
    required_disabled_access_k1_credits: [evidence],
    regular_tax_all_income: 0,
    regular_tax_without_passive: 0,
  };
  assertEquals(inputSchema.safeParse(facts).success, true);
  assertEquals(
    inputSchema.safeParse({
      ...facts,
      credit_sources: [
        {
          ...activity,
          activity_reference: "Access site A",
          current_year_credit: 200,
        },
        {
          ...activity,
          activity_reference: "Access site B",
          current_year_credit: 300,
        },
      ],
    }).success,
    true,
  );
  assertEquals(
    inputSchema.safeParse({
      ...facts,
      credit_sources: [{ ...activity, current_year_credit: 501 }],
    }).success,
    false,
  );
});

Deno.test("Form 8582-CR source origin requires pass-through EIN or missing-EIN reason", () => {
  assertEquals(
    creditSourceSchema.safeParse({
      ...other(100),
      source_origin: {
        kind: PassiveCreditSourceOrigin.Partnership,
        entity_reference: "Clinical partnership",
        ein: "123456789",
      },
    }).success,
    true,
  );
  assertEquals(
    creditSourceSchema.safeParse({
      ...other(100),
      source_origin: {
        kind: PassiveCreditSourceOrigin.SCorporation,
        entity_reference: "Clinical S corporation",
        missing_ein_reason: "APPLD FOR",
      },
    }).success,
    true,
  );
  for (
    const kind of [
      PassiveCreditSourceOrigin.Estate,
      PassiveCreditSourceOrigin.Trust,
      PassiveCreditSourceOrigin.Cooperative,
    ]
  ) {
    assertEquals(
      creditSourceSchema.safeParse({
        ...other(100),
        source_origin: {
          kind,
          entity_reference: "Clinical pass-through",
          ein: "123456789",
        },
      }).success,
      true,
    );
  }
  assertEquals(
    creditSourceSchema.safeParse({
      ...other(100),
      source_origin: {
        kind: PassiveCreditSourceOrigin.Partnership,
        entity_reference: "Clinical partnership",
      },
    }).success,
    false,
  );
  assertEquals(
    creditSourceSchema.safeParse({
      ...other(100),
      source_origin: {
        kind: PassiveCreditSourceOrigin.Self,
        ein: "123456789",
      },
    }).success,
    false,
  );
});

Deno.test("Form 8582-CR estate and trust disabled-access sources identify their code ZZ statement", () => {
  for (
    const kind of [
      PassiveCreditSourceOrigin.Estate,
      PassiveCreditSourceOrigin.Trust,
    ]
  ) {
    const credit = {
      ...other(100),
      source_form: "Form 8826",
      form3800_credit_line: "1e",
      source_origin: {
        kind,
        entity_reference: "Access entity",
        ein: "123456789",
      },
    };
    assertEquals(creditSourceSchema.safeParse(credit).success, false);
    assertEquals(
      creditSourceSchema.safeParse({
        ...credit,
        source_statement_reference: "2025 code ZZ disabled-access statement",
      }).success,
      true,
    );
  }
});

function compute(input: Record<string, unknown>) {
  return form8582cr.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(input),
  );
}

function allowed(result: ReturnType<typeof compute>): number {
  return fieldsOf(result.outputs, f3800)?.passive_source_allocations?.reduce(
    (sum, source) => sum + source.allowed_credit,
    0,
  ) ?? 0;
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
  assertEquals(
    parsed.credit_sources[0].prior_unallowed_credits[0].originating_tax_year,
    2024,
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
      credit_sources: [{
        ...other(100),
        reporting_route: undefined,
      }],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      ...parsed,
      credit_sources: [{
        ...other(100),
        form3800_credit_line: undefined,
      }],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      ...parsed,
      credit_sources: [{
        ...other(100),
        form3800_credit_line: "1r",
      }],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      ...parsed,
      credit_sources: [{
        ...other(100),
        reporting_route: PassiveCreditReportingRoute.Form3800Line33,
        form3800_credit_line: "1h",
      }],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      ...parsed,
      credit_sources: [{
        ...other(100),
        form3800_credit_line: "2h",
      }],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      ...parsed,
      credit_sources: [{
        ...other(0, 500),
        source_form: "Form 8931",
        source_origin: { kind: PassiveCreditSourceOrigin.Self },
        form3800_credit_line: "2h",
      }],
    }).success,
    true,
  );
  assertEquals(
    inputSchema.safeParse({
      ...parsed,
      credit_sources: [{
        ...other(100),
        reporting_route: PassiveCreditReportingRoute.Form8834,
      }],
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
  assertEquals(
    inputSchema.safeParse({
      ...parsed,
      credit_sources: [{
        ...other(1_000),
        prior_unallowed_credits: [{
          originating_tax_year: 2025,
          credit_amount: 100,
          source_document_reference: "invalid future carryover",
        }],
      }],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      ...parsed,
      credit_sources: [{
        ...rental(0, 500),
        prior_unallowed_credits: [{
          originating_tax_year: 2024,
          credit_amount: 500,
          source_document_reference: "2024 inactive rental credit",
          actively_participated_origin_year: false,
        }],
      }],
      filing_status: FilingStatus.Single,
      modified_agi: 100_000,
      form8582_line9_special_allowance_used: 0,
    }).success,
    false,
  );
});

Deno.test("Form 8582-CR sends business credits to Form 3800, not Schedule 3", () => {
  const result = compute({
    credit_sources: [other(1_000, 500)],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 9_000,
  });
  assertEquals(result.outputs.map((item) => item.nodeType), ["f3800"]);
  assertEquals(allowed(result), 1_000);
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
  const input = {
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
  };
  const result = compute(input);
  assertEquals(allowed(result), 4_000);
  assertEquals(result.carryforwards?.suspended_pac_8582cr, 1_000);
  const lines = calculateForm8582CR(inputSchema.parse(input));
  assertEquals(
    lines.sourceAllocations.map((source) => [
      source.special_allowed_credit,
      source.unallowed_credit,
    ]),
    [[1_000, 0], [1_000, 1_000], [2_000, 0]],
  );
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
  const lines = calculateForm8582CR(inputSchema.parse({
    credit_sources: [rental(1_000)],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 9_500,
    filing_status: FilingStatus.MFS,
    mfs_lived_apart_all_year: false,
  }));
  assertEquals(lines.partI.rental.total, 0);
  assertEquals(lines.partI.other.total, 1_000);
  assertEquals(
    lines.sourceAllocations[0].category,
    PassiveCreditCategory.Other,
  );
});

Deno.test("Form 8582-CR separates prior rental credit without origin-year participation", () => {
  const lines = calculateForm8582CRPartI(inputSchema.parse({
    credit_sources: [
      rental(100),
      {
        ...source(PassiveCreditCategory.Other, 0, 500),
        prior_unallowed_credits: [{
          originating_tax_year: 2024,
          credit_amount: 500,
          source_document_reference: "2024 nonactive rental carryover",
          actively_participated_origin_year: false,
        }],
      },
    ],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 9_400,
    filing_status: FilingStatus.Single,
    modified_agi: 100_000,
    form8582_line9_special_allowance_used: 0,
  }));
  assertEquals(lines.rental, { current: 100, prior: 0, total: 100 });
  assertEquals(lines.other, { current: 0, prior: 500, total: 500 });
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

Deno.test("Form 8582-CR worksheets 5 and 8 allocate special and suspended credit by source", () => {
  const lines = calculateForm8582CR(inputSchema.parse({
    credit_sources: [
      rental(1_000, 0, "Rental A"),
      rental(3_000, 0, "Rental B"),
      other(2_000),
    ],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 9_000,
    modified_agi: 100_000,
    form8582_line9_special_allowance_used: 0,
    part_ii_tax_on_income_less_line14: 8_000,
    filing_status: FilingStatus.Single,
  }));
  assertEquals([lines.partI.line5, lines.line37, lines.suspendedCredit], [
    6_000,
    3_000,
    3_000,
  ]);
  assertEquals(
    lines.sourceAllocations.map((source) => [
      source.activity_reference,
      source.special_allowed_credit,
      source.unallowed_credit,
      source.allowed_credit,
    ]),
    [
      ["Rental A", 500, 375, 625],
      ["Rental B", 1_500, 1_125, 1_875],
      ["Clinical activity", 0, 1_500, 500],
    ],
  );
});

Deno.test("Form 8582-CR allocation preserves exact dollars and source identity", () => {
  const lines = calculateForm8582CR(inputSchema.parse({
    credit_sources: [other(1, 0, "A"), other(1, 0, "B"), other(1, 0, "C")],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 9_998,
  }));
  assertEquals(
    lines.sourceAllocations.map((source) => source.unallowed_credit),
    [
      1,
      0,
      0,
    ],
  );
  assertEquals(lines.sourceAllocations.map((source) => source.allowed_credit), [
    0,
    1,
    1,
  ]);
  assertEquals(
    lines.sourceAllocations[0].source_document_reference,
    "2025 A credit statement",
  );
});

Deno.test("Form 8582-CR keeps carryover vintages on their activity source", () => {
  const lines = calculateForm8582CR(inputSchema.parse({
    credit_sources: [{
      ...other(0, 0, "Clinical activity"),
      prior_unallowed_credits: [{
        originating_tax_year: 2022,
        credit_amount: 400,
        source_document_reference: "2022 suspended clinical credit",
      }, {
        originating_tax_year: 2024,
        credit_amount: 600,
        source_document_reference: "2024 suspended clinical credit",
      }],
    }],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 9_700,
  }));
  assertEquals(lines.partI.other.prior, 1_000);
  assertEquals(lines.sourceAllocations[0].allowed_credit, 300);
  assertEquals(lines.sourceAllocations[0].unallowed_credit, 700);
  assertEquals(
    lines.sourceAllocations[0].prior_unallowed_credits.map((credit) =>
      credit.originating_tax_year
    ),
    [2022, 2024],
  );
});

Deno.test("Form 8582-CR keeps allowed credits in their explicit filing routes", () => {
  const lines = calculateForm8582CR(inputSchema.parse({
    credit_sources: [
      other(200, 0, "Standard credit"),
      {
        ...other(300, 0, "Specified credit"),
        reporting_route: PassiveCreditReportingRoute.Form3800Line33,
        form3800_credit_line: "4d",
      },
      {
        ...other(100, 0, "Empowerment credit"),
        reporting_route: PassiveCreditReportingRoute.Form3800Line24,
        form3800_credit_line: "3",
      },
    ],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 9_400,
  }));
  assertEquals(lines.allowedByReportingRoute, {
    [PassiveCreditReportingRoute.Form3800Line3]: 200,
    [PassiveCreditReportingRoute.Form3800Line24]: 100,
    [PassiveCreditReportingRoute.Form3800Line33]: 300,
    [PassiveCreditReportingRoute.Form8834]: 0,
  });
});

Deno.test("Form 8582-CR does not send Form 8834 allowed credit to Schedule 3 line 6a", () => {
  const { form3800_credit_line: _line, ...creditSource } = other(100);
  assertThrows(
    () =>
      compute({
        credit_sources: [{
          ...creditSource,
          source_form: "Form 8834",
          source_origin: { kind: PassiveCreditSourceOrigin.Self },
          reporting_route: PassiveCreditReportingRoute.Form8834,
        }],
        regular_tax_all_income: 10_000,
        regular_tax_without_passive: 9_900,
      }),
    Error,
    "separate filing route",
  );
});
