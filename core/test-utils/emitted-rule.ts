import { createReturnContext } from "../validation/context.ts";
import { parseEmittedReturn } from "../validation/emitted-documents.ts";
import { evaluateRules } from "../validation/engine.ts";
import type { RuleDef } from "../validation/types.ts";

export type EmittedCase = {
  readonly header?: string;
  readonly documents: string;
  readonly filingStatus?: number;
  readonly primarySSN?: string;
  readonly spouseSSN?: string;
  /** Present forms by pending id, as export counts them (form8936, schedule_eic). */
  readonly forms?: Readonly<Record<string, number>>;
};

/** Whether `ruleNumber` passes on a small emitted return, evaluated as export does. */
export function emittedRulePasses(
  rules: readonly RuleDef[],
  ruleNumber: string,
  c: EmittedCase,
): boolean {
  const rule = rules.find((r) => r.ruleNumber === ruleNumber);
  if (!rule) throw new Error(`Missing rule ${ruleNumber}`);
  const count = c.documents.match(/documentId="/g)?.length ?? 0;
  const xml = `<Return returnVersion="2025v5.4"><ReturnHeader><TaxYr>2025</TaxYr>` +
    `${c.header ?? ""}</ReturnHeader><ReturnData documentCnt="${count}">` +
    `${c.documents}</ReturnData></Return>`;
  const ctx = createReturnContext(
    {},
    {
      primarySSN: c.primarySSN ?? "400001001",
      spouseSSN: c.spouseSSN,
      filingStatus: c.filingStatus ?? 1,
    },
    new Map(),
    new Map(Object.entries(c.forms ?? {})),
    parseEmittedReturn(xml),
  );
  return evaluateRules([rule], ctx).entries.length === 0;
}
