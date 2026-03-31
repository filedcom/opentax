import { buildReturnHeader } from "../../mef/header.ts";
import type { MefNode } from "./form.ts";
import { irs1040 } from "./forms/f1040.ts";
import { form1116 } from "./forms/f1116.ts";
import { form2441 } from "./forms/f2441.ts";
import { form4137 } from "./forms/f4137.ts";
import { form4562 } from "./forms/f4562.ts";
import { form4797 } from "./forms/f4797.ts";
import { form4972 } from "./forms/f4972.ts";
import { form5329 } from "./forms/f5329.ts";
import { form6251 } from "./forms/f6251.ts";
import { form8582 } from "./forms/f8582.ts";
import { form8606 } from "./forms/f8606.ts";
import { form8829 } from "./forms/f8829.ts";
import { form8824 } from "./forms/f8824.ts";
import { form8839 } from "./forms/f8839.ts";
import { form8962 } from "./forms/f8962.ts";
import { form8853 } from "./forms/f8853.ts";
import { form8880 } from "./forms/f8880.ts";
import { form8889 } from "./forms/f8889.ts";
import { form8919 } from "./forms/f8919.ts";
import { form8949 } from "./forms/f8949.ts";
import { form8959 } from "./forms/f8959.ts";
import { form8960 } from "./forms/f8960.ts";
import { form8995 } from "./forms/f8995.ts";
import { form8995a } from "./forms/f8995a.ts";
import { schedule1 } from "./forms/schedule1.ts";
import { schedule2 } from "./forms/schedule2.ts";
import { schedule3 } from "./forms/schedule3.ts";
import { scheduleB } from "./forms/schedule_b.ts";
import { scheduleD } from "./forms/schedule_d.ts";
import { scheduleF } from "./forms/schedule_f.ts";
import { scheduleSE } from "./forms/schedule_se.ts";
import type { FilerIdentity, MefFormsPending } from "./types.ts";

const ALL_NODES: MefNode[] = [
  irs1040,
  schedule1,
  schedule2,
  schedule3,
  scheduleD,
  form8889,
  form2441,
  form8949,
  form8959,
  form8960,
  form4137,
  form8919,
  form4972,
  scheduleSE,
  form8606,
  form1116,
  form8582,
  scheduleF,
  scheduleB,
  form4797,
  form8880,
  form8995,
  form4562,
  form8995a,
  form6251,
  form5329,
  form8853,
  form8829,
  form8839,
  form8962,
  form8824,
];

export function buildMefXml(
  pending: MefFormsPending,
  filer?: FilerIdentity,
  schemaVersion = "2025v3.0",
  year = 2025,
  returnType = "1040",
): string {
  const forms = ALL_NODES
    .map((node) => node.build(pending))
    .filter((s) => s !== "");
  const documentCnt = forms.length;

  const innerForms = forms.join("");
  const returnData =
    `<ReturnData documentCnt="${documentCnt}">${innerForms}</ReturnData>`;

  const returnHeader = buildReturnHeader(filer, year, returnType);

  return `<Return returnVersion="${schemaVersion}" xmlns="http://www.irs.gov/efile">${returnHeader}${returnData}</Return>`;
}
