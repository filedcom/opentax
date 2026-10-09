import {
  currentYearForm8839Carryforward,
  form8839CurrentCarryforwardSchema,
} from "./current_year_carryforward.ts";
import { z } from "zod";
import { element, elements } from "../../../../../../mef/xml.ts";
import {
  type FilerIdentity,
  FilingStatus,
} from "../../../../../../mef/header.ts";
import { type Form8839Input, inputSchema } from "./index.ts";
import { reconcilePreAdoptionForm8839Credit } from "./pre_adoption_reconciliation.ts";

const wholeDollar = z.number().refine(
  (value) => Number.isSafeInteger(value) && value >= 0,
);
const finalPendingSchema = z.object({
  form8839: inputSchema,
  form8839_carryforward: form8839CurrentCarryforwardSchema.optional(),
  f1040: z.object({
    line11_agi: z.number().finite(),
    line18_total_tax_before_credits: wholeDollar,
    line19_child_tax_credit: wholeDollar.optional(),
    line20_nonrefundable_credits: wholeDollar,
    line30_refundable_adoption: wholeDollar,
  }).passthrough(),
  schedule3: z.object({
    line6c_adoption_credit: wholeDollar,
    line7_total: wholeDollar,
    line8_total: wholeDollar,
  }).passthrough(),
}).passthrough();

export const form8839Page1FieldMap = {
  headerName: "topmostSubform[0].Page1[0].f1_1[0]",
  headerSSN: "topmostSubform[0].Page1[0].f1_2[0]",
  childFirst:
    "topmostSubform[0].Page1[0].Table_PartI[0].BodyRow_Child1[0].f1_3[0]",
  childLast:
    "topmostSubform[0].Page1[0].Table_PartI[0].BodyRow_Child1[0].f1_4[0]",
  childBirthYear:
    "topmostSubform[0].Page1[0].Table_PartI[0].BodyRow_Child1[0].f1_5[0]",
  childSSN:
    "topmostSubform[0].Page1[0].Table_PartI[0].BodyRow_Child1[0].f1_6[0]",
  adoptionFinal:
    "topmostSubform[0].Page1[0].Table_PartI[0].BodyRow_Child1[0].c1_4[0]",
  noPriorForm:
    "topmostSubform[0].Page1[0].Line3_ReadOrder[0].Line3Checkboxes_ReadOrder[0].c1_13[0]",
  noPhaseout: "topmostSubform[0].Page1[0].Line8_ReadOrder[0].c1_14[0]",
  phaseoutYes: "topmostSubform[0].Page1[0].Line8_ReadOrder[0].c1_14[1]",
  line8: "topmostSubform[0].Page1[0].f1_31[0]",
  line9Whole: "topmostSubform[0].Page1[0].f1_32[0]",
  line9Fraction: "topmostSubform[0].Page1[0].f1_33[0]",
  line2: "topmostSubform[0].Page1[0].Child1[0].f1_15[0]",
  line3: "topmostSubform[0].Page1[0].f1_18[0]",
  line4: "topmostSubform[0].Page1[0].f1_21[0]",
  line5: "topmostSubform[0].Page1[0].f1_24[0]",
  line6: "topmostSubform[0].Page1[0].f1_27[0]",
  line7: "topmostSubform[0].Page1[0].f1_30[0]",
  line10: "topmostSubform[0].Page1[0].f1_34[0]",
  line11a: "topmostSubform[0].Page1[0].f1_37[0]",
  line11b: "topmostSubform[0].Page1[0].f1_40[0]",
  line11c: "topmostSubform[0].Page1[0].f1_43[0]",
  line12: "topmostSubform[0].Page1[0].f1_44[0]",
  line13: "topmostSubform[0].Page1[0].f1_45[0]",
  line14: "topmostSubform[0].Page1[0].f1_46[0]",
  line15: "topmostSubform[0].Page1[0].f1_47[0]",
  line16: "topmostSubform[0].Page1[0].f1_48[0]",
  line17: "topmostSubform[0].Page1[0].f1_49[0]",
  line18: "topmostSubform[0].Page1[0].f1_50[0]",
} as const;

function canonicalValue(value: unknown): string {
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) {
    return `[${value.map(canonicalValue).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${
      Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => `${JSON.stringify(key)}:${canonicalValue(item)}`)
        .join(",")
    }}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

/**
 * Shared document projection for the reviewed prepared route. Matching pending
 * data is not proof of source authenticity; the prepared bundle binds bytes.
 */
export function projectStagedForm8839Documents(
  rawSource: Form8839Input,
  rawChildReview: unknown,
  rawPreAdoptionSinkInput: Parameters<
    typeof reconcilePreAdoptionForm8839Credit
  >[2],
  rawMagiReview: unknown,
  rawFinalPending: unknown,
  filer: FilerIdentity,
) {
  const source = inputSchema.parse(rawSource);
  const pending = finalPendingSchema.parse(rawFinalPending);
  const reconciled = reconcilePreAdoptionForm8839Credit(
    source,
    rawChildReview,
    rawPreAdoptionSinkInput,
    rawMagiReview,
    pending.form2555,
  );
  const child = source.children?.[0];
  const perChild = reconciled.credit.perChild[0];
  const credit = reconciled.credit;
  const final1040 = pending.f1040;
  const schedule3 = pending.schedule3;
  const pre1040 = reconciled.preAdoptionForm1040;
  const preLine7 = rawPreAdoptionSinkInput.credit_limit_schedule3_lines?.line7;
  const preLine20 = pre1040.line21_credits_total -
    reconciled.context.child_credit_priority.amount;
  if (
    !child || !perChild ||
    filer.filingStatus !== FilingStatus.Single ||
    !filer.nameLine1?.trim() || !/^\d{9}$/.test(filer.primarySSN) ||
    canonicalValue(pending.form8839) !== canonicalValue(source) ||
    credit.magi < 0 || credit.magi >= 299_190 ||
    credit.line13 <= 0 ||
    perChild.line3 !== 0 ||
    final1040.line11_agi !== pre1040.line11_agi ||
    final1040.line18_total_tax_before_credits !==
      pre1040.line18_total_tax_before_credits ||
    (final1040.line19_child_tax_credit ?? 0) !==
      reconciled.context.child_credit_priority.amount ||
    final1040.line20_nonrefundable_credits !== preLine20 + credit.line18 ||
    final1040.line30_refundable_adoption !== credit.line13 ||
    schedule3.line6c_adoption_credit !== credit.line18 ||
    preLine7 === undefined ||
    schedule3.line7_total !== preLine7 + credit.line18 ||
    schedule3.line8_total !== preLine20 + credit.line18
  ) {
    throw new Error(
      "Form 8839 staged filing requires exactly reconciled child, pre-adoption and final 1040/Schedule 3 values",
    );
  }
  const expectedCarryforward = currentYearForm8839Carryforward(
    source,
    credit,
    filer.primarySSN,
  );
  if (
    canonicalValue(pending.form8839_carryforward) !==
      canonicalValue(expectedCarryforward)
  ) {
    throw new Error(
      "Form 8839 carryforward differs from its source and final credit",
    );
  }
  const amounts = [
    perChild.line2,
    perChild.line3,
    perChild.line4,
    perChild.line5,
    perChild.line6,
    perChild.line10,
    perChild.line11a,
    perChild.line11b,
    credit.magi,
    credit.line11c,
    credit.line12,
    credit.line13,
    credit.line14,
    credit.line17,
    credit.line18,
  ];
  if (!amounts.every((value) => Number.isSafeInteger(value) && value >= 0)) {
    throw new Error(
      "Form 8839 staged native/PDF projection needs whole-dollar lines",
    );
  }
  const phased = credit.magi > 259_190;
  const line8 = phased ? credit.magi - 259_190 : undefined;
  const fraction = phased ? credit.fraction.toFixed(3) : undefined;
  if (
    (phased && (line8 === undefined || line8 <= 0 ||
      credit.fraction <= 0 || credit.fraction >= 1 ||
      perChild.line10 !==
        Math.round(perChild.line6 * credit.fraction * 100) / 100)) ||
    (!phased && (credit.fraction !== 0 || perChild.line10 !== 0))
  ) {
    throw new Error("Form 8839 staged phaseout lines do not reconcile");
  }

  const xml = elements("IRS8839", [
    elements("AdoptedChild", [
      element("PersonFirstNm", child.first_name),
      element("PersonLastNm", child.last_name),
      element("ChildBirthYr", child.birth_year),
      element("ChildSSN", child.ssn),
      element("AdoptionFinalInd", "X"),
      element("AdoptionCreditMaxPerChildAmt", perChild.line2),
      element("AdoptionCreditPriorYearAmt", perChild.line3),
      element("AdoptionNetAllowedTaxCreditAmt", perChild.line4),
      element("QualifiedAdoptionExpenseAmt", perChild.line5),
      element("AdoptionSmllrCreditOrExpnsAmt", perChild.line6),
      element("CalculatedAdoptionCreditAmt", perChild.line10),
      element("NetCalculatedAdoptionCreditAmt", perChild.line11a),
      element("NetCalculatedAdoptionCrAdjAmt", perChild.line11b),
    ]),
    element("AdoptionCreditModifiedAGIAmt", credit.magi),
    ...(phased
      ? [
        element("AdoptionCreditModifAGILimitAmt", line8),
        element("AdoptionCrModifAGIGrtrAmtInd", "X"),
        element("AdoptionCreditAdjModifAGIPct", fraction),
      ]
      : []),
    element("RefundableAdoptionCreditAmt", credit.line11c),
    element("NetAdoptionCreditExclCfwdAmt", credit.line12),
    element("RefundableAdptnCrCfwdExclAmt", credit.line14),
    element("AdoptionCreditCfwdAmt", 0),
    element("NetAdoptionCreditCfwdAmt", credit.line14),
    element("CreditLimitWorksheetAmt", credit.line17),
    element("NonrefundableAdoptionCreditAmt", credit.line18),
  ]);
  const pdfFields = {
    headerName: filer.nameLine1,
    headerSSN: filer.primarySSN,
    childFirst: child.first_name,
    childLast: child.last_name,
    childBirthYear: child.birth_year,
    childSSN: child.ssn,
    adoptionFinal: true,
    noPriorForm: true,
    noPhaseout: !phased,
    phaseoutYes: phased,
    ...(phased
      ? {
        line8,
        line9Whole: fraction!.split(".")[0],
        line9Fraction: fraction!.split(".")[1],
      }
      : {}),
    line2: perChild.line2,
    line3: 0,
    line4: perChild.line4,
    line5: perChild.line5,
    line6: perChild.line6,
    line7: credit.magi,
    line10: perChild.line10,
    line11a: perChild.line11a,
    line11b: perChild.line11b,
    line11c: credit.line11c,
    line12: credit.line12,
    line13: credit.line13,
    line14: credit.line14,
    line15: 0,
    line16: credit.line14,
    line17: credit.line17,
    line18: credit.line18,
  };
  return { xml, pdfFields, fieldMap: form8839Page1FieldMap };
}
