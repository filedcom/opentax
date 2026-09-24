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
  const forms = ALL_MEF_FORMS
    .flatMap((form) => {
      const built = form.build(
        (pending[form.pendingKey as keyof MefFormsPending] ?? []) as never,
        { filer },
      );
      return typeof built === "string" ? [built] : built;
    })
    .filter((xml) => xml !== "")
    .map((xml, index) =>
      xml.replace(
        /^<([A-Za-z0-9]+)>/,
        (_, tag) => `<${tag} documentId="${tag}${index}">`,
      )
    );
  const documentCnt = forms.length;

  const innerForms = forms.join("");
  const returnData =
    `<ReturnData documentCnt="${documentCnt}">${innerForms}</ReturnData>`;

  const returnHeader = buildReturnHeader(filer, year, returnType);

  return `<Return returnVersion="${schemaVersion}" xmlns="http://www.irs.gov/efile" xmlns:efile="http://www.irs.gov/efile">${returnHeader}${returnData}</Return>`;
}
