import { z } from "zod";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export type TemplateOptions = { readonly full: boolean };

export type Template = {
  readonly value: JsonValue;
  readonly help: Readonly<Record<string, string>>;
  /** Optional fields left out of `value`; `full` includes them. */
  readonly optional: readonly string[];
};

const MAX_DEPTH = 24;

/** Strips wrappers that change neither the JSON shape nor the field's type. */
export function unwrap(schema: z.ZodTypeAny): z.ZodTypeAny {
  const inner = unwrapOnce(schema);
  return inner === schema ? schema : unwrap(inner);
}

/** The first description found on the field or a wrapper inside it. */
function description(schema: z.ZodTypeAny): string | undefined {
  if (schema.description) return schema.description;
  const inner = unwrapOnce(schema);
  return inner === schema ? undefined : description(inner);
}

function unwrapOnce(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (
    schema instanceof z.ZodOptional || schema instanceof z.ZodNullable ||
    schema instanceof z.ZodBranded || schema instanceof z.ZodReadonly
  ) return schema.unwrap();
  if (schema instanceof z.ZodDefault) return schema.removeDefault();
  if (schema instanceof z.ZodCatch) return schema.removeCatch();
  if (schema instanceof z.ZodEffects) return schema.innerType();
  if (schema instanceof z.ZodPipeline) return schema._def.in;
  if (schema instanceof z.ZodLazy) return schema.schema;
  return schema;
}

export function enumValues(schema: z.ZodTypeAny): readonly (string | number)[] {
  if (schema instanceof z.ZodEnum) return schema.options;
  if (schema instanceof z.ZodNativeEnum) {
    const values: Record<string, string | number> = schema.enum;
    // A numeric enum also maps each number back to its name.
    return Object.entries(values).filter(([key]) =>
      typeof values[values[key]] !== "number"
    ).map(([, value]) => value);
  }
  return [];
}

/** The union option a template shows: the first that is not null. */
export function unionChoice(
  schema: z.ZodUnion<z.ZodUnionOptions> | z.ZodDiscriminatedUnion<
    string,
    z.ZodDiscriminatedUnionOption<string>[]
  >,
): z.ZodTypeAny {
  const options: readonly z.ZodTypeAny[] = schema.options;
  return options.find((option) => !(unwrap(option) instanceof z.ZodNull)) ??
    options[0];
}

function stringPlaceholder(schema: z.ZodString): string {
  const hints = schema._def.checks.flatMap((check) => {
    if (check.kind === "date") return ["YYYY-MM-DD"];
    if (check.kind === "regex") return [`matching ${check.regex.source}`];
    if (check.kind === "length") return [`${check.value} characters`];
    if (check.kind === "max") return [`max ${check.value} characters`];
    if (check.kind === "email" || check.kind === "url") return [check.kind];
    return [];
  });
  return `<string${hints.length ? ", " + hints.join(", ") : ""}>`;
}

/** Zero, or the nearest simple value the number's bounds allow. */
function numberPlaceholder(schema: z.ZodNumber): number {
  const bounds = schema._def.checks.reduce(
    (range, check) => {
      if (check.kind === "min" && check.value >= range.lo) {
        const inclusive = check.value === range.lo
          ? range.loInclusive && check.inclusive
          : check.inclusive;
        return { ...range, lo: check.value, loInclusive: inclusive };
      }
      if (check.kind === "max" && check.value <= range.hi) {
        const inclusive = check.value === range.hi
          ? range.hiInclusive && check.inclusive
          : check.inclusive;
        return { ...range, hi: check.value, hiInclusive: inclusive };
      }
      return range;
    },
    { lo: -Infinity, loInclusive: true, hi: Infinity, hiInclusive: true },
  );
  const { lo, loInclusive, hi, hiInclusive } = bounds;
  const fits = (value: number) =>
    Number.isFinite(value) &&
    (value > lo || (loInclusive && value === lo)) &&
    (value < hi || (hiInclusive && value === hi)) &&
    (!schema.isInt || Number.isInteger(value));
  return [0, lo, Math.floor(lo) + 1, (lo + hi) / 2, hi, Math.ceil(hi) - 1]
    .find(fits) ?? 0;
}

type Walk = {
  readonly options: TemplateOptions;
  readonly help: Record<string, string>;
  readonly optional: string[];
};

function note(walk: Walk, path: string, text: string | undefined): void {
  if (!text || !path) return;
  walk.help[path] = walk.help[path] ? `${walk.help[path]}; ${text}` : text;
}

function objectTemplate(
  schema: z.ZodObject<z.ZodRawShape>,
  path: string,
  walk: Walk,
  depth: number,
): JsonValue {
  const fields = Object.entries(schema.shape as Record<string, z.ZodTypeAny>)
    .filter(([, field]) => !(unwrap(field) instanceof z.ZodNever))
    .map(([key, field]) => [key, field, path ? `${path}.${key}` : key] as const);
  const shown = fields.filter(([, field]) =>
    walk.options.full || !field.isOptional()
  );
  walk.optional.push(
    ...fields.filter((row) => !shown.includes(row)).map(([, , at]) => at),
  );
  return Object.fromEntries(shown.map(([key, field, at]) => {
    note(walk, at, description(field));
    return [key, valueTemplate(field, at, walk, depth + 1)];
  }));
}

function valueTemplate(
  field: z.ZodTypeAny,
  path: string,
  walk: Walk,
  depth: number,
): JsonValue {
  const schema = unwrap(field);
  if (depth > MAX_DEPTH) return null;
  if (schema instanceof z.ZodObject) {
    return objectTemplate(schema, path, walk, depth);
  }
  if (schema instanceof z.ZodArray) {
    const length = schema._def.exactLength?.value ??
      Math.max(1, schema._def.minLength?.value ?? 0);
    const item = valueTemplate(schema.element, `${path}[]`, walk, depth + 1);
    return Array.from({ length }, () => item);
  }
  if (schema instanceof z.ZodTuple) {
    const items: readonly z.ZodTypeAny[] = schema.items;
    return items.map((item, index) =>
      valueTemplate(item, `${path}[${index}]`, walk, depth + 1)
    );
  }
  if (schema instanceof z.ZodDiscriminatedUnion) {
    const options: readonly z.ZodDiscriminatedUnionOption<string>[] =
      schema.options;
    const key: string = schema.discriminator;
    const choices = options.flatMap((option) => {
      const value: z.ZodTypeAny | undefined = option.shape[key];
      return value instanceof z.ZodLiteral ? [String(value.value)] : [];
    });
    note(
      walk,
      path,
      `one of ${key}: ${choices.join(" | ")}; fields differ by ${key}`,
    );
    return valueTemplate(unionChoice(schema), path, walk, depth);
  }
  if (schema instanceof z.ZodUnion) {
    const options: readonly z.ZodTypeAny[] = schema.options;
    if (options.length > 1) {
      note(walk, path, `one of ${options.length} shapes; the first is shown`);
    }
    return valueTemplate(unionChoice(schema), path, walk, depth);
  }
  if (schema instanceof z.ZodRecord) {
    note(walk, path, "object keyed by name");
    return {};
  }
  if (schema instanceof z.ZodLiteral) {
    const value: unknown = schema.value;
    return typeof value === "string" || typeof value === "number" ||
        typeof value === "boolean" || value === null
      ? value
      : null;
  }
  const codes = enumValues(schema);
  if (codes.length === 1) return codes[0];
  if (codes.length > 1) return `<${codes.join(" | ")}>`;
  if (schema instanceof z.ZodString) return stringPlaceholder(schema);
  if (schema instanceof z.ZodNumber) return numberPlaceholder(schema);
  if (schema instanceof z.ZodBoolean) return false;
  return null;
}

/**
 * A JSON skeleton of what the schema accepts: placeholders of each field's
 * type, enum codes listed in `<a | b>` strings, one element per array, and
 * optional fields only with `full`. `help` maps dotted paths to descriptions.
 */
export function zodTemplate(
  schema: z.ZodTypeAny,
  options: TemplateOptions,
): Template {
  const walk: Walk = { options, help: {}, optional: [] };
  const value = valueTemplate(schema, "", walk, 0);
  return { value, help: walk.help, optional: walk.optional };
}
