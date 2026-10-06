import { assertCurrentPassivePropertyReturn } from "./current_passive_property_source.ts";
import { assertCurrentPassiveLine10Return } from "./current_passive_line10_source.ts";
import { form8582 as nativeForm8582 } from "./mef/forms/f8582.ts";
import {
  filerCreditEligibility,
  inputSchema as generalInputSchema,
} from "../nodes/inputs/general/index.ts";
import {
  childEicFilerEligible,
  childlessEicEligible,
  eicTaxResidencyEligible,
  priorEicDisallowanceEligible,
} from "../nodes/intermediate/forms/eitc/index.ts";
import { inputSchema as f8862InputSchema } from "../nodes/inputs/f8862/index.ts";
import {
  form4797EicCapitalExclusion,
  form4797EicPassiveOrdinary,
} from "../nodes/intermediate/forms/form4797/index.ts";
import {
  calculateForm8814,
  form8814EicLine4,
  itemSchema as f8814ItemSchema,
} from "../nodes/inputs/f8814/index.ts";
import {
  scheduleEPassiveEicIncome,
  scheduleERoyaltyEicAmounts,
} from "../nodes/inputs/schedule_e/index.ts";
import {
  inputSchema as agiInputSchema,
  remainingAllowedPassiveLoss,
} from "../nodes/intermediate/aggregation/agi_aggregator/index.ts";
import { personalPropertyRentalTotals } from "../nodes/inputs/personal_property_rental/index.ts";
import {
  assertK1EicReview,
  reviewedK1PassiveIncome,
} from "../nodes/inputs/k1_passive_eic.ts";
import { inputSchema as partnershipK1InputSchema } from "../nodes/inputs/k1_partnership/index.ts";
import {
  box11Line10SourceSchema,
  currentPassiveLine10Activities,
} from "../nodes/inputs/k1_partnership/box11_line10.ts";
import { inputSchema as sCorpK1InputSchema } from "../nodes/inputs/k1_s_corp/index.ts";
import { EITC_INVESTMENT_INCOME_LIMIT_2025 } from "../nodes/config/2025.ts";
import {
  projectOwned7203Family,
  projectReviewedStockLoss7203,
} from "./form7203_stock_loss_projection.ts";
import { extractFilerIdentity } from "../mef/filer.ts";

/** Check a positive Form 1040 EIC against the reviewed source before export. */
export function assertEicSource(
  filingStatus: unknown,
  credit: number | undefined,
  mainHomeInUS: unknown,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  if ((credit ?? 0) <= 0) return;
  const form2555 = pending?.form2555;
  if (
    form2555 && typeof form2555 === "object" &&
    "filing_details" in form2555
  ) {
    throw new Error("Form 1040 EIC cannot accompany a filed Form 2555");
  }
  const result = pending?.eitc;
  if (
    !result || typeof result !== "object" || Array.isArray(result) ||
    !("qualifying_children" in result) ||
    !Number.isInteger(result.qualifying_children) ||
    !("credit_amount" in result) || result.credit_amount !== credit
  ) {
    throw new Error("Form 1040 EIC needs its matching calculation source");
  }
  const filed = pending?.f1040 as Record<string, unknown> | undefined;
  const filedAmount = (key: string): number => {
    const value = filed?.[key];
    const current = Array.isArray(value) ? value[value.length - 1] : value;
    return typeof current === "number" ? current : 0;
  };
  const agiFinal = pending?.agi_final as Record<string, unknown> | undefined;
  const form4797 = pending?.form4797 as Record<string, unknown> | undefined;
  if (form4797) assertCurrentPassivePropertyReturn(form4797, pending);
  if (form4797?.k1_box11_line10_rows !== undefined) {
    assertCurrentPassiveLine10Return(form4797, pending);
    const rows = box11Line10SourceSchema.array().parse(
      form4797.k1_box11_line10_rows,
    );
    const ordinaryActivities = currentPassiveLine10Activities(rows);
    if (ordinaryActivities.length) {
      const source = pending?.form8582;
      if (!source || typeof source !== "object" || Array.isArray(source)) {
        throw new Error("EIC current passive ordinary K1 needs actual8582");
      }
      nativeForm8582.build(
        source as Parameters<typeof nativeForm8582.build>[0],
        { pending },
      );
    }
    for (const row of rows) {
      const review = row.eic_activity_review;
      if (!review) {
        throw new Error(
          "Form 1040 EIC needs passive-activity classification for partnership K-1 Form 4797 line 10 amounts",
        );
      }
      if (
        review.classification === "passive" && !row.current_passive_source &&
        (row.gain_loss < 0 ||
          review.no_current_or_prior_unallowed_loss_for_activity_verified !==
            true)
      ) {
        throw new Error(
          "Form 1040 EIC passive partnership K-1 Form 4797 line 10 needs a finalized Form 8582 loss allocation",
        );
      }
    }
  }
  const allowedPartI = typeof agiFinal?.allowed_part_i === "number"
    ? agiFinal.allowed_part_i
    : undefined;
  const form4797Exclusion = pending?.form4797 === undefined
    ? 0
    : form4797EicCapitalExclusion(pending.form4797, allowedPartI);
  const capitalGain = Math.max(
    0,
    filedAmount("line7_capital_gain") + filedAmount("line7a_cap_gain_distrib"),
  );
  const form8814 = pending?.form8814 as Record<string, unknown> | undefined;
  const childLines = form8814?.items as unknown[] | undefined;
  if (form8814 !== undefined && !Array.isArray(childLines)) {
    throw new Error("Form 1040 EIC needs calculated Form 8814 child sources");
  }
  let childTaxExemptInterest = 0;
  let childLine4 = 0;
  let childSchedule1Income = 0;
  for (const rawLine of childLines ?? []) {
    const item = f8814ItemSchema.parse(
      (rawLine as Record<string, unknown>).item,
    );
    const line = calculateForm8814(item);
    if ((rawLine as Record<string, unknown>).line12 !== line.line12) {
      throw new Error(
        "Form 1040 EIC Form 8814 line 12 differs from its child source",
      );
    }
    childTaxExemptInterest += item.tax_exempt_interest ?? 0;
    childLine4 += form8814EicLine4(line);
    childSchedule1Income += line.line12;
  }
  const schedule1 = pending?.schedule1 as Record<string, unknown> | undefined;
  if ((schedule1?.line8z_form8814 ?? 0) !== childSchedule1Income) {
    throw new Error("Form 1040 EIC Form 8814 income differs from Schedule 1");
  }
  const royalties = scheduleERoyaltyEicAmounts(pending?.schedule_e ?? {});
  const passiveIncome = scheduleEPassiveEicIncome(pending?.schedule_e ?? {});
  const agiInput = agiInputSchema.parse(pending?.agi_aggregator ?? {});
  const partnershipItems = pending?.k1_partnership === undefined
    ? []
    : partnershipK1InputSchema.parse(pending.k1_partnership).k1_partnerships;
  const sCorpItems = pending?.k1_s_corp === undefined
    ? []
    : sCorpK1InputSchema.parse(pending.k1_s_corp).k1_s_corps;
  assertK1EicReview(partnershipItems);
  const ownedLosses = sCorpItems.filter((item) =>
    (item.box1_ordinary_business ?? 0) < 0 &&
    item.form7203_debt_evidence?.kind !==
      "prior_reduced_formal_note_repayment" &&
    item.form7203_debt_evidence?.owned_current_records !== undefined
  );
  if (ownedLosses.length) {
    if (
      ownedLosses.some((item) =>
        item.form7203_stock_loss_ledger
            ?.materially_participated_in_s_corporation !== true ||
        (item.eic_passive_activity_review?.box1 !== undefined &&
          item.eic_passive_activity_review.box1 !== "nonpassive")
      )
    ) {
      throw new Error(
        "Form 1040 EIC owned basis loss needs consistent nonpassive source facts",
      );
    }
    const basisFields = pending?.form7203 as
      | Record<string, unknown>
      | undefined;
    if (!basisFields) {
      throw new Error("Form 1040 EIC owned loss needs its finalized Form 7203");
    }
    const filer = extractFilerIdentity(filed ?? {});
    if (basisFields.owned_debt_loss_sources !== undefined) {
      projectOwned7203Family(basisFields, pending!, filer);
    } else {
      projectReviewedStockLoss7203(basisFields, pending!, filer);
    }
  }
  // A replayed materially participated S-corporation loss affects AGI, not
  // Worksheet 1 passive losses or earned income. All other K-1 loss guards stay.
  assertK1EicReview(
    sCorpItems.map((item) =>
      ownedLosses.includes(item) ? { ...item, box1_ordinary_business: 0 } : item
    ),
  );
  if (
    reviewedK1PassiveIncome(partnershipItems) +
        reviewedK1PassiveIncome(sCorpItems) > 0
  ) {
    if (
      (agiInput.pal_current_loss ?? 0) + (agiInput.pal_prior_unallowed ?? 0) >
        0 &&
      pending?.form8582 === undefined
    ) {
      throw new Error(
        "Form 1040 EIC K-1 passive losses need their actual Form 8582",
      );
    }
    if (pending?.form8582 !== undefined) {
      nativeForm8582.build(pending.form8582 as Record<string, unknown>, {
        pending,
      });
    }
  }
  const k1PassiveIncome = reviewedK1PassiveIncome(partnershipItems) +
    reviewedK1PassiveIncome(sCorpItems);
  const reportedK1PassiveIncome = Array.isArray(agiInput.eic_passive_k1_income)
    ? agiInput.eic_passive_k1_income.reduce((sum, amount) => sum + amount, 0)
    : (agiInput.eic_passive_k1_income ?? 0);
  if (reportedK1PassiveIncome !== k1PassiveIncome) {
    throw new Error(
      "Form 1040 EIC passive K-1 income differs from K-1 sources",
    );
  }
  if ((agiInput.eic_passive_schedule_e_income ?? 0) !== passiveIncome) {
    throw new Error(
      "Form 1040 EIC passive income differs from Schedule E sources",
    );
  }
  const passiveOrdinaryBeforeFinal = pending?.form4797 === undefined
    ? 0
    : form4797EicPassiveOrdinary(pending.form4797);
  if (
    (agiInput.eic_passive_4797_ordinary ?? 0) !==
      passiveOrdinaryBeforeFinal
  ) {
    throw new Error(
      "Form 1040 EIC passive ordinary gain differs from Form 4797 sources",
    );
  }
  const allowedPartII = typeof agiFinal?.allowed_part_ii === "number"
    ? agiFinal.allowed_part_ii
    : 0;
  const passiveOrdinary = passiveOrdinaryBeforeFinal - allowedPartII;
  const finalizedPalInput = agiFinal === undefined
    ? agiInput
    : agiInputSchema.parse({
      ...agiInput,
      pal_pending_active_4797: false,
      pal_4797_preapplied_loss: (agiFinal.allowed_part_i as number) +
        allowedPartII,
      pal_final_allowed_loss: agiFinal.allowed_total,
    });
  const passiveNet = Math.max(
    0,
    passiveIncome + passiveOrdinary + k1PassiveIncome -
      remainingAllowedPassiveLoss(finalizedPalInput),
  );
  const personalRental = pending?.personal_property_rental === undefined
    ? { income: 0, expenses: 0 }
    : personalPropertyRentalTotals(pending.personal_property_rental);
  if (
    (schedule1?.line8l_personal_property_rent ?? 0) !==
      personalRental.income ||
    (schedule1?.line24b_personal_property_expenses ?? 0) !==
      personalRental.expenses
  ) {
    throw new Error(
      "Form 1040 EIC personal-property rental differs from Schedule 1",
    );
  }
  const investmentIncomeFloor = Math.max(0, filedAmount("line2a_tax_exempt")) +
    childTaxExemptInterest +
    Math.max(0, filedAmount("line2b_taxable_interest")) +
    Math.max(0, filedAmount("line3b_ordinary_dividends")) +
    childLine4 +
    Math.max(
      0,
      royalties.income + personalRental.income - royalties.expenses -
        personalRental.expenses,
    ) +
    Math.max(0, capitalGain - form4797Exclusion) + passiveNet;
  if (
    !("investment_income_floor" in result) ||
    result.investment_income_floor !== investmentIncomeFloor
  ) {
    throw new Error(
      "Form 1040 EIC investment income differs from filed interest, dividends, gains, royalties, and rent",
    );
  }
  if (investmentIncomeFloor > EITC_INVESTMENT_INCOME_LIMIT_2025) {
    throw new Error("Form 1040 EIC investment income exceeds the 2025 limit");
  }
  const source = generalInputSchema.safeParse(pending?.general);
  const form8862 = f8862InputSchema.safeParse(pending?.f8862);
  const priorReviewEligible = source.success &&
    priorEicDisallowanceEligible({
      ...source.data,
      form8862_filed: form8862.success && form8862.data.claim_eitc === true,
      form8862_disallowed_year: form8862.success
        ? form8862.data.eitc_disallowed_year
        : undefined,
      form8862_notice_reference: form8862.success
        ? form8862.data.eitc_disallowance_notice_reference
        : undefined,
    }, result.qualifying_children as number);
  if (!source.success || !priorReviewEligible) {
    throw new Error("Form 1040 EIC needs reviewed prior-disallowance history");
  }
  if (!eicTaxResidencyEligible(source.data)) {
    throw new Error("Form 1040 EIC needs reviewed full-year resident status");
  }
  if (
    source.data.filing_status !== filingStatus ||
    !filerCreditEligibility(source.data).eitc
  ) {
    throw new Error("Form 1040 EIC needs matching general filer facts");
  }
  if (result.qualifying_children !== 0) {
    if (
      !childEicFilerEligible({
        ...source.data,
        mfs_separation_reviewed:
          source.data.mfs_eitc_separation_review !== undefined,
      })
    ) {
      throw new Error(
        "Form 1040 child EIC needs reviewed filer qualifying-child status",
      );
    }
    return;
  }
  if (
    !childlessEicEligible(source.data) || mainHomeInUS !== true
  ) {
    throw new Error(
      "Form 1040 childless EIC needs reviewed general source facts",
    );
  }
}
