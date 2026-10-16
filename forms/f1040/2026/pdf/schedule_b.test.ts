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
import { foreignAccountReviewFixture2026 } from "../inputs/foreign-accounts.fixture.ts";

const filer = { name: "Synthetic Investor", ssn: "123456789" };
const destinations = { form1040_line2b: 3149, form1040_line3b: 1605 };

Deno.test("2026 Schedule B paints the reviewed foreign-account and independent FBAR answers", async () => {
  for (const required of [true, false]) {
    const raw = {
      ...investmentOwner,
      ...syntheticInvestmentClaim2026(),
      f1099ints: [],
      f1099divs: [],
      foreign_accounts_question: true,
      foreign_account_review: foreignAccountReviewFixture2026(required),
    };
    const bytes = await buildScheduleBPdfBytes2026(raw, {
      form1040_line2b: 0,
      form1040_line3b: 0,
    }, filer);
    const text = await extract(bytes);
    assertEquals(text.includes("Switzerland"), required);
    const dir = await Deno.makeTempDir();
    try {
      await Deno.writeFile(`${dir}/review.pdf`, bytes);
      for (
        const [y, selectedYes] of [[133, true], [97, required], [
          37,
          false,
        ]] as const
      ) {
        for (const [x, yes] of [[539.4, true], [561, false]] as const) {
          // Crop the interior only, excluding the printed checkbox border.
          const rendered = await new Deno.Command("pdftoppm", {
            args: [
              "-f",
              "1",
              "-singlefile",
              "-r",
              "144",
              "-gray",
              "-x",
              String(Math.round((x + 3) * 2)),
              "-y",
              String((792 - y - 7) * 2),
              "-W",
              "8",
              "-H",
              "8",
              `${dir}/review.pdf`,
            ],
          }).output();
          assertEquals(rendered.code, 0);
          const pixels = rendered.stdout.subarray("P5\n8 8\n255\n".length);
          assertEquals(
            pixels.filter((p) => p < 128).length > 5,
            yes === selectedYes,
          );
        }
      }
    } finally {
      await Deno.remove(dir, { recursive: true });
    }
  }
});

Deno.test("2026 Schedule B country overflow preserves every reviewed country in a complete statement", async () => {
  const review = foreignAccountReviewFixture2026();
  const countries = [
    "Antigua and Barbuda",
    "Bosnia and Herzegovina",
    "Central African Republic",
    "Dominican Republic",
    "Equatorial Guinea",
    "United Arab Emirates",
    "United Kingdom",
    "Switzerland",
  ];
  review.accounts = countries.map((country_name, i) => ({
    ...review.accounts[0],
    record_reference: `account-${i}`,
    account_number: `account-${i}`,
    country_name,
  }));
  const bytes = await buildScheduleBPdfBytes2026(
    {
      ...investmentOwner,
      ...syntheticInvestmentClaim2026(),
      foreign_accounts_question: true,
      foreign_account_review: review,
    },
    { form1040_line2b: 1200, form1040_line3b: 800 },
    filer,
  );
  const doc = await PDFDocument.load(bytes);
  assertEquals(doc.getPageCount(), 2);
  assertEquals(doc.catalog.get(PDFName.of("AcroForm")), undefined);
  assert(doc.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
  const text = await extract(bytes);
  assertStringIncludes(text, "See attached complete country statement");
  assertStringIncludes(text, "Line 7b Foreign Countries");
  for (const country of countries) assertStringIncludes(text, country);
});

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
