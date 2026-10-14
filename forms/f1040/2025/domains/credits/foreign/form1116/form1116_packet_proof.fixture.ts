import { assert, assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { form1116ScheduleBPdf } from "../../../../pdf/forms/credits/foreign/f1116/f1116_schedule_b.ts";
import { inputSchema as interestSchema } from "../../../../../nodes/inputs/income/investments/f1099int/index.ts";
import { inputSchema as dividendSchema } from "../../../../../nodes/inputs/income/investments/f1099div/index.ts";

/** Expected taxes come from the 2025 IRS Tax Table, not the return engine:
 * https://www.irs.gov/publications/p1040 — single 34,250–34,300 = 3,875;
 * single 44,250–44,300 = 5,075. All income in these cases is foreign passive
 * income, so the credit limit equals regular tax and excess stays on Sch B. */
export async function verifyPassive1116Packet(
  raw: Parameters<typeof normalizeAllPending>[0],
  id: string,
  expected: {
    interest: number;
    dividends: number;
    tax: number;
    carry: number;
    countries: readonly string[];
  },
) {
  const pending = normalizeAllPending(raw);
  const income = expected.interest + expected.dividends;
  assertEquals(pending.f1040.line2b_taxable_interest ?? 0, expected.interest);
  assertEquals(
    pending.f1040.line3b_ordinary_dividends ?? 0,
    expected.dividends,
  );
  assertEquals(pending.f1040.line11_agi, income);
  assertEquals(pending.f1040.line12a_standard_deduction, 15750);
  assertEquals(pending.f1040.line15_taxable_income, income - 15750);
  assertEquals(pending.f1040.line16_income_tax, expected.tax);
  assertEquals(pending.schedule3.line1_foreign_tax_credit, expected.tax);
  assertEquals(pending.f1040.line20_nonrefundable_credits, expected.tax);
  assertEquals(pending.f1040.line24_total_tax, 0);
  const carry = form1116ScheduleBPdf.projectFields!(
    pending.form1116_schedule_b,
    pending,
  );
  assertEquals(carry.line6_current, expected.carry);
  assertEquals(carry.line8_current, expected.carry);
  assertEquals(carry.line8_total, expected.carry);

  const filer = extractFilerIdentity(pending.f1040);
  const prepared = await f1040_2025.prepareReturn(raw, filer);
  const xml = prepared.bundle.xml;
  assertEquals((xml.match(/<IRS1116 /g) ?? []).length, 1);
  assertEquals((xml.match(/<IRS1116ScheduleB /g) ?? []).length, 1);
  for (const country of expected.countries) {
    assert(xml.includes(`<ForeignCountryCd>${country}</ForeignCountryCd>`));
  }
  const origins: PdfPageOrigin[] = [];
  const bytes = await buildPdfBytes(
    prepared.bundle.pending,
    filer,
    ".pdf-cache",
    prepared.bundle,
    origins,
  );
  assertEquals((await PDFDocument.load(bytes)).getPageCount(), 8);
  assertEquals(origins.filter((p) => p.formKey === "form_1116").length, 2);
  assertEquals(
    origins.filter((p) => p.formKey === "form1116_schedule_b").length,
    2,
  );

  const root = Deno.env.get("OPENTAX_FORM1116_PROOF_DIR");
  if (root) {
    await Deno.mkdir(root, { recursive: true });
    await Deno.writeFile(`${root}/${id}.pdf`, bytes);
    await Deno.writeTextFile(`${root}/${id}.xml`, xml);
    await Deno.writeTextFile(
      `${root}/${id}.json`,
      JSON.stringify({ expected, pending, filer, origins }, null, 2),
    );
  }

  // Fresh PDF calls intentionally omit the prepared bundle so that a stale
  // graph hash cannot substitute for return/source reconciliation.
  for (
    const changed of [
      {
        ...pending,
        f1040: {
          ...pending.f1040,
          ...(expected.interest > 0
            ? { line2b_taxable_interest: expected.interest + 1 }
            : { line3b_ordinary_dividends: expected.dividends + 1 }),
        },
      },
      {
        ...pending,
        f1040: {
          ...pending.f1040,
          line20_nonrefundable_credits: expected.tax + 1,
        },
      },
      {
        ...pending,
        schedule3: {
          ...pending.schedule3,
          line1_foreign_tax_credit: expected.tax + 1,
        },
      },
      { ...pending, form1116_schedule_b: undefined },
    ]
  ) {
    await assertRejects(() => f1040_2025.prepareReturn(changed, filer), Error);
    await assertRejects(() => buildPdfBytes(changed, filer), Error);
  }

  if (expected.interest > 0) {
    const items = interestSchema.parse(pending.f1099int).f1099ints;
    const first = items[0];
    assert(
      first.box1 !== undefined,
      "Packet fixture must include ordinary interest",
    );
    for (
      const changed of [
        { ...first, box1: first.box1 + 1 },
        { ...first, foreign_tax_irs_country_code: "FR" },
        { ...first, foreign_tax_source_document_reference: "Unmatched copy" },
        { ...first, recipient_tin: "999887777" },
      ]
    ) {
      const altered = {
        ...pending,
        f1099int: { f1099ints: [changed, ...items.slice(1)] },
      };
      await assertRejects(
        () => f1040_2025.prepareReturn(altered, filer),
        Error,
      );
      await assertRejects(() => buildPdfBytes(altered, filer), Error);
    }
  }
  if (expected.dividends > 0) {
    const items = dividendSchema.parse(pending.f1099div).f1099divs;
    const first = items[0];
    for (
      const changed of [
        { ...first, box7: (first.box7 ?? 0) + 1 },
        {
          ...first,
          foreign_tax_irs_country_code:
            first.foreign_tax_irs_country_code === "CA" ? "FR" : "CA",
        },
        { ...first, source_document_reference: "Unmatched copy" },
        { ...first, recipient_tin: "999887777" },
      ]
    ) {
      const altered = {
        ...pending,
        f1099div: { f1099divs: [changed, ...items.slice(1)] },
      };
      await assertRejects(
        () => f1040_2025.prepareReturn(altered, filer),
        Error,
      );
      await assertRejects(() => buildPdfBytes(altered, filer), Error);
    }
  }
}
