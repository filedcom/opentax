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
import { buildIRS4137 } from "./forms/f4137.ts";
import { buildIRS8919 } from "./forms/f8919.ts";
import { buildIRS4972 } from "./forms/f4972.ts";
import { buildIRS1040ScheduleSE } from "./forms/schedule_se.ts";
import { buildIRS8606 } from "./forms/f8606.ts";
import { buildIRS1116 } from "./forms/f1116.ts";
import { buildIRS8582 } from "./forms/f8582.ts";
import { buildIRS1040ScheduleF } from "./forms/schedule_f.ts";
import { buildIRS1040ScheduleB } from "./forms/schedule_b.ts";
import { buildIRS4797 } from "./forms/f4797.ts";
import { buildIRS8880 } from "./forms/f8880.ts";
import { buildIRS8995 } from "./forms/f8995.ts";
import { buildIRS4562 } from "./forms/f4562.ts";
import { buildIRS8995A } from "./forms/f8995a.ts";
import { buildIRS6251 } from "./forms/f6251.ts";
import { buildIRS5329 } from "./forms/f5329.ts";
import { buildIRS8853 } from "./forms/f8853.ts";
import { buildIRS8829 } from "./forms/f8829.ts";
import { buildIRS8839 } from "./forms/f8839.ts";
import type { FilerIdentity, MefFormsPending } from "./types.ts";

export function buildMefXml(
  pending: MefFormsPending,
  filer?: FilerIdentity,
  schemaVersion = "2025v3.0",
  year = 2025,
  returnType = "1040",
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
  const f4137Xml = buildIRS4137(pending.form4137 ?? {});
  const f8919Xml = buildIRS8919(pending.form8919 ?? {});
  const f4972Xml = buildIRS4972(pending.form4972 ?? {});
  const scheduleSEXml = buildIRS1040ScheduleSE(pending.schedule_se ?? {});
  const f8606Xml = buildIRS8606(pending.form8606 ?? {});
  const f1116Xml = buildIRS1116(pending.form_1116 ?? {});
  const f8582Xml = buildIRS8582(pending.form8582 ?? {});
  const scheduleFXml = buildIRS1040ScheduleF(pending.schedule_f ?? {});
  const scheduleBXml = buildIRS1040ScheduleB(pending.schedule_b ?? {});
  const f4797Xml = buildIRS4797(pending.form4797 ?? {});
  const f8880Xml = buildIRS8880(pending.form8880 ?? {});
  const f8995Xml = buildIRS8995(pending.form8995 ?? {});
  const f4562Xml = buildIRS4562(pending.form4562 ?? {});
  const f8995aXml = buildIRS8995A(pending.form8995a ?? {});
  const f6251Xml = buildIRS6251(pending.form6251 ?? {});
  const f5329Xml = buildIRS5329(pending.form5329 ?? {});
  const f8853Xml = buildIRS8853(pending.form8853 ?? {});
  const f8829Xml = buildIRS8829(pending.form_8829 ?? {});
  const f8839Xml = buildIRS8839(pending.form8839 ?? {});

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
    f4137Xml,
    f8919Xml,
    f4972Xml,
    scheduleSEXml,
    f8606Xml,
    f1116Xml,
    f8582Xml,
    scheduleFXml,
    scheduleBXml,
    f4797Xml,
    f8880Xml,
    f8995Xml,
    f4562Xml,
    f8995aXml,
    f6251Xml,
    f5329Xml,
    f8853Xml,
    f8829Xml,
    f8839Xml,
  ].filter((s) => s !== "");
  const documentCnt = forms.length;

  const innerForms = forms.join("");
  const returnData = `<ReturnData documentCnt="${documentCnt}">${innerForms}</ReturnData>`;

  const returnHeader = buildReturnHeader(filer, year, returnType);

  return `<Return returnVersion="${schemaVersion}" xmlns="http://www.irs.gov/efile">${returnHeader}${returnData}</Return>`;
}
