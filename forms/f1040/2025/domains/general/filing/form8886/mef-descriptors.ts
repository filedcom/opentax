import type { MefFormDescriptor } from "../../../../mef/form-descriptor.ts";
import { assertAuthenticForm8886ReturnPackets } from "./return-packets.ts";
import {
  form8886NativeReturnFragments,
  Form8886PendingKey,
} from "./native-return.ts";

function descriptor(
  key: Form8886PendingKey,
): MefFormDescriptor<Form8886PendingKey, unknown, readonly string[]> {
  return {
    pendingKey: key,
    FIELD_MAP: [],
    pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8886.pdf",
    build(_fields, context) {
      const prepared = context?.preparedForm8886;
      if (!prepared) {
        throw new Error(
          "Form 8886 requires authenticated prepared disclosure packets",
        );
      }
      assertAuthenticForm8886ReturnPackets(prepared);
      const ids = context?.documentIdsByPendingKey;
      if (context?.phase === "final" && !ids) {
        throw new Error(
          "Form 8886 final assembly requires whole-return document IDs",
        );
      }
      const assigned = context?.phase === "final"
        ? {
          form8886: [...(ids?.[Form8886PendingKey.Form] ?? [])],
          form8886_expected_benefits: [
            ...(ids?.[Form8886PendingKey.ExpectedBenefits] ?? []),
          ],
          form8886_additional_details: [
            ...(ids?.[Form8886PendingKey.AdditionalDetails] ?? []),
          ],
        }
        : undefined;
      return form8886NativeReturnFragments(prepared, assigned)
        .filter((row) => row.pendingKey === key).map((row) => row.xml);
    },
  };
}

export const form8886 = descriptor(Form8886PendingKey.Form);
export const form8886ExpectedBenefits = descriptor(
  Form8886PendingKey.ExpectedBenefits,
);
export const form8886AdditionalDetails = descriptor(
  Form8886PendingKey.AdditionalDetails,
);
