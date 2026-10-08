import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateForm8997Statement,
  f8997,
  type Form8997Input,
  inputSchema,
  QofEventKind,
  QofInclusionType,
  QofSpecialGainCode,
} from "./index.ts";

const context = { taxYear: 2025, formType: "f1040" } as const;
const zero = { short_term: 0, long_term: 0 };

function continuingHolding(): Form8997Input {
  return {
    tax_year: 2025,
    complete_annual_ledger_confirmed: true,
    reviewed_annual_workpaper_reference: "QOF-2025-ledger",
    prior_year: {
      kind: "continuing",
      filed_form8997_reference: "filed-2024-8997",
      closing_lots: [{
        lot_id: "lot-2021",
        qof_ein: "123456789",
        acquired_date: "2020-10-15",
        short_term: 0,
        long_term: 50_000,
      }],
    },
    investment_lots: [{
      lot_id: "lot-2021",
      qof_ein: "123456789",
      acquired_date: "2020-10-15",
      description: "Five percent QOF interest",
      qof_source_document_reference: "fund-2025-statement",
      reviewed_workpaper_reference: "lot-2021-rollforward",
      opening_deferred_gain: { short_term: 0, long_term: 50_000 },
      events: [],
      closing_deferred_gain: { short_term: 0, long_term: 50_000 },
    }],
    uninvested_deferred_gain_at_year_end: { ...zero },
    foreign_eligible_taxpayer: false,
    treaty_benefits_waived: false,
    no_form1099b_for_disposition: false,
  };
}

Deno.test("Form 8997: loose legacy Part I-IV arrays are not the public source contract", () => {
  assertEquals(inputSchema.safeParse({ part_i: [] }).success, false);
});

Deno.test("Form 8997: sourced continuing holding reconciles Parts I and IV", () => {
  const input = continuingHolding();
  const statement = calculateForm8997Statement(input);
  assertEquals(statement.part_i.totals.long_term, 50_000);
  assertEquals(statement.part_ii.rows.length, 0);
  assertEquals(statement.part_iii.rows.length, 0);
  assertEquals(statement.part_iv.totals.long_term, 50_000);
  assertEquals(f8997.compute(context, input).outputs, []);
  assertEquals(f8997.outputNodes.nodeTypes, []);
});

Deno.test("Form 8997: opening lot cannot differ from filed prior-year closing lot", () => {
  const input = continuingHolding();
  input.investment_lots[0].opening_deferred_gain.long_term = 49_000;
  assertEquals(inputSchema.safeParse(input).success, false);
});

Deno.test("Form 8997: first-year code-Z deferral projects Part II but cannot calculate return yet", () => {
  const input: Form8997Input = {
    ...continuingHolding(),
    prior_year: { kind: "first_year" },
    investment_lots: [{
      lot_id: "new-2025",
      qof_ein: "987654321",
      acquired_date: "2025-03-20",
      description: "One hundred QOF shares",
      qof_source_document_reference: "QOF-subscription-2025",
      reviewed_workpaper_reference: "new-2025-rollforward",
      opening_deferred_gain: zero,
      new_deferral: {
        kind: "new_election",
        deferred_gain: { short_term: 10_000, long_term: 0 },
        gain_realized_date: "2025-01-15",
        source_gain_references: ["stock-sale-2025-1"],
        form8949_code_z_rows: { short_term_row_reference: "8949-Z-1" },
      },
      events: [],
      closing_deferred_gain: { short_term: 10_000, long_term: 0 },
    }],
  };
  const statement = calculateForm8997Statement(input);
  assertEquals(statement.part_ii.totals.short_term, 10_000);
  assertThrows(
    () => f8997.compute(context, input),
    Error,
    "needs finalized Form 8949 and source reconciliation",
  );
});

Deno.test("Form 8997: positive short-term deferral needs its own code-Z row", () => {
  const input: Form8997Input = {
    ...continuingHolding(),
    prior_year: { kind: "first_year" },
    investment_lots: [{
      ...continuingHolding().investment_lots[0],
      acquired_date: "2025-03-20",
      opening_deferred_gain: zero,
      new_deferral: {
        kind: "new_election",
        deferred_gain: { short_term: 10_000, long_term: 0 },
        gain_realized_date: "2025-01-15",
        source_gain_references: ["stock-sale-1"],
        form8949_code_z_rows: {},
      },
      closing_deferred_gain: { short_term: 10_000, long_term: 0 },
    }],
  };
  assertEquals(inputSchema.safeParse(input).success, false);
});

Deno.test("Form 8997: zero-character deferral cannot claim a code-Z row", () => {
  const input: Form8997Input = {
    ...continuingHolding(),
    prior_year: { kind: "first_year" },
    investment_lots: [{
      ...continuingHolding().investment_lots[0],
      acquired_date: "2025-03-20",
      opening_deferred_gain: zero,
      new_deferral: {
        kind: "new_election",
        deferred_gain: { short_term: 10_000, long_term: 0 },
        gain_realized_date: "2025-01-15",
        source_gain_references: ["stock-sale-1"],
        form8949_code_z_rows: {
          short_term_row_reference: "8949-Z-1",
          long_term_row_reference: "unearned-long-term-Z",
        },
      },
      closing_deferred_gain: { short_term: 10_000, long_term: 0 },
    }],
  };
  assertEquals(inputSchema.safeParse(input).success, false);
});

Deno.test("Form 8997: inclusion retains original long-term character and code-Y row", () => {
  const input = continuingHolding();
  input.investment_lots[0].events = [{
    event_id: "sale-2025-1",
    kind: QofEventKind.Inclusion,
    inclusion_type: QofInclusionType.SaleOrExchange,
    event_date: "2025-07-01",
    description: "Sale of QOF interest",
    source_event_reference: "broker-sale-1",
    deferred_gain_removed: { short_term: 0, long_term: 20_000 },
    included_gain: { short_term: 0, long_term: 20_000 },
    form8949_code_y_rows: { long_term_row_reference: "8949-Y-1" },
    disposition: {
      source_transaction_reference: "broker-sale-1",
      received_form1099b: false,
      proceeds: 30_000,
      adjusted_basis: 10_000,
    },
  }];
  input.investment_lots[0].closing_deferred_gain.long_term = 30_000;
  input.no_form1099b_for_disposition = true;
  const statement = calculateForm8997Statement(input);
  assertEquals(statement.part_iii.totals.long_term, 20_000);
  assertEquals(statement.part_iv.totals.long_term, 30_000);
  assertEquals(statement.no_form1099b_for_disposition, true);
  assertThrows(() => f8997.compute(context, input), Error, "needs finalized Form 8949");
});

Deno.test("Form 8997: disposition checkbox cannot disagree with broker evidence", () => {
  const input = continuingHolding();
  input.investment_lots[0].events = [{
    event_id: "sale-1",
    kind: QofEventKind.Inclusion,
    inclusion_type: QofInclusionType.SaleOrExchange,
    event_date: "2025-07-01",
    description: "Sale",
    source_event_reference: "broker-sale-1",
    deferred_gain_removed: { short_term: 0, long_term: 10_000 },
    included_gain: { short_term: 0, long_term: 10_000 },
    form8949_code_y_rows: { long_term_row_reference: "8949-Y-1" },
    disposition: {
      source_transaction_reference: "broker-sale-1",
      received_form1099b: false,
      proceeds: 20_000,
      adjusted_basis: 10_000,
    },
  }];
  input.investment_lots[0].closing_deferred_gain.long_term = 40_000;
  assertEquals(inputSchema.safeParse(input).success, false);
});

Deno.test("Form 8997: five-year basis adjustment needs code and workpaper", () => {
  const input = continuingHolding();
  input.investment_lots[0].events = [{
    event_id: "inclusion-1",
    kind: QofEventKind.Inclusion,
    inclusion_type: QofInclusionType.Distribution,
    event_date: "2025-11-01",
    description: "QOF distribution",
    source_event_reference: "distribution-1",
    deferred_gain_removed: { short_term: 0, long_term: 10_000 },
    included_gain: { short_term: 0, long_term: 9_000 },
    basis_adjustment: { short_term: 0, long_term: 1_000 },
    basis_adjustment_code: QofSpecialGainCode.FiveYearBasis,
    basis_workpaper_reference: "five-year-basis-1",
    form8949_code_y_rows: { long_term_row_reference: "8949-Y-1" },
  }];
  input.investment_lots[0].closing_deferred_gain.long_term = 40_000;
  const statement = calculateForm8997Statement(input);
  assertEquals(statement.part_iii.rows.length, 2);
  assertEquals(statement.part_iii.rows[1].special_gain_code, QofSpecialGainCode.FiveYearBasis);
  assertEquals(statement.part_iii.totals.long_term, 10_000);
});

Deno.test("Form 8997: uninvested deferred gain cannot disappear from Part IV", () => {
  const input = continuingHolding();
  input.uninvested_deferred_gain_at_year_end.long_term = 1_000;
  assertEquals(inputSchema.safeParse(input).success, false);
});

Deno.test("Form 8997: new deferral cannot claim a transfer or basis-adjustment code", () => {
  const input = continuingHolding();
  input.prior_year = { kind: "first_year" };
  input.investment_lots[0].acquired_date = "2025-03-20";
  input.investment_lots[0].opening_deferred_gain = zero;
  input.investment_lots[0].new_deferral = {
    kind: "new_election",
    deferred_gain: { short_term: 0, long_term: 10_000 },
    gain_realized_date: "2025-01-20",
    source_gain_references: ["sale-1"],
    form8949_code_z_rows: { long_term_row_reference: "8949-Z-1" },
    special_gain_code: QofSpecialGainCode.NoninclusionTransfer,
  };
  input.investment_lots[0].closing_deferred_gain.long_term = 10_000;
  assertEquals(inputSchema.safeParse(input).success, false);
});

Deno.test("Form 8997: transfer-out needs an amount removed from the lot", () => {
  const input = continuingHolding();
  input.investment_lots[0].events = [{
    event_id: "transfer-1",
    kind: QofEventKind.NoninclusionTransferOut,
    event_date: "2025-06-15",
    description: "Transfer of QOF interest",
    source_event_reference: "transfer-agreement-1",
    special_gain_code: QofSpecialGainCode.NoninclusionTransfer,
    deferred_gain_removed: zero,
    included_gain: zero,
    transferee: {
      name: "Recipient",
      tin: "987654321",
      transfer_date: "2025-06-15",
      source_document_reference: "transfer-agreement-1",
    },
  }];
  assertEquals(inputSchema.safeParse(input).success, false);
});
