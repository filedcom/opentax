import { assertEquals, assertThrows } from "@std/assert";
import { f8917 } from "./index.ts";

const ctx = { taxYear: 2025, formType: "f1040" } as const;

Deno.test("f8917.inputSchema: retains valid historical item shape", () => {
  assertEquals(f8917.inputSchema.safeParse({
    f8917s: [{
      tuition_and_fees_paid: 5000,
      student_name: "Jane Doe",
      student_ssn: "123-45-6789",
    }],
  }).success, true);
});

Deno.test("f8917.inputSchema: empty array and negative tuition fail", () => {
  assertEquals(f8917.inputSchema.safeParse({ f8917s: [] }).success, false);
  assertEquals(f8917.inputSchema.safeParse({
    f8917s: [{ tuition_and_fees_paid: -100 }],
  }).success, false);
});

Deno.test("f8917.compute: positive tuition cannot silently disappear", () => {
  assertThrows(
    () => f8917.compute(ctx, { f8917s: [{ tuition_and_fees_paid: 5000 }] }),
    Error,
    "Form 8917 is historical and cannot be filed for TY2025",
  );
});

Deno.test("f8917.compute: zero tuition and empty historical items also reject", () => {
  for (const item of [{ tuition_and_fees_paid: 0 }, {}]) {
    assertThrows(
      () => f8917.compute(ctx, { f8917s: [item] }),
      Error,
      "Form 8917 is historical and cannot be filed for TY2025",
    );
  }
});

Deno.test("f8917.compute: identifying fields cannot masquerade as a supported form", () => {
  assertThrows(
    () => f8917.compute(ctx, {
      f8917s: [{ student_name: "John Doe", student_ssn: "987-65-4321" }],
    }),
    Error,
    "Form 8917 is historical and cannot be filed for TY2025",
  );
});

Deno.test("f8917.compute: invalid negative tuition remains a validation error", () => {
  assertThrows(
    () => f8917.compute(ctx, { f8917s: [{ tuition_and_fees_paid: -500 }] }),
    Error,
  );
});
