import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { FilingStatus } from "../../../mef/header.ts";
import type { FilerIdentity } from "../../../mef/header.ts";
import { appendScheduleBInterestAdjustmentsStatement } from "./schedule_b_interest_adjustments_statement.ts";

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

Deno.test("Schedule B adjustment statement documents the gross-to-net calculation", async () => {
  const document = await PDFDocument.create();
  await appendScheduleBInterestAdjustmentsStatement(document, {
    interest_line1_subtotal: 2_000,
    interest_nominee: 100,
    interest_accrued: 50,
    interest_oid_adjustment: 75,
    interest_bond_premium: 125,
    print_line2_total: 1_650,
  }, filer);
  assertEquals(document.getPageCount(), 1);
  assertEquals(
    (await PDFDocument.load(await document.save())).getPageCount(),
    1,
  );
});

Deno.test("Schedule B adjustment statement rejects a nonreconciling net", async () => {
  const document = await PDFDocument.create();
  await assertRejects(
    () =>
      appendScheduleBInterestAdjustmentsStatement(document, {
        interest_line1_subtotal: 2_000,
        interest_nominee: 100,
        print_line2_total: 1_800,
      }, filer),
    Error,
    "does not reconcile",
  );
});
