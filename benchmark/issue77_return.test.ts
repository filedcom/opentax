import { assertEquals } from "@std/assert";
import { catalog } from "../catalog.ts";
import { buildEngineInputs } from "../cli/store/store.ts";
import { singletonPublicInputKeys } from "../cli/store/public-input-keys.ts";
import type { InputsJson } from "../cli/store/types.ts";
import { normalizeAllPending } from "../forms/f1040/2025/return-processing/pending.ts";

const definition = catalog["f1040:2025"];
async function replay(name: string, omitWorksheet = false) {
  const fixture = JSON.parse(
    await Deno.readTextFile(
      new URL(
        `./cases/f1040/2025/${name}/input.json`,
        import.meta.url,
      ),
    ),
  );
  assertEquals(fixture.source, "synthetic");
  const inputs: InputsJson = {};
  for (const [index, form] of fixture.forms.entries()) {
    if (omitWorksheet && form.node_type === "f8812_credit_limit_worksheet") {
      continue;
    }
    (inputs[form.node_type] ??= []).push({
      id: String(index),
      fields: form.data,
    });
  }
  const result = definition.executeReturn(
    buildEngineInputs(inputs, singletonPublicInputKeys(definition)),
  );
  return {
    diagnostics: result.diagnostics,
    pending: normalizeAllPending(result.pending),
  };
}

Deno.test("issue77 complete synthetic case78 uses EIC table through the return graph", async () => {
  const result = await replay("78-single-w2-1099int-1099div-1099b");
  assertEquals(result.diagnostics, []);
  const lines = result.pending.f1040;
  assertEquals(lines.line27_eitc, 316);
  assertEquals(lines.line24_total_tax, 0);
  assertEquals(lines.line33_total_payments, 382);
  assertEquals(lines.line35a_refund, 382);
});

Deno.test("issue77 case86 worksheet intake preserves automatic child credit and owner credit", async () => {
  const result = await replay("86-mfj-w2");
  assertEquals(result.diagnostics, []);
  const lines = result.pending.f1040;
  assertEquals(lines.line19_child_tax_credit, 4400);
  assertEquals(lines.line31_additional_payments, 5711);
  assertEquals(lines.line24_total_tax, 39113);
  assertEquals(lines.line35a_refund, 7069);
  // A source worksheet is still required: no invented zero answers in runtime.
  const missing = await replay("86-mfj-w2", true);
  assertEquals(
    missing.diagnostics.some((d) =>
      d.nodeType === "f8812" && d.message.includes("Credit Limit Worksheet")
    ),
    true,
  );
});

const seniors: [string, number, number][] = [
  ["09-single-senior-over65", 6000, 4250],
  ["16-mfj-retirement-ssa", 12000, 0],
  ["30-mfj-senior-both-pension-ssa", 12000, 0],
  ["34-single-1099r-retirement", 6000, 4250],
  ["43-single-multiple-1099r", 6000, 7250],
  ["113-single-1099r-rmd-ssa-senior", 6000, 1250],
  ["124-mfj-1099r-rrb1099-interest", 12000, 75],
  ["127-single-senior-1099r-ssa-age65", 6000, 0],
  ["128-mfj-senior-both65-1099r-interest", 12000, 0],
];
for (const [name, deduction, taxable] of seniors) {
  Deno.test(`issue77 senior deduction reaches Form 1040: ${name}`, async () => {
    const { pending, diagnostics } = await replay(name);
    assertEquals(diagnostics, []);
    assertEquals(pending.f1040.line13b_additional_deductions, deduction);
    assertEquals(pending.f1040.line15_taxable_income, taxable);
  });
}
const marketplace: [string, number, number][] = [
  ["36-single-w2-marketplace-1095a", 3952, 0],
  ["45-single-w2-educator-marketplace", 3860, 0],
  ["48-mfj-w2-marketplace-1095a", 4700, 0],
  ["52-single-w2-marketplace-ptc-no-aptc", 3600, 0],
  ["53-single-marketplace-ptc-with-aptc-repayment", 0, 3725],
  ["110-single-marketplace-excess-aptc-repayment", 1406, 0],
];
for (const [name, credit, repayment] of marketplace) {
  Deno.test(`issue77 2025 PTC with synthetic monthly records: ${name}`, async () => {
    const { pending, diagnostics } = await replay(name);
    assertEquals(diagnostics, []);
    assertEquals(pending.form8962.net_premium_tax_credit ?? 0, credit);
    assertEquals(pending.form8962.excess_advance_premium ?? 0, repayment);
    assertEquals(pending.f1040.line31_additional_payments ?? 0, credit);
    if (name.startsWith("110-")) {
      assertEquals(pending.f1040.line24_total_tax, 1715);
      assertEquals(pending.f1040.line35a_refund, 2191);
    }
  });
}

Deno.test("issue77 case48 preserves the source Medicare withholding dollar in payments", async () => {
  const { pending, diagnostics } = await replay("48-mfj-w2-marketplace-1095a");
  assertEquals(diagnostics, []);
  // Form 8959: 798 + 653 - (55,000 + 45,000) * .0145 = 1.
  assertEquals(pending.f1040.line25c_additional_medicare_withheld, 1);
  assertEquals(pending.f1040.line33_total_payments, 10500 + 1 + 4700);
  assertEquals(pending.f1040.line35a_refund, 7455);
});
