/**
 * The Form 1040 MeF business rules as export applies them: to the emitted
 * return, and to the submission ZIP and transmission once they are built.
 */
import { createReturnContext } from "../../../core/validation/context.ts";
import { evaluateRules } from "../../../core/validation/engine.ts";
import {
  type EmittedReturn,
  parseEmittedReturn,
  rulePrefixForDocumentTag,
} from "../../../core/validation/emitted-documents.ts";
import { EnvelopeFact } from "../../../core/validation/predicates.ts";
import { ruleFormPrefix } from "../../../core/validation/rule-builder.ts";
import type {
  DiagnosticsReport,
  RuleDef,
} from "../../../core/validation/types.ts";
import { type FilerIdentity, returnHeaderNameLine1 } from "../mef/header.ts";
import { FIELD_REGISTRY } from "./field-registry.ts";
import { rulesForReturnVersion } from "./rules/ty2026.ts";

/** Return, header, XML, transmission and state-submission rules apply to every return. */
const ALWAYS_APPLICABLE_RULE_PREFIXES = [
  "IND",
  "R0000",
  "X0000",
  "T0000",
  "STATE",
] as const;

/** Rules that read the submission ZIP, its manifest or the transmission. */
const ENVELOPE_RULE_PREFIXES = new Set(["R0000", "X0000", "T0000", "STATE"]);

/** IRS Payment, ES Payment and 965 Payment Records share the FPYMT rules. */
const PAYMENT_RECORD_PREFIXES = new Set([
  "FPayment",
  "FESPayment",
  "F965Payment",
]);

// These checks read the submission manifest, the originator EFIN or the
// transmitter's session, none of which a return-only export has. The
// submission ZIP and transmission builders run the R0000 ones on the real ZIP.
const TRANSMISSION_ONLY_RULES = new Set([
  "IND-062", // transmitter IP address
  "IND-063", // transmitter timestamp
  "R0000-051-01",
  "R0000-052-01",
  "R0000-054-01",
  "R0000-060",
  "R0000-080-01",
  "R0000-081-01",
  "R0000-082",
  "R0000-114",
  "R0000-115",
  "R0000-118-01",
  "R0000-119-01",
  "R0000-143",
  "R0000-180",
  "R0000-228",
  "R0000-229",
  // A return-only export has no originator; its header carries EFIN 000000.
  "R0000-905-01",
]);

export function isTransmissionOnlyRule(ruleNumber: string): boolean {
  if (TRANSMISSION_ONLY_RULES.has(ruleNumber)) return true;
  const indNumber = /^IND-(\d+)/.exec(ruleNumber);
  if (!indNumber) return false;
  const number = Number(indNumber[1]);
  // IND-189 through IND-203 require filing security or additional filer
  // metadata gathered by a transmitter, not by the return-only exporters.
  return number >= 189 && number <= 203;
}

function pendingFormIdsForPrefix(prefix: string): readonly string[] {
  if (prefix === "F1040") return ["f1040"];
  if (prefix === "FW2") return ["w2"];
  if (prefix === "SEIC") return ["schedule_eic", "eitc"];
  if (prefix === "SSE") return ["schedule_se"];
  if (/^S[123]$/.test(prefix)) return [`schedule${prefix.slice(1)}`];
  if (/^S[A-Z]$/.test(prefix)) {
    return [`schedule_${prefix.slice(1).toLowerCase()}`];
  }
  if (prefix.startsWith("F")) {
    const suffix = prefix.slice(1).toLowerCase();
    return [`form${suffix}`, `form_${suffix}`];
  }
  return [];
}

export interface EmittedValidationScope {
  readonly rulePrefixes: ReadonlySet<string>;
  readonly formCounts: ReadonlyMap<string, number>;
  readonly returnVersion?: string;
  readonly emitted: EmittedReturn;
}

export function emittedValidationScope(xml: string): EmittedValidationScope {
  const prefixes = new Set<string>(ALWAYS_APPLICABLE_RULE_PREFIXES);
  const formCounts = new Map<string, number>();
  for (const match of xml.matchAll(/<(IRS[A-Za-z0-9]+) documentId=/g)) {
    const prefix = rulePrefixForDocumentTag(match[1]);
    if (!prefix) continue;
    prefixes.add(prefix);
    if (PAYMENT_RECORD_PREFIXES.has(prefix)) prefixes.add("FPYMT");
    for (const formId of pendingFormIdsForPrefix(prefix)) {
      formCounts.set(formId, (formCounts.get(formId) ?? 0) + 1);
    }
  }
  // Supporting documents count as present forms: FECRecord → fec_record.
  for (const match of xml.matchAll(/<([A-Z][A-Za-z0-9]+) documentId=/g)) {
    if (match[1].startsWith("IRS")) continue;
    const formId = match[1].replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2").toLowerCase();
    formCounts.set(formId, (formCounts.get(formId) ?? 0) + 1);
  }
  const returnVersion = /<Return\b[^>]*\breturnVersion="([^"]+)"/.exec(xml)
    ?.[1];
  return {
    rulePrefixes: prefixes,
    formCounts,
    returnVersion,
    emitted: parseEmittedReturn(xml),
  };
}

/** Envelope values a submission or transmission rule context carries. */
export type EnvelopeFacts = Readonly<Partial<Record<EnvelopeFact, unknown>>>;

function ruleReport(
  pending: Readonly<Record<string, Record<string, unknown>>>,
  filer: FilerIdentity | undefined,
  rules: (all: readonly RuleDef[]) => readonly RuleDef[],
  emittedScope?: EmittedValidationScope,
  facts: EnvelopeFacts = {},
): DiagnosticsReport {
  const f1040 = pending["f1040"] ?? {};
  const filerInfo = {
    primarySSN: filer?.primarySSN ?? "",
    spouseSSN: filer?.spouse?.ssn,
    filingStatus: typeof f1040["filing_status"] === "number"
      ? f1040["filing_status"] as number
      : 0,
    ...filer,
    NameLine1Txt: filer ? returnHeaderNameLine1(filer) : undefined,
    returnVersion: emittedScope?.returnVersion,
    ats_test_submission: f1040["ats_test_submission"] === true,
    ...facts,
  };
  const ctx = createReturnContext(
    pending,
    filerInfo,
    FIELD_REGISTRY,
    emittedScope?.formCounts,
    emittedScope?.emitted,
  );
  return evaluateRules(
    rules(rulesForReturnVersion(emittedScope?.returnVersion)),
    ctx,
    emittedScope?.rulePrefixes,
  );
}

/** The IRS business rules on the emitted return, as a return-only export applies them. */
export function businessRuleReport(
  pending: Readonly<Record<string, Record<string, unknown>>>,
  filer: FilerIdentity | undefined,
  emittedScope?: EmittedValidationScope,
): DiagnosticsReport {
  return ruleReport(
    pending,
    filer,
    (all) => all.filter((rule) => !isTransmissionOnlyRule(rule.ruleNumber)),
    emittedScope,
  );
}

/**
 * The R0000, X0000, T0000 and STATE rules, and the IND rules on the manifest
 * and receipt date, on a built submission ZIP and any transmission it is in.
 */
export function submissionEnvelopeReport(
  pending: Readonly<Record<string, Record<string, unknown>>>,
  filer: FilerIdentity,
  xml: string,
  facts: EnvelopeFacts,
): EnvelopeRuleReport {
  const scope = emittedValidationScope(xml);
  const evaluated: RuleDef[] = [];
  const report = ruleReport(
    pending,
    filer,
    (all) => {
      evaluated.push(...all.filter((rule) =>
        ENVELOPE_RULE_PREFIXES.has(ruleFormPrefix(rule.ruleNumber)) ||
        rule.ruleNumber === "IND-002" || rule.ruleNumber === "IND-052"
      ));
      return evaluated;
    },
    scope,
    facts,
  );
  return { report, byPrefix: tallyByPrefix(evaluated, report) };
}

/** Rules checked and passed per rule prefix: what an envelope gate ran. */
export type RulePrefixTally = Readonly<
  Record<string, { readonly checked: number; readonly passed: number }>
>;

export interface EnvelopeRuleReport {
  readonly report: DiagnosticsReport;
  readonly byPrefix: RulePrefixTally;
}

function tallyByPrefix(
  rules: readonly RuleDef[],
  report: DiagnosticsReport,
): RulePrefixTally {
  const failed = new Set(report.entries.map((entry) => entry.ruleNumber));
  const tally: Record<string, { checked: number; passed: number }> = {};
  for (const rule of rules) {
    const prefix = ruleFormPrefix(rule.ruleNumber);
    const row = tally[prefix] ??= { checked: 0, passed: 0 };
    row.checked++;
    if (!failed.has(rule.ruleNumber)) row.passed++;
  }
  return tally;
}

/** UTC calendar date of a processing timestamp, as EnvelopeFact.ProcessingDate. */
export function processingDateFact(date: Date): string {
  return date.toISOString().slice(0, 10);
}
