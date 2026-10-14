import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import fixtures from "./form8889-paired-returns.fixture.json" with {
  type: "json",
};
import expected from "./form8889-paired-returns.expected.json" with {
  type: "json",
};
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { form5329Pdf } from "../../../../pdf/forms/taxes/retirement/f5329.ts";
import { form8889Pdf } from "../../../../pdf/forms/adjustments/health/f8889.ts";
import { inputSchema as hsaSchema } from "../../../../../nodes/intermediate/forms/adjustments/health/form8889/index.ts";

// Expected values come from the independent source/Decimal and IRS tax-table
// replay documented in the paired-HSA gap, not from the return under test.
for (const id of Object.keys(fixtures) as Array<keyof typeof fixtures>) {
  Deno.test(`Paired HSA public return reconciles both owners and final tax: ${id}`, async () => {
    const input = fixtures[id], held = structuredClone(input), e = expected[id];
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const p = buildPending(result.pending), f = p.f1040!, hsa = p.form8889!;
    assert("forms" in hsa);
    assertEquals(hsa.forms.map((o) => o.owner), ["primary", "spouse"]);
    assertEquals(hsa.forms.map((o) => o.beneficiary_ssn), [
      "111223333",
      "444556666",
    ]);
    assertEquals(
      hsa.forms.map((o) => o.print_line13_deduction ?? 0),
      e.deductions,
    );
    assertEquals(
      hsa.forms.map((o) => o.print_line16_taxable ?? 0),
      e.taxable_distributions,
    );
    assertEquals(
      hsa.forms.map((o) => o.print_line14b_excluded_distributions ?? 0),
      e.excluded_distributions,
    );
    assertEquals(
      hsa.forms.map((o) => o.print_line15_qualified ?? 0),
      e.medical_expenses,
    );
    assertEquals(
      hsa.forms.map((o) => o.print_line17b_penalty ?? 0),
      e.penalties,
    );
    assertEquals(p.schedule1?.line13_hsa_deduction, e.hsa_deduction);
    assertEquals(
      p.schedule1?.line8f_hsa_income ?? 0,
      e.taxable_distributions.reduce((a, b) => a + b, 0),
    );
    assertEquals(p.schedule1?.line8z_hsa_excess_earnings ?? 0, e.earnings);
    assertEquals(f.line8_additional_income ?? 0, e.additional_income);
    assertEquals(f.line10_adjustments, e.hsa_deduction);
    assertEquals(f.line11_agi, e.agi);
    assertEquals(f.line12a_standard_deduction, e.standard_deduction);
    assertEquals(f.line13b_additional_deductions ?? 0, e.senior_deduction);
    assertEquals(f.line15_taxable_income, e.taxable_income);
    assertEquals(f.line16_income_tax, e.regular_tax);
    assertEquals(f.line23_other_taxes, e.additional_tax);
    assertEquals(f.line24_total_tax, e.total_tax);
    assertEquals(f.line35a_refund, e.refund);
    const filer = extractFilerIdentity(f)!;
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    assertEquals((prepared.bundle.xml.match(/<IRS8889\b/g) ?? []).length, 2);
    assertEquals(
      (prepared.bundle.xml.match(/<IRS5329\b/g) ?? []).length,
      e.current_excess.filter((v) => v > 0).length,
    );
    const all = normalizeAllPending(prepared.bundle.pending);
    const printed = form8889Pdf.instances!(all.form8889!, filer, all);
    assertEquals(printed.map((o) => o.beneficiary_ssn), [
      "111223333",
      "444556666",
    ]);
    assertEquals(
      printed.map((o) => o.print_line13_deduction ?? 0),
      e.deductions,
    );
    if (e.current_excess.some((value) => value > 0)) {
      const excessPrinted = form5329Pdf.instances!(all.form5329!, filer, all);
      assertEquals(
        excessPrinted.map((o) => o.print_hsa_line47),
        e.current_excess.filter((value) => value > 0),
      );
      assertEquals(
        excessPrinted.map((o) => o.print_hsa_line49),
        e.excess_tax.filter((value) => value > 0),
      );
    }
    assertEquals(input, held);
  });
}

Deno.test("Paired HSA rejects42 native variants and40 PDF variants; two PDF tax checks remain deferred", async () => {
  let variants = 0, pdfVariants = 0;
  for (const id of Object.keys(fixtures) as Array<keyof typeof fixtures>) {
    const result = f1040_2025.executeReturn(fixtures[id]);
    assertEquals(result.diagnostics, []);
    const original = buildPending(result.pending), hsa = original.form8889!;
    assert("forms" in hsa);
    const { forms, ...source } = hsa;
    const p = {
      ...original,
      form8889: {
        ...hsaSchema.parse(source),
        forms,
      },
    };
    const filer = extractFilerIdentity(p.f1040!)!;
    const changes: Array<(x: typeof p) => void> = [
      (x) => {
        x.form8889.forms[0].print_line13_deduction =
          Number(x.form8889.forms[0].print_line13_deduction) + 1;
      },
      (x) => {
        x.form8889.beneficiary_identity!.ssn = "444556666";
      },
      (x) => {
        x.form8889.spouse_hsa!.beneficiary_identity!.ssn = "111223333";
      },
      (x) => {
        x.schedule1!.line13_hsa_deduction! += 1;
      },
      (x) => {
        x.f1040!.line23_other_taxes! += 1;
      },
      (x) => {
        x.form8889.taxpayer_hsa_contributions! += 1;
      },
    ];
    for (const [index, change] of changes.entries()) {
      const changed = structuredClone(p);
      change(changed);
      await assertRejects(
        () => buildMefBundle(changed, { filer, attachments: [] }),
        Error,
      );
      // Deferred83: these descriptor-only tax mutations currently accept.
      // Do not turn their acceptance into a passing regression expectation.
      if (
        !(index === 4 &&
          ["rollover-and-taxable", "disability-dated-distributions"].includes(
            id,
          ))
      ) {
        assertThrows(() => {
          const all = normalizeAllPending(changed);
          form8889Pdf.instances!(all.form8889!, filer, all);
        }, Error);
        pdfVariants++;
      }
      variants++;
    }
  }
  assertEquals(variants, 42);
  assertEquals(pdfVariants, 40);
});
