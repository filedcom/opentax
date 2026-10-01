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
  const form1040 = pending?.f1040 as Record<string, unknown> | undefined;
  const schedule2 = pending?.schedule2 as Record<string, unknown> | undefined;
  const amt = typeof fields.line11_amt === "number"
    ? fields.line11_amt
    : undefined;
  const twoIntTaxExempt = ints.reduce(
    (sum, item) => sum + (item.box8 ?? 0),
    0,
  );
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
    ))
  ) {
    throw new Error(
      "Form 6251 line 2g needs retained 1099-INT/OID/DIV and Form 8814 private-activity-bond sources matching its total",
    );
  }
}
