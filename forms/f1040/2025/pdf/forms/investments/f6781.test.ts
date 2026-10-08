import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { form6781Pdf } from "./f6781.ts";

Deno.test("Form 6781 printable projection puts losses and gains in distinct columns", () => {
  assertEquals(form6781Pdf.pageIndices?.({}), [0]);
  assertEquals(form6781Pdf.filerFields?.map((entry) => entry.pdfField), [
    "topmostSubform[0].Page1[0].f1_01[0]",
    "topmostSubform[0].Page1[0].f1_02[0]",
  ]);
  const pages = form6781Pdf.instances!({
    accounts: [
      { account_identification: "Broker A", gain_loss: 12_000 },
      { account_identification: "Broker B", gain_loss: -2_000 },
    ],
  });
  assertEquals(pages.length, 1);
  assertEquals(pages[0].totalLoss, 2_000);
  assertEquals(pages[0].totalGain, 12_000);
  assertEquals(pages[0].net, 10_000);
  assertEquals(pages[0].shortTerm, 4_000);
  assertEquals(pages[0].longTerm, 6_000);
  assertEquals(pages[0].accounts, [
    { account_identification: "Broker A", loss: undefined, gain: 12_000 },
    { account_identification: "Broker B", loss: 2_000, gain: undefined },
  ]);
});

Deno.test("Form 6781 keeps all account amounts in line 2 and prints overflow pages", async () => {
  const accounts = Array.from({ length: 33 }, (_, index) => ({
    account_identification: `Broker ${index + 1}`,
    gain_loss: index % 2 === 0 ? 100 : -25,
  }));
  const projected = form6781Pdf.instances!({ accounts })[0];
  assertEquals((projected.accounts as unknown[]).length, 3);
  assertEquals((projected.overflow_accounts as unknown[]).length, 30);
  assertEquals(projected.totalGain, 1_700);
  assertEquals(projected.totalLoss, 400);
  assertEquals(projected.net, 1_300);
  const document = await PDFDocument.create();
  document.addPage([612, 792]);
  await form6781Pdf.appendSupplementalPages!(
    document,
    projected,
    {
      nameLine1: "Test Taxpayer",
      primarySSN: "123456789",
    } as Parameters<NonNullable<typeof form6781Pdf.appendSupplementalPages>>[2],
  );
  assertEquals(document.getPageCount(), 3);
  const missingFiler = PDFDocument.create();
  await assertRejects(
    async () =>
      form6781Pdf.appendSupplementalPages!(
        await missingFiler,
        projected,
        undefined,
      ),
    Error,
    "needs filer identity",
  );
});
