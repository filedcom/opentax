#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * IRS MeF Business Rules CSV → TypeScript rule files generator.
 *
 * Reads the official IRS business rules CSV and generates:
 *   forms/f1040/validation/rules/<prefix>.ts — one file per form prefix
 *   forms/f1040/validation/rules/index.ts    — registry importing all
 *
 * For recognizable patterns (~60% of rules), auto-generates the
 * predicate DSL check function. Complex rules get check: null (stub).
 *
 * Usage: deno run --allow-read --allow-write scripts/parse-rules.ts
 */

import { parse } from "jsr:@std/csv@1/parse";

const CSV_PATH = new URL(
  "../.research/docs/IMF_Series_2025v3.0/1040x_2025v3.0/business_rules/1040_Business_Rules_2025v3.0.csv",
  import.meta.url,
);
const RULES_DIR = new URL(
  "../forms/f1040/validation/rules/",
  import.meta.url,
);

// ─── Types ──────────────────────────────────────────────

interface CsvRule {
  ruleNumber: string;
  ruleText: string;
  errorCategory: string;
  severity: string;
  ruleStatus: string;
}

interface GeneratedRule {
  ruleNumber: string;
  ruleText: string;
  severity: string;
  category: string;
  checkCode: string | null; // null = stub
}

// ─── CSV Parsing ────────────────────────────────────────

async function loadRules(): Promise<CsvRule[]> {
  const raw = await Deno.readFile(new URL(CSV_PATH));
  // CSV is latin-1 encoded
  const text = new TextDecoder("latin1").decode(raw);
  const rows = parse(text, { skipFirstRow: true });

  return (rows as Record<string, string>[]).map((row) => ({
    ruleNumber: (row["Rule Number"] ?? "").trim(),
    ruleText: (row["Rule Text"] ?? "").trim(),
    errorCategory: (row["Error Category"] ?? "").trim(),
    severity: (row["Severity"] ?? "").trim(),
    ruleStatus: (row["Rule Status"] ?? "").trim(),
  }));
}

function isActive(r: CsvRule): boolean {
  return ["Active", "New", "Reactivated", "Verbiage Change"].includes(r.ruleStatus);
}

function getPrefix(ruleNumber: string): string {
  const dash = ruleNumber.indexOf("-");
  return dash === -1 ? ruleNumber : ruleNumber.slice(0, dash);
}

// ─── Severity / Category Mapping ────────────────────────

function mapSeverity(csv: string): string {
  const m: Record<string, string> = {
    "Reject": "reject",
    "Reject and Stop": "reject_and_stop",
    "Alert": "alert",
  };
  return m[csv] ?? "reject";
}

function mapCategory(csv: string): string {
  const m: Record<string, string> = {
    "Missing Data": "missing_data",
    "Incorrect Data": "incorrect_data",
    "Data Mismatch": "data_mismatch",
    "Math Error": "math_error",
    "Missing Document": "missing_document",
    "Unsupported": "unsupported",
    "Multiple Documents": "multiple_documents",
    "Information Message": "information",
    "Database Validation Error": "database",
    "Duplicate Condition": "duplicate",
    "XML Error": "xml_error",
  };
  return m[csv] ?? "incorrect_data";
}

// ─── Pattern-Based Auto-Generation ──────────────────────

/** Extract XML element names from single-quoted strings in rule text. */
function extractXmlNames(text: string): string[] {
  const matches = text.match(/'([A-Z][A-Za-z0-9]+)'/g);
  if (!matches) return [];
  return matches.map((m) => m.slice(1, -1));
}

/**
 * Attempt to auto-generate a check predicate from rule text patterns.
 * Returns DSL code string or null if pattern not recognized.
 */
function autoGenerate(r: CsvRule): string | null {
  const text = r.ruleText;
  const names = extractXmlNames(text);

  // Server-side only — always pass
  if (r.errorCategory === "Database Validation Error" || r.errorCategory === "Duplicate Condition") {
    return "alwaysPass"; // can't check client-side
  }

  // Simple "must have a value" (non-conditional)
  if (!text.toLowerCase().startsWith("if ") && names.length === 1) {
    if (/must have a (non-zero )?value/i.test(text)) {
      return text.includes("non-zero")
        ? `hasNonZero("${names[0]}")`
        : `hasValue("${names[0]}")`;
    }
  }

  // "Form X must be present"
  const formPresentMatch = text.match(/then (Form \d+|Schedule [A-Z0-9]+|IRS\w+) .*must be present/i);
  if (formPresentMatch && names.length >= 1) {
    // Can't auto-resolve form ID mapping reliably — stub it
    return null;
  }

  // "If [field] has a value, then [field] must have a value" (conditional required)
  if (text.toLowerCase().startsWith("if ") && names.length === 2) {
    const lower = text.toLowerCase();
    if (lower.includes("has a value") && lower.includes("must have a value")) {
      return `ifThen(hasValue("${names[0]}"), hasValue("${names[1]}"))`;
    }
    if (lower.includes("has a non-zero value") && lower.includes("must have a value")) {
      return `ifThen(hasNonZero("${names[0]}"), hasValue("${names[1]}"))`;
    }
    if (lower.includes("has a value") && lower.includes("must have a non-zero value")) {
      return `ifThen(hasValue("${names[0]}"), hasNonZero("${names[1]}"))`;
    }
    // "must not have a value"
    if (lower.includes("has a value") && lower.includes("must not have a value")) {
      return `ifThen(hasValue("${names[0]}"), noValue("${names[1]}"))`;
    }
  }

  // "must be equal to" (two fields)
  if (names.length === 2 && /must be equal to/i.test(text) && !/sum/i.test(text)) {
    return `ifThen(hasValue("${names[0]}"), eqField("${names[0]}", "${names[1]}"))`;
  }

  // "must not be greater than" (field vs constant)
  const notGtConstMatch = text.match(/must not be greater than (\d+)/i);
  if (notGtConstMatch && names.length >= 1) {
    return `notGtNum("${names[0]}", ${notGtConstMatch[1]})`;
  }

  // Filing status conditional with one requirement
  if (text.toLowerCase().includes("filing status") && names.length >= 1) {
    // Too complex to auto-generate reliably — these have many variations
    return null;
  }

  return null;
}

// ─── Code Generation ────────────────────────────────────

function escapeString(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}

function generateRuleFile(prefix: string, rules: GeneratedRule[]): string {
  // Collect which predicates are used
  const usedPredicates = new Set<string>();
  usedPredicates.add("rule"); // always needed

  for (const r of rules) {
    if (r.checkCode) {
      // Extract predicate function names (both calls and bare identifiers)
      const fns = r.checkCode.match(/[a-zA-Z]+(?=\()/g);
      if (fns) fns.forEach((f) => usedPredicates.add(f));
      // Also match bare identifiers like alwaysPass, alwaysFail
      if (/^[a-zA-Z]+$/.test(r.checkCode)) usedPredicates.add(r.checkCode);
    }
  }

  // Available predicates from the DSL
  const allPredicates = [
    "alwaysFail", "alwaysPass", "all", "any", "eqField", "eqNum", "eqStr",
    "eqSum", "filingStatusIs", "filingStatusNot", "formAbsent",
    "formCountAtMost", "formPresent", "gt", "gte", "hasNonZero",
    "hasValue", "ifThen", "ifThenUnless", "isZero", "lt", "not",
    "notGtField", "notGtNum", "noValue", "ssnNotEqual", "validSSN",
  ];

  const imports = ["rule", ...allPredicates.filter((p) => usedPredicates.has(p))];

  const lines: string[] = [];
  lines.push("/**");
  lines.push(` * MeF Business Rules: ${prefix}`);
  lines.push(` * Auto-generated from 1040_Business_Rules_2025v3.0.csv`);
  lines.push(` * ${rules.length} rules (${rules.filter((r) => r.checkCode).length} implemented, ${rules.filter((r) => !r.checkCode).length} stubs)`);
  lines.push(" */");
  lines.push("");
  lines.push(`import type { RuleDef } from "../../../../core/validation/types.ts";`);
  if (imports.length > 0) {
    lines.push(`import { ${imports.join(", ")}, } from "../../../../core/validation/mod.ts";`);
  }
  lines.push("");
  lines.push(`export const ${prefixToVarName(prefix)}_RULES: readonly RuleDef[] = [`);

  for (const r of rules) {
    const check = r.checkCode ?? "null";
    lines.push(`  rule(`);
    lines.push(`    "${r.ruleNumber}",`);
    lines.push(`    "${r.severity}",`);
    lines.push(`    "${r.category}",`);
    lines.push(`    ${check},`);
    lines.push(`    "${escapeString(r.ruleText)}",`);
    lines.push(`  ),`);
  }

  lines.push("];");
  lines.push("");

  return lines.join("\n");
}

function prefixToVarName(prefix: string): string {
  // F1040 → F1040, SA → SA, SEIC → SEIC, etc.
  return prefix.replace(/[^A-Za-z0-9]/g, "_");
}

function prefixToFileName(prefix: string): string {
  return prefix.toLowerCase().replace(/[^a-z0-9]/g, "_");
}

function generateIndex(prefixes: string[]): string {
  const lines: string[] = [];
  lines.push("/**");
  lines.push(" * MeF Business Rules — All rules registry");
  lines.push(` * Auto-generated. ${prefixes.length} form groups.`);
  lines.push(" */");
  lines.push("");
  lines.push(`import type { RuleDef } from "../../../../core/validation/types.ts";`);
  lines.push("");

  for (const prefix of prefixes.sort()) {
    const fileName = prefixToFileName(prefix);
    const varName = prefixToVarName(prefix);
    lines.push(`import { ${varName}_RULES } from "./${fileName}.ts";`);
  }

  lines.push("");
  lines.push("/** All MeF business rules for 1040 series. */");
  lines.push("export const ALL_RULES: readonly RuleDef[] = [");
  for (const prefix of prefixes.sort()) {
    const varName = prefixToVarName(prefix);
    lines.push(`  ...${varName}_RULES,`);
  }
  lines.push("];");
  lines.push("");

  // Re-export individual rule sets
  for (const prefix of prefixes.sort()) {
    const fileName = prefixToFileName(prefix);
    const varName = prefixToVarName(prefix);
    lines.push(`export { ${varName}_RULES } from "./${fileName}.ts";`);
  }
  lines.push("");

  return lines.join("\n");
}

// ─── Main ───────────────────────────────────────────────

async function main() {
  console.log("Loading IRS business rules CSV...");
  const allRules = await loadRules();
  const active = allRules.filter(isActive);
  console.log(`Total: ${allRules.length}, Active: ${active.length}`);

  // Group by prefix
  const byPrefix = new Map<string, CsvRule[]>();
  for (const r of active) {
    const prefix = getPrefix(r.ruleNumber);
    if (!byPrefix.has(prefix)) byPrefix.set(prefix, []);
    byPrefix.get(prefix)!.push(r);
  }

  console.log(`Form groups: ${byPrefix.size}`);

  // Generate rule files
  let totalImpl = 0;
  let totalStub = 0;
  const prefixes: string[] = [];

  await Deno.mkdir(new URL(RULES_DIR), { recursive: true });

  for (const [prefix, rules] of byPrefix) {
    prefixes.push(prefix);

    const generated: GeneratedRule[] = rules.map((r) => {
      const checkCode = autoGenerate(r);
      if (checkCode) totalImpl++;
      else totalStub++;
      return {
        ruleNumber: r.ruleNumber,
        ruleText: r.ruleText,
        severity: mapSeverity(r.severity),
        category: mapCategory(r.errorCategory),
        checkCode,
      };
    });

    const code = generateRuleFile(prefix, generated);
    const fileName = prefixToFileName(prefix) + ".ts";
    const filePath = new URL(fileName, RULES_DIR);
    await Deno.writeTextFile(filePath, code);
    const implCount = generated.filter((r) => r.checkCode).length;
    console.log(
      `  ${prefix.padEnd(10)} → ${fileName.padEnd(20)} (${rules.length} rules, ${implCount} auto-implemented)`,
    );
  }

  // Generate index
  const indexCode = generateIndex(prefixes);
  await Deno.writeTextFile(new URL("index.ts", RULES_DIR), indexCode);

  console.log("");
  console.log(`Done! Generated ${prefixes.length} rule files.`);
  console.log(`  Auto-implemented: ${totalImpl}`);
  console.log(`  Stubs (manual):   ${totalStub}`);
  console.log(`  Total:            ${totalImpl + totalStub}`);
}

main();
