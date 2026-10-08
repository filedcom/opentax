import { inputSchema } from "../../../../nodes/intermediate/forms/form8839/index.ts";
import { projectStagedForm8839Documents } from "../../../../nodes/intermediate/forms/form8839/staged_documents.ts";
import { parsePublicForm8839Source } from "../../../../nodes/intermediate/forms/form8839/public_source.ts";
import { f1040 } from "../../../../nodes/outputs/f1040/index.ts";
import type { MefFormDescriptor } from "../../form-descriptor.ts";

type Input = unknown;

export const FIELD_MAP: ReadonlyArray<readonly [string, string]> = [];

export const form8839: MefFormDescriptor<"form8839", Input> = {
  pendingKey: "form8839",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8839.pdf",
  build(rawFields, context) {
    if (Array.isArray(rawFields) && rawFields.length === 0) return "";
    if (!rawFields || typeof rawFields !== "object") return "";
    if (Object.keys(rawFields).length === 0) {
      throw new Error("Form 8839 MeF cannot file an empty pending record");
    }
    const source = inputSchema.parse(rawFields);
    if ((source.adoption_benefits ?? 0) > 0) {
      throw new Error(
        "Form 8839 employer adoption benefits remain unsupported",
      );
    }
    if ((source.children?.length ?? 0) === 0) return "";
    const route = context?.pending?.form8839_route as
      | { public_source?: unknown; pre_adoption_sink_input?: unknown }
      | undefined;
    if (!route || !context?.pending || !context.filer) {
      throw new Error("Form 8839 needs its reviewed prepared return route");
    }
    const publicSource = parsePublicForm8839Source(route.public_source);
    return projectStagedForm8839Documents(
      publicSource.source,
      publicSource.publicSource.reviewed_source,
      f1040.inputSchema.parse(route.pre_adoption_sink_input),
      publicSource.publicSource.magi_review,
      context.pending,
      context.filer,
    ).xml;
  },
};
