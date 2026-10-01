import { inputSchema as intSchema } from "../nodes/inputs/f1099int/index.ts";
import { inputSchema as oidSchema } from "../nodes/inputs/f1099oid/index.ts";
import { inputSchema as divSchema } from "../nodes/inputs/f1099div/index.ts";
import { inputSchema as childSchema } from "../nodes/inputs/f8814/index.ts";

/** Replay the four retained private-activity-bond source routes at export. */
export function assertForm6251PrivateActivityBondSource(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
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
  const interest = ints.reduce((sum, item) => sum + (item.box9 ?? 0), 0) +
    oids.reduce((sum, item) => sum + (item.box11_pab_oid ?? 0), 0) +
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
      item.payer_tin,
      item.pab_review_reference,
    ])
    : [];
  const oneOidOnly = oids.length === 1 &&
    (oids[0].box11_pab_oid ?? 0) > 0 &&
    ints.length === 0 && divs.length === 0 && children.length === 0;
  const oneIntOneOid = ints.length === 1 && oids.length === 1 &&
    (ints[0].box9 ?? 0) > 0 && (oids[0].box11_pab_oid ?? 0) > 0 &&
    divs.length === 0 && children.length === 0;
  const hasOidPab = oids.some((item) => (item.box11_pab_oid ?? 0) > 0);
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
    (twoIntOnly && (
      ints.some((item) =>
        !item.source_document_reference || !item.payer_tin ||
        !item.pab_review_reference ||
        item.pab_eligible_bonds_reviewed !== true ||
        item.pab_no_allocable_deduction_reviewed !== true ||
        (item.box13 ?? 0) !== 0
      ) ||
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
      oids[0].pab_no_allocable_deduction_reviewed !== true ||
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
      ints[0].payer_tin === oids[0].payer_tin ||
      !ints[0].payer_name?.trim() || !oids[0].payer_name?.trim() ||
      ints[0].payer_name === oids[0].payer_name ||
      !ints[0].source_document_reference ||
      !oids[0].source_document_reference ||
      ints[0].source_document_reference ===
        oids[0].source_document_reference ||
      !ints[0].pab_review_reference || !oids[0].pab_review_reference ||
      ints[0].pab_review_reference === oids[0].pab_review_reference ||
      ints[0].pab_eligible_bonds_reviewed !== true ||
      ints[0].pab_no_allocable_deduction_reviewed !== true ||
      oids[0].pab_eligible_bonds_reviewed !== true ||
      oids[0].pab_no_allocable_deduction_reviewed !== true ||
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
