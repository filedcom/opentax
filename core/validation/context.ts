/**
 * ReturnContext — read-only interface for rule evaluation.
 *
 * Wraps the pending dict + filer identity + field registry
 * into a uniform interface that rules query by XML element name.
 */

import type { FieldRegistry, ReturnContext } from "./types.ts";
import {
  type EmittedDocument,
  type EmittedReturn,
  rulePrefixForDocumentTag,
} from "./emitted-documents.ts";

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
  emittedFormCounts?: ReadonlyMap<string, number>,
  emitted?: EmittedReturn,
  ownDocument?: EmittedDocument,
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
  if (emittedFormCounts) {
    formSet.clear();
    formCounts.clear();
    for (const [formId, count] of emittedFormCounts) {
      if (count <= 0) continue;
      formSet.add(formId);
      formCounts.set(formId, count);
    }
  }

  // Header fields as a flat map for headerField() lookups
  const headerFields: Record<string, unknown> = {
    PrimarySSN: filer.primarySSN,
    SpouseSSN: filer.spouseSSN,
    FilingStatusCd: filer.filingStatus,
    ...filer,
  };

  // MeF rules name filed XML elements, so an emitted return answers them from
  // the rule's own document, then the header, then Form 1040, then any
  // document. Lower-case names are engine facts outside the XML.
  function emittedValues(xmlName: string): readonly string[] | undefined {
    if (!emitted) return undefined;
    if (!/^[A-Z0-9]/.test(xmlName)) {
      // An emitted attribute answers a lower-case name; otherwise it is an engine fact.
      const attribute = ownDocument?.values.get(xmlName) ??
        emitted.documents.flatMap((d) => d.values.get(xmlName) ?? []);
      return attribute.length > 0 ? attribute : undefined;
    }
    // "Schedule1/Leaf" names a leaf in another document; "ReturnHeader/Leaf"
    // names one in the header only.
    const [documentName, ...rest] = xmlName.split("/");
    if (documentName === "ReturnHeader" && rest.length > 0) {
      return emitted.header.values.get(rest.join("/")) ?? [];
    }
    const named = rest.length > 0
      ? [
        ...[`IRS1040${documentName}`, `IRS${documentName}`]
          .map(rulePrefixForDocumentTag),
        documentName,
      ]
        .find((prefix) => emitted.documents.some((d) => d.prefix === prefix))
      : undefined;
    if (named) {
      const leaf = rest.join("/");
      return emitted.documents.filter((d) => d.prefix === named)
        .flatMap((d) => d.values.get(leaf) ?? []);
    }
    const own = ownDocument?.values.get(xmlName);
    if (own) return own;
    const header = emitted.header.values.get(xmlName);
    if (header) return header;
    const f1040 = emitted.documents.find((d) => d.prefix === "F1040")?.values
      .get(xmlName);
    if (f1040) return f1040;
    return emitted.documents.flatMap((d) => d.values.get(xmlName) ?? []);
  }

  function resolveField(xmlName: string): unknown {
    // 1. Check header fields first
    if (xmlName in headerFields) return headerFields[xmlName];

    const values = emittedValues(xmlName);
    if (values) return values[0];

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

  function namedDocuments(documentName: string): readonly EmittedDocument[] {
    if (!emitted) return [];
    const prefix = [
      ...[`IRS1040${documentName}`, `IRS${documentName}`]
        .map(rulePrefixForDocumentTag),
      documentName,
    ].find((p) => emitted.documents.some((d) => d.prefix === p));
    return emitted.documents.filter((d) => d.prefix === prefix);
  }

  const context: ReturnContext = {
    groupInstances(
      group: string,
      locals: readonly string[] = [],
    ): readonly ReturnContext[] {
      if (!emitted) return [];
      const [first, ...rest] = group.split("/");
      const name = rest.length > 0 ? rest.join("/") : first;
      const documents = rest.length > 0
        ? namedDocuments(first)
        : ownDocument
        ? [ownDocument]
        : [emitted.header, ...emitted.documents];
      const instances = documents.flatMap((d) => d.groups.get(name) ?? []);
      const masked = new Set([
        ...locals,
        ...instances.flatMap((i) => [...i.values.keys()]),
      ]);
      return instances.map((i) => groupInstanceContext(context, i, masked));
    },

    documentReferences() {
      return (emitted?.documents ?? []).map((d) => ({
        prefix: d.prefix,
        documentId: d.documentId,
        references: d.references ?? [],
      }));
    },

    emittedDocumentCount() {
      return {
        actual: emitted?.documents.length ?? 0,
        declared: emitted?.declaredDocumentCnt,
      };
    },

    ownDocumentOnly(): ReturnContext {
      if (!emitted || !ownDocument) return context;
      const shared = [
        emitted.header,
        ...emitted.documents.filter((d) => d.prefix === "F1040"),
      ];
      const masked = new Set(
        emitted.documents
          .filter((d) => d !== ownDocument)
          .flatMap((d) => [...d.values.keys()])
          // "Doc/Leaf" and "Grp/Leaf" names already say where they come from.
          .filter((key) => !key.includes("/"))
          .filter((key) => !shared.some((d) => d.values.has(key))),
      );
      return groupInstanceContext(context, ownDocument, masked);
    },

    emittedDocuments(prefix: string): readonly ReturnContext[] {
      const documents = emitted?.documents.filter((d) => d.prefix === prefix) ??
        [];
      const masked = new Set(documents.flatMap((d) => [...d.values.keys()]));
      return documents.map((document) =>
        groupInstanceContext(
          createReturnContext(
            pending,
            filer,
            fieldRegistry,
            emittedFormCounts,
            emitted,
            document,
          ),
          document,
          masked,
        )
      );
    },

    forRulePrefix(prefix: string): readonly ReturnContext[] {
      const documents = emitted?.documents.filter((d) => d.prefix === prefix);
      if (!documents?.length) return [context];
      return documents.map((document) =>
        createReturnContext(
          pending,
          filer,
          fieldRegistry,
          emittedFormCounts,
          emitted,
          document,
        )
      );
    },

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

    fieldArray(xmlName: string): readonly unknown[] {
      if (!(xmlName in headerFields)) {
        const values = emittedValues(xmlName);
        if (values) return values;
      }
      const v = resolveField(xmlName);
      if (v === undefined || v === null || v === "") return [];
      if (Array.isArray(v)) return v;
      return [v];
    },
  };
  return context;
}

function numeric(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

/**
 * A group instance reads the group's own elements from itself only, so a
 * "corresponding" element never comes from a sibling instance.
 */
function groupInstanceContext(
  parent: ReturnContext,
  instance: EmittedDocument,
  masked: ReadonlySet<string>,
): ReturnContext {
  const own = (xmlName: string): readonly unknown[] | undefined =>
    instance.values.get(xmlName) ?? (masked.has(xmlName) ? [] : undefined);
  const field = (xmlName: string): unknown => {
    const values = own(xmlName);
    return values ? values[0] : parent.field(xmlName);
  };
  return {
    ...parent,
    field,
    num: (xmlName) => numeric(field(xmlName)),
    hasValue(xmlName) {
      const v = field(xmlName);
      return v !== undefined && v !== null && v !== "";
    },
    hasNonZero(xmlName) {
      const v = field(xmlName);
      if (typeof v === "number") return v !== 0;
      if (typeof v === "string") return v !== "" && v !== "0";
      return false;
    },
    fieldArray: (xmlName) => own(xmlName) ?? parent.fieldArray(xmlName),
  };
}
