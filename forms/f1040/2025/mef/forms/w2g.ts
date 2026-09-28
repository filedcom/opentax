import { element, elements } from "../../../mef/xml.ts";
import { inputSchema, type W2GItem } from "../../../nodes/inputs/w2g/index.ts";
import { type FilerIdentity, FilingStatus } from "../../../mef/header.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

function digits(value: string): string {
  return value.replace(/\D/g, "");
}

function normalized(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

function addressXml(
  tag: string,
  address: NonNullable<W2GItem["payer_us_address"]>,
): string {
  return elements(tag, [
    element("AddressLine1Txt", address.line1),
    element("AddressLine2Txt", address.line2),
    element("CityNm", address.city),
    element("StateAbbreviationCd", address.state),
    element("ZIPCd", address.zip),
  ]);
}

function assertRecipient(
  item: W2GItem,
  filer: FilerIdentity | undefined,
): void {
  if (!filer) throw new Error("W-2G withholding needs filer identity");
  const winner = item.winner_name;
  const address = item.winner_us_address;
  const filerAddress = filer.address;
  const winnerSsn = digits(item.box9_winner_tin ?? "");
  const primaryMatches = normalized(winner ?? "") ===
      normalized(filer.fullName ?? filer.nameLine1) &&
    winnerSsn === digits(filer.primarySSN);
  const spouseName = filer.spouse
    ? [
      filer.spouse.firstName,
      filer.spouse.middleInitial,
      filer.spouse.lastName,
    ]
      .filter(Boolean).join(" ")
    : "";
  const spouseMatches =
    filer.filingStatus === FilingStatus.MarriedFilingJointly &&
    filer.spouse !== undefined &&
    normalized(winner ?? "") === normalized(spouseName) &&
    winnerSsn === digits(filer.spouse.ssn);
  if (
    !winner || !(primaryMatches || spouseMatches) ||
    !item.box9_winner_tin ||
    !/^\d{9}$/.test(winnerSsn) ||
    !address || !filerAddress ||
    normalized(address.line1) !== normalized(filerAddress.line1) ||
    normalized(address.line2 ?? "") !== normalized(filerAddress.line2 ?? "") ||
    normalized(address.city) !== normalized(filerAddress.city) ||
    address.state !== filerAddress.state || address.zip !== filerAddress.zip
  ) {
    throw new Error(
      "W-2G withholding needs a payer-issued winner name, SSN, and address matching the taxpayer or joint-filing spouse",
    );
  }
}

function buildWithheldW2G(
  item: W2GItem,
  filer: FilerIdentity | undefined,
): string {
  if (
    item.calendar_year !== 2025 || !item.source_document_reference ||
    !item.payer_name?.trim() || !item.payer_name_control ||
    !item.payer_us_address || !item.payer_ein ||
    !/^\d{2}-?\d{7}$/.test(item.payer_ein) ||
    !item.standard_or_nonstandard_code ||
    !Number.isSafeInteger(item.box1_winnings) ||
    (item.box1_winnings ?? 0) <= 0 ||
    !Number.isSafeInteger(item.box4_federal_withheld) ||
    (item.box4_federal_withheld ?? 0) <= 0
  ) {
    throw new Error(
      "Withheld W-2G needs the issued 2025 form, structured payer identity, standard code, winnings, and withholding",
    );
  }
  assertRecipient(item, filer);
  return elements("IRSW2G", [
    element("CalendarYr", 2025),
    element("PayerNameControlTxt", item.payer_name_control),
    elements("PayerName", [element("BusinessNameLine1Txt", item.payer_name)]),
    addressXml("PayerUSAddress", item.payer_us_address),
    element("PayerEIN", digits(item.payer_ein)),
    element("GamblingReportableWinningAmt", item.box1_winnings),
    element("GamblingWinningDt", item.box2_date_won),
    element("GamblingWinWagerTypeDesc", item.box3_type_of_wager),
    element("FederalIncomeTaxWithheldAmt", item.box4_federal_withheld),
    element("GamblingWinningTransactionDesc", item.box5_transaction),
    element("GamblingWinningEventDesc", item.box6_race),
    element("GamblingWinFromIdntclWagersAmt", item.box7_identical_wagers),
    element("GamblingWinCashierId", item.box8_cashier),
    element("RecipientNm", item.winner_name),
    addressXml("RecipientUSAddress", item.winner_us_address!),
    element("RecipientSSN", digits(item.box9_winner_tin!)),
    element("GamblingWinWindowNum", item.box10_window),
    element("RecipientFirstAdditionalIdNum", item.box11_first_id),
    element("RecipientSecondAdditionalIdNum", item.box12_second_id),
    item.box13_state || item.box13_payer_state_id ||
      item.box14_state_winnings !== undefined ||
      item.box15_state_withheld !== undefined
      ? elements("W2GStateLocalTaxGrp", [
        element("StateAbbreviationCd", item.box13_state),
        element("PayerStateIdNum", item.box13_payer_state_id),
        element("GamblingWinningAmt", item.box14_state_winnings),
        element("StateTaxWithheldAmt", item.box15_state_withheld),
      ])
      : "",
    element("StandardOrNonStandardCd", item.standard_or_nonstandard_code),
  ]);
}

export const w2g: MefFormDescriptor<"w2g", unknown, readonly string[]> = {
  pendingKey: "w2g",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/fw2g--2023.pdf",
  build(fields, context?: MefBuildContext) {
    const source = inputSchema.parse(fields);
    const active = source.w2gs.filter((item) =>
      (item.box4_federal_withheld ?? 0) > 0
    );
    return active.map((item) => buildWithheldW2G(item, context?.filer));
  },
};
