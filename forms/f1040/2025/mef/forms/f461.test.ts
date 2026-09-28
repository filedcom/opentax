import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form461 } from "./f461.ts";
import { filedForm461Schema } from "../../../nodes/intermediate/forms/form461/index.ts";

const filed = {
  line2_business_income_loss: -200_000,
  line3_capital_gain_loss: 0 as const,
  line4_other_gain_loss: 0 as const,
  line5_rental_income_loss: 0 as const,
  line6_net_farm_profit_loss: -200_000,
  line8_other_income_gain_loss: 0 as const,
  line9_total_income_loss: -400_000,
  line10_nonbusiness_income_gain: 0 as const,
  line11_nonbusiness_deduction_loss: 0 as const,
  line12_nonbusiness_total: 0 as const,
  line13_adjustment: 0 as const,
  line14_adjusted_total: -400_000,
  line15_threshold: 313_000 as const,
  line16_excess_business_loss: -87_000,
};

Deno.test("Form 461 is absent when no business-loss source was filed", () => {
  assertEquals(form461.build([]), "");
});

Deno.test("Form 461 MeF serializes all filed lines in TY2025 native order", () => {
  const xml = form461.build(filed, {
    pending: {
      f1040: { filing_status: "single" },
      schedule1: {
        line3_schedule_c: -200_000,
        line6_schedule_f: -200_000,
        line8p_excess_business_loss: 87_000,
      },
    },
  });
  assertStringIncludes(
    xml,
    "<BusinessIncomeLossAmt>-200000</BusinessIncomeLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<NetFarmProfitLossAmt>-200000</NetFarmProfitLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<FilingStatusThresholdCd>313000</FilingStatusThresholdCd>",
  );
  assertStringIncludes(
    xml,
    "<ExcessBusinessLossAmt>-87000</ExcessBusinessLossAmt>",
  );
  assertEquals(
    xml.indexOf("<BusinessIncomeLossAmt>") <
      xml.indexOf("<NetFarmProfitLossAmt>"),
    true,
  );
  assertEquals(
    xml.indexOf("<NetFarmProfitLossAmt>") <
      xml.indexOf("<TotalIncomeOrLossAmt>"),
    true,
  );
});

Deno.test("Form 461 MeF rejects a Schedule 1 reconciliation mismatch", () => {
  assertThrows(() =>
    form461.build(filed, {
      pending: {
        f1040: { filing_status: "single" },
        schedule1: {
          line3_schedule_c: -199_000,
          line6_schedule_f: -200_000,
          line8p_excess_business_loss: 87_000,
        },
      },
    })
  );
  assertThrows(() =>
    form461.build(filed, {
      pending: {
        f1040: { filing_status: "single" },
        schedule1: {
          line3_schedule_c: -200_000,
          line6_schedule_f: -200_000,
          line8p_excess_business_loss: 86_000,
        },
      },
    })
  );
});

Deno.test("Form 461 MeF rejects unclassified capital, other gain, and rental lines", () => {
  const schedule1 = {
    line3_schedule_c: -200_000,
    line6_schedule_f: -200_000,
    line8p_excess_business_loss: 87_000,
  };
  for (
    const pending of [
      {
        f1040: { filing_status: "single", line7_capital_gain: 100 },
        schedule1,
      },
      {
        f1040: { filing_status: "single", line7a_cap_gain_distrib: 100 },
        schedule1,
      },
      {
        f1040: {
          filing_status: "single",
          line7_capital_gain: -100,
          line7a_cap_gain_distrib: 100,
        },
        schedule1,
      },
      {
        f1040: { filing_status: "single" },
        schedule1: { ...schedule1, line4_other_gains: 100 },
      },
      {
        f1040: { filing_status: "single" },
        schedule1: { ...schedule1, line5_schedule_e: [-10, 20] },
      },
      {
        f1040: { filing_status: "single" },
        schedule1: { ...schedule1, line8z_taxable_grants: 100 },
      },
    ]
  ) {
    assertThrows(
      () => form461.build(filed, { pending }),
      Error,
      "cannot classify",
    );
  }
});

Deno.test("Form 461 MeF rejects unclassified source forms and missing filed return", () => {
  const schedule1 = {
    line3_schedule_c: -200_000,
    line6_schedule_f: -200_000,
    line8p_excess_business_loss: 87_000,
  };
  assertThrows(
    () => form461.build(filed, { pending: { schedule1 } }),
    Error,
    "needs filed Schedule 1 and Form 1040",
  );
  for (const key of ["schedule_e", "form4797", "form6252", "form4684"]) {
    const pending = {
      f1040: { filing_status: "single" },
      schedule1,
      [key]: {},
    };
    assertThrows(
      () => form461.build(filed, { pending }),
      Error,
      "cannot classify",
    );
  }
});

Deno.test("Form 461 MeF rejects an inconsistent threshold or calculated line", () => {
  assertThrows(() =>
    form461.build(filed, {
      pending: {
        f1040: { filing_status: "mfj" },
        schedule1: {
          line3_schedule_c: -200_000,
          line6_schedule_f: -200_000,
          line8p_excess_business_loss: 87_000,
        },
      },
    })
  );
  assertThrows(() =>
    form461.build({
      ...filed,
      line9_total_income_loss: -399_999,
    })
  );
});

Deno.test("Form 461 MeF rejects legacy excess-only payload", () => {
  assertThrows(() =>
    filedForm461Schema.parse({ excess_business_loss: 87_000 })
  );
});
