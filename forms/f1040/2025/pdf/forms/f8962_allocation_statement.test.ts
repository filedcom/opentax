import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { FilingStatus } from "../../../mef/header.ts";
import type { FilerIdentity } from "../../../mef/header.ts";
import { appendForm8962AllocationStatement } from "./f8962_allocation_statement.ts";

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

function allocations(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    policy_number: `POLICY-${index + 1}`,
    other_taxpayer_ssn: "222334444",
    start_month: index % 12 + 1,
    end_month: index % 12 + 1,
    premium_pct: 0.5,
    slcsp_pct: 0.5,
    aptc_pct: 0.5,
  }));
}

Deno.test("Form 8962 allocation statement starts after four printed rows", async () => {
  const document = await PDFDocument.create();
  await appendForm8962AllocationStatement(
    document,
    { shared_policy_allocations: allocations(4) },
    filer,
  );
  assertEquals(document.getPageCount(), 0);
  await appendForm8962AllocationStatement(
    document,
    { shared_policy_allocations: allocations(5) },
    filer,
  );
  assertEquals(document.getPageCount(), 1);
  assertEquals(
    (await PDFDocument.load(await document.save())).getPageCount(),
    1,
  );
});

Deno.test("Form 8962 allocation statement paginates through the MeF maximum", async () => {
  const document = await PDFDocument.create();
  await appendForm8962AllocationStatement(
    document,
    { shared_policy_allocations: allocations(99) },
    filer,
  );
  assertEquals(document.getPageCount(), 4);
});

Deno.test("Form 8962 allocation statement requires filer identification", async () => {
  const document = await PDFDocument.create();
  await assertRejects(
    () =>
      appendForm8962AllocationStatement(
        document,
        { shared_policy_allocations: allocations(5) },
        undefined,
      ),
    Error,
    "needs filer identity",
  );
});

Deno.test("Form 8962 allocation statement rejects more than 99 rows", async () => {
  const document = await PDFDocument.create();
  await assertRejects(
    () =>
      appendForm8962AllocationStatement(
        document,
        { shared_policy_allocations: allocations(100) },
        filer,
      ),
    Error,
    "99-row MeF limit",
  );
});
