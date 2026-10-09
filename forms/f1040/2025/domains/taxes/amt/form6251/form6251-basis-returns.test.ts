import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import fixtures from "./form6251-basis-returns.fixture.json" with {
  type: "json",
};
import expected from "./form6251-basis-returns.expected.json" with {
  type: "json",
};
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { form6251Pdf } from "../../../../pdf/forms/taxes/amt/f6251.ts";

// Source-derived expectations use separate capital-loss caps, the official
// regular/AMT rate worksheets and the NIIT threshold; no engine-derived oracle.
for (const id of Object.keys(fixtures) as Array<keyof typeof fixtures>) {
  Deno.test(`ISO and basis sources reconcile through final tax: ${id}`, async () => {
    const input = fixtures[id], held = structuredClone(input), e = expected[id];
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const p = buildPending(result.pending), f = p.f1040!, a = p.form6251!;
    assertEquals(f.line7_capital_gain, e.capital_gain);
    assertEquals(f.line11_agi, e.agi);
    assertEquals(f.line15_taxable_income, e.taxable_income);
    assertEquals(f.line16_income_tax, e.regular_tax);
    assertEquals(f.line17_additional_taxes, e.amt);
    assertEquals(f.line23_other_taxes ?? 0, e.niit);
    assertEquals(f.line24_total_tax, e.total_tax);
    assertEquals(f.line37_amount_owed, e.amount_owed);
    assertEquals(a.line2k_disposition, e.disposition);
    assertEquals(a.iso_adjustment, e.iso_adjustment);
    assertEquals(a.amti, e.amti);
    assertEquals(a.exemption, e.exemption);
    assertEquals(a.taxable_excess, e.taxable_excess);
    assertEquals(a.net_tmt, e.tentative_minimum_tax);
    assertEquals(a.line11_amt, e.amt);
    assertEquals(p.schedule2?.line2_amt, e.amt);
    const filer = extractFilerIdentity(f)!;
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    for (
      const [tag, value] of Object.entries({
        PropertyDispositionAmt: e.disposition,
        IncentiveStockOptionsAmt: e.iso_adjustment,
        AlternativeMinimumTaxAmt: e.amt,
        TentativeAlternativeMinTaxAmt: e.tentative_minimum_tax,
        TotalTaxAmt: e.total_tax,
      })
    ) assertStringIncludes(prepared.bundle.xml, `<${tag}>${value}</${tag}>`);
    const all = normalizeAllPending(prepared.bundle.pending),
      printed = form6251Pdf.projectFields!(all.form6251!, all);
    assertEquals(printed.line2k_disposition, e.disposition);
    assertEquals(printed.line11_amt, e.amt);
    if (e.amt_preferential_gain > 0) {
      assertEquals(a.line13, e.amt_preferential_gain);
    }
    assertEquals(input, held);
  });
}
Deno.test("ISO/basis exports reject changed adjustments and final-return joins", async () => {
  let count = 0, pdfCount = 0;
  for (const id of Object.keys(fixtures) as Array<keyof typeof fixtures>) {
    const result = f1040_2025.executeReturn(fixtures[id]);
    assertEquals(result.diagnostics, []);
    const p = buildPending(result.pending),
      filer = extractFilerIdentity(p.f1040!)!;
    const changes: Array<(x: typeof p) => void> = [
      (x) => {
        x.form6251!.line2k_disposition! += 1;
      },
      (x) => {
        x.form6251!.iso_adjustment! += 1;
      },
      (x) => {
        x.f1040!.line7_capital_gain! += 1;
      },
      (x) => {
        x.schedule2!.line2_amt! += 1;
      },
      (x) => {
        x.f1040!.line17_additional_taxes! += 1;
      },
    ];
    for (const [index, change] of changes.entries()) {
      const altered = structuredClone(p);
      change(altered);
      await assertRejects(
        () => buildMefBundle(altered, { filer, attachments: [] }),
        Error,
      );
      // Deferred85: direct projection accepts ISO/line17 changes in all five
      // cases and capital/Sch2 changes in the prior-ISO-gain case.
      if (
        ![1, 4].includes(index) &&
        !(id === "prior-iso-gain" && [2, 3].includes(index))
      ) {
        assertThrows(() => {
          const all = normalizeAllPending(altered);
          form6251Pdf.projectFields!(all.form6251!, all);
        }, Error);
        pdfCount++;
      }
      count++;
    }
  }
  assertEquals(count, 25);
  assertEquals(pdfCount, 13);
});
