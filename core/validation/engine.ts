/**
 * Rule evaluation engine.
 *
 * Evaluates all rules against a ReturnContext and produces
 * a DiagnosticsReport with pass/fail/skip results.
 */

import { formRefFromPrefix, ruleFormPrefix } from "./rule-builder.ts";
import type {
  DiagnosticEntry,
  DiagnosticsReport,
  DiagnosticsSummary,
  ReturnContext,
  RuleDef,
} from "./types.ts";

/**
 * Evaluate all rules against a return context.
 * Returns a diagnostics report with all violations, alerts, and summary stats.
 */
export function evaluateRules(
  rules: readonly RuleDef[],
  ctx: ReturnContext,
  applicableFormPrefixes?: ReadonlySet<string>,
): DiagnosticsReport {
  const entries: DiagnosticEntry[] = [];
  let passed = 0;
  let rejected = 0;
  let alerts = 0;
  let skipped = 0;
  let stopped = false;

  for (const rule of rules) {
    // Skip if we hit a "reject and stop"
    if (stopped) {
      skipped++;
      continue;
    }

    const prefix = ruleFormPrefix(rule.ruleNumber);
    if (applicableFormPrefixes && !applicableFormPrefixes.has(prefix)) {
      skipped++;
      continue;
    }

    // Evaluate the rule
    // A rule for a repeated document applies to each emitted copy.
    const check = rule.check;
    const scopes = ctx.forRulePrefix?.(prefix) ?? [ctx];
    const passes = scopes.every((scope) => check(scope));

    if (passes) {
      passed++;
      continue;
    }

    // Rule failed — create diagnostic entry
    const entry: DiagnosticEntry = {
      ruleNumber: rule.ruleNumber,
      severity: rule.severity,
      category: rule.category,
      message: rule.ruleText,
      formRef: formRefFromPrefix(prefix),
    };

    entries.push(entry);

    if (
      rule.severity === "alert" ||
      rule.severity === "reject" && rule.category === "information"
    ) {
      alerts++;
    } else {
      rejected++;
    }

    // "Reject and Stop" halts further processing
    if (rule.severity === "reject_and_stop") {
      stopped = true;
    }
  }

  const summary: DiagnosticsSummary = {
    total: rules.length,
    passed,
    rejected,
    alerts,
    skipped,
  };

  return {
    entries,
    summary,
    canFile: rejected === 0,
  };
}
