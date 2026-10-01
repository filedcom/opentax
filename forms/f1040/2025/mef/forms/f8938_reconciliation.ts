import { FilingStatus } from "../../../mef/header.ts";
import { ForeignAssetType } from "../../../nodes/inputs/f8938/index.ts";
import { projectForm8992Source } from "../../form8992_source.ts";
import type { MefBuildContext } from "../form-descriptor.ts";
import { projectForm8938 } from "./f8938_projection.ts";

const status = {
  single: FilingStatus.Single,
  mfj: FilingStatus.MarriedFilingJointly,
  mfs: FilingStatus.MarriedFilingSeparately,
  hoh: FilingStatus.HeadOfHousehold,
  qw: FilingStatus.QualifyingSurvivingSpouse,
} as const;
const returnStatus = {
  single: "single",
  mfj: "mfj",
  mfs: "mfs",
  hoh: "hoh",
  qw: "qss",
} as const;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Form 8938 needs a finalized return source");
  }
  return value as Record<string, unknown>;
}

function amount(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`Form 8938 needs finalized ${label}`);
  }
  return value;
}

function name(value: unknown): string {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").toUpperCase()
    : "";
}

type Asset = ReturnType<typeof projectForm8938>["input"]["assets"][number];

function reconcilePartIII(
  assets: readonly Asset[],
  pending: Readonly<Record<string, unknown>>,
  context: MefBuildContext,
): void {
  const items = assets.flatMap((asset) =>
    asset.excepted_on_form
      ? []
      : asset.tax_items.map((item) => ({ asset, item }))
  );
  if (items.length === 0) return;
  if (context.documentIdsByTag?.IRS1040ScheduleB?.length !== 1) {
    throw new Error("Form 8938 Part III needs a prepared Schedule B document");
  }
  const scheduleB = record(pending.schedule_b);
  const form1040 = record(pending.f1040);
  for (
    const [kind, location, rowsKey, totalKey] of [
      [
        "interest",
        "Schedule B line 1",
        "interest_rows",
        "line2b_taxable_interest",
      ],
      [
        "dividends",
        "Form 1040 line 3b",
        "dividend_rows",
        "line3b_ordinary_dividends",
      ],
    ] as const
  ) {
    const matching = items.filter(({ item }) => item.kind === kind);
    if (matching.length === 0) continue;
    if (matching.some(({ item }) => item.filed_form_and_line !== location)) {
      throw new Error(
        `Form 8938 ${kind} needs the supported finalized ${location} route`,
      );
    }
    const rawRows = scheduleB[rowsKey];
    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      throw new Error(`Form 8938 ${kind} needs filed Schedule B payer rows`);
    }
    const rows = rawRows.map(record);
    const rowTotal = rows.reduce(
      (sum, row) => sum + amount(row.amount, `Schedule B ${kind} row`),
      0,
    );
    if (rowTotal !== amount(form1040[totalKey], `Form 1040 ${totalKey}`)) {
      throw new Error(`Form 8938 ${kind} rows differ from finalized Form 1040`);
    }
    const assetsByPayer = new Map<string, number>();
    for (const { asset, item } of matching) {
      const payer = name(asset.institution_or_issuer_name);
      assetsByPayer.set(
        payer,
        (assetsByPayer.get(payer) ?? 0) + item.amount_usd,
      );
    }
    for (const [payer, claimed] of assetsByPayer) {
      const filed = rows.filter((row) => name(row.payerName) === payer).reduce(
        (sum, row) => sum + amount(row.amount, `Schedule B ${kind} row`),
        0,
      );
      if (filed !== claimed) {
        throw new Error(`Form 8938 ${kind} does not match its filed payer row`);
      }
    }
  }
  if (
    items.some(({ item }) =>
      item.kind !== "interest" && item.kind !== "dividends"
    )
  ) {
    throw new Error("Form 8938 tax item has no verified finalized-line join");
  }
}

function reconcilePartIV(
  assets: readonly Asset[],
  pending: Readonly<Record<string, unknown>>,
  context: MefBuildContext,
): void {
  const excepted = assets.filter((asset) => asset.excepted_on_form);
  if (excepted.length === 0) return;
  const unsupported = excepted.find((asset) =>
    asset.excepted_on_form !== "8621" && asset.excepted_on_form !== "5471"
  );
  if (unsupported) {
    throw new Error(
      `Form 8938 Part IV ${unsupported.excepted_on_form} has no prepared identity join`,
    );
  }
  const pficAssets = excepted.filter((asset) =>
    asset.excepted_on_form === "8621"
  );
  if (pficAssets.length > 0) {
    const lines = record(pending.form8621).items;
    const ids = context.documentIdsByPendingKey?.form8621;
    const tagIds = context.documentIdsByTag?.IRS8621;
    if (
      !Array.isArray(lines) || !ids || !tagIds || ids.length !== lines.length
    ) {
      throw new Error("Form 8938 Part IV needs prepared Form 8621 documents");
    }
    for (const asset of pficAssets) {
      const index = ids.indexOf(asset.filed_exception_form_reference!);
      if (index < 0 || !tagIds.includes(ids[index])) {
        throw new Error(
          "Form 8938 Part IV reference is not a prepared Form 8621 document ID",
        );
      }
      const line = record(lines[index]);
      const pfic = record(line.item);
      if (
        name(pfic.company_name) !== name(asset.institution_or_issuer_name) ||
        pfic.company_ein_or_ref !== asset.asset_identifier
      ) {
        throw new Error(
          "Form 8938 Part IV asset differs from prepared Form 8621 issuer",
        );
      }
    }
  }
  const cfcAssets = excepted.filter((asset) =>
    asset.excepted_on_form === "5471"
  );
  if (cfcAssets.length > 0) {
    const ids = context.documentIdsByPendingKey?.f5471_parent;
    const tagIds = context.documentIdsByTag?.IRS5471;
    if (
      !ids || ids.length !== 1 || !tagIds || tagIds.length !== 1 ||
      ids[0] !== tagIds[0] || !context.filer
    ) {
      throw new Error(
        "Form 8938 Part IV needs one prepared Form 5471 parent document",
      );
    }
    const { cfc } = projectForm8992Source(pending, context.filer);
    const owner =
      cfc.shareholder_tin === context.filer.primarySSN.replaceAll("-", "")
        ? "taxpayer"
        : cfc.shareholder_tin ===
              context.filer.spouse?.ssn.replaceAll("-", "") &&
            context.filer.filingStatus === FilingStatus.MarriedFilingJointly
        ? "spouse"
        : undefined;
    const address = cfc.form5471_identity.foreign_address;
    for (const asset of cfcAssets) {
      const sourceAddress = asset.institution_or_issuer_address;
      if (
        asset.filed_exception_form_reference !== ids[0] ||
        asset.asset_type !== ForeignAssetType.ForeignStock ||
        asset.foreign_entity_type !== "corporation" ||
        asset.owner !== owner ||
        name(asset.institution_or_issuer_name) !==
          name(cfc.foreign_corp_name) ||
        asset.asset_identifier !==
          (cfc.foreign_corp_ein ?? cfc.foreign_corp_reference_id) ||
        asset.country !== cfc.country_of_incorporation ||
        sourceAddress.line1 !== address.line1 ||
        sourceAddress.line2 !== address.line2 ||
        sourceAddress.city !== address.city ||
        sourceAddress.province_or_state !== address.province_or_state ||
        sourceAddress.country !== address.country_code ||
        sourceAddress.postal_code !== address.postal_code
      ) {
        throw new Error(
          "Form 8938 Part IV asset, owner, or issuer differs from prepared Form 5471",
        );
      }
    }
  }
}

/** Strict staged join to finalized return rows and prepared MeF document IDs. */
export function assertForm8938ReturnReconciliation(
  raw: unknown,
  context: MefBuildContext,
): void {
  if (
    context.phase !== "final" || !context.filer || !context.pending ||
    context.documentIdsByTag?.IRS1040?.length !== 1
  ) {
    throw new Error(
      "Form 8938 needs a finalized Form 1040 and prepared MeF context",
    );
  }
  const { input } = projectForm8938(raw);
  const form1040 = record(context.pending.f1040);
  if (
    !input.annual_income_tax_return_required ||
    context.filer.filingStatus !== status[input.filing_status] ||
    form1040.filing_status !== returnStatus[input.filing_status]
  ) {
    throw new Error(
      "Form 8938 individual or filing status differs from finalized Form 1040",
    );
  }
  reconcilePartIII(input.assets, context.pending, context);
  reconcilePartIV(input.assets, context.pending, context);
}
