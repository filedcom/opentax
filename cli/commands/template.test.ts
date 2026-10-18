import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import { z } from "zod";
import { catalog } from "../../catalog.ts";
import {
  enumValues,
  type JsonValue,
  unionChoice,
  unwrap,
} from "../utils/zod-template.ts";
import { getUserInputSchema } from "./form.ts";
import {
  listDocumentsCommand,
  nodeTemplateCommand,
  SOURCE_DOCUMENTS,
} from "./template.ts";

// Strings tried in order for a `<string...>` placeholder; the first the field
// accepts is used. A field none of these fit fails the round-trip test.
const STRING_SAMPLES: readonly string[] = [
  "Sample",
  "123456789",
  "12-3456789",
  "123-45-6789",
  "2025-01-15",
  "2026-01-15",
  "2024-01-15",
  "2025-01-01",
  "2025-07-15",
  "2025-12-31",
  "2017-06-30",
  "2009-06-30",
  "2026-04-15",
  "01/15/2025",
  "--01-15",
  "CA",
  "USA",
  "12345",
  "123",
  "1234",
  "12",
  "123456",
  "1234567890",
  "12345678901",
  "A1B2",
  "A",
  "AB1234567",
  "P12345678",
  "DR-4321-CA",
  "DR-4321",
  "CC12345",
  "M12345",
  "statement.pdf",
  "Transfer Election Statement.pdf",
  "record.json",
  "return.xml",
  "a".repeat(64),
  "1HGCM82633A004352",
  "20250115-123456",
  "25011234-123456",
  "250115-123456",
  "2501123456",
  "1234567890123abcdefg",
  "CA0010012ABCDE",
  "TAAAA12ABCDE",
  "01.5",
  "QUJD",
];

function sampleString(field: z.ZodTypeAny): string {
  const found = STRING_SAMPLES.find((sample) => field.safeParse(sample).success);
  if (found === undefined) {
    throw new Error(`No sample string fits ${JSON.stringify(field._def)}`);
  }
  return found;
}

function isPlaceholder(value: JsonValue): value is string {
  return typeof value === "string" && value.startsWith("<") &&
    value.endsWith(">");
}

/**
 * Replaces each placeholder in a template with a value the field accepts,
 * following the same schema path and union choices the template was built on.
 */
function fillTemplate(
  field: z.ZodTypeAny,
  template: JsonValue,
): JsonValue {
  const schema = unwrap(field);
  if (schema instanceof z.ZodObject && isObject(template)) {
    const shape = schema.shape as Record<string, z.ZodTypeAny>;
    return Object.fromEntries(
      Object.entries(template).map(([key, value]) => {
        const child = shape[key];
        if (!child) throw new Error(`Template field ${key} is not in schema`);
        return [key, fillTemplate(child, value)];
      }),
    );
  }
  if (schema instanceof z.ZodArray && Array.isArray(template)) {
    return template.map((item: JsonValue) =>
      fillTemplate(schema.element, item)
    );
  }
  if (schema instanceof z.ZodTuple && Array.isArray(template)) {
    const items: readonly z.ZodTypeAny[] = schema.items;
    return template.map((item: JsonValue, index: number) =>
      fillTemplate(items[index], item)
    );
  }
  if (
    schema instanceof z.ZodUnion || schema instanceof z.ZodDiscriminatedUnion
  ) {
    return fillTemplate(unionChoice(schema), template);
  }
  if (!isPlaceholder(template)) return template;
  const codes = enumValues(schema);
  if (codes.length > 0) return codes[0];
  if (schema instanceof z.ZodString) return sampleString(field);
  throw new Error(`Placeholder ${template} on a non-string field`);
}

function isObject(
  value: JsonValue,
): value is { readonly [key: string]: JsonValue } {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const ty2025 = catalog["f1040:2025"];
const inputs = [
  ...ty2025.inputNodes.map((entry) => entry.inputKey ?? entry.node.nodeType),
  "start",
];

/** Issues other than cross-field refinements, which a generic sample cannot satisfy. */
function shapeIssues(nodeType: string, full: boolean): string[] {
  const schema = getUserInputSchema(ty2025, nodeType);
  const { data } = nodeTemplateCommand({ nodeType, year: 2025, full });
  const parsed = schema.safeParse(fillTemplate(schema, data));
  return parsed.success ? [] : parsed.error.issues
    .filter((issue) => issue.code !== z.ZodIssueCode.custom)
    .map((issue) => `${nodeType}.${issue.path.join(".")}: ${issue.message}`);
}

test("node template: every TY2025 input's filled template fits its schema", () => {
  assertEquals(inputs.flatMap((nodeType) => shapeIssues(nodeType, false)), []);
});

test("node template --full: every TY2025 input's filled template fits its schema", () => {
  assertEquals(inputs.flatMap((nodeType) => shapeIssues(nodeType, true)), []);
});

test("node template --document: each source document's filled template parses", () => {
  const failures = SOURCE_DOCUMENTS.flatMap(({ document, nodeType }) => {
    const schema = getUserInputSchema(ty2025, nodeType);
    const { data, node_type } = nodeTemplateCommand({
      document,
      year: 2025,
      full: false,
    });
    const parsed = schema.safeParse(fillTemplate(schema, data));
    return node_type === nodeType && parsed.success
      ? []
      : [`${document}: ${parsed.error?.message ?? node_type}`];
  });
  assertEquals(failures, []);
});

test("node template: document map names an input in every year", () => {
  for (const year of [2025, 2026]) {
    const inputs = new Set(
      catalog[`f1040:${year}`]!.inputNodes.map((entry) =>
        entry.inputKey ?? entry.node.nodeType
      ),
    );
    const listing = listDocumentsCommand(year);
    assertEquals(listing.filter((row) => !inputs.has(row.node_type)), []);
    assertEquals(listing.length, SOURCE_DOCUMENTS.length);
  }
});

test("node template: w2 lists required boxes and their descriptions", () => {
  const template = nodeTemplateCommand({
    document: "W2",
    year: 2025,
    full: false,
  });
  assertEquals(template.node_type, "w2");
  assertEquals(template.repeatable, true);
  assertEquals(template.data, { box1_wages: 0, box2_fed_withheld: 0 });
  assertEquals(template._help.box1_wages, "Wages, tips, other compensation");
  assertEquals(template.optional_fields?.includes("box12_entries"), true);
});

test("node template: enum placeholders list their codes", () => {
  const { data } = nodeTemplateCommand({
    nodeType: "f8863",
    year: 2025,
    full: false,
  });
  assertEquals(data, { credit_type: "<aoc | llc>", student_name: "<string>" });
});

test("node template: TY2026 serves every TY2025 document", () => {
  assertEquals(
    nodeTemplateCommand({ document: "1098-t", year: 2026, full: false })
      .node_type,
    "f8863",
  );
  assertEquals(
    nodeTemplateCommand({ nodeType: "schedule_j", year: 2026, full: false })
      .year,
    2026,
  );
});

test("node template: unknown inputs and documents are named", () => {
  assertThrows(
    () => nodeTemplateCommand({ nodeType: "nope", year: 2025, full: false }),
    Error,
    "Unknown input: nope",
  );
  assertThrows(
    () => nodeTemplateCommand({ document: "1099-x", year: 2025, full: false }),
    Error,
    "Unknown document: 1099-x",
  );
});
