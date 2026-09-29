import type { ZodTypeAny } from "zod";
import type { TaxNode } from "./tax-node.ts";
import type { FilerIdentity } from "../../forms/f1040/mef/header.ts";
import type { ExecuteResult } from "../runtime/executor.ts";
import type { MefBundle } from "../../forms/f1040/2025/mef/builder.ts";

export interface PreparedFormReturn {
  readonly bundle: MefBundle;
  readonly renderPdf: () => Promise<Uint8Array>;
}

export type InputNodeEntry =
  | {
    readonly node: TaxNode;
    readonly inputKey?: string;
    readonly itemSchema: ZodTypeAny;
    readonly isArray: true;
  }
  | {
    readonly node: TaxNode;
    readonly inputKey?: string;
    readonly inputSchema: ZodTypeAny;
    readonly isArray: false;
  };

export interface FormDefinition {
  readonly formType: string; // e.g. "f1040"
  readonly taxYear: number; // e.g. 2025
  readonly mefSchemaVersion: string; // e.g. "2025v3.0"
  readonly inputNodes: readonly InputNodeEntry[];
  readonly registry: Record<string, TaxNode>;
  /** Single form-owned execution entrypoint for validated source inputs. */
  readonly executeReturn: (inputs: Record<string, unknown>) => ExecuteResult;
  /** Build linked native documents once and retain their printable source. */
  readonly prepareReturn: (
    pending: Record<string, unknown>,
    filer: FilerIdentity | undefined,
  ) => Promise<PreparedFormReturn>;
  readonly buildMefXml: (
    pending: Record<string, unknown>,
    filer?: FilerIdentity,
  ) => string;
  readonly buildPdfBytes: (
    pending: Record<string, unknown>,
    filer?: FilerIdentity,
  ) => Promise<Uint8Array>;
  readonly buildPending: (
    pending: Record<string, unknown>,
  ) => Record<string, unknown>;
}
