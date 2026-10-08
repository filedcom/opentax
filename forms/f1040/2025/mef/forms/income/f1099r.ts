import { sourceDistributionFraction } from "../../../../nodes/intermediate/forms/form4972/source-rounding.ts";

import { reconcileIraRecharacterizations } from "../../../domains/retirement/form8606/form8606_recharacterization_source.ts";
import { form4852NativeSources } from "../../../domains/income/form4852/form4852_native_source.ts";
import type { z } from "zod";
import { element, elements } from "../../../../mef/xml.ts";
import {
  assertDistinct1099RCopies,
  type itemSchema,
} from "../../../../nodes/inputs/f1099r/index.ts";
import { TS } from "../../../../nodes/types.ts";
import type { MefBuildContext, MefFormDescriptor } from "../../form-descriptor.ts";
import { assert1099RRecipientOwner } from "../../../domains/income/f1099r/f1099r-recipient-owner.ts";

type Item = z.infer<typeof itemSchema>;

interface Fields {
  readonly f1099rs?: readonly Item[];
}

function digits(value: string): string {
  return value.replace(/\D/g, "");
}

function address(
  tag: string,
  item: Item,
  prefix: "payer" | "recipient",
  index: number,
): string {
  const line1 = item[`${prefix}_address_line1`];
  const city = item[`${prefix}_address_city`];
  const state = item[`${prefix}_address_state`];
  const zip = item[`${prefix}_address_zip`];
  if ([line1, city, state, zip].every((part) => part === undefined)) return "";
  if (!line1 || !city || !state || !zip) {
    throw new Error(
      `1099-R ${index + 1} has an incomplete ${prefix} US address`,
    );
  }
  return elements(tag, [
    element("AddressLine1Txt", line1),
    element("CityNm", city),
    element("StateAbbreviationCd", state),
    element("ZIPCd", zip),
  ]);
}

function amount(tag: string, value: number | undefined): string {
  return value === undefined ? "" : element(tag, value);
}

function checkbox(tag: string, value: boolean | undefined): string {
  return value === true ? element(tag, "X") : "";
}

function build1099R(
  item: Item,
  context: MefBuildContext,
  index: number,
): string {
  if (item.altered_or_handwritten === true && !item.source_document_reference) {
    throw new Error("Nonstandard 1099-R needs a retained payer-copy reference");
  }
  if (
    item.nonstandard_document_review &&
    (!item.source_document_reference ||
      item.nonstandard_document_review.source_document_reference !==
        item.source_document_reference)
  ) {
    throw new Error(
      "Nonstandard 1099-R review must match the retained payer-copy reference",
    );
  }
  const filer = context.filer;
  if (!filer) {
    throw new Error(
      `1099-R ${index + 1} cannot be exported to MeF without filer identity`,
    );
  }
  const recipient = item.ts === TS.S ? filer.spouse : filer;
  if (!recipient) {
    throw new Error(
      `1099-R ${index + 1} is marked for a spouse without spouse identity`,
    );
  }
  const recipientName = item.ts === TS.S
    ? [
      filer.spouse?.firstName,
      filer.spouse?.middleInitial,
      filer.spouse?.lastName,
    ]
      .filter(Boolean).join(" ")
    : filer.fullName;
  if (!recipientName) {
    throw new Error(
      `1099-R ${index + 1} cannot be exported without recipient name`,
    );
  }
  const payerName = item.payer_name.trim();
  const payerEin = digits(item.payer_ein);
  if (!payerName || payerEin.length !== 9) {
    throw new Error(
      `1099-R ${index + 1} needs a payer name and nine-digit EIN`,
    );
  }
  const code = item.box7_distribution_code + (item.box7_code2 ?? "");
  const stateTax = item.box14_state_tax !== undefined ||
    item.box15_payer_state !== undefined ||
    item.box16_state_distribution !== undefined;
  const localTax = item.box17_local_tax !== undefined ||
    item.box18_locality_name !== undefined ||
    item.box19_local_distribution !== undefined;
  if (item.box15_payer_state && !/^[A-Z]{2}$/.test(item.box15_payer_state)) {
    throw new Error(`1099-R ${index + 1} box 15 needs a two-letter state code`);
  }

  return elements("IRS1099R", [
    element(
      "PayerNameControlTxt",
      payerName.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4),
    ),
    elements("PayerName", [element("BusinessNameLine1Txt", payerName)]),
    address("PayerUSAddress", item, "payer", index),
    element("PayerEIN", payerEin),
    element(
      "RecipientSSN",
      digits(item.ts === TS.S ? filer.spouse!.ssn : filer.primarySSN),
    ),
    element("RecipientNm", recipientName),
    address("RecipientUSAddress", item, "recipient", index),
    element("PayerRecipientAccountNum", item.account_number),
    element("GrossDistributionAmt", item.box1_gross_distribution),
    amount("TaxableAmt", item.box2a_taxable_amount),
    checkbox("TxblAmountNotDeterminedInd", item.box2b_not_determined),
    checkbox("TotalDistributionInd", item.box2b_total_dist),
    amount("CapitalGainAmt", item.box3_capital_gain),
    amount("FederalIncomeTaxWithheldAmt", item.box4_federal_withheld),
    amount("EmployeeContributionsAmt", item.box5_employee_contributions),
    amount("NetUnrlzdSecuritiesApprcnAmt", item.box6_nua),
    element("F1099RDistributionCd", code),
    checkbox("IRASEPSIMPLEInd", item.box7_ira_simple_indicator),
    amount("OtherDistributionAmt", item.box8_other),
    item.box9a_pct_total === undefined ? "" : element(
      "RcpntTotalDistributionPct",
      // Preserve the issued decimal share, avoiding a binary expansion.
      sourceDistributionFraction(item.box9a_pct_total),
    ),
    amount(
      "TotalEmployeeContributionsAmt",
      item.box9b_total_employee_contributions,
    ),
    amount("IRRAllocatedAmt", item.box10_irr_within_5yr),
    item.box11_first_year_roth === undefined ? "" : element(
      "DesignatedROTHAcctFirstYr",
      String(item.box11_first_year_roth),
    ),
    checkbox("FATCAFilingRequirementInd", item.box12_fatca),
    element("PaymentDt", item.box13_date_of_payment),
    stateTax || localTax
      ? elements("F1099RStateLocalTaxGrp", [
        elements("F1099RStateTaxGrp", [
          amount("StateTaxWithheldAmt", item.box14_state_tax),
          element("StateAbbreviationCd", item.box15_payer_state),
          amount("StateDistributionAmt", item.box16_state_distribution),
          localTax
            ? elements("F1099RLocalTaxGrp", [
              amount("LocalTaxWithheldAmt", item.box17_local_tax),
              element("LocalityNm", item.box18_locality_name),
              amount("LocalDistributionAmt", item.box19_local_distribution),
            ])
            : "",
        ]),
      ])
      : "",
    element(
      "StandardOrNonStandardCd",
      item.altered_or_handwritten === true || item.nonstandard_document_review
        ? "N"
        : "S",
    ),
  ]);
}

export const f1099r: MefFormDescriptor<"f1099r", Fields, readonly string[]> = {
  pendingKey: "f1099r",
  sourcePendingKeys: ["f1099r", "f4852"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1099r.pdf",
  build(fields, context) {
    const substitutes =
      form4852NativeSources(context?.pending, context?.filer).f1099rs;
    const allSources = [...(fields.f1099rs ?? []), ...substitutes];
    if (allSources.length === 0) return [];
    if (
      allSources.some((item) =>
        ["N", "R"].includes(item.box7_distribution_code ?? "") ||
        item.ira_recharacterization_review
      )
    ) {
      reconcileIraRecharacterizations(
        { ...context?.pending, f1099r: { f1099rs: allSources } },
        context?.filer,
      );
    }
    assertDistinct1099RCopies(allSources);
    assert1099RRecipientOwner({ f1099rs: allSources }, context?.filer);
    return allSources.map((item, index) =>
      build1099R(item, context ?? {}, index)
    );
  },
};
