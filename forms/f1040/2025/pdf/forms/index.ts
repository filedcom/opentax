import { form4852RetainedPdf } from "./income/wages/f4852_retained.ts";
import type { PdfFormDescriptor } from "../review-support/form-descriptor.ts";
import { irs1040Pdf } from "./general/return-assembly/f1040.ts";
import { schedule1aPdf } from "./deductions/additional/schedule1a/schedule1a.ts";
import { schedule8812Pdf } from "./credits/individual/schedule_8812.ts";
import { schedule1Pdf } from "./general/return-assembly/schedule1/schedule1.ts";
import { schedule2Pdf } from "./taxes/other/schedule2.ts";
import { schedule3Pdf } from "./general/return-assembly/schedule3.ts";
import { scheduleAPdf } from "./deductions/itemized/schedule_a.ts";
import { scheduleBPdf } from "./income/investments/schedule_b/schedule_b.ts";
import { scheduleDPdf } from "./income/investments/schedule_d.ts";
import { scheduleEPdf } from "./income/rental-passthrough/schedule_e.ts";
import { scheduleEStockLossPdf } from "./income/rental-passthrough/schedule_e_stock_loss.ts";
import { form7203StockLossPdf } from "./income/business/f7203_stock_loss.ts";
import { scheduleCPdf } from "./income/business/schedule_c.ts";
import { eitcPdf } from "./credits/earned-income/eitc.ts";
import { scheduleFPdf } from "./income/business/schedule_f.ts";
import { scheduleHPdf } from "./taxes/household-employment/schedule_h.ts";
import { scheduleJPdf } from "./taxes/income-averaging/schedule_j.ts";
import { scheduleLepPdf } from "./general/return-assembly/schedule_lep.ts";
import { form9000Pdf } from "./general/return-assembly/f9000.ts";
import { scheduleRPdf } from "./credits/individual/schedule_r.ts";
import { scheduleSePdf } from "./taxes/self-employment/schedule_se.ts";
import { form461Pdf } from "./income/business/f461.ts";
import { form982Pdf } from "./income/other/f982.ts";
import { form1116Pdf } from "./credits/foreign/f1116/f1116.ts";
import { form2106Pdf } from "./adjustments/employment/f2106.ts";
import { form1116ScheduleBPdf } from "./credits/foreign/f1116/f1116_schedule_b.ts";
import { form2210fPdf } from "./taxes/underpayment/f2210f.ts";
import { form2439Pdf } from "./payments/investments/f2439.ts";
import { form2441Pdf } from "./credits/individual/f2441.ts";
import { form2555Pdf } from "./income/foreign/f2555.ts";
import { form4137Pdf } from "./taxes/employment/f4137.ts";
import { form4136Pdf } from "./credits/business/f4136.ts";
import { form4255Pdf } from "./taxes/credit-recapture/f4255.ts";
import { form3800Pdf } from "./credits/business/f3800/f3800.ts";
import { form3468Pdf } from "./credits/business/f3468.ts";
import { form4136ScheduleAPdf } from "./credits/business/f4136_schedule_a.ts";
import { form4562Pdf } from "./deductions/business/f4562.ts";
import { form4684Pdf } from "./deductions/casualty/f4684.ts";
import { form4797Pdf } from "./income/business/f4797.ts";
import { form4835Pdf } from "./income/business/f4835.ts";
import { form4952Pdf } from "./deductions/investments/f4952.ts";
import { form4972Pdf } from "./taxes/retirement/f4972.ts";
import { form5329Pdf } from "./taxes/retirement/f5329.ts";
import { form5471Pdf } from "./general/foreign/f5471/f5471.ts";
import { form5471ScheduleEPdf } from "./general/foreign/f5471/f5471_schedule_e.ts";
import { form5471ScheduleHPdf } from "./general/foreign/f5471/f5471_schedule_h.ts";
import { form5471ScheduleI1Pdf } from "./general/foreign/f5471/f5471_schedule_i1.ts";
import { form5471ScheduleJPdf } from "./general/foreign/f5471/f5471_schedule_j.ts";
import { form5471ScheduleMPdf } from "./general/foreign/f5471/f5471_schedule_m.ts";
import { form5471SchedulePPdf } from "./general/foreign/f5471/f5471_schedule_p.ts";
import { form5471ScheduleQPdf } from "./general/foreign/f5471/f5471_schedule_q.ts";
import { form5471ScheduleRPdf } from "./general/foreign/f5471/f5471_schedule_r.ts";
import { form5695Pdf } from "./credits/individual/f5695.ts";
import { form5884Pdf } from "./credits/business/f5884.ts";
import { form8844Pdf } from "./credits/business/f8844.ts";
import { form8881Pdf } from "./credits/business/f8881.ts";
import { form8882Pdf } from "./credits/business/f8882.ts";
import { form8941Pdf } from "./credits/health/f8941.ts";
import { form6198Pdf } from "./income/business/f6198.ts";
import { form6251Pdf } from "./taxes/amt/f6251.ts";
import { form6252Pdf } from "./income/investments/f6252.ts";
import { form6781Pdf } from "./income/investments/f6781.ts";
import { form7206Pdf } from "./adjustments/health/f7206.ts";
import { form7217Pdf } from "./income/business/f7217.ts";
import { form8283Pdf } from "./deductions/charitable/f8283.ts";
import { form8396Pdf } from "./credits/individual/f8396.ts";
import { form8582Pdf } from "./income/business/f8582.ts";
import { form8606Pdf } from "./income/retirement/f8606.ts";
import { form8611Pdf } from "./taxes/credit-recapture/f8611.ts";
import { form8615Pdf } from "./taxes/investments/f8615.ts";
import { form8621Pdf } from "./income/foreign/f8621.ts";
import { form8814Pdf } from "./income/investments/f8814.ts";
import { form8815Pdf } from "./income/investments/f8815.ts";
import { form8820Pdf } from "./credits/business/f8820.ts";
import { form8824Pdf } from "./income/business/f8824.ts";
import { form8826Pdf } from "./credits/business/f8826.ts";
import { form8829Pdf } from "./deductions/business/f8829.ts";
import { form8834Pdf } from "./credits/individual/f8834.ts";
import { form8835Pdf } from "./credits/business/f8835.ts";
import { form8839Pdf } from "./credits/individual/f8839.ts";
import { form8854InitialPdf } from "./general/foreign/f8854_initial.ts";
import { form8854AnnualPdf } from "./general/foreign/f8854_annual.ts";
import { form8853Pdf } from "./adjustments/health/f8853.ts";
import { form8859Pdf } from "./credits/individual/f8859.ts";
import { form8862Pdf } from "./credits/individual/f8862.ts";
import { form8863Pdf } from "./credits/individual/f8863.ts";
import { form8864Pdf } from "./credits/business/f8864.ts";
import { form8874Pdf } from "./credits/business/f8874.ts";
import { form8582crPdf } from "./credits/business/f8582cr.ts";
import { form8880Pdf } from "./credits/individual/f8880.ts";
import { form8888Pdf } from "./payments/refund/f8888.ts";
import { form8889Pdf } from "./adjustments/health/f8889.ts";
import { form8911Pdf } from "./credits/business/f8911.ts";
import { form8911ScheduleAPdf } from "./credits/business/f8911_schedule_a.ts";
import { form8919Pdf } from "./taxes/employment/f8919.ts";
import { form8912Pdf } from "./credits/individual/f8912.ts";
import { form8915FPdf } from "./income/retirement/f8915f.ts";
import { form8936Pdf } from "./credits/individual/f8936.ts";
import { form8936ScheduleAPdf } from "./credits/individual/f8936_schedule_a.ts";
import { form8949Pdf } from "./income/investments/f8949.ts";
import { form8959Pdf } from "./taxes/employment/f8959.ts";
import { form8960Pdf } from "./taxes/investments/f8960.ts";
import { form8962Pdf } from "./credits/health/f8962.ts";
import { form8978Pdf } from "./taxes/passthrough/f8978.ts";
import { form8978ScheduleAPdf } from "./taxes/passthrough/f8978_schedule_a.ts";
import { form8990Pdf } from "./deductions/business/f8990.ts";
import { form8994Pdf } from "./credits/business/f8994.ts";
import { form8992Pdf } from "./income/foreign/f8992.ts";
import { form8992ScheduleAPdf } from "./income/foreign/f8992_schedule_a.ts";
import { form8995Pdf } from "./deductions/business/f8995/f8995.ts";
import { form965aPdf } from "./taxes/foreign/f965a.ts";
import { form8995aPdf } from "./deductions/business/f8995a.ts";
import { form8995aScheduleAPdf } from "./deductions/business/f8995a_schedule_a.ts";
import { form8995aScheduleBPdf } from "./deductions/business/f8995a_schedule_b.ts";
import { form8995aScheduleCPdf } from "./deductions/business/f8995a_schedule_c.ts";
import { form8995aScheduleDPdf } from "./deductions/business/f8995a_schedule_d.ts";
import { w2gPdf } from "./income/other/w2g.ts";

export const ALL_PDF_FORMS: readonly PdfFormDescriptor[] = [
  irs1040Pdf,
  form4852RetainedPdf,
  w2gPdf,
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
  form9000Pdf,
  scheduleRPdf,
  scheduleSePdf,
  form7203StockLossPdf,
  form461Pdf,
  form982Pdf,
  form1116Pdf,
  form1116ScheduleBPdf,
  form2106Pdf,
  form2210fPdf,
  form2439Pdf,
  form2441Pdf,
  form2555Pdf,
  form4136Pdf,
  form3468Pdf,
  form3800Pdf,
  form4136ScheduleAPdf,
  form4137Pdf,
  form4255Pdf,
  form4562Pdf,
  form4684Pdf,
  form4797Pdf,
  form4835Pdf,
  form4952Pdf,
  form4972Pdf,
  form5329Pdf,
  form5471Pdf,
  form5471ScheduleEPdf,
  form5471ScheduleHPdf,
  form5471ScheduleI1Pdf,
  form5471ScheduleJPdf,
  form5471ScheduleMPdf,
  form5471SchedulePPdf,
  form5471ScheduleQPdf,
  form5471ScheduleRPdf,
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
  form8582crPdf,
  form8606Pdf,
  form8611Pdf,
  form8615Pdf,
  form8621Pdf,
  form8814Pdf,
  form8815Pdf,
  form8820Pdf,
  form8824Pdf,
  form8826Pdf,
  form8829Pdf,
  form8834Pdf,
  form8835Pdf,
  form8839Pdf,
  form8844Pdf,
  form8881Pdf,
  form8882Pdf,
  form8854InitialPdf,
  form8854AnnualPdf,
  form8853Pdf,
  form8859Pdf,
  form8862Pdf,
  form8863Pdf,
  form8864Pdf,
  form8874Pdf,
  form8880Pdf,
  form8888Pdf,
  form8889Pdf,
  form8911Pdf,
  form8911ScheduleAPdf,
  form8912Pdf,
  form8915FPdf,
  form8919Pdf,
  form8936Pdf,
  form8936ScheduleAPdf,
  form8949Pdf,
  // QBI55 and health credit65 precede Additional Medicare/NIIT71/72.
  form8995Pdf,
  form8941Pdf,
  form8959Pdf,
  form8960Pdf,
  form8962Pdf,
  form8978Pdf,
  form8978ScheduleAPdf,
  form8990Pdf,
  form8992Pdf,
  form8992ScheduleAPdf,
  form8994Pdf,
  form965aPdf,
  form8995aPdf,
  form8995aScheduleAPdf,
  form8995aScheduleBPdf,
  form8995aScheduleCPdf,
  form8995aScheduleDPdf,
];
