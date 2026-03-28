import { assertEquals } from "@std/assert";
import { int } from "./index.ts";

// ---- Unit: compute routing ----

Deno.test("int.compute: box1 + box3 - box11 - box12 routes to schedule_b_interest", () => {
  const result = int.compute({
    payer_name: "First National Bank",
    box1: 500,
    box3: 100,
    box11: 20,
    box12: 10,
  });

  const sbOutput = result.outputs.find(
    (o) => o.nodeType === "schedule_b_interest",
  );
  assertEquals(sbOutput !== undefined, true);
  const input = sbOutput!.input as Record<string, unknown>;
  assertEquals(input.payer_name, "First National Bank");
  // taxable_interest_net = 500 + 100 - 20 - 10 = 570
  assertEquals(input.taxable_interest_net, 570);
});

Deno.test("int.compute: box2 routes to schedule1 line18", () => {
  const result = int.compute({
    payer_name: "Savings Bank",
    box1: 0,
    box2: 250,
  });

  const schedule1Output = result.outputs.find(
    (o) => o.nodeType === "schedule1",
  );
  assertEquals(schedule1Output !== undefined, true);
  const input = schedule1Output!.input as Record<string, unknown>;
  assertEquals(input.line18_early_withdrawal, 250);
});

Deno.test("int.compute: box4 routes to f1040 line25b", () => {
  const result = int.compute({
    payer_name: "Bank",
    box1: 1000,
    box4: 280,
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output !== undefined, true);
  const input = f1040Output!.input as Record<string, unknown>;
  assertEquals(input.line25b_withheld_1099, 280);
});

Deno.test("int.compute: box8 - box13 routes to f1040 line2a", () => {
  const result = int.compute({
    payer_name: "Muni Fund",
    box1: 0,
    box8: 600,
    box13: 100,
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output !== undefined, true);
  const input = f1040Output!.input as Record<string, unknown>;
  assertEquals(input.line2a_tax_exempt, 500);
});

Deno.test("int.compute: box9 routes to form6251 line2g", () => {
  const result = int.compute({
    payer_name: "Bond Fund",
    box1: 0,
    box8: 800,
    box9: 300,
  });

  const form6251Output = result.outputs.find((o) => o.nodeType === "form6251");
  assertEquals(form6251Output !== undefined, true);
  const input = form6251Output!.input as Record<string, unknown>;
  assertEquals(input.line2g_pab_interest, 300);
});

Deno.test("int.compute: box6 routes to schedule3 line1", () => {
  const result = int.compute({
    payer_name: "Foreign Bank",
    box1: 1000,
    box6: 150,
  });

  const schedule3Output = result.outputs.find(
    (o) => o.nodeType === "schedule3",
  );
  assertEquals(schedule3Output !== undefined, true);
  const input = schedule3Output!.input as Record<string, unknown>;
  assertEquals(input.line1_foreign_tax_1099, 150);
});

Deno.test("int.compute: nominee_interest reduces taxable_interest_net", () => {
  const result = int.compute({
    payer_name: "Bank",
    box1: 1000,
    nominee_interest: 200,
  });

  const sbOutput = result.outputs.find(
    (o) => o.nodeType === "schedule_b_interest",
  );
  assertEquals(sbOutput !== undefined, true);
  const input = sbOutput!.input as Record<string, unknown>;
  // taxable_interest_net = 1000 - 200 = 800
  assertEquals(input.taxable_interest_net, 800);
});

// ---- Unit: validation ----

Deno.test("int.compute: box9 > box8 throws validation error", () => {
  let threw = false;
  try {
    int.compute({
      payer_name: "Fund",
      box1: 0,
      box8: 100,
      box9: 200,
    });
  } catch (e) {
    threw = true;
    const err = e as Error;
    assertEquals(err.message.includes("box9") || err.message.includes("box8"), true);
  }
  assertEquals(threw, true);
});

Deno.test("int.compute: box13 > box8 throws validation error", () => {
  let threw = false;
  try {
    int.compute({
      payer_name: "Fund",
      box1: 0,
      box8: 100,
      box13: 200,
    });
  } catch (e) {
    threw = true;
    const err = e as Error;
    assertEquals(err.message.includes("box13") || err.message.includes("box8"), true);
  }
  assertEquals(threw, true);
});

Deno.test("int.compute: when box8=0 and box13=0, no f1040 line2a output", () => {
  const result = int.compute({
    payer_name: "Bank",
    box1: 500,
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  // May or may not emit f1040, but line2a_tax_exempt should not be in it
  if (f1040Output !== undefined) {
    const input = f1040Output.input as Record<string, unknown>;
    assertEquals(input.line2a_tax_exempt, undefined);
  }
});
