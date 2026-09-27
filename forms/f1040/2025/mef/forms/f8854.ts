import {
  inputSchema,
  isCoveredExpatriate,
} from "../../../nodes/inputs/f8854/index.ts";
import { ReportedFormCode } from "../../../nodes/inputs/f8854/section-c.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";
import {
  buildForm8854InitialBundle,
  buildForm8854InitialDocument,
  buildForm8854NativeStatementContents,
  linkForm8854NativeStatementIds,
} from "./f8854_initial.ts";

export const form8854: MefFormDescriptor<"f8854", unknown> = {
  pendingKey: "f8854",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8854.pdf",
  build(fields, context) {
    if (Array.isArray(fields) && fields.length === 0) return "";
    if (context?.pending?.f8854_annual !== undefined) {
      throw new Error(
        "One taxpayer cannot file both initial and annual Form 8854 for 2025",
      );
    }
    const input = inputSchema.parse(fields);
    if (input.section_d.elect_deferral) {
      throw new Error(
        "Form 8854 Section D deferral needs verified binary attachments",
      );
    }
    if (isCoveredExpatriate(input)) {
      const section = input.section_c;
      if (
        section === null ||
        section.mark_to_market_assets.some((asset) =>
          asset.reported_form_code !== ReportedFormCode.Form8949
        ) ||
        section.eligible_deferred_compensation.length > 0 ||
        section.ineligible_deferred_compensation.length > 0 ||
        section.specified_tax_deferred_accounts.length > 0 ||
        section.nongrantor_trust_interests.length > 0
      ) {
        throw new Error(
          "Form 8854 covered filing needs reconciled income forms for non-Form 8949 Section C items",
        );
      }
    } else if (input.section_c !== null) {
      throw new Error("Noncovered Form 8854 cannot include Section C");
    }
    const pending = { form8949: context?.pending?.form8949 };
    const contents = buildForm8854NativeStatementContents(input);
    if (!context?.documentIdsByPendingKey) {
      return buildForm8854InitialDocument(
        input,
        {
          balanceSheet: {},
          sectionC: {},
          binaryAttachments: [],
        },
        pending,
        "discover",
      );
    }
    const links = linkForm8854NativeStatementIds(
      contents,
      context.documentIdsByPendingKey.f8854_native_statements ?? [],
      [],
    );
    return buildForm8854InitialBundle(input, links, pending).formXml;
  },
};
