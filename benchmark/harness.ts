import { basename, dirname, join, relative } from "@std/path";
import { z } from "zod";
import { catalog } from "../catalog.ts";
import type { FormDefinition } from "../core/types/form-definition.ts";
import {
  getUserInputSchema,
  rejectUnknownFields,
} from "../cli/commands/form.ts";

export const benchmarkInputSchema = z.object({
  year: z.number().int(),
  scenario: z.string().optional(),
  forms: z.array(z.object({
    node_type: z.string().min(1),
    data: z.record(z.unknown()),
  })).min(1),
});
const requiredValues = z.object({
  line24_total_tax: z.number().finite(),
  line35a_refund: z.number().finite(),
  line37_amount_owed: z.number().finite(),
}).catchall(z.number().finite());
export const benchmarkExpectedSchema = z.union([
  z.object({ correct: requiredValues }).passthrough(),
  requiredValues,
]).transform((value) =>
  requiredValues.parse("correct" in value ? value.correct : value)
);

/** A conditional calculation is not a passing, source-backed oracle. */
export function benchmarkSourceIssues(
  fixture: Record<string, unknown>,
): string[] {
  if (fixture.reconciliation === undefined) return [];
  const review = z.object({
    source_limitations: z.array(z.string().min(1)),
  }).parse(fixture.reconciliation);
  return review.source_limitations.map((issue) =>
    `Unresolved fixture source: ${issue}`
  );
}

export const createdReturnSchema = z.object({ returnId: z.string().min(1) });
const financialLine = z.union([
  z.number().finite(),
  z.array(z.number().finite()).min(1),
]);
export const benchmarkReturnSchema = z.object({
  returnId: z.string().min(1),
  year: z.number().int(),
  forms: z.array(z.string()).refine(
    (forms) => forms.includes("f1040"),
    "Computed f1040 node is required",
  ),
  summary: z.object({
    line11_agi: z.number().finite(),
    line15_taxable_income: z.number().finite(),
    line24_total_tax: z.number().finite(),
    line33_total_payments: z.number().finite(),
    line35a_refund: z.number().finite().optional(),
    line37_amount_owed: z.number().finite().optional(),
  }).passthrough(),
  lines: z.object({
    line11_agi: financialLine.optional(),
    line15_taxable_income: financialLine.optional(),
    line24_total_tax: financialLine.optional(),
    line33_total_payments: financialLine.optional(),
    line35a_refund: financialLine.optional(),
    line37_amount_owed: financialLine.optional(),
  }).passthrough().refine(
    (lines) =>
      [
        lines.line11_agi,
        lines.line15_taxable_income,
        lines.line24_total_tax,
        lines.line33_total_payments,
        lines.line35a_refund,
        lines.line37_amount_owed,
      ].some((value) => value !== undefined),
    "Computed f1040 lines are required",
  ),
  warnings: z.array(z.string()),
});

type BenchmarkInput = z.infer<typeof benchmarkInputSchema>;

/** A case lives at <form>/<year>/<case>; the product it exercises is read from that path. */
export function caseProduct(
  directory: string,
): { form: string; year: number } | undefined {
  const year = basename(dirname(directory));
  const form = basename(dirname(dirname(directory)));
  if (!/^f\w+$/.test(form) || !/^\d{4}$/.test(year)) return undefined;
  return { form, year: Number(year) };
}

/** Each form entry must be an input the CLI accepts, shaped as its schema says. */
export function validateCaseInputs(
  input: BenchmarkInput,
  definition: FormDefinition,
  label: string,
): void {
  for (const form of input.forms) {
    let schema: z.ZodTypeAny;
    try {
      schema = getUserInputSchema(definition, form.node_type);
    } catch (error) {
      throw new Error(`${label}: ${(error as Error).message}`);
    }
    try {
      rejectUnknownFields(schema, form.data);
    } catch (error) {
      throw new Error(
        `${label}: ${form.node_type}: ${(error as Error).message}`,
      );
    }
    const parsed = schema.safeParse(form.data);
    if (parsed.success) continue;
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "data"}: ${issue.message}`)
      .join("; ");
    throw new Error(`${label}: ${form.node_type}: ${issues}`);
  }
}

// A citation that names the engine or its output is not an independent source.
export const ENGINE_SOURCE =
  /\b(engine|output\.json|gen_correct|tax2025\.ts|reference calculator)\b/i;

/** A source, when given, cites a publication; it never cites the engine. */
export function validateCaseSource(expected: unknown, label: string): void {
  if (!expected || typeof expected !== "object") return;
  const sources = [
    (expected as { source?: unknown }).source,
    ...([] as unknown[]).concat(
      (expected as { sources?: unknown }).sources ?? [],
    ),
  ].filter((source) => source !== undefined);
  for (const source of sources) {
    if (typeof source !== "string" || !source.trim()) {
      throw new Error(`${label}: source must be a non-empty citation`);
    }
    if (ENGINE_SOURCE.test(source)) {
      throw new Error(
        `${label}: source cites the engine, not a publication: ${source}`,
      );
    }
  }
}

function describe(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues
      .map((issue) => `${issue.path.join(".") || "value"}: ${issue.message}`)
      .join("; ");
  }
  return error instanceof Error ? error.message : String(error);
}

async function parseFile<T>(
  directory: string,
  name: string,
  schema: z.ZodType<T>,
): Promise<{ raw: unknown; parsed: T }> {
  const raw = JSON.parse(await Deno.readTextFile(join(directory, name)));
  try {
    return { raw, parsed: schema.parse(raw) };
  } catch (error) {
    throw new Error(`${directory}: ${name}: ${describe(error)}`);
  }
}

/** One case: files parse, the product exists, inputs fit their schemas, the source is a publication. */
export async function validateCase(
  directory: string,
  products: Readonly<Record<string, FormDefinition>>,
): Promise<void> {
  const { parsed: input } = await parseFile(
    directory,
    "input.json",
    benchmarkInputSchema,
  );
  const { raw: expected } = await parseFile(
    directory,
    "correct.json",
    benchmarkExpectedSchema,
  );
  const product = caseProduct(directory);
  if (!product || product.year !== input.year) {
    throw new Error(
      `${directory}: must live at <form>/<year>/<case> with a matching year`,
    );
  }
  const key = `${product.form}:${product.year}`;
  const definition = products[key];
  if (!definition) {
    throw new Error(`${directory}: unsupported benchmark product ${key}`);
  }
  validateCaseInputs(input, definition, directory);
  validateCaseSource(expected, directory);
}

export type CaseProblem = {
  readonly directory: string;
  readonly message: string;
};
export type CaseInspection = {
  readonly found: readonly string[];
  readonly problems: readonly CaseProblem[];
};

/** Cases are leaves; an incomplete leaf must never disappear from the report. */
export async function inspectBenchmarkCases(
  root: string,
  products: Readonly<Record<string, FormDefinition>> = catalog,
): Promise<CaseInspection> {
  const found: string[] = [];
  const problems: CaseProblem[] = [];
  async function visit(directory: string): Promise<void> {
    const entries = [];
    for await (const entry of Deno.readDir(directory)) entries.push(entry);
    entries.sort((a, b) => a.name.localeCompare(b.name));
    if (
      entries.some((entry) =>
        entry.name === "input.json" || entry.name === "correct.json"
      )
    ) {
      try {
        await validateCase(directory, products);
        found.push(directory);
      } catch (error) {
        problems.push({ directory, message: describe(error) });
      }
      return;
    }
    const children = entries.filter((entry) => entry.isDirectory);
    if (children.length === 0) {
      throw new Error(`Incomplete benchmark directory: ${directory}`);
    }
    for (const child of children) await visit(join(directory, child.name));
  }
  await visit(root);
  return { found, problems };
}

export async function discoverBenchmarkCases(
  root: string,
  products: Readonly<Record<string, FormDefinition>> = catalog,
): Promise<string[]> {
  const { found, problems } = await inspectBenchmarkCases(root, products);
  if (problems.length > 0) {
    throw new Error(
      `${problems.length} invalid benchmark case${
        problems.length === 1 ? "" : "s"
      }:\n${problems.map((problem) => problem.message).join("\n")}`,
    );
  }
  if (found.length === 0) throw new Error(`No benchmark cases: ${root}`);
  return [...found];
}

export const CASE_BASELINE_PATH = "benchmark/cases/baseline.json";
const caseBaselineEntrySchema = z.object({
  /** <form>/<year>/<case>, relative to benchmark/cases. */
  case: z.string().min(1),
  reason: z.string().min(1),
  expires: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD"),
  approvedBy: z.string().min(1),
});
export const caseBaselineSchema = z.array(caseBaselineEntrySchema);
export type CaseBaseline = z.infer<typeof caseBaselineSchema>;

export async function readCaseBaseline(repo: string): Promise<CaseBaseline> {
  try {
    return caseBaselineSchema.parse(
      JSON.parse(await Deno.readTextFile(join(repo, CASE_BASELINE_PATH))),
    );
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return [];
    throw error;
  }
}

/** Known-invalid cases are allowed with a reason and an expiry; new ones fail. */
export function applyCaseBaseline(
  root: string,
  problems: readonly CaseProblem[],
  baseline: CaseBaseline,
  today: string,
): { readonly open: readonly CaseProblem[]; readonly allowed: number } {
  const name = (directory: string) => relative(root, directory);
  const open = problems.flatMap((problem) => {
    const entry = baseline.find((candidate) =>
      candidate.case === name(problem.directory)
    );
    if (!entry) return [problem];
    if (entry.expires < today) {
      return [{
        ...problem,
        message:
          `${problem.message}\n  baseline exception expired on ${entry.expires}; fix the case or renew the entry in ${CASE_BASELINE_PATH}`,
      }];
    }
    return [];
  });
  const stale = baseline
    .filter((entry) =>
      !problems.some((problem) => name(problem.directory) === entry.case)
    )
    .map((entry) => ({
      directory: join(root, entry.case),
      message:
        `${entry.case}: baseline entry no longer matches an invalid case; remove it from ${CASE_BASELINE_PATH}`,
    }));
  return { open: [...open, ...stale], allowed: baseline.length - stale.length };
}

export function checkedCommandOutput(
  result: Deno.CommandOutput,
  label: string,
): string {
  if (!result.success || result.code !== 0) {
    throw new Error(
      `${label} exited ${result.code}: ${
        new TextDecoder().decode(result.stderr)
      }`,
    );
  }
  return new TextDecoder().decode(result.stdout);
}

export async function benchmarkTax(
  taxDirectory: string,
  args: string[],
): Promise<string> {
  const result = await new Deno.Command("deno", {
    args: [
      "run",
      "--allow-read",
      "--allow-write",
      join(taxDirectory, "cli/main.ts"),
      ...args,
    ],
    stdout: "piped",
    stderr: "piped",
  }).output();
  return checkedCommandOutput(result, `tax ${args.slice(0, 2).join(" ")}`);
}

export function benchmarkExitCode(total: number, failed: number): number {
  return total > 0 && failed === 0 ? 0 : 1;
}
