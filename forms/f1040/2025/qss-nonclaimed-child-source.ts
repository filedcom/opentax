import { z } from "zod";
import {
  inputSchema as generalInputSchema,
  qssNonclaimedChildFromGeneral,
} from "../nodes/inputs/general/index.ts";

const filedChildSchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  ssn: z.string(),
}).strict();

/** Bind the printed QSS child to the retained nondependent-child review. */
export function assertQssNonclaimedChildSource(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>>,
): void {
  const filed = fields.qss_nonclaimed_child;
  const raw = pending.general;
  const sourceNamesChild = raw !== null && typeof raw === "object" &&
    (("qss_qualifying_child_ssn" in raw &&
      raw.qss_qualifying_child_ssn !== undefined) ||
      ("qss_nonclaimed_child_review" in raw &&
        raw.qss_nonclaimed_child_review !== undefined));
  if (!sourceNamesChild && filed === undefined) return;
  if (raw === undefined) {
    throw new Error(
      "Form 1040 QSS nonclaimed child needs retained general source",
    );
  }
  const source = generalInputSchema.parse(raw);
  const expected = qssNonclaimedChildFromGeneral(source);
  const parsed = filedChildSchema.safeParse(filed);
  if (
    fields.filing_status !== "qss" || !parsed.success ||
    expected === undefined ||
    parsed.data.first_name !== expected.first_name ||
    parsed.data.last_name !== expected.last_name ||
    parsed.data.ssn !== expected.ssn
  ) {
    throw new Error(
      "Form 1040 QSS nonclaimed child differs from the reviewed source",
    );
  }
}
