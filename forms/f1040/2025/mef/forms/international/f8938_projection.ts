import {
  deriveF8938Summary,
  ForeignAssetType,
  form8938ThresholdDecision,
  inputSchema,
} from "../../../../nodes/inputs/f8938/index.ts";

type ParsedInput = ReturnType<typeof inputSchema.parse>;
type Asset = ParsedInput["assets"][number];
export const taxKinds = [
  "interest",
  "dividends",
  "royalties",
  "other_income",
  "gain_loss",
  "deduction",
  "credit",
] as const;
export type TaxKind = typeof taxKinds[number];
export type TaxCategory = "account" | "other";
export interface TaxSummaryRow {
  kind: TaxKind;
  amount: number;
  formLocations: readonly string[];
  scheduleLocations: readonly string[];
}

export function isPartVAccount(asset: Asset): boolean {
  return asset.asset_type === ForeignAssetType.DepositAccount ||
    asset.asset_type === ForeignAssetType.CustodialAccount;
}

/** Staged projection; no registration, return join, or public export. */
export function projectForm8938(raw: unknown): {
  input: ParsedInput;
  summary: ReturnType<typeof deriveF8938Summary>;
  accounts: readonly Asset[];
  otherAssets: readonly Asset[];
  taxItems: Readonly<Record<TaxCategory, readonly TaxSummaryRow[]>>;
} {
  const input = inputSchema.parse(raw);
  if (!form8938ThresholdDecision(input).filingRequired) {
    throw new Error("Form 8938 source does not establish a filing requirement");
  }
  const detailAssets = input.assets.filter((asset) => !asset.excepted_on_form);
  const accounts = detailAssets.filter(isPartVAccount);
  const otherAssets = detailAssets.filter((asset) => !isPartVAccount(asset));
  const taxItems = {
    account: aggregateTaxItems(accounts),
    other: aggregateTaxItems(otherAssets),
  };
  return {
    input,
    summary: deriveF8938Summary(input),
    accounts,
    otherAssets,
    taxItems,
  };
}

function aggregateTaxItems(assets: readonly Asset[]): TaxSummaryRow[] {
  return taxKinds.flatMap((kind) => {
    const matches = assets.flatMap((asset) =>
      asset.tax_items.filter((item) => item.kind === kind)
    );
    if (matches.length === 0) return [];
    const formLocations = new Set<string>();
    const scheduleLocations = new Set<string>();
    for (const item of matches) {
      if (
        /^Schedule\s+\S+(?:\s+\S+)*\s+line\s+\S+$/i.test(
          item.filed_form_and_line,
        )
      ) {
        scheduleLocations.add(item.filed_form_and_line);
      } else if (
        /^Form\s+\S+(?:\s+\S+)*\s+line\s+\S+$/i.test(item.filed_form_and_line)
      ) {
        formLocations.add(item.filed_form_and_line);
      } else {
        throw new Error(
          `Form 8938 tax item needs an exact filed form or schedule line: ${item.filed_form_and_line}`,
        );
      }
    }
    return [{
      kind,
      amount: matches.reduce((sum, item) => sum + item.amount_usd, 0),
      formLocations: [...formLocations],
      scheduleLocations: [...scheduleLocations],
    }];
  });
}
