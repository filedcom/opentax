/**
 * TaxCalcBench TY2025 for LLM test takers, with and without the opentax CLI.
 *
 *   bun run bench:llm prepare --out <dir> [--cases ty25-us-001,...]
 *   bun run bench:llm score --out <dir> [--reference]
 *
 * `prepare` writes each case's prompt and an arm-B work dir outside the checkout; answers stay
 * in the fetch cache. The test takers (agents) write `<out>/results/<arm>/<case>.json`. `score`
 * applies the upstream TY25 evaluator: strict is exact equality, lenient is within $5, and a
 * missing or duplicated line reads as 0, as upstream does.
 */
import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { XMLParser } from "fast-xml-parser";
import spec from "../../benchmark/taxcalcbench/spec.json" with { type: "json" };
import { fetchCases } from "../../benchmark/taxcalcbench/fetch.ts";

export type Jurisdiction = keyof typeof spec.jurisdictions;
export type Arm = "a" | "b";
type Field = { label: string; xpath: string };
export type LineResult = {
  label: string;
  expected: number;
  actual: number;
  strict: boolean;
  lenient: boolean;
};
export type CaseScore = {
  strict: boolean;
  lenient: boolean;
  byLine: number;
  byLineLenient: number;
  lines: LineResult[];
};

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ARMS: readonly Arm[] = ["a", "b"];

export function jurisdictionOf(caseName: string): Jurisdiction {
  const j = caseName.split("-")[1];
  if (!(j in spec.jurisdictions)) {
    throw new Error(`unknown jurisdiction in ${caseName}`);
  }
  return j as Jurisdiction;
}

/** Python `float()` on the cleaned string; anything it rejects is 0. */
export function parseMoney(raw: string): number {
  if (raw.trim() === "") return 0;
  let cleaned = raw.replaceAll("$", "").replaceAll(",", "").trim();
  if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
    cleaned = `-${cleaned.slice(1, -1)}`;
  }
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(cleaned)) return 0;
  return Number(cleaned);
}

/** Upstream `parse_generated_scored_value`: exactly one `label | ... | amount` row, else 0. */
export function textValue(text: string, label: string): number {
  const amounts = text.split("\n")
    .map((line) => line.split("|").map((part) => part.trim()))
    .filter((parts) => parts.length >= 3 && parts[0] === label)
    .map((parts) => parts[parts.length - 1]);
  return amounts.length === 1 ? parseMoney(amounts[0]) : 0;
}

export function xmlValue(xml: string, xpath: string): number {
  // Attributes keep their `@` prefix so `.../X/@claimed` resolves like any other step.
  const tree = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@",
    parseTagValue: false,
    parseAttributeValue: false,
    textNodeName: "#text",
  }).parse(xml) as unknown;
  const node = xpath.split("/").filter(Boolean).reduce<unknown>((at, key) => {
    const value = at !== null && typeof at === "object"
      ? (at as Record<string, unknown>)[key]
      : undefined;
    return Array.isArray(value) ? value[0] : value;
  }, tree);
  const text = node !== null && typeof node === "object"
    ? (node as Record<string, unknown>)["#text"]
    : node;
  if (typeof text === "string" || typeof text === "number") {
    return parseMoney(String(text));
  }
  return 0;
}

/** A test taker answers with `{"lines": {label: amount}}` or with the benchmark's text format. */
export function answerValue(answer: string, label: string): number {
  const json = answer.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  try {
    const parsed = JSON.parse(json) as { lines?: Record<string, unknown> };
    const value = parsed.lines?.[label];
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    return typeof value === "string" ? parseMoney(value) : 0;
  } catch {
    return textValue(answer, label);
  }
}

export function scoreCase(
  answer: string,
  expectedXml: string,
  jurisdiction: Jurisdiction,
): CaseScore {
  const fields: Field[] = spec.jurisdictions[jurisdiction].fields;
  const lines = fields.map(({ label, xpath }) => {
    const expected = xmlValue(expectedXml, xpath);
    const actual = answerValue(answer, label);
    return {
      label,
      expected,
      actual,
      strict: actual === expected,
      lenient: Math.abs(actual - expected) <= 5,
    };
  });
  const strictCount = lines.filter((l) => l.strict).length;
  const lenientCount = lines.filter((l) => l.lenient).length;
  return {
    strict: strictCount === lines.length,
    lenient: lenientCount === lines.length,
    byLine: strictCount / lines.length,
    byLineLenient: lenientCount / lines.length,
    lines,
  };
}

/** Upstream `build_ty25_tax_return_prompt`, verbatim. */
export function benchmarkPrompt(
  jurisdiction: Jurisdiction,
  remainingDataJson: string,
  pdfs: string[],
): string {
  const { formName, formInstructions } = spec.jurisdictions[jurisdiction];
  const pdfList = pdfs.map((name) => `- ${name}`).join("\n");
  return `You are helping to test expert tax preparation software. You are given a taxpayer's data and you need to calculate their self-prepared tax return.
Analyze the input data and prepare and calculate a complete tax return including ${formName} and all necessary schedules and forms for the 2025 tax year.

Follow these requirements:
1. Complete ${formName} with all necessary calculations. You should have all of the necessary taxpayer inputs to be able to calculate the return.
2. Complete any required schedules or supporting forms but don't output them. You just need to use them to calculate ${formName}.
3. Only output ${formName} in the format below.
4. Do not output any other introductory text or commentary.
5. You may skip the SSN field.
6. Format the output as follows:

For ${formName}:
\`\`\`
Form [NUMBER]: [NAME]
==================
Line 1: [Description] | [Explanation of calculations, if any] | [Amount]
Line 2: [Description] | [Explanation of calculations, if any] | [Amount]
...
\`\`\`

Be sure to include all of the following lines from ${formName} in this format. If a value does not exist, simply leave it blank.
\`\`\`
${formInstructions}
\`\`\`

The taxpayer data is provided as attached PDFs and remaining_data.json. Together, the attached PDFs and remaining_data.json should have all of the necessary inputs to be able to calculate the tax return.
Read the attached PDFs directly. Do not assume remaining_data.json is complete by itself, and do not ignore facts that only appear in the PDFs.

Attached PDF files:
${pdfList}

remaining_data.json:
\`\`\`json
${remainingDataJson}
\`\`\`

Now please compute the tax return and output as described above. Do not output any other text or commentary:
`;
}

async function pdfText(path: string): Promise<string> {
  const proc = Bun.spawn(["pdftotext", "-layout", path, "-"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const text = await new Response(proc.stdout).text();
  if (await proc.exited !== 0) throw new Error(`pdftotext failed on ${path}`);
  // Column positions say which box an amount sits in, so only trailing padding is dropped.
  return text.replace(/ +$/gm, "").replace(/\n{3,}/g, "\n\n");
}

/** Agents read files rather than attachments, so PDFs travel as pdftotext output after the verbatim prompt. */
async function casePrompt(inputDir: string, caseName: string): Promise<string> {
  const jurisdiction = jurisdictionOf(caseName);
  const pdfs = (await fs.readdir(inputDir)).filter((name) =>
    name.endsWith(".pdf")
  ).sort();
  const remaining = await fs.readFile(
    join(inputDir, "remaining_data.json"),
    "utf8",
  );
  const texts = await Promise.all(
    pdfs.map((name) => pdfText(join(inputDir, name))),
  );
  const attachments = pdfs.map((name, i) =>
    `### ${name}\n\n\`\`\`\n${texts[i]}\n\`\`\``
  ).join("\n\n");
  const keys = spec.jurisdictions[jurisdiction].fields.map((f) =>
    `  ${JSON.stringify(f.label)}: <amount or null>`
  );
  return `${benchmarkPrompt(jurisdiction, remaining, pdfs)}
## Attached PDF contents (text extracted with pdftotext -layout)

${attachments}

## Answer format for this run

Instead of the text format above, return only one JSON object whose keys are exactly these labels and whose values are the dollar amounts as numbers (null when blank):

\`\`\`json
{"lines": {
${keys.join(",\n")}
}}
\`\`\`
`;
}

export function armInstructions(
  arm: Arm,
  promptPath: string,
  workDir: string,
  wrapper: string,
): string {
  const common =
    `Read ${promptPath} in full with the Read tool (in offset/limit chunks if it is long). It is a tax return task; follow it.`;
  if (arm === "a") {
    return `${common} Apart from reading that file, use no tools at all: answer from your own knowledge. Reply with only the JSON object the task asks for.`;
  }
  return `${common} You may use the \`opentax\` CLI via Bash only: run \`${wrapper} --help\` (or \`export PATH=${
    dirname(wrapper)
  }:$PATH; opentax --help\`). opentax is a federal tax engine for tax years 2025 and 2026. Work only inside ${workDir}; it holds the same taxpayer files. Do not read any other files and run no command other than opentax. Reply with only the JSON object the task asks for, then on a last line \`CLI_CALLS: <number of opentax commands you ran>\`.`;
}

async function buildBinary(out: string): Promise<string> {
  const bin = join(out, "bin", "opentax-bin");
  await fs.mkdir(dirname(bin), { recursive: true });
  const proc = Bun.spawn([
    "bun",
    "build",
    join(ROOT, "cli/main.ts"),
    "--compile",
    "--outfile",
    bin,
  ], {
    cwd: ROOT,
    stdout: "ignore",
    stderr: "inherit",
  });
  if (await proc.exited !== 0) throw new Error("opentax compile failed");
  return bin;
}

function flag(args: readonly string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

async function prepare(
  out: string,
  cases: string[],
  testData: string,
): Promise<void> {
  if (out.startsWith(ROOT)) {
    throw new Error(
      "--out must be outside the checkout so agents never see the repository",
    );
  }
  const bin = await buildBinary(out);
  const manifest = await Promise.all(cases.map(async (caseName) => {
    const inputDir = join(testData, caseName, "input");
    const prompt = await casePrompt(inputDir, caseName);
    const caseDir = join(out, "cases", caseName);
    const work = join(caseDir, "b", "work");
    const home = join(caseDir, "b", "home");
    const wrapper = join(caseDir, "b", "bin", "opentax");
    await fs.mkdir(join(caseDir, "a"), { recursive: true });
    await fs.mkdir(dirname(wrapper), { recursive: true });
    await fs.mkdir(home, { recursive: true });
    await fs.cp(inputDir, work, { recursive: true });
    await fs.writeFile(join(caseDir, "a", "prompt.md"), prompt);
    await fs.writeFile(join(work, "prompt.md"), prompt);
    // Return state lives in the cwd's .state, so every call runs in this case's work dir.
    await fs.writeFile(
      wrapper,
      `#!/bin/sh\ncd '${work}' && HOME='${home}' exec '${bin}' "$@"\n`,
      { mode: 0o755 },
    );
    return {
      case: caseName,
      a: armInstructions(
        "a",
        join(caseDir, "a", "prompt.md"),
        join(caseDir, "a"),
        wrapper,
      ),
      b: armInstructions("b", join(work, "prompt.md"), work, wrapper),
    };
  }));
  for (const arm of ARMS) {
    await fs.mkdir(join(out, "results", arm), { recursive: true });
  }
  await fs.writeFile(
    join(out, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  console.log(`prepared ${manifest.length} cases in ${out}`);
}

type Meta = { cliCalls?: number; errors?: string[]; excluded?: string };
type Row = { case: string; arm: string; score: CaseScore | null; meta: Meta };

const pct = (
  n: number,
  d: number,
) => (d === 0 ? "n/a" : `${((100 * n) / d).toFixed(2)}%`);

function summarize(rows: Row[], arm: string): string {
  const scored = rows.filter((r) =>
    r.arm === arm && r.score !== null && !r.meta.excluded
  );
  const s = scored.map((r) => r.score as CaseScore);
  const mean = (
    xs: number[],
  ) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);
  return `| ${arm} | ${s.length} | ${
    pct(s.filter((x) => x.strict).length, s.length)
  } | ${pct(s.filter((x) => x.lenient).length, s.length)} | ${
    (100 * mean(s.map((x) => x.byLine))).toFixed(2)
  }% | ${(100 * mean(s.map((x) => x.byLineLenient))).toFixed(2)}% |`;
}

async function score(
  out: string,
  testData: string,
  reference: boolean,
): Promise<void> {
  const rows: Row[] = [];
  const arms = reference ? ["reference"] : [...ARMS];
  for (const arm of arms) {
    const dir = reference ? testData : join(out, "results", arm);
    const cases = reference
      ? (await fs.readdir(testData)).sort()
      : (await fs.readdir(dir)).filter((f) =>
        f.endsWith(".json") && !f.endsWith(".meta.json")
      ).map((f) => basename(f, ".json")).sort();
    for (const caseName of cases) {
      const answerPath = reference
        ? join(
          testData,
          "../results",
          caseName,
          "anthropic/claude-opus-5-5/model_completed_return_ultrathink_1.md",
        )
        : join(dir, `${caseName}.json`);
      const metaPath = join(dir, `${caseName}.meta.json`);
      const meta = !reference && existsSync(metaPath)
        ? JSON.parse(await fs.readFile(metaPath, "utf8")) as Meta
        : {};
      if (!existsSync(answerPath)) {
        rows.push({
          case: caseName,
          arm,
          score: null,
          meta: { ...meta, errors: [...(meta.errors ?? []), "no answer"] },
        });
        continue;
      }
      const expected = await fs.readFile(
        join(testData, caseName, "output.xml"),
        "utf8",
      );
      rows.push({
        case: caseName,
        arm,
        score: scoreCase(
          await fs.readFile(answerPath, "utf8"),
          expected,
          jurisdictionOf(caseName),
        ),
        meta,
      });
    }
  }
  const head =
    "| arm | cases | correct returns (strict) | correct returns (lenient) | by line | by line (lenient) |\n|---|---|---|---|---|---|";
  const groups = (pred: (c: string) => boolean, title: string) =>
    `### ${title}\n\n${head}\n${
      arms.map((arm) => summarize(rows.filter((r) => pred(r.case)), arm)).join(
        "\n",
      )
    }\n`;
  const table = rows.map((r) =>
    `| ${r.case} | ${r.arm} | ${
      r.score ? (r.score.strict ? "yes" : "no") : "-"
    } | ${r.score ? (r.score.lenient ? "yes" : "no") : "-"} | ${
      r.score ? `${(100 * r.score.byLine).toFixed(1)}%` : "-"
    } | ${r.meta.cliCalls ?? ""} | ${r.meta.excluded ?? ""} | ${
      (r.score?.lines ?? []).filter((l) => !l.lenient).map((l) =>
        `${l.label.split(":")[0]} exp ${l.expected} got ${l.actual}`
      ).join("; ")
    } ${(r.meta.errors ?? []).join("; ")} |`
  );
  const report = [
    groups(() => true, "All cases"),
    groups((c) => c.includes("-us-"), "Federal (us) cases"),
    groups((c) => !c.includes("-us-"), "State cases"),
    "### Per case\n\n| case | arm | strict | lenient | by line | CLI calls | excluded | lines off by more than $5 / errors |\n|---|---|---|---|---|---|---|---|",
    ...table,
  ].join("\n");
  await fs.mkdir(out, { recursive: true });
  const name = reference ? "score-reference" : "score";
  await fs.writeFile(
    join(out, `${name}.json`),
    `${JSON.stringify(rows, null, 2)}\n`,
  );
  await fs.writeFile(join(out, `${name}.md`), `${report}\n`);
  console.log(report);
}

export async function main(args: string[]): Promise<number> {
  const [command] = args;
  const out = flag(args, "--out");
  if (!out || !["prepare", "score"].includes(command)) {
    console.error(
      "usage: bench:llm prepare|score --out <dir> [--cases a,b] [--reference]",
    );
    return 2;
  }
  const testData = await fetchCases();
  const all = (await fs.readdir(testData)).sort();
  const cases = flag(args, "--cases")?.split(",") ?? all;
  const unknown = cases.filter((c) => !all.includes(c));
  if (unknown.length > 0) {
    throw new Error(`unknown cases: ${unknown.join(", ")}`);
  }
  if (command === "prepare") await prepare(resolve(out), cases, testData);
  else await score(resolve(out), testData, args.includes("--reference"));
  return 0;
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)));
