import { catalog } from "../../catalog.ts";
import type { FormDefinition } from "../../core/types/form-definition.ts";
import { type JsonValue, zodTemplate } from "../utils/zod-template.ts";
import { getUserInputSchema } from "./form.ts";

export type SourceDocument = {
  readonly document: string;
  readonly nodeType: string;
  readonly form: string;
  readonly note?: string;
};

export const SOURCE_DOCUMENTS: readonly SourceDocument[] = [
  { document: "w2", nodeType: "w2", form: "Form W-2" },
  { document: "1099-int", nodeType: "f1099int", form: "Form 1099-INT" },
  { document: "1099-div", nodeType: "f1099div", form: "Form 1099-DIV" },
  { document: "1099-b", nodeType: "f1099b", form: "Form 1099-B" },
  {
    document: "1099-r",
    nodeType: "f1099r",
    form: "Form 1099-R",
    // 2025 Schedule R, Part I boxes 2, 4, 5, 6 and 9; Form 1040 line 1h.
    note:
      "Box 7 code 3 is a disability distribution. Paid before the plan's minimum retirement age, it is disability_flag with disability_as_wages (Form 1040 line 1h), and a recipient under 65 may also claim the credit for the elderly or the disabled: add schedule_r ('opentax node template schedule_r --full').",
  },
  { document: "1099-nec", nodeType: "f1099nec", form: "Form 1099-NEC" },
  { document: "1099-misc", nodeType: "f1099m", form: "Form 1099-MISC" },
  { document: "1099-g", nodeType: "f1099g", form: "Form 1099-G" },
  { document: "1099-k", nodeType: "f1099k", form: "Form 1099-K" },
  { document: "ssa-1099", nodeType: "ssa1099", form: "Form SSA-1099" },
  { document: "1098", nodeType: "f1098", form: "Form 1098" },
  { document: "1098-e", nodeType: "f1098e", form: "Form 1098-E" },
  {
    document: "1098-t",
    nodeType: "f8863",
    form: "Form 1098-T (claimed on Form 8863)",
  },
  { document: "w-2g", nodeType: "w2g", form: "Form W-2G" },
  { document: "1095-a", nodeType: "f1095a", form: "Form 1095-A" },
];

export type NodeTemplateArgs = {
  readonly nodeType?: string;
  readonly document?: string;
  readonly year: number;
  readonly full: boolean;
};

export type NodeTemplate = {
  readonly node_type: string;
  readonly year: number;
  readonly document?: string;
  readonly note?: string;
  readonly repeatable: boolean;
  readonly command: string;
  readonly data: JsonValue;
  readonly _help: Readonly<Record<string, string>>;
  readonly optional_fields?: readonly string[];
};

export type DocumentListing = {
  readonly document: string;
  readonly node_type: string;
  readonly form: string;
};

function f1040(year: number): FormDefinition {
  const def = catalog[`f1040:${year}`];
  if (!def) throw new Error(`Unsupported year: ${year}`);
  return def;
}

function inputKeys(def: FormDefinition): readonly string[] {
  return def.inputNodes.map((entry) => entry.inputKey ?? entry.node.nodeType);
}

function requireInput(def: FormDefinition, nodeType: string): void {
  if (nodeType === "start" || inputKeys(def).includes(nodeType)) return;
  throw new Error(
    `Unknown input: ${nodeType}. Run 'opentax node list' for keyed inputs.`,
  );
}

function sourceDocument(document: string): SourceDocument {
  const found = SOURCE_DOCUMENTS.find((entry) =>
    entry.document === document.toLowerCase()
  );
  if (found) return found;
  throw new Error(
    `Unknown document: ${document}. Known: ${
      SOURCE_DOCUMENTS.map((entry) => entry.document).join(", ")
    }`,
  );
}

/** The JSON `form add` accepts for one input, built from its schema. */
export function nodeTemplateCommand(args: NodeTemplateArgs): NodeTemplate {
  const document = args.document ? sourceDocument(args.document) : undefined;
  const nodeType = document?.nodeType ?? args.nodeType;
  if (!nodeType) throw new Error("Pass a node type or --document <kind>");
  const def = f1040(args.year);
  requireInput(def, nodeType);
  const template = zodTemplate(getUserInputSchema(def, nodeType), {
    full: args.full,
  });
  const entry = def.inputNodes.find((candidate) =>
    (candidate.inputKey ?? candidate.node.nodeType) === nodeType
  );
  return {
    node_type: nodeType,
    year: args.year,
    ...(document ? { document: document.document } : {}),
    ...(document?.note ? { note: document.note } : {}),
    repeatable: entry?.isArray ?? false,
    command:
      `opentax form add --returnId <id> --node_type ${nodeType} '<data>'`,
    data: template.value,
    _help: template.help,
    ...(template.optional.length ? { optional_fields: template.optional } : {}),
  };
}

export function listDocumentsCommand(year: number): DocumentListing[] {
  f1040(year);
  return SOURCE_DOCUMENTS.map((entry) => ({
    document: entry.document,
    node_type: entry.nodeType,
    form: entry.form,
  }));
}
