import { buildReturnHeader } from "../../mef/header.ts";
import { ALL_MEF_FORMS } from "./forms/index.ts";
import type { FilerIdentity, MefFormsPending } from "./types.ts";

export function buildMefXml(
  pending: MefFormsPending,
  filer?: FilerIdentity,
  schemaVersion = "2025v3.0",
  year = 2025,
  returnType = "1040",
): string {
  // Build each form and inject the required documentId attribute into the root element.
  // documentId must be unique per return; using the element tag name satisfies this
  // for single-occurrence forms (the common case).
  const forms = ALL_MEF_FORMS
    .map((form, idx) => {
      const xml = form.build(
        (pending[form.pendingKey as keyof MefFormsPending] ?? []) as never,
      );
      if (xml === "") return "";
      // Inject documentId into the root element opening tag
      return xml.replace(/^<([A-Za-z0-9]+)>/, (_, tag) => `<${tag} documentId="${tag}${idx}">`);
    })
    .filter((s) => s !== "");
  const documentCnt = forms.length;

  const innerForms = forms.join("");
  const returnData =
    `<ReturnData documentCnt="${documentCnt}">${innerForms}</ReturnData>`;

  const returnHeader = buildReturnHeader(filer, year, returnType);

  return `<Return returnVersion="${schemaVersion}" xmlns="http://www.irs.gov/efile" xmlns:efile="http://www.irs.gov/efile">${returnHeader}${returnData}</Return>`;
}
