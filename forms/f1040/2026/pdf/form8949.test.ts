import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import {
  buildForm8949PdfBytes2026,
  filedForm8949Transactions,
} from "./form8949.ts";

const filer = { name: "Ada Rivera", ssn: "111223333" };
const shortTrade = {
  part: "B",
  description: "10 shares XYZ",
  date_acquired: "2026-01-10",
  date_sold: "2026-06-10",
  proceeds: 1_200,
  cost_basis: 1_000,
  gain_loss: 200,
  is_long_term: false,
};

Deno.test("TY2026 Form 8949 separates categories and continues the twelfth row", async () => {
  const transactions = [
    ...Array.from({ length: 12 }, (_, index) => ({
      ...shortTrade,
      description: `Trade ${index + 1}`,
    })),
    { ...shortTrade, part: "H" },
    {
      ...shortTrade,
      part: "E",
      is_long_term: true,
      adjustment_codes: "B",
      adjustment_amount: 100,
      gain_loss: 300,
    },
    {
      ...shortTrade,
      part: "J",
      is_long_term: true,
      proceeds: 3_000,
      cost_basis: 2_000,
      gain_loss: 1_000,
    },
  ];
  const fields = { transaction: transactions };
  assertEquals(filedForm8949Transactions(fields).length, 14);
  const pdf = await PDFDocument.load(
    await buildForm8949PdfBytes2026(fields, filer),
  );
  assertEquals(pdf.getPageCount(), 4);
  assertEquals(pdf.getForm().getFields().length, 0);
});

Deno.test("TY2026 Form 8949 omits direct basis-reported trades", async () => {
  const direct = {
    ...shortTrade,
    part: "G",
  };
  assertEquals(filedForm8949Transactions({ transaction: direct }), []);
  await assertRejects(
    () => buildForm8949PdfBytes2026({ transaction: direct }, filer),
    Error,
    "no filed transactions",
  );
});

Deno.test("TY2026 Form 8949 checks gain and adjustment code", () => {
  for (
    const transaction of [
      { ...shortTrade, gain_loss: 201 },
      { ...shortTrade, adjustment_amount: 50, gain_loss: 250 },
      { ...shortTrade, adjustment_codes: "Q" },
    ]
  ) {
    try {
      filedForm8949Transactions({ transaction });
      throw new Error("accepted invalid trade");
    } catch (error) {
      assertEquals(
        (error as Error).message,
        "TY2026 Form 8949 transaction detail does not reconcile",
      );
    }
  }
});
