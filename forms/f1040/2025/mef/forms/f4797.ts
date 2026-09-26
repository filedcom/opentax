import { element, elements } from "../../../mef/xml.ts";
import {
  casualtyLossLines,
  inputSchema as form4684InputSchema,
} from "../../../nodes/intermediate/forms/form4684/index.ts";
import { calculateInstallmentSale } from "../../../nodes/intermediate/forms/form6252/calculation.ts";
import { inputSchema as form6252InputSchema } from "../../../nodes/intermediate/forms/form6252/index.ts";
import { calculateLikeKindExchange } from "../../../nodes/intermediate/forms/form8824/calculation.ts";
import { inputSchema as form8824InputSchema } from "../../../nodes/intermediate/forms/form8824/index.ts";
import {
  type K1Section1231Row,
  k1Section1231RowSchema,
} from "../../../nodes/intermediate/forms/form4797/index.ts";
import { z } from "zod";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

export interface Fields {
  section_1231_gain?: number | null;
  gain_form6252?: number | null;
  gain_form8824?: number | null;
  k1_1231_rows?: readonly K1Section1231Row[] | null;
  nonrecaptured_1231_loss?: number | null;
  ordinary_gain?: number | null;
  ordinary_gain_form4684?: number | null;
  recapture_form6252?: number | null;
  recapture_1245?: number | null;
  recapture_1250?: number | null;
}

type Input = Partial<Fields> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["section_1231_gain", "TotalPropertyGainLossAmt"],
  ["nonrecaptured_1231_loss", "NonrecapturedNet1231LossesAmt"],
];

function wholeDollar(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error(`Form 4797 ${name} must be a whole-dollar amount`);
  }
  return value;
}

function buildIRS4797(fields: Input, context?: MefBuildContext): string {
  const gross = fields.section_1231_gain === undefined ||
      fields.section_1231_gain === null
    ? undefined
    : wholeDollar(fields.section_1231_gain, "section 1231 gain or loss");
  const installmentGain = fields.gain_form6252 === undefined ||
      fields.gain_form6252 === null
    ? 0
    : wholeDollar(fields.gain_form6252, "Form 6252 section 1231 gain");
  const exchangeGain = fields.gain_form8824 === undefined ||
      fields.gain_form8824 === null
    ? 0
    : wholeDollar(fields.gain_form8824, "Form 8824 section 1231 gain");
  const k1Rows = z.array(k1Section1231RowSchema).parse(
    fields.k1_1231_rows ?? [],
  );
  const k1Gain = k1Rows.reduce(
    (sum, row) =>
      sum + wholeDollar(row.gain_loss, "K-1 section 1231 gain or loss"),
    0,
  );
  if (installmentGain < 0) {
    throw new Error("Form 4797 line 4 cannot be negative");
  }
  if (installmentGain > 0 && (gross ?? 0) < installmentGain && k1Gain >= 0) {
    throw new Error(
      "Form 4797 line 4 must be included in its line 7 section 1231 total",
    );
  }
  if (
    context?.pending &&
    (installmentGain !== 0 || exchangeGain !== 0 || k1Rows.length > 0) &&
    gross !== installmentGain + exchangeGain + k1Gain
  ) {
    throw new Error("Form 4797 lines 2, 4, and 5 must reconcile to line 7");
  }
  if (installmentGain > 0 && context?.pending) {
    const source = context.pending.form6252;
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      throw new Error("Form 4797 line 4 needs its Form 6252 source");
    }
    const sales = form6252InputSchema.parse(source).f6252s;
    const sourceGain = sales
      .filter((sale) => sale.is_capital_asset === false)
      .reduce((sum, sale) => sum + calculateInstallmentSale(sale).line26, 0);
    if (sourceGain !== installmentGain) {
      throw new Error("Form 4797 line 4 must match Form 6252 line 26");
    }
  }
  if (exchangeGain > 0 && context?.pending) {
    const source = context.pending.form8824;
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      throw new Error("Form 4797 line 5 needs its Form 8824 source");
    }
    const exchange = form8824InputSchema.parse(source);
    if (
      exchange.gain_type !== "section_1231" ||
      calculateLikeKindExchange(exchange).line22 !== exchangeGain
    ) {
      throw new Error("Form 4797 line 5 must match Form 8824 line 22");
    }
  }
  const prior = fields.nonrecaptured_1231_loss === undefined ||
      fields.nonrecaptured_1231_loss === null
    ? 0
    : wholeDollar(
      fields.nonrecaptured_1231_loss,
      "nonrecaptured section 1231 loss",
    );
  const ordinary =
    fields.ordinary_gain === undefined || fields.ordinary_gain === null
      ? 0
      : wholeDollar(fields.ordinary_gain, "ordinary gain or loss");
  const form4684 = fields.ordinary_gain_form4684 === undefined ||
      fields.ordinary_gain_form4684 === null
    ? 0
    : wholeDollar(
      fields.ordinary_gain_form4684,
      "Form 4684 ordinary gain or loss",
    );
  if (form4684 !== 0 && context?.pending) {
    const source = context.pending.form4684;
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      throw new Error("Form 4797 line 14 needs its Form 4684 source");
    }
    const casualty = form4684InputSchema.parse(source);
    const sourceLoss = casualtyLossLines(
      casualty.business_fmv_before ?? 0,
      casualty.business_fmv_after ?? 0,
      casualty.business_basis ?? 0,
      casualty.business_insurance ?? 0,
    ).loss;
    if (form4684 !== -sourceLoss) {
      throw new Error("Form 4797 line 14 must match Form 4684 line 38a");
    }
  }
  const form6252Recapture = fields.recapture_form6252 === undefined ||
      fields.recapture_form6252 === null
    ? 0
    : wholeDollar(
      fields.recapture_form6252,
      "Form 6252 depreciation recapture",
    );
  const recapture1245 = fields.recapture_1245 === undefined ||
      fields.recapture_1245 === null
    ? 0
    : wholeDollar(fields.recapture_1245, "section 1245 recapture");
  const recapture1250 = fields.recapture_1250 === undefined ||
      fields.recapture_1250 === null
    ? 0
    : wholeDollar(fields.recapture_1250, "section 1250 recapture");
  if (
    prior < 0 || form6252Recapture < 0 || recapture1245 < 0 || recapture1250 < 0
  ) {
    throw new Error("Form 4797 carryovers and recapture cannot be negative");
  }
  if (
    ordinary !== 0 || form6252Recapture !== 0 || recapture1245 !== 0 ||
    recapture1250 !== 0
  ) {
    throw new Error(
      "Form 4797 Part II/III MeF needs source-line and property detail, not aggregate ordinary gain or recapture",
    );
  }
  if (prior > 0 && (gross === undefined || gross <= 0)) {
    throw new Error(
      "Form 4797 line 8 requires a positive section 1231 gain on line 7",
    );
  }
  if (
    (gross === undefined || gross === 0) && form4684 === 0 &&
    installmentGain === 0 && exchangeGain === 0 && k1Rows.length === 0
  ) return "";

  const ordinaryFrom1231 = gross === undefined
    ? 0
    : gross < 0
    ? gross
    : Math.min(gross, prior);
  const totalOrdinary = ordinaryFrom1231 + form4684;
  const hasOrdinary = ordinaryFrom1231 !== 0 || form4684 !== 0;
  if (!Number.isSafeInteger(totalOrdinary)) {
    throw new Error(
      "Form 4797 ordinary gains and losses exceed whole-dollar range",
    );
  }
  return elements("IRS4797", [
    ...k1Rows.map((row) =>
      elements("PropertySaleOrExchange", [
        element(
          "PropertyDesc",
          row.source === "partnership" ? "K-1 Form 1065" : "K-1 Form 1120-S",
        ),
        row.source === "s_corp"
          ? element("DateAcquiredInheritedCd", "FROM SCHEDULE K-1 F1120S")
          : "",
        element("GainOrLossAmt", row.gain_loss),
      ])
    ),
    installmentGain > 0
      ? element("GainInstallmentSalesFrm6252Amt", installmentGain)
      : "",
    exchangeGain > 0
      ? element("GainLossForm8824Amt", exchangeGain)
      : "",
    gross !== undefined && gross !== 0
      ? element("TotalPropertyGainLossAmt", gross)
      : "",
    prior > 0 ? element("NonrecapturedNet1231LossesAmt", prior) : "",
    gross !== undefined && prior > 0
      ? element("TotalGainLossAmt", Math.max(0, gross - prior))
      : "",
    gross !== undefined && gross < 0 ? element("OrdinaryLossAmt", -gross) : "",
    gross !== undefined && gross > 0 && prior > 0
      ? element("PropGainNonrecapturedLossAmt", ordinaryFrom1231)
      : "",
    form4684 !== 0 ? element("NetGainLossForm4684Amt", form4684) : "",
    hasOrdinary ? element("TotalOrdinaryGainLossAmt", totalOrdinary) : "",
    hasOrdinary ? element("OtherGainLossAmt", totalOrdinary) : "",
  ]);
}

export const form4797: MefFormDescriptor<"form4797", Input> = {
  pendingKey: "form4797",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f4797.pdf",
  build(fields, context) {
    return buildIRS4797(fields, context);
  },
};
