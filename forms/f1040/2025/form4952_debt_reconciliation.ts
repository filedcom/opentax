import { inputSchema as interestSourceSchema } from "../nodes/inputs/f1099int/index.ts";
import { inputSchema as dividendSourceSchema } from "../nodes/inputs/f1099div/index.ts";
import { inputSchema as oidSourceSchema } from "../nodes/inputs/f1099oid/index.ts";
import { inputSchema as miscSourceSchema } from "../nodes/inputs/f1099m/index.ts";
import { inputSchema as generalSchema } from "../nodes/inputs/general/index.ts";
import { FilingStatus as SourceFilingStatus } from "../nodes/types.ts";
import {
  calculateForm4952,
  inputSchema as form4952Schema,
} from "../nodes/intermediate/forms/form4952/index.ts";
import {
  type Form4952DirectDebtTrace,
  reconcileForm4952DirectDebtTrace,
} from "../nodes/intermediate/forms/form4952/debt_trace.ts";
import { reconcileForm4952Itemization } from "./form4952_itemization.ts";

const lineKeys = [
  "line1",
  "line2",
  "line3",
  "line4a",
  "line4b",
  "line4c",
  "line4d",
  "line4e",
  "line4f",
  "line4g",
  "line4h",
  "line5",
  "line6",
  "line7",
  "line8",
] as const;
const traceKeys = [
  "tax_year",
  "owner_tin",
  "loan_id",
  "lender_statement_reference",
  "loan_agreement_reference",
  "disbursement_record_reference",
  "purchase_record_reference",
  "loan_date",
  "direct_purchase_date",
  "borrowed_principal",
  "direct_taxable_securities_purchase",
  "asset_id",
  "no_other_loan_proceeds_use",
  "no_tax_exempt_or_passive_activity_asset",
  "investment_use_maintained_through_2025",
  "lender_2025_interest_total",
] as const;

function sameTrace(
  first: Form4952DirectDebtTrace,
  second: Form4952DirectDebtTrace,
): boolean {
  if (
    traceKeys.some((key) => first[key] !== second[key]) ||
    first.interest_payments.length !== second.interest_payments.length
  ) {
    return false;
  }
  const payments = new Map(first.interest_payments.map((payment) => [
    payment.payment_id,
    payment,
  ]));
  return payments.size === first.interest_payments.length &&
    new Set(second.interest_payments.map((payment) => payment.payment_id))
        .size === second.interest_payments.length &&
    second.interest_payments.every((payment) => {
      const original = payments.get(payment.payment_id);
      return original?.payment_date === payment.payment_date &&
        original.payment_record_reference ===
          payment.payment_record_reference &&
        original.interest_amount === payment.interest_amount;
    });
}

/** Replay one owner-owned taxable-securities loan against the retained input. */
export function reconcileForm4952DirectDebtExport(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>>,
  finalFilerTin?: string,
  jointSpouseTin?: string,
): void {
  const printed = form4952Schema.safeParse(fields);
  const retained = form4952Schema.safeParse(pending.form4952);
  const interest = interestSourceSchema.safeParse(pending.f1099int);
  const dividend = dividendSourceSchema.safeParse(pending.f1099div);
  const oid = oidSourceSchema.safeParse(pending.f1099oid);
  const misc = miscSourceSchema.safeParse(pending.f1099m);
  const oneRoyalty = misc.success && misc.data.f1099ms.length === 1 &&
    pending.f1099int === undefined && pending.f1099div === undefined &&
    pending.f1099oid === undefined;
  const oneInterest = interest.success &&
    interest.data.f1099ints.length === 1 &&
    pending.f1099div === undefined && pending.f1099oid === undefined;
  const twoInterest = interest.success &&
    interest.data.f1099ints.length === 2 &&
    pending.f1099div === undefined && pending.f1099oid === undefined &&
    interest.data.f1099ints.every((item) =>
      item.source_document_reference?.trim() && item.payer_name?.trim()
    ) &&
    new Set(
        interest.data.f1099ints.map((item) => item.source_document_reference),
      ).size === 2 &&
    new Set(interest.data.f1099ints.map((item) => item.payer_name)).size === 2;
  const oneDividend = dividend.success &&
    dividend.data.f1099divs.length === 1 &&
    pending.f1099int === undefined && pending.f1099oid === undefined;
  const twoDividends = dividend.success &&
    dividend.data.f1099divs.length === 2 &&
    pending.f1099int === undefined && pending.f1099oid === undefined &&
    dividend.data.f1099divs.filter((item) => (item.box1b ?? 0) > 0).length ===
      1 &&
    dividend.data.f1099divs.every((item) =>
      !!item.source_document_reference?.trim() && !!item.payerName?.trim()
    ) &&
    new Set(
        dividend.data.f1099divs.map((item) => item.source_document_reference),
      ).size === 2 &&
    new Set(dividend.data.f1099divs.map((item) => item.payerName)).size === 2;
  const oneOid = oid.success && oid.data.f1099oids.length === 1 &&
    pending.f1099int === undefined && pending.f1099div === undefined;
  const twoOid = oid.success && oid.data.f1099oids.length === 2 &&
    pending.f1099int === undefined && pending.f1099div === undefined &&
    oid.data.f1099oids.every((item) =>
      !!item.source_document_reference?.trim() && !!item.payer_name?.trim()
    ) &&
    new Set(
        oid.data.f1099oids.map((item) => item.source_document_reference),
      ).size === 2 &&
    new Set(oid.data.f1099oids.map((item) => item.payer_name)).size === 2;
  const oneTreasuryInterestAndOid = interest.success && oid.success &&
    interest.data.f1099ints.length === 1 &&
    oid.data.f1099oids.length === 1 &&
    pending.f1099div === undefined &&
    (interest.data.f1099ints[0].box1 ?? 0) === 0 &&
    (interest.data.f1099ints[0].box3 ?? 0) > 0 &&
    !!interest.data.f1099ints[0].source_document_reference?.trim() &&
    !!oid.data.f1099oids[0].source_document_reference?.trim() &&
    interest.data.f1099ints[0].source_document_reference !==
      oid.data.f1099oids[0].source_document_reference &&
    !!interest.data.f1099ints[0].payer_name?.trim() &&
    !!oid.data.f1099oids[0].payer_name?.trim() &&
    interest.data.f1099ints[0].payer_name !==
      oid.data.f1099oids[0].payer_name;
  const treasuryOidAndDividend = interest.success && oid.success &&
    dividend.success && interest.data.f1099ints.length === 1 &&
    oid.data.f1099oids.length === 1 && dividend.data.f1099divs.length === 1 &&
    (interest.data.f1099ints[0].box1 ?? 0) === 0 &&
    (interest.data.f1099ints[0].box3 ?? 0) > 0 &&
    (dividend.data.f1099divs[0].box1b ?? 0) === 0 &&
    [
      interest.data.f1099ints[0].source_document_reference,
      oid.data.f1099oids[0].source_document_reference,
      dividend.data.f1099divs[0].source_document_reference,
    ].every((reference) => !!reference?.trim()) &&
    new Set([
        interest.data.f1099ints[0].source_document_reference,
        oid.data.f1099oids[0].source_document_reference,
        dividend.data.f1099divs[0].source_document_reference,
      ]).size === 3 &&
    [
      interest.data.f1099ints[0].payer_name,
      oid.data.f1099oids[0].payer_name,
      dividend.data.f1099divs[0].payerName,
    ].every((name) => !!name?.trim()) &&
    new Set([
        interest.data.f1099ints[0].payer_name,
        oid.data.f1099oids[0].payer_name,
        dividend.data.f1099divs[0].payerName,
      ]).size === 3;
  const oneInterestAndDividend = interest.success && dividend.success &&
    interest.data.f1099ints.length === 1 &&
    dividend.data.f1099divs.length === 1 &&
    pending.f1099oid === undefined &&
    (dividend.data.f1099divs[0].box1b ?? 0) === 0;
  const oneOidAndDividend = oid.success && dividend.success &&
    oid.data.f1099oids.length === 1 &&
    dividend.data.f1099divs.length === 1 &&
    pending.f1099int === undefined &&
    (dividend.data.f1099divs[0].box1b ?? 0) === 0;
  const twoInterestAndDividend = interest.success && dividend.success &&
    interest.data.f1099ints.length === 2 &&
    dividend.data.f1099divs.length === 1 &&
    pending.f1099oid === undefined &&
    (dividend.data.f1099divs[0].box1b ?? 0) === 0 &&
    interest.data.f1099ints.every((item) =>
      item.source_document_reference?.trim() && item.payer_name?.trim()
    ) &&
    new Set(
        interest.data.f1099ints.map((item) => item.source_document_reference),
      ).size === 2 &&
    new Set(interest.data.f1099ints.map((item) => item.payer_name)).size ===
      2 &&
    !!dividend.data.f1099divs[0].source_document_reference;
  const interestAndTwoDividends = interest.success && dividend.success &&
    interest.data.f1099ints.length === 1 &&
    dividend.data.f1099divs.length === 2 &&
    pending.f1099oid === undefined &&
    dividend.data.f1099divs.every((item) =>
      (item.box1b ?? 0) === 0 &&
      item.source_document_reference?.trim() && item.payerName?.trim()
    ) &&
    new Set(
        dividend.data.f1099divs.map((item) => item.source_document_reference),
      ).size === 2 &&
    new Set(dividend.data.f1099divs.map((item) => item.payerName)).size ===
      2 &&
    !!interest.data.f1099ints[0].source_document_reference;
  const twoInterestTwoDividends = interest.success && dividend.success &&
    interest.data.f1099ints.length === 2 &&
    dividend.data.f1099divs.length === 2 &&
    pending.f1099oid === undefined &&
    interest.data.f1099ints.every((item) =>
      item.source_document_reference?.trim() && item.payer_name?.trim()
    ) &&
    dividend.data.f1099divs.every((item) =>
      item.source_document_reference?.trim() && item.payerName?.trim()
    ) &&
    (dividend.data.f1099divs[0].box1b ?? 0) > 0 &&
    (dividend.data.f1099divs[1].box1b ?? 0) === 0 &&
    new Set([
        ...interest.data.f1099ints.map((item) =>
          item.source_document_reference
        ),
        ...dividend.data.f1099divs.map((item) =>
          item.source_document_reference
        ),
      ]).size === 4 &&
    new Set([
        ...interest.data.f1099ints.map((item) => item.payer_name),
        ...dividend.data.f1099divs.map((item) => item.payerName),
      ]).size === 4;
  if (
    !printed.success || !retained.success ||
    !printed.data.direct_debt_trace || !retained.data.direct_debt_trace ||
    (!oneInterest && !twoInterest && !oneDividend && !twoDividends && !oneOid &&
      !twoOid &&
      !oneTreasuryInterestAndOid &&
      !treasuryOidAndDividend &&
      !oneInterestAndDividend && !oneOidAndDividend &&
      !twoInterestAndDividend && !interestAndTwoDividends &&
      !twoInterestTwoDividends && !oneRoyalty) ||
    !sameTrace(printed.data.direct_debt_trace, retained.data.direct_debt_trace)
  ) {
    throw new Error(
      "Form 4952 direct debt export needs one retained loan, matching payments, and a supported 1099 investment payer or royalty inventory",
    );
  }
  const owner = finalFilerTin?.replaceAll("-", "");
  const spouse = jointSpouseTin?.replaceAll("-", "");
  if (
    (owner !== undefined && !/^\d{9}$/.test(owner)) ||
    (spouse !== undefined && (!/^\d{9}$/.test(spouse) || spouse === owner))
  ) {
    throw new Error(
      "Form 4952 direct debt export needs valid joint filer SSNs",
    );
  }
  const trace = retained.data.direct_debt_trace;
  if (
    owner !== undefined && trace.owner_tin !== owner &&
    trace.owner_tin !== spouse
  ) {
    throw new Error(
      "Form 4952 direct debt owner must match the final filer or joint spouse",
    );
  }
  const spouseOwned = owner !== undefined && trace.owner_tin === spouse;
  const general = generalSchema.safeParse(pending.general);
  if (
    spouseOwned &&
    (!general.success ||
      general.data.filing_status !== SourceFilingStatus.MFJ ||
      general.data.taxpayer_ssn?.replaceAll("-", "") !== owner ||
      general.data.spouse_ssn?.replaceAll("-", "") !== spouse)
  ) {
    throw new Error(
      "Form 4952 joint spouse loan needs matching source and final joint-return identities",
    );
  }
  if (
    spouseOwned &&
    ((retained.data.prior_year_carryforward ?? 0) !== 0 ||
      (printed.data.prior_year_carryforward ?? 0) !== 0 ||
      retained.data.prior_year_carryforward_source !== undefined ||
      printed.data.prior_year_carryforward_source !== undefined ||
      !retained.data.amt_refigure || !printed.data.amt_refigure ||
      Object.values(retained.data.amt_refigure).some((amount) =>
        amount !== 0
      ) ||
      Object.values(printed.data.amt_refigure).some((amount) => amount !== 0))
  ) {
    throw new Error(
      "Form 4952 joint spouse loan needs zero prior carryforward and zero AMT refigure adjustments",
    );
  }
  reconcileForm4952DirectDebtTrace(
    trace,
    retained.data,
    trace.owner_tin,
  );
  const lines = calculateForm4952(retained.data);
  if (
    lineKeys.some((key) => fields[key] !== lines[key]) ||
    printed.data.investment_interest_expense !==
      retained.data.investment_interest_expense ||
    (twoInterestTwoDividends
      ? !Array.isArray(printed.data.source_1099_interest) ||
        !Array.isArray(retained.data.source_1099_interest) ||
        !Array.isArray(printed.data.source_1099_dividends) ||
        !Array.isArray(retained.data.source_1099_dividends) ||
        printed.data.source_1099_interest.length !== 2 ||
        retained.data.source_1099_interest.length !== 2 ||
        printed.data.source_1099_dividends.length !== 2 ||
        retained.data.source_1099_dividends.length !== 2 ||
        JSON.stringify(
            [...printed.data.source_1099_interest].sort((a, b) => a - b),
          ) !==
          JSON.stringify(
            [...retained.data.source_1099_interest].sort((a, b) => a - b),
          ) ||
        JSON.stringify(
            [...printed.data.source_1099_dividends].sort((a, b) => a - b),
          ) !==
          JSON.stringify(
            [...retained.data.source_1099_dividends].sort((a, b) => a - b),
          ) ||
        typeof printed.data.source_1099_qualified_dividends !== "number" ||
        typeof retained.data.source_1099_qualified_dividends !== "number" ||
        printed.data.source_1099_qualified_dividends !==
          retained.data.source_1099_qualified_dividends
      : twoDividends
      ? printed.data.source_1099_interest !== undefined ||
        retained.data.source_1099_interest !== undefined ||
        !Array.isArray(printed.data.source_1099_dividends) ||
        !Array.isArray(retained.data.source_1099_dividends) ||
        printed.data.source_1099_dividends.length !== 2 ||
        retained.data.source_1099_dividends.length !== 2 ||
        JSON.stringify(
            [...printed.data.source_1099_dividends].sort((a, b) => a - b),
          ) !==
          JSON.stringify(
            [...retained.data.source_1099_dividends].sort((a, b) => a - b),
          ) ||
        typeof printed.data.source_1099_qualified_dividends !== "number" ||
        typeof retained.data.source_1099_qualified_dividends !== "number" ||
        printed.data.source_1099_qualified_dividends !==
          retained.data.source_1099_qualified_dividends
      : twoInterest || twoOid || oneTreasuryInterestAndOid ||
          treasuryOidAndDividend || twoInterestAndDividend
      ? !Array.isArray(printed.data.source_1099_interest) ||
        !Array.isArray(retained.data.source_1099_interest) ||
        printed.data.source_1099_interest.length !== 2 ||
        retained.data.source_1099_interest.length !== 2 ||
        JSON.stringify(
            [...printed.data.source_1099_interest].sort((a, b) => a - b),
          ) !==
          JSON.stringify(
            [...retained.data.source_1099_interest].sort((a, b) => a - b),
          ) ||
        (twoInterest || twoOid || oneTreasuryInterestAndOid
          ? printed.data.source_1099_dividends !== undefined ||
            retained.data.source_1099_dividends !== undefined
          : typeof printed.data.source_1099_dividends !== "number" ||
            typeof retained.data.source_1099_dividends !== "number" ||
            printed.data.source_1099_dividends !==
              retained.data.source_1099_dividends)
      : interestAndTwoDividends
      ? typeof printed.data.source_1099_interest !== "number" ||
        typeof retained.data.source_1099_interest !== "number" ||
        printed.data.source_1099_interest !==
          retained.data.source_1099_interest ||
        !Array.isArray(printed.data.source_1099_dividends) ||
        !Array.isArray(retained.data.source_1099_dividends) ||
        printed.data.source_1099_dividends.length !== 2 ||
        retained.data.source_1099_dividends.length !== 2 ||
        JSON.stringify(
            [...printed.data.source_1099_dividends].sort((a, b) => a - b),
          ) !==
          JSON.stringify(
            [...retained.data.source_1099_dividends].sort((a, b) => a - b),
          )
      : oneInterestAndDividend || oneOidAndDividend
      ? typeof printed.data.source_1099_interest !== "number" ||
        typeof retained.data.source_1099_interest !== "number" ||
        printed.data.source_1099_interest !==
          retained.data.source_1099_interest ||
        typeof printed.data.source_1099_dividends !== "number" ||
        typeof retained.data.source_1099_dividends !== "number" ||
        printed.data.source_1099_dividends !==
          retained.data.source_1099_dividends
      : oneInterest || oneOid
      ? typeof printed.data.source_1099_interest !== "number" ||
        typeof retained.data.source_1099_interest !== "number" ||
        printed.data.source_1099_interest !==
          retained.data.source_1099_interest ||
        printed.data.source_1099_dividends !== undefined ||
        retained.data.source_1099_dividends !== undefined
      : oneRoyalty
      ? typeof printed.data.source_1099_royalties !== "number" ||
        typeof retained.data.source_1099_royalties !== "number" ||
        printed.data.source_1099_royalties !==
          retained.data.source_1099_royalties ||
        printed.data.source_1099_interest !== undefined ||
        retained.data.source_1099_interest !== undefined ||
        printed.data.source_1099_dividends !== undefined ||
        retained.data.source_1099_dividends !== undefined
      : typeof printed.data.source_1099_dividends !== "number" ||
        typeof retained.data.source_1099_dividends !== "number" ||
        printed.data.source_1099_dividends !==
          retained.data.source_1099_dividends ||
        printed.data.source_1099_interest !== undefined ||
        retained.data.source_1099_interest !== undefined)
  ) {
    throw new Error(
      "Form 4952 direct debt lines differ from the retained loan and return",
    );
  }
  reconcileForm4952Itemization(pending, lines.line8);
}
