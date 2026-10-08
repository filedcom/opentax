import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../domains/execution/pending.ts";
import { pdfReviewFixtures } from "../../../review-fixtures.ts";
import { form8820Pdf } from "../f8820.ts";

const orphan = {
  f8820s: [{
    generic_name: "Test Orphan Drug",
    designation_application_number: "FDA-2025-123",
    designation_date: "2024-03-15",
    qualified_clinical_testing_expenses: 10_000,
    qualifying_testing_confirmed: true,
    expenses_exclude_third_party_funding: true,
    expenses_not_used_for_research_credit: true,
  }],
  reduced_section280c_credit_election: true,
  form8932_overlapping_wage_credit: 0,
  subject_to_passive_activity_limit: false,
};

async function preparedReturn() {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-geothermal-and-new-markets-credits"
  )!;
  const { f8835: _facility, f8874: _investment, ...otherInputs } =
    fixture.inputs;
  const result = f1040_2025.executeReturn({
    ...otherInputs,
    f8820: orphan,
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
    filer: fixture.filer,
  };
}

Deno.test("Form 8820 child PDF binds its direct credit to prepared Form 3800 and Form 1040", async () => {
  const { pending, parts, xml, filer } = await preparedReturn();
  assertEquals(parts.lines.line38, 1_975);
  assertEquals(pending.schedule3.line6a_total, 1_975);
  assertEquals(pending.f1040.line20_nonrefundable_credits, 1_975);
  assertStringIncludes(xml, "<IRS8820 ");
  assertStringIncludes(xml, "<IRS3800 ");
  const fields = form8820Pdf.projectFields!(pending.f8820, pending);
  assertEquals(fields.line4, 1_975);
  assertEquals(form8820Pdf.instances!(fields, filer, pending, parts), [fields]);
});

Deno.test("Form 8820 child PDF rejects changed source, prepared line 1h, and final credit", async () => {
  const { pending, parts, filer } = await preparedReturn();
  const fields = form8820Pdf.projectFields!(pending.f8820, pending);
  assertThrows(() => form8820Pdf.instances!(fields, filer, pending));
  assertThrows(() =>
    form8820Pdf.instances!(fields, filer, {
      ...pending,
      f8820: {
        ...orphan,
        f8820s: [{
          ...orphan.f8820s[0],
          qualified_clinical_testing_expenses: 9_000,
        }],
      },
    }, parts)
  );
  assertThrows(() =>
    form8820Pdf.instances!(fields, filer, {
      ...pending,
      f3800: {
        ...pending.f3800,
        f8820_credit: {
          credit_amount: 1_974,
          subject_to_passive_activity_limit: false,
        },
      },
    }, parts)
  );
  assertThrows(() =>
    form8820Pdf.instances!(fields, filer, pending, {
      ...parts,
      currentRows: parts.currentRows.map((row) =>
        row.line === "1h"
          ? {
            ...row,
            metadata: { ...row.metadata, referenceDocumentId: "IRS8820_OTHER" },
          }
          : row
      ),
    })
  );
  assertThrows(() =>
    form8820Pdf.instances!(fields, filer, pending, {
      ...parts,
      currentAmounts: parts.currentAmounts.map((row) =>
        row.line === "1h" ? { ...row, nonpassiveCredit: 1_974 } : row
      ),
    })
  );
  assertThrows(() =>
    form8820Pdf.instances!(fields, filer, pending, {
      ...parts,
      currentDetails: parts.currentDetails.map((row) =>
        row.line === "1h" ? { ...row, credit: 1_974 } : row
      ),
    })
  );
  assertThrows(() =>
    form8820Pdf.instances!(fields, filer, pending, {
      ...parts,
      lines: { ...parts.lines, line38: 1_974 },
    })
  );
  assertThrows(() =>
    form8820Pdf.instances!(fields, filer, {
      ...pending,
      schedule3: { ...pending.schedule3, line6a_total: 1_974 },
    }, parts)
  );
  assertThrows(() =>
    form8820Pdf.instances!(fields, filer, {
      ...pending,
      f1040: { ...pending.f1040, line20_nonrefundable_credits: 1_974 },
    }, parts)
  );
});
