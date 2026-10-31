import { test } from "bun:test";
import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import {
  assertFileableClergyReturn,
  clergyScheduleSeExplanation,
  isSupportedClergyRoute,
} from "./clergy_source.ts";
import {
  churchW2,
  clergyGeneral,
  clergyItem,
  consultingScheduleC,
  form4361Approved,
} from "./clergy.fixture.ts";

type Pending = Record<string, Record<string, unknown>>;

function finalized(inputs: Record<string, unknown>): Pending {
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  return normalizeAllPending(result.pending);
}

const base = () => ({
  general: clergyGeneral(2025),
  w2: [churchW2()],
  clergy: [clergyItem(2025)],
});

const expenses = (amount: number) => ({
  unreimbursed_ministerial_expenses: {
    amount,
    not_reimbursed_confirmed: true as const,
    expense_records_reference: "Ministry expense log",
  },
});

test("clergy export facts: line 27b, no 4361 boxes, no explanation without expenses", () => {
  const facts = assertFileableClergyReturn(finalized(base()), 2025)!;
  assertEquals(facts.excessAllowance, 4_000);
  assertEquals(facts.form1040Line27bClergy, true);
  assertEquals([...facts.scheduleSeLineA], []);
  assertEquals(facts.schedule2Form4361, false);
  // i1040sse and Pub 517 ask for the explanation when expenses are
  // subtracted on line 2; wages and housing alone need none.
  assertEquals([...facts.scheduleSeExplanations.keys()], []);
  const withExpenses = assertFileableClergyReturn(
    finalized({ ...base(), clergy: [clergyItem(2025, expenses(2_500))] }),
    2025,
  )!;
  assertEquals([...withExpenses.scheduleSeExplanations.keys()], ["T"]);
});

test("clergy export refuses retained facts that drift from the sources", () => {
  const pending = finalized(base());
  const changes: Array<[string, Pending, string]> = [
    [
      "Schedule SE rows",
      {
        ...pending,
        schedule_se: {
          ...pending.schedule_se,
          ministerial_sources: [{
            recipient: "T",
            source_reference: "ministerial W-2 Example Community Church",
            net_earnings: 70_000,
          }],
        },
      },
      "differ from the finalized Schedule SE",
    ],
    [
      "retained W-2",
      { ...pending, w2: { w2s: [{ ...churchW2(), box1_wages: 51_000 }] } },
      "matched W-2",
    ],
    [
      "retained filer",
      {
        ...pending,
        general: { ...pending.general, taxpayer_ssn: "400019999" },
      },
      "differs from the return",
    ],
  ];
  for (const [label, changed, message] of changes) {
    assertThrows(
      () => assertFileableClergyReturn(changed, 2025),
      Error,
      message,
      label,
    );
  }
  assertThrows(
    () => assertFileableClergyReturn(pending, 2026),
    Error,
    "must be for 2026",
  );
});

test("clergy export refuses EIC and ministerial ACTC until the clergy earned-income rules exist", () => {
  const pending = finalized(base());
  assertThrows(
    () =>
      assertFileableClergyReturn({
        ...pending,
        f1040: { ...pending.f1040, line27_eitc: 500 },
      }, 2025),
    Error,
    "Earned income credit with clergy income",
  );
  assertThrows(
    () =>
      assertFileableClergyReturn({
        ...pending,
        f1040: { ...pending.f1040, line28_actc: 1_700 },
      }, 2025),
    Error,
    "Additional child tax credit with ministerial SE earnings",
  );
  // A Form 4361 minister has no ministerial Schedule SE amount to omit.
  const exempt = finalized({
    ...base(),
    clergy: [clergyItem(2025, { form4361: form4361Approved })],
  });
  assertEquals(
    assertFileableClergyReturn({
      ...exempt,
      f1040: { ...exempt.f1040, line28_actc: 1_700 },
    }, 2025)?.schedule2Form4361,
    true,
  );
});

test("clergy export refuses a ministerial Schedule C it cannot classify", () => {
  const pending = finalized({
    ...base(),
    clergy: [clergyItem(2025, { form4361: form4361Approved })],
    schedule_c: [{ ...consultingScheduleC(20_000), clergy_schedule_c: true }],
  });
  assertThrows(
    () => assertFileableClergyReturn(pending, 2025),
    Error,
    "Clergy Schedule C fees and honoraria",
  );
});

test("clergy route support needs complete, reconciled rows outside W-2 box 1", () => {
  const pending = finalized(base());
  assertEquals(isSupportedClergyRoute(pending.clergy), true);
  assertEquals(
    isSupportedClergyRoute({ clergys: [{ ministerial_wages: 50_000 }] }),
    false,
  );
  const inBox1 = structuredClone(pending.clergy) as {
    clergys: Array<{ housing_allowance: { included_in_w2_box1: boolean } }>;
  };
  inBox1.clergys[0].housing_allowance.included_in_w2_box1 = true;
  assertEquals(isSupportedClergyRoute(inBox1), false);
  assertEquals(
    isSupportedClergyRoute({
      ...pending.clergy,
      return_w2s: [{ ...churchW2(), box1_wages: 1 }],
    }),
    false,
  );
});

test("Schedule SE explanation lists taxable, tax-free and expense items (Pub 517)", () => {
  const text = clergyScheduleSeExplanation([
    clergyItem(2025, expenses(2_500)),
  ]);
  assertStringIncludes(text, "Pub. 517, Allowable deductions");
  assertStringIncludes(text, "ministerial wages 50000");
  assertStringIncludes(
    text,
    "housing allowance paid 24000 (excluded from income 20000, excess 4000 on Form 1040 line 1h)",
  );
  assertStringIncludes(text, "unreimbursed ministerial expenses 2500");
  assertStringIncludes(text, "net 71500");
  assertStringIncludes(text, "no part is deducted for income tax");
  assertEquals(text.length < 9_000, true);
});

const joint = () => ({
  general: clergyGeneral(2025, true),
  w2: [churchW2()],
});

test("ministerial earnings beside a spouse's or the pastor's own Schedule C stay fail-closed", () => {
  for (const owner of ["S", "T"] as const) {
    const pending = finalized({
      ...joint(),
      clergy: [clergyItem(2025)],
      schedule_c: [consultingScheduleC(30_000, owner)],
    });
    // The joint Schedule SE keeps each spouse's earnings apart...
    const instances = (pending.schedule_se.owner_instances as Array<
      { recipient: string; net_profit_schedule_c: number }
    >).map((row) => [row.recipient, row.net_profit_schedule_c]);
    assertEquals(
      instances,
      owner === "S" ? [["T", 74_000], ["S", 30_000]] : [["T", 104_000]],
    );
    // ...but the QBI, Schedule 1-A and Form 7206 export guards that replay
    // the owner sources are not ministerial-aware, so export refuses.
    assertThrows(
      () => assertFileableClergyReturn(pending, 2025),
      Error,
      "including a spouse's",
      owner,
    );
  }
});

test("a Form 4361 pastor whose spouse owes SE tax stays fail-closed", () => {
  assertThrows(
    () =>
      assertFileableClergyReturn(
        finalized({
          ...joint(),
          clergy: [clergyItem(2025, { form4361: form4361Approved })],
          schedule_c: [consultingScheduleC(30_000, "S")],
        }),
        2025,
      ),
    Error,
    "such as a spouse's",
  );
});
