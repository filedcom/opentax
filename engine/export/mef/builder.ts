import { buildReturnHeader } from "./header.ts";
import { buildIRS1040 } from "./forms/f1040.ts";
import { buildIRS1040Schedule1 } from "./forms/schedule1.ts";
import { buildIRS1040Schedule2 } from "./forms/schedule2.ts";
import { buildIRS1040Schedule3 } from "./forms/schedule3.ts";
import { buildIRS1040ScheduleD } from "./forms/schedule_d.ts";
import { buildIRS8889 } from "./forms/f8889.ts";
import { buildIRS2441 } from "./forms/f2441.ts";
import { buildIRS8949 } from "./forms/f8949.ts";
import { buildIRS8959 } from "./forms/f8959.ts";
import { buildIRS8960 } from "./forms/f8960.ts";
import type { FilerIdentity, MefFormsPending } from "./types.ts";

export function buildMefXml(
  pending: MefFormsPending,
  filer?: FilerIdentity,
): string {
  const f1040Xml = buildIRS1040(pending.f1040 ?? {});
  const schedule1Xml = buildIRS1040Schedule1(pending.schedule1 ?? {});
  const schedule2Xml = buildIRS1040Schedule2(pending.schedule2 ?? {});
  const schedule3Xml = buildIRS1040Schedule3(pending.schedule3 ?? {});
  const scheduleDXml = buildIRS1040ScheduleD(pending.schedule_d ?? {});
  const f8889Xml = buildIRS8889(pending.form8889 ?? {});
  const f2441Xml = buildIRS2441(pending.form2441 ?? {});
  const f8949Xml = buildIRS8949(pending.form8949 ?? []);
  const f8959Xml = buildIRS8959(pending.form8959 ?? {});
  const f8960Xml = buildIRS8960(pending.form8960 ?? {});

  const forms = [
    f1040Xml,
    schedule1Xml,
    schedule2Xml,
    schedule3Xml,
    scheduleDXml,
    f8889Xml,
    f2441Xml,
    f8949Xml,
    f8959Xml,
    f8960Xml,
  ].filter((s) => s !== "");
  const documentCnt = forms.length;

  const innerForms = forms.join("");
  const returnData = `<ReturnData documentCnt="${documentCnt}">${innerForms}</ReturnData>`;

  const returnHeader = buildReturnHeader(filer);

  return `<Return returnVersion="2025v3.0" xmlns="http://www.irs.gov/efile">${returnHeader}${returnData}</Return>`;
}
