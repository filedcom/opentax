import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import fixtures from "./form6251-pab-returns.fixture.json" with {
  type: "json",
};
import expected from "./form6251-pab-returns.expected.json" with {
  type: "json",
};
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { form6251Pdf } from "../../../../pdf/forms/taxes/amt/f6251.ts";

// Expected values are derived from the retained source/Decimal replay and
// official tax table, independently of these public-return executions.
for (const id of Object.keys(fixtures) as Array<keyof typeof fixtures>) {
  Deno.test(`PAB sources reconcile AMT and final balance due: ${id}`, async () => {
    const input = fixtures[id], held = structuredClone(input), e = expected[id];
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const p = buildPending(result.pending), a = p.form6251!, f = p.f1040!;
    assertEquals(f.line2a_tax_exempt, e.tax_exempt_interest);
    assertEquals(f.line11_agi, e.agi);
    assertEquals(f.line12a_standard_deduction, e.standard_deduction);
    assertEquals(f.line15_taxable_income, e.taxable_income);
    assertEquals(f.line16_income_tax, e.regular_tax);
    assertEquals(f.line17_additional_taxes, e.amt);
    assertEquals(f.line24_total_tax, e.total_tax);
    assertEquals(f.line37_amount_owed, e.amount_owed);
    assertEquals(a.private_activity_bond_interest, e.pab_preference);
    assertEquals(a.amti, e.amti);
    assertEquals(a.exemption, e.exemption);
    assertEquals(a.taxable_excess, e.taxable_excess);
    assertEquals(a.net_tmt, e.tentative_minimum_tax);
    assertEquals(a.line11_amt, e.amt);
    assertEquals(p.schedule2?.line2_amt, e.amt);
    const filer = extractFilerIdentity(f)!;
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    assertEquals((prepared.bundle.xml.match(/<IRS6251\b/g) ?? []).length, 1);
    for (
      const [tag, value] of Object.entries({
        ExemptPrivateActivityBondsAmt: e.pab_preference,
        AlternativeMinTaxableIncomeAmt: e.amti,
        AlternativeMinimumTaxExemptAmt: e.exemption,
        AdjAlternativeMinTaxableIncAmt: e.taxable_excess,
        TentativeAlternativeMinTaxAmt: e.tentative_minimum_tax,
        AlternativeMinimumTaxAmt: e.amt,
        TotalTaxAmt: e.total_tax,
      })
    ) assertStringIncludes(prepared.bundle.xml, `<${tag}>${value}</${tag}>`);
    const all = normalizeAllPending(prepared.bundle.pending),
      printed = form6251Pdf.projectFields!(all.form6251!, all);
    assertEquals(printed.private_activity_bond_interest, e.pab_preference);
    assertEquals(printed.line11_amt, e.amt);
    assertEquals(input, held);
  });
}

Deno.test("PAB exports reject changed source ownership, preferences and return totals", async () => {
  let count = 0, pdfCount = 0;
  for (const id of Object.keys(fixtures) as Array<keyof typeof fixtures>) {
    const result = f1040_2025.executeReturn(fixtures[id]);
    assertEquals(result.diagnostics, []);
    const p = buildPending(result.pending),
      filer = extractFilerIdentity(p.f1040!)!;
    const changes: Array<(x: typeof p) => void> = [
      (x) => {
        x.form6251!.private_activity_bond_interest! += 1;
      },
      (x) => {
        x.form6251!.line11_amt! += 1;
      },
      (x) => {
        x.schedule2!.line2_amt! += 1;
      },
      (x) => {
        x.f1040!.line2a_tax_exempt! += 1;
      },
      (x) => {
        x.f1040!.line17_additional_taxes! += 1;
      },
      (x) => {
        x.f1040!.line11_agi! += 1;
      },
      (x) => {
        x.f1040!.line24_total_tax! += 1;
      },
      (x) => {
        if (x.f1099int && "f1099ints" in x.f1099int) {
          x.f1099int.f1099ints[0].recipient_tin = "444556666";
        } else if (x.f1099oid && "f1099oids" in x.f1099oid) {
          x.f1099oid.f1099oids[0].recipient_tin = "444556666";
        } else {
          assert(x.f1099div && "f1099divs" in x.f1099div);
          x.f1099div.f1099divs[0].recipient_tin = "444556666";
        }
      },
    ];
    for (const [index, change] of changes.entries()) {
      const altered = structuredClone(p);
      change(altered);
      await assertRejects(
        () => buildMefBundle(altered, { filer, attachments: [] }),
        Error,
      );
      // Deferred85: descriptor-only line17, line24 and source-owner changes
      // currently accept; the complete PDF builder rejects all24 of these.
      if (![4, 6, 7].includes(index)) {
        assertThrows(() => {
          const all = normalizeAllPending(altered);
          form6251Pdf.projectFields!(all.form6251!, all);
        }, Error);
        pdfCount++;
      }
      count++;
    }
  }
  assertEquals(count, 64);
  assertEquals(pdfCount, 40);
});
