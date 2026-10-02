import { element, elements } from "../../../mef/xml.ts";
import { assertScheduleDK1Source } from "../../schedule-d-k1-source.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";
import { inputSchema as trustK1InputSchema } from "../../../nodes/inputs/k1_trust/index.ts";
import { inputSchema as partnershipK1InputSchema } from "../../../nodes/inputs/k1_partnership/index.ts";
import { inputSchema as sCorpK1InputSchema } from "../../../nodes/inputs/k1_s_corp/index.ts";
import {
  assertForm8949TransactionMath,
  transactionSchema,
} from "../../../nodes/intermediate/forms/form8949/index.ts";

export interface Fields {
  line_1a_proceeds?: number | null;
  line_1a_cost?: number | null;
  line_4_other_st?: number | readonly number[] | null;
  line_5_k1_st?: number | null;
  line_6_carryover?: number | null;
  line_8a_proceeds?: number | null;
  line_8a_cost?: number | null;
  line_11_form2439?: number | readonly number[] | null;
  line_11_qef_lt?: number | null;
  line_12_k1_lt?: number | null;
  line13_cap_gain_distrib?: number | null;
  line_12_cap_gain_dist?: number | null;
  line_14_carryover?: number | null;
  line19_unrecaptured_1250?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

// Direct 1:1 scalar field mappings (inputSchema key -> XSD element name)
export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["line_4_other_st", "STGainOrLossFromFormsAmt"],
  ["line_5_k1_st", "NetSTGainOrLossFromSchK1Amt"],
  ["line_6_carryover", "STCapitalLossCarryoverAmt"],
  ["line_11_form2439", "LTGainOrLossFromFormsAmt"],
  ["line_11_qef_lt", "LTGainOrLossFromFormsAmt"],
  ["line_12_k1_lt", "NetLTGainOrLossFromSchK1Amt"],
  ["line_14_carryover", "LTCapitalLossCarryoverAmt"],
  ["line19_unrecaptured_1250", "UnrcptrSect1250GainWrkshtAmt"],
];

// Aggregated mappings: multiple inputSchema fields summed into single XSD element.
// Both line13_cap_gain_distrib (from f1099div) and line_12_cap_gain_dist (from d_screen)
// represent Schedule D Line 13 from different input sources — they are not additive fields
// but alternative sources that may both be present and should be summed.
const AGGREGATED_CAP_GAIN_DIST: ReadonlyArray<keyof Fields> = [
  "line13_cap_gain_distrib",
  "line_12_cap_gain_dist",
];

// Build a nested F1040BasisRptNoAdjustmentsType group element (lines 1a / 8a).
// Only emits the group if at least one of proceeds or cost is a number.
function buildBasisRptNoAdjGroup(
  groupTag: string,
  proceeds: number | null | undefined,
  cost: number | null | undefined,
): string {
  const hasProceeds = typeof proceeds === "number";
  const hasCost = typeof cost === "number";
  if (!hasProceeds && !hasCost) return "";

  const children: string[] = [
    hasProceeds
      ? element("TotalProceedsSalesPriceAmt", proceeds as number)
      : "",
    hasCost ? element("TotalCostOrOtherBasisAmt", cost as number) : "",
  ];

  // TotalGainOrLossAmt is only emitted when both values are present
  if (hasProceeds && hasCost) {
    children.push(
      element("TotalGainOrLossAmt", (proceeds as number) - (cost as number)),
    );
  }

  return elements(groupTag, children);
}

const TRANSACTION_GROUPS = [
  { parts: ["A", "G"], tag: "TotalSTCGL1099ShowsBasisGrp" },
  { parts: ["B", "H"], tag: "TotalSTCGL1099NotShowBasisGrp" },
  { parts: ["C", "I"], tag: "TotalSTCGL1099NotReceivedGrp" },
  { parts: ["D", "J"], tag: "TotalLTCGL1099ShowsBasisGrp" },
  { parts: ["E", "K"], tag: "TotalLTCGL1099NotShowBasisGrp" },
  { parts: ["F", "L"], tag: "TotalLTCGL1099NotReceivedGrp" },
] as const;

type PreparedSale = ReturnType<typeof transactionSchema.parse>;

function isDirectSale(sale: PreparedSale): boolean {
  return (sale.part === "A" || sale.part === "D") &&
    !sale.adjustment_codes && sale.adjustment_amount === undefined;
}

function saleKey(sale: PreparedSale): string {
  return JSON.stringify([
    sale.part,
    sale.description,
    sale.source_transaction_id ?? null,
    sale.date_acquired,
    sale.date_sold,
    sale.proceeds,
    sale.cost_basis,
    sale.adjustment_codes ?? null,
    sale.adjustment_amount ?? null,
    sale.gain_loss,
    sale.is_long_term,
    sale.from_form4797_investment_1245 ?? false,
    sale.form4797_property_id ?? null,
  ]);
}

export function assertScheduleDSalesMatchPrepared(
  raw: unknown,
  rawPrepared: readonly unknown[],
): PreparedSale[] {
  const preparedSales = rawPrepared.map((row) => transactionSchema.parse(row));
  for (const sale of preparedSales) {
    assertForm8949TransactionMath(sale);
    if (isDirectSale(sale)) {
      throw new Error("Schedule D direct sale must not also file on Form 8949");
    }
  }
  const calculatedSales =
    (raw === undefined ? [] : Array.isArray(raw) ? raw : [raw])
      .map((row) => transactionSchema.parse(row));
  for (const sale of calculatedSales) assertForm8949TransactionMath(sale);
  const expected = calculatedSales.filter((sale) => !isDirectSale(sale))
    .map(saleKey).sort();
  const actual = preparedSales.map(saleKey).sort();
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw new Error(
      "Schedule D prepared Form 8949 rows differ from calculated sales",
    );
  }
  return preparedSales;
}

function buildTransactionGroup(
  group: (typeof TRANSACTION_GROUPS)[number],
  rows: readonly PreparedSale[],
): string {
  const selected = rows.filter((row) =>
    group.parts.some((part) => part === row.part)
  );
  if (selected.length === 0) return "";
  const sum = (
    key: "proceeds" | "cost_basis" | "adjustment_amount" | "gain_loss",
  ) => selected.reduce((total, row) => total + (row[key] ?? 0), 0);
  return elements(group.tag, [
    element("TotalProceedsSalesPriceAmt", sum("proceeds")),
    element("TotalCostOrOtherBasisAmt", sum("cost_basis")),
    selected.some((row) => row.adjustment_amount !== undefined)
      ? element("TotAdjustmentsToGainOrLossAmt", sum("adjustment_amount"))
      : "",
    element("TotalGainOrLossAmt", sum("gain_loss")),
  ]);
}

function buildIRS1040ScheduleD(
  fields: Input,
  preparedSales: readonly PreparedSale[],
): string {
  const f = fields as Fields;
  // The intermediate node reports a distribution-only return directly on
  // Form 1040 line 7a. It emits print_line16_combined only when Schedule D is
  // actually filed, so raw line-13 input alone must not create an attachment.
  if (
    ((f.line13_cap_gain_distrib ?? 0) > 0 ||
      (f.line_12_cap_gain_dist ?? 0) > 0) &&
    typeof fields["print_line16_combined"] !== "number"
  ) return "";
  const children: string[] = [];

  // Part I: direct line 1a, Form 8949 lines 1b/2/3, then scalar lines 4–6.
  children.push(
    buildBasisRptNoAdjGroup(
      "TotalSTCGL1099BssRptNoAdjGrp",
      f.line_1a_proceeds,
      f.line_1a_cost,
    ),
  );
  children.push(
    ...TRANSACTION_GROUPS.slice(0, 3).map((group) =>
      buildTransactionGroup(group, preparedSales)
    ),
  );

  // Repeated source keys for one XSD line are summed before serialization.
  // Map insertion order preserves the XSD's field order.
  const mappedAmounts = new Map<string, number>();
  for (const [key, tag] of FIELD_MAP) {
    const value = f[key];
    const amounts = Array.isArray(value) ? value : [value];
    for (const amount of amounts) {
      if (typeof amount !== "number") continue;
      mappedAmounts.set(tag, (mappedAmounts.get(tag) ?? 0) + amount);
    }
  }
  const mapped = (tag: string) =>
    mappedAmounts.has(tag) ? element(tag, mappedAmounts.get(tag)!) : "";
  children.push(mapped("STGainOrLossFromFormsAmt"));
  children.push(mapped("NetSTGainOrLossFromSchK1Amt"));
  children.push(mapped("STCapitalLossCarryoverAmt"));

  // Part II: direct line 8a, Form 8949 lines 8b/9/10, then scalar lines.
  children.push(
    buildBasisRptNoAdjGroup(
      "TotalLTCGL1099BssRptNoAdjGrp",
      f.line_8a_proceeds,
      f.line_8a_cost,
    ),
  );
  children.push(
    ...TRANSACTION_GROUPS.slice(3).map((group) =>
      buildTransactionGroup(group, preparedSales)
    ),
  );
  children.push(mapped("LTGainOrLossFromFormsAmt"));
  children.push(mapped("NetLTGainOrLossFromSchK1Amt"));

  // Aggregated capital gain distributions (line 13 from two possible sources)
  const capGainValues = AGGREGATED_CAP_GAIN_DIST
    .map((k) => f[k])
    .filter((v): v is number => typeof v === "number");
  if (capGainValues.length > 0) {
    const sum = capGainValues.reduce((a, b) => a + b, 0);
    children.push(element("CapitalGainDistributionsAmt", sum));
  }
  children.push(mapped("LTCapitalLossCarryoverAmt"));
  children.push(mapped("UnrcptrSect1250GainWrkshtAmt"));

  return elements("IRS1040ScheduleD", children);
}

function hasUnsupportedQsbsTransaction(fields: Input): boolean {
  const rows = [
    ...(Array.isArray(fields.transaction)
      ? fields.transaction
      : fields.transaction
      ? [fields.transaction]
      : []),
    ...(Array.isArray(fields.transactions) ? fields.transactions : []),
  ];
  return rows.some((row) =>
    typeof row === "object" && row !== null &&
    (("qsbs_code" in row && row.qsbs_code !== undefined) ||
      ("qsbs_amount" in row && row.qsbs_amount !== undefined) ||
      ("adjustment_codes" in row &&
        typeof row.adjustment_codes === "string" &&
        row.adjustment_codes.includes("Q")))
  );
}

export const scheduleD: MefFormDescriptor<"schedule_d", Input> = {
  pendingKey: "schedule_d",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040sd.pdf",
  build(fields, context) {
    assertScheduleDK1Source(fields, context?.pending);
    const trustSource = context?.pending?.k1_trust;
    if (
      trustSource === undefined &&
      typeof fields.trust_k1_code_d_loss === "number"
    ) {
      throw new Error(
        "Schedule D code D loss needs its final trust K-1 source",
      );
    }
    if (trustSource !== undefined) {
      const trusts = trustK1InputSchema.parse(trustSource).k1_trusts;
      const finalLossItems = trusts.filter((item) =>
        item.box11_code_c_short_term_capital_loss_carryover !== undefined ||
        item.box11_code_d_long_term_capital_loss_carryover !== undefined
      );
      if (finalLossItems.length > 0) {
        const ownerSsns = [
          context?.filer?.primarySSN,
          context?.filer?.spouse?.ssn,
        ].filter((ssn): ssn is string => ssn !== undefined)
          .map((ssn) => ssn.replaceAll("-", ""));
        const keys = finalLossItems.map((item) =>
          `${item.estate_trust_ein}:${item.source_document_reference}`
        );
        if (
          new Set(keys).size !== keys.length ||
          finalLossItems.some((item) =>
            !ownerSsns.includes(item.beneficiary_ssn!)
          )
        ) {
          throw new Error(
            "Schedule D needs distinct final trust K-1 capital loss sources owned by this return",
          );
        }
        const partnerships = context?.pending?.k1_partnership === undefined
          ? []
          : partnershipK1InputSchema.parse(context.pending.k1_partnership)
            .k1_partnerships;
        const sCorps = context?.pending?.k1_s_corp === undefined
          ? []
          : sCorpK1InputSchema.parse(context.pending.k1_s_corp).k1_s_corps;
        const expectedSt = trusts.reduce(
          (sum, item) =>
            sum + (item.box3_net_st_cap_gain ?? 0) -
            (item.box11_code_c_short_term_capital_loss_carryover ?? 0),
          0,
        ) + partnerships.reduce(
          (sum, item) => sum + (item.box8_net_st_cap_gain ?? 0),
          0,
        ) + sCorps.reduce(
          (sum, item) => sum + (item.box7_net_st_cap_gain ?? 0),
          0,
        );
        if (
          finalLossItems.some((item) =>
            item.box11_code_c_short_term_capital_loss_carryover !== undefined
          ) && fields.line_5_k1_st !== expectedSt
        ) {
          throw new Error(
            "Schedule D line 5 must reconcile to issued K-1 capital amounts",
          );
        }
        const expectedLt = trusts.reduce(
          (sum, item) =>
            sum + (item.box4a_net_lt_cap_gain ?? 0) -
            (item.box11_code_d_long_term_capital_loss_carryover ?? 0),
          0,
        ) + partnerships.reduce(
          (sum, item) => sum + (item.box9a_net_lt_cap_gain ?? 0),
          0,
        ) + sCorps.reduce(
          (sum, item) => sum + (item.box8a_net_lt_cap_gain ?? 0),
          0,
        );
        const codeDLoss = trusts.reduce(
          (sum, item) =>
            sum + (item.box11_code_d_long_term_capital_loss_carryover ?? 0),
          0,
        );
        if (
          codeDLoss > 0 &&
          (fields.line_12_k1_lt !== expectedLt ||
            fields.trust_k1_code_d_loss !== codeDLoss ||
            (typeof fields.print_line16_combined === "number" &&
              fields.print_line16_combined > 0))
        ) {
          throw new Error(
            "Schedule D line 12 needs reconciled final trust K-1 code D loss without unhandled special-rate gain",
          );
        }
      }
    }
    if (
      (typeof fields.box2c_qsbs === "number" && fields.box2c_qsbs > 0) ||
      hasUnsupportedQsbsTransaction(fields)
    ) {
      throw new Error(
        "Schedule D section 1202 source needs a sourced Form 8949 exclusion and Form 6251 line 2h preference before filing",
      );
    }
    if (
      fields.pending_active_4797 === true &&
      !(context?.pending?.agi_final &&
        typeof context.pending.agi_final === "object" &&
        "capital_finalized" in context.pending.agi_final &&
        context.pending.agi_final.capital_finalized === true)
    ) {
      throw new Error(
        "Schedule D active-rental Form 4797 sale needs finalized PAL allocation",
      );
    }
    if (fields.active_4797_final_no_schedule_d === true) return "";
    const rawSales = context?.pending?.form8949;
    if (rawSales !== undefined && !Array.isArray(rawSales)) {
      throw new Error("Schedule D needs prepared Form 8949 transaction rows");
    }
    const preparedSales = assertScheduleDSalesMatchPrepared(
      fields.transaction,
      rawSales ?? [],
    );
    return buildIRS1040ScheduleD(fields, preparedSales);
  },
};
