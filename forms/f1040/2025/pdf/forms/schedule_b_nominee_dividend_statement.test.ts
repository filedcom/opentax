import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { FilingStatus } from "../../../mef/header.ts";
import type { FilerIdentity } from "../../../mef/header.ts";
import { appendScheduleBNomineeDividendStatement } from "./schedule_b_nominee_dividend_statement.ts";

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

Deno.test("Schedule B nominee dividend statement records gross, nominee, and net", async () => {
  const document = await PDFDocument.create();
  await appendScheduleBNomineeDividendStatement(document, {
    dividend_line5_subtotal: 1_000,
    dividend_nominee: 400,
    print_line6_total: 600,
  }, filer);
  assertEquals(document.getPageCount(), 1);
  assertEquals(
    (await PDFDocument.load(await document.save())).getPageCount(),
    1,
  );
});

Deno.test("Schedule B nominee dividend statement rejects mismatched net", async () => {
  const document = await PDFDocument.create();
  await assertRejects(
    () =>
      appendScheduleBNomineeDividendStatement(document, {
        dividend_line5_subtotal: 1_000,
        dividend_nominee: 400,
        print_line6_total: 700,
      }, filer),
    Error,
    "do not reconcile",
  );
});
