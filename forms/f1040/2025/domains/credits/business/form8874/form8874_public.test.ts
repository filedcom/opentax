import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../../index.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { withReviewedForm8874RecaptureEvidence } from "../../../../../nodes/inputs/credits/business/f8874/recapture_fixture.ts";

const schema =
  ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd";
async function validate(xml: string) {
  const p = new Deno.Command("xmllint", {
    args: ["--noout", "--schema", schema, "-"],
    stdin: "piped",
    stderr: "piped",
    stdout: "piped",
  }).spawn();
  const w = p.stdin.getWriter();
  await w.write(new TextEncoder().encode(xml));
  await w.close();
  const r = await p.output();
  assertEquals(r.code, 0, new TextDecoder().decode(r.stderr));
}
for (
  const c of [
    { id: "single-two-new-markets-investments", credit: 1100 },
    { id: "single-seven-new-markets-investments", credit: 3500 },
  ]
) {
  Deno.test(`Form8874 public investment inventory retains source-authentication export block: ${c.id}`, async () => {
    const fixture = pdfReviewFixtures.find((f) => f.id === c.id)!;
    const r = f1040_2025.executeReturn(fixture.inputs);
    assertEquals(r.diagnostics, []);
    assertEquals(r.pending.schedule3.line6a_total, c.credit);
    assertEquals(r.pending.f1040.line20_nonrefundable_credits, c.credit);
    assertEquals(r.pending.f1040.line24_total_tax, 25067 - c.credit);
    // Older rendered packets predate the current authenticated-status gate.
    const reason =
      "Form 8874 direct QEI needs authenticated CDE status and recapture history";
    await assertRejects(
      () => f1040_2025.prepareReturn(r.pending, fixture.filer),
      Error,
      reason,
    );
    await assertRejects(
      () => buildPdfBytes(r.pending, fixture.filer),
      Error,
      reason,
    );
  });
}
const base = pdfReviewFixtures.find((f) => f.id === "single-w2-refund")!;
function recapture(id: number) {
  return withReviewedForm8874RecaptureEvidence({
    notice_reference: `Synthetic CDE 2025 Form8874-B ${id}`,
    investment_reference: `Synthetic 2022 QEI ${id}`,
    cde_name: `Community Development Entity ${id}`,
    cde_ein: id === 1 ? "123456789" : "234567890",
    notice_taxpayer_tin: "111223333",
    initial_investment_date: "2022-05-01",
    qualified_equity_investment_amount: 100000,
    notice_credit_amount: 25000,
    recapture_event_date: "2025-06-01",
    recapture_event: "cde_redeemed_investment" as const,
    prior_years: [{
      tax_year: 2024,
      original_return_due_date: "2025-04-15",
      section38_credit_allowed_as_filed: 9000,
      section38_credit_allowed_without_this_qei: 7000,
      recomputation_reference: `Synthetic2024 recomputation ${id}`,
    }],
    carryover_ledger_reference: `Synthetic2024 QEI ledger ${id}`,
    carryover_vintages: [{
      originating_tax_year: 2024,
      credit_generated_as_filed: 5000,
      credit_carried_to_2025_before_recapture: 3000,
      source_document_reference: `Synthetic2024 carryover ${id}`,
      historical_uses: [{
        tax_year: 2024,
        credit_allowed: 2000,
        return_reference: `Synthetic2024 Form3800 ${id}`,
      }],
    }],
  }, "Alex Example");
}
for (const count of [1, 2]) {
  Deno.test(`Form8874 public reported recapture through final tax and exports: ${count} investments`, async () => {
    const r = f1040_2025.executeReturn({
      ...base.inputs,
      f8874_recapture: {
        recaptures: Array.from({ length: count }, (_, i) => recapture(i + 1)),
      },
    });
    assertEquals(r.diagnostics, []);
    // Per source: 2000 previously used credit +144 independently compounded interest.
    const tax = 2144 * count;
    assertEquals(r.pending.schedule2.line17a_new_markets_credit_recapture, tax);
    assertEquals(r.pending.f1040.line23_other_taxes, tax);
    assertEquals(r.pending.f1040.line24_total_tax, 7955 + tax);
    const prepared = await f1040_2025.prepareReturn(r.pending, base.filer);
    assertStringIncludes(prepared.bundle.xml, "NMCR");
    await validate(prepared.bundle.xml);
    const pdf = await prepared.renderPdf();
    console.log({
      recaptures: count,
      pages: (await PDFDocument.load(pdf)).getPageCount(),
      tax: 7955 + tax,
    });
    for (
      const changed of [
        {
          ...r.pending,
          schedule2: {
            ...r.pending.schedule2,
            line17a_new_markets_credit_recapture: tax + 1,
          },
        },
        {
          ...r.pending,
          f1040: { ...r.pending.f1040, taxpayer_ssn: "222334444" },
        },
      ]
    ) {
      await assertRejects(() => f1040_2025.prepareReturn(changed, base.filer));
      await assertRejects(() => buildPdfBytes(changed, base.filer));
    }
  });
}
