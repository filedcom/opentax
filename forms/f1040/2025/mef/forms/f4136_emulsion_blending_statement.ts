import { element, elements } from "../../../mef/xml.ts";
import {
  allForm4136Claims,
  form4136BlenderCertification,
  inputSchema,
} from "../../../nodes/inputs/f4136/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

// Each line 15a claim needs the blender's four-part certification.
export const form4136EmulsionBlendingStatement: MefFormDescriptor<
  "f4136_emulsion_blending_statement",
  unknown,
  readonly string[]
> = {
  pendingKey: "f4136_emulsion_blending_statement",
  sourcePendingKeys: ["f4136"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f4136.pdf",
  build(_fields, context = {}) {
    const raw = context.pending?.f4136;
    if (!raw) return [];
    const input = inputSchema.parse(raw);
    return allForm4136Claims(input).filter((claim) => claim.line === "15a").map(
      (claim) => {
        const explanation = form4136BlenderCertification(claim);
        if (explanation.length > 1000) {
          throw new Error(
            "Form 4136 blending certification exceeds the IRS statement limit",
          );
        }
        return elements("DslWaterFuelEmulsionBlndgStmt", [
          element("ShortExplanationTxt", explanation),
        ]);
      },
    );
  },
};
