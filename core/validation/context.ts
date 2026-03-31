/**
 * ReturnContext — read-only interface for rule evaluation.
 *
 * Wraps the pending dict + filer identity + field registry
 * into a uniform interface that rules query by XML element name.
 */

import type { FieldRegistry, ReturnContext } from "./types.ts";

export interface FilerInfo {
  readonly primarySSN: string;
  readonly spouseSSN?: string;
  readonly filingStatus: number;
  readonly [key: string]: unknown;
}

/**
 * Create a ReturnContext from a computed pending dict, filer info,
 * and the reverse field registry.
 */
export function createReturnContext(
  pending: Readonly<Record<string, Record<string, unknown>>>,
  filer: FilerInfo,
  fieldRegistry: FieldRegistry,
): ReturnContext {
  // Pre-compute form presence set
  const formSet = new Set<string>();
  const formCounts = new Map<string, number>();
  for (const [nodeType, fields] of Object.entries(pending)) {
    if (nodeType === "start") continue;
    if (Object.keys(fields).length > 0) {
      formSet.add(nodeType);
      formCounts.set(nodeType, (formCounts.get(nodeType) ?? 0) + 1);
    }
  }

  // Header fields as a flat map for headerField() lookups
  const headerFields: Record<string, unknown> = {
    PrimarySSN: filer.primarySSN,
    SpouseSSN: filer.spouseSSN,
    FilingStatusCd: filer.filingStatus,
    ...filer,
  };

  function resolveField(xmlName: string): unknown {
    // 1. Check header fields first
    if (xmlName in headerFields) return headerFields[xmlName];

    // 2. Look up in field registry (XML element → pending dict location)
    const loc = fieldRegistry.get(xmlName);
    if (loc) {
      if (loc.form === "_header") return headerFields[loc.pendingKey];
      return pending[loc.form]?.[loc.pendingKey];
    }

    // 3. Fallback: search all forms for a matching key (for unmapped fields)
    for (const fields of Object.values(pending)) {
      if (xmlName in fields) return fields[xmlName];
    }

    return undefined;
  }

  return {
    field(xmlName: string): unknown {
      return resolveField(xmlName);
    },

    num(xmlName: string): number {
      const v = resolveField(xmlName);
      if (typeof v === "number") return v;
      if (typeof v === "string") {
        const n = Number(v);
        return Number.isNaN(n) ? 0 : n;
      }
      return 0;
    },

    hasValue(xmlName: string): boolean {
      const v = resolveField(xmlName);
      return v !== undefined && v !== null && v !== "";
    },

    hasNonZero(xmlName: string): boolean {
      const v = resolveField(xmlName);
      if (typeof v === "number") return v !== 0;
      if (typeof v === "string") return v !== "" && v !== "0";
      return false;
    },

    hasForm(formId: string): boolean {
      return formSet.has(formId);
    },

    presentForms(): readonly string[] {
      return [...formSet];
    },

    filingStatus(): number {
      const fs = filer.filingStatus;
      return typeof fs === "number" ? fs : 0;
    },

    primarySSN(): string {
      return String(filer.primarySSN ?? "");
    },

    spouseSSN(): string | undefined {
      return filer.spouseSSN ? String(filer.spouseSSN) : undefined;
    },

    headerField(name: string): unknown {
      return headerFields[name];
    },

    pendingField(nodeType: string, fieldName: string): unknown {
      return pending[nodeType]?.[fieldName];
    },

    formCount(formId: string): number {
      return formCounts.get(formId) ?? 0;
    },
  };
}
