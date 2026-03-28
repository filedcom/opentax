import { assertEquals } from "@std/assert";
import { div } from "./index.ts";

// ---- Unit: compute routing ----

Deno.test("div.compute: box1a routes to schedule_b_dividends", () => {
  const result = div.compute({
    div1099s: [{
      payer_name: "Vanguard",
      box1a: 1500,
    }],
  });

  const sbOutput = result.outputs.find(
    (o) => o.nodeType === "schedule_b_dividends",
  );
  assertEquals(sbOutput !== undefined, true);
  const input = sbOutput!.input as Record<string, unknown>;
  assertEquals(input.payer_name, "Vanguard");
  assertEquals(input.ordinary_dividends, 1500);
});

Deno.test("div.compute: box1b routes to f1040 line3a", () => {
  const result = div.compute({
    div1099s: [{
      payer_name: "Fidelity",
      box1a: 2000,
      box1b: 1800,
    }],
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output !== undefined, true);
  const input = f1040Output!.input as Record<string, unknown>;
  assertEquals(input.line3a_qualified_dividends, 1800);
});

Deno.test("div.compute: box2a routes to schedule_d", () => {
  const result = div.compute({
    div1099s: [{
      payer_name: "Fund",
      box1a: 1000,
      box2a: 300,
      box2b: 50,
      box2c: 20,
      box2d: 10,
    }],
  });

  const scheduleDOutput = result.outputs.find(
    (o) => o.nodeType === "schedule_d",
  );
  assertEquals(scheduleDOutput !== undefined, true);
  const input = scheduleDOutput!.input as Record<string, unknown>;
  assertEquals(input.line13_cap_gain_distrib, 300);
  assertEquals(input.box2b_unrecap_1250, 50);
  assertEquals(input.box2c_qsbs, 20);
  assertEquals(input.box2d_collectibles_28, 10);
});

Deno.test("div.compute: box4 routes to f1040 line25b", () => {
  const result = div.compute({
    div1099s: [{
      payer_name: "Schwab",
      box1a: 500,
      box4: 140,
    }],
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output !== undefined, true);
  const input = f1040Output!.input as Record<string, unknown>;
  assertEquals(input.line25b_withheld_1099, 140);
});

Deno.test("div.compute: box5 routes to form8995", () => {
  const result = div.compute({
    div1099s: [{
      payer_name: "REIT Fund",
      box1a: 1000,
      box5: 400,
    }],
  });

  const form8995Output = result.outputs.find((o) => o.nodeType === "form8995");
  assertEquals(form8995Output !== undefined, true);
  const input = form8995Output!.input as Record<string, unknown>;
  assertEquals(input.line6_sec199a_dividends, 400);
});

Deno.test("div.compute: box7 routes to schedule3 line1", () => {
  const result = div.compute({
    div1099s: [{
      payer_name: "Intl Fund",
      box1a: 2000,
      box7: 120,
    }],
  });

  const schedule3Output = result.outputs.find(
    (o) => o.nodeType === "schedule3",
  );
  assertEquals(schedule3Output !== undefined, true);
  const input = schedule3Output!.input as Record<string, unknown>;
  assertEquals(input.line1_foreign_tax_1099, 120);
});

Deno.test("div.compute: box12 - box13 routes to f1040 line2a", () => {
  const result = div.compute({
    div1099s: [{
      payer_name: "Muni Fund",
      box1a: 0,
      box12: 800,
      box13: 200,
    }],
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output !== undefined, true);
  const input = f1040Output!.input as Record<string, unknown>;
  assertEquals(input.line2a_tax_exempt, 600);
});

Deno.test("div.compute: box13 routes to form6251 line2g", () => {
  const result = div.compute({
    div1099s: [{
      payer_name: "PAB Fund",
      box1a: 0,
      box12: 500,
      box13: 200,
    }],
  });

  const form6251Output = result.outputs.find((o) => o.nodeType === "form6251");
  assertEquals(form6251Output !== undefined, true);
  const input = form6251Output!.input as Record<string, unknown>;
  assertEquals(input.line2g_pab_interest, 200);
});

// ---- Unit: validation ----

Deno.test("div.compute: box1b > box1a throws validation error", () => {
  let threw = false;
  try {
    div.compute({
      div1099s: [{
        payer_name: "Fund",
        box1a: 100,
        box1b: 200,
      }],
    });
  } catch (e) {
    threw = true;
    const err = e as Error;
    assertEquals(
      err.message.includes("box1b") || err.message.includes("box1a"),
      true,
    );
  }
  assertEquals(threw, true);
});

Deno.test("div.compute: box13 > box12 throws validation error", () => {
  let threw = false;
  try {
    div.compute({
      div1099s: [{
        payer_name: "Fund",
        box1a: 0,
        box12: 100,
        box13: 200,
      }],
    });
  } catch (e) {
    threw = true;
    const err = e as Error;
    assertEquals(
      err.message.includes("box13") || err.message.includes("box12"),
      true,
    );
  }
  assertEquals(threw, true);
});
