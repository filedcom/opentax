import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { ForeignAssetType } from "../../../nodes/inputs/f8938/index.ts";
import {
  projectForm8938,
  taxKinds,
  type TaxSummaryRow,
} from "../../mef/forms/f8938_projection.ts";

// Official continuous-use Rev. 11/2021 PDF AcroForm field paths. This
// projection is staged and intentionally absent from the public PDF registry.
const page1 = "topmostSubform[0].Page1[0]";
const page2 = "topmostSubform[0].Page2[0]";
const text = (
  domainKey: string,
  pdfField: string,
  printZero = false,
): PdfFieldEntry => ({ kind: "text", domainKey, pdfField, printZero });
const checked = (domainKey: string, pdfField: string): PdfFieldEntry => ({
  kind: "checkbox",
  domainKey,
  pdfField,
});
const yesNo = (domainKey: string, prefix: string): PdfFieldEntry[] => [
  {
    kind: "checkboxWhen",
    domainKey,
    pdfField: `${prefix}[0]`,
    whenValue: "true",
  },
  {
    kind: "checkboxWhen",
    domainKey,
    pdfField: `${prefix}[1]`,
    whenValue: "false",
  },
];

const partIIIRows: readonly PdfFieldEntry[] = [13, 14].flatMap(
  (line) =>
    taxKinds.flatMap((kind, index) => {
      const number = (line === 13 ? 17 : 38) + index * 3;
      const row = `${page1}.Table_Part3[0].BodyRow${line}${
        "abcdefg"[index]
      }[0]`;
      return [
        text(`line${line}_${kind}_amount`, `${row}.f1_${number}[0]`, true),
        text(`line${line}_${kind}_form`, `${row}.f1_${number + 1}[0]`),
        text(`line${line}_${kind}_schedule`, `${row}.f1_${number + 2}[0]`),
      ];
    }),
);

const summaryFields: readonly PdfFieldEntry[] = [
  checked("hasAdditionalStatements", `${page1}.c1_1[0]`),
  text("additionalStatementCount", `${page1}.f1_06[0]`),
  checked("specifiedIndividual", `${page1}.c1_2[0]`),
  text("depositAccountCount", `${page1}.f1_11[0]`, true),
  text("depositMaximumValueUsd", `${page1}.f1_12[0]`, true),
  text("custodialAccountCount", `${page1}.f1_13[0]`, true),
  text("custodialMaximumValueUsd", `${page1}.f1_14[0]`, true),
  ...yesNo("anyAccountClosed", `${page1}.c1_3`),
  text("otherAssetCount", `${page1}.f1_15[0]`, true),
  text("otherMaximumValueUsd", `${page1}.f1_16[0]`, true),
  ...yesNo("anyAssetOpenedOrClosed", `${page1}.c1_4`),
  ...["3520", "3520-A", "5471", "8621", "8865"].map((name, index) =>
    text(`partIV_${name}`, `${page1}.f1_${59 + index}[0]`, true)
  ),
  ...partIIIRows,
];

const accountFields: readonly PdfFieldEntry[] = [
  checked("accountDeposit", `${page2}.Line20_ReadOrder[0].c2_1[0]`),
  checked("accountCustodial", `${page2}.Line20_ReadOrder[0].c2_1[1]`),
  text("accountIdentifier", `${page2}.f2_01[0]`),
  checked("accountOpened", `${page2}.c2_2[0]`),
  checked("accountClosed", `${page2}.c2_3[0]`),
  checked("accountJointSpouse", `${page2}.c2_4[0]`),
  checked("accountNoTaxItem", `${page2}.c2_5[0]`),
  text("accountMaximumValueUsd", `${page2}.f2_02[0]`, true),
  ...yesNo("accountUsedFx", `${page2}.c2_6`),
  text("accountCurrency", `${page2}.f2_03[0]`),
  text("accountExchangeRate", `${page2}.f2_04[0]`),
  text("accountExchangeSource", `${page2}.f2_05[0]`),
  text("accountInstitution", `${page2}.f2_06[0]`),
  text("accountInstitutionAddress", `${page2}.f2_11[0]`),
  text("accountInstitutionCityCountry", `${page2}.f2_12[0]`),
];

const otherFields: readonly PdfFieldEntry[] = [
  text("otherDescription", `${page2}.f2_13[0]`),
  text("otherIdentifier", `${page2}.f2_14[0]`),
  text("otherAcquired", `${page2}.f2_15[0]`),
  text("otherDisposed", `${page2}.f2_16[0]`),
  checked("otherJointSpouse", `${page2}.c2_7[0]`),
  checked("otherNoTaxItem", `${page2}.c2_8[0]`),
  ...Array.from(
    { length: 4 },
    (_, index) =>
      checked(`otherValueBand${index + 1}`, `${page2}.c2_9[${index}]`),
  ),
  text("otherMaximumOver200000", `${page2}.f2_17[0]`),
  ...yesNo("otherUsedFx", `${page2}.c2_10`),
  text("otherCurrency", `${page2}.f2_18[0]`),
  text("otherExchangeRate", `${page2}.f2_19[0]`),
  text("otherExchangeSource", `${page2}.f2_20[0]`),
  text("otherEntityName", `${page2}.f2_21[0]`),
  checked("otherPartnership", `${page2}.c2_11[0]`),
  checked("otherCorporation", `${page2}.c2_11[1]`),
  checked("otherTrust", `${page2}.c2_11[2]`),
  checked("otherEstate", `${page2}.c2_11[3]`),
  text("otherEntityAddress", `${page2}.f2_26[0]`),
  text("otherEntityCityCountry", `${page2}.f2_27[0]`),
  checked("otherIssuer", `${page2}.c2_12[0]`),
  checked("otherCounterparty", `${page2}.c2_12[1]`),
  checked("otherIndividual", `${page2}.c2_13[0]`),
  checked("otherIssuerPartnership", `${page2}.c2_13[1]`),
  checked("otherIssuerCorporation", `${page2}.c2_13[2]`),
  checked("otherIssuerTrust", `${page2}.c2_13[3]`),
  checked("otherIssuerEstate", `${page2}.c2_13[4]`),
  checked("otherUSPerson", `${page2}.c2_14[0]`),
  checked("otherForeignPerson", `${page2}.c2_14[1]`),
  text("otherIssuerName", `${page2}.f2_28[0]`),
  text("otherIssuerAddress", `${page2}.f2_29[0]`),
  text("otherIssuerCityCountry", `${page2}.f2_30[0]`),
];

function putTaxRows(
  target: Record<string, unknown>,
  line: 13 | 14,
  rows: readonly TaxSummaryRow[],
): void {
  for (const row of rows) {
    if (row.formLocations.length > 1 || row.scheduleLocations.length > 1) {
      throw new Error(
        "Form 8938 PDF needs continuation for multiple Part III line references",
      );
    }
    target[`line${line}_${row.kind}_amount`] = row.amount;
    target[`line${line}_${row.kind}_form`] = row.formLocations[0];
    target[`line${line}_${row.kind}_schedule`] = row.scheduleLocations[0];
  }
}

type ProjectedAsset = ReturnType<
  typeof projectForm8938
>["input"]["assets"][number];
function addressLines(
  address: ProjectedAsset["institution_or_issuer_address"],
) {
  return {
    street: [address.line1, address.line2].filter(Boolean).join(" "),
    cityCountry: [
      address.city,
      address.province_or_state,
      address.country,
      address.postal_code,
    ].filter(Boolean).join(", "),
  };
}

function detailFields(
  account: ProjectedAsset | undefined,
  other: ProjectedAsset | undefined,
): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  if (account) {
    const address = addressLines(account.institution_or_issuer_address);
    Object.assign(fields, {
      accountDeposit: account.asset_type === ForeignAssetType.DepositAccount,
      accountCustodial:
        account.asset_type === ForeignAssetType.CustodialAccount,
      accountIdentifier: account.asset_identifier,
      accountOpened: !!account.opened_or_acquired_date?.startsWith("2025-"),
      accountClosed: !!account.closed_or_disposed_date,
      accountJointSpouse: account.owner === "joint_with_spouse",
      accountNoTaxItem: account.tax_items.length === 0,
      accountMaximumValueUsd: account.maximum_value_usd,
      accountUsedFx: account.currency_code !== "USD",
      accountCurrency: account.currency_code === "USD"
        ? undefined
        : account.currency_code,
      accountExchangeRate: account.currency_code === "USD"
        ? undefined
        : String(account.year_end_exchange_rate_usd_per_unit),
      accountExchangeSource: account.currency_code === "USD" ||
          /U\.S\. Treasury|Fiscal Service/i.test(account.exchange_rate_source)
        ? undefined
        : account.exchange_rate_source,
      accountInstitution: account.institution_or_issuer_name,
      accountInstitutionAddress: address.street,
      accountInstitutionCityCountry: address.cityCountry,
    });
  }
  if (other) {
    const address = addressLines(other.institution_or_issuer_address);
    const isEntity = other.asset_type === ForeignAssetType.ForeignStock ||
      other.asset_type === ForeignAssetType.ForeignEntityInterest ||
      other.asset_type === ForeignAssetType.ForeignTrustInterest;
    const value = other.maximum_value_usd;
    Object.assign(fields, {
      otherDescription: other.description,
      otherIdentifier: other.asset_identifier,
      otherAcquired: other.opened_or_acquired_date?.startsWith("2025-")
        ? other.opened_or_acquired_date
        : undefined,
      otherDisposed: other.closed_or_disposed_date,
      otherJointSpouse: other.owner === "joint_with_spouse",
      otherNoTaxItem: other.tax_items.length === 0,
      otherValueBand1: value <= 50_000,
      otherValueBand2: value > 50_000 && value <= 100_000,
      otherValueBand3: value > 100_000 && value <= 150_000,
      otherValueBand4: value > 150_000 && value <= 200_000,
      otherMaximumOver200000: value > 200_000 ? value : undefined,
      otherUsedFx: other.currency_code !== "USD",
      otherCurrency: other.currency_code === "USD"
        ? undefined
        : other.currency_code,
      otherExchangeRate: other.currency_code === "USD"
        ? undefined
        : String(other.year_end_exchange_rate_usd_per_unit),
      otherExchangeSource: other.currency_code === "USD" ||
          /U\.S\. Treasury|Fiscal Service/i.test(other.exchange_rate_source)
        ? undefined
        : other.exchange_rate_source,
      otherEntityName: isEntity ? other.institution_or_issuer_name : undefined,
      otherPartnership: other.foreign_entity_type === "partnership",
      otherCorporation: other.foreign_entity_type === "corporation",
      otherTrust: other.foreign_entity_type === "trust",
      otherEstate: other.foreign_entity_type === "estate",
      otherEntityAddress: isEntity ? address.street : undefined,
      otherEntityCityCountry: isEntity ? address.cityCountry : undefined,
      otherIssuer: other.issuer_or_counterparty_role === "issuer",
      otherCounterparty: other.issuer_or_counterparty_role === "counterparty",
      otherIndividual: other.issuer_or_counterparty_type === "individual",
      otherIssuerPartnership:
        other.issuer_or_counterparty_type === "partnership",
      otherIssuerCorporation:
        other.issuer_or_counterparty_type === "corporation",
      otherIssuerTrust: other.issuer_or_counterparty_type === "trust",
      otherIssuerEstate: other.issuer_or_counterparty_type === "estate",
      otherUSPerson: other.issuer_or_counterparty_is_us_person === true,
      otherForeignPerson: other.issuer_or_counterparty_is_us_person === false,
      otherIssuerName: !isEntity ? other.institution_or_issuer_name : undefined,
      otherIssuerAddress: !isEntity ? address.street : undefined,
      otherIssuerCityCountry: !isEntity ? address.cityCountry : undefined,
    });
  }
  return fields;
}

/** Staged Form 8938 PDF with one Part V and one Part VI asset per detail page. */
export const form8938Pdf: PdfFormDescriptor = {
  pendingKey: "f8938",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8938.pdf",
  pageIndices(fields) {
    return fields.__form8938Page === "continuation"
      ? [1]
      : fields.__form8938Page === "partIVOnly"
      ? [0]
      : [0, 1];
  },
  fields: [
    text("calendarYearSuffix", `${page1}.Pg1Header[0].f1_01[0]`),
    ...summaryFields,
    ...accountFields,
    ...otherFields,
  ],
  filerFields: [
    text("nameLine1", `${page1}.f1_07[0]`),
    text("primarySSN", `${page1}.f1_08[0]`),
  ],
  includeWhen(fields) {
    return Array.isArray(fields.assets) && fields.assets.length > 0;
  },
  instances(fields) {
    const projected = projectForm8938(fields);
    const copies = Math.max(
      projected.accounts.length,
      projected.otherAssets.length,
      1,
    );
    return Array.from({ length: copies }, (_, index) => ({
      ...fields,
      ...(index === 0
        ? {
          hasAdditionalStatements: copies > 1,
          additionalStatementCount: copies > 1 ? copies - 1 : undefined,
        }
        : {}),
      ...detailFields(
        projected.accounts[index],
        projected.otherAssets[index],
      ),
      __form8938Page: index > 0
        ? "continuation"
        : projected.accounts.length + projected.otherAssets.length === 0
        ? "partIVOnly"
        : "main",
    }));
  },
  projectFields(raw) {
    const projected = projectForm8938(raw);
    const { summary } = projected;
    const fields: Record<string, unknown> = {
      calendarYearSuffix: "25",
      specifiedIndividual: true,
      depositAccountCount: summary.partI.depositAccountCount,
      depositMaximumValueUsd: summary.partI.depositMaximumValueUsd,
      custodialAccountCount: summary.partI.custodialAccountCount,
      custodialMaximumValueUsd: summary.partI.custodialMaximumValueUsd,
      anyAccountClosed: summary.partI.anyAccountClosed,
      otherAssetCount: summary.partII.otherAssetCount,
      otherMaximumValueUsd: summary.partII.otherMaximumValueUsd,
      anyAssetOpenedOrClosed: summary.partII.anyAssetOpenedOrClosed,
    };
    for (const [form, count] of Object.entries(summary.partIV)) {
      fields[`partIV_${form}`] = count;
    }
    putTaxRows(fields, 13, projected.taxItems.account);
    putTaxRows(fields, 14, projected.taxItems.other);
    return { ...raw, ...fields };
  },
};
