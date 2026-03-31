import { eitc } from "./eitc.ts";
import { irs1040 } from "./f1040.ts";
import { form1116 } from "./f1116.ts";
import { form2441 } from "./f2441.ts";
import { form2555 } from "./f2555.ts";
import { form4137 } from "./f4137.ts";
import { form4562 } from "./f4562.ts";
import { form461 } from "./f461.ts";
import { form4684 } from "./f4684.ts";
import { form4797 } from "./f4797.ts";
import { form4952 } from "./f4952.ts";
import { form4972 } from "./f4972.ts";
import { form5329 } from "./f5329.ts";
import { form5695 } from "./f5695.ts";
import { form6198 } from "./f6198.ts";
import { form6251 } from "./f6251.ts";
import { form6252 } from "./f6252.ts";
import { form6781 } from "./f6781.ts";
import { form7206 } from "./f7206.ts";
import { form8396 } from "./f8396.ts";
import { form8582 } from "./f8582.ts";
import { form8606 } from "./f8606.ts";
import { form8615 } from "./f8615.ts";
import { form8815 } from "./f8815.ts";
import { form8824 } from "./f8824.ts";
import { form8829 } from "./f8829.ts";
import { form8839 } from "./f8839.ts";
import { form8853 } from "./f8853.ts";
import { form8880 } from "./f8880.ts";
import { form8889 } from "./f8889.ts";
import { form8919 } from "./f8919.ts";
import { form8949 } from "./f8949.ts";
import { form8959 } from "./f8959.ts";
import { form8960 } from "./f8960.ts";
import { form8962 } from "./f8962.ts";
import { form8990 } from "./f8990.ts";
import { form8995 } from "./f8995.ts";
import { form8995a } from "./f8995a.ts";
import { form982 } from "./f982.ts";
import { schedule1 } from "./schedule1.ts";
import { schedule2 } from "./schedule2.ts";
import { schedule3 } from "./schedule3.ts";
import { scheduleA } from "./schedule_a.ts";
import { scheduleB } from "./schedule_b.ts";
import { scheduleD } from "./schedule_d.ts";
import { scheduleF } from "./schedule_f.ts";
import { scheduleH } from "./schedule_h.ts";
import { scheduleSE } from "./schedule_se.ts";

export const ALL_MEF_FORMS = [
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
  eitc,
  form2555,
  form461,
  form4684,
  form4952,
  form5695,
  form6198,
  form6252,
  form6781,
  form7206,
  form8396,
  form8615,
  form8815,
  form8990,
  form982,
  scheduleH,
  scheduleA,
] as const;
