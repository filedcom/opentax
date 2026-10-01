import { printSchema } from "../nodes/intermediate/forms/form8606/index.ts";
import { normalizeAllPending } from "./pending.ts";

/** Parse the computed Form 8606 slice before a test passes it to filers. */
export function normalizeForm8606TestPending(raw: Record<string, unknown>) {
  const pending = normalizeAllPending(raw);
  return Object.assign(pending, {
    form8606: printSchema.parse(pending.form8606),
  });
}
