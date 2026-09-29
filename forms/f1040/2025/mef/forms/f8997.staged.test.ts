import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import type { ExecuteResult } from "../../../../../core/runtime/executor.ts";
import {
  type Form8997Input,
  QofEventKind,
  QofInclusionType,
} from "../../../nodes/inputs/f8997/ledger.ts";
import { stagedForm8997Pdf } from "../../pdf/forms/f8997.staged.ts";
import { buildStagedIRS8997 } from "./f8997.staged.ts";

const source: Form8997Input = {
  tax_year: 2025,
  complete_annual_ledger_confirmed: true,
  reviewed_annual_workpaper_reference: "reviewed-qof-2025",
  prior_year: {
    kind: "continuing",
    filed_form8997_reference: "filed-2024-8997",
    closing_lots: [{
      lot_id: "old-lot",
      qof_ein: "123456789",
      acquired_date: "2020-01-15",
      short_term: 0,
      long_term: 50_000,
    }],
  },
  investment_lots: [
    {
      lot_id: "old-lot",
      qof_ein: "123456789",
      acquired_date: "2020-01-15",
      description: "Five percent QOF interest",
      qof_source_document_reference: "fund-statement-old",
      reviewed_workpaper_reference: "old-lot-rollforward",
      opening_deferred_gain: { short_term: 0, long_term: 50_000 },
      events: [{
        event_id: "old-lot-sale",
        kind: QofEventKind.Inclusion,
        inclusion_type: QofInclusionType.SaleOrExchange,
        event_date: "2025-08-01",
        description: "Partial sale of QOF interest",
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
      }],
      closing_deferred_gain: { short_term: 0, long_term: 40_000 },
    },
    {
      lot_id: "new-lot",
      qof_ein: "987654321",
      acquired_date: "2025-03-20",
      description: "One hundred QOF shares",
      qof_source_document_reference: "fund-statement-new",
      reviewed_workpaper_reference: "new-lot-rollforward",
      opening_deferred_gain: { short_term: 0, long_term: 0 },
      new_deferral: {
        kind: "new_election",
        deferred_gain: { short_term: 20_000, long_term: 0 },
        gain_realized_date: "2025-01-20",
        source_gain_references: ["stock-sale-1"],
        form8949_code_z_rows: { short_term_row_reference: "8949-Z-1" },
      },
      events: [],
      closing_deferred_gain: { short_term: 20_000, long_term: 0 },
    },
  ],
  uninvested_deferred_gain_at_year_end: { short_term: 0, long_term: 0 },
  foreign_eligible_taxpayer: false,
  treaty_benefits_waived: false,
  no_form1099b_for_disposition: true,
};

const filedRows = [
  {
    part: "A",
    description: "Stock sale",
    source_transaction_id: "stock-sale-1",
    date_acquired: "2024-06-01",
    date_sold: "2025-01-20",
    proceeds: 30_000,
    cost_basis: 10_000,
    gain_loss: 20_000,
    is_long_term: false,
  },
  {
    part: "C",
    description: "987654321",
    source_transaction_id: "8949-Z-1",
    date_acquired: "2025-03-20",
    date_sold: "",
    proceeds: 0,
    cost_basis: 0,
    adjustment_codes: "Z",
    adjustment_amount: -20_000,
    gain_loss: -20_000,
    is_long_term: false,
  },
  {
    part: "F",
    description: "123456789",
    source_transaction_id: "8949-Y-1",
    date_acquired: "2020-01-15",
    date_sold: "2025-08-01",
    proceeds: 20_000,
    cost_basis: 10_000,
    adjustment_codes: "Y",
    adjustment_amount: 10_000,
    gain_loss: 20_000,
    is_long_term: true,
  },
];

const pending: ExecuteResult["pending"] = {
  f8997: source,
  form8949: { transaction: filedRows },
  schedule_d: { transaction: filedRows.map((row) => ({ ...row })) },
};

Deno.test("staged IRS8997 projects all four ordered parts and derived totals", () => {
  const xml = buildStagedIRS8997(pending);
  assertStringIncludes(xml, "<IRS8997>");
  assertStringIncludes(xml, "<TotQOFInvstHoldBOYGrp>");
  assertStringIncludes(xml, "<CapGainDefrdInvstQOFCurrTYGrp>");
  assertStringIncludes(xml, "<InclsnEvtOthTrnsfrDurCurrTYGrp>");
  assertStringIncludes(xml, "<TotQOFInvstHoldEOYGrp>");
  assertStringIncludes(
    xml,
    "<TotBOYLTDefrdGainRmngQOFAmt>50000</TotBOYLTDefrdGainRmngQOFAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotShortTermDefrdGainRmngAmt>20000</TotShortTermDefrdGainRmngAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotPrevDefrdLongTermGainAmt>10000</TotPrevDefrdLongTermGainAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotEOYLTDefrdGainInvstAmt>40000</TotEOYLTDefrdGainInvstAmt>",
  );
  assertStringIncludes(
    xml,
    "<Form1099BNotReceivedInd>X</Form1099BNotReceivedInd>",
  );
  assertEquals(
    xml.indexOf("TotQOFInvstHoldBOYGrp") <
        xml.indexOf("CapGainDefrdInvstQOFCurrTYGrp") &&
      xml.indexOf("CapGainDefrdInvstQOFCurrTYGrp") <
        xml.indexOf("InclsnEvtOthTrnsfrDurCurrTYGrp") &&
      xml.indexOf("InclsnEvtOthTrnsfrDurCurrTYGrp") <
        xml.indexOf("TotQOFInvstHoldEOYGrp"),
    true,
  );
});

Deno.test("staged Form 8997 PDF uses the same Part I-IV ledger and only form pages", () => {
  const instance = stagedForm8997Pdf.instances?.(
    { ...source },
    undefined,
    pending,
  )[0];
  assertEquals(stagedForm8997Pdf.pageIndices?.({}), [0, 1]);
  assertEquals(instance?.part1_row1_ein, "123456789");
  assertEquals(instance?.part1_row1_date, "01/15/2020");
  assertEquals(instance?.part2_short_total, 20_000);
  assertEquals(instance?.part3_long_total, 10_000);
  assertEquals(instance?.part4_long_total, 40_000);
  assertEquals(instance?.foreign_no, true);
  assertEquals(instance?.no_1099b, true);
  assertEquals(stagedForm8997Pdf.fields.length, 133);
});

Deno.test("staged Form 8997 PDF rejects unsupported exception events", () => {
  const overflowing = structuredClone(source);
  for (let index = 0; index < 5; index++) {
    overflowing.investment_lots[0].events.push({
      event_id: `exception-${index}`,
      kind: QofEventKind.Exception,
      event_date: "2025-08-02",
      description: `Excepted event ${index}`,
      source_event_reference: `exception-source-${index}`,
      exception_regulation_citation: "1.1400Z2(b)-1(c)(6)",
      deferred_gain_removed: { short_term: 0, long_term: 0 },
      included_gain: { short_term: 0, long_term: 0 },
    });
  }
  assertThrows(
    () =>
      stagedForm8997Pdf.instances?.(overflowing, undefined, {
        ...pending,
        f8997: overflowing,
      }),
    Error,
    "non-sale, mixed-character and special events need a separate verified join",
  );
});

Deno.test("staged Form 8997 rejects a missing executor Schedule D transaction", () => {
  assertThrows(
    () => buildStagedIRS8997({ ...pending, schedule_d: {} }),
    Error,
    "exactly one executor Schedule D transaction",
  );
});

Deno.test("staged Form 8997 rejects a Form 8949 arithmetic mismatch", () => {
  const changed = structuredClone(pending) as Record<
    string,
    Record<string, unknown>
  >;
  const rows = changed.form8949.transaction as Array<Record<string, unknown>>;
  rows[1].adjustment_amount = 20_000;
  assertThrows(
    () => buildStagedIRS8997(changed),
    Error,
    "gain or loss does not reconcile to proceeds, basis, and column (g)",
  );
});

Deno.test("staged Form 8997 rejects a matching but wrong-character code Z row", () => {
  const changed = structuredClone(pending) as Record<
    string,
    Record<string, unknown>
  >;
  const formRows = changed.form8949.transaction as Array<
    Record<string, unknown>
  >;
  const scheduleRows = changed.schedule_d.transaction as Array<
    Record<string, unknown>
  >;
  formRows[1].part = "F";
  formRows[1].is_long_term = true;
  scheduleRows[1].part = "F";
  scheduleRows[1].is_long_term = true;
  assertThrows(
    () => buildStagedIRS8997(changed),
    Error,
    "wrong original gain character",
  );
});

Deno.test("staged Form 8997 rejects an unlinked executor code Y row", () => {
  const extra = {
    ...filedRows[2],
    source_transaction_id: "unlinked-y",
  };
  assertThrows(
    () =>
      buildStagedIRS8997({
        ...pending,
        form8949: { transaction: [...filedRows, extra] },
        schedule_d: { transaction: [...filedRows, extra] },
      }),
    Error,
    "unlinked QOF code Z or Y row",
  );
});
