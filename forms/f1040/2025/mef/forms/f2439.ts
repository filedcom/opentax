import type { z } from "zod";
import { element, elements } from "../../../mef/xml.ts";
import {
  assertSourcedForm2439,
  inputSchema,
  itemSchema,
} from "../../../nodes/inputs/f2439/index.ts";
import { TS } from "../../../nodes/types.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

type Item = z.infer<typeof itemSchema>;
type Input = Partial<z.infer<typeof inputSchema>>;

function digits(value: string): string {
  return value.replace(/\D/g, "");
}

function shareholder(item: Item, context: MefBuildContext, index: number) {
  const filer = context.filer;
  if (!filer) throw new Error(`Form 2439 ${index + 1} needs filer identity`);
  const spouse = item.shareholder === TS.S;
  const ssn = spouse ? filer.spouse?.ssn : filer.primarySSN;
  const firstName = spouse ? filer.spouse?.firstName : filer.firstName;
  const middleInitial = spouse
    ? filer.spouse?.middleInitial
    : filer.middleInitial;
  const lastName = spouse ? filer.spouse?.lastName : filer.lastName;
  const name = firstName && lastName
    ? [firstName, middleInitial, lastName].filter(Boolean).join(" ")
    : undefined;
  const normalized = (value: string) =>
    value.trim().toUpperCase().replace(/\s+/g, " ");
  if (
    !ssn || !name || !item.shareholder_name ||
    normalized(name) !== normalized(item.shareholder_name) ||
    digits(ssn).slice(-4) !== item.shareholder_ssn_last4
  ) {
    throw new Error(
      `Form 2439 ${index + 1} shareholder does not match payer-issued Copy B`,
    );
  }
  const address = filer.address;
  if (
    address.foreignCountry || !address.line1 || !address.city ||
    !address.state || !address.zip
  ) {
    throw new Error(
      `Form 2439 ${index + 1} needs the shareholder's US address`,
    );
  }
  return { ssn: digits(ssn), name, address };
}

function buildForm2439(
  item: Item,
  context: MefBuildContext,
  index: number,
): string {
  if (
    !item.payer_name || !item.payer_ein || !item.payer_address_line1 ||
    !item.payer_address_city || !item.payer_address_state ||
    !item.payer_address_zip || !item.tax_period_begin || !item.tax_period_end
  ) {
    throw new Error(
      `Form 2439 ${index + 1} needs complete payer-issued Copy B facts`,
    );
  }
  const owner = shareholder(item, context, index);
  return elements("IRS2439", [
    element("TaxPeriodBeginDt", item.tax_period_begin),
    element("TaxPeriodEndDt", item.tax_period_end),
    elements("RegInvstCoOrReInvstTrustName", [
      element("BusinessNameLine1Txt", item.payer_name),
    ]),
    elements("RICOrREITUSAddress", [
      element("AddressLine1Txt", item.payer_address_line1),
      element("AddressLine2Txt", item.payer_address_line2),
      element("CityNm", item.payer_address_city),
      element("StateAbbreviationCd", item.payer_address_state),
      element("ZIPCd", item.payer_address_zip),
    ]),
    element("RICOrREITEIN", digits(item.payer_ein)),
    element("ShareholderSSN", owner.ssn),
    element("ShareholderPersonNm", owner.name),
    elements("ShareholderUSAddress", [
      element("AddressLine1Txt", owner.address.line1),
      element("AddressLine2Txt", owner.address.line2),
      element("CityNm", owner.address.city),
      element("StateAbbreviationCd", owner.address.state),
      element("ZIPCd", owner.address.zip),
    ]),
    element("TotalUndistributedLTCapGainAmt", item.box1a),
    element("UnrecapturedSection1250GainAmt", item.box1b),
    element("Collectibles28PercentGainAmt", item.box1d),
    element("TaxPaidByRICOrREITAmt", item.box2),
  ]);
}

export const form2439: MefFormDescriptor<"f2439", Input, readonly string[]> = {
  pendingKey: "f2439",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f2439.pdf",
  build(fields, context) {
    const items = (fields.f2439s ?? []).map((raw, index) => {
      const item = itemSchema.parse(raw);
      assertSourcedForm2439(item, index);
      return item;
    });
    const reportable = items.filter((item) => (item.box1a ?? 0) > 0);
    if (reportable.length === 0) return [];
    const total = reportable.reduce((sum, item) => sum + (item.box2 ?? 0), 0);
    if (total > 0) {
      const schedule3 = context?.pending?.schedule3;
      if (
        !schedule3 || typeof schedule3 !== "object" ||
        !("line13a_total" in schedule3) || schedule3.line13a_total !== total
      ) {
        throw new Error("Form 2439 box 2 must reconcile to Schedule 3 line 13a");
      }
      const return1040 = context?.pending?.f1040;
      if (
        !return1040 || typeof return1040 !== "object" ||
        !("line31_additional_payments" in return1040) ||
        !("line15_total" in schedule3) ||
        return1040.line31_additional_payments !== schedule3.line15_total
      ) {
        throw new Error(
          "Form 2439 Schedule 3 line 15 must reconcile to Form 1040 line 31",
        );
      }
    }
    return reportable.map((item, index) =>
      buildForm2439(item, context ?? {}, index)
    );
  },
};
