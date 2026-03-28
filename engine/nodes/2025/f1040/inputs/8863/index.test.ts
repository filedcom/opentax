import { assertEquals } from "@std/assert";
import { f8863 } from "./index.ts";

// ---- Unit: AOC computation ----

Deno.test("f8863.compute: AOC with $4000 expenses, no phase-out = $2500 total", () => {
  const result = f8863.compute({
    f8863s: [{
      credit_type: "aoc",
      student_name: "Alice",
      qualified_expenses: 4000,
      agi: 50000,
    }],
  });

  // AOC base: min(4000,2000) + 0.25*min(2000,2000) = 2000 + 500 = 2500
  // nonrefundable = 2500 * 0.60 = 1500
  // refundable = 2500 * 0.40 = 1000
  const schedule3Output = result.outputs.find((o) =>
    o.nodeType === "schedule3"
  );
  assertEquals(schedule3Output !== undefined, true);
  const s3Input = schedule3Output!.input as Record<string, unknown>;
  assertEquals(s3Input.line3_education_credit, 1500);

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output !== undefined, true);
  const f1040Input = f1040Output!.input as Record<string, unknown>;
  assertEquals(f1040Input.line29_refundable_aoc, 1000);
});

Deno.test("f8863.compute: AOC with only $2000 expenses = $2000 total", () => {
  const result = f8863.compute({
    f8863s: [{
      credit_type: "aoc",
      student_name: "Bob",
      qualified_expenses: 2000,
      agi: 30000,
    }],
  });

  // AOC base = 2000 + 0 = 2000
  // nonrefundable = 2000 * 0.60 = 1200
  // refundable = 2000 * 0.40 = 800
  const schedule3Output = result.outputs.find((o) =>
    o.nodeType === "schedule3"
  );
  assertEquals(schedule3Output !== undefined, true);
  const s3Input = schedule3Output!.input as Record<string, unknown>;
  assertEquals(s3Input.line3_education_credit, 1200);

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output !== undefined, true);
  const f1040Input = f1040Output!.input as Record<string, unknown>;
  assertEquals(f1040Input.line29_refundable_aoc, 800);
});

Deno.test("f8863.compute: AOC fully phased out for single filer above $90,000", () => {
  const result = f8863.compute({
    f8863s: [{
      credit_type: "aoc",
      student_name: "Carol",
      qualified_expenses: 4000,
      agi: 95000,
      filing_status: "single",
    }],
  });

  const schedule3Output = result.outputs.find((o) =>
    o.nodeType === "schedule3"
  );
  assertEquals(schedule3Output, undefined);
  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output, undefined);
});

Deno.test("f8863.compute: AOC partially phased out for single filer at $85,000", () => {
  const result = f8863.compute({
    f8863s: [{
      credit_type: "aoc",
      student_name: "Dave",
      qualified_expenses: 4000,
      agi: 85000,
      filing_status: "single",
    }],
  });

  // phase-out fraction = (85000 - 80000) / (90000 - 80000) = 0.5
  // AOC base = 2500, allowed = 2500 * 0.5 = 1250
  // nonrefundable = 1250 * 0.60 = 750
  // refundable = 1250 * 0.40 = 500
  const schedule3Output = result.outputs.find((o) =>
    o.nodeType === "schedule3"
  );
  assertEquals(schedule3Output !== undefined, true);
  const s3Input = schedule3Output!.input as Record<string, unknown>;
  assertEquals(s3Input.line3_education_credit, 750);

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output !== undefined, true);
  const f1040Input = f1040Output!.input as Record<string, unknown>;
  assertEquals(f1040Input.line29_refundable_aoc, 500);
});

Deno.test("f8863.compute: AOC MFJ phase-out at $170,000 (midpoint)", () => {
  const result = f8863.compute({
    f8863s: [{
      credit_type: "aoc",
      student_name: "Eve",
      qualified_expenses: 4000,
      agi: 170000,
      filing_status: "mfj",
    }],
  });

  // phase-out fraction = (170000 - 160000) / (180000 - 160000) = 0.5
  // AOC base = 2500, allowed = 1250
  const schedule3Output = result.outputs.find((o) =>
    o.nodeType === "schedule3"
  );
  assertEquals(schedule3Output !== undefined, true);
  const s3Input = schedule3Output!.input as Record<string, unknown>;
  assertEquals(s3Input.line3_education_credit, 750);
});

// ---- Unit: LLC computation ----

Deno.test("f8863.compute: LLC with $10000 expenses, no phase-out = $2000 credit", () => {
  const result = f8863.compute({
    f8863s: [{
      credit_type: "llc",
      student_name: "Frank",
      qualified_expenses: 10000,
      agi: 50000,
    }],
  });

  // LLC base = 0.20 * 10000 = 2000, fully allowed
  const schedule3Output = result.outputs.find((o) =>
    o.nodeType === "schedule3"
  );
  assertEquals(schedule3Output !== undefined, true);
  const s3Input = schedule3Output!.input as Record<string, unknown>;
  assertEquals(s3Input.line3_education_credit, 2000);

  // LLC is nonrefundable — no f1040 output
  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output, undefined);
});

Deno.test("f8863.compute: LLC with $5000 expenses = $1000 credit", () => {
  const result = f8863.compute({
    f8863s: [{
      credit_type: "llc",
      student_name: "Grace",
      qualified_expenses: 5000,
      agi: 40000,
    }],
  });

  // LLC base = 0.20 * 5000 = 1000
  const schedule3Output = result.outputs.find((o) =>
    o.nodeType === "schedule3"
  );
  assertEquals(schedule3Output !== undefined, true);
  const s3Input = schedule3Output!.input as Record<string, unknown>;
  assertEquals(s3Input.line3_education_credit, 1000);
});

Deno.test("f8863.compute: LLC fully phased out above $90,000 for single", () => {
  const result = f8863.compute({
    f8863s: [{
      credit_type: "llc",
      student_name: "Heidi",
      qualified_expenses: 10000,
      agi: 95000,
      filing_status: "single",
    }],
  });

  const schedule3Output = result.outputs.find((o) =>
    o.nodeType === "schedule3"
  );
  assertEquals(schedule3Output, undefined);
});

Deno.test("f8863.compute: LLC partially phased out at $85,000 single", () => {
  const result = f8863.compute({
    f8863s: [{
      credit_type: "llc",
      student_name: "Ivan",
      qualified_expenses: 10000,
      agi: 85000,
      filing_status: "single",
    }],
  });

  // phase-out fraction = (85000-80000)/(90000-80000) = 0.5
  // LLC base = 2000, allowed = 2000 * 0.5 = 1000
  const schedule3Output = result.outputs.find((o) =>
    o.nodeType === "schedule3"
  );
  assertEquals(schedule3Output !== undefined, true);
  const s3Input = schedule3Output!.input as Record<string, unknown>;
  assertEquals(s3Input.line3_education_credit, 1000);
});
