import { assertEquals } from "@std/assert";
import { form8824 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return form8824.compute(input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Smoke Tests ─────────────────────────────────────────────────────────────

Deno.test("smoke — empty input returns no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

// ─── Pure Exchange — No Boot ─────────────────────────────────────────────────

Deno.test("pure exchange — no boot → no recognized gain", () => {
  // Relinquished property worth $500k, basis $200k
  // Received property worth $500k, no cash/boot
  const result = compute({
    relinquished_fmv: 500_000,
    relinquished_basis: 200_000,
    received_fmv: 500_000,
    cash_received: 0,
    gain_type: "capital",
  });
  // Gain realized = $300k, but no boot → gain recognized = 0
  assertEquals(findOutput(result, "schedule_d"), undefined);
  assertEquals(findOutput(result, "form4797"), undefined);
});

// ─── Cash Boot Received ───────────────────────────────────────────────────────

Deno.test("exchange with cash boot — recognized gain equals boot", () => {
  // Relinquished $500k basis $200k, received $450k property + $50k cash
  // Gain realized = $500k (amount realized) - $200k (basis) = $300k
  // Boot = $50k, gain recognized = min($300k, $50k) = $50k
  const result = compute({
    relinquished_fmv: 500_000,
    relinquished_basis: 200_000,
    received_fmv: 450_000,
    cash_received: 50_000,
    gain_type: "capital",
  });
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd !== undefined, true);
  assertEquals(sd?.fields.line_11_form2439, 50_000);
});

Deno.test("exchange with cash boot — recognized gain capped by realized gain", () => {
  // Relinquished $500k basis $490k, received $450k + $50k cash
  // Gain realized = $500k - $490k = $10k
  // Boot = $50k, recognized = min($10k, $50k) = $10k
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

// ─── Loss Exchange — Not Recognized ─────────────────────────────────────────

Deno.test("exchange with loss — realized loss not recognized", () => {
  // Relinquished $400k basis $500k = $100k realized loss
  // §1031: losses are deferred, not recognized
  const result = compute({
    relinquished_fmv: 400_000,
    relinquished_basis: 500_000,
    received_fmv: 400_000,
    cash_received: 0,
    gain_type: "capital",
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("exchange with loss and boot — still no recognized gain", () => {
  // Relinquished $400k basis $500k = $100k realized loss
  // Even with $50k boot, gain realized < 0 → recognized = 0
  const result = compute({
    relinquished_fmv: 400_000,
    relinquished_basis: 500_000,
    received_fmv: 350_000,
    cash_received: 50_000,
    gain_type: "capital",
  });
  assertEquals(result.outputs.length, 0);
});

// ─── Liability Boot ───────────────────────────────────────────────────────────

Deno.test("liability assumed by buyer increases amount realized", () => {
  // Relinquished property FMV $400k, basis $200k, with $100k mortgage assumed by buyer
  // Amount realized = $400k + $100k - $0 = $400k...
  // Wait: received_fmv $300k + liabilities_assumed_by_buyer $100k = $400k
  // Gain realized = $400k - $200k = $200k
  // Boot = cash($0) + other($0) + net_liabilities($100k) = $100k
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
  assertEquals(sd !== undefined, true);
  assertEquals(sd?.fields.line_11_form2439, 100_000);
});

Deno.test("taxpayer assumes liability reduces amount realized", () => {
  // Received $500k property + $50k cash, but taxpayer assumes $100k liability
  // Amount realized = $500k + $50k + $0 - $100k = $450k
  // Relinquished basis $300k → gain realized = $150k
  // Boot = $50k - $0 (net liabilities: $0 buyer assumed, $100k taxpayer assumed → negative)
  // Net liability boot = max(0, 0 - 100k) = 0; cash boot = $50k
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

// ─── Section 1231 vs Capital Routing ─────────────────────────────────────────

Deno.test("section_1231 gain_type routes to form4797", () => {
  const result = compute({
    relinquished_basis: 200_000,
    received_fmv: 400_000,
    cash_received: 50_000,
    gain_type: "section_1231",
  });
  const f4797 = findOutput(result, "form4797");
  const sd = findOutput(result, "schedule_d");
  assertEquals(f4797 !== undefined, true);
  assertEquals(sd, undefined);
  assertEquals(f4797?.fields.section_1231_gain, 50_000);
});

Deno.test("capital gain_type routes to schedule_d", () => {
  const result = compute({
    relinquished_basis: 200_000,
    received_fmv: 400_000,
    cash_received: 50_000,
    gain_type: "capital",
  });
  const sd = findOutput(result, "schedule_d");
  const f4797 = findOutput(result, "form4797");
  assertEquals(sd !== undefined, true);
  assertEquals(f4797, undefined);
  assertEquals(sd?.fields.line_11_form2439, 50_000);
});

Deno.test("default gain_type is capital → routes to schedule_d", () => {
  const result = compute({
    relinquished_basis: 200_000,
    received_fmv: 400_000,
    cash_received: 50_000,
  });
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd !== undefined, true);
});

// ─── Other Property Boot ─────────────────────────────────────────────────────

Deno.test("other property received as boot", () => {
  // Received $450k property + $30k other property FMV
  // Gain realized = $450k + $30k - $200k = $280k
  // Boot = $30k (other property), recognized = min($280k, $30k) = $30k
  const result = compute({
    relinquished_basis: 200_000,
    received_fmv: 450_000,
    other_property_fmv: 30_000,
    gain_type: "capital",
  });
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd?.fields.line_11_form2439, 30_000);
});
