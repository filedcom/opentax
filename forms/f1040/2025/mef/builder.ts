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
    .map((form) =>
      form.build(
        (pending[form.pendingKey as keyof MefFormsPending] ?? []) as never,
      )
    )
    .filter((s) => s !== "");
  const documentCnt = forms.length;

  const innerForms = forms.join("");
  const returnData =
    `<ReturnData documentCnt="${documentCnt}">${innerForms}</ReturnData>`;

  const returnHeader = buildReturnHeader(filer, year, returnType);

  return `<Return returnVersion="${schemaVersion}" xmlns="http://www.irs.gov/efile">${returnHeader}${returnData}</Return>`;
}
