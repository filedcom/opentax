import {
  type Form8839Input,
  inputSchema,
} from "../../../nodes/intermediate/forms/form8839/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

type Input = Form8839Input | readonly [];

export const FIELD_MAP: ReadonlyArray<readonly [string, string]> = [];

export const form8839: MefFormDescriptor<"form8839", Input> = {
  pendingKey: "form8839",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8839.pdf",
  build(rawFields) {
    if (Array.isArray(rawFields) && rawFields.length === 0) return "";
    if (Object.keys(rawFields).length === 0) {
      throw new Error("Form 8839 MeF cannot file an empty pending record");
    }
    inputSchema.parse(rawFields);
    throw new Error(
      "Form 8839 MeF filing needs source-verified adoption eligibility, unreimbursed expenses, finalized-return MAGI, and credit-limit capacity",
    );
  },
};
