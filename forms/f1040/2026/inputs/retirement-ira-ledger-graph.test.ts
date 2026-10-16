import { assert, assertEquals } from "@std/assert";
import { executeDraftSources2026 } from "../execute.ts";
import { retirementIraLedgerGraph2026 } from "./retirement-ira-ledger.fixture.ts";
import type { calculateRetirementSources2026 } from "./retirement-source.ts";

Deno.test("2026 IRA payment ledger reaches annual tax and settlement with one withholding amount per current copy", async () => {
  const graph = retirementIraLedgerGraph2026();
  const r = await executeDraftSources2026(graph);
  assertEquals(r.diagnostics, []);
  assertEquals(r.pending.f1040.line4a_ira_gross, 16000);
  assertEquals(r.pending.f1040.line4b_ira_taxable, 14800);
  assertEquals(r.pending.f1040.line11b_agi, 54800);
  assertEquals(r.pending.f1040.line25b_withheld_1099, 1000);
  assertEquals(r.pending.schedule2.line5_form5329_early_tax, 555);
  assertEquals(r.pending.f1040.line23_other_taxes, 555);
  const result = r.pending.f1099r.calculation_2026 as ReturnType<
    typeof calculateRetirementSources2026
  >;
  assertEquals(
    result.ira_basis!.calculation.forms[0].distributions[0].payments.length,
    2,
  );
  assertEquals(
    result.ira_basis!.calculation.forms[0].carryforward_2027?.amount,
    2800,
  );
  const taxes = r.pending.schedule_a.information_return_tax_sources as {
    state_withheld: number;
  }[];
  assertEquals(taxes.reduce((n, s) => n + s.state_withheld, 0), 300);
});

Deno.test("2026 IRA payment ledger corrections replace current income and retained source evidence without duplication", async () => {
  const graph = retirementIraLedgerGraph2026(), claim = graph.f1099r.claim;
  const old = structuredClone(claim.copies[0]);
  old.source_document_reference = "retired-ledger-statement";
  old.box1_gross_distribution = old.box2a_taxable_amount = 99000;
  old.box4_federal_withheld = 9000;
  claim.copies[0].corrected = true;
  claim.copies[0].supersedes_document_reference = old.source_document_reference;
  claim.copies.push(old);
  const r = await executeDraftSources2026(graph);
  assertEquals(r.diagnostics, []);
  assertEquals(r.pending.f1040.line4b_ira_taxable, 14800);
  assertEquals(r.pending.f1040.line25b_withheld_1099, 1000);
  claim.ira_basis!.owners[0].statement_payment_ledgers![0]
    .source_document_reference = old.source_document_reference;
  const bad = await executeDraftSources2026(graph);
  assert(bad.diagnostics.some((d) => d.nodeType === "f1099r"));
});
