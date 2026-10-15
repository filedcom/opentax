import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import {
  investmentOwner,
  syntheticInvestmentClaim2026,
} from "../inputs/investment.fixture.ts";
import {
  buildScheduleBPdfBytes2026,
  scheduleBPrintData2026,
} from "./schedule_b.ts";
import { scheduleBFixture2026 } from "./schedule_b.fixture.ts";

const filer = { name: "Synthetic Investor", ssn: "123456789" };
const destinations = { form1040_line2b: 3149, form1040_line3b: 1605 };

async function extract(bytes: Uint8Array) {
  const dir = await Deno.makeTempDir();
  try {
    await Deno.writeFile(`${dir}/schedule-b.pdf`, bytes);
    const result = await new Deno.Command("pdftotext", {
      args: ["-layout", `${dir}/schedule-b.pdf`, "-"],
    }).output();
    assertEquals(result.code, 0);
    return new TextDecoder().decode(result.stdout);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
}

Deno.test("2026 Schedule B keeps cents, all payers, subtotal and separate adjustments", () => {
  const data = scheduleBPrintData2026(scheduleBFixture2026(), destinations);
  assertEquals(data.interestRows.length, 36);
  assertEquals(data.interestRows[0].payerName, "Synthetic Buyer");
  assertEquals(data.interestRows.slice(-4), [
    { payerName: "Subtotal", amount: 3209.92 },
    { payerName: "Nominee Distribution", amount: -10.11 },
    { payerName: "Accrued Interest", amount: -20.22 },
    { payerName: "ABP Adjustment", amount: -30.33 },
  ]);
  assertEquals(data.result.cents.taxable_interest, 3149.26);
  assertEquals(data.result.cents.ordinary_dividends, 1604.96);
});

Deno.test("2026 Schedule B prints every continuation and buyer identity in a static draft", async () => {
  const bytes = await buildScheduleBPdfBytes2026(
    scheduleBFixture2026(),
    destinations,
    filer,
  );
  const doc = await PDFDocument.load(bytes);
  assertEquals(doc.getPageCount(), 5);
  assertEquals(doc.catalog.get(PDFName.of("AcroForm")), undefined);
  assert(doc.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
  const text = await extract(bytes);
  for (let i = 2; i <= 32; i++) {
    assertStringIncludes(text, `SYNTHETIC BANK ${i}`);
  }
  for (let i = 1; i <= 16; i++) {
    assertStringIncludes(text, `SYNTHETIC FUND ${i}`);
  }
  for (
    const value of [
      "Nominee Distribution",
      "Accrued Interest",
      "ABP Adjustment",
      "3209.92",
      "(10.11)",
      "(20.22)",
      "(30.33)",
      "3149",
      "1605",
      "Synthetic Buyer",
      "999887777",
      "100 Test Street",
      "Boston, MA 02108",
    ]
  ) assertStringIncludes(text, value);
  assertEquals(text.match(/DRAFT - NOT FOR FILING/g)?.length, 5);
  assertEquals(text.match(/123456789/g)?.length, 5);
});

Deno.test("2026 Schedule B prints below-threshold adjustment trigger without a continuation", async () => {
  const raw = { ...investmentOwner, ...syntheticInvestmentClaim2026() };
  raw.f1099ints[0].accrued_interest_purchases = [{
    purchase_date: "2026-01-02",
    settlement_reference: "settlement",
    amount: 200.25,
  }];
  const bytes = await buildScheduleBPdfBytes2026(raw, {
    form1040_line2b: 1000,
    form1040_line3b: 800,
  }, filer);
  assertEquals((await PDFDocument.load(bytes)).getPageCount(), 1);
  const text = await extract(bytes);
  for (
    const value of [
      "SYNTHETIC BANK",
      "1200.25",
      "Subtotal",
      "Accrued Interest",
      "(200.25)",
      "SYNTHETIC FUND",
      "800.25",
    ]
  ) assertStringIncludes(text, value);
});

Deno.test("2026 Schedule B rejects unneeded attachments, stale destinations and mismatched filer", async () => {
  assertThrows(
    () =>
      scheduleBPrintData2026({
        ...investmentOwner,
        ...syntheticInvestmentClaim2026(),
      }, { form1040_line2b: 1200, form1040_line3b: 800 }),
    Error,
    "does not require",
  );
  for (const key of ["form1040_line2b", "form1040_line3b"] as const) {
    assertThrows(
      () =>
        scheduleBPrintData2026(scheduleBFixture2026(), {
          ...destinations,
          [key]: destinations[key] + 1,
        }),
      Error,
      "destinations disagree",
    );
  }
  await assertRejects(
    () =>
      buildScheduleBPdfBytes2026(scheduleBFixture2026(), destinations, {
        ...filer,
        ssn: "999887777",
      }),
    Error,
    "identity",
  );
});
