import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../index.ts";
import { normalizeAllPending } from "../../pending.ts";
import { inputSchema as f3800InputSchema } from "../../../nodes/inputs/f3800/index.ts";
import { pdfReviewFixtures } from "../review-fixtures.ts";
import { form3800Pdf } from "./f3800.ts";
import { form8874Pdf } from "./f8874.ts";

const fixture = pdfReviewFixtures.find((item) =>
  item.id === "single-new-markets-business-credit"
)!;
const partnership = {
  partnership_name: "Community Partnership",
  partnership_ein: "987654321",
  source_document_reference: "2025 partnership K-1 code AD",
  box15_code_ad_new_markets_credit: 1_250,
  new_markets_credit_subject_to_passive_activity_limit: false,
};

async function preparedMixedReturn() {
  const result = f1040_2025.executeReturn({
    ...fixture.inputs,
    k1_partnership: { k1_partnerships: [partnership] },
  });
  assertEquals(result.diagnostics, []);
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    fixture.filer,
  );
  return {
    pending: normalizeAllPending(prepared.bundle.pending),
    parts: prepared.bundle.form3800Parts!,
    xml: prepared.bundle.xml,
  };
}

Deno.test("Form 8874 direct QEI and partnership code AD reach one Form 3800 line 1i and final tax", async () => {
  const { pending, parts, xml } = await preparedMixedReturn();
  const fields = form8874Pdf.projectFields!(pending.f8874, pending);
  assertEquals(fields.row_1_credit, 500);
  assertEquals(fields.line2, 1_250);
  assertEquals(fields.line3, 1_750);
  assertEquals(parts.form8874DocumentIds?.length, 1);
  assertEquals(
    parts.currentDetails.filter((row) => row.line === "1i").length,
    2,
  );
  assertEquals(parts.lines.line38, 1_750);
  assertEquals(pending.schedule3.line6a_total, 1_750);
  assertEquals(pending.f1040.line20_nonrefundable_credits, 1_750);
  assertStringIncludes(xml, "<IRS8874 ");
  assertStringIncludes(xml, "<Form8874CYCreditsGrp");
  assertEquals(
    form8874Pdf.instances!(fields, fixture.filer, pending, parts),
    [fields],
  );
  assertEquals(
    form3800Pdf.instances!(pending.f3800, fixture.filer, pending, parts).length,
    1,
  );
});

Deno.test("mixed Form 8874 PDF rejects altered line 2, Part V EIN, native ID, and final tax", async () => {
  const { pending, parts } = await preparedMixedReturn();
  const claim = f3800InputSchema.parse(pending.f3800);
  const fields = form8874Pdf.projectFields!(pending.f8874, pending);
  const print = (
    printed = fields,
    all = pending,
    prepared = parts,
  ) => form8874Pdf.instances!(printed, fixture.filer, all, prepared);
  assertThrows(
    () => print({ ...fields, line2: 1_249 }),
    Error,
    "mixed direct and partnership credit",
  );
  assertThrows(
    () =>
      print(fields, pending, {
        ...parts,
        currentDetails: parts.currentDetails.map((row) =>
          row.line === "1i" && row.passThroughEin
            ? { ...row, passThroughEin: "111111111" }
            : row
        ),
      }),
    Error,
    "mixed direct and partnership credit",
  );
  assertThrows(
    () =>
      form3800Pdf.instances!(
        {
          ...pending.f3800,
          f8874_k1_credit_entries: [{
            ...claim.f8874_k1_credit_entries![0],
            credit_amount: 1_249,
          }],
        },
        fixture.filer,
        pending,
        parts,
      ),
    Error,
    "mixed direct and partnership Form 8874 line 1i",
  );
  assertThrows(
    () =>
      form3800Pdf.instances!(pending.f3800, fixture.filer, pending, {
        ...parts,
        currentDetails: parts.currentDetails.map((row) =>
          row.line === "1i" && row.passThroughEin
            ? { ...row, passThroughEin: "111111111" }
            : row
        ),
      }),
    Error,
    "mixed direct and partnership Form 8874 line 1i",
  );
  assertThrows(
    () =>
      print(fields, pending, {
        ...parts,
        currentRows: parts.currentRows.map((row) =>
          row.line === "1i"
            ? {
              ...row,
              metadata: {
                ...row.metadata,
                referenceDocumentId: "IRS8874_OTHER",
              },
            }
            : row
        ),
        currentDetails: parts.currentDetails.map((row) =>
          row.line === "1i" && row.sourceDocumentId
            ? { ...row, sourceDocumentId: "IRS8874_OTHER" }
            : row
        ),
      }),
    Error,
    "mixed direct and partnership credit",
  );
  assertThrows(
    () =>
      print(fields, {
        ...pending,
        f1040: {
          ...pending.f1040,
          line20_nonrefundable_credits: 1_749,
        },
      }),
    Error,
    "Form 1040 line 20",
  );
});
