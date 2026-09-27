import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { FilingStatus } from "../../../mef/header.ts";
import type { FilerIdentity } from "../../../mef/header.ts";
import { normalizeAllPending } from "../../pending.ts";
import { appendScheduleBInterestStatement } from "./schedule_b_interest_statement.ts";

const filer: FilerIdentity = {
  primarySSN: "111223333",
  nameLine1: "TEST TAXPAYER",
  nameControl: "TAXP",
  address: {
    line1: "1 Test Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  filingStatus: FilingStatus.Single,
};

function rows(count: number): Record<string, unknown> {
  return {
    print_interest_rows: Array.from({ length: count }, (_, index) => ({
      payerName: `Issuer ${index + 1}`,
      amount: index + 1,
    })),
  };
}

Deno.test("Schedule B interest statement starts after 14 printed payers", async () => {
  const document = await PDFDocument.create();
  await appendScheduleBInterestStatement(document, rows(14), filer);
  assertEquals(document.getPageCount(), 0);
  await appendScheduleBInterestStatement(document, rows(15), filer);
  assertEquals(document.getPageCount(), 1);
  assertEquals(
    (await PDFDocument.load(await document.save())).getPageCount(),
    1,
  );
});

Deno.test("Schedule B interest statement paginates all additional payers", async () => {
  const document = await PDFDocument.create();
  await appendScheduleBInterestStatement(document, rows(75), filer);
  assertEquals(document.getPageCount(), 3);
});

Deno.test("Schedule B interest statement keeps paired rows after pending normalization", async () => {
  const document = await PDFDocument.create();
  const normalized = normalizeAllPending({
    schedule_b: {
      ...rows(15),
      taxable_interest_net: Array.from({ length: 15 }, (_, index) => index + 1),
      interest_line1_subtotal: 120,
    },
  });
  await appendScheduleBInterestStatement(
    document,
    normalized.schedule_b,
    filer,
  );
  assertEquals(document.getPageCount(), 1);
});

Deno.test("Schedule B interest continuation reconciles gross line 1 before deductions", async () => {
  const document = await PDFDocument.create();
  await appendScheduleBInterestStatement(document, {
    ...rows(15),
    interest_line1_subtotal: 120,
    print_line2_total: 90,
    interest_nominee: 30,
  }, filer);
  assertEquals(document.getPageCount(), 1);
});

Deno.test("Schedule B interest statement rejects missing payer detail", async () => {
  const document = await PDFDocument.create();
  await assertRejects(
    () =>
      appendScheduleBInterestStatement(document, {
        print_interest_rows: [
          ...Array.from(
            { length: 14 },
            () => ({ payerName: "Issuer", amount: 100 }),
          ),
          { payerName: "", amount: 100 },
        ],
      }, filer),
    Error,
    "paired payer names and amounts",
  );
});

Deno.test("Schedule B interest statement requires filer identity", async () => {
  const document = await PDFDocument.create();
  await assertRejects(
    () => appendScheduleBInterestStatement(document, rows(15), undefined),
    Error,
    "needs filer identity",
  );
});
