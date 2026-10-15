import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import type { SourceDocumentBytes } from "../../../core/runtime/source-documents.ts";
import { sourceRegistry2026 } from "./source-registry.ts";
import { form1062Claim2026Schema, Form1062Node2026 } from "./nodes/form1062.ts";
import { Form1062Covenants2026 } from "./inputs/form1062-documents.ts";

/** Internal draft execution with an isolated, exact source-document binding. */
export async function executeDraftSources2026(
  raw: Record<string, unknown>,
  documents: readonly SourceDocumentBytes[] = [],
) {
  const input = sourceRegistry2026.start.inputSchema.parse(raw);
  const claim = input.form1062 === undefined
    ? undefined
    : form1062Claim2026Schema.parse(input.form1062).claim;
  let covenants: Form1062Covenants2026 | undefined;
  if (claim) {
    const claims = new Map<string, string>();
    for (const sale of claim.election.sales) {
      const { document_reference: reference, sha256 } = sale.covenant;
      if (claims.has(reference) && claims.get(reference) !== sha256) {
        throw new Error(
          "Form 1062 shared covenant reference has conflicting hashes",
        );
      }
      claims.set(reference, sha256);
    }
    covenants = await Form1062Covenants2026.verify(
      [...claims].map(([reference, sha256]) => ({ reference, sha256 })),
      documents,
    );
  } else if (documents.length) {
    throw new Error(
      "TY2026 source documents need a corresponding election claim",
    );
  }
  const registry = covenants
    ? { ...sourceRegistry2026, form1062: new Form1062Node2026(covenants) }
    : sourceRegistry2026;
  return {
    ...execute(buildExecutionPlan(registry), registry, input, {
      taxYear: 2026,
      formType: "f1040",
    }),
    ...(covenants ? { verifiedSourceDocuments: covenants.documents } : {}),
  };
}
