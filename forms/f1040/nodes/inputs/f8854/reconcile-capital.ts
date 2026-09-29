import { z } from "zod";
import { transactionSchema as filedTransactionSchema } from "../../intermediate/forms/form8949/index.ts";
import { dateSchema, type F8854Input, inputSchema } from "./index.ts";
import {
  allocateMarkToMarketExclusion,
  wholeDollarAssets,
} from "./mark-to-market.ts";
import { Form8949LossTreatment, ReportedFormCode } from "./section-c.ts";

function dayBefore(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function isLongTermStandardHoldingPeriod(
  dateAcquired: string,
  dateSold: string,
): boolean {
  const anniversary = new Date(`${dateAcquired}T00:00:00Z`);
  anniversary.setUTCFullYear(anniversary.getUTCFullYear() + 1);
  return dateSold > anniversary.toISOString().slice(0, 10);
}

/** Match each claimed Form 8949 deemed sale to one accumulated filing row. */
export function reconcileForm8854Form8949Properties(
  raw8854: F8854Input,
  filedForm8949: unknown,
): { itemId: string; transactionId: string; gainOrLoss: number }[] {
  const input = inputSchema.parse(raw8854);
  if (input.section_c === null) return [];
  const assets = wholeDollarAssets(input.section_c);
  if (
    !assets.some((asset) =>
      asset.reported_form_code === ReportedFormCode.Form8949
    )
  ) return [];
  const transactions = z.array(filedTransactionSchema).parse(
    filedForm8949 ?? [],
  );
  const allocations = allocateMarkToMarketExclusion(assets);
  const matches = assets.flatMap((asset, index) => {
    if (asset.reported_form_code !== ReportedFormCode.Form8949) return [];
    const allocation = allocations[index];
    if (asset.form8949_standard_holding_period_confirmed !== true) {
      throw new Error(
        `Form 8854 property ${asset.item_id} needs confirmation of standard Form 8949 holding-period treatment`,
      );
    }
    if (asset.form8949_digital_asset === undefined) {
      throw new Error(
        `Form 8854 property ${asset.item_id} needs explicit digital-asset classification for Form 8949`,
      );
    }
    if (
      allocation.builtInGainOrLoss < 0 &&
      asset.form8949_loss_treatment === undefined
    ) {
      throw new Error(
        `Form 8854 property ${asset.item_id} needs loss-character and deductibility facts`,
      );
    }
    const candidates = transactions.filter((transaction) =>
      transaction.source_transaction_id === asset.reported_transaction_id
    );
    if (candidates.length !== 1) {
      throw new Error(
        `Form 8854 property ${asset.item_id} needs exactly one identified Form 8949 transaction`,
      );
    }
    const transaction = candidates[0];
    if (!["C", "F", "I", "L"].includes(transaction.part)) {
      throw new Error(
        `Form 8854 property ${asset.item_id} must use a Form 8949 no-information-return category`,
      );
    }
    if (
      ["I", "L"].includes(transaction.part) !== asset.form8949_digital_asset
    ) {
      throw new Error(
        `Form 8854 property ${asset.item_id} has inconsistent Form 8949 digital-asset category`,
      );
    }
    if (
      transaction.date_sold !== dayBefore(input.expatriation_date) ||
      !dateSchema.safeParse(transaction.date_acquired).success ||
      transaction.date_acquired > transaction.date_sold
    ) {
      throw new Error(
        `Form 8854 property ${asset.item_id} has inconsistent Form 8949 dates`,
      );
    }
    const isLongTerm = isLongTermStandardHoldingPeriod(
      transaction.date_acquired,
      transaction.date_sold,
    );
    if (
      transaction.is_long_term !== isLongTerm ||
      ["F", "L"].includes(transaction.part) !== isLongTerm
    ) {
      throw new Error(
        `Form 8854 property ${asset.item_id} has inconsistent Form 8949 holding-period classification`,
      );
    }
    if (
      !Number.isSafeInteger(transaction.proceeds) ||
      !Number.isSafeInteger(transaction.cost_basis) ||
      transaction.proceeds !== asset.fmv_day_before_expatriation ||
      transaction.cost_basis !== asset.us_adjusted_basis
    ) {
      throw new Error(
        `Form 8854 property ${asset.item_id} does not match Form 8949 proceeds and basis`,
      );
    }
    if (
      transaction.qsbs_code !== undefined ||
      transaction.qsbs_amount !== undefined
    ) {
      throw new Error(
        `Form 8854 property ${asset.item_id} has additional Form 8949 adjustments requiring separate characterization`,
      );
    }
    const nondeductibleLoss = asset.form8949_loss_treatment ===
      Form8949LossTreatment.NondeductiblePersonalUse;
    const expectedAdjustment = nondeductibleLoss
      ? -allocation.builtInGainOrLoss
      : -allocation.exclusionAllocated;
    const expectedCode = nondeductibleLoss
      ? "L"
      : expectedAdjustment < 0
      ? "O"
      : "";
    if (
      (transaction.adjustment_codes ?? "") !== expectedCode ||
      (transaction.adjustment_amount ?? 0) !== expectedAdjustment
    ) {
      throw new Error(
        `Form 8854 property ${asset.item_id} does not match its Form 8949 exclusion adjustment`,
      );
    }
    const gainOrLoss = transaction.proceeds - transaction.cost_basis +
      expectedAdjustment;
    if (
      gainOrLoss !==
        (nondeductibleLoss
          ? 0
          : allocation.builtInGainOrLoss - allocation.exclusionAllocated) ||
      transaction.gain_loss !== gainOrLoss
    ) {
      throw new Error(
        `Form 8854 property ${asset.item_id} does not match Form 8949 recognized gain`,
      );
    }
    return [{
      itemId: asset.item_id,
      transactionId: asset.reported_transaction_id,
      gainOrLoss,
    }];
  });
  return matches;
}
