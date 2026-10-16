import { test } from "bun:test";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { z } from "zod";
import { zodToLines } from "./zod-doc.ts";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

test("zodToLines: string field", () => {
  const lines = zodToLines(z.string(), "name", 1);
  assertEquals(lines, ["  name  string"]);
});

test("zodToLines: boolean field", () => {
  const lines = zodToLines(z.boolean(), "active", 1);
  assertEquals(lines, ["  active  boolean"]);
});

test("zodToLines: number with min constraint", () => {
  const lines = zodToLines(z.number().nonnegative(), "amount", 1);
  assertEquals(lines.length, 1);
  assertStringIncludes(lines[0], "number");
  assertStringIncludes(lines[0], "≥0");
});

test("zodToLines: number with min and max constraints", () => {
  const lines = zodToLines(z.number().min(1).max(100), "pct", 0);
  assertEquals(lines.length, 1);
  assertStringIncludes(lines[0], "≥1");
  assertStringIncludes(lines[0], "≤100");
});

test("zodToLines: number with no constraints", () => {
  const lines = zodToLines(z.number(), "val", 0);
  assertEquals(lines, ["val  number"]);
});

// ---------------------------------------------------------------------------
// Enum / NativeEnum
// ---------------------------------------------------------------------------

test("zodToLines: ZodEnum lists all values", () => {
  const lines = zodToLines(z.enum(["A", "B", "C"]), "code", 0);
  assertEquals(lines.length, 1);
  assertStringIncludes(lines[0], "enum");
  assertStringIncludes(lines[0], "A | B | C");
});

test("zodToLines: ZodNativeEnum with many values truncates after 8", () => {
  enum BigEnum {
    A = "A",
    B = "B",
    C = "C",
    D = "D",
    E = "E",
    F = "F",
    G = "G",
    H = "H",
    I = "I",
    J = "J",
  }
  const lines = zodToLines(z.nativeEnum(BigEnum), "code", 0);
  assertEquals(lines.length, 1);
  assertStringIncludes(lines[0], "...");
});

test("zodToLines: ZodNativeEnum with few values shows all", () => {
  enum Small {
    X = "X",
    Y = "Y",
  }
  const lines = zodToLines(z.nativeEnum(Small), "code", 0);
  assertStringIncludes(lines[0], "X | Y");
  assertEquals(lines[0].includes("..."), false);
});

// ---------------------------------------------------------------------------
// Wrappers: optional, nullable, default
// ---------------------------------------------------------------------------

test("zodToLines: optional appends (optional) to first line", () => {
  const lines = zodToLines(z.string().optional(), "label", 0);
  assertEquals(lines.length, 1);
  assertStringIncludes(lines[0], "(optional)");
  assertStringIncludes(lines[0], "string");
});

test("zodToLines: nullable appends (optional) to first line", () => {
  const lines = zodToLines(z.number().nullable(), "val", 0);
  assertStringIncludes(lines[0], "(optional)");
});

test("zodToLines: default appends (default: ...) to first line", () => {
  const lines = zodToLines(z.boolean().default(false), "flag", 0);
  assertEquals(lines.length, 1);
  assertStringIncludes(lines[0], "(default: false)");
});

// ---------------------------------------------------------------------------
// Literal / union
// ---------------------------------------------------------------------------

test("zodToLines: literal renders value as JSON", () => {
  const lines = zodToLines(z.literal("mef"), "type", 0);
  assertEquals(lines, ['type  "mef"']);
});

test("zodToLines: union renders type names", () => {
  const lines = zodToLines(z.union([z.string(), z.number()]), "val", 0);
  assertEquals(lines.length, 1);
  assertStringIncludes(lines[0], "string");
  assertStringIncludes(lines[0], "number");
});

// ---------------------------------------------------------------------------
// Object
// ---------------------------------------------------------------------------

test("zodToLines: ZodObject at root (no field) expands fields without header", () => {
  const schema = z.object({ a: z.string(), b: z.number() });
  const lines = zodToLines(schema, undefined, 0);
  // No "object" header line — just the two fields
  assertEquals(lines.some((l) => l.trim().startsWith("a")), true);
  assertEquals(lines.some((l) => l.trim().startsWith("b")), true);
  assertEquals(lines.some((l) => l.includes("object")), false);
});

test("zodToLines: ZodObject as a named field emits 'object' header", () => {
  const schema = z.object({ nested: z.object({ x: z.string() }) });
  const lines = zodToLines(schema, undefined, 0);
  assertStringIncludes(lines.join("\n"), "object");
  assertStringIncludes(lines.join("\n"), "x");
});

test("zodToLines: ZodObject nests fields with increased indent", () => {
  const schema = z.object({ inner: z.object({ val: z.number() }) });
  const lines = zodToLines(schema, undefined, 0);
  const valLine = lines.find((l) => l.includes("val"))!;
  // nested field must be indented further than parent
  const innerLine = lines.find((l) => l.includes("inner"))!;
  const innerIndent = innerLine.match(/^(\s*)/)?.[1].length ?? 0;
  const valIndent = valLine.match(/^(\s*)/)?.[1].length ?? 0;
  assertEquals(valIndent > innerIndent, true);
});

// ---------------------------------------------------------------------------
// Array
// ---------------------------------------------------------------------------

test("zodToLines: array of primitives shows 'array'", () => {
  const lines = zodToLines(z.array(z.string()), "tags", 0);
  assertEquals(lines.length, 1);
  assertStringIncludes(lines[0], "array");
  assertEquals(lines[0].includes("items:"), false);
});

test("zodToLines: array with min shows constraint", () => {
  const lines = zodToLines(z.array(z.string()).min(1), "tags", 0);
  assertStringIncludes(lines[0], "min 1");
});

test("zodToLines: array of objects shows 'items:' section", () => {
  const schema = z.array(z.object({ id: z.string(), val: z.number() }));
  const lines = zodToLines(schema, "entries", 0);
  const combined = lines.join("\n");
  assertStringIncludes(combined, "array");
  assertStringIncludes(combined, "items:");
  assertStringIncludes(combined, "id");
  assertStringIncludes(combined, "val");
});

test("zodToLines: array of objects indents item fields under 'items:'", () => {
  const schema = z.array(z.object({ x: z.string() }));
  const lines = zodToLines(schema, "arr", 0);
  const itemsIdx = lines.findIndex((l) => l.includes("items:"));
  const xIdx = lines.findIndex((l) => l.includes("x"));
  assertEquals(xIdx > itemsIdx, true);
  const itemsIndent = lines[itemsIdx].match(/^(\s*)/)?.[1].length ?? 0;
  const xIndent = lines[xIdx].match(/^(\s*)/)?.[1].length ?? 0;
  assertEquals(xIndent > itemsIndent, true);
});

test("zodToLines: array items refined at multiple levels retain their fields", () => {
  const item = z.object({
    for_routing: z.enum(["schedule_c", "schedule_f"]).optional(),
    schedule_c_business_reference: z.string().optional(),
  }).superRefine(() => {}).refine(() => true);
  const schema = z.object({
    f1099necs: z.array(item).min(1).superRefine(() => {}),
  });
  const lines = zodToLines(schema, undefined, 0).join("\n");
  assertStringIncludes(lines, "f1099necs  array (min 1)");
  assertStringIncludes(lines, "items:");
  assertStringIncludes(lines, "for_routing  enum  schedule_c | schedule_f");
  assertStringIncludes(lines, "schedule_c_business_reference  string");
});

// ---------------------------------------------------------------------------
// Indentation
// ---------------------------------------------------------------------------

test("zodToLines: indent=0 produces no leading spaces for field", () => {
  const lines = zodToLines(z.string(), "x", 0);
  assertEquals(lines[0].startsWith("x"), true);
});

test("zodToLines: indent=2 produces 4 leading spaces for field", () => {
  const lines = zodToLines(z.string(), "x", 2);
  assertEquals(lines[0].startsWith("    x"), true);
});
