import { inputSchema } from "./recapture_node.ts";

/** Bind every reviewed Form 8874-B holder to the prepared Form 1040 filer. */
export function assertForm8874RecaptureOwners(
  rawSource: unknown,
  pending: Readonly<Record<string, unknown>>,
): void {
  const source = inputSchema.parse(rawSource);
  const filer = pending.f1040 as Record<string, unknown> | undefined;
  const first = filer?.taxpayer_first_name;
  const last = filer?.taxpayer_last_name;
  const ssn = filer?.taxpayer_ssn;
  if (
    typeof first !== "string" || typeof last !== "string" ||
    typeof ssn !== "string"
  ) {
    throw new Error("Form 8874-B needs the prepared Form 1040 holder identity");
  }
  for (const recapture of source.recaptures) {
    const notice = recapture.reviewed_form8874b;
    if (
      notice.investor_name !== `${first} ${last}` ||
      notice.investor_tin !== ssn.replaceAll("-", "")
    ) {
      throw new Error("Form 8874-B investor differs from prepared Form 1040");
    }
  }
}
