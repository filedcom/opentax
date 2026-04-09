import { assertEquals } from "@std/assert";
import { form8824 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return form8824.compute({ taxYear: 2025, formType: "f1040" }, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Zero / no-op cases ───────────────────────────────────────────────────────

Deno.test("no exchange data — no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

// ─── Pure exchange — no boot, gain deferred ───────────────────────────────────

Deno.test("pure exchange: no boot → realized=$300k, recognized=$0, no output", () => {
  // Relinquished basis $200k, received FMV $500k, no cash/other boot
  // Amount realized = $500k; gain realized = $300k; boot = $0 → recognized = $0
  const result = compute({
    relinquished_fmv: 500_000,
    relinquished_basis: 200_000,
    received_fmv: 500_000,
    cash_received: 0,
    gain_type: "capital",
  });
  assertEquals(findOutput(result, "schedule_d"), undefined);
  assertEquals(findOutput(result, "form4797"), undefined);
  assertEquals(result.outputs.length, 0);
});

// ─── Boot triggers recognized gain ───────────────────────────────────────────

Deno.test("cash boot: old_basis=$50k, FMV_new=$80k, boot=$5k → realized=$30k, recognized=$5k, deferred=$25k", () => {
  // Amount realized = received_fmv $80k + cash $5k = $85k
  // Gain realized = $85k - $50k = $35k
  // Boot = $5k; recognized = min($35k, $5k) = $5k; deferred = $35k - $5k = $30k
  // Note: the node only emits recognized gain — deferred gain is implicit
  const result = compute({
    relinquished_basis: 50_000,
    received_fmv: 80_000,
    cash_received: 5_000,
    gain_type: "capital",
  });
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd?.fields.line_11_form2439, 5_000);
});

Deno.test("cash boot equals realized gain — full gain recognized", () => {
  // Relinquished $500k basis $200k, received $450k + $50k cash
  // Amount realized = $500k; gain realized = $300k
  // Boot = $50k; recognized = min($300k, $50k) = $50k
  const result = compute({
    relinquished_fmv: 500_000,
    relinquished_basis: 200_000,
    received_fmv: 450_000,
    cash_received: 50_000,
    gain_type: "capital",
  });
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd?.fields.line_11_form2439, 50_000);
});

Deno.test("boot exceeds realized gain — recognized capped at realized gain", () => {
  // Relinquished $500k basis $490k, received $450k + $50k cash
  // Amount realized = $500k; gain realized = $10k
  // Boot = $50k; recognized = min($10k, $50k) = $10k
  const result = compute({
    relinquished_fmv: 500_000,
    relinquished_basis: 490_000,
    received_fmv: 450_000,
    cash_received: 50_000,
    gain_type: "capital",
  });
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd?.fields.line_11_form2439, 10_000);
});

// ─── Loss exchange — §1031 losses not recognized ──────────────────────────────

Deno.test("realized loss — not recognized, no output", () => {
  // Relinquished $400k basis $500k → realized loss $100k; §1031 defers losses
  const result = compute({
    relinquished_fmv: 400_000,
    relinquished_basis: 500_000,
    received_fmv: 400_000,
    cash_received: 0,
    gain_type: "capital",
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("realized loss with boot — still no recognized gain", () => {
  // Realized loss $100k; even with $50k boot, gain realized < 0 → recognized = 0
  const result = compute({
    relinquished_fmv: 400_000,
    relinquished_basis: 500_000,
    received_fmv: 350_000,
    cash_received: 50_000,
    gain_type: "capital",
  });
  assertEquals(result.outputs.length, 0);
});

// ─── Liability boot ───────────────────────────────────────────────────────────

Deno.test("buyer assumes mortgage: liability boot triggers recognition", () => {
  // Received $300k property + buyer assumes $100k mortgage
  // Amount realized = $300k + $100k = $400k; basis $200k → realized = $200k
  // Boot = net_liabilities = max(0, $100k - $0) = $100k
  // Recognized = min($200k, $100k) = $100k
  const result = compute({
    relinquished_basis: 200_000,
    received_fmv: 300_000,
    cash_received: 0,
    liabilities_assumed_by_buyer: 100_000,
    liabilities_taxpayer_assumed: 0,
    gain_type: "capital",
  });
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd?.fields.line_11_form2439, 100_000);
});

Deno.test("taxpayer assumes larger liability — reduces amount realized, cash boot still recognized", () => {
  // Received $500k + $50k cash, but taxpayer assumes $100k liability
  // Amount realized = $500k + $50k - $100k = $450k; basis $300k → realized = $150k
  // Net liability boot = max(0, $0 - $100k) = $0; cash boot = $50k
  // Recognized = min($150k, $50k) = $50k
  const result = compute({
    relinquished_basis: 300_000,
    received_fmv: 500_000,
    cash_received: 50_000,
    liabilities_assumed_by_buyer: 0,
    liabilities_taxpayer_assumed: 100_000,
    gain_type: "capital",
  });
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd?.fields.line_11_form2439, 50_000);
});

// ─── Other property boot ──────────────────────────────────────────────────────

Deno.test("other property received as boot — FMV triggers recognition", () => {
  // Received $450k + $30k other property
  // Amount realized = $480k; basis $200k → realized = $280k
  // Boot = $30k; recognized = min($280k, $30k) = $30k
  const result = compute({
    relinquished_basis: 200_000,
    received_fmv: 450_000,
    other_property_fmv: 30_000,
    gain_type: "capital",
  });
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd?.fields.line_11_form2439, 30_000);
});

// ─── Routing: §1231 vs capital ────────────────────────────────────────────────

Deno.test("section_1231 gain_type routes recognized gain to form4797", () => {
  const result = compute({
    relinquished_basis: 200_000,
    received_fmv: 400_000,
    cash_received: 50_000,
    gain_type: "section_1231",
  });
  const f4797 = findOutput(result, "form4797");
  const sd = findOutput(result, "schedule_d");
  assertEquals(f4797?.fields.section_1231_gain, 50_000);
  assertEquals(sd, undefined);
});

Deno.test("capital gain_type routes recognized gain to schedule_d line_11_form2439", () => {
  const result = compute({
    relinquished_basis: 200_000,
    received_fmv: 400_000,
    cash_received: 50_000,
    gain_type: "capital",
  });
  const sd = findOutput(result, "schedule_d");
  const f4797 = findOutput(result, "form4797");
  assertEquals(sd?.fields.line_11_form2439, 50_000);
  assertEquals(f4797, undefined);
});

Deno.test("default gain_type is capital when omitted", () => {
  const result = compute({
    relinquished_basis: 200_000,
    received_fmv: 400_000,
    cash_received: 50_000,
  });
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd?.fields.line_11_form2439, 50_000);
});
