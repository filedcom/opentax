import { assertEquals, assertThrows } from "@std/assert";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { agi_aggregator } from "../../aggregation/agi_aggregator/index.ts";
import { schedule2 } from "../../aggregation/schedule2/index.ts";
import { form8959 } from "../form8959/index.ts";
import { form8919 } from "../form8919/index.ts";
import { calculateForm4137, form4137, inputSchema } from "./index.ts";

const employer = {
  name: "CAFE",
  ein: "12-3456789",
  tips_received: 5_000,
  tips_reported: 2_000,
};

function compute(input: Record<string, unknown>) {
  return form4137.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(input),
  );
}

Deno.test("Form 4137 requires employer rows when W-2 has allocated tips", () => {
  assertThrows(
    () =>
      compute({
        w2_tip_sources: [{
          allocated_tips: 500,
          ss_wages_and_tips: 30_000,
        }],
      }),
    Error,
    "need employer tip records",
  );
});

Deno.test("Form 4137 calculates unreported income, SS tax and Medicare tax from rows", () => {
  const result = compute({
    forms: [{
      recipient: "taxpayer",
      employers: [employer],
      ss_wages_from_w2: 30_000,
    }],
    w2_tip_sources: [{
      employer_name: "CAFE",
      employer_ein: "12-3456789",
      allocated_tips: 2_500,
      ss_wages_and_tips: 30_000,
    }],
  });
  assertEquals(fieldsOf(result.outputs, f1040)?.line1c_unreported_tips, 3_000);
  assertEquals(
    fieldsOf(result.outputs, agi_aggregator)?.line1c_unreported_tips,
    3_000,
  );
  assertEquals(
    fieldsOf(result.outputs, schedule2)?.line5_unreported_tip_tax,
    230,
  );
  assertEquals(fieldsOf(result.outputs, form8959)?.unreported_tips, 3_000);
  assertEquals(fieldsOf(result.outputs, form8919)?.form4137_sources, [{
    recipient: "taxpayer",
    line10_ss_tips: 3_000,
  }]);
});

Deno.test("Form 4137 line 5 tips remain income but are excluded from FICA", () => {
  const result = compute({
    forms: [{
      recipient: "taxpayer",
      employers: [employer],
      below_20_tip_months: [
        { employer_index: 1, month: 1, tips_received: 18, tips_reported: 0 },
        { employer_index: 1, month: 2, tips_received: 15, tips_reported: 0 },
      ],
      ss_wages_from_w2: 0,
    }],
    w2_tip_sources: [{
      employer_name: "CAFE",
      employer_ein: "12-3456789",
      allocated_tips: 0,
      ss_wages_and_tips: 0,
    }],
  });
  assertEquals(fieldsOf(result.outputs, f1040)?.line1c_unreported_tips, 3_000);
  assertEquals(
    fieldsOf(result.outputs, schedule2)?.line5_unreported_tip_tax,
    227,
  );
  assertEquals(fieldsOf(result.outputs, form8959)?.unreported_tips, 2_967);
});

Deno.test("Form 4137 applies the $20 test separately by employer and month", () => {
  const [calculated] = calculateForm4137(
    inputSchema.parse({
      forms: [{
        recipient: "taxpayer",
        employers: [employer, {
          name: "DINER",
          ein: "98-7654321",
          tips_received: 100,
          tips_reported: 50,
        }],
        below_20_tip_months: [
          { employer_index: 1, month: 1, tips_received: 18, tips_reported: 8 },
          { employer_index: 2, month: 1, tips_received: 19, tips_reported: 0 },
        ],
        ss_wages_from_w2: 0,
      }],
      w2_tip_sources: [
        {
          employer_name: "CAFE",
          employer_ein: "12-3456789",
          allocated_tips: 0,
          ss_wages_and_tips: 0,
        },
        {
          employer_name: "DINER",
          employer_ein: "98-7654321",
          allocated_tips: 0,
          ss_wages_and_tips: 0,
        },
      ],
    }),
    176_100,
  );
  assertEquals(calculated.unreportedTips, 3_050);
  assertEquals(calculated.incidentalTips, 29);
  assertEquals(calculated.medicareTips, 3_021);
});

Deno.test("Form 4137 SS wage base caps only SS tax, not Medicare tax", () => {
  const result = compute({
    forms: [{
      recipient: "taxpayer",
      employers: [employer],
      ss_wages_from_w2: 175_100,
    }],
    w2_tip_sources: [{
      employer_name: "CAFE",
      employer_ein: "12-3456789",
      allocated_tips: 0,
      ss_wages_and_tips: 175_100,
    }],
  });
  assertEquals(
    fieldsOf(result.outputs, schedule2)?.line5_unreported_tip_tax,
    106,
  );
});

Deno.test("Form 4137 line 8 includes RRTA compensation up to the 2025 wage base", () => {
  const [calculated] = calculateForm4137(
    inputSchema.parse({
      forms: [{ recipient: "taxpayer", employers: [employer] }],
      w2_tip_sources: [
        {
          employer_name: "CAFE",
          employer_ein: "12-3456789",
          allocated_tips: 0,
          ss_wages_and_tips: 50_000,
        },
        {
          employer_name: "RAIL",
          employer_ein: "98-7654321",
          allocated_tips: 0,
          rrta_compensation: 220_000,
          ss_wages_and_tips: 0,
        },
      ],
    }),
    176_100,
  );
  assertEquals(calculated.ssWagesAndTips, 226_100);
  assertEquals(calculated.ssWageBaseRoom, 0);
  assertEquals(calculated.ssTax, 0);
  assertEquals(calculated.medicareTax, 44);
  assertEquals(calculated.totalTax, 44);
});

Deno.test("Form 4137 excludes RRTA-covered employer tips", () => {
  assertThrows(
    () =>
      compute({
        forms: [{ recipient: "taxpayer", employers: [employer] }],
        w2_tip_sources: [{
          employer_name: "CAFE",
          employer_ein: "12-3456789",
          allocated_tips: 0,
          rrta_compensation: 50_000,
          ss_wages_and_tips: 0,
        }],
      }),
    Error,
    "cannot include RRTA-covered employer tips",
  );
});

Deno.test("Form 4137 government employee tips are Medicare-only", () => {
  const input = inputSchema.parse({
    forms: [{
      recipient: "taxpayer",
      employers: [employer],
      government_employee_tips: 1_000,
      ss_wages_from_w2: 0,
    }],
    w2_tip_sources: [{
      employer_name: "CAFE",
      employer_ein: "12-3456789",
      allocated_tips: 0,
      ss_wages_and_tips: 0,
    }],
  });
  const [calculated] = calculateForm4137(input, 176_100);
  assertEquals(calculated.medicareTips, 3_000);
  assertEquals(calculated.ssTips, 2_000);
  assertEquals(calculated.totalTax, 168);
});

Deno.test("Form 4137 keeps taxpayer and spouse computations separate", () => {
  const result = compute({
    taxpayer_ssn: "123-45-6789",
    spouse_ssn: "987-65-4321",
    forms: [
      { recipient: "taxpayer", employers: [employer], ss_wages_from_w2: 0 },
      {
        recipient: "spouse",
        employers: [{ ...employer, tips_received: 1_000, tips_reported: 0 }],
        ss_wages_from_w2: 176_100,
      },
    ],
    w2_tip_sources: [
      {
        employee_ssn: "123-45-6789",
        employer_name: "CAFE",
        employer_ein: "12-3456789",
        allocated_tips: 0,
        ss_wages_and_tips: 0,
      },
      {
        employee_ssn: "987-65-4321",
        employer_name: "CAFE",
        employer_ein: "12-3456789",
        allocated_tips: 0,
        ss_wages_and_tips: 176_100,
      },
    ],
  });
  assertEquals(fieldsOf(result.outputs, f1040)?.line1c_unreported_tips, 4_000);
  assertEquals(
    fieldsOf(result.outputs, schedule2)?.line5_unreported_tip_tax,
    245,
  );
  assertEquals(fieldsOf(result.outputs, form8959)?.unreported_tips, 4_000);
});

Deno.test("Form 4137 attributes W-2 wages by employee SSN, including an explicit taxpayer SSN", () => {
  const calculated = calculateForm4137(
    inputSchema.parse({
      taxpayer_ssn: "123-45-6789",
      spouse_ssn: "987-65-4321",
      forms: [
        { recipient: "taxpayer", employers: [employer] },
        {
          recipient: "spouse",
          employers: [{
            name: "DINER",
            ein: "98-7654321",
            tips_received: 1_000,
            tips_reported: 0,
          }],
        },
      ],
      w2_tip_sources: [
        {
          employee_ssn: "123456789",
          employer_name: "CAFE",
          employer_ein: "12-3456789",
          allocated_tips: 500,
          ss_wages_and_tips: 30_000,
        },
        {
          employee_ssn: "987-65-4321",
          employer_name: "DINER",
          employer_ein: "98-7654321",
          allocated_tips: 500,
          ss_wages_and_tips: 176_100,
        },
      ],
    }),
    176_100,
  );
  assertEquals(calculated.map((form) => form.ssWagesAndTips), [
    30_000,
    176_100,
  ]);
  assertEquals(calculated.map((form) => form.totalTax), [230, 15]);
});

Deno.test("Form 4137 rejects unknown and unattributed joint-return W-2 identities", () => {
  const source = {
    taxpayer_ssn: "123-45-6789",
    spouse_ssn: "987-65-4321",
    forms: [{ recipient: "taxpayer", employers: [employer] }],
  };
  assertThrows(
    () =>
      compute({
        ...source,
        w2_tip_sources: [{
          employee_ssn: "111-22-3333",
          allocated_tips: 500,
          ss_wages_and_tips: 30_000,
        }],
      }),
    Error,
    "does not match a filer",
  );
  assertThrows(
    () =>
      compute({
        ...source,
        w2_tip_sources: [{ allocated_tips: 500, ss_wages_and_tips: 30_000 }],
      }),
    Error,
    "needs employee SSN",
  );
});

Deno.test("Form 4137 refuses duplicate recipients and inconsistent W-2 wages", () => {
  assertThrows(
    () =>
      compute({
        forms: [
          { recipient: "taxpayer", employers: [employer], ss_wages_from_w2: 0 },
          { recipient: "taxpayer", employers: [employer], ss_wages_from_w2: 0 },
        ],
      }),
    Error,
    "one form per tip recipient",
  );
  assertThrows(
    () =>
      compute({
        forms: [{
          recipient: "taxpayer",
          employers: [employer],
          ss_wages_from_w2: 20_000,
        }],
        w2_tip_sources: [{
          employer_name: "CAFE",
          employer_ein: "12-3456789",
          allocated_tips: 500,
          ss_wages_and_tips: 30_000,
        }],
      }),
    Error,
    "disagrees with W-2",
  );
});

Deno.test("Form 4137 lower allocated tips require reconciled daily records", () => {
  const raw = {
    forms: [{
      recipient: "taxpayer",
      employers: [{ ...employer, tips_received: 2_500 }],
      ss_wages_from_w2: 0,
    }],
    w2_tip_sources: [{
      employer_name: "CAFE",
      employer_ein: "12-3456789",
      allocated_tips: 1_000,
    }],
  };
  assertThrows(() => compute(raw), Error, "without reconciled daily records");
  const records = [{
    employer_index: 1,
    daily_records: [
      {
        date: "2025-01-03",
        cash_charge_tips_received: 1_500,
        tips_reported_to_employer: 1_200,
        report_date: "2025-02-10",
        evidence_type: "daily_tip_diary",
        evidence_reference: "diary-jan-page-1",
      },
      {
        date: "2025-01-04",
        cash_charge_tips_received: 1_000,
        tips_reported_to_employer: 800,
        report_date: "2025-02-10",
        evidence_type: "receipt_or_charge_slip",
        evidence_reference: "receipt-set-jan-4",
      },
    ],
  }];
  const result = compute({
    ...raw,
    forms: [{ ...raw.forms[0], allocated_tip_records: records }],
  });
  assertEquals(fieldsOf(result.outputs, f1040)?.line1c_unreported_tips, 500);

  assertThrows(
    () =>
      compute({
        ...raw,
        forms: [{
          ...raw.forms[0],
          allocated_tip_records: [{
            ...records[0],
            daily_records: [
              {
                ...records[0].daily_records[0],
                cash_charge_tips_received: 1_400,
              },
              records[0].daily_records[1],
            ],
          }],
        }],
      }),
    Error,
    "daily tip records disagree with employer line 1 totals",
  );
  assertThrows(
    () =>
      compute({
        ...raw,
        forms: [{
          ...raw.forms[0],
          allocated_tip_records: [{
            ...records[0],
            daily_records: [
              records[0].daily_records[0],
              { ...records[0].daily_records[1], date: "2025-01-03" },
            ],
          }],
        }],
      }),
    Error,
    "duplicate daily tip record date",
  );
  assertEquals(
    inputSchema.safeParse({
      ...raw,
      forms: [{
        ...raw.forms[0],
        allocated_tip_records: [{
          ...records[0],
          daily_records: [{
            ...records[0].daily_records[0],
            date: "2025-02-30",
          }],
        }],
      }],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      ...raw,
      forms: [{
        ...raw.forms[0],
        allocated_tip_records: [{
          ...records[0],
          daily_records: [{
            ...records[0].daily_records[0],
            evidence_reference: "   ",
          }],
        }],
      }],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      ...raw,
      forms: [{
        ...raw.forms[0],
        allocated_tip_records: [{
          ...records[0],
          daily_records: [{
            ...records[0].daily_records[0],
            tips_reported_to_employer: 1_600,
          }],
        }],
      }],
    }).success,
    false,
  );
  assertThrows(
    () =>
      compute({
        ...raw,
        forms: [{
          ...raw.forms[0],
          allocated_tip_records: [records[0], records[0]],
        }],
      }),
    Error,
    "duplicate employer tip record set",
  );
  assertThrows(
    () =>
      compute({
        ...raw,
        forms: [{
          ...raw.forms[0],
          allocated_tip_records: [{ ...records[0], employer_index: 2 }],
        }],
      }),
    Error,
    "allocated tip record has no employer row",
  );
  assertEquals(
    inputSchema.safeParse({
      ...raw,
      forms: [{ ...raw.forms[0], records_support_lower_tips: true }],
    }).success,
    false,
  );
});

Deno.test("Form 4137 attributes December tips by timely or late January report", () => {
  const daily = (
    date: string,
    cash_charge_tips_received: number,
    tips_reported_to_employer: number,
    report_date: string,
  ) => ({
    date,
    cash_charge_tips_received,
    tips_reported_to_employer,
    report_date,
    evidence_type: "daily_tip_diary" as const,
    evidence_reference: `diary-${date}`,
  });
  const [calculated] = calculateForm4137(
    inputSchema.parse({
      forms: [{
        recipient: "taxpayer",
        employers: [{
          ...employer,
          tips_received: 300,
          tips_reported: 200,
        }],
        allocated_tip_records: [{
          employer_index: 1,
          daily_records: [
            daily("2024-12-30", 100, 100, "2025-01-10"),
            daily("2024-12-31", 50, 50, "2025-01-11"),
            daily("2025-12-01", 200, 100, "2026-01-12"),
            daily("2025-12-02", 100, 100, "2026-01-13"),
          ],
        }],
      }],
      w2_tip_sources: [{
        employer_name: "CAFE",
        employer_ein: "12-3456789",
        allocated_tips: 200,
        ss_wages_and_tips: 0,
      }],
    }),
    176_100,
  );
  assertEquals(calculated.totalTipsReceived, 300);
  assertEquals(calculated.totalTipsReported, 200);
  assertEquals(calculated.unreportedTips, 100);
  assertEquals(calculated.totalTax, 7);

  assertEquals(
    inputSchema.safeParse({
      forms: [{
        recipient: "taxpayer",
        employers: [employer],
        allocated_tip_records: [{
          employer_index: 1,
          daily_records: [{
            ...daily("2025-12-01", 200, 100, "2026-01-12"),
            report_date: undefined,
          }],
        }],
      }],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      forms: [{
        recipient: "taxpayer",
        employers: [employer],
        allocated_tip_records: [{
          employer_index: 1,
          daily_records: [{
            ...daily("2025-12-01", 200, 100, "2026-01-12"),
            report_date: "2025-11-30",
          }],
        }],
      }],
    }).success,
    false,
  );
});

Deno.test("Form 4137 matches each allocated-tip W-2 to one exact employer row", () => {
  const form = {
    recipient: "taxpayer",
    employers: [employer],
    ss_wages_from_w2: 0,
  };
  for (
    const w2 of [
      { employer_name: "Cafe", employer_ein: "12-3456789" },
      { employer_name: "CAFE", employer_ein: "98-7654321" },
    ]
  ) {
    assertThrows(
      () =>
        compute({
          forms: [form],
          w2_tip_sources: [{ ...w2, allocated_tips: 500 }],
        }),
      Error,
      "employer does not match line 1",
    );
  }
  assertThrows(
    () =>
      compute({
        forms: [form],
        w2_tip_sources: [{ allocated_tips: 500 }],
      }),
    Error,
    "needs employer name and EIN",
  );
  assertThrows(
    () =>
      compute({
        forms: [{ ...form, employers: [employer, employer] }],
      }),
    Error,
    "one row per employer",
  );
});

Deno.test("Form 4137 requires a filed W-2 match even without allocated tips", () => {
  const form = {
    recipient: "taxpayer",
    employers: [employer],
    ss_wages_from_w2: 30_000,
  };
  assertThrows(
    () => compute({ forms: [form] }),
    Error,
    "line 1 employer does not match a filed W-2",
  );
  for (
    const w2 of [
      { employer_name: "Cafe", employer_ein: "12-3456789" },
      { employer_name: "CAFE", employer_ein: "98-7654321" },
      { employer_name: "CAFE" },
    ]
  ) {
    assertThrows(
      () =>
        compute({
          forms: [form],
          w2_tip_sources: [{
            ...w2,
            allocated_tips: 0,
            ss_wages_and_tips: 30_000,
          }],
        }),
      Error,
      "line 1 employer does not match a filed W-2",
    );
  }
  const result = compute({
    forms: [form],
    w2_tip_sources: [{
      employer_name: "CAFE",
      employer_ein: "123456789",
      allocated_tips: 0,
      ss_wages_and_tips: 30_000,
    }],
  });
  assertEquals(fieldsOf(result.outputs, f1040)?.line1c_unreported_tips, 3_000);
});

Deno.test("Form 4137 compares allocated tips with the same employer, not a return total", () => {
  assertThrows(
    () =>
      compute({
        forms: [{
          recipient: "taxpayer",
          employers: [
            { ...employer, tips_received: 2_500 },
            {
              name: "DINER",
              ein: "98-7654321",
              tips_received: 3_000,
              tips_reported: 0,
            },
          ],
          ss_wages_from_w2: 0,
        }],
        w2_tip_sources: [{
          employer_name: "CAFE",
          employer_ein: "12-3456789",
          allocated_tips: 1_000,
        }],
      }),
    Error,
    "without reconciled daily records",
  );
  const [appliedFor] = calculateForm4137(
    inputSchema.parse({
      forms: [{
        recipient: "taxpayer",
        employers: [{
          name: "TOWN",
          applied_for_ein: true,
          tips_received: 1_000,
          tips_reported: 0,
        }],
        ss_wages_from_w2: 0,
      }],
      w2_tip_sources: [{
        employer_name: "TOWN",
        employer_ein: "Applied For",
        allocated_tips: 500,
      }],
    }),
    176_100,
  );
  assertEquals(appliedFor.totalTax, 77);
});

Deno.test("Form 4137 rejects impossible employer and below-$20 month facts", () => {
  assertEquals(
    inputSchema.safeParse({
      forms: [{
        recipient: "taxpayer",
        employers: [{ ...employer, tips_reported: 6_000 }],
      }],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      forms: [{
        recipient: "taxpayer",
        employers: [{ ...employer, ein: undefined }],
      }],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      forms: [{
        recipient: "taxpayer",
        employers: [employer],
        below_20_tip_months: [{
          employer_index: 1,
          month: 1,
          tips_received: 20,
          tips_reported: 0,
        }],
      }],
    }).success,
    false,
  );
  assertThrows(
    () =>
      compute({
        forms: [{
          recipient: "taxpayer",
          employers: [employer],
          below_20_tip_months: [
            {
              employer_index: 1,
              month: 1,
              tips_received: 18,
              tips_reported: 0,
            },
            {
              employer_index: 1,
              month: 1,
              tips_received: 15,
              tips_reported: 0,
            },
          ],
          ss_wages_from_w2: 0,
        }],
      }),
    Error,
    "duplicate employer/month",
  );
  assertThrows(
    () =>
      compute({
        forms: [{
          recipient: "taxpayer",
          employers: [{ ...employer, tips_reported: 4_995 }],
          below_20_tip_months: [{
            employer_index: 1,
            month: 1,
            tips_received: 18,
            tips_reported: 0,
          }],
          ss_wages_from_w2: 0,
        }],
      }),
    Error,
    "records exceed employer annual tips",
  );
});

Deno.test("Form 4137 with no tip activity has no outputs", () => {
  assertEquals(compute({}).outputs, []);
  assertEquals(
    compute({ w2_tip_sources: [{ allocated_tips: 0 }] })
      .outputs,
    [],
  );
});
