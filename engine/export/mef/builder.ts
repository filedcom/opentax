import { buildReturnHeader } from "./header.ts";
import { buildIRS1040 } from "./forms/f1040.ts";
import { buildIRS1040Schedule1 } from "./forms/schedule1.ts";
import { buildIRS1040Schedule2 } from "./forms/schedule2.ts";
import { buildIRS1040Schedule3 } from "./forms/schedule3.ts";
import type { FilerIdentity, MefFormsPending } from "./types.ts";

export function buildMefXml(
  pending: MefFormsPending,
  filer?: FilerIdentity,
): string {
  const f1040Xml = buildIRS1040(pending.f1040 ?? {});
  const schedule1Xml = buildIRS1040Schedule1(pending.schedule1 ?? {});
  const schedule2Xml = buildIRS1040Schedule2(pending.schedule2 ?? {});
  const schedule3Xml = buildIRS1040Schedule3(pending.schedule3 ?? {});

  const forms = [f1040Xml, schedule1Xml, schedule2Xml, schedule3Xml].filter(
    (s) => s !== "",
  );
  const documentCnt = forms.length;

  const innerForms = forms.join("");
  const returnData = `<ReturnData documentCnt="${documentCnt}">${innerForms}</ReturnData>`;

  const returnHeader = buildReturnHeader(filer);

  return `<Return returnVersion="2025v3.0" xmlns="http://www.irs.gov/efile">${returnHeader}${returnData}</Return>`;
}
