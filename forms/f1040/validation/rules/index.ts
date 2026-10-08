/**
 * MeF Business Rules — All rules registry
 * Auto-generated. 137 form groups.
 */

import type { RuleDef } from "../../../../core/validation/types.ts";

import { F1040_RULES } from "./identity/f1040.ts";
import { F1040X_RULES } from "./identity/f1040x.ts";
import { F1099R_RULES } from "./income/f1099r.ts";
import { F1116_RULES } from "./international/f1116.ts";
import { F1310_RULES } from "./identity/f1310.ts";
import { F172_RULES } from "./business/f172.ts";
import { F2106_RULES } from "./deductions/f2106.ts";
import { F2120_RULES } from "./identity/f2120.ts";
import { F2210_RULES } from "./payments/f2210.ts";
import { F2210F_RULES } from "./payments/f2210f.ts";
import { F2439_RULES } from "./investments/f2439.ts";
import { F2441_RULES } from "./credits/f2441.ts";
import { F2555_RULES } from "./international/f2555.ts";
import { F3468_RULES } from "./credits/f3468.ts";
import { F3800_RULES } from "./credits/f3800.ts";
import { F4136_RULES } from "./credits/f4136.ts";
import { F4137_RULES } from "./income/f4137.ts";
import { F4255_RULES } from "./credits/f4255.ts";
import { F4562_RULES } from "./business/f4562.ts";
import { F4563_RULES } from "./international/f4563.ts";
import { F461_RULES } from "./taxes/f461.ts";
import { F4684_RULES } from "./taxes/f4684.ts";
import { F4797_RULES } from "./business/f4797.ts";
import { F4835_RULES } from "./business/f4835.ts";
import { F4952_RULES } from "./investments/f4952.ts";
import { F4972_RULES } from "./retirement/f4972.ts";
import { F5074_RULES } from "./international/f5074.ts";
import { F5329_RULES } from "./retirement/f5329.ts";
import { F5471_RULES } from "./international/f5471.ts";
import { F5695_RULES } from "./credits/f5695.ts";
import { F6252_RULES } from "./investments/f6252.ts";
import { F6765_RULES } from "./credits/f6765.ts";
import { F6781_RULES } from "./investments/f6781.ts";
import { F7204_RULES } from "./execution/f7204.ts";
import { F7205_RULES } from "./credits/f7205.ts";
import { F7206_RULES } from "./health/f7206.ts";
import { F7211_RULES } from "./execution/f7211.ts";
import { F7218_RULES } from "./execution/f7218.ts";
import { F8082_RULES } from "./execution/f8082.ts";
import { F8275_RULES } from "./execution/f8275.ts";
import { F8275R_RULES } from "./execution/f8275r.ts";
import { F8283_RULES } from "./deductions/f8283.ts";
import { F8332_RULES } from "./identity/f8332.ts";
import { F8379_RULES } from "./execution/f8379.ts";
import { F8582CR_RULES } from "./execution/f8582cr.ts";
import { F8594_RULES } from "./execution/f8594.ts";
import { F8606_RULES } from "./retirement/f8606.ts";
import { F8609A_RULES } from "./credits/f8609a.ts";
import { F8615_RULES } from "./investments/f8615.ts";
import { F8621_RULES } from "./international/f8621.ts";
import { F8689_RULES } from "./international/f8689.ts";
import { F8697_RULES } from "./execution/f8697.ts";
import { F8814_RULES } from "./investments/f8814.ts";
import { F8815_RULES } from "./execution/f8815.ts";
import { F8826_RULES } from "./credits/f8826.ts";
import { F8828_RULES } from "./taxes/f8828.ts";
import { F8829_RULES } from "./business/f8829.ts";
import { F8833_RULES } from "./international/f8833.ts";
import { F8835_RULES } from "./credits/f8835.ts";
import { F8838P_RULES } from "./international/f8838p.ts";
import { F8839_RULES } from "./credits/f8839.ts";
import { F8853_RULES } from "./health/f8853.ts";
import { F8854_RULES } from "./international/f8854.ts";
import { F8858_RULES } from "./international/f8858.ts";
import { F8862_RULES } from "./credits/f8862.ts";
import { F8863_RULES } from "./credits/f8863.ts";
import { F8864_RULES } from "./credits/f8864.ts";
import { F8865_RULES } from "./international/f8865.ts";
import { F8866_RULES } from "./execution/f8866.ts";
import { F8873_RULES } from "./international/f8873.ts";
import { F8880_RULES } from "./credits/f8880.ts";
import { F8881_RULES } from "./credits/f8881.ts";
import { F8888_RULES } from "./payments/f8888.ts";
import { F8889_RULES } from "./health/f8889.ts";
import { F8908_RULES } from "./credits/f8908.ts";
import { F8910_RULES } from "./credits/f8910.ts";
import { F8915F_RULES } from "./retirement/f8915f.ts";
import { F8917_RULES } from "./credits/f8917.ts";
import { F8919_RULES } from "./income/f8919.ts";
import { F8933_RULES } from "./credits/f8933.ts";
import { F8936_RULES } from "./credits/f8936.ts";
import { F8941_RULES } from "./credits/f8941.ts";
import { F8949_RULES } from "./investments/f8949.ts";
import { F8959_RULES } from "./taxes/f8959.ts";
import { F8960_RULES } from "./taxes/f8960.ts";
import { F8962_RULES } from "./health/f8962.ts";
import { F8978_RULES } from "./taxes/f8978.ts";
import { F8992_RULES } from "./international/f8992.ts";
import { F8993_RULES } from "./international/f8993.ts";
import { F8995_RULES } from "./business/f8995.ts";
import { F8995A_RULES } from "./business/f8995a.ts";
import { F8997_RULES } from "./investments/f8997.ts";
import { F9000_RULES } from "./identity/f9000.ts";
import { F926_RULES } from "./international/f926.ts";
import { F9465_RULES } from "./payments/f9465.ts";
import { F965A_RULES } from "./international/f965a.ts";
import { F982_RULES } from "./taxes/f982.ts";
import { FPYMT_RULES } from "./payments/fpymt.ts";
import { FT_RULES } from "./execution/ft.ts";
import { FW2_RULES } from "./income/fw2.ts";
import { FW2G_RULES } from "./income/fw2g.ts";
import { IND_RULES } from "./identity/ind.ts";
import { R0000_RULES } from "./execution/r0000.ts";
import { RRB_RULES } from "./retirement/rrb.ts";
import { S1_RULES } from "./income/s1.ts";
import { S2_RULES } from "./taxes/s2.ts";
import { S3_RULES } from "./credits/s3.ts";
import { S8812_RULES } from "./credits/s8812.ts";
import { SA_RULES } from "./deductions/sa.ts";
import { SB_RULES } from "./investments/sb.ts";
import { SC_RULES } from "./business/sc.ts";
import { SCHK2K3_RULES } from "./international/schk2k3.ts";
import { SCHK3_RULES } from "./international/schk3.ts";
import { SD_RULES } from "./investments/sd.ts";
import { SE_RULES } from "./business/se.ts";
import { SEIC_RULES } from "./credits/seic.ts";
import { SF_RULES } from "./business/sf.ts";
import { SG_RULES } from "./international/sg.ts";
import { SG1_RULES } from "./international/sg1.ts";
import { SH_RULES } from "./taxes/sh.ts";
import { SI1_RULES } from "./international/si1.ts";
import { SJ_RULES } from "./business/sj.ts";
import { SK1_RULES } from "./international/sk1.ts";
import { SK2_RULES } from "./international/sk2.ts";
import { SK3_RULES } from "./international/sk3.ts";
import { SL_RULES } from "./international/sl.ts";
import { SLEP_RULES } from "./identity/slep.ts";
import { SM_RULES } from "./international/sm.ts";
import { SO_RULES } from "./international/so.ts";
import { SP_RULES } from "./international/sp.ts";
import { SQ_RULES } from "./international/sq.ts";
import { SR_RULES } from "./credits/sr.ts";
import { SSA_RULES } from "./retirement/ssa.ts";
import { SSE_RULES } from "./taxes/sse.ts";
import { STATE_RULES } from "./execution/state.ts";
import { T0000_RULES } from "./execution/t0000.ts";
import { X0000_RULES } from "./execution/x0000.ts";

/** All MeF business rules for 1040 series. */
export const ALL_RULES: readonly RuleDef[] = [
  ...F1040_RULES,
  ...F1040X_RULES,
  ...F1099R_RULES,
  ...F1116_RULES,
  ...F1310_RULES,
  ...F172_RULES,
  ...F2106_RULES,
  ...F2120_RULES,
  ...F2210_RULES,
  ...F2210F_RULES,
  ...F2439_RULES,
  ...F2441_RULES,
  ...F2555_RULES,
  ...F3468_RULES,
  ...F3800_RULES,
  ...F4136_RULES,
  ...F4137_RULES,
  ...F4255_RULES,
  ...F4562_RULES,
  ...F4563_RULES,
  ...F461_RULES,
  ...F4684_RULES,
  ...F4797_RULES,
  ...F4835_RULES,
  ...F4952_RULES,
  ...F4972_RULES,
  ...F5074_RULES,
  ...F5329_RULES,
  ...F5471_RULES,
  ...F5695_RULES,
  ...F6252_RULES,
  ...F6765_RULES,
  ...F6781_RULES,
  ...F7204_RULES,
  ...F7205_RULES,
  ...F7206_RULES,
  ...F7211_RULES,
  ...F7218_RULES,
  ...F8082_RULES,
  ...F8275_RULES,
  ...F8275R_RULES,
  ...F8283_RULES,
  ...F8332_RULES,
  ...F8379_RULES,
  ...F8582CR_RULES,
  ...F8594_RULES,
  ...F8606_RULES,
  ...F8609A_RULES,
  ...F8615_RULES,
  ...F8621_RULES,
  ...F8689_RULES,
  ...F8697_RULES,
  ...F8814_RULES,
  ...F8815_RULES,
  ...F8826_RULES,
  ...F8828_RULES,
  ...F8829_RULES,
  ...F8833_RULES,
  ...F8835_RULES,
  ...F8838P_RULES,
  ...F8839_RULES,
  ...F8853_RULES,
  ...F8854_RULES,
  ...F8858_RULES,
  ...F8862_RULES,
  ...F8863_RULES,
  ...F8864_RULES,
  ...F8865_RULES,
  ...F8866_RULES,
  ...F8873_RULES,
  ...F8880_RULES,
  ...F8881_RULES,
  ...F8888_RULES,
  ...F8889_RULES,
  ...F8908_RULES,
  ...F8910_RULES,
  ...F8915F_RULES,
  ...F8917_RULES,
  ...F8919_RULES,
  ...F8933_RULES,
  ...F8936_RULES,
  ...F8941_RULES,
  ...F8949_RULES,
  ...F8959_RULES,
  ...F8960_RULES,
  ...F8962_RULES,
  ...F8978_RULES,
  ...F8992_RULES,
  ...F8993_RULES,
  ...F8995_RULES,
  ...F8995A_RULES,
  ...F8997_RULES,
  ...F9000_RULES,
  ...F926_RULES,
  ...F9465_RULES,
  ...F965A_RULES,
  ...F982_RULES,
  ...FPYMT_RULES,
  ...FT_RULES,
  ...FW2_RULES,
  ...FW2G_RULES,
  ...IND_RULES,
  ...R0000_RULES,
  ...RRB_RULES,
  ...S1_RULES,
  ...S2_RULES,
  ...S3_RULES,
  ...S8812_RULES,
  ...SA_RULES,
  ...SB_RULES,
  ...SC_RULES,
  ...SCHK2K3_RULES,
  ...SCHK3_RULES,
  ...SD_RULES,
  ...SE_RULES,
  ...SEIC_RULES,
  ...SF_RULES,
  ...SG_RULES,
  ...SG1_RULES,
  ...SH_RULES,
  ...SI1_RULES,
  ...SJ_RULES,
  ...SK1_RULES,
  ...SK2_RULES,
  ...SK3_RULES,
  ...SL_RULES,
  ...SLEP_RULES,
  ...SM_RULES,
  ...SO_RULES,
  ...SP_RULES,
  ...SQ_RULES,
  ...SR_RULES,
  ...SSA_RULES,
  ...SSE_RULES,
  ...STATE_RULES,
  ...T0000_RULES,
  ...X0000_RULES,
];

export { F1040_RULES } from "./identity/f1040.ts";
export { F1040X_RULES } from "./identity/f1040x.ts";
export { F1099R_RULES } from "./income/f1099r.ts";
export { F1116_RULES } from "./international/f1116.ts";
export { F1310_RULES } from "./identity/f1310.ts";
export { F172_RULES } from "./business/f172.ts";
export { F2106_RULES } from "./deductions/f2106.ts";
export { F2120_RULES } from "./identity/f2120.ts";
export { F2210_RULES } from "./payments/f2210.ts";
export { F2210F_RULES } from "./payments/f2210f.ts";
export { F2439_RULES } from "./investments/f2439.ts";
export { F2441_RULES } from "./credits/f2441.ts";
export { F2555_RULES } from "./international/f2555.ts";
export { F3468_RULES } from "./credits/f3468.ts";
export { F3800_RULES } from "./credits/f3800.ts";
export { F4136_RULES } from "./credits/f4136.ts";
export { F4137_RULES } from "./income/f4137.ts";
export { F4255_RULES } from "./credits/f4255.ts";
export { F4562_RULES } from "./business/f4562.ts";
export { F4563_RULES } from "./international/f4563.ts";
export { F461_RULES } from "./taxes/f461.ts";
export { F4684_RULES } from "./taxes/f4684.ts";
export { F4797_RULES } from "./business/f4797.ts";
export { F4835_RULES } from "./business/f4835.ts";
export { F4952_RULES } from "./investments/f4952.ts";
export { F4972_RULES } from "./retirement/f4972.ts";
export { F5074_RULES } from "./international/f5074.ts";
export { F5329_RULES } from "./retirement/f5329.ts";
export { F5471_RULES } from "./international/f5471.ts";
export { F5695_RULES } from "./credits/f5695.ts";
export { F6252_RULES } from "./investments/f6252.ts";
export { F6765_RULES } from "./credits/f6765.ts";
export { F6781_RULES } from "./investments/f6781.ts";
export { F7204_RULES } from "./execution/f7204.ts";
export { F7205_RULES } from "./credits/f7205.ts";
export { F7206_RULES } from "./health/f7206.ts";
export { F7211_RULES } from "./execution/f7211.ts";
export { F7218_RULES } from "./execution/f7218.ts";
export { F8082_RULES } from "./execution/f8082.ts";
export { F8275_RULES } from "./execution/f8275.ts";
export { F8275R_RULES } from "./execution/f8275r.ts";
export { F8283_RULES } from "./deductions/f8283.ts";
export { F8332_RULES } from "./identity/f8332.ts";
export { F8379_RULES } from "./execution/f8379.ts";
export { F8582CR_RULES } from "./execution/f8582cr.ts";
export { F8594_RULES } from "./execution/f8594.ts";
export { F8606_RULES } from "./retirement/f8606.ts";
export { F8609A_RULES } from "./credits/f8609a.ts";
export { F8615_RULES } from "./investments/f8615.ts";
export { F8621_RULES } from "./international/f8621.ts";
export { F8689_RULES } from "./international/f8689.ts";
export { F8697_RULES } from "./execution/f8697.ts";
export { F8814_RULES } from "./investments/f8814.ts";
export { F8815_RULES } from "./execution/f8815.ts";
export { F8826_RULES } from "./credits/f8826.ts";
export { F8828_RULES } from "./taxes/f8828.ts";
export { F8829_RULES } from "./business/f8829.ts";
export { F8833_RULES } from "./international/f8833.ts";
export { F8835_RULES } from "./credits/f8835.ts";
export { F8838P_RULES } from "./international/f8838p.ts";
export { F8839_RULES } from "./credits/f8839.ts";
export { F8853_RULES } from "./health/f8853.ts";
export { F8854_RULES } from "./international/f8854.ts";
export { F8858_RULES } from "./international/f8858.ts";
export { F8862_RULES } from "./credits/f8862.ts";
export { F8863_RULES } from "./credits/f8863.ts";
export { F8864_RULES } from "./credits/f8864.ts";
export { F8865_RULES } from "./international/f8865.ts";
export { F8866_RULES } from "./execution/f8866.ts";
export { F8873_RULES } from "./international/f8873.ts";
export { F8880_RULES } from "./credits/f8880.ts";
export { F8881_RULES } from "./credits/f8881.ts";
export { F8888_RULES } from "./payments/f8888.ts";
export { F8889_RULES } from "./health/f8889.ts";
export { F8908_RULES } from "./credits/f8908.ts";
export { F8910_RULES } from "./credits/f8910.ts";
export { F8915F_RULES } from "./retirement/f8915f.ts";
export { F8917_RULES } from "./credits/f8917.ts";
export { F8919_RULES } from "./income/f8919.ts";
export { F8933_RULES } from "./credits/f8933.ts";
export { F8936_RULES } from "./credits/f8936.ts";
export { F8941_RULES } from "./credits/f8941.ts";
export { F8949_RULES } from "./investments/f8949.ts";
export { F8959_RULES } from "./taxes/f8959.ts";
export { F8960_RULES } from "./taxes/f8960.ts";
export { F8962_RULES } from "./health/f8962.ts";
export { F8978_RULES } from "./taxes/f8978.ts";
export { F8992_RULES } from "./international/f8992.ts";
export { F8993_RULES } from "./international/f8993.ts";
export { F8995_RULES } from "./business/f8995.ts";
export { F8995A_RULES } from "./business/f8995a.ts";
export { F8997_RULES } from "./investments/f8997.ts";
export { F9000_RULES } from "./identity/f9000.ts";
export { F926_RULES } from "./international/f926.ts";
export { F9465_RULES } from "./payments/f9465.ts";
export { F965A_RULES } from "./international/f965a.ts";
export { F982_RULES } from "./taxes/f982.ts";
export { FPYMT_RULES } from "./payments/fpymt.ts";
export { FT_RULES } from "./execution/ft.ts";
export { FW2_RULES } from "./income/fw2.ts";
export { FW2G_RULES } from "./income/fw2g.ts";
export { IND_RULES } from "./identity/ind.ts";
export { R0000_RULES } from "./execution/r0000.ts";
export { RRB_RULES } from "./retirement/rrb.ts";
export { S1_RULES } from "./income/s1.ts";
export { S2_RULES } from "./taxes/s2.ts";
export { S3_RULES } from "./credits/s3.ts";
export { S8812_RULES } from "./credits/s8812.ts";
export { SA_RULES } from "./deductions/sa.ts";
export { SB_RULES } from "./investments/sb.ts";
export { SC_RULES } from "./business/sc.ts";
export { SCHK2K3_RULES } from "./international/schk2k3.ts";
export { SCHK3_RULES } from "./international/schk3.ts";
export { SD_RULES } from "./investments/sd.ts";
export { SE_RULES } from "./business/se.ts";
export { SEIC_RULES } from "./credits/seic.ts";
export { SF_RULES } from "./business/sf.ts";
export { SG_RULES } from "./international/sg.ts";
export { SG1_RULES } from "./international/sg1.ts";
export { SH_RULES } from "./taxes/sh.ts";
export { SI1_RULES } from "./international/si1.ts";
export { SJ_RULES } from "./business/sj.ts";
export { SK1_RULES } from "./international/sk1.ts";
export { SK2_RULES } from "./international/sk2.ts";
export { SK3_RULES } from "./international/sk3.ts";
export { SL_RULES } from "./international/sl.ts";
export { SLEP_RULES } from "./identity/slep.ts";
export { SM_RULES } from "./international/sm.ts";
export { SO_RULES } from "./international/so.ts";
export { SP_RULES } from "./international/sp.ts";
export { SQ_RULES } from "./international/sq.ts";
export { SR_RULES } from "./credits/sr.ts";
export { SSA_RULES } from "./retirement/ssa.ts";
export { SSE_RULES } from "./taxes/sse.ts";
export { STATE_RULES } from "./execution/state.ts";
export { T0000_RULES } from "./execution/t0000.ts";
export { X0000_RULES } from "./execution/x0000.ts";
