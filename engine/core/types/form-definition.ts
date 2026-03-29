import type { ZodTypeAny } from "zod";
import type { TaxNode } from "./tax-node.ts";

export type InputNodeEntry =
  | { readonly node: TaxNode; readonly itemSchema: ZodTypeAny; readonly isArray: true }
  | { readonly node: TaxNode; readonly inputSchema: ZodTypeAny; readonly isArray: false };

export interface FormDefinition {
  readonly formType: string;         // e.g. "f1040"
  readonly taxYear: number;          // e.g. 2025
  readonly mefSchemaVersion: string; // e.g. "2025v3.0"
  readonly inputNodes: readonly InputNodeEntry[];
  readonly registry: Record<string, TaxNode>;
  readonly buildMefXml: (pending: Record<string, unknown>, filer?: Record<string, unknown>) => string;
}
