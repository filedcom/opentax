import { assertEquals } from "@std/assert";
import { f8862 } from "./index.ts";

function compute(input: Parameters<typeof f8862.compute>[1]) {
  return f8862.compute({ taxYear: 2025, formType: "f1040" }, input);
}

// =============================================================================
// 1. Schema Validation
// =============================================================================

Deno.test("f8862: empty object is valid — all fields optional", () => {
  const parsed = f8862.inputSchema.safeParse({});
  assertEquals(parsed.success, true);
});

Deno.test("f8862: eitc_qualifying_children_count > 3 rejected", () => {
  const parsed = f8862.inputSchema.safeParse({ eitc_qualifying_children_count: 4 });
  assertEquals(parsed.success, false);
});

Deno.test("f8862: negative eitc_qualifying_children_count rejected", () => {
  const parsed = f8862.inputSchema.safeParse({ eitc_qualifying_children_count: -1 });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. No claims — no outputs
// =============================================================================

Deno.test("f8862: no claim flags produces no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8862: claim_eitc=false produces no eitc output", () => {
  const result = compute({ claim_eitc: false });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. EITC routing
// =============================================================================

Deno.test("f8862: claim_eitc=true routes to eitc node", () => {
  const result = compute({ claim_eitc: true });
  const out = result.outputs.find((o) => o.nodeType === "eitc");
  assertEquals(out !== undefined, true);
  assertEquals((out!.fields as Record<string, boolean>).form8862_filed, true);
});

// =============================================================================
// 4. CTC routing
// =============================================================================

Deno.test("f8862: claim_ctc=true routes to f8812 node", () => {
  const result = compute({ claim_ctc: true });
  const out = result.outputs.find((o) => o.nodeType === "f8812");
  assertEquals(out !== undefined, true);
  assertEquals((out!.fields as Record<string, boolean>).form8862_filed, true);
});

// =============================================================================
// 5. AOTC routing
// =============================================================================

Deno.test("f8862: claim_aotc=true routes to f8863 node", () => {
  const result = compute({ claim_aotc: true });
  const out = result.outputs.find((o) => o.nodeType === "f8863");
  assertEquals(out !== undefined, true);
  assertEquals((out!.fields as Record<string, boolean>).form8862_filed, true);
});

// =============================================================================
// 6. Multiple claims
// =============================================================================

Deno.test("f8862: all three claims produce three outputs", () => {
  const result = compute({ claim_eitc: true, claim_ctc: true, claim_aotc: true });
  assertEquals(result.outputs.length, 3);
  const nodeTypes = result.outputs.map((o) => o.nodeType);
  assertEquals(nodeTypes.includes("eitc"), true);
  assertEquals(nodeTypes.includes("f8812"), true);
  assertEquals(nodeTypes.includes("f8863"), true);
});

Deno.test("f8862: claim_eitc + claim_ctc only produces two outputs", () => {
  const result = compute({ claim_eitc: true, claim_ctc: true });
  assertEquals(result.outputs.length, 2);
});
