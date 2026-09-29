import type { PdfFormDescriptor } from "../form-descriptor.ts";
import { irs1040Pdf } from "./f1040.ts";
import { schedule1aPdf } from "./schedule1a.ts";
import { schedule8812Pdf } from "./schedule_8812.ts";
import { schedule1Pdf } from "./schedule1.ts";
import { schedule2Pdf } from "./schedule2.ts";
import { schedule3Pdf } from "./schedule3.ts";
import { scheduleAPdf } from "./schedule_a.ts";
import { scheduleBPdf } from "./schedule_b.ts";
import { scheduleDPdf } from "./schedule_d.ts";
import { scheduleEPdf } from "./schedule_e.ts";
import { scheduleEStockLossPdf } from "./schedule_e_stock_loss.ts";
import { form7203StockLossPdf } from "./f7203_stock_loss.ts";
import { scheduleCPdf } from "./schedule_c.ts";
import { eitcPdf } from "./eitc.ts";
import { scheduleFPdf } from "./schedule_f.ts";
import { scheduleHPdf } from "./schedule_h.ts";
import { scheduleJPdf } from "./schedule_j.ts";
import { scheduleLepPdf } from "./schedule_lep.ts";
import { scheduleRPdf } from "./schedule_r.ts";
import { scheduleSePdf } from "./schedule_se.ts";
import { form461Pdf } from "./f461.ts";
import { form982Pdf } from "./f982.ts";
import { form1116Pdf } from "./f1116.ts";
import { form1116ScheduleBPdf } from "./f1116_schedule_b.ts";
import { form2210fPdf } from "./f2210f.ts";
import { form2439Pdf } from "./f2439.ts";
import { form2441Pdf } from "./f2441.ts";
import { form2555Pdf } from "./f2555.ts";
import { form4137Pdf } from "./f4137.ts";
import { form4136Pdf } from "./f4136.ts";
import { form3800Pdf } from "./f3800.ts";
import { form4136ScheduleAPdf } from "./f4136_schedule_a.ts";
import { form4562Pdf } from "./f4562.ts";
import { form4684Pdf } from "./f4684.ts";
import { form4797Pdf } from "./f4797.ts";
import { form4835Pdf } from "./f4835.ts";
import { form4952Pdf } from "./f4952.ts";
import { form4972Pdf } from "./f4972.ts";
import { form5329Pdf } from "./f5329.ts";
import { form5695Pdf } from "./f5695.ts";
import { form5884Pdf } from "./f5884.ts";
import { form6198Pdf } from "./f6198.ts";
import { form6251Pdf } from "./f6251.ts";
import { form6252Pdf } from "./f6252.ts";
import { form6781Pdf } from "./f6781.ts";
import { form7206Pdf } from "./f7206.ts";
import { form7217Pdf } from "./f7217.ts";
import { form8283Pdf } from "./f8283.ts";
import { form8396Pdf } from "./f8396.ts";
import { form8582Pdf } from "./f8582.ts";
import { form8606Pdf } from "./f8606.ts";
import { form8615Pdf } from "./f8615.ts";
import { form8814Pdf } from "./f8814.ts";
import { form8815Pdf } from "./f8815.ts";
import { form8820Pdf } from "./f8820.ts";
import { form8824Pdf } from "./f8824.ts";
import { form8829Pdf } from "./f8829.ts";
import { form8834Pdf } from "./f8834.ts";
import { form8835Pdf } from "./f8835.ts";
import { form8839Pdf } from "./f8839.ts";
import { form8853Pdf } from "./f8853.ts";
import { form8859Pdf } from "./f8859.ts";
import { form8862Pdf } from "./f8862.ts";
import { form8863Pdf } from "./f8863.ts";
import { form8874Pdf } from "./f8874.ts";
import { form8880Pdf } from "./f8880.ts";
import { form8888Pdf } from "./f8888.ts";
import { form8889Pdf } from "./f8889.ts";
import { form8911Pdf } from "./f8911.ts";
import { form8911ScheduleAPdf } from "./f8911_schedule_a.ts";
import { form8919Pdf } from "./f8919.ts";
import { form8912Pdf } from "./f8912.ts";
import { form8936Pdf } from "./f8936.ts";
import { form8936ScheduleAPdf } from "./f8936_schedule_a.ts";
import { form8949Pdf } from "./f8949.ts";
import { form8959Pdf } from "./f8959.ts";
import { form8960Pdf } from "./f8960.ts";
import { form8962Pdf } from "./f8962.ts";
import { form8978Pdf } from "./f8978.ts";
import { form8978ScheduleAPdf } from "./f8978_schedule_a.ts";
import { form8990Pdf } from "./f8990.ts";
import { form8995Pdf } from "./f8995.ts";
import { form8995aPdf } from "./f8995a.ts";
import { form8995aScheduleAPdf } from "./f8995a_schedule_a.ts";
import { form8995aScheduleBPdf } from "./f8995a_schedule_b.ts";
import { form8995aScheduleCPdf } from "./f8995a_schedule_c.ts";
import { form8995aScheduleDPdf } from "./f8995a_schedule_d.ts";

export const ALL_PDF_FORMS: readonly PdfFormDescriptor[] = [
  irs1040Pdf,
  schedule1Pdf,
  schedule1aPdf,
  schedule2Pdf,
  schedule3Pdf,
  schedule8812Pdf,
  scheduleAPdf,
  scheduleBPdf,
  scheduleCPdf,
  scheduleDPdf,
  scheduleEPdf,
  scheduleEStockLossPdf,
  eitcPdf,
  scheduleFPdf,
  scheduleHPdf,
  scheduleJPdf,
  scheduleLepPdf,
  scheduleRPdf,
  scheduleSePdf,
  form7203StockLossPdf,
  form461Pdf,
  form982Pdf,
  form1116Pdf,
  form1116ScheduleBPdf,
  form2210fPdf,
  form2439Pdf,
  form2441Pdf,
  form2555Pdf,
  form4136Pdf,
  form3800Pdf,
  form4136ScheduleAPdf,
  form4137Pdf,
  form4562Pdf,
  form4684Pdf,
  form4797Pdf,
  form4835Pdf,
  form4952Pdf,
  form4972Pdf,
  form5329Pdf,
  form5695Pdf,
  form5884Pdf,
  form6198Pdf,
  form6251Pdf,
  form6252Pdf,
  form6781Pdf,
  form7206Pdf,
  form7217Pdf,
  form8283Pdf,
  form8396Pdf,
  form8582Pdf,
  form8606Pdf,
  form8615Pdf,
  form8814Pdf,
  form8815Pdf,
  form8820Pdf,
  form8824Pdf,
  form8829Pdf,
  form8834Pdf,
  form8835Pdf,
  form8839Pdf,
  form8853Pdf,
  form8859Pdf,
  form8862Pdf,
  form8863Pdf,
  form8874Pdf,
  form8880Pdf,
  form8888Pdf,
  form8889Pdf,
  form8911Pdf,
  form8911ScheduleAPdf,
  form8912Pdf,
  form8919Pdf,
  form8936Pdf,
  form8936ScheduleAPdf,
  form8949Pdf,
  form8959Pdf,
  form8960Pdf,
  form8962Pdf,
  form8978Pdf,
  form8978ScheduleAPdf,
  form8990Pdf,
  form8995Pdf,
  form8995aPdf,
  form8995aScheduleAPdf,
  form8995aScheduleBPdf,
  form8995aScheduleCPdf,
  form8995aScheduleDPdf,
];
