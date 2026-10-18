/**
 * MeF Business Rules Validation — Core Types
 *
 * Models the IRS MeF business rule structure: rule definitions,
 * diagnostic entries, and the diagnostics report.
 */

/** Severity levels matching IRS MeF business rule severities. */
export type Severity = "reject" | "reject_and_stop" | "alert";

/** Error categories from the IRS business rules CSV. */
export type ErrorCategory =
  | "missing_data"
  | "incorrect_data"
  | "data_mismatch"
  | "math_error"
  | "missing_document"
  | "unsupported"
  | "multiple_documents"
  | "information"
  | "database"
  | "duplicate"
  | "xml_error";

/** Read-only interface for rule evaluation — rules never touch the pending dict directly. */
export interface ReturnContext {
  /** Get raw field value by MeF XML element name. */
  field(xmlName: string): unknown;
  /** Get numeric value by XML element name (0 if missing/non-numeric). */
  num(xmlName: string): number;
  /** Check if field has any value (not undefined/null/empty string). */
  hasValue(xmlName: string): boolean;
  /** Check if field has a non-zero numeric value. */
  hasNonZero(xmlName: string): boolean;

  /** Check if a form/schedule is present in the return. */
  hasForm(formId: string): boolean;
  /** List all forms present in the return. */
  presentForms(): readonly string[];

  /** Filing status code (1=Single, 2=MFJ, 3=MFS, 4=HOH, 5=QSS). */
  filingStatus(): number;
  /** Primary taxpayer SSN. */
  primarySSN(): string;
  /** Spouse SSN (undefined if not MFJ/MFS). */
  spouseSSN(): string | undefined;
  /** Access header fields by name. */
  headerField(name: string): unknown;

  /** Access raw pending dict field (for fields not in any FIELD_MAP). */
  pendingField(nodeType: string, fieldName: string): unknown;

  /** Count of forms of a given type (for multiple-document rules). */
  formCount(formId: string): number;

  /**
   * Return the raw pending dict value as an array.
   * - If the value is already an array (promoted by mergePending), return it directly.
   * - If it is a single (non-null, non-empty) value, wrap it in [value].
   * - If absent, null, or empty string, return [].
   */
  fieldArray(xmlName: string): readonly unknown[];

  /** One context per emitted document governed by a rule prefix. */
  forRulePrefix?(prefix: string): readonly ReturnContext[];

  /**
   * One context per emitted instance of a group ("Grp", or "Doc/Grp" for
   * another document), where the group's own elements, and any `locals`, are
   * read from that instance only. Empty when the group is absent or nothing
   * was emitted.
   */
  groupInstances?(
    group: string,
    locals?: readonly string[],
  ): readonly ReturnContext[];

  /**
   * One context per emitted document with this rule prefix, reading the
   * document's own elements from itself only; empty when none.
   */
  emittedDocuments?(prefix: string): readonly ReturnContext[];

  /**
   * This context, except that an element absent from its own document is not
   * read from another document unless the Return Header or Form 1040 has it.
   */
  ownDocumentOnly?(): ReturnContext;

  /** Each emitted ReturnData document's prefix, documentId and the documentIds it references. */
  documentReferences?(): readonly DocumentReferences[];

  /** Emitted ReturnData documents: those counted and the declared 'documentCnt'. */
  emittedDocumentCount?(): { readonly actual: number; readonly declared?: number };
}

/** How one emitted ReturnData document links to others. */
export interface DocumentReferences {
  readonly prefix: string;
  readonly documentId?: string;
  readonly references: readonly string[];
}

/** A rule check function. Returns true if the rule PASSES (no violation). */
export type RuleCheck = (ctx: ReturnContext) => boolean;

/** A single MeF business rule definition. */
export interface RuleDef {
  readonly ruleNumber: string;
  readonly ruleText: string;
  readonly severity: Severity;
  readonly category: ErrorCategory;
  readonly check: RuleCheck;
}

/** A single diagnostic finding (rule violation or alert). */
export interface DiagnosticEntry {
  readonly ruleNumber: string;
  readonly severity: Severity;
  readonly category: ErrorCategory;
  readonly message: string;
  readonly formRef: string;
}

/** Summary statistics for a diagnostics report. */
export interface DiagnosticsSummary {
  readonly total: number;
  readonly passed: number;
  readonly rejected: number;
  readonly alerts: number;
  readonly skipped: number;
}

/** Complete diagnostics report for a tax return. */
export interface DiagnosticsReport {
  readonly entries: readonly DiagnosticEntry[];
  readonly summary: DiagnosticsSummary;
  readonly canFile: boolean;
}

/** Maps an XML element name to its location in the pending dict. */
export interface FieldLocation {
  readonly form: string;
  readonly pendingKey: string;
}

/** Reverse field registry: XML element name → pending dict location. */
export type FieldRegistry = ReadonlyMap<string, FieldLocation>;
