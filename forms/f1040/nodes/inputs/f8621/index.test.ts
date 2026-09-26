import { assertEquals, assertThrows } from "@std/assert";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { schedule2 } from "../../intermediate/aggregation/schedule2/index.ts";
import { schedule_d } from "../../intermediate/aggregation/schedule_d/index.ts";
import { income_tax_calculation } from "../../intermediate/worksheets/income_tax_calculation/index.ts";
import { f8621, itemSchema, PficRegime } from "./index.ts";
import type { F8621Item, Form8621Lines } from "./index.ts";
import { ExcessEventKind } from "./excess_distribution.ts";
import type { ExcessEvent } from "./excess_distribution.ts";

function minimalItem(overrides: Partial<F8621Item> = {}): F8621Item {
  return itemSchema.parse({
    company_name: "Offshore Fund Ltd",
    company_ein_or_ref: "FUND001",
    country_of_incorporation: "Ireland",
    regime: PficRegime.EXCESS_DISTRIBUTION,
    shares_owned: 100,
    fmv_at_year_end: 10_000,
    ...overrides,
  });
}

function excessEvent(amount = 10_000): ExcessEvent {
  return {
    kind: ExcessEventKind.Distribution,
    amount_usd: amount,
    holding_period_explanation: "Allocated across the holding period by year",
    allocations: [
      {
        tax_year: 2017,
        allocated_amount: amount * 0.2,
        pfic_year: true,
        interest_charge: 150,
      },
      {
        tax_year: 2022,
        allocated_amount: amount * 0.3,
        pfic_year: true,
        interest_charge: 80,
      },
      { tax_year: 2025, allocated_amount: amount * 0.5, pfic_year: true },
    ],
  };
}

function compute(items: F8621Item[]) {
  return f8621.compute({ taxYear: 2025, formType: "f1040" }, {
    f8621s: items,
  });
}

Deno.test("Form 8621 validates one holding per item and rejects the old flat amount", () => {
  assertEquals(
    f8621.inputSchema.safeParse({ f8621s: [minimalItem()] }).success,
    true,
  );
  assertEquals(f8621.inputSchema.safeParse({ f8621s: [] }).success, false);
  assertEquals(
    f8621.inputSchema.safeParse({
      f8621s: [{ ...minimalItem(), regime: "UNKNOWN" }],
    }).success,
    false,
  );
  assertEquals(
    f8621.inputSchema.safeParse({
      f8621s: [{ ...minimalItem(), excess_distribution_amount: 10_000 }],
    }).success,
    false,
  );
  assertEquals(
    f8621.inputSchema.safeParse({
      f8621s: [{ ...minimalItem(), shares_owned: -1 }],
    }).success,
    false,
  );
  assertEquals(
    f8621.inputSchema.safeParse({
      f8621s: [{ ...minimalItem(), company_ein_or_ref: "N/A" }],
    }).success,
    false,
  );
});

Deno.test("Form 8621 Part V puts prior-year tax on line 16 and interest on Schedule 2 line 17p", () => {
  const result = compute([minimalItem({ excess_events: [excessEvent()] })]);
  assertEquals(
    fieldsOf(result.outputs, income_tax_calculation)?.form8621_tax,
    1_902,
  );
  assertEquals(
    fieldsOf(result.outputs, schedule2)?.line17p_form8621_interest,
    230,
  );
  assertEquals(fieldsOf(result.outputs, schedule1)?.line8z_other, 5_000);
  assertEquals(
    fieldsOf(result.outputs, schedule2)?.line17z_other_additional_taxes,
    undefined,
  );
  assertEquals(
    result.outputs.filter((item) => item.nodeType === "form8621").length,
    1,
  );
});

Deno.test("Form 8621 combines separate holdings without losing their filed documents", () => {
  const result = compute([
    minimalItem({
      company_name: "Fund A",
      company_ein_or_ref: "FUNDA",
      excess_events: [excessEvent()],
    }),
    minimalItem({
      company_name: "Fund B",
      company_ein_or_ref: "FUNDB",
      excess_events: [excessEvent(5_000)],
    }),
  ]);
  assertEquals(
    fieldsOf(result.outputs, income_tax_calculation)?.form8621_tax,
    2_853,
  );
  assertEquals(
    fieldsOf(result.outputs, schedule2)?.line17p_form8621_interest,
    460,
  );
  assertEquals(fieldsOf(result.outputs, schedule1)?.line8z_other, 7_500);
  const filed = result.outputs.find((item) => item.nodeType === "form8621");
  assertEquals((filed?.fields as { items: Form8621Lines[] }).items.length, 2);
});

Deno.test("Form 8621 rejects duplicate PFIC identifiers in separate filings", () => {
  assertThrows(
    () =>
      compute([
        minimalItem({ company_name: "First block" }),
        minimalItem({ company_name: "Second block" }),
      ]),
    Error,
    "unique PFIC/QEF identifier",
  );
});

Deno.test("Form 8621 keeps section 1291, QEF, and MTM amounts on their respective lines", () => {
  const result = compute([
    minimalItem({
      company_name: "PFIC A",
      company_ein_or_ref: "PFICA",
      excess_events: [excessEvent()],
    }),
    minimalItem({
      company_name: "QEF B",
      company_ein_or_ref: "QEFB",
      regime: PficRegime.QEF,
      qef_ordinary_income: 2_000,
      qef_capital_gain: 1_000,
    }),
    minimalItem({
      company_name: "MTM C",
      company_ein_or_ref: "MTMC",
      regime: PficRegime.MTM,
      fmv_at_year_end: 12_000,
      mtm_adjusted_basis_at_year_end: 10_000,
    }),
  ]);
  assertEquals(fieldsOf(result.outputs, schedule1)?.line8z_other, 9_000);
  assertEquals(fieldsOf(result.outputs, schedule_d)?.line_11_qef_lt, 1_000);
  assertEquals(
    fieldsOf(result.outputs, income_tax_calculation)?.form8621_tax,
    1_902,
  );
  assertEquals(
    fieldsOf(result.outputs, schedule2)?.line17p_form8621_interest,
    230,
  );
  const filed = result.outputs.find((item) => item.nodeType === "form8621");
  assertEquals((filed?.fields as { items: Form8621Lines[] }).items.length, 3);
});

Deno.test("Form 8621 QEF ordinary income and net long-term gain use different return lines", () => {
  const result = compute([minimalItem({
    regime: PficRegime.QEF,
    qef_ordinary_income: 5_000,
    qef_capital_gain: 2_000,
  })]);
  assertEquals(fieldsOf(result.outputs, schedule1)?.line8z_other, 5_000);
  assertEquals(fieldsOf(result.outputs, schedule_d)?.line_11_qef_lt, 2_000);
});

Deno.test("Form 8621 QEF requires both pro rata income facts, including explicit zero", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        regime: PficRegime.QEF,
        qef_ordinary_income: 5_000,
      })]),
    Error,
    "both pro rata",
  );
  const result = compute([minimalItem({
    regime: PficRegime.QEF,
    qef_ordinary_income: 0,
    qef_capital_gain: 0,
  })]);
  assertEquals(
    result.outputs.some((item) => item.nodeType === "form8621"),
    true,
  );
  assertEquals(fieldsOf(result.outputs, schedule1), undefined);
});

Deno.test("Form 8621 QEF section 951 and 1293(g) amounts reduce each inclusion", () => {
  const result = compute([minimalItem({
    regime: PficRegime.QEF,
    qef_ordinary_income: 5_000,
    qef_ordinary_951_or_1293g_reduction: 1_500,
    qef_capital_gain: 2_000,
    qef_capital_951_or_1293g_reduction: 500,
  })]);
  assertEquals(fieldsOf(result.outputs, schedule1)?.line8z_other, 3_500);
  assertEquals(fieldsOf(result.outputs, schedule_d)?.line_11_qef_lt, 1_500);
  assertThrows(
    () =>
      compute([minimalItem({
        regime: PficRegime.QEF,
        qef_ordinary_income: 100,
        qef_ordinary_951_or_1293g_reduction: 200,
      })]),
    Error,
    "exceeds pro rata income",
  );
});

Deno.test("Form 8621 mark-to-market gain comes from value less basis", () => {
  const result = compute([minimalItem({
    regime: PficRegime.MTM,
    fmv_at_year_end: 15_000,
    mtm_adjusted_basis_at_year_end: 10_000,
  })]);
  assertEquals(fieldsOf(result.outputs, schedule1)?.line8z_other, 5_000);
});

Deno.test("Form 8621 mark-to-market loss is limited to unreversed inclusions", () => {
  const result = compute([minimalItem({
    regime: PficRegime.MTM,
    fmv_at_year_end: 7_000,
    mtm_adjusted_basis_at_year_end: 10_000,
    mtm_unreversed_inclusions: 1_200,
  })]);
  assertEquals(fieldsOf(result.outputs, schedule1)?.line8z_other, -1_200);
  assertThrows(
    () =>
      compute([minimalItem({
        regime: PficRegime.MTM,
        fmv_at_year_end: 7_000,
        mtm_adjusted_basis_at_year_end: 10_000,
      })]),
    Error,
    "unreversed prior inclusions",
  );
  assertThrows(
    () => compute([minimalItem({ regime: PficRegime.MTM })]),
    Error,
    "adjusted year-end stock basis",
  );
});

Deno.test("Form 8621 rejects Part V events on a different regime", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        regime: PficRegime.QEF,
        excess_events: [excessEvent()],
      })]),
    Error,
    "section 1291 regime",
  );
  assertThrows(
    () => compute([minimalItem({ qef_ordinary_income: 100 })]),
    Error,
    "QEF earnings require",
  );
  assertThrows(
    () => compute([minimalItem({ mtm_adjusted_basis_at_year_end: 100 })]),
    Error,
    "basis requires the MTM regime",
  );
});
