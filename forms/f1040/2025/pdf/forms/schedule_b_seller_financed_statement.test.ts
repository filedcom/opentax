import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { FilingStatus } from "../../../mef/header.ts";
import type { FilerIdentity } from "../../../mef/header.ts";
import { appendScheduleBSellerFinancedStatement } from "./schedule_b_seller_financed_statement.ts";

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

const seller = {
  buyer: {
    address_type: "us",
    name: "Jane Buyer",
    ssn: "123456789",
    address_line1: "456 Oak Ave",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  amount: 900,
};

Deno.test("Schedule B seller statement includes buyer details even for one row", async () => {
  const document = await PDFDocument.create();
  await appendScheduleBSellerFinancedStatement(document, {
    seller_financed_rows: [seller],
  }, filer);
  assertEquals(document.getPageCount(), 1);
  assertEquals(
    (await PDFDocument.load(await document.save())).getPageCount(),
    1,
  );
});

Deno.test("Schedule B seller statement paginates after eight buyers", async () => {
  const document = await PDFDocument.create();
  await appendScheduleBSellerFinancedStatement(document, {
    seller_financed_rows: Array.from({ length: 9 }, (_, index) => ({
      ...seller,
      buyer: { ...seller.buyer, name: `Buyer ${index + 1}` },
    })),
  }, filer);
  assertEquals(document.getPageCount(), 2);
});

Deno.test("Schedule B seller statement includes a foreign buyer address", async () => {
  const document = await PDFDocument.create();
  await appendScheduleBSellerFinancedStatement(document, {
    seller_financed_rows: [{
      buyer: {
        address_type: "foreign",
        name: "Jane Buyer",
        ssn: "123456789",
        address_line1: "10 Queen St",
        city: "Toronto",
        province_or_state: "Ontario",
        country_code: "CA",
        foreign_postal_code: "M5H2N2",
      },
      amount: 900,
    }],
  }, filer);
  assertEquals(document.getPageCount(), 1);
});

Deno.test("Schedule B seller statement rejects missing buyer SSN", async () => {
  const document = await PDFDocument.create();
  await assertRejects(
    () =>
      appendScheduleBSellerFinancedStatement(document, {
        seller_financed_rows: [{
          ...seller,
          buyer: { ...seller.buyer, ssn: "" },
        }],
      }, filer),
    Error,
    "complete buyer details",
  );
});
