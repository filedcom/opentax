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

// XSD-required element sequence from ReturnData1040.xsd.
// Any reordering here must stay in sync with the sequence in that XSD or
// xmllint will report "This element is not expected" errors.
export const ALL_MEF_FORMS = [
  // 1. IRS1040 (required)
  irs1040,
  // 2-4. Schedules 1-3
  schedule1,
  schedule2,
  schedule3,
  // 6-7. Schedule A, Schedule B
  scheduleA,
  scheduleB,
  // 9. Schedule D
  scheduleD,
  // 11. Schedule EIC (eitc)
  eitc,
  // 12. Schedule F
  scheduleF,
  // 13. Schedule H
  scheduleH,
  // 16. Schedule SE
  scheduleSE,
  // 18. Form 461
  form461,
  // 22. Form 982
  form982,
  // 26. Form 1116
  form1116,
  // Form 2441
  form2441,
  // Form 2555
  form2555,
  // Form 4137
  form4137,
  // Form 4562
  form4562,
  // Form 4684
  form4684,
  // Form 4797
  form4797,
  // Form 4952
  form4952,
  // Form 4972
  form4972,
  // Form 5329
  form5329,
  // Form 5695
  form5695,
  // Form 6198
  form6198,
  // Form 6251
  form6251,
  // Form 6252
  form6252,
  // Form 6781
  form6781,
  // Form 7206
  form7206,
  // Form 8396
  form8396,
  // Form 8582
  form8582,
  // Form 8606
  form8606,
  // Form 8615
  form8615,
  // Form 8815
  form8815,
  // Form 8824
  form8824,
  // Form 8829
  form8829,
  // Form 8839
  form8839,
  // Form 8853
  form8853,
  // Form 8880
  form8880,
  // Form 8889
  form8889,
  // Form 8919
  form8919,
  // Form 8949
  form8949,
  // Form 8959 (must come after 8949 per XSD sequence)
  form8959,
  // Form 8960
  form8960,
  // Form 8962
  form8962,
  // Form 8990
  form8990,
  // Form 8995
  form8995,
  // Form 8995A
  form8995a,
] as const;
