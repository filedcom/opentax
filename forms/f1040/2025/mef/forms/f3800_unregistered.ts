import type { MefFormDescriptor } from "../form-descriptor.ts";

type PendingForm3800 = {
  readonly allowed_credit?: number;
  readonly f8826_credit_entries?: readonly { readonly credit_amount: number }[];
  readonly f8835_credit_entries?: readonly { readonly credit_amount: number }[];
  readonly f3800s?: readonly Readonly<Record<string, unknown>>[];
};

/** Fail closed until the source-backed IRS3800 and attachments are registered. */
export const form3800Unregistered: MefFormDescriptor<
  "f3800",
  PendingForm3800,
  string
> = {
  pendingKey: "f3800",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f3800.pdf",
  build(fields) {
    const hasSourceCredit = fields.allowed_credit !== undefined ||
      fields.f8826_credit_entries?.some((entry) => entry.credit_amount > 0) ||
      fields.f8835_credit_entries?.some((entry) => entry.credit_amount > 0);
    const hasLegacyCredit = fields.f3800s?.some((entry) =>
      Object.values(entry).some((value) =>
        typeof value === "number" && value > 0
      )
    );
    if (hasSourceCredit || hasLegacyCredit) {
      throw new Error(
        "Form 3800 credit cannot be exported until IRS3800 and its source documents are registered",
      );
    }
    return "";
  },
};
