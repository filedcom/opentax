import { assertEquals, assertThrows } from "@std/assert";
import { form8882PreparedFixture } from "../../../../mef/forms/credits/business/f8882.fixture.ts";
import { prepareForm3800DocumentParts } from "../../../../mef/forms/credits/business/f3800/f3800.ts";
import { form8882Pdf } from "./f8882.ts";

Deno.test("staged Form 8882 PDF projects inspected AcroForm fields", () => {
  const { source, pending } = form8882PreparedFixture();
  const fields = form8882Pdf.projectFields!(source, pending);
  assertEquals(form8882Pdf.pageIndices!(fields), [0]);
  assertEquals(fields.line1, 40_000);
  assertEquals(fields.line2, 10_000);
  assertEquals(fields.line3, 10_000);
  assertEquals(fields.line4, 1_000);
  assertEquals(fields.line5, 0);
  assertEquals(fields.line6, 11_000);
  assertEquals(fields.line7, 11_000);
  assertEquals(
    form8882Pdf.fields[0].pdfField,
    "topmostSubform[0].Page1[0].p1-t3[0]",
  );
  assertEquals(
    form8882Pdf.fields[6].pdfField,
    "topmostSubform[0].Page1[0].p1-t15[0]",
  );
});

Deno.test("staged Form 8882 PDF refuses changed filed source", () => {
  const { source, pending } = form8882PreparedFixture();
  assertThrows(() =>
    form8882Pdf.projectFields!(source, {
      ...pending,
      f8882: {
        ...source,
        referral_contract: {
          ...source.referral_contract,
          gross_expenditure_usd: 20_000,
        },
      },
    })
  );
});

Deno.test("Form 8882 printable copy binds Form 3800 line 1k document and final Form 1040 credit", () => {
  const { source, pending: base } = form8882PreparedFixture();
  const pending = {
    ...base,
    f1040: {
      ...base.f1040,
      line16_income_tax: 40_000,
      line20_nonrefundable_credits: 11_000,
    },
    form6251: { line11_amt: 0, net_tmt: 20_000 },
    schedule3: {
      line6a_total: 11_000,
      line7_total: 11_000,
      line8_total: 11_000,
    },
  };
  const prepared = prepareForm3800DocumentParts(pending.f3800, {
    pending,
    documentIdsByPendingKey: {
      f8882: ["IRS8882_1"],
      f3800: ["IRS3800_1"],
      form6251: ["IRS6251_1"],
      f8835: [],
    },
  });
  if (!prepared) throw new Error("Expected sourced Form 3800");
  const fields = form8882Pdf.projectFields!(source, pending);
  assertEquals(form8882Pdf.instances!(fields, undefined, pending, prepared), [
    fields,
  ]);
  assertThrows(() => form8882Pdf.instances!(fields, undefined, pending));
  assertThrows(() =>
    form8882Pdf.instances!(fields, undefined, pending, {
      ...prepared,
      currentRows: prepared.currentRows.map((row) => ({
        ...row,
        metadata: { ...row.metadata, referenceDocumentId: "IRS8882_OTHER" },
      })),
    })
  );
  assertThrows(() =>
    form8882Pdf.instances!(fields, undefined, pending, {
      ...prepared,
      currentAmounts: prepared.currentAmounts.map((row) => ({
        ...row,
        nonpassiveCredit: 10_999,
      })),
    })
  );
  assertThrows(() =>
    form8882Pdf.instances!(fields, undefined, {
      ...pending,
      f1040: {
        ...pending.f1040,
        line20_nonrefundable_credits: 10_999,
      },
    }, prepared)
  );
});
