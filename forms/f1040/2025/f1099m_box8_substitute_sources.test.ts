import { assertEquals, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../mef/header.ts";
import { assertSchedule1Box8SourceIdentity } from "./filer-source-reconciliation.ts";

const filer = {
  primarySSN: "987654321",
  filingStatus: FilingStatus.Single,
} as FilerIdentity;

const sources = [
  {
    payer_name: "Broker One",
    payer_tin: "123456789",
    recipient_tin: "987654321",
    box8_substitute_payments: 300,
  },
  {
    payer_name: "Broker Two",
    payer_tin: "234567890",
    recipient_tin: "987654321",
    box8_substitute_payments: 450,
  },
];
const rows = sources.map((item) => ({
  payer_name: item.payer_name,
  payer_tin: item.payer_tin,
  recipient_tin: item.recipient_tin,
  amount: item.box8_substitute_payments,
}));
const pending = {
  f1099m: { f1099ms: sources },
  schedule1: {
    line8z_substitute_payments: 750,
    f1099m_box8_substitute_sources: rows,
  },
};

Deno.test("1099-MISC box 8 sources reconcile one to one with Schedule 1", () => {
  assertEquals(assertSchedule1Box8SourceIdentity(pending, filer), undefined);
  assertThrows(
    () =>
      assertSchedule1Box8SourceIdentity({
        ...pending,
        schedule1: { ...pending.schedule1, line8z_substitute_payments: 749 },
      }, filer),
    Error,
    "differ from 1099-MISC box 8 sources",
  );
  assertThrows(
    () =>
      assertSchedule1Box8SourceIdentity({
        ...pending,
        schedule1: {
          ...pending.schedule1,
          f1099m_box8_substitute_sources: [
            rows[0],
            { ...rows[1], payer_tin: "000000000" },
          ],
        },
      }, filer),
    Error,
    "row differs from its 1099-MISC source",
  );
  assertThrows(
    () =>
      assertSchedule1Box8SourceIdentity({
        ...pending,
        f1099m: {
          f1099ms: [{ ...sources[0], recipient_tin: "111223333" }, sources[1]],
        },
      }, filer),
    Error,
    "source identity or amount is invalid",
  );
  assertThrows(
    () =>
      assertSchedule1Box8SourceIdentity({
        ...pending,
        schedule1: {
          ...pending.schedule1,
          f1099m_box8_substitute_sources: [rows[0]],
        },
      }, filer),
    Error,
    "one row per 1099-MISC box 8 source",
  );
});
