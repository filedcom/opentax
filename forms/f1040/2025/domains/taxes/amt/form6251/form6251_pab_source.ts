import { inputSchema as intSchema } from "../../../../../nodes/inputs/income/investments/f1099int/index.ts";
import { inputSchema as oidSchema } from "../../../../../nodes/inputs/income/investments/f1099oid/index.ts";
import { inputSchema as divSchema } from "../../../../../nodes/inputs/income/investments/f1099div/index.ts";
import { inputSchema as childSchema } from "../../../../../nodes/inputs/income/investments/f8814/index.ts";
import { reconcileForm4952PabAmt } from "../../../deductions/investments/form4952/form4952_pab_amt_reconciliation.ts";

/** Replay the four retained private-activity-bond source routes at export. */
export function assertForm6251PrivateActivityBondSource(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  const currentInvestmentBondSource = pending?.form4952 as
    | Record<string, unknown>
    | undefined;
  if (
    currentInvestmentBondSource?.source_private_activity_bond_interest !==
      undefined
  ) {
    const difference = reconcileForm4952PabAmt(
      currentInvestmentBondSource,
      pending!,
    );
    const retained6251 = pending?.form6251 as
      | Record<string, unknown>
      | undefined;
    if (
      !retained6251 || fields.line2c_investment_interest !== difference ||
      fields.line2g_pab_interest !== retained6251.line2g_pab_interest ||
      fields.line11_amt !== retained6251.line11_amt
    ) {
      throw new Error(
        "Form 6251 current PAB sources disagree with its filed AMT amounts",
      );
    }
    return;
  }
  const int = pending?.f1099int === undefined
    ? undefined
    : intSchema.safeParse(pending.f1099int);
  const oid = pending?.f1099oid === undefined
    ? undefined
    : oidSchema.safeParse(pending.f1099oid);
  const div = pending?.f1099div === undefined
    ? undefined
    : divSchema.safeParse(pending.f1099div);
  const child = pending?.f8814 === undefined
    ? undefined
    : childSchema.safeParse(pending.f8814);
  const ints = int?.success ? int.data.f1099ints : [];
  const oids = oid?.success ? oid.data.f1099oids : [];
  const divs = div?.success ? div.data.f1099divs : [];
  const children = child?.success ? child.data.f8814s : [];
  const intNet = (item: typeof ints[number]) =>
    (item.box9 ?? 0) -
    (item.pab_allocable_deduction_workpaper?.allocable_deduction ?? 0);
  const oidNet = (item: typeof oids[number]) =>
    (item.box11_pab_oid ?? 0) -
    (item.pab_allocable_deduction_workpaper?.allocable_deduction ?? 0);
  const interest = ints.reduce((sum, item) => sum + intNet(item), 0) +
    oids.reduce((sum, item) => sum + oidNet(item), 0) +
    children.reduce(
      (sum, item) => sum + (item.private_activity_bond_interest ?? 0),
      0,
    );
  const dividends = divs.reduce((sum, item) => sum + (item.box13 ?? 0), 0);
  const rawInterest = fields.line2g_pab_interest;
  const claimedInterest = Array.isArray(rawInterest)
    ? rawInterest.reduce((sum: number, value: number) => sum + value, 0)
    : (rawInterest ?? 0);
  const total = interest + dividends;
  const twoIntOnly = ints.length === 2 &&
    ints.every((item) => (item.box9 ?? 0) > 0) &&
    oids.length === 0 && divs.length === 0 && children.length === 0;
  const twoIntReferences = twoIntOnly
    ? ints.flatMap((item) => [
      item.source_document_reference,
      item.pab_review_reference,
      item.pab_allocable_deduction_workpaper?.reviewed_workpaper_reference,
      item.pab_allocable_deduction_workpaper?.expense_record_reference,
    ])
    : [];
  const sameIntIssuer = twoIntOnly &&
    ints[0].payer_tin === ints[1].payer_tin;
  const oneOidOnly = oids.length === 1 &&
    (oids[0].box11_pab_oid ?? 0) > 0 &&
    ints.length === 0 && divs.length === 0 && children.length === 0;
  const oneIntOneOid = ints.length === 1 && oids.length === 1 &&
    (ints[0].box9 ?? 0) > 0 && (oids[0].box11_pab_oid ?? 0) > 0 &&
    divs.length === 0 && children.length === 0;
  const oneDivOnly = divs.length === 1 && (divs[0].box13 ?? 0) > 0 &&
    ints.length === 0 && oids.length === 0 && children.length === 0;
  const oneIntOneDiv = ints.length === 1 && divs.length === 1 &&
    (ints[0].box9 ?? 0) > 0 && (divs[0].box13 ?? 0) > 0 &&
    oids.length === 0 && children.length === 0;
  const mixedIntDivPab = ints.some((item) => (item.box9 ?? 0) > 0) &&
    divs.some((item) => (item.box13 ?? 0) > 0);
  const sameIssuer = oneIntOneOid &&
    ints[0].payer_tin === oids[0].payer_tin &&
    ints[0].payer_name === oids[0].payer_name;
  const hasOidPab = oids.some((item) => (item.box11_pab_oid ?? 0) > 0);
  const hasAllocableDeduction = [...ints, ...oids].some((item) =>
    (item.pab_allocable_deduction_workpaper?.allocable_deduction ?? 0) > 0
  );
  const form1040 = pending?.f1040 as Record<string, unknown> | undefined;
  const schedule2 = pending?.schedule2 as Record<string, unknown> | undefined;
  const amt = typeof fields.line11_amt === "number"
    ? fields.line11_amt
    : undefined;
  const twoIntTaxExempt = ints.reduce(
    (sum, item) => sum + (item.box8 ?? 0),
    0,
  );
  const oneOidTaxExempt = oneOidOnly
    ? (oids[0].box11_tax_exempt_oid ?? 0) -
      (oids[0].box6_applies_to === "tax_exempt_oid"
        ? oids[0].box6_acquisition_premium ?? 0
        : 0) -
      (oids[0].box10_applies_to === "tax_exempt_oid"
        ? oids[0].box10_bond_premium ?? 0
        : 0)
    : 0;
  if (
    int?.success === false || oid?.success === false ||
    div?.success === false || child?.success === false ||
    ints.some((item) => (item.box9 ?? 0) > (item.box8 ?? 0)) ||
    ints.some((item) => intNet(item) < 0) ||
    oids.some((item) => oidNet(item) < 0) ||
    oids.some((item) =>
      ((item.box11_tax_exempt_oid ?? 0) > 0 &&
        item.box11_pab_oid === undefined) ||
      (item.box11_pab_oid ?? 0) >
        (item.box11_tax_exempt_oid ?? 0) -
          (item.box6_applies_to === "tax_exempt_oid"
            ? item.box6_acquisition_premium ?? 0
            : 0) -
          (item.box10_applies_to === "tax_exempt_oid"
            ? item.box10_bond_premium ?? 0
            : 0)
    ) ||
    divs.some((item) => (item.box13 ?? 0) > (item.box12 ?? 0)) ||
    children.some((item) =>
      (item.private_activity_bond_interest ?? 0) >
        (item.tax_exempt_interest ?? 0)
    ) ||
    claimedInterest !== interest ||
    (fields.private_activity_bond_interest ?? 0) !== total ||
    (hasOidPab && !oneOidOnly && !oneIntOneOid) ||
    (hasAllocableDeduction && !twoIntOnly && !oneOidOnly &&
      !oneIntOneOid && !oneIntOneDiv) ||
    (mixedIntDivPab && !oneIntOneDiv) ||
    (oneDivOnly && (
      !divs[0].payerName?.trim() ||
      !/^\d{9}$/.test(divs[0].payerTin ?? "") ||
      !divs[0].source_document_reference?.trim() ||
      !divs[0].pab_dividend_review ||
      divs[0].pab_dividend_review
          ?.bond_eligibility_review_reference ===
        divs[0].pab_dividend_review
          ?.taxpayer_expense_review_reference ||
      divs[0].box12 !== divs[0].box13 ||
      divs[0].isNominee ||
      divs[0].nominee_distribution !== undefined ||
      divs[0].box11 ||
      divs[0].investment_property_for_form4952 === true ||
      [
        divs[0].box1a,
        divs[0].box1b,
        divs[0].box2a,
        divs[0].box2b,
        divs[0].box2c,
        divs[0].box2d,
        divs[0].box2e,
        divs[0].box2f,
        divs[0].box3,
        divs[0].box4,
        divs[0].box5,
        divs[0].box6,
        divs[0].box7,
        divs[0].box9,
        divs[0].box10,
        divs[0].box16,
      ].some((value) => (value ?? 0) !== 0) ||
      divs[0].box8 !== undefined || divs[0].box14 !== undefined ||
      divs[0].box15 !== undefined ||
      divs[0].foreign_source_dividends_usd !== undefined ||
      divs[0].foreign_source_qualified_dividends_usd !== undefined ||
      divs[0].foreign_tax_irs_country_code !== undefined ||
      claimedInterest !== 0 ||
      form1040?.line2a_tax_exempt !== divs[0].box12 ||
      amt === undefined || amt <= 0 || schedule2?.line2_amt !== amt ||
      (typeof form1040?.line17_additional_taxes !== "number" ||
        Number(form1040.line17_additional_taxes) < amt)
    )) ||
    (oneIntOneDiv && (
      !/^[0-9]{9}$/.test(ints[0].payer_tin ?? "") ||
      !/^[0-9]{9}$/.test(divs[0].payerTin ?? "") ||
      ints[0].payer_tin === divs[0].payerTin ||
      !ints[0].payer_name?.trim() || !divs[0].payerName?.trim() ||
      !ints[0].source_document_reference ||
      !divs[0].source_document_reference ||
      !ints[0].pab_review_reference ||
      !ints[0].pab_eligible_bonds_reviewed ||
      !ints[0].pab_allocable_deduction_workpaper ||
      !divs[0].pab_dividend_review ||
      divs[0].pab_dividend_review
          ?.bond_eligibility_review_reference ===
        divs[0].pab_dividend_review
          ?.taxpayer_expense_review_reference ||
      new Set([
          ints[0].source_document_reference,
          divs[0].source_document_reference,
          ints[0].pab_review_reference,
          ints[0].pab_allocable_deduction_workpaper
            ?.reviewed_workpaper_reference,
          ints[0].pab_allocable_deduction_workpaper?.expense_record_reference,
          divs[0].pab_dividend_review?.bond_eligibility_review_reference,
          divs[0].pab_dividend_review?.taxpayer_expense_review_reference,
        ]).size !== 7 ||
      ints[0].box8 !== ints[0].box9 ||
      (ints[0].box13 ?? 0) !== 0 ||
      divs[0].box12 !== divs[0].box13 ||
      divs[0].isNominee || divs[0].nominee_distribution !== undefined ||
      divs[0].box11 ||
      divs[0].investment_property_for_form4952 === true ||
      [
        ints[0].box1,
        ints[0].box2,
        ints[0].box3,
        ints[0].box4,
        ints[0].box5,
        ints[0].box6,
        ints[0].box10,
        ints[0].box11,
        ints[0].box12,
        ints[0].box17,
        divs[0].box1a,
        divs[0].box1b,
        divs[0].box2a,
        divs[0].box2b,
        divs[0].box2c,
        divs[0].box2d,
        divs[0].box2e,
        divs[0].box2f,
        divs[0].box3,
        divs[0].box4,
        divs[0].box5,
        divs[0].box6,
        divs[0].box7,
        divs[0].box9,
        divs[0].box10,
        divs[0].box16,
      ].some((value) => (value ?? 0) !== 0) ||
      ints[0].box7 !== undefined || ints[0].box14 !== undefined ||
      ints[0].box15 !== undefined || ints[0].box16 !== undefined ||
      ints[0].foreign_source_interest_usd !== undefined ||
      ints[0].foreign_tax_irs_country_code !== undefined ||
      ints[0].foreign_tax_source_document_reference !== undefined ||
      ints[0].seller_financed === true ||
      ints[0].investment_property_for_form4952 === true ||
      divs[0].box8 !== undefined || divs[0].box14 !== undefined ||
      divs[0].box15 !== undefined ||
      divs[0].foreign_source_dividends_usd !== undefined ||
      divs[0].foreign_source_qualified_dividends_usd !== undefined ||
      divs[0].foreign_tax_irs_country_code !== undefined ||
      claimedInterest !== intNet(ints[0]) ||
      form1040?.line2a_tax_exempt !==
        (ints[0].box8 ?? 0) + (divs[0].box12 ?? 0) ||
      amt === undefined || amt <= 0 || schedule2?.line2_amt !== amt ||
      (typeof form1040?.line17_additional_taxes !== "number" ||
        Number(form1040.line17_additional_taxes) < amt)
    )) ||
    (twoIntOnly && (
      ints.some((item) =>
        !item.source_document_reference ||
        !/^[0-9]{9}$/.test(item.payer_tin ?? "") ||
        !item.payer_name?.trim() ||
        !item.pab_review_reference ||
        item.pab_eligible_bonds_reviewed !== true ||
        !item.pab_allocable_deduction_workpaper ||
        (item.box13 ?? 0) !== 0
      ) ||
      (sameIntIssuer && (
        ints[0].payer_name !== ints[1].payer_name ||
        !ints[0].pab_bond_identifier ||
        !ints[1].pab_bond_identifier ||
        ints[0].pab_bond_identifier === ints[1].pab_bond_identifier ||
        ints.some((item) => item.box8 !== item.box9)
      )) ||
      new Set(twoIntReferences).size !== twoIntReferences.length ||
      form1040?.line2a_tax_exempt !== twoIntTaxExempt ||
      amt === undefined ||
      (schedule2?.line2_amt ?? 0) !== amt ||
      (amt > 0 &&
        (typeof form1040?.line17_additional_taxes !== "number" ||
          Number(form1040?.line17_additional_taxes) < amt))
    )) ||
    (oneOidOnly && (
      !oids[0].payer_tin?.match(/^\d{9}$/) ||
      !oids[0].source_document_reference ||
      !oids[0].pab_review_reference ||
      oids[0].pab_eligible_bonds_reviewed !== true ||
      !oids[0].pab_allocable_deduction_workpaper ||
      oids[0].box11_pab_oid !== oneOidTaxExempt ||
      (oids[0].box1_oid ?? 0) !== 0 ||
      (oids[0].box2_other_interest ?? 0) !== 0 ||
      (oids[0].box3_early_withdrawal_penalty ?? 0) !== 0 ||
      (oids[0].box4_federal_withheld ?? 0) !== 0 ||
      (oids[0].box5_market_discount ?? 0) !== 0 ||
      (oids[0].box8_oid_treasury ?? 0) !== 0 ||
      (oids[0].box9_investment_expenses ?? 0) !== 0 ||
      (oids[0].box12_state_tax ?? 0) !== 0 ||
      oids[0].box13_fatca === true ||
      (oids[0].nominee_oid ?? 0) !== 0 ||
      form1040?.line2a_tax_exempt !== oneOidTaxExempt ||
      amt === undefined ||
      (schedule2?.line2_amt ?? 0) !== amt ||
      (amt > 0 &&
        (typeof form1040?.line17_additional_taxes !== "number" ||
          Number(form1040.line17_additional_taxes) < amt))
    )) ||
    (oneIntOneOid && (
      !/^[0-9]{9}$/.test(ints[0].payer_tin ?? "") ||
      !/^[0-9]{9}$/.test(oids[0].payer_tin ?? "") ||
      !ints[0].payer_name?.trim() || !oids[0].payer_name?.trim() ||
      (ints[0].payer_tin === oids[0].payer_tin) !==
        (ints[0].payer_name === oids[0].payer_name) ||
      (sameIssuer && (
        !ints[0].pab_bond_identifier ||
        ints[0].pab_bond_identifier !== oids[0].pab_bond_identifier
      )) ||
      !ints[0].source_document_reference ||
      !oids[0].source_document_reference ||
      ints[0].source_document_reference ===
        oids[0].source_document_reference ||
      !ints[0].pab_review_reference || !oids[0].pab_review_reference ||
      ints[0].pab_review_reference === oids[0].pab_review_reference ||
      !ints[0].pab_allocable_deduction_workpaper ||
      !oids[0].pab_allocable_deduction_workpaper ||
      ints[0].pab_allocable_deduction_workpaper
          ?.reviewed_workpaper_reference ===
        oids[0].pab_allocable_deduction_workpaper
          ?.reviewed_workpaper_reference ||
      ints[0].pab_allocable_deduction_workpaper?.expense_record_reference ===
        oids[0].pab_allocable_deduction_workpaper?.expense_record_reference ||
      ints[0].pab_eligible_bonds_reviewed !== true ||
      oids[0].pab_eligible_bonds_reviewed !== true ||
      ints[0].box9 !== ints[0].box8 ||
      oids[0].box11_pab_oid !==
        (oids[0].box11_tax_exempt_oid ?? 0) -
          (oids[0].box6_applies_to === "tax_exempt_oid"
            ? oids[0].box6_acquisition_premium ?? 0
            : 0) -
          (oids[0].box10_applies_to === "tax_exempt_oid"
            ? oids[0].box10_bond_premium ?? 0
            : 0) ||
      [
        ints[0].box1,
        ints[0].box2,
        ints[0].box3,
        ints[0].box4,
        ints[0].box5,
        ints[0].box6,
        ints[0].box10,
        ints[0].box11,
        ints[0].box12,
        ints[0].box13,
        ints[0].box17,
        ints[0].nominee_interest,
        ints[0].accrued_interest_paid,
        ints[0].non_taxable_oid_adjustment,
        oids[0].box1_oid,
        oids[0].box2_other_interest,
        oids[0].box3_early_withdrawal_penalty,
        oids[0].box4_federal_withheld,
        oids[0].box5_market_discount,
        oids[0].box8_oid_treasury,
        oids[0].box9_investment_expenses,
        oids[0].box12_state_tax,
        oids[0].nominee_oid,
      ].some((value) => (value ?? 0) !== 0) ||
      ints[0].box7 !== undefined || ints[0].box14 !== undefined ||
      ints[0].box15 !== undefined || ints[0].box16 !== undefined ||
      ints[0].box17 !== undefined ||
      ints[0].foreign_source_interest_usd !== undefined ||
      ints[0].foreign_tax_irs_country_code !== undefined ||
      ints[0].foreign_tax_source_document_reference !== undefined ||
      ints[0].seller_financed === true ||
      ints[0].investment_property_for_form4952 === true ||
      oids[0].investment_property_for_form4952 === true ||
      oids[0].box13_fatca === true ||
      form1040?.line2a_tax_exempt !==
        (ints[0].box8 ?? 0) + (oids[0].box11_pab_oid ?? 0) ||
      amt === undefined || schedule2?.line2_amt !== amt ||
      (amt > 0 &&
        (typeof form1040?.line17_additional_taxes !== "number" ||
          Number(form1040.line17_additional_taxes) < amt))
    ))
  ) {
    throw new Error(
      "Form 6251 line 2g needs retained 1099-INT/OID/DIV and Form 8814 private-activity-bond sources matching its total",
    );
  }
}
