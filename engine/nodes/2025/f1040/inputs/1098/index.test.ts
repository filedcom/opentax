import { assertEquals } from "@std/assert";
import { f1098 } from "./index.ts";

// ---- Unit: schedule_a routing ----

Deno.test("f1098.compute: net mortgage interest routes to schedule_a by default", () => {
  const result = f1098.compute({
    f1098s: [{
      lender_name: "First Mortgage Co",
      box1_mortgage_interest: 12000,
    }],
  });

  const schedAOutput = result.outputs.find((o) => o.nodeType === "schedule_a");
  assertEquals(schedAOutput !== undefined, true);
  const input = schedAOutput!.input as Record<string, unknown>;
  assertEquals(input.line8a_mortgage_interest_1098, 12000);
});

Deno.test("f1098.compute: box4 refund reduces net interest to schedule_a", () => {
  const result = f1098.compute({
    f1098s: [{
      lender_name: "Lender",
      box1_mortgage_interest: 10000,
      box4_refund_overpaid: 500,
      for_routing: "schedule_a",
    }],
  });

  const schedAOutput = result.outputs.find((o) => o.nodeType === "schedule_a");
  assertEquals(schedAOutput !== undefined, true);
  const input = schedAOutput!.input as Record<string, unknown>;
  // net interest = 10000 - 500 = 9500
  assertEquals(input.line8a_mortgage_interest_1098, 9500);
});

Deno.test("f1098.compute: zero net interest emits no interest output", () => {
  const result = f1098.compute({
    f1098s: [{
      lender_name: "Lender",
      box1_mortgage_interest: 500,
      box4_refund_overpaid: 500,
      for_routing: "schedule_a",
    }],
  });

  const schedAOutput = result.outputs.find(
    (o) =>
      o.nodeType === "schedule_a" &&
      (o.input as Record<string, unknown>).line8a_mortgage_interest_1098 !==
        undefined,
  );
  assertEquals(schedAOutput, undefined);
});

// ---- Unit: schedule_e and schedule_c routing ----

Deno.test("f1098.compute: for_routing=schedule_e routes mortgage interest to schedule_e", () => {
  const result = f1098.compute({
    f1098s: [{
      lender_name: "Lender",
      box1_mortgage_interest: 8000,
      for_routing: "schedule_e",
    }],
  });

  const schedEOutput = result.outputs.find((o) => o.nodeType === "schedule_e");
  assertEquals(schedEOutput !== undefined, true);
  const input = schedEOutput!.input as Record<string, unknown>;
  assertEquals(input.mortgage_interest, 8000);
});

Deno.test("f1098.compute: for_routing=schedule_c routes mortgage interest to schedule_c", () => {
  const result = f1098.compute({
    f1098s: [{
      lender_name: "Lender",
      box1_mortgage_interest: 6000,
      for_routing: "schedule_c",
    }],
  });

  const schedCOutput = result.outputs.find((o) => o.nodeType === "schedule_c");
  assertEquals(schedCOutput !== undefined, true);
  const input = schedCOutput!.input as Record<string, unknown>;
  assertEquals(input.line16a_interest_mortgage, 6000);
});

// ---- Unit: box6 points and box10 real estate tax ----

Deno.test("f1098.compute: box6 points routes to schedule_a line8c when for_routing=schedule_a", () => {
  const result = f1098.compute({
    f1098s: [{
      lender_name: "Lender",
      box1_mortgage_interest: 0,
      box6_points_paid: 2000,
      for_routing: "schedule_a",
    }],
  });

  const pointsOutput = result.outputs.find(
    (o) =>
      o.nodeType === "schedule_a" &&
      (o.input as Record<string, unknown>).line8c_points_no_1098 !== undefined,
  );
  assertEquals(pointsOutput !== undefined, true);
  const input = pointsOutput!.input as Record<string, unknown>;
  assertEquals(input.line8c_points_no_1098, 2000);
});

Deno.test("f1098.compute: box6 points NOT routed when for_routing=schedule_e", () => {
  const result = f1098.compute({
    f1098s: [{
      lender_name: "Lender",
      box1_mortgage_interest: 5000,
      box6_points_paid: 1500,
      for_routing: "schedule_e",
    }],
  });

  const pointsOutput = result.outputs.find(
    (o) =>
      (o.input as Record<string, unknown>).line8c_points_no_1098 !== undefined,
  );
  assertEquals(pointsOutput, undefined);
});

Deno.test("f1098.compute: box10 real estate tax routes to schedule_a line5b", () => {
  const result = f1098.compute({
    f1098s: [{
      lender_name: "Lender",
      box1_mortgage_interest: 0,
      box10_other: 3600,
      for_routing: "schedule_a",
    }],
  });

  const reTaxOutput = result.outputs.find(
    (o) =>
      o.nodeType === "schedule_a" &&
      (o.input as Record<string, unknown>).line5b_real_estate_tax !== undefined,
  );
  assertEquals(reTaxOutput !== undefined, true);
  const input = reTaxOutput!.input as Record<string, unknown>;
  assertEquals(input.line5b_real_estate_tax, 3600);
});

// ---- Unit: MIP not routed ----

Deno.test("f1098.compute: box5 MIP collected but not routed for TY2025", () => {
  const result = f1098.compute({
    f1098s: [{
      lender_name: "Lender",
      box1_mortgage_interest: 10000,
      box5_mip: 1200,
      for_routing: "schedule_a",
    }],
  });

  // No output should reference MIP
  const mipOutput = result.outputs.find(
    (o) => JSON.stringify(o.input).includes("mip"),
  );
  assertEquals(mipOutput, undefined);
});
