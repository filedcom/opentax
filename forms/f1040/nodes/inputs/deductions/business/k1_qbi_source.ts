import {
  currentFarmRentalNet,
  type CurrentFarmRentalQbiSource,
} from "../../income/business/f4835/qbi-source.ts";
import type { k1PassiveIncomeSourceSchema } from "../../income/rental-passthrough/k1_passive_source.ts";
import { z } from "zod";
import {
  box11Line10SourceRows,
  currentPassiveLine10Activities,
} from "../../income/rental-passthrough/k1_partnership/box11_line10.ts";
export const currentK1QbiSourceSchema = z.object({
  tax_year: z.literal(2025),
  issuer_ein: z.string().regex(/^\d{9}$/),
  recipient_tin: z.string().regex(/^\d{9}$/),
  issued_k1_reference: z.string().trim().min(1),
  issued_section199a_statement_reference: z.string().trim().min(1),
  business_name: z.string().trim().min(1).max(75),
  domestic_non_sstb_trade: z.literal(true),
  qualified_box1_income: z.number().int().nonnegative(),
  qualified_box11_line10_income: z.number().int().positive().optional(),
  statement_qbi: z.number().int().positive(),
  owner_level_adjustments: z.literal(0),
  prior_qbi_loss: z.literal(0),
}).strict();
export type CurrentK1QbiSource = z.infer<typeof currentK1QbiSourceSchema>;
export function currentK1Qbi(item: {
  partnership_ein?: string;
  corporation_ein?: string;
  recipient_tin?: string;
  source_document_reference?: string;
  box1_ordinary_business?: number;
  box20z_qbi?: number;
  qbi_amount?: number;
  partnership_name?: string;
  box11_line10_ordinary?: Parameters<
    typeof box11Line10SourceRows
  >[0][number]["box11_line10_ordinary"];
  qualified_business_income_source?: CurrentK1QbiSource;
}) {
  const s = item.qualified_business_income_source;
  if (!s) return undefined;
  const ordinaryRows = box11Line10SourceRows(
    item.partnership_name
      ? [item as Parameters<typeof box11Line10SourceRows>[0][number]]
      : [],
  );
  const ordinary = currentPassiveLine10Activities(ordinaryRows).reduce(
    (t, r) => t + r.current_net,
    0,
  );
  const qualified = s.qualified_box1_income +
    (s.qualified_box11_line10_income ?? 0);
  const amount = item.box20z_qbi ?? item.qbi_amount ??
    item.box1_ordinary_business;
  if (
    s.issuer_ein !== (item.partnership_ein ?? item.corporation_ein) ||
    s.recipient_tin !== item.recipient_tin ||
    s.issued_k1_reference !== item.source_document_reference ||
    s.qualified_box1_income !== (item.box1_ordinary_business ?? 0) ||
    (s.qualified_box11_line10_income ?? 0) !== ordinary ||
    qualified <= 0 || s.statement_qbi !== qualified ||
    amount !== s.statement_qbi
  ) {
    throw new Error(
      "Current K-1 QBI statement differs from actual issued ordinary income/owner",
    );
  }
  return s;
}
export function currentK1QbiFarmRows(
  farms: readonly CurrentFarmRentalQbiSource[],
  incomes: readonly { activities: readonly { current_income: number }[] }[],
) {
  const passiveIncome = incomes.reduce(
    (t, s) => t + s.activities.reduce((n, r) => n + r.current_income, 0),
    0,
  ) + farms.reduce((t, s) => t + Math.max(0, currentFarmRentalNet(s)), 0);
  const losses = farms.reduce(
      (t, s) => t + Math.max(0, -currentFarmRentalNet(s)),
      0,
    ),
    allowed = Math.min(passiveIncome, losses);
  return farms.map((s) => {
    const net = currentFarmRentalNet(s),
      qbi = net >= 0 ? net : -(losses > 0 ? allowed * (-net) / losses : 0);
    if (!Number.isSafeInteger(qbi)) {
      throw new Error(
        "Current farm/RPE QBI needs its exact whole-dollar activity PAL allocation",
      );
    }
    return {
      businessName: s.business_name,
      tin: { kind: "ssn" as const, value: s.recipient_tin },
      qbi,
      activity_id: s.activity_id,
      suspended_loss: Math.max(0, -net) + Math.min(0, qbi),
    };
  });
}
export function currentK1QbiLines(
  sources: readonly CurrentK1QbiSource[],
  taxableIncome: number,
  farms: readonly CurrentFarmRentalQbiSource[] = [],
  incomes: readonly { activities: readonly { current_income: number }[] }[] =
    [],
) {
  const qbi = sources.reduce((sum, s) => sum + s.statement_qbi, 0) +
    currentK1QbiFarmRows(farms, incomes).reduce((sum, r) => sum + r.qbi, 0);
  const line4 = Math.max(0, qbi),
    line5 = Math.round(line4 * .2),
    line11 = Math.max(0, Math.round(taxableIncome)),
    line14 = Math.round(line11 * .2);
  return {
    line1_qbi: qbi,
    line1_business_reference: sources[0].issued_section199a_statement_reference,
    line2: qbi,
    line3: 0,
    line4,
    line5,
    line6: 0,
    line7: 0,
    line8: 0,
    line9: 0,
    line10: line5,
    line11,
    line12: 0,
    line13: line11,
    line14,
    line15: Math.min(line5, line14),
    line16: Math.max(0, -qbi),
    line17: 0,
  };
}
