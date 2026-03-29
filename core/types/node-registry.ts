import type { TaxNode } from "./tax-node.ts";

// Maps nodeType string to its TaxNode instance
export type NodeRegistry = Readonly<Record<string, TaxNode>>;
