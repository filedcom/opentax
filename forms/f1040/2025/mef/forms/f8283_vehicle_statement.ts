import { inputSchema } from "../../../nodes/inputs/f8283/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";
import {
  buildVehicleStatement,
  needsSectionBVehicleStatement,
  needsVehicleStatement,
} from "./f8283.ts";

// ReturnData1040.xsd places this supporting document after the numbered forms.
// Its own descriptor preserves that sequence and lets IRS8283 reference its ID.
export const form8283VehicleStatement: MefFormDescriptor<
  "form8283_vehicle_statement",
  unknown,
  readonly string[]
> = {
  pendingKey: "form8283_vehicle_statement",
  sourcePendingKeys: ["f8283"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1098c--2025.pdf",
  build(_fields, context = {}) {
    const raw = context.pending?.f8283;
    if (raw === undefined) return [];
    const parsed = inputSchema.parse(raw);
    return [
      ...(parsed.section_a_items ?? []).filter(needsVehicleStatement),
      ...(parsed.section_b_items ?? []).filter(needsSectionBVehicleStatement),
    ].map((item) => buildVehicleStatement(item, context));
  },
};
