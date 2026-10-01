import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../index.ts";
import { normalizeAllPending } from "../../pending.ts";
import { inputSchema as f8874InputSchema } from "../../../nodes/inputs/f8874/index.ts";
import { pdfReviewFixtures } from "../review-fixtures.ts";
import { form8874Pdf } from "./f8874.ts";

async function preparedReturn() {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-new-markets-business-credit"
  )!;
  const result = f1040_2025.executeReturn({ ...fixture.inputs });
  assertEquals(result.diagnostics, []);
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    fixture.filer,
  );
  return {
    pending: normalizeAllPending(prepared.bundle.pending),
    parts: prepared.bundle.form3800Parts!,
    xml: prepared.bundle.xml,
    filer: fixture.filer,
  };
}

Deno.test("Form 8874 child PDF binds its direct investment to prepared line 1i and final tax", async () => {
  const { pending, parts, xml, filer } = await preparedReturn();
  assertEquals(parts.lines.line38, 500);
  assertEquals(pending.schedule3.line6a_total, 500);
  assertEquals(pending.f1040.line20_nonrefundable_credits, 500);
  assertStringIncludes(xml, "<IRS8874 ");
  assertStringIncludes(xml, "<IRS3800 ");
  const fields = form8874Pdf.projectFields!(pending.f8874, pending);
  assertEquals(fields.row_1_credit, 500);
  assertEquals(fields.line3, 500);
  assertEquals(form8874Pdf.instances!(fields, filer, pending, parts), [fields]);
});

Deno.test("Form 8874 child PDF rejects changed print, source, prepared line 1i, and final credit", async () => {
  const { pending, parts, filer } = await preparedReturn();
  const fields = form8874Pdf.projectFields!(pending.f8874, pending);
  const source = f8874InputSchema.parse(pending.f8874);
  assertThrows(() => form8874Pdf.instances!(fields, filer, pending));
  assertThrows(() =>
    form8874Pdf.instances!(
      { ...fields, row_1_credit: 499 },
      filer,
      pending,
      parts,
    )
  );
  assertThrows(() =>
    form8874Pdf.instances!(fields, filer, {
      ...pending,
      f8874: {
        ...source,
        investments: [{
          ...source.investments[0],
          qualified_equity_investment_amount: 9_000,
        }],
      },
    }, parts)
  );
  assertThrows(() =>
    form8874Pdf.instances!(fields, filer, {
      ...pending,
      f3800: {
        ...pending.f3800,
        f8874_credit: {
          credit_amount: 499,
          subject_to_passive_activity_limit: false,
        },
      },
    }, parts)
  );
  assertThrows(() =>
    form8874Pdf.instances!(fields, filer, pending, {
      ...parts,
      currentRows: parts.currentRows.map((row) =>
        row.line === "1i"
          ? {
            ...row,
            metadata: { ...row.metadata, referenceDocumentId: "IRS8874_OTHER" },
          }
          : row
      ),
    })
  );
  assertThrows(() =>
    form8874Pdf.instances!(fields, filer, pending, {
      ...parts,
      currentAmounts: parts.currentAmounts.map((row) =>
        row.line === "1i" ? { ...row, nonpassiveCredit: 499 } : row
      ),
    })
  );
  assertThrows(() =>
    form8874Pdf.instances!(fields, filer, pending, {
      ...parts,
      currentDetails: parts.currentDetails.map((row) =>
        row.line === "1i" ? { ...row, credit: 499 } : row
      ),
    })
  );
  assertThrows(() =>
    form8874Pdf.instances!(fields, filer, pending, {
      ...parts,
      lines: { ...parts.lines, line38: 499 },
    })
  );
  assertThrows(() =>
    form8874Pdf.instances!(fields, filer, {
      ...pending,
      schedule3: { ...pending.schedule3, line6a_total: 499 },
    }, parts)
  );
  assertThrows(() =>
    form8874Pdf.instances!(fields, filer, {
      ...pending,
      f1040: { ...pending.f1040, line20_nonrefundable_credits: 499 },
    }, parts)
  );
});
