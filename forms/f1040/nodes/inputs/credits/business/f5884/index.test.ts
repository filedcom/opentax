import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateForm5884,
  f5884,
  itemSchema,
  TargetGroup,
  VeteranCategory,
} from "./index.ts";
import type { z } from "zod";

type F5884Item = z.infer<typeof itemSchema>;
type WageLocation = F5884Item["wage_records"][number]["deduction_location"];

function wageRecord(
  qualified_wages: number,
  service_period_start_on = "2025-02-01",
  service_period_end_on = "2025-02-28",
  paid_or_incurred_on = service_period_end_on,
  deduction_location: WageLocation = {
    kind: "schedule_c",
    business_reference: "BUSINESS-1",
  },
) {
  return {
    payroll_record_reference:
      `${service_period_start_on}:${service_period_end_on}`,
    deduction_location,
    service_period_start_on,
    service_period_end_on,
    paid_or_incurred_on,
    qualified_wages,
  };
}

function wageRecords(qualifiedWages: number, location?: WageLocation) {
  return qualifiedWages === 0 ? [] : [wageRecord(
    qualifiedWages,
    "2025-02-01",
    "2025-02-28",
    "2025-02-28",
    location,
  )];
}

function minimalItem(overrides: Partial<F5884Item> = {}): F5884Item {
  return {
    employee_reference: "EMP-001",
    target_group: TargetGroup.TanfRecipient,
    hired_on: "2025-01-15",
    certification: {
      path: "certified_by_start",
      swa_certification_reference: "SWA-001",
      certification_received_on: "2025-01-15",
      certification_received_before_claim_confirmed: true,
      revocation: { status: "no_notice_received" },
    },
    qualified_wages_confirmed: true,
    not_prior_employee_confirmed: true,
    not_related_or_dependent_confirmed: true,
    more_than_half_wages_for_trade_or_business_confirmed: true,
    excluded_wages_removed_confirmed: true,
    wage_records: [],
    hours_worked: 0,
    ...overrides,
  };
}

function compute(items: F5884Item[]) {
  return f5884.compute({ taxYear: 2025, formType: "f1040" }, {
    f5884s: items,
    subject_to_passive_activity_limit: false,
  });
}

function findForm3800(result: ReturnType<typeof compute>) {
  return result.outputs.find((o) => o.nodeType === "f3800") as
    | (typeof result.outputs[number] & {
      fields: {
        f5884_credit?: { credit_amount: number };
        subject_to_passive_activity_limit?: boolean;
      };
    })
    | undefined;
}

// ── Schema Validation ────────────────────────────────────────────────────────

Deno.test("schema_rejects_no_employer_or_pass_through_source", () => {
  assertThrows(
    () =>
      f5884.compute({ taxYear: 2025, formType: "f1040" }, {
        f5884s: [],
        subject_to_passive_activity_limit: false,
      }),
    Error,
  );
});

Deno.test("schema_rejects_negative_wages", () => {
  const result = f5884.inputSchema.safeParse({
    f5884s: [minimalItem({
      wage_records: [wageRecord(-100)],
      hours_worked: 400,
    })],
    subject_to_passive_activity_limit: false,
  });
  assertEquals(result.success, false);
});

Deno.test("schema_accepts_valid_item", () => {
  const result = f5884.inputSchema.safeParse({
    f5884s: [
      minimalItem({
        target_group: TargetGroup.ExFelon,
        wage_records: wageRecords(6000),
        hours_worked: 400,
      }),
    ],
    subject_to_passive_activity_limit: false,
  });
  assertEquals(result.success, true);
});

Deno.test("certification by the first workday requires actual receipt by hire", () => {
  const valid = minimalItem();
  assertEquals(itemSchema.safeParse(valid).success, true);
  assertEquals(
    itemSchema.safeParse(minimalItem({
      certification: {
        path: "certified_by_start",
        swa_certification_reference: "SWA-001",
        certification_received_on: "2025-01-16",
        certification_received_before_claim_confirmed: true,
        revocation: { status: "no_notice_received" },
      },
    })).success,
    false,
  );
});

Deno.test("Form 8850 prescreen path enforces offer, signatures, and SWA deadline", () => {
  const certification = {
    path: "form8850_prescreen" as const,
    swa_certification_reference: "SWA-002",
    certification_received_on: "2025-03-01",
    certification_received_before_claim_confirmed: true as const,
    revocation: { status: "no_notice_received" as const },
    job_offer_on: "2025-01-10",
    prescreen_completed_on: "2025-01-10",
    form8850_signed_by_applicant_on: "2025-01-10",
    form8850_signed_by_employer_on: "2025-02-12",
    form8850_submitted_to_swa_on: "2025-02-12",
    eta_form: "9061" as const,
  };
  const parse = (updates: Partial<typeof certification>) =>
    itemSchema.safeParse(minimalItem({
      certification: { ...certification, ...updates },
    })).success;
  assertEquals(parse({}), true);
  assertEquals(parse({ prescreen_completed_on: "2025-01-11" }), false);
  assertEquals(parse({ job_offer_on: "2025-01-16" }), false);
  assertEquals(parse({ form8850_signed_by_applicant_on: "2025-02-13" }), false);
  assertEquals(parse({ form8850_signed_by_employer_on: "2025-02-13" }), false);
  assertEquals(parse({ form8850_submitted_to_swa_on: "2025-02-13" }), false);
  assertEquals(parse({ certification_received_on: "2025-02-11" }), false);
});

Deno.test("revoked certification excludes wages after notice", () => {
  const valid = minimalItem({
    wage_records: wageRecords(6_000),
    hours_worked: 400,
    certification: {
      path: "certified_by_start",
      swa_certification_reference: "SWA-001",
      certification_received_on: "2025-01-15",
      certification_received_before_claim_confirmed: true,
      revocation: {
        status: "revoked_for_false_employee_information",
        notice_received_on: "2025-03-01",
        post_notice_wages_excluded_confirmed: true,
      },
    },
  });
  assertEquals(itemSchema.safeParse(valid).success, true);
  const revocation = valid.certification.revocation;
  if (revocation.status !== "revoked_for_false_employee_information") {
    throw new Error("Expected revoked certification test fixture");
  }
  const parse = (changes: Partial<typeof revocation>) =>
    itemSchema.safeParse({
      ...valid,
      certification: {
        ...valid.certification,
        revocation: { ...revocation, ...changes },
      },
    }).success;
  assertEquals(
    itemSchema.safeParse({
      ...valid,
      wage_records: [wageRecord(6_000, "2025-02-01", "2025-03-02")],
    }).success,
    false,
  );
  assertEquals(parse({ notice_received_on: "2025-01-14" }), false);
  assertEquals(
    itemSchema.safeParse({
      ...valid,
      wage_records: [
        wageRecord(6_000, "2025-02-01", "2025-02-28", "2026-01-01"),
      ],
    }).success,
    false,
  );
  assertEquals(
    parse({
      post_notice_wages_excluded_confirmed: undefined,
    }),
    false,
  );
  const secondYear = minimalItem({
    target_group: TargetGroup.LongTermFamilyAssistance,
    hired_on: "2024-01-15",
    wage_records: [wageRecord(1_000, "2025-02-01", "2025-03-31")],
    hours_worked: 400,
    certification: {
      path: "certified_by_start",
      swa_certification_reference: "SWA-002",
      certification_received_on: "2024-01-15",
      certification_received_before_claim_confirmed: true,
      revocation: {
        status: "revoked_for_false_employee_information",
        notice_received_on: "2025-04-01",
        post_notice_wages_excluded_confirmed: true,
      },
    },
  });
  assertEquals(itemSchema.safeParse(secondYear).success, true);
  assertEquals(
    itemSchema.safeParse({
      ...secondYear,
      wage_records: [
        wageRecord(1_000, "2025-02-01", "2025-03-31", "2025-04-02"),
      ],
    }).success,
    false,
  );
});

Deno.test("successor credit keeps predecessor wage cap and combined hours", () => {
  const successor = {
    predecessor_ein: "123456789",
    predecessor_first_workday_on: "2025-01-01",
    acquisition_on: "2025-04-01",
    substantially_all_business_assets_acquired_confirmed: true as const,
    employee_continued_immediately_confirmed: true as const,
    predecessor_certification_remains_valid_confirmed: true as const,
    predecessor_hours_worked: 100,
    predecessor_first_year_qualified_wages: 2_000,
    wage_periods_start_at_predecessor_confirmed: true as const,
  };
  const item = minimalItem({
    hired_on: "2025-04-01",
    certification: {
      path: "certified_by_start",
      swa_certification_reference: "SWA-001",
      certification_received_on: "2025-01-01",
      certification_received_before_claim_confirmed: true,
      revocation: { status: "no_notice_received" },
    },
    successor_employer: successor,
    wage_records: [wageRecord(6_000, "2025-04-01", "2025-04-30")],
    hours_worked: 300,
  });
  assertEquals(itemSchema.safeParse(item).success, true);
  const lines = calculateForm5884({
    f5884s: [item],
    subject_to_passive_activity_limit: false,
  });
  assertEquals(lines.line1aWages, 0);
  assertEquals(lines.line1bWages, 4_000);
  assertEquals(lines.line1bCredit, 1_600);
  assertEquals(
    itemSchema.safeParse({
      ...item,
      certification: {
        ...item.certification,
        certification_received_on: "2025-01-02",
      },
    }).success,
    false,
  );
  assertEquals(
    itemSchema.safeParse({
      ...item,
      successor_employer: { ...successor, acquisition_on: "2024-12-31" },
    }).success,
    false,
  );
  assertEquals(
    itemSchema.safeParse({
      ...item,
      hired_on: "2026-01-01",
      successor_employer: { ...successor, acquisition_on: "2026-01-01" },
    }).success,
    false,
  );
  assertEquals(
    itemSchema.safeParse({
      ...item,
      hired_on: "2025-04-01",
      successor_employer: {
        ...successor,
        predecessor_first_workday_on: "2024-01-01",
      },
      certification: {
        ...item.certification,
        certification_received_on: "2024-01-01",
      },
    }).success,
    false,
  );
  assertEquals(
    itemSchema.safeParse({
      ...item,
      successor_employer: {
        ...successor,
        predecessor_second_year_qualified_wages: 1_000,
      },
    }).success,
    false,
  );
  const prescreen = {
    path: "form8850_prescreen",
    swa_certification_reference: "SWA-001",
    certification_received_on: "2025-02-01",
    certification_received_before_claim_confirmed: true,
    revocation: { status: "no_notice_received" },
    job_offer_on: "2024-12-20",
    prescreen_completed_on: "2024-12-20",
    form8850_signed_by_applicant_on: "2024-12-20",
    form8850_signed_by_employer_on: "2025-01-20",
    form8850_submitted_to_swa_on: "2025-01-20",
    eta_form: "9061",
  };
  assertEquals(
    itemSchema.safeParse({ ...item, certification: prescreen }).success,
    true,
  );
  assertEquals(
    itemSchema.safeParse({
      ...item,
      certification: {
        ...prescreen,
        form8850_signed_by_employer_on: "2025-01-30",
        form8850_submitted_to_swa_on: "2025-01-30",
      },
    }).success,
    false,
  );
  const capped = {
    ...item,
    wage_records: [
      { ...wageRecord(2_000, "2025-04-01", "2025-04-15"), credited_wages: 2_000 },
      {
        ...wageRecord(4_000, "2025-04-16", "2025-04-30", "2025-04-30", {
          kind: "schedule_c",
          business_reference: "BUSINESS-2",
        }),
        qualified_wages: 4_000,
        credited_wages: 2_000,
      },
    ],
  };
  assertEquals(itemSchema.safeParse(capped).success, true);
  assertEquals(
    calculateForm5884({
      f5884s: [capped],
      subject_to_passive_activity_limit: false,
    }).wageDeductionAllocations,
    [
      {
        location: capped.wage_records[0].deduction_location,
        credit_amount: 800,
      },
      {
        location: capped.wage_records[1].deduction_location,
        credit_amount: 800,
      },
    ],
  );
  assertEquals(
    itemSchema.safeParse({
      ...capped,
      wage_records: [
        capped.wage_records[0],
        { ...capped.wage_records[1], credited_wages: undefined },
      ],
    }).success,
    false,
  );
  assertEquals(
    itemSchema.safeParse({
      ...capped,
      wage_records: [
        capped.wage_records[0],
        { ...capped.wage_records[1], credited_wages: 3_000 },
      ],
    }).success,
    false,
  );
  assertEquals(
    itemSchema.safeParse({
      ...capped,
      wage_records: [
        { ...capped.wage_records[0], credited_wages: 4_000 },
        capped.wage_records[1],
      ],
    }).success,
    false,
  );
});

Deno.test("successor long-term family assistance shares the second-year cap", () => {
  const item = minimalItem({
    target_group: TargetGroup.LongTermFamilyAssistance,
    hired_on: "2025-03-01",
    certification: {
      path: "certified_by_start",
      swa_certification_reference: "SWA-002",
      certification_received_on: "2024-01-15",
      certification_received_before_claim_confirmed: true,
      revocation: { status: "no_notice_received" },
    },
    successor_employer: {
      predecessor_ein: "123456789",
      predecessor_first_workday_on: "2024-01-15",
      acquisition_on: "2025-03-01",
      substantially_all_business_assets_acquired_confirmed: true,
      employee_continued_immediately_confirmed: true,
      predecessor_certification_remains_valid_confirmed: true,
      predecessor_hours_worked: 500,
      predecessor_first_year_qualified_wages: 10_000,
      predecessor_second_year_qualified_wages: 3_000,
      wage_periods_start_at_predecessor_confirmed: true,
    },
    wage_records: [wageRecord(8_000, "2025-03-01", "2025-03-31")],
    hours_worked: 200,
  });
  assertEquals(itemSchema.safeParse(item).success, true);
  const lines = calculateForm5884({
    f5884s: [item],
    subject_to_passive_activity_limit: false,
  });
  assertEquals(lines.line1cWages, 7_000);
  assertEquals(lines.line1cCredit, 3_500);
  assertEquals(
    itemSchema.safeParse({
      ...item,
      hired_on: "2025-03-01",
      successor_employer: {
        ...item.successor_employer!,
        predecessor_first_workday_on: "2023-01-15",
      },
      certification: {
        ...item.certification,
        certification_received_on: "2023-01-15",
      },
    }).success,
    false,
  );
});

Deno.test("payroll rows determine service year and 2025 wage recognition", () => {
  const valid = minimalItem({
    hired_on: "2024-07-01",
    certification: {
      path: "certified_by_start",
      swa_certification_reference: "SWA-2024",
      certification_received_on: "2024-07-01",
      certification_received_before_claim_confirmed: true,
      revocation: { status: "no_notice_received" },
    },
    wage_records: [wageRecord(6_000, "2024-12-01", "2024-12-31", "2025-01-15")],
    hours_worked: 400,
  });
  assertEquals(itemSchema.safeParse(valid).success, true);
  assertEquals(
    calculateForm5884({
      f5884s: [valid],
      subject_to_passive_activity_limit: false,
    }).line1bCredit,
    2_400,
  );
  for (
    const record of [
      wageRecord(6_000, "2025-06-30", "2025-07-01"),
      wageRecord(6_000, "2024-12-01", "2024-12-31", "2024-12-31"),
      wageRecord(6_000, "2024-06-30", "2024-07-31"),
      wageRecord(6_000, "2025-02-28", "2025-02-01"),
    ]
  ) {
    assertEquals(
      itemSchema.safeParse({
        ...valid,
        wage_records: [record],
      }).success,
      false,
    );
  }
  assertEquals(
    itemSchema.safeParse({
      ...valid,
      wage_records: [valid.wage_records[0], valid.wage_records[0]],
    }).success,
    false,
  );
  assertEquals(
    itemSchema.safeParse({
      ...valid,
      first_year_wages: 6_000,
    }).success,
    false,
  );
  assertEquals(
    itemSchema.safeParse({
      ...valid,
      target_group: TargetGroup.TanfRecipient,
      wage_records: [wageRecord(6_000, "2025-07-01", "2025-07-31")],
    }).success,
    false,
  );
  assertEquals(
    itemSchema.safeParse({
      ...valid,
      target_group: TargetGroup.LongTermFamilyAssistance,
      wage_records: [wageRecord(6_000, "2025-07-01", "2025-07-31")],
    }).success,
    true,
  );
});

Deno.test("controlled group allocates line 2 by qualified wages", () => {
  const first = minimalItem({
    employee_reference: "GROUP-1",
    employer_ein: "123456789",
    wage_records: wageRecords(6_000),
    hours_worked: 200,
  });
  const second = minimalItem({
    employee_reference: "GROUP-2",
    employer_ein: "987654321",
    wage_records: wageRecords(6_000, { kind: "entity_return" }),
    hours_worked: 400,
  });
  const group = {
    kind: "controlled_corporations" as const,
    group_classification_document_reference: "2025 group ownership schedule",
    taxpayer_member_ein: "123456789",
    members: [
      { ein: "123456789", business_name: "Taxpayer Company" },
      { ein: "987654321", business_name: "Affiliate Company" },
    ],
  };
  const input = {
    f5884s: [first, second],
    controlled_group: group,
    subject_to_passive_activity_limit: false,
  };
  assertEquals(f5884.inputSchema.safeParse(input).success, true);
  const lines = calculateForm5884(input);
  assertEquals(lines.line1aCredit, 1_500);
  assertEquals(lines.line1bCredit, 2_400);
  assertEquals(lines.groupCredit, 3_900);
  assertEquals(
    lines.controlledGroupShares.map((member) => member.credit_share),
    [1_950, 1_950],
  );
  assertEquals(lines.line2, 1_950);
  assertEquals(lines.line4, 1_950);
  assertEquals(lines.wageDeductionAllocations, [{
    location: first.wage_records[0].deduction_location,
    credit_amount: 1_950,
  }]);
  const routed = f5884.compute({ taxYear: 2025, formType: "f1040" }, input);
  assertEquals(findForm3800(routed)?.fields.f5884_credit?.credit_amount, 1_950);
  assertEquals(
    routed.outputs.find((row) => row.nodeType === "schedule_c")?.fields
      .wotc_wage_reductions,
    [{ business_reference: "BUSINESS-1", credit_amount: 1_950 }],
  );
  assertEquals(
    f5884.inputSchema.safeParse({
      ...input,
      controlled_group: { ...group, taxpayer_member_ein: "111111111" },
    }).success,
    false,
  );
  assertEquals(
    f5884.inputSchema.safeParse({
      ...input,
      controlled_group: {
        ...group,
        group_classification_document_reference: "",
      },
    }).success,
    false,
  );
  assertEquals(
    f5884.inputSchema.safeParse({
      ...input,
      controlled_group: {
        ...group,
        members: [group.members[0], group.members[0]],
      },
    }).success,
    false,
  );
  assertEquals(
    f5884.inputSchema.safeParse({
      ...input,
      controlled_group: {
        ...group,
        members: [
          { ...group.members[0], business_name: "Taxpayer, Inc." },
          group.members[1],
        ],
      },
    }).success,
    false,
  );
  assertEquals(
    f5884.inputSchema.safeParse({
      ...input,
      f5884s: [first, { ...second, employer_ein: "111111111" }],
    }).success,
    false,
  );
  assertEquals(
    f5884.inputSchema.safeParse({
      ...input,
      f5884s: [
        {
          ...first,
          wage_records: wageRecords(6_000, { kind: "entity_return" }),
        },
        second,
      ],
    }).success,
    false,
  );
  assertEquals(
    f5884.inputSchema.safeParse({
      ...input,
      controlled_group: undefined,
    }).success,
    false,
  );
});

Deno.test("controlled-group whole-dollar remainder is assigned once", () => {
  const eins = ["111111111", "222222222", "333333333"];
  const input = {
    f5884s: eins.map((ein, index) =>
      minimalItem({
        employee_reference: `GROUP-${index + 1}`,
        employer_ein: ein,
        wage_records: wageRecords(
          1,
          index === 0
            ? { kind: "schedule_c", business_reference: "BUSINESS-1" }
            : { kind: "entity_return" },
        ),
        hours_worked: 400,
      })
    ),
    controlled_group: {
      kind: "businesses_under_common_control" as const,
      group_classification_document_reference: "2025 common-control schedule",
      taxpayer_member_ein: eins[0],
      members: eins.map((ein, index) => ({
        ein,
        business_name: `Member ${index + 1}`,
      })),
    },
    subject_to_passive_activity_limit: false,
  };
  assertEquals(f5884.inputSchema.safeParse(input).success, true);
  const lines = calculateForm5884(input);
  assertEquals(lines.groupCredit, 1);
  assertEquals(
    lines.controlledGroupShares.map((member) => member.credit_share),
    [1, 0, 0],
  );
  assertEquals(lines.line2, 1);
});

Deno.test("Form 5884 line 2 reduces only its linked employer wages", () => {
  const first = minimalItem({
    employee_reference: "C-1",
    wage_records: wageRecords(6_000),
    hours_worked: 400,
  });
  const second = minimalItem({
    employee_reference: "C-2",
    wage_records: wageRecords(6_000, {
      kind: "schedule_c",
      business_reference: "BUSINESS-2",
    }),
    hours_worked: 200,
  });
  const farm = minimalItem({
    employee_reference: "F-1",
    wage_records: wageRecords(6_000, {
      kind: "schedule_f",
      farm_id: "FARM-1",
    }),
    hours_worked: 400,
  });
  const input = {
    f5884s: [first, second, farm],
    pass_through_credits: [{
      source_type: "partnership" as const,
      entity_ein: "123456789",
      source_document_reference: "2025 K-1 box 15 code J",
      credit_amount: 1_250,
      subject_to_passive_activity_limit: false,
    }],
    subject_to_passive_activity_limit: false,
  };
  assertEquals(f5884.inputSchema.safeParse(input).success, true);
  const lines = calculateForm5884(input);
  assertEquals(lines.line2, 6_300);
  assertEquals(lines.line3, 1_250);
  assertEquals(lines.wageDeductionAllocations, [
    {
      location: first.wage_records[0].deduction_location,
      credit_amount: 2_400,
    },
    {
      location: second.wage_records[0].deduction_location,
      credit_amount: 1_500,
    },
    { location: farm.wage_records[0].deduction_location, credit_amount: 2_400 },
  ]);
  assertEquals(
    calculateForm5884({
      ...input,
      f5884s: [
        first,
        { ...second, wage_records: wageRecords(6_000) },
        farm,
      ],
    }).wageDeductionAllocations,
    [
      {
        location: first.wage_records[0].deduction_location,
        credit_amount: 3_900,
      },
      {
        location: farm.wage_records[0].deduction_location,
        credit_amount: 2_400,
      },
    ],
  );
  const outputs =
    f5884.compute({ taxYear: 2025, formType: "f1040" }, input).outputs;
  assertEquals(
    outputs.find((row) => row.nodeType === "schedule_c")?.fields
      .wotc_wage_reductions,
    [{
      business_reference: "BUSINESS-1",
      credit_amount: 2_400,
    }],
  );
  assertEquals(
    outputs.find((row) => row.nodeType === "schedule_f")?.fields
      .wotc_wage_reductions,
    [{
      farm_id: "FARM-1",
      credit_amount: 2_400,
    }],
  );
});

Deno.test("one employee can split credited wages between business destinations", () => {
  const item = minimalItem({
    wage_records: [
      wageRecord(3_000, "2025-02-01", "2025-02-15", "2025-02-15"),
      wageRecord(
        3_000,
        "2025-02-16",
        "2025-02-28",
        "2025-02-28",
        { kind: "schedule_f", farm_id: "FARM-1" },
      ),
    ],
    hours_worked: 400,
  });
  assertEquals(itemSchema.safeParse(item).success, true);
  assertEquals(
    calculateForm5884({
      f5884s: [item],
      subject_to_passive_activity_limit: false,
    }).wageDeductionAllocations,
    [
      {
        location: item.wage_records[0].deduction_location,
        credit_amount: 1_200,
      },
      {
        location: item.wage_records[1].deduction_location,
        credit_amount: 1_200,
      },
    ],
  );
  assertEquals(
    itemSchema.safeParse({
      ...item,
      wage_records: [
        item.wage_records[0],
        { ...item.wage_records[1], qualified_wages: 4_000 },
      ],
    }).success,
    false,
  );
});

Deno.test("LTFA wage destinations retain separate first- and second-year rates", () => {
  const item = minimalItem({
    target_group: TargetGroup.LongTermFamilyAssistance,
    hired_on: "2024-07-01",
    certification: {
      path: "certified_by_start",
      swa_certification_reference: "SWA-2024",
      certification_received_on: "2024-07-01",
      certification_received_before_claim_confirmed: true,
      revocation: { status: "no_notice_received" },
    },
    wage_records: [
      wageRecord(10_000, "2025-02-01", "2025-02-28"),
      wageRecord(
        10_000,
        "2025-07-01",
        "2025-07-31",
        "2025-07-31",
        { kind: "schedule_f", farm_id: "FARM-1" },
      ),
    ],
    hours_worked: 400,
  });
  assertEquals(itemSchema.safeParse(item).success, true);
  assertEquals(
    calculateForm5884({
      f5884s: [item],
      subject_to_passive_activity_limit: false,
    }).wageDeductionAllocations,
    [
      {
        location: item.wage_records[0].deduction_location,
        credit_amount: 4_000,
      },
      {
        location: item.wage_records[1].deduction_location,
        credit_amount: 5_000,
      },
    ],
  );
});

// ── Zero Output Cases ─────────────────────────────────────────────────────────

Deno.test("zero_wages_produces_no_output", () => {
  const result = compute([
    minimalItem({ wage_records: wageRecords(0), hours_worked: 400 }),
  ]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("under_120_hours_produces_no_output", () => {
  const result = compute([
    minimalItem({ wage_records: wageRecords(6000), hours_worked: 119 }),
  ]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("exactly_0_hours_produces_no_output", () => {
  const result = compute([
    minimalItem({ wage_records: wageRecords(5000), hours_worked: 0 }),
  ]);
  assertEquals(result.outputs.length, 0);
});

// ── Standard Credit Rates ─────────────────────────────────────────────────────

Deno.test("120_to_399_hours_yields_25pct_rate", () => {
  // $6,000 × 25% = $1,500
  const result = compute([
    minimalItem({ wage_records: wageRecords(6000), hours_worked: 200 }),
  ]);
  const out = findForm3800(result);
  assertEquals(out?.fields.f5884_credit?.credit_amount, 1500);
});

Deno.test("400_plus_hours_yields_40pct_rate", () => {
  // $6,000 × 40% = $2,400
  const result = compute([
    minimalItem({ wage_records: wageRecords(6000), hours_worked: 400 }),
  ]);
  const out = findForm3800(result);
  assertEquals(out?.fields.f5884_credit?.credit_amount, 2400);
});

Deno.test("exactly_120_hours_yields_25pct_rate", () => {
  // $3,000 × 25% = $750
  const result = compute([
    minimalItem({ wage_records: wageRecords(3000), hours_worked: 120 }),
  ]);
  const out = findForm3800(result);
  assertEquals(out?.fields.f5884_credit?.credit_amount, 750);
});

// ── Wage Cap ──────────────────────────────────────────────────────────────────

Deno.test("wages_capped_at_6000_for_standard_groups", () => {
  // $10,000 wages, 400+ hours → capped at $6,000 × 40% = $2,400
  const result = compute([
    minimalItem({ wage_records: wageRecords(10000), hours_worked: 400 }),
  ]);
  const out = findForm3800(result);
  assertEquals(out?.fields.f5884_credit?.credit_amount, 2400);
});

Deno.test("summer_youth_capped_at_3000", () => {
  // $5,000 wages, 400 hours, summer youth → capped at $3,000 × 40% = $1,200
  const result = compute([minimalItem({
    target_group: TargetGroup.SummerYouth,
    wage_records: wageRecords(5000),
    hours_worked: 400,
    summer_youth_zone_and_service_period_confirmed: true,
  })]);
  const out = findForm3800(result);
  assertEquals(out?.fields.f5884_credit?.credit_amount, 1200);
});

// ── Long-Term Family Assistance (Group 9) ────────────────────────────────────

Deno.test("ltfa_uses_first_and_second_year_wages", () => {
  // First year: $10,000 × 40% = $4,000; Second year: $10,000 × 50% = $5,000 → total $9,000
  const result = compute([minimalItem({
    target_group: TargetGroup.LongTermFamilyAssistance,
    hired_on: "2024-07-01",
    certification: {
      path: "certified_by_start",
      swa_certification_reference: "SWA-001",
      certification_received_on: "2024-07-01",
      certification_received_before_claim_confirmed: true,
      revocation: { status: "no_notice_received" },
    },
    wage_records: [
      wageRecord(10_000, "2025-02-01", "2025-02-28"),
      wageRecord(10_000, "2025-07-01", "2025-07-31"),
    ],
    hours_worked: 400,
  })]);
  const out = findForm3800(result);
  assertEquals(out?.fields.f5884_credit?.credit_amount, 9000);
});

Deno.test("ltfa_first_year_only_no_second_year", () => {
  // $8,000 × 40% = $3,200
  const result = compute([minimalItem({
    target_group: TargetGroup.LongTermFamilyAssistance,
    wage_records: wageRecords(8000),
    hours_worked: 400,
  })]);
  const out = findForm3800(result);
  assertEquals(out?.fields.f5884_credit?.credit_amount, 3200);
});

Deno.test("ltfa_requires_at_least_120_hours", () => {
  const belowMinimum = compute([minimalItem({
    target_group: TargetGroup.LongTermFamilyAssistance,
    wage_records: wageRecords(5000),
    hours_worked: 119,
  })]);
  const atMinimum = compute([minimalItem({
    target_group: TargetGroup.LongTermFamilyAssistance,
    wage_records: wageRecords(5000),
    hours_worked: 120,
  })]);
  assertEquals(belowMinimum.outputs.length, 0);
  assertEquals(
    findForm3800(atMinimum)?.fields.f5884_credit?.credit_amount,
    1250,
  );
});

Deno.test("ltfa_wage_cap_10000_per_tier", () => {
  // $15,000 first-year → capped at $10,000 × 40% = $4,000
  const result = compute([minimalItem({
    target_group: TargetGroup.LongTermFamilyAssistance,
    hired_on: "2024-07-01",
    certification: {
      path: "certified_by_start",
      swa_certification_reference: "SWA-001",
      certification_received_on: "2024-07-01",
      certification_received_before_claim_confirmed: true,
      revocation: { status: "no_notice_received" },
    },
    wage_records: [
      wageRecord(15_000, "2025-02-01", "2025-02-28"),
      wageRecord(15_000, "2025-07-01", "2025-07-31"),
    ],
    hours_worked: 400,
  })]);
  const out = findForm3800(result);
  assertEquals(out?.fields.f5884_credit?.credit_amount, 9000); // 4000 + 5000
});

// ── Aggregation ───────────────────────────────────────────────────────────────

Deno.test("multiple_employees_aggregate", () => {
  // Employee A: $6,000 × 40% = $2,400; Employee B: $4,000 × 40% = $1,600 → $4,000
  const result = compute([
    minimalItem({ wage_records: wageRecords(6000), hours_worked: 400 }),
    minimalItem({
      employee_reference: "EMP-002",
      target_group: TargetGroup.ExFelon,
      wage_records: wageRecords(4000),
      hours_worked: 400,
    }),
  ]);
  const out = findForm3800(result);
  assertEquals(out?.fields.f5884_credit?.credit_amount, 4000);
});

Deno.test("routes_to_form3800", () => {
  const result = compute([
    minimalItem({ wage_records: wageRecords(6000), hours_worked: 400 }),
  ]);
  assertEquals(result.outputs[0]?.nodeType, "f3800");
});

// ── Veteran Subcategories ─────────────────────────────────────────────────────

Deno.test("disabled_veteran_cap_12000", () => {
  // $15,000 × 40% → capped at $12,000 × 40% = $4,800
  const result = compute([minimalItem({
    target_group: TargetGroup.VeteranFoodStamp,
    wage_records: wageRecords(15000),
    hours_worked: 400,
    veteran_category: VeteranCategory.DisabledRecentlyDischarged,
  })]);
  const out = findForm3800(result);
  assertEquals(out?.fields.f5884_credit?.credit_amount, 4800);
});

Deno.test("disabled_veteran_long_term_cap_14000", () => {
  // $20,000 × 40% → capped at $14,000 × 40% = $5,600
  const result = compute([minimalItem({
    target_group: TargetGroup.VeteranFoodStamp,
    wage_records: wageRecords(20000),
    hours_worked: 400,
    veteran_category: VeteranCategory.LongTermUnemployed,
  })]);
  const out = findForm3800(result);
  assertEquals(out?.fields.f5884_credit?.credit_amount, 5600);
});

Deno.test("disabled_long_term_unemployed_veteran_cap_24000", () => {
  const result = compute([minimalItem({
    target_group: TargetGroup.VeteranFoodStamp,
    wage_records: wageRecords(30_000),
    hours_worked: 400,
    veteran_category: VeteranCategory.DisabledLongTermUnemployed,
  })]);
  assertEquals(
    findForm3800(result)?.fields.f5884_credit?.credit_amount,
    9_600,
  );
});

Deno.test("work opportunity credit requires certified, distinct, qualified employees", () => {
  const valid = minimalItem({
    wage_records: wageRecords(6_000),
    hours_worked: 400,
  });
  for (
    const item of [
      { ...valid, certification: undefined },
      {
        ...valid,
        wage_deduction_location: {
          kind: "schedule_c",
          business_reference: "BUSINESS-1",
        },
      },
      {
        ...valid,
        wage_records: [{
          ...valid.wage_records[0],
          deduction_location: undefined,
        }],
      },
      {
        ...valid,
        wage_records: wageRecords(6_000, { kind: "entity_return" }),
      },
      { ...valid, hired_on: "2026-01-01" },
      { ...valid, not_prior_employee_confirmed: undefined },
      { ...valid, not_related_or_dependent_confirmed: undefined },
      { ...valid, qualified_wages_confirmed: undefined },
      { ...valid, excluded_wages_removed_confirmed: undefined },
      {
        ...valid,
        more_than_half_wages_for_trade_or_business_confirmed: undefined,
      },
      { ...valid, target_group: TargetGroup.VeteranFoodStamp },
      { ...valid, target_group: TargetGroup.SummerYouth },
      { ...valid, target_group: TargetGroup.DesignatedCommunityResident },
      {
        ...valid,
        wage_records: [wageRecord(1_000, "2026-01-15", "2026-01-31")],
      },
    ]
  ) {
    assertEquals(
      f5884.inputSchema.safeParse({
        f5884s: [item],
        subject_to_passive_activity_limit: false,
      }).success,
      false,
    );
  }
  assertEquals(
    f5884.inputSchema.safeParse({
      f5884s: [valid, valid],
      subject_to_passive_activity_limit: false,
    }).success,
    false,
  );
});

Deno.test("Form 5884 separates pass-through-only and mixed source credits", () => {
  const partnership = {
    source_type: "partnership" as const,
    entity_ein: "123456789",
    source_document_reference: "2025 K-1 box 15 code J",
    credit_amount: 1_250,
    subject_to_passive_activity_limit: false,
  };
  const passThroughOnly = {
    f5884s: [],
    pass_through_credits: [partnership],
    subject_to_passive_activity_limit: false,
  };
  assertEquals(f5884.inputSchema.safeParse(passThroughOnly).success, true);
  assertEquals(calculateForm5884(f5884.inputSchema.parse(passThroughOnly)), {
    line1aWages: 0,
    line1aCredit: 0,
    line1bWages: 0,
    line1bCredit: 0,
    line1cWages: 0,
    line1cCredit: 0,
    groupCredit: 0,
    controlledGroupShares: [],
    line2: 0,
    line3: 1_250,
    line4: 1_250,
    wageDeductionAllocations: [],
  });
  const onlyOutput = f5884.compute(
    { taxYear: 2025, formType: "f1040" },
    passThroughOnly,
  );
  assertEquals(onlyOutput.outputs[0]?.nodeType, "f3800");
  assertEquals(
    (onlyOutput.outputs[0]?.fields.f5884_credit as
      | { credit_amount: number }
      | undefined)?.credit_amount,
    1_250,
  );
  const mixed = {
    ...passThroughOnly,
    f5884s: [
      minimalItem({ wage_records: wageRecords(6_000), hours_worked: 400 }),
    ],
  };
  const mixedLines = calculateForm5884(f5884.inputSchema.parse(mixed));
  assertEquals(mixedLines.line2, 2_400);
  assertEquals(mixedLines.line3, 1_250);
  assertEquals(mixedLines.line4, 3_650);
  assertEquals(
    f5884.inputSchema.safeParse({
      ...passThroughOnly,
      pass_through_credits: [partnership, partnership],
    }).success,
    false,
  );
  assertEquals(
    (f5884.compute({ taxYear: 2025, formType: "f1040" }, {
      ...passThroughOnly,
      pass_through_credits: [{
        ...partnership,
        subject_to_passive_activity_limit: true,
      }],
    }).outputs[0]?.fields.f5884_credit as {
      subject_to_passive_activity_limit: boolean;
    } | undefined)?.subject_to_passive_activity_limit,
    true,
  );
});
