import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import {
  type ClergyItem,
  clergy,
  clergyAmounts,
  comparablePersonName,
  hasMinisterialSeClaim,
  inputSchema,
  itemSchema,
  MinisterialCredential,
  ministerialSeSources,
} from "./index.ts";

const ctx = { taxYear: 2025, formType: "f1040" } as const;
const MINISTER_SSN = "400-01-1234";
const SPOUSE_SSN = "400-01-5678";

const returnFiler = {
  filing_status: "single",
  taxpayer_ssn: MINISTER_SSN,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Example",
};

const churchW2 = {
  employee_ssn: MINISTER_SSN,
  employer_ein: "12-3456789",
  employer_name: "Example Community Church",
  source_document_reference: "2025 W-2 Example Community Church",
  box1_wages: 50_000,
};

type Housing = NonNullable<ClergyItem["housing_allowance"]>;

function housing(
  designated: number,
  paid: number,
  actual: number,
  fairRentalValue: number,
): Housing {
  return {
    included_in_w2_box1: false,
    designation: {
      amount: designated,
      designated_on: "2024-12-10",
      effective_from: "2025-01-01",
      designation_reference: "Session minutes 2024-12-10",
    },
    paid: {
      amount: paid,
      payment_records_reference: "2025 payroll register",
      paid_after_designation_confirmed: true,
    },
    actual_housing_expenses: {
      amount: actual,
      expense_records_reference: "2025 housing expense ledger",
    },
    fair_rental_value: {
      amount: fairRentalValue,
      furnished_plus_utilities_confirmed: true,
      fair_rental_value_reference: "2025 rental value letter",
    },
    not_more_than_reasonable_pay_confirmed: true,
  };
}

function item(overrides: Partial<ClergyItem> = {}): ClergyItem {
  return {
    tax_year: 2025,
    minister: {
      owner: "taxpayer",
      name: "Alex Example",
      ssn: MINISTER_SSN,
      credential: MinisterialCredential.ORDAINED,
      ordained_commissioned_or_licensed_confirmed: true,
      ministerial_services_confirmed: true,
      credential_reference: "Ordination certificate 2015",
    },
    employer: {
      employer_name: "Example Community Church",
      employer_ein: "12-3456789",
      w2_reference: "2025 W-2 Example Community Church",
    },
    ministerial_wages: 50_000,
    housing_allowance: housing(24_000, 24_000, 24_000, 26_000),
    form4361: { approved: false },
    ...overrides,
  };
}

const approved4361 = {
  approved: true as const,
  approved_on: "2012-05-01",
  approval_reference: "IRS Form 4361 approval letter",
};

function compute(
  items: ClergyItem[],
  context: { return_filer?: unknown; return_w2s?: unknown } = {
    return_filer: returnFiler,
    return_w2s: [churchW2],
  },
) {
  return clergy.compute(
    ctx,
    inputSchema.parse({ clergys: items, ...context }),
  );
}

function fields(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.filter((o) => o.nodeType === nodeType).map((o) =>
    o.fields
  );
}

// ── Schema: every piece of evidence is required ──────────────────────────────

test("clergy input keeps invalid money and empty claims out", () => {
  assertEquals(inputSchema.safeParse({ clergys: [] }).success, false);
  assertEquals(itemSchema.safeParse(item()).success, true);
  for (
    const bad of [
      { ministerial_wages: -1 },
      { housing_allowance: housing(-1, 24_000, 24_000, 26_000) },
      { housing_allowance: housing(24_000, 24_000.5, 24_000, 26_000) },
      {
        parsonage: {
          fair_rental_value_plus_utilities: 0,
          fair_rental_value_reference: "Appraisal",
          not_more_than_reasonable_pay_confirmed: true as const,
        },
      },
    ]
  ) {
    assertEquals(itemSchema.safeParse(item(bad)).success, false);
  }
});

test("clergy rejects each missing piece of source evidence", () => {
  const remove = (path: string[]) => {
    const copy = structuredClone(item()) as Record<string, unknown>;
    let node = copy;
    for (const key of path.slice(0, -1)) {
      node = node[key] as Record<string, unknown>;
    }
    delete node[path[path.length - 1]];
    return copy;
  };
  for (
    const path of [
      ["tax_year"],
      ["minister"],
      ["minister", "owner"],
      ["minister", "ssn"],
      ["minister", "name"],
      ["minister", "credential"],
      ["minister", "credential_reference"],
      ["minister", "ordained_commissioned_or_licensed_confirmed"],
      ["minister", "ministerial_services_confirmed"],
      ["employer"],
      ["employer", "employer_ein"],
      ["employer", "employer_name"],
      ["employer", "w2_reference"],
      ["ministerial_wages"],
      ["form4361"],
      ["housing_allowance", "included_in_w2_box1"],
      ["housing_allowance", "designation"],
      ["housing_allowance", "designation", "amount"],
      ["housing_allowance", "designation", "designated_on"],
      ["housing_allowance", "designation", "effective_from"],
      ["housing_allowance", "designation", "designation_reference"],
      ["housing_allowance", "paid", "amount"],
      ["housing_allowance", "paid", "payment_records_reference"],
      ["housing_allowance", "paid", "paid_after_designation_confirmed"],
      ["housing_allowance", "actual_housing_expenses"],
      ["housing_allowance", "actual_housing_expenses", "expense_records_reference"],
      ["housing_allowance", "fair_rental_value"],
      ["housing_allowance", "fair_rental_value", "fair_rental_value_reference"],
      [
        "housing_allowance",
        "fair_rental_value",
        "furnished_plus_utilities_confirmed",
      ],
      ["housing_allowance", "not_more_than_reasonable_pay_confirmed"],
    ]
  ) {
    assertEquals(
      itemSchema.safeParse(remove(path)).success,
      false,
      `missing ${path.join(".")} must fail`,
    );
  }
  for (
    const bad of [
      { form4361: { approved: true } },
      { form4361: { ...approved4361, approval_reference: " " } },
      {
        parsonage: {
          fair_rental_value_plus_utilities: 18_000,
          not_more_than_reasonable_pay_confirmed: true,
        },
      },
      {
        unreimbursed_ministerial_expenses: {
          amount: 1_000,
          expense_records_reference: "Expense log",
        },
      },
      { minister: { ...item().minister, credential_reference: "" } },
      { minister: { ...item().minister, ssn: "4000" } },
      { employer: { ...item().employer, employer_ein: "123" } },
    ]
  ) {
    assertEquals(
      itemSchema.safeParse(item(bad as Partial<ClergyItem>)).success,
      false,
      JSON.stringify(bad),
    );
  }
});

test("clergy housing must be designated before the period it covers", () => {
  const late = housing(24_000, 24_000, 24_000, 26_000);
  late.designation.designated_on = "2025-02-01";
  assertEquals(itemSchema.safeParse(item({ housing_allowance: late })).success, false);
  const nextYear = housing(24_000, 24_000, 24_000, 26_000);
  nextYear.designation.designated_on = "2026-01-01";
  nextYear.designation.effective_from = "2026-01-01";
  assertEquals(
    itemSchema.safeParse(item({ housing_allowance: nextYear })).success,
    false,
  );
  const midYear = housing(24_000, 12_000, 12_000, 26_000);
  midYear.designation.designated_on = "2025-06-15";
  midYear.designation.effective_from = "2025-07-01";
  assertEquals(itemSchema.safeParse(item({ housing_allowance: midYear })).success, true);
  const invalidDate = housing(24_000, 24_000, 24_000, 26_000);
  invalidDate.designation.designated_on = "2024-02-30";
  assertEquals(
    itemSchema.safeParse(item({ housing_allowance: invalidDate })).success,
    false,
  );
});

test("clergy with an approved Form 4361 ignores unreimbursed expenses", () => {
  const exempt = item({
    form4361: approved4361,
    unreimbursed_ministerial_expenses: {
      amount: 1_000,
      not_reimbursed_confirmed: true,
      expense_records_reference: "Expense log",
    },
  });
  assertEquals(itemSchema.safeParse(exempt).success, true);
  // No ministerial SE earnings for them to reduce, and no income effect.
  assertEquals(clergyAmounts(exempt).unreimbursed_expenses, 0);
  assertEquals(clergyAmounts(exempt).ministerial_se_earnings, null);
  assertEquals(fields(compute([exempt]), "schedule_se"), []);
});

// ── Reasonable pay: Pub 517 "Rental allowances" and "Fair rental value of
// parsonage" cap either exclusion at reasonable pay for the services ────────

test("clergy housing and parsonage exclusions need the reasonable-pay attestation", () => {
  const unconfirmed = housing(24_000, 24_000, 24_000, 26_000) as Record<
    string,
    unknown
  >;
  for (const value of [false, undefined, "yes"]) {
    assertEquals(
      itemSchema.safeParse(item({
        housing_allowance: {
          ...unconfirmed,
          not_more_than_reasonable_pay_confirmed: value,
        } as unknown as Housing,
      })).success,
      false,
      `housing attestation ${String(value)}`,
    );
    assertEquals(
      itemSchema.safeParse(item({
        housing_allowance: undefined,
        parsonage: {
          fair_rental_value_plus_utilities: 18_000,
          fair_rental_value_reference: "Parsonage appraisal",
          not_more_than_reasonable_pay_confirmed: value,
        } as unknown as ClergyItem["parsonage"],
      })).success,
      false,
      `parsonage attestation ${String(value)}`,
    );
  }
});

// ── Housing exclusion: IRC §107(2) and Pub 517 ───────────────────────────────

test("fully substantiated allowance adds nothing to Form 1040 line 1h", () => {
  const result = compute([item()]);
  assertEquals(fields(result, "f1040"), []);
  assertEquals(fields(result, "agi_aggregator"), []);
  assertEquals(clergyAmounts(item()).excludable_allowance, 24_000);
});

test("excess allowance is limited by each §107(2) limit", () => {
  const cases: Array<[Housing, number, string]> = [
    // Paid more than the amount designated in advance.
    [housing(20_000, 24_000, 30_000, 30_000), 4_000, "designation"],
    // Spent less than the allowance on the home.
    [housing(24_000, 24_000, 18_000, 30_000), 6_000, "amount used"],
    // Fair rental value (furnished, plus utilities) below the allowance.
    [housing(24_000, 24_000, 30_000, 21_000), 3_000, "fair rental value"],
  ];
  for (const [allowance, excess, limit] of cases) {
    const result = compute([item({ housing_allowance: allowance })]);
    assertEquals(
      fields(result, "f1040"),
      [{ line1h_other_earned: excess }],
      limit,
    );
    assertEquals(
      fields(result, "agi_aggregator"),
      [{ line1h_other_earned: excess }],
      limit,
    );
  }
});

test("spending above the designation creates no deduction", () => {
  const result = compute([
    item({ housing_allowance: housing(20_000, 20_000, 35_000, 40_000) }),
  ]);
  assertEquals(fields(result, "f1040"), []);
  assertEquals(clergyAmounts(item({
    housing_allowance: housing(20_000, 20_000, 35_000, 40_000),
  })).excludable_allowance, 20_000);
});

test("an allowance inside W-2 box 1 fails closed instead of being excluded", () => {
  const inBox1 = housing(24_000, 24_000, 20_000, 26_000);
  inBox1.included_in_w2_box1 = true;
  assertThrows(
    () =>
      compute([item({ housing_allowance: inBox1, ministerial_wages: 74_000 })], {
        return_filer: returnFiler,
        return_w2s: [{ ...churchW2, box1_wages: 74_000 }],
      }),
    Error,
    "corrected W-2",
  );
});

test("a parsonage in kind has no income effect but is SE earnings", () => {
  const parsonage = item({
    housing_allowance: undefined,
    parsonage: {
      fair_rental_value_plus_utilities: 18_000,
      fair_rental_value_reference: "2025 parsonage rental appraisal",
      not_more_than_reasonable_pay_confirmed: true,
    },
  });
  const result = compute([parsonage]);
  assertEquals(fields(result, "f1040"), []);
  assertEquals(fields(result, "schedule_se"), [{
    ministerial_sources: [{
      recipient: "T",
      source_reference: "ministerial 2025 W-2 Example Community Church",
      net_earnings: 68_000,
    }],
  }]);
});

// ── SE earnings: Pub 517 "Figuring Net Earnings" ─────────────────────────────

test("ministerial SE earnings add the whole allowance paid, not just the excess", () => {
  const result = compute([
    item({ housing_allowance: housing(20_000, 24_000, 30_000, 30_000) }),
  ]);
  assertEquals(fields(result, "schedule_se"), [{
    ministerial_sources: [{
      recipient: "T",
      source_reference: "ministerial 2025 W-2 Example Community Church",
      net_earnings: 74_000,
    }],
  }]);
});

test("unreimbursed ministerial expenses reduce SE earnings in full, even to a loss", () => {
  const expenses = (amount: number) =>
    item({
      unreimbursed_ministerial_expenses: {
        amount,
        not_reimbursed_confirmed: true,
        expense_records_reference: "2025 ministry expense log",
      },
    });
  assertEquals(clergyAmounts(expenses(4_000)).ministerial_se_earnings, 70_000);
  assertEquals(
    ministerialSeSources([expenses(90_000)])[0].net_earnings,
    -16_000,
  );
});

test("an approved Form 4361 removes ministerial SE earnings but not the excess", () => {
  const result = compute([
    item({
      form4361: approved4361,
      housing_allowance: housing(24_000, 24_000, 20_000, 30_000),
    }),
  ]);
  assertEquals(fields(result, "schedule_se"), []);
  assertEquals(fields(result, "f1040"), [{ line1h_other_earned: 4_000 }]);
  assertEquals(hasMinisterialSeClaim([{ form4361: approved4361 }]), false);
  assertEquals(hasMinisterialSeClaim([{ form4361: { approved: false } }]), true);
});

test("two churches each reconcile to their own W-2", () => {
  const second = item({
    employer: {
      employer_name: "Sample Chapel",
      employer_ein: "98-7654321",
      w2_reference: "2025 W-2 Sample Chapel",
    },
    ministerial_wages: 5_000,
    housing_allowance: undefined,
  });
  const result = compute([item(), second], {
    return_filer: returnFiler,
    return_w2s: [churchW2, {
      ...churchW2,
      employer_ein: "98-7654321",
      employer_name: "Sample Chapel",
      source_document_reference: "2025 W-2 Sample Chapel",
      box1_wages: 5_000,
    }],
  });
  assertEquals(
    (fields(result, "schedule_se")[0].ministerial_sources as unknown[]).length,
    2,
  );
  assertThrows(
    () =>
      compute([item(), item()], {
        return_filer: returnFiler,
        return_w2s: [churchW2],
      }),
    Error,
    "distinct W-2",
  );
});

// ── Reconciliation to the return: fail closed ────────────────────────────────

test("clergy refuses wage and housing claims without source reconciliation", () => {
  const mismatches: Array<[string, Record<string, unknown>]> = [
    ["employer EIN", { employer_ein: "11-1111111" }],
    ["W-2 reference", { source_document_reference: "another W-2" }],
    ["employee SSN", { employee_ssn: "400-01-9999" }],
    ["employer name", { employer_name: "Other Church" }],
    ["box 1 wages", { box1_wages: 49_000 }],
    ["statutory employee", { box13_statutory_employee: true }],
  ];
  for (const [label, change] of mismatches) {
    assertThrows(
      () =>
        compute([item()], {
          return_filer: returnFiler,
          return_w2s: [{ ...churchW2, ...change }],
        }),
      Error,
      "matched W-2",
      label,
    );
  }
  assertThrows(
    () =>
      compute([item()], {
        return_filer: returnFiler,
        return_w2s: [churchW2, churchW2],
      }),
    Error,
    "matched W-2",
  );
  assertThrows(
    () => compute([item()], { return_filer: returnFiler, return_w2s: [] }),
    Error,
    "matched W-2",
  );
  assertThrows(
    () =>
      compute([item()], {
        return_filer: returnFiler,
        return_w2s: [{ ...churchW2, box3_ss_wages: 50_000 }],
      }),
    Error,
    "social security or Medicare wages",
  );
});

test("clergy does not turn an empty or nonordained record into a silent exclusion", () => {
  assertEquals(itemSchema.safeParse({}).success, false);
  for (
    const confirmation of [
      "ordained_commissioned_or_licensed_confirmed",
      "ministerial_services_confirmed",
    ]
  ) {
    assertEquals(
      itemSchema.safeParse(item({
        minister: { ...item().minister, [confirmation]: false },
      } as Partial<ClergyItem>)).success,
      false,
      confirmation,
    );
  }
  assertThrows(
    () => compute([item()], { return_w2s: [churchW2] }),
    Error,
    "filer identity",
  );
  assertThrows(
    () =>
      compute([item()], {
        return_filer: { ...returnFiler, taxpayer_ssn: "400-01-0000" },
        return_w2s: [churchW2],
      }),
    Error,
    "differs from the return",
  );
  assertThrows(
    () =>
      compute([item({ minister: { ...item().minister, name: "Jane Example" } })]),
    Error,
    "differs from the return",
  );
  assertThrows(
    () =>
      compute([item({
        minister: { ...item().minister, owner: "spouse", ssn: SPOUSE_SSN },
      })], {
        return_filer: { ...returnFiler, spouse_ssn: SPOUSE_SSN },
        return_w2s: [{ ...churchW2, employee_ssn: SPOUSE_SSN }],
      }),
    Error,
    "joint return",
  );
  assertThrows(
    () => compute([item({ tax_year: 2024, housing_allowance: undefined })]),
    Error,
    "must be for 2025",
  );
});

test("a spouse minister on a joint return is recipient S", () => {
  const spouse = item({
    minister: {
      ...item().minister,
      owner: "spouse",
      name: "Sam Example",
      ssn: SPOUSE_SSN,
    },
  });
  const result = compute([spouse], {
    return_filer: {
      ...returnFiler,
      filing_status: "mfj",
      spouse_ssn: SPOUSE_SSN,
      spouse_first_name: "Sam",
      spouse_last_name: "Example",
    },
    return_w2s: [{ ...churchW2, employee_ssn: SPOUSE_SSN }],
  });
  assertEquals(
    (fields(result, "schedule_se")[0].ministerial_sources as Array<
      { recipient: string }
    >)[0].recipient,
    "S",
  );
});

test("one minister's church W-2s must agree on Form 4361 approval", () => {
  const second = item({
    employer: {
      employer_name: "Sample Chapel",
      employer_ein: "98-7654321",
      w2_reference: "2025 W-2 Sample Chapel",
    },
    ministerial_wages: 5_000,
    housing_allowance: undefined,
    form4361: approved4361,
  });
  assertThrows(
    () =>
      compute([item(), second], {
        return_filer: returnFiler,
        return_w2s: [churchW2, {
          ...churchW2,
          employer_ein: "98-7654321",
          employer_name: "Sample Chapel",
          source_document_reference: "2025 W-2 Sample Chapel",
          box1_wages: 5_000,
        }],
      }),
    Error,
    "disagree on Form 4361 approval",
  );
  // Spouses are separate ministers: one may be exempt and the other not.
  const spouse = item({
    minister: {
      ...item().minister,
      owner: "spouse",
      name: "Sam Example",
      ssn: SPOUSE_SSN,
    },
    employer: {
      employer_name: "Sample Chapel",
      employer_ein: "98-7654321",
      w2_reference: "2025 W-2 Sample Chapel",
    },
    form4361: approved4361,
  });
  const result = compute([item(), spouse], {
    return_filer: {
      ...returnFiler,
      filing_status: "mfj",
      spouse_ssn: SPOUSE_SSN,
      spouse_first_name: "Sam",
      spouse_last_name: "Example",
    },
    return_w2s: [churchW2, {
      ...churchW2,
      employee_ssn: SPOUSE_SSN,
      employer_ein: "98-7654321",
      employer_name: "Sample Chapel",
      source_document_reference: "2025 W-2 Sample Chapel",
    }],
  });
  assertEquals(
    (fields(result, "schedule_se")[0].ministerial_sources as Array<
      { recipient: string }
    >).map((row) => row.recipient),
    ["T"],
  );
});

test("the minister's name may carry a title or suffix the return omits", () => {
  for (
    const name of [
      "Rev. Alex Example",
      "Reverend Alex Example",
      "Dr. Alex Example",
      "Alex Example Jr.",
      "Rev. Dr. Alex Example II",
      "ALEX  EXAMPLE",
    ]
  ) {
    assertEquals(
      compute([item({ minister: { ...item().minister, name } })]).outputs
        .length > 0,
      true,
      name,
    );
  }
  // A return name with a suffix still matches the bare name.
  assertEquals(
    compute([item()], {
      return_filer: { ...returnFiler, taxpayer_last_name: "Example Jr" },
      return_w2s: [churchW2],
    }).outputs.length > 0,
    true,
  );
  assertEquals(comparablePersonName("Rev. Alex Q. Example, III"), "ALEX Q EXAMPLE");
  // Other words still have to match.
  for (const name of ["Rev. Alex Sample", "Alex Example Smith", "Rev."]) {
    assertThrows(
      () => compute([item({ minister: { ...item().minister, name } })]),
      Error,
      "differs from the return",
      name,
    );
  }
});
