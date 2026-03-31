/**
 * Rule builder — constructs RuleDef objects with less boilerplate.
 */

import type { ErrorCategory, RuleCheck, RuleDef, Severity } from "./types.ts";

/** Map from CSV severity text to our Severity type. */
const SEVERITY_MAP: Record<string, Severity> = {
  "Reject": "reject",
  "Reject and Stop": "reject_and_stop",
  "Alert": "alert",
};

/** Map from CSV category text to our ErrorCategory type. */
const CATEGORY_MAP: Record<string, ErrorCategory> = {
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

/** Build a RuleDef with typed severity and category. */
export function rule(
  ruleNumber: string,
  severity: Severity,
  category: ErrorCategory,
  check: RuleCheck | null,
  ruleText = "",
): RuleDef {
  return { ruleNumber, ruleText, severity, category, check };
}

/** Parse severity from CSV string. */
export function parseSeverity(csv: string): Severity {
  return SEVERITY_MAP[csv.trim()] ?? "reject";
}

/** Parse error category from CSV string. */
export function parseCategory(csv: string): ErrorCategory {
  return CATEGORY_MAP[csv.trim()] ?? "incorrect_data";
}

/** Extract the form prefix from a rule number (e.g., "F1040" from "F1040-003-02"). */
export function ruleFormPrefix(ruleNumber: string): string {
  const dash = ruleNumber.indexOf("-");
  return dash === -1 ? ruleNumber : ruleNumber.slice(0, dash);
}

/** Map rule prefix to a human-readable form reference. */
export function formRefFromPrefix(prefix: string): string {
  const MAP: Record<string, string> = {
    F1040: "Form 1040",
    IND: "Return",
    R0000: "Return Header",
    SA: "Schedule A",
    SB: "Schedule B",
    SC: "Schedule C",
    SD: "Schedule D",
    SE: "Schedule E",
    SF: "Schedule F",
    SH: "Schedule H",
    SJ: "Schedule J",
    SK1: "Schedule K-1",
    SK2: "Schedule K-2",
    SK3: "Schedule K-3",
    SL: "Schedule L",
    SM: "Schedule M",
    SO: "Schedule O",
    SP: "Schedule P",
    SQ: "Schedule Q",
    SR: "Schedule R",
    S1: "Schedule 1",
    S2: "Schedule 2",
    S3: "Schedule 3",
    S8812: "Schedule 8812",
    SSE: "Schedule SE",
    SEIC: "Schedule EIC",
    SLEP: "Schedule LEP",
    STATE: "State Return",
    FW2: "Form W-2",
    FW2G: "Form W-2G",
    FT: "Form T",
    FPYMT: "Payment Record",
    X0000: "XML",
    T0000: "Transmission",
    RRB: "Form RRB-1042S",
    SSA: "Form SSA-1042S",
    F1099R: "Form 1099-R",
    SCHK2K3: "Schedule K-2/K-3",
    SCHK3: "Schedule K-3",
  };
  if (MAP[prefix]) return MAP[prefix];
  if (prefix.startsWith("F")) return `Form ${prefix.slice(1)}`;
  return prefix;
}
