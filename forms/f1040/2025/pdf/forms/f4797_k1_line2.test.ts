import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { form4797 } from "../../mef/forms/f4797.ts";
import { pdfReviewFixtures } from "../review-fixtures.ts";
import { form4797Pdf } from "./f4797.ts";

const filer =
  pdfReviewFixtures.find((fixture) => fixture.id === "single-w2-refund")!.filer;

const sources = {
  k1_partnership: {
    k1_partnerships: [{
      partnership_name: "Partner One",
      partnership_ein: "123456789",
      source_document_reference: "2025 partner K-1",
      recipient_tin: "111223333",
      box10_net_1231: 10_000,
    }],
  },
  k1_s_corp: {
    k1_s_corps: [{
      corporation_name: "Corp Two",
      corporation_ein: "987654321",
      source_document_reference: "2025 S corporation K-1",
      recipient_tin: "111223333",
      box9_net_1231: -3_000,
    }],
  },
};

const rows = [
  {
    source: "s_corp",
    entity_name: "Corp Two",
    source_ein: "987654321",
    source_document_reference: "2025 S corporation K-1",
    recipient_tin: "111223333",
    gain_loss: -3_000,
  },
  {
    source: "partnership",
    entity_name: "Partner One",
    source_ein: "123456789",
    source_document_reference: "2025 partner K-1",
    recipient_tin: "111223333",
    gain_loss: 10_000,
  },
] as const;

Deno.test("Form 4797 K-1 Part I fields match the 2025 line 2 widgets", () => {
  const field = (key: string) =>
    form4797Pdf.fields.find((entry) => entry.domainKey === key)?.pdfField;
  assertEquals(
    field("pdf_k1_line2_1_description"),
    "topmostSubform[0].Page1[0].TableLine2[0].Row1[0].f1_6[0]",
  );
  assertEquals(
    field("pdf_k1_line2_1_gain"),
    "topmostSubform[0].Page1[0].TableLine2[0].Row1[0].f1_12[0]",
  );
  assertEquals(
    field("pdf_k1_line2_4_description"),
    "topmostSubform[0].Page1[0].TableLine2[0].Row4[0].f1_27[0]",
  );
  assertEquals(
    field("pdf_k1_line2_4_gain"),
    "topmostSubform[0].Page1[0].TableLine2[0].Row4[0].f1_33[0]",
  );
});

Deno.test("Form 4797 K-1 line 2 reconciles source, negative row and aggregate", () => {
  const fields = { section_1231_gain: 7_000, k1_1231_rows: rows };
  const projected = form4797Pdf.projectFields?.(fields, sources);
  assertEquals(projected?.pdf_k1_line2_1_description, "K-1 1120-S 987654321");
  assertEquals(projected?.pdf_k1_line2_1_gain, -3_000);
  assertEquals(projected?.pdf_k1_line2_2_gain, 10_000);
  assertThrows(
    () =>
      form4797Pdf.projectFields?.(
        { ...fields, section_1231_gain: 7_001 },
        sources,
      ),
    Error,
    "must reconcile to line 7",
  );
  assertThrows(
    () =>
      form4797.build({ ...fields, section_1231_gain: 7_001 }, {
        pending: { ...sources, form4797: fields },
        filer,
      }),
    Error,
    "lines 2, 4, and 5 must reconcile to line 7",
  );
});

Deno.test("Form 4797 K-1 line 2 rejects a changed issuer or recipient", async () => {
  const fields = { section_1231_gain: 7_000, k1_1231_rows: rows };
  assertThrows(
    () =>
      form4797Pdf.projectFields?.(fields, {
        ...sources,
        k1_partnership: {
          k1_partnerships: [{
            ...sources.k1_partnership.k1_partnerships[0],
            partnership_ein: "111111111",
          }],
        },
      }),
    Error,
    "must match issued K-1 sources",
  );
  const document = await PDFDocument.create();
  await assertRejects(
    async () =>
      await form4797Pdf.appendSupplementalPages!(
        document,
        fields,
        filer,
        {
          ...sources,
          k1_s_corp: {
            k1_s_corps: [{
              ...sources.k1_s_corp.k1_s_corps[0],
              recipient_tin: "999999999",
            }],
          },
        },
      ),
    Error,
    "must match issued K-1 sources",
  );
});

Deno.test("Form 4797 K-1 section 1231 loss reaches printed ordinary lines", () => {
  const source = {
    ...sources,
    k1_partnership: {
      k1_partnerships: [{
        ...sources.k1_partnership.k1_partnerships[0],
        box10_net_1231: -4_000,
      }],
    },
    k1_s_corp: { k1_s_corps: [] },
  };
  const row = { ...rows[1], gain_loss: -4_000 };
  const projected = form4797Pdf.projectFields?.(
    { section_1231_gain: -4_000, k1_1231_rows: [row] },
    source,
  );
  assertEquals(projected?.pdf_k1_line2_1_gain, -4_000);
  assertEquals(projected?.pdf_line11_loss, 4_000);
  assertEquals(projected?.pdf_line17, -4_000);
  assertEquals(projected?.ordinary_gain, -4_000);
});

Deno.test("Form 4797 K-1 line 2 enforces final filer ownership", async () => {
  const row = { ...rows[1], recipient_tin: "999999999" };
  const source = {
    k1_partnership: {
      k1_partnerships: [{
        ...sources.k1_partnership.k1_partnerships[0],
        recipient_tin: "999999999",
      }],
    },
  };
  const fields = { section_1231_gain: 10_000, k1_1231_rows: [row] };
  assertThrows(
    () => form4797.build(fields, { pending: source, filer }),
    Error,
    "recipient must match",
  );
  const document = await PDFDocument.create();
  await assertRejects(
    async () =>
      await form4797Pdf.appendSupplementalPages!(
        document,
        fields,
        filer,
        source,
      ),
    Error,
    "recipient must match",
  );
});

Deno.test("Form 4797 line 2 continuation paginates many K-1 source rows", async () => {
  const partners = Array.from({ length: 50 }, (_, index) => ({
    partnership_name: `Partner ${index + 1}`,
    partnership_ein: String(123456780 + index),
    source_document_reference: `2025 K-1 source ${index + 1}`,
    recipient_tin: "111223333",
    box10_net_1231: 100,
  }));
  const source = { k1_partnership: { k1_partnerships: partners } };
  const k1Rows = partners.map((partner) => ({
    source: "partnership" as const,
    entity_name: partner.partnership_name,
    source_ein: partner.partnership_ein,
    source_document_reference: partner.source_document_reference,
    recipient_tin: partner.recipient_tin,
    gain_loss: 100,
  }));
  const projected = form4797Pdf.projectFields?.(
    { section_1231_gain: 5_000, k1_1231_rows: k1Rows },
    source,
  );
  assertEquals(projected?.pdf_k1_line2_4_gain, 4_700);
  const document = await PDFDocument.create();
  await form4797Pdf.appendSupplementalPages!(
    document,
    projected!,
    filer,
    source,
  );
  assertEquals(document.getPageCount() > 1, true);
});
