import { assertEquals, assertThrows } from "@std/assert";
import { pdfReviewFixtures } from "../../../review-fixtures.ts";
import { w2gPdf } from "./w2g.ts";

const fixture = pdfReviewFixtures.find((item) =>
  item.id === "single-withheld-w2g"
);
if (!fixture) throw new Error("Missing withheld W-2G fixture");
const source = { w2gs: fixture.inputs.w2g };

Deno.test("W-2G PDF prints one recipient copy from each withheld source", () => {
  const copies = w2gPdf.instances?.(source, fixture.filer, {
    f1040: { line25c_total: 2_400 },
  });
  assertEquals(copies?.length, 1);
  assertEquals(copies?.[0].year, "25");
  assertEquals(copies?.[0].box1_winnings, 10_000);
  assertEquals(copies?.[0].box4_federal_withheld, 2_400);
  assertEquals(copies?.[0].winner_tin, "111223333");
  assertEquals(w2gPdf.pageIndices?.(copies![0]), [2]);
});

Deno.test("W-2G PDF omits the payer copy when no tax was withheld", () => {
  const item = (fixture.inputs.w2g as Array<Record<string, unknown>>)[0];
  assertEquals(w2gPdf.instances?.({}, fixture.filer, {}), []);
  assertEquals(
    w2gPdf.instances?.(
      {
        w2gs: [{ ...item, box4_federal_withheld: 0 }],
      },
      fixture.filer,
      {},
    ),
    [],
  );
});

Deno.test("W-2G PDF requires the native source facts and reconciled withholding", () => {
  assertThrows(
    () =>
      w2gPdf.instances?.(source, fixture.filer, {
        f1040: { line25c_total: 2_399 },
      }),
    Error,
    "reconciled Form 1040 line 25c",
  );
  assertThrows(
    () =>
      w2gPdf.instances?.(
        {
          w2gs: [{
            ...(fixture.inputs.w2g as Array<Record<string, unknown>>)[0],
            payer_ein: undefined,
          }],
        },
        fixture.filer,
        { f1040: { line25c_total: 2_400 } },
      ),
    Error,
    "issued-copy reference and identified payer name and EIN",
  );
});

Deno.test("W-2G PDF creates one copy per distinct withheld payer form", () => {
  const item = (fixture.inputs.w2g as Array<Record<string, unknown>>)[0];
  const copies = w2gPdf.instances?.(
    {
      w2gs: [
        { ...item, box2_date_won: "2025-07-04" },
        {
          ...item,
          source_document_reference: "second payer copy",
          box1_winnings: 500,
          box4_federal_withheld: 120,
        },
      ],
    },
    fixture.filer,
    { f1040: { line25c_total: 2_520 } },
  );
  assertEquals(copies?.length, 2);
  assertEquals(copies?.[0].box2_date_won, "07/04/2025");
  assertEquals(copies?.[1].box4_federal_withheld, 120);
});
