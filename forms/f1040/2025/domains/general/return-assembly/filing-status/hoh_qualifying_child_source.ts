import { z } from "zod";
import {
  hohQualifyingChildFromGeneral,
  inputSchema as generalInputSchema,
} from "../../../../../nodes/inputs/general/filing/general/index.ts";

const filedChildSchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  ssn: z.string(),
}).strict();

/** Bind the nondependent HOH child printed on Form 1040 to the reviewed source. */
export function assertHohQualifyingChildSource(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>>,
): void {
  const filed = fields.hoh_qualifying_child;
  const raw = pending.general;
  const sourceNamesChild = raw !== null && typeof raw === "object" &&
    ("hoh_qualifying_person_name" in raw ||
      "hoh_qualifying_person_relationship" in raw);
  if (!sourceNamesChild && filed === undefined) return;
  if (raw === undefined) {
    throw new Error(
      "Form 1040 HOH qualifying child needs retained general source",
    );
  }
  const source = generalInputSchema.parse(raw);
  const expected = hohQualifyingChildFromGeneral(source);
  if (expected === undefined && filed === undefined) return;
  const parsed = filedChildSchema.safeParse(filed);
  if (
    !parsed.success || expected === undefined ||
    parsed.data.first_name !== expected.first_name ||
    parsed.data.last_name !== expected.last_name ||
    parsed.data.ssn !== expected.ssn
  ) {
    throw new Error(
      "Form 1040 HOH qualifying child differs from the reviewed custody source",
    );
  }
}
