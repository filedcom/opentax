import type { ZodTypeAny } from "zod";

type ZodDef = Record<string, unknown>;

function def(schema: ZodTypeAny): ZodDef {
  return (schema as unknown as { _def: ZodDef })._def;
}

function typeName(schema: ZodTypeAny): string {
  return def(schema).typeName as string;
}

function desc(schema: ZodTypeAny): string {
  const d = def(schema).description;
  return typeof d === "string" && d.length > 0 ? `  — ${d}` : "";
}

/**
 * Recursively converts a Zod schema into human-readable lines for CLI display.
 * Fields annotated with .describe("...") show their description inline.
 *
 * @param schema  - The Zod schema to introspect
 * @param field   - Field name label (undefined at root level)
 * @param indent  - Current indentation level (2 spaces per level)
 */
export function zodToLines(
  schema: ZodTypeAny,
  field: string | undefined,
  indent: number,
): string[] {
  const pad = "  ".repeat(indent);
  const tn = typeName(schema);

  // Transparent wrappers — unwrap and annotate
  if (tn === "ZodOptional" || tn === "ZodNullable") {
    const outerDesc = desc(schema);
    const lines = zodToLines(
      def(schema).innerType as ZodTypeAny,
      field,
      indent,
    );
    if (lines.length > 0) {
      if (outerDesc) lines[0] += outerDesc;
      lines[0] += "  (optional)";
    }
    return lines;
  }

  if (tn === "ZodDefault") {
    const outerDesc = desc(schema);
    const lines = zodToLines(
      def(schema).innerType as ZodTypeAny,
      field,
      indent,
    );
    const defaultVal = (def(schema).defaultValue as () => unknown)();
    if (lines.length > 0) {
      if (outerDesc) lines[0] += outerDesc;
      lines[0] += `  (default: ${JSON.stringify(defaultVal)})`;
    }
    return lines;
  }

  if (tn === "ZodEffects") {
    return zodToLines(def(schema).schema as ZodTypeAny, field, indent);
  }

  const prefix = field ? `${pad}${field}  ` : pad;
  const d = desc(schema);

  if (tn === "ZodString") return [`${prefix}string${d}`];
  if (tn === "ZodBoolean") return [`${prefix}boolean${d}`];

  if (tn === "ZodNumber") {
    const checks = (def(schema).checks as Array<{ kind: string; value: number }>) ?? [];
    const min = checks.find((c) => c.kind === "min");
    const max = checks.find((c) => c.kind === "max");
    const parts = [min ? `≥${min.value}` : "", max ? `≤${max.value}` : ""].filter(
      Boolean,
    );
    return [`${prefix}number${parts.length ? "  " + parts.join("  ") : ""}${d}`];
  }

  if (tn === "ZodEnum") {
    const values = def(schema).values as string[];
    return [`${prefix}enum  ${values.join(" | ")}${d}`];
  }

  if (tn === "ZodNativeEnum") {
    const raw = def(schema).values as Record<string, unknown>;
    const values = Object.values(raw).filter((v): v is string => typeof v === "string");
    const display =
      values.length > 8
        ? `${values.slice(0, 8).join(" | ")} | ...`
        : values.join(" | ");
    return [`${prefix}enum  ${display}${d}`];
  }

  if (tn === "ZodLiteral") {
    return [`${prefix}${JSON.stringify(def(schema).value)}${d}`];
  }

  if (tn === "ZodUnion") {
    const options = def(schema).options as ZodTypeAny[];
    const names = options.map((o) => typeName(o).replace("Zod", "").toLowerCase());
    return [`${prefix}${names.join(" | ")}${d}`];
  }

  if (tn === "ZodObject") {
    const lines: string[] = [];
    if (field) lines.push(`${prefix}object${d}`);
    const shape = (def(schema).shape as () => Record<string, ZodTypeAny>)();
    const nextIndent = indent + (field ? 1 : 0);
    for (const [key, val] of Object.entries(shape)) {
      lines.push(...zodToLines(val, key, nextIndent));
    }
    return lines;
  }

  if (tn === "ZodArray") {
    const inner = def(schema).type as ZodTypeAny;
    const minLen = (def(schema).minLength as { value: number } | null)?.value;
    const constraints = minLen != null ? ` (min ${minLen})` : "";
    const lines: string[] = [`${prefix}array${constraints}${d}`];
    if (typeName(inner) === "ZodObject") {
      lines.push(`${"  ".repeat(indent + 1)}items:`);
      const shape = (def(inner).shape as () => Record<string, ZodTypeAny>)();
      for (const [key, val] of Object.entries(shape)) {
        lines.push(...zodToLines(val, key, indent + 2));
      }
    }
    return lines;
  }

  // Fallback for unhandled types (ZodAny, ZodUnknown, etc.)
  return [`${prefix}${tn.replace("Zod", "").toLowerCase()}${d}`];
}
