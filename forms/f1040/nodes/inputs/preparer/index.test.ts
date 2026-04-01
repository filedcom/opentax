import { assertEquals, assertThrows } from "@std/assert";
import { OriginatorType, preparer } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return preparer.compute(
    { taxYear: 2025 },
    input as Parameters<typeof preparer.compute>[1],
  );
}

// =============================================================================
// 1. Schema Validation — PTIN format
// =============================================================================

Deno.test("preparer.inputSchema: valid PTIN P12345678 passes", () => {
  const result = preparer.inputSchema.safeParse({ ptin: "P12345678" });
  assertEquals(result.success, true);
});

Deno.test("preparer.inputSchema: PTIN without leading P fails", () => {
  const result = preparer.inputSchema.safeParse({ ptin: "12345678" });
  assertEquals(result.success, false);
});

Deno.test("preparer.inputSchema: PTIN with 7 digits fails", () => {
  const result = preparer.inputSchema.safeParse({ ptin: "P1234567" });
  assertEquals(result.success, false);
});

Deno.test("preparer.inputSchema: PTIN with 9 digits fails", () => {
  const result = preparer.inputSchema.safeParse({ ptin: "P123456789" });
  assertEquals(result.success, false);
});

Deno.test("preparer.inputSchema: PTIN with letters after P fails", () => {
  const result = preparer.inputSchema.safeParse({ ptin: "PABCDEFGH" });
  assertEquals(result.success, false);
});

// =============================================================================
// 2. Schema Validation — EFIN format
// =============================================================================

Deno.test("preparer.inputSchema: valid 6-digit EFIN passes", () => {
  const result = preparer.inputSchema.safeParse({ efin: "123456" });
  assertEquals(result.success, true);
});

Deno.test("preparer.inputSchema: EFIN with 5 digits fails", () => {
  const result = preparer.inputSchema.safeParse({ efin: "12345" });
  assertEquals(result.success, false);
});

Deno.test("preparer.inputSchema: EFIN with 7 digits fails", () => {
  const result = preparer.inputSchema.safeParse({ efin: "1234567" });
  assertEquals(result.success, false);
});

Deno.test("preparer.inputSchema: EFIN with letters fails", () => {
  const result = preparer.inputSchema.safeParse({ efin: "12345A" });
  assertEquals(result.success, false);
});

// =============================================================================
// 3. Schema Validation — firm_ein format
// =============================================================================

Deno.test("preparer.inputSchema: valid 9-digit firm EIN passes", () => {
  const result = preparer.inputSchema.safeParse({ firm_ein: "123456789" });
  assertEquals(result.success, true);
});

Deno.test("preparer.inputSchema: firm EIN with 8 digits fails", () => {
  const result = preparer.inputSchema.safeParse({ firm_ein: "12345678" });
  assertEquals(result.success, false);
});

Deno.test("preparer.inputSchema: firm EIN with dashes fails", () => {
  const result = preparer.inputSchema.safeParse({ firm_ein: "12-3456789" });
  assertEquals(result.success, false);
});

// =============================================================================
// 4. Schema Validation — firm_zip format
// =============================================================================

Deno.test("preparer.inputSchema: 5-digit ZIP passes", () => {
  const result = preparer.inputSchema.safeParse({ firm_zip: "90210" });
  assertEquals(result.success, true);
});

Deno.test("preparer.inputSchema: ZIP+4 format passes", () => {
  const result = preparer.inputSchema.safeParse({ firm_zip: "90210-1234" });
  assertEquals(result.success, true);
});

Deno.test("preparer.inputSchema: ZIP with letters fails", () => {
  const result = preparer.inputSchema.safeParse({ firm_zip: "9021A" });
  assertEquals(result.success, false);
});

// =============================================================================
// 5. Schema Validation — originator_type enum
// =============================================================================

Deno.test("preparer.inputSchema: ERO originator type passes", () => {
  const result = preparer.inputSchema.safeParse({
    originator_type: OriginatorType.ERO,
  });
  assertEquals(result.success, true);
});

Deno.test("preparer.inputSchema: ISP originator type passes", () => {
  const result = preparer.inputSchema.safeParse({
    originator_type: OriginatorType.ISP,
  });
  assertEquals(result.success, true);
});

Deno.test("preparer.inputSchema: OnlineFiler originator type passes", () => {
  const result = preparer.inputSchema.safeParse({
    originator_type: OriginatorType.OnlineFiler,
  });
  assertEquals(result.success, true);
});

Deno.test("preparer.inputSchema: invalid originator_type fails", () => {
  const result = preparer.inputSchema.safeParse({
    originator_type: "BadType",
  });
  assertEquals(result.success, false);
});

// =============================================================================
// 6. Schema Validation — empty input
// =============================================================================

Deno.test("preparer.inputSchema: empty object passes (all fields optional)", () => {
  const result = preparer.inputSchema.safeParse({});
  assertEquals(result.success, true);
});

// =============================================================================
// 7. Compute — professional preparer with PTIN, firm name, EFIN
// =============================================================================

Deno.test("preparer.compute: professional preparer routes all fields to f1040", () => {
  const result = compute({
    ptin: "P12345678",
    firm_name: "Smith Tax Group",
    firm_ein: "123456789",
    firm_address_line1: "100 Main St",
    firm_city: "Springfield",
    firm_state: "IL",
    firm_zip: "62701",
    efin: "123456",
    originator_type: OriginatorType.ERO,
  });

  assertEquals(result.outputs.length, 1);
  const fields = result.outputs[0].fields;
  assertEquals(result.outputs[0].nodeType, "f1040");
  assertEquals(fields["preparer_ptin"], "P12345678");
  assertEquals(fields["preparer_firm_name"], "Smith Tax Group");
  assertEquals(fields["preparer_firm_ein"], "123456789");
  assertEquals(fields["preparer_firm_address_line1"], "100 Main St");
  assertEquals(fields["preparer_firm_city"], "Springfield");
  assertEquals(fields["preparer_firm_state"], "IL");
  assertEquals(fields["preparer_firm_zip"], "62701");
  assertEquals(fields["preparer_efin"], "123456");
  assertEquals(fields["preparer_originator_type"], OriginatorType.ERO);
});

// =============================================================================
// 8. Compute — self-prepared return (no PTIN)
// =============================================================================

Deno.test("preparer.compute: self-prepared return routes self_prepared indicator", () => {
  const result = compute({ self_prepared: true });

  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "f1040");
  assertEquals(result.outputs[0].fields["preparer_self_prepared"], true);
});

Deno.test("preparer.compute: self-prepared does not require PTIN", () => {
  const schemaResult = preparer.inputSchema.safeParse({ self_prepared: true });
  assertEquals(schemaResult.success, true);
});

// =============================================================================
// 9. Compute — partial input
// =============================================================================

Deno.test("preparer.compute: only PTIN provided routes only PTIN field", () => {
  const result = compute({ ptin: "P00000001" });

  assertEquals(result.outputs.length, 1);
  const fields = result.outputs[0].fields;
  assertEquals(fields["preparer_ptin"], "P00000001");
  assertEquals(fields["preparer_firm_name"], undefined);
  assertEquals(fields["preparer_efin"], undefined);
});

Deno.test("preparer.compute: only EFIN and originator_type produces originator fields", () => {
  const result = compute({
    efin: "654321",
    originator_type: OriginatorType.ISP,
  });

  assertEquals(result.outputs.length, 1);
  const fields = result.outputs[0].fields;
  assertEquals(fields["preparer_efin"], "654321");
  assertEquals(fields["preparer_originator_type"], OriginatorType.ISP);
  assertEquals(fields["preparer_ptin"], undefined);
});

// =============================================================================
// 10. Compute — empty input produces no outputs
// =============================================================================

Deno.test("preparer.compute: empty input produces no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs, []);
});

// =============================================================================
// 11. Compute — validation throws on invalid input
// =============================================================================

Deno.test("preparer.compute: invalid PTIN format throws", () => {
  assertThrows(
    () => compute({ ptin: "INVALID" }),
    Error,
  );
});

Deno.test("preparer.compute: invalid EFIN format throws", () => {
  assertThrows(
    () => compute({ efin: "12345" }),
    Error,
  );
});
