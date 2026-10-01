import { inputSchema } from "../nodes/intermediate/forms/form8582cr/index.ts";
import { normalizeAllPending } from "./pending.ts";

/** Retain filed fields while checking the calculation inputs used by the tests. */
export function normalizeForm8582CRTestPending(raw: Record<string, unknown>) {
  const pending = normalizeAllPending(raw);
  const inputs = inputSchema.parse(pending.form8582cr);
  return Object.assign(pending, {
    form8582cr: Object.assign(pending.form8582cr, inputs),
  });
}
