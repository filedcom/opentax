import { assertEquals, assertThrows } from "@std/assert";
import { f3800 } from "./index.ts";
import { ZERO_FORM3800_PASSIVE_ACTIVITY } from "./calculation.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import { form6251 } from "../../intermediate/forms/form6251/index.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import {
  calculateForm8582CR,
  inputSchema as form8582crInputSchema,
  PassiveCreditCategory,
  PassiveCreditReportingRoute,
  PassiveCreditSourceOrigin,
} from "../../intermediate/forms/form8582cr/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return { ...overrides };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f3800.compute({ taxYear: 2025, formType: "f1040" }, { f3800s: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o: { nodeType: string }) =>
    o.nodeType === nodeType
  );
}

Deno.test("f3800: estate/trust orphan-drug K-1 sources reach the tax limit", () => {
  const result = f3800.compute({ taxYear: 2025, formType: "f1040" }, {
    f8820_k1_credit_entries: [{
      source_type: "trust",
      source_ein: "123456789",
      source_document_reference: "2025 trust K-1",
      credit_amount: 1_250,
      subject_to_passive_activity_limit: false,
    }],
  });
  assertEquals(fieldsOf(result.outputs, f1040)?.form3800_source_credits, {
    standardCredit: 1_250,
    specifiedCredit: 0,
    passiveLines: ZERO_FORM3800_PASSIVE_ACTIVITY,
  });
  assertEquals(fieldsOf(result.outputs, schedule3), {
    form3800_source_credit_pending: true,
  });
  assertThrows(
    () =>
      f3800.compute({ taxYear: 2025, formType: "f1040" }, {
        f8820_k1_credit_entries: [{
          source_type: "trust",
          source_ein: "123456789",
          source_document_reference: "2025 trust K-1",
          credit_amount: 1_250,
          subject_to_passive_activity_limit: true,
        }],
      }),
    Error,
    "needs Form 8582-CR",
  );
});

Deno.test("f3800: distinct K-1 orphan-drug sources add once", () => {
  const credits = [
    {
      source_type: "partnership" as const,
      source_ein: "123456789",
      source_document_reference: "2025 partnership K-1",
      credit_amount: 1_000,
      subject_to_passive_activity_limit: false,
    },
    {
      source_type: "s_corporation" as const,
      source_ein: "987654321",
      source_document_reference: "2025 S corporation K-1",
      credit_amount: 500,
      subject_to_passive_activity_limit: false,
    },
  ];
  const result = f3800.compute({ taxYear: 2025, formType: "f1040" }, {
    f8820_k1_credit_entries: credits,
  });
  assertEquals(
    fieldsOf(result.outputs, f1040)?.form3800_source_credits?.standardCredit,
    1_500,
  );
  assertThrows(
    () =>
      f3800.compute({ taxYear: 2025, formType: "f1040" }, {
        f8820_k1_credit_entries: [credits[0], credits[0]],
      }),
    Error,
    "Duplicate orphan-drug K-1 source",
  );
});

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f3800.inputSchema: empty array fails (min 1)", () => {
  const parsed = f3800.inputSchema.safeParse({ f3800s: [] });
  assertEquals(parsed.success, false);
});

Deno.test("f3800: passive source waits for the shared tax limit without depositing gross credit", () => {
  const pac = calculateForm8582CR(form8582crInputSchema.parse({
    credit_sources: [{
      activity_reference: "Clinical activity",
      source_form: "Form 8820",
      source_origin: { kind: PassiveCreditSourceOrigin.Self },
      source_document_reference: "2025 clinical credit statement",
      category: PassiveCreditCategory.Other,
      reporting_route: PassiveCreditReportingRoute.Form3800Line3,
      form3800_credit_line: "1h",
      current_year_credit: 1_000,
      prior_unallowed_credits: [],
      publicly_traded_partnership: false,
    }],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 9_500,
  }));
  const result = f3800.compute({ taxYear: 2025, formType: "f1040" }, {
    passive_source_allocations: f3800.inputSchema.parse({
      passive_source_allocations: pac.sourceAllocations,
    }).passive_source_allocations,
  });
  assertEquals(fieldsOf(result.outputs, f1040)?.form3800_source_credits, {
    standardCredit: 0,
    specifiedCredit: 0,
    passiveLines: {
      line2: 1_000,
      line3: 500,
      line23: 0,
      line24: 0,
      line32: 0,
      line33: 0,
    },
  });
  assertEquals(fieldsOf(result.outputs, form6251)?.must_file_for_gbc, true);
  assertEquals(
    fieldsOf(result.outputs, schedule3)?.form3800_source_credit_pending,
    true,
  );
  assertEquals(
    fieldsOf(result.outputs, schedule3)?.line6a_general_business_credit,
    undefined,
  );
});

Deno.test("f3800: Form 8835 source credit waits for finalized tax instead of depositing gross credit", () => {
  const result = f3800.compute({ taxYear: 2025, formType: "f1040" }, {
    f8835_credit_entries: [{
      form3800_line: "4e",
      credit_amount: 6_000,
      transfer_out_amount: 2_000,
      registration_number: "REG-1",
      subject_to_passive_activity_limit: false,
      transfer_election_statement_file_name: "Transfer Election Statement.pdf",
    }],
  });
  assertEquals(fieldsOf(result.outputs, f1040)?.form3800_source_credits, {
    standardCredit: 0,
    specifiedCredit: 4_000,
    passiveLines: ZERO_FORM3800_PASSIVE_ACTIVITY,
  });
  assertEquals(fieldsOf(result.outputs, form6251)?.must_file_for_gbc, true);
  assertEquals(
    fieldsOf(result.outputs, schedule3)?.form3800_source_credit_pending,
    true,
  );
  assertEquals(
    fieldsOf(result.outputs, schedule3)?.line6a_general_business_credit,
    undefined,
  );
});

Deno.test("f3800: Form 5884 specified credit waits for the shared limit", () => {
  const result = f3800.compute({ taxYear: 2025, formType: "f1040" }, {
    f5884_credit: {
      credit_amount: 2_400,
      subject_to_passive_activity_limit: false,
    },
  });
  assertEquals(fieldsOf(result.outputs, f1040)?.form3800_source_credits, {
    standardCredit: 0,
    specifiedCredit: 2_400,
    passiveLines: ZERO_FORM3800_PASSIVE_ACTIVITY,
  });
  assertEquals(
    fieldsOf(result.outputs, schedule3)?.form3800_source_credit_pending,
    true,
  );
  assertEquals(
    fieldsOf(result.outputs, schedule3)?.line6a_general_business_credit,
    undefined,
  );
  assertThrows(
    () =>
      f3800.compute({ taxYear: 2025, formType: "f1040" }, {
        f5884_credit: {
          credit_amount: 2_400,
          subject_to_passive_activity_limit: true,
        },
      }),
    Error,
    "8582-CR",
  );
});

Deno.test("f3800: Form 8820 ordinary credit waits for the shared limit", () => {
  const result = f3800.compute({ taxYear: 2025, formType: "f1040" }, {
    f8820_credit: {
      credit_amount: 19_750,
      subject_to_passive_activity_limit: false,
    },
  });
  assertEquals(fieldsOf(result.outputs, f1040)?.form3800_source_credits, {
    standardCredit: 19_750,
    specifiedCredit: 0,
    passiveLines: ZERO_FORM3800_PASSIVE_ACTIVITY,
  });
  assertEquals(fieldsOf(result.outputs, form6251)?.must_file_for_gbc, true);
  assertEquals(
    fieldsOf(result.outputs, schedule3)?.line6a_general_business_credit,
    undefined,
  );
  assertThrows(
    () =>
      f3800.compute({ taxYear: 2025, formType: "f1040" }, {
        f8820_credit: {
          credit_amount: 19_750,
          subject_to_passive_activity_limit: true,
        },
      }),
    Error,
    "8582-CR",
  );
});

Deno.test("f3800: New Markets Credit K-1 sources wait for the shared limit", () => {
  const result = f3800.compute({ taxYear: 2025, formType: "f1040" }, {
    f8874_k1_credit_entries: [{
      source_type: "partnership",
      source_ein: "123456789",
      source_document_reference: "2025 partnership K-1",
      credit_amount: 1_250,
      subject_to_passive_activity_limit: false,
    }],
  });
  assertEquals(fieldsOf(result.outputs, f1040)?.form3800_source_credits, {
    standardCredit: 1_250,
    specifiedCredit: 0,
    passiveLines: ZERO_FORM3800_PASSIVE_ACTIVITY,
  });
  assertEquals(fieldsOf(result.outputs, form6251)?.must_file_for_gbc, true);
  assertEquals(
    fieldsOf(result.outputs, schedule3)?.line6a_general_business_credit,
    undefined,
  );
  assertThrows(
    () =>
      f3800.compute({ taxYear: 2025, formType: "f1040" }, {
        f8874_k1_credit_entries: [
          {
            source_type: "partnership",
            source_ein: "123456789",
            source_document_reference: "2025 partnership K-1",
            credit_amount: 1_250,
            subject_to_passive_activity_limit: false,
          },
          {
            source_type: "partnership",
            source_ein: "123456789",
            source_document_reference: "2025 partnership K-1",
            credit_amount: 1_250,
            subject_to_passive_activity_limit: false,
          },
        ],
      }),
    Error,
    "Duplicate New Markets Credit K-1 source",
  );
});

Deno.test("f3800: estate/trust New Markets Credit needs code ZZ statement identity", () => {
  assertEquals(
    f3800.inputSchema.safeParse({
      f8874_k1_credit_entries: [{
        source_type: "trust",
        source_ein: "123456789",
        source_document_reference: "2025 trust K-1",
        credit_amount: 1_250,
        subject_to_passive_activity_limit: false,
      }],
    }).success,
    false,
  );
});

Deno.test("f3800: new clean vehicle business credit enters the ordinary limit", () => {
  const result = f3800.compute({ taxYear: 2025, formType: "f1040" }, {
    f8936_new_vehicle_credit: {
      credit_amount: 1_875,
      subject_to_passive_activity_limit: false,
    },
  });
  assertEquals(fieldsOf(result.outputs, f1040)?.form3800_source_credits, {
    standardCredit: 1_875,
    specifiedCredit: 0,
    passiveLines: ZERO_FORM3800_PASSIVE_ACTIVITY,
  });
  assertEquals(fieldsOf(result.outputs, form6251)?.must_file_for_gbc, true);
  assertEquals(
    fieldsOf(result.outputs, schedule3)?.line6a_general_business_credit,
    undefined,
  );
  assertThrows(
    () =>
      f3800.compute({ taxYear: 2025, formType: "f1040" }, {
        f8936_new_vehicle_credit: {
          credit_amount: 1_875,
          subject_to_passive_activity_limit: true,
        },
      }),
    Error,
    "8582-CR",
  );
});

Deno.test("f3800: rejects transferred credit larger than its source credit", () => {
  assertThrows(() =>
    f3800.compute({ taxYear: 2025, formType: "f1040" }, {
      f8835_credit_entries: [{
        form3800_line: "4e",
        credit_amount: 1_000,
        transfer_out_amount: 1_001,
        registration_number: "REG-1",
        subject_to_passive_activity_limit: false,
        transfer_election_statement_file_name:
          "Transfer Election Statement.pdf",
      }],
    })
  );
});

Deno.test("f3800: passive Form 8835 credit needs Form 8582-CR before limitation", () => {
  assertThrows(
    () =>
      f3800.compute({ taxYear: 2025, formType: "f1040" }, {
        f8835_credit_entries: [{
          form3800_line: "4e",
          credit_amount: 1_000,
          transfer_out_amount: 0,
          subject_to_passive_activity_limit: true,
        }],
      }),
    Error,
    "8582-CR",
  );
});

Deno.test("f3800: Form 8826 source credit reaches the final tax limit without a gross Schedule 3 deposit", () => {
  const result = f3800.compute({ taxYear: 2025, formType: "f1040" }, {
    f8826_credit_entries: [{
      source_type: "self",
      credit_amount: 2_375,
      subject_to_passive_activity_limit: false,
    }],
  });
  assertEquals(fieldsOf(result.outputs, f1040)?.form3800_source_credits, {
    standardCredit: 2_375,
    specifiedCredit: 0,
    passiveLines: ZERO_FORM3800_PASSIVE_ACTIVITY,
  });
  assertEquals(
    fieldsOf(result.outputs, schedule3)?.line6a_general_business_credit,
    undefined,
  );
});

Deno.test("f3800: passive Form 8826 source credit requires Form 8582-CR", () => {
  assertThrows(
    () =>
      f3800.compute({ taxYear: 2025, formType: "f1040" }, {
        f8826_credit_entries: [{
          source_type: "self",
          credit_amount: 2_375,
          subject_to_passive_activity_limit: true,
        }],
      }),
    Error,
    "8582-CR",
  );
});

Deno.test("f3800: zero Form 8826 source credit produces no Schedule 3 claim", () => {
  const result = f3800.compute({ taxYear: 2025, formType: "f1040" }, {
    f8826_credit_entries: [{
      source_type: "self",
      credit_amount: 0,
      subject_to_passive_activity_limit: false,
    }],
  });
  assertEquals(result.outputs, []);
});

Deno.test("f3800: Form 8826 source type and EIN must agree", () => {
  assertEquals(
    f3800.inputSchema.safeParse({
      f8826_credit_entries: [{
        source_type: "partnership",
        credit_amount: 1_000,
        subject_to_passive_activity_limit: false,
      }],
    }).success,
    false,
  );
  assertEquals(
    f3800.inputSchema.safeParse({
      f8826_credit_entries: [{
        source_type: "self",
        source_ein: "123456789",
        credit_amount: 1_000,
        subject_to_passive_activity_limit: false,
      }],
    }).success,
    false,
  );
});

Deno.test("f3800: source-backed credit cannot combine with unbounded legacy credit", () => {
  assertThrows(
    () =>
      f3800.compute({ taxYear: 2025, formType: "f1040" }, {
        f3800s: [{ research_credit: 100 }],
        f8826_credit_entries: [{
          source_type: "self",
          credit_amount: 200,
          subject_to_passive_activity_limit: false,
        }],
      }),
    Error,
    "unbounded legacy",
  );
});

Deno.test("f3800: direct Form 8826 entries reject duplicate sources and sub-cent credit", () => {
  const entry = {
    source_type: "partnership" as const,
    source_ein: "123456789",
    credit_amount: 200,
    subject_to_passive_activity_limit: false,
  };
  assertThrows(
    () =>
      f3800.compute({ taxYear: 2025, formType: "f1040" }, {
        f8826_credit_entries: [entry, entry],
      }),
    Error,
    "Duplicate Form 8826 credit source",
  );
  assertEquals(
    f3800.inputSchema.safeParse({
      f8826_credit_entries: [{ ...entry, credit_amount: 1.001 }],
    }).success,
    false,
  );
});

Deno.test("f3800: estate and trust disabled-access entries retain K-1 and statement identity", () => {
  const entry = {
    source_type: "trust" as const,
    source_ein: "123456789",
    source_document_reference: "2025 Trust K-1",
    source_statement_reference: "2025 code ZZ access statement",
    credit_amount: 1_250.25,
    subject_to_passive_activity_limit: false,
  };
  assertEquals(
    f3800.inputSchema.safeParse({ f8826_credit_entries: [entry] }).success,
    true,
  );
  for (
    const key of [
      "source_document_reference",
      "source_statement_reference",
    ] as const
  ) {
    const { [key]: _missing, ...withoutReference } = entry;
    assertEquals(
      f3800.inputSchema.safeParse({
        f8826_credit_entries: [withoutReference],
      }).success,
      false,
    );
  }
  assertEquals(
    fieldsOf(
      f3800.compute({ taxYear: 2025, formType: "f1040" }, {
        f8826_credit_entries: [{ ...entry, credit_amount: 5_000.01 }],
      }).outputs,
      f1040,
    )?.form3800_source_credits?.standardCredit,
    5_000,
  );
});

Deno.test("f3800.inputSchema: valid minimal item (empty object) passes", () => {
  const parsed = f3800.inputSchema.safeParse({ f3800s: [{}] });
  assertEquals(parsed.success, true);
});

Deno.test("f3800.inputSchema: negative total_gbc fails", () => {
  const parsed = f3800.inputSchema.safeParse({ f3800s: [{ total_gbc: -100 }] });
  assertEquals(parsed.success, false);
});

Deno.test("f3800.inputSchema: negative work_opportunity_credit fails", () => {
  const parsed = f3800.inputSchema.safeParse({
    f3800s: [{ work_opportunity_credit: -50 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f3800.inputSchema: negative research_credit fails", () => {
  const parsed = f3800.inputSchema.safeParse({
    f3800s: [{ research_credit: -200 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f3800.inputSchema: negative carryforward_credit fails", () => {
  const parsed = f3800.inputSchema.safeParse({
    f3800s: [{ carryforward_credit: -10 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f3800.inputSchema: negative carryback_credit fails", () => {
  const parsed = f3800.inputSchema.safeParse({
    f3800s: [{ carryback_credit: -10 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f3800.inputSchema: valid full item passes", () => {
  const parsed = f3800.inputSchema.safeParse({
    f3800s: [{
      total_gbc: 5000,
      work_opportunity_credit: 1000,
      research_credit: 2000,
      carryforward_credit: 500,
      carryback_credit: 300,
    }],
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Per-Field Routing — Component Credits
// =============================================================================

Deno.test("f3800.compute: total_gbc routes to schedule3.line6a_general_business_credit", () => {
  const result = compute([minimalItem({ total_gbc: 3000 })]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6a_general_business_credit, 3000);
});

Deno.test("f3800.compute: work_opportunity_credit alone routes to schedule3", () => {
  const result = compute([minimalItem({ work_opportunity_credit: 1500 })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6a_general_business_credit, 1500);
});

Deno.test("f3800.compute: research_credit alone routes to schedule3", () => {
  const result = compute([minimalItem({ research_credit: 4000 })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6a_general_business_credit, 4000);
});

Deno.test("f3800.compute: disabled_access_credit alone routes to schedule3", () => {
  const result = compute([minimalItem({ disabled_access_credit: 500 })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6a_general_business_credit, 500);
});

Deno.test("f3800.compute: employer_pension_startup_credit alone routes to schedule3", () => {
  const result = compute([
    minimalItem({ employer_pension_startup_credit: 750 }),
  ]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6a_general_business_credit, 750);
});

Deno.test("f3800.compute: employer_childcare_credit alone routes to schedule3", () => {
  const result = compute([minimalItem({ employer_childcare_credit: 600 })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6a_general_business_credit, 600);
});

Deno.test("f3800.compute: small_employer_health_credit alone routes to schedule3", () => {
  const result = compute([minimalItem({ small_employer_health_credit: 2500 })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6a_general_business_credit, 2500);
});

Deno.test("f3800.compute: new_markets_credit alone routes to schedule3", () => {
  const result = compute([minimalItem({ new_markets_credit: 10000 })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6a_general_business_credit, 10000);
});

Deno.test("f3800.compute: energy_efficient_home_credit alone routes to schedule3", () => {
  const result = compute([minimalItem({ energy_efficient_home_credit: 1000 })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6a_general_business_credit, 1000);
});

Deno.test("f3800.compute: advanced_manufacturing_credit alone routes to schedule3", () => {
  const result = compute([
    minimalItem({ advanced_manufacturing_credit: 3500 }),
  ]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6a_general_business_credit, 3500);
});

Deno.test("f3800.compute: carryforward_credit alone routes to schedule3", () => {
  const result = compute([minimalItem({ carryforward_credit: 800 })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6a_general_business_credit, 800);
});

Deno.test("f3800.compute: carryback_credit alone routes to schedule3", () => {
  const result = compute([minimalItem({ carryback_credit: 400 })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6a_general_business_credit, 400);
});

Deno.test("f3800.compute: empty item — no output", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f3800.compute: all zero fields — no output", () => {
  const result = compute([minimalItem({ total_gbc: 0, research_credit: 0 })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. total_gbc Override Logic
// =============================================================================

Deno.test("f3800.compute: total_gbc overrides sum of components", () => {
  // total_gbc = 5000, components sum = 1000+2000 = 3000, but total_gbc wins
  const result = compute([minimalItem({
    total_gbc: 5000,
    work_opportunity_credit: 1000,
    research_credit: 2000,
  })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6a_general_business_credit, 5000);
});

Deno.test("f3800.compute: carryforward added to total_gbc override", () => {
  // total_gbc = 5000, carryforward = 1000; result = 6000
  const result = compute([minimalItem({
    total_gbc: 5000,
    carryforward_credit: 1000,
  })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6a_general_business_credit, 6000);
});

Deno.test("f3800.compute: carryback added to total_gbc override", () => {
  // total_gbc = 3000, carryback = 500; result = 3500
  const result = compute([minimalItem({
    total_gbc: 3000,
    carryback_credit: 500,
  })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6a_general_business_credit, 3500);
});

Deno.test("f3800.compute: total_gbc zero with non-zero carryforward — routes carryforward only", () => {
  const result = compute([minimalItem({
    total_gbc: 0,
    carryforward_credit: 1200,
  })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6a_general_business_credit, 1200);
});

// =============================================================================
// 4. Aggregation — Component Credits Summed
// =============================================================================

Deno.test("f3800.compute: multiple component credits summed", () => {
  const result = compute([minimalItem({
    work_opportunity_credit: 1000,
    research_credit: 2000,
    disabled_access_credit: 500,
    employer_pension_startup_credit: 750,
    carryforward_credit: 250,
  })]);
  // 1000 + 2000 + 500 + 750 + 250 = 4500
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6a_general_business_credit, 4500);
});

Deno.test("f3800.compute: all component credits plus carryovers summed", () => {
  const result = compute([minimalItem({
    work_opportunity_credit: 1000,
    research_credit: 1000,
    disabled_access_credit: 1000,
    employer_pension_startup_credit: 1000,
    employer_childcare_credit: 1000,
    small_employer_health_credit: 1000,
    new_markets_credit: 1000,
    energy_efficient_home_credit: 1000,
    advanced_manufacturing_credit: 1000,
    carryforward_credit: 500,
    carryback_credit: 500,
  })]);
  // 9 × 1000 + 500 + 500 = 10000
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6a_general_business_credit, 10000);
});

// =============================================================================
// 5. Aggregation — Multiple Items (Multiple Form 3800 Entries)
// =============================================================================

Deno.test("f3800.compute: multiple items summed across entries", () => {
  const result = compute([
    minimalItem({ work_opportunity_credit: 2000 }),
    minimalItem({ research_credit: 3000 }),
  ]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6a_general_business_credit, 5000);
});

Deno.test("f3800.compute: one empty item plus one with credit — only credit counts", () => {
  const result = compute([
    minimalItem(),
    minimalItem({ small_employer_health_credit: 1800 }),
  ]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6a_general_business_credit, 1800);
});

Deno.test("f3800.compute: multiple items produce exactly one schedule3 output", () => {
  const result = compute([
    minimalItem({ work_opportunity_credit: 1000 }),
    minimalItem({ research_credit: 2000 }),
    minimalItem({ carryforward_credit: 500 }),
  ]);
  const schedule3Outputs = result.outputs.filter((o: { nodeType: string }) =>
    o.nodeType === "schedule3"
  );
  assertEquals(schedule3Outputs.length, 1);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6a_general_business_credit, 3500);
});

// =============================================================================
// 6. Hard Validation
// =============================================================================

Deno.test("f3800.compute: throws on negative total_gbc", () => {
  assertThrows(() => compute([minimalItem({ total_gbc: -1000 })]), Error);
});

Deno.test("f3800.compute: throws on negative work_opportunity_credit", () => {
  assertThrows(
    () => compute([minimalItem({ work_opportunity_credit: -500 })]),
    Error,
  );
});

Deno.test("f3800.compute: throws on negative carryforward_credit", () => {
  assertThrows(
    () => compute([minimalItem({ carryforward_credit: -100 })]),
    Error,
  );
});

Deno.test("f3800.compute: zero values do not throw", () => {
  const result = compute([minimalItem({ total_gbc: 0, research_credit: 0 })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 7. Edge Cases
// =============================================================================

Deno.test("f3800.compute: carryforward and carryback only (no current-year) — routes correctly", () => {
  const result = compute([
    minimalItem({ carryforward_credit: 1500, carryback_credit: 300 }),
  ]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6a_general_business_credit, 1800);
});

Deno.test("f3800.compute: single item zero with carryforward zero — no output", () => {
  const result = compute([minimalItem({ carryforward_credit: 0 })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 8. Smoke Test
// =============================================================================

Deno.test("f3800.compute: smoke test — mixed override and carryovers across multiple items", () => {
  const result = compute([
    minimalItem({
      // First 3800 entry: pre-computed total from GBC screen
      total_gbc: 8000,
      carryforward_credit: 2000,
    }),
    minimalItem({
      // Second 3800 entry (GBC attachment): individual components
      work_opportunity_credit: 1500,
      research_credit: 3500,
      disabled_access_credit: 500,
      small_employer_health_credit: 2000,
      carryback_credit: 1000,
    }),
  ]);

  // Item 1: total_gbc override = 8000, + carryforward 2000 = 10000
  // Item 2: 1500 + 3500 + 500 + 2000 = 7500, + carryback 1000 = 8500
  // Grand total = 18500
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6a_general_business_credit, 18500);
  // Only one schedule3 output
  assertEquals(
    result.outputs.filter((o: { nodeType: string }) =>
      o.nodeType === "schedule3"
    ).length,
    1,
  );
});
