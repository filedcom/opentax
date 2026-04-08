import type { PdfFormDescriptor } from "../form-descriptor.ts";
import { irs1040Pdf } from "./f1040.ts";
import { schedule1Pdf } from "./schedule1.ts";
import { schedule2Pdf } from "./schedule2.ts";
import { schedule3Pdf } from "./schedule3.ts";
import { scheduleAPdf } from "./schedule_a.ts";
import { scheduleBPdf } from "./schedule_b.ts";
import { scheduleDPdf } from "./schedule_d.ts";
import { eitcPdf } from "./eitc.ts";
import { scheduleFPdf } from "./schedule_f.ts";
import { scheduleHPdf } from "./schedule_h.ts";
import { scheduleSePdf } from "./schedule_se.ts";
import { form461Pdf } from "./f461.ts";
import { form982Pdf } from "./f982.ts";
import { form1116Pdf } from "./f1116.ts";
import { form2441Pdf } from "./f2441.ts";
import { form2555Pdf } from "./f2555.ts";
import { form4137Pdf } from "./f4137.ts";
import { form4562Pdf } from "./f4562.ts";
import { form4684Pdf } from "./f4684.ts";
import { form4797Pdf } from "./f4797.ts";
import { form4952Pdf } from "./f4952.ts";
import { form4972Pdf } from "./f4972.ts";
import { form5329Pdf } from "./f5329.ts";
import { form5695Pdf } from "./f5695.ts";
import { form6198Pdf } from "./f6198.ts";
import { form6251Pdf } from "./f6251.ts";
import { form6252Pdf } from "./f6252.ts";
import { form6781Pdf } from "./f6781.ts";
import { form7206Pdf } from "./f7206.ts";
import { form8396Pdf } from "./f8396.ts";
import { form8582Pdf } from "./f8582.ts";
import { form8606Pdf } from "./f8606.ts";
import { form8615Pdf } from "./f8615.ts";
import { form8815Pdf } from "./f8815.ts";
import { form8824Pdf } from "./f8824.ts";
import { form8829Pdf } from "./f8829.ts";
import { form8839Pdf } from "./f8839.ts";
import { form8853Pdf } from "./f8853.ts";
import { form8880Pdf } from "./f8880.ts";
import { form8889Pdf } from "./f8889.ts";
import { form8919Pdf } from "./f8919.ts";
// form8949 uses a transaction-array structure incompatible with AcroForm field mapping — excluded.
import { form8959Pdf } from "./f8959.ts";
import { form8960Pdf } from "./f8960.ts";
import { form8962Pdf } from "./f8962.ts";
import { form8990Pdf } from "./f8990.ts";
import { form8995Pdf } from "./f8995.ts";
import { form8995aPdf } from "./f8995a.ts";

export const ALL_PDF_FORMS: readonly PdfFormDescriptor[] = [
  irs1040Pdf,
  schedule1Pdf,
  schedule2Pdf,
  schedule3Pdf,
  scheduleAPdf,
  scheduleBPdf,
  scheduleDPdf,
  eitcPdf,
  scheduleFPdf,
  scheduleHPdf,
  scheduleSePdf,
  form461Pdf,
  form982Pdf,
  form1116Pdf,
  form2441Pdf,
  form2555Pdf,
  form4137Pdf,
  form4562Pdf,
  form4684Pdf,
  form4797Pdf,
  form4952Pdf,
  form4972Pdf,
  form5329Pdf,
  form5695Pdf,
  form6198Pdf,
  form6251Pdf,
  form6252Pdf,
  form6781Pdf,
  form7206Pdf,
  form8396Pdf,
  form8582Pdf,
  form8606Pdf,
  form8615Pdf,
  form8815Pdf,
  form8824Pdf,
  form8829Pdf,
  form8839Pdf,
  form8853Pdf,
  form8880Pdf,
  form8889Pdf,
  form8919Pdf,
  // form8949 excluded: uses transaction-array structure, not AcroForm field mapping
  form8959Pdf,
  form8960Pdf,
  form8962Pdf,
  form8990Pdf,
  form8995Pdf,
  form8995aPdf,
];
