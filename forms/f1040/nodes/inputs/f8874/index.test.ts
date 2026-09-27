import { assertEquals } from "@std/assert";
import { f3800 } from "../f3800/index.ts";
import { calculateForm8874, f8874 } from "./index.ts";

const investment = {
  cde_name: "Community Development Entity",
  cde_ein: "123456789",
  cde_address: {
    line1: "10 Main Street",
    city: "Wilmington",
    state: "DE",
    zip: "19801",
  },
  initial_investment_date: "2023-04-15",
  credit_allowance_date: "2025-04-15",
  qualified_equity_investment_amount: 1_000_000,
  designation_notice_reference: "2023 QEI notice",
  held_on_credit_allowance_date: true,
  qualified_on_credit_allowance_date: true,
  recapture_notice_received: false,
  subject_to_passive_activity_limit: false,
} as const;

Deno.test("Form 8874 computes each identified current-year credit allowance date", () => {
  const lines = calculateForm8874({
    investments: [investment, {
      ...investment,
      initial_investment_date: "2022-04-15",
      designation_notice_reference: "2022 QEI notice",
      qualified_equity_investment_amount: 500_000,
    }],
  });
  assertEquals(lines.rows.map((row) => row.creditYear), [3, 4]);
  assertEquals(lines.rows.map((row) => row.rate), [5, 6]);
  assertEquals(lines.rows.map((row) => row.creditAmount), [50_000, 30_000]);
  assertEquals(lines.line3, 80_000);
  const routed = f8874.compute(
    { taxYear: 2025, formType: "f1040" },
    { investments: [investment] },
  ).outputs[0];
  assertEquals(routed?.nodeType, "f3800");
  assertEquals(
    f3800.inputSchema.parse(routed?.fields).f8874_credit,
    {
      credit_amount: 50_000,
      subject_to_passive_activity_limit: false,
    },
  );
});

Deno.test("Form 8874 rejects duplicate direct and precomputed legacy amounts", () => {
  assertEquals(
    f8874.inputSchema.safeParse({
      investments: [investment],
      credit_years_1_to_3: 50_000,
    }).success,
    false,
  );
});

Deno.test("Form 8874 requires allowance-date and qualification evidence", () => {
  for (
    const source of [
      { ...investment, credit_allowance_date: "2024-04-15" },
      { ...investment, credit_allowance_date: "2025-04-16" },
      { ...investment, initial_investment_date: "2018-04-15" },
      { ...investment, qualified_on_credit_allowance_date: false },
      { ...investment, held_on_credit_allowance_date: false },
      { ...investment, recapture_notice_received: true },
      { ...investment, subject_to_passive_activity_limit: true },
      { ...investment, qualified_equity_investment_amount: 0.01 },
    ]
  ) {
    assertEquals(
      f8874.inputSchema.safeParse({ investments: [source] }).success,
      false,
    );
  }
});

Deno.test("Form 8874 rejects a duplicated investment notice", () => {
  assertEquals(
    f8874.inputSchema.safeParse({
      investments: [investment, investment],
    }).success,
    false,
  );
});

Deno.test("Form 8874 splits self-earned passive and nonpassive investments", () => {
  const passive = {
    ...investment,
    subject_to_passive_activity_limit: true,
    passive_activity_reference: "Community venture",
    passive_source_document_reference: "2025 community venture QEI",
  } as const;
  const direct = {
    ...investment,
    initial_investment_date: "2022-04-15",
    designation_notice_reference: "2022 QEI notice",
  } as const;
  const lines = calculateForm8874({ investments: [passive, direct] });
  assertEquals(lines.passiveCredit, 50_000);
  assertEquals(lines.nonpassiveCredit, 60_000);
  assertEquals(lines.line3, 110_000);
  const outputs = f8874.compute(
    { taxYear: 2025, formType: "f1040" },
    { investments: [passive, direct] },
  ).outputs;
  assertEquals(outputs.length, 2);
  assertEquals(
    f3800.inputSchema.parse(outputs[0].fields).f8874_credit?.credit_amount,
    60_000,
  );
  assertEquals(outputs[1].nodeType, "form8582cr");
  assertEquals(outputs[1].fields, {
    required_new_markets_self_credits: [{
      activity_reference: "Community venture",
      source_document_reference: "2025 community venture QEI",
      credit_amount: 50_000,
    }],
  });
  const passiveOnly = f8874.compute(
    { taxYear: 2025, formType: "f1040" },
    { investments: [passive] },
  ).outputs;
  assertEquals(passiveOnly.length, 1);
  assertEquals(passiveOnly[0].nodeType, "form8582cr");
});

Deno.test("Form 8874 passive investment requires distinct whole-dollar activity evidence", () => {
  const passive = {
    ...investment,
    subject_to_passive_activity_limit: true,
    passive_activity_reference: "Community venture",
    passive_source_document_reference: "2025 community venture QEI",
  } as const;
  assertEquals(
    f8874.inputSchema.safeParse({ investments: [passive] }).success,
    true,
  );
  assertEquals(
    f8874.inputSchema.safeParse({
      investments: [{
        ...passive,
        qualified_equity_investment_amount: 100.20,
      }],
    }).success,
    false,
  );
  assertEquals(
    f8874.inputSchema.safeParse({
      investments: [passive, {
        ...passive,
        initial_investment_date: "2022-04-15",
        designation_notice_reference: "2022 QEI notice",
      }],
    }).success,
    false,
  );
  assertEquals(
    f8874.inputSchema.safeParse({
      investments: [{
        ...investment,
        passive_activity_reference: "Not a passive activity",
      }],
    }).success,
    false,
  );
});
