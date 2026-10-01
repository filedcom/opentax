import type { MefFormDescriptor } from "../form-descriptor.ts";
import { inputSchema } from "../../../nodes/inputs/f2106/index.ts";
import {
  buildStagedIRS2106,
  reconcileFileableForm2106Return,
} from "../../form2106_staged.ts";

export const form2106: MefFormDescriptor<
  "f2106",
  { f2106s?: readonly unknown[] },
  readonly string[]
> = {
  pendingKey: "f2106",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f2106--2025.pdf",
  build(fields, context) {
    if (!fields.f2106s?.length) return [];
    if (!context?.pending) {
      throw new Error("Form 2106 native export needs finalized return source");
    }
    const submitted = inputSchema.parse(fields);
    const pending = inputSchema.parse(context.pending.f2106);
    if (JSON.stringify(submitted) !== JSON.stringify(pending)) {
      throw new Error("Form 2106 native document differs from job source");
    }
    const { jobs } = reconcileFileableForm2106Return(context.pending);
    return jobs.map(({ source }) => buildStagedIRS2106(source));
  },
};
