import { buildMedicareJointDocumentParts } from "./f8853.ts";
import type { MefFormDescriptor } from "../../../form-descriptor.ts";
import {
  type Form8853Input,
  inputSchema,
} from "../../../../../nodes/intermediate/forms/adjustments/health/form8853/index.ts";

export const form8853MedicareStatements: MefFormDescriptor<
  "form8853",
  Form8853Input | readonly [],
  readonly string[]
> = {
  pendingKey: "form8853",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8853--2025.pdf",
  build(raw, context) {
    if (Array.isArray(raw) && raw.length === 0) return [];
    const fields = inputSchema.parse(raw);
    if (!fields.medicare_joint_distribution_ledgers) return [];
    return buildMedicareJointDocumentParts(fields, context).statements;
  },
};
