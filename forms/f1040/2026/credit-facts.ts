import { z } from "zod";
import {
  earnedIncomeWorksheetSchema,
  inputSchema as sharedF8812InputSchema,
} from "../nodes/inputs/f8812/index.ts";

const amount = z.number().finite().nonnegative();
export const f8812Facts2026Schema = z.object({
  earned_income_worksheet: earnedIncomeWorksheetSchema.optional(),
  line18a_earned_income: amount.optional(),
  part_iib_2026: sharedF8812InputSchema.shape.part_iib_2026,
  worksheet_b_line7_withheld_ss_medicare_rrta: amount.optional(),
  bona_fide_pr_resident: z.boolean().optional(),
  files_form2555: z.boolean().optional(),
  puerto_rico_excluded_income: amount.optional(),
  form2555_amounts: amount.optional(),
  form4563_amount: amount.optional(),
  schedule1_line15: amount.optional(),
  form1040_line27a_eic: amount.optional(),
}).strict();
