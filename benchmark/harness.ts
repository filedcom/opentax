import { join } from "@std/path";
import { z } from "zod";

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
    (lines) => [
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

/** Cases are leaves; an incomplete leaf must never disappear from the report. */
export async function discoverBenchmarkCases(root: string): Promise<string[]> {
  const found: string[] = [];
  async function visit(directory: string): Promise<void> {
    const entries = [];
    for await (const entry of Deno.readDir(directory)) entries.push(entry);
    entries.sort((a, b) => a.name.localeCompare(b.name));
    if (
      entries.some((entry) =>
        entry.name === "input.json" || entry.name === "correct.json"
      )
    ) {
      const input = benchmarkInputSchema.parse(
        JSON.parse(await Deno.readTextFile(join(directory, "input.json"))),
      );
      benchmarkExpectedSchema.parse(
        JSON.parse(await Deno.readTextFile(join(directory, "correct.json"))),
      );
      if (input.forms.length === 0) {
        throw new Error(`Empty benchmark: ${directory}`);
      }
      found.push(directory);
      return;
    }
    const children = entries.filter((entry) => entry.isDirectory);
    if (children.length === 0) {
      throw new Error(`Incomplete benchmark directory: ${directory}`);
    }
    for (const child of children) await visit(join(directory, child.name));
  }
  await visit(root);
  if (found.length === 0) throw new Error(`No benchmark cases: ${root}`);
  return found;
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
