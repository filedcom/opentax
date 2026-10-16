import { z } from "zod";
import { FilingStatus } from "../../nodes/types.ts";
import {
  aggregateTaxItems,
  isPartVAccount,
} from "../../2025/mef/forms/general/foreign/f8938_projection.ts";
import {
  foreignAssetClaim2026Schema,
  prepareForeignAssets2026,
} from "./foreign-assets-source.ts";
import {
  calculateInvestmentClaim2026,
  investmentSource2026Schema,
} from "./investment-claim.ts";
import { investmentOwner2026, investmentSum } from "./investment-source.ts";
import { roundWholeDollars } from "../../whole-dollars.ts";

const ref = z.string().trim().min(1);
const exclusionReview = z.object({
  foreign_account_reference: ref,
  subject_tin: z.string().regex(/^\d{9}$/),
  reviewed_on: z.string().date(),
  reviewer_reference: ref,
  document_reference: ref,
  document_sha256: z.string().regex(/^[0-9a-f]{64}$/),
});
export const foreignAssetReturnClaim2026Schema = z.object({
  claim: foreignAssetClaim2026Schema,
  account_bindings: z.array(
    z.object({
      asset_reference: ref,
      foreign_account_references: z.array(ref).min(1).max(2),
    }).strict(),
  ).default([]),
  excluded_account_reviews: z.array(z.discriminatedUnion("reason", [
    exclusionReview.extend({
      reason: z.literal("us_payor_maintained_account"),
      us_payor_status_under_1_6049_5_c_5_verified: z.literal(true),
    }).strict(),
    exclusionReview.extend({
      reason: z.literal("signature_authority_without_asset_interest"),
      no_section6038d_interest_in_account_or_its_income_verified: z.literal(
        true,
      ),
    }).strict(),
  ])).default([]),
}).strict();
export const foreignAssetReturnInput2026Schema =
  foreignAssetReturnClaim2026Schema.partial().extend({
    settled_return: z.record(z.unknown()),
    investment_sources_2026: investmentSource2026Schema.optional(),
  }).strict();

type IncomeItem = {
  reference: string;
  kind: "interest" | "dividends";
  amount_usd: number;
  source_document: { document_reference: string; document_sha256: string };
};
const normalize = (value: string) =>
  value.trim().replace(/\s+/g, " ").toUpperCase();

/** Terminal disclosure join. No amounts are emitted back into taxable income. */
export function calculateForeignAssetReturn2026(
  raw: z.input<typeof foreignAssetReturnInput2026Schema>,
) {
  const input = foreignAssetReturnInput2026Schema.parse(raw);
  if (!input.claim) {
    if (
      input.account_bindings?.length || input.excluded_account_reviews?.length
    ) {
      throw new Error("Foreign account bindings need the asset claim");
    }
    return undefined;
  }
  const f = input.settled_return;
  const owner = investmentOwner2026.parse({
    filing_status: f.filing_status,
    taxpayer_ssn: f.taxpayer_ssn,
    ...(f.spouse_ssn ? { spouse_ssn: f.spouse_ssn } : {}),
  });
  if (
    f.tax_year !== 2026 || !Number.isSafeInteger(f.line11b_agi) ||
    !Number.isSafeInteger(f.line37_amount_owed)
  ) {
    throw new Error("Form 8938 requires the completed 2026 return");
  }
  const valuation = prepareForeignAssets2026({ ...owner, claim: input.claim });
  const evidenceHashes = new Map<string, string>();
  const checkEvidence = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    const row = value as Record<string, unknown>;
    for (
      const [refKey, hashKey] of [["document_reference", "document_sha256"], [
        "source_document_reference",
        "source_document_sha256",
      ]]
    ) {
      const reference = row[refKey], hash = row[hashKey];
      if (typeof reference === "string" && typeof hash === "string") {
        if (
          evidenceHashes.has(reference) &&
          evidenceHashes.get(reference) !== hash
        ) {
          throw new Error(
            "Form 8938 cross-form document reference has conflicting digests",
          );
        }
        evidenceHashes.set(reference, hash);
      }
    }
    for (const nested of Object.values(row)) checkEvidence(nested);
  };
  checkEvidence([
    input.claim,
    input.investment_sources_2026,
    input.excluded_account_reviews,
  ]);
  const investment = input.investment_sources_2026
    ? calculateInvestmentClaim2026(input.investment_sources_2026)
    : undefined;
  if (
    investment &&
    (investment.source_input.filing_status !== owner.filing_status ||
      investment.source_input.taxpayer_ssn !== owner.taxpayer_ssn ||
      investment.source_input.spouse_ssn !== owner.spouse_ssn)
  ) {
    throw new Error(
      "Form 8938 investment sources differ from the completed return owners",
    );
  }
  if (
    investment &&
    ((f.line2b_taxable_interest ?? 0) !== investment.lines.line2b ||
      (f.line3b_ordinary_dividends ?? 0) !== investment.lines.line3b)
  ) {
    throw new Error(
      "Form 8938 investment sources differ from completed Form 1040 income",
    );
  }
  if (input.claim.exception_forms.length) {
    throw new Error(
      "Form 8938 Part IV still needs current-year filed-form identity and filing evidence",
    );
  }
  if (
    valuation.beneficial_interest_workpapers.some((b) =>
      b.distribution_rows.length > 0
    )
  ) {
    throw new Error(
      "Foreign beneficial distributions need their taxable or nontaxable return treatment binding",
    );
  }
  const bindings = input.account_bindings ?? [];
  if (
    new Set(bindings.map((b) => b.asset_reference)).size !== bindings.length ||
    bindings.some((b) =>
      !input.claim!.assets.some((a) =>
        a.asset_id === b.asset_reference && isPartVAccount(a)
      )
    )
  ) {
    throw new Error(
      "Form 8938 account bindings must identify each actual account asset once",
    );
  }
  const accounts = investment?.foreign_accounts?.source_input.accounts ?? [];
  const usedAccounts = new Set<string>(), usedSources = new Set<string>();
  const boundItems: {
    asset_reference: string;
    return_source_reference: string;
    kind: "interest" | "dividends";
    amount_usd: number;
    filed_form_and_line: string;
    source_document: IncomeItem["source_document"];
  }[] = [];
  for (const asset of input.claim.assets) {
    const binding = bindings.find((b) => b.asset_reference === asset.asset_id);
    if (!isPartVAccount(asset)) {
      if (asset.tax_items.length) {
        throw new Error(
          "Other foreign asset tax items need their specific return-source route",
        );
      }
      continue;
    }
    if (
      !binding || !investment?.foreign_accounts ||
      !investment.schedule_b.required
    ) {
      throw new Error(
        "Form 8938 accounts need their reviewed Schedule B account identities",
      );
    }
    if (
      investment.foreign_accounts.source_input.reviewed_on >
        input.claim.reviewed_on
    ) {
      throw new Error(
        "Foreign asset review cannot predate the account income review",
      );
    }
    const expectedOwners = asset.owner === "spouse"
      ? [owner.spouse_ssn]
      : asset.owner === "joint_with_spouse" &&
          owner.filing_status === FilingStatus.MFJ
      ? [owner.taxpayer_ssn, owner.spouse_ssn]
      : [owner.taxpayer_ssn];
    const linked = binding.foreign_account_references.map((reference) => {
      const account = accounts.find((a) => a.record_reference === reference);
      if (
        !account || usedAccounts.has(reference) ||
        account.relationship === "signature_authority" ||
        account.account_number !== asset.asset_identifier ||
        normalize(account.institution_name) !==
          normalize(asset.institution_or_issuer_name) ||
        account.iso_country_code !== asset.country
      ) {
        throw new Error(
          "Form 8938 asset must match its actual financial-interest account, institution and country",
        );
      }
      usedAccounts.add(reference);
      return account;
    });
    if (
      linked.length !== expectedOwners.length ||
      expectedOwners.some((tin) =>
        !tin || linked.filter((a) => a.subject_tin === tin).length !== 1
      )
    ) {
      throw new Error(
        "Form 8938 account ownership must match the actual taxpayer and joint spouse",
      );
    }
    const expected: IncomeItem[] = [];
    for (const account of linked) {
      const review = account.income_review;
      if (review.kind === "no_reportable_income") continue;
      if (review.kind === "foreign_bank_interest_statements") {
        for (
          const item of investment.foreign_bank_interest!.income_items.filter((
            i,
          ) => i.foreign_account_reference === account.record_reference)
        ) {
          const ledger = investment.foreign_bank_interest!.ledgers.find((l) =>
            l.source_input.record_reference === item.ledger_reference
          )!;
          const receipt = ledger.receipts.find((r) =>
            r.record_reference === item.return_source_reference
          )!;
          if (
            ledger.source_input.currency_code !== asset.currency_code ||
            (asset.opened_or_acquired_date &&
              receipt.received_or_available_on <
                asset.opened_or_acquired_date) ||
            (asset.closed_or_disposed_date &&
              receipt.received_or_available_on > asset.closed_or_disposed_date)
          ) {
            throw new Error(
              "Form 8938 asset currency or holding dates differ from its interest receipts",
            );
          }
          expected.push({
            reference: item.return_source_reference,
            kind: "interest",
            amount_usd: item.amount_usd,
            source_document: item.source_document,
          });
        }
      } else {
        for (const reference of review.source_references) {
          const interest = investment.interest?.sources.find((i) =>
            i.source_document_reference === reference
          );
          const dividend = investment.dividends?.sources.find((i) =>
            i.source_document_reference === reference
          );
          if ((!interest && !dividend) || (interest && dividend)) {
            throw new Error("Ambiguous Form 8938 issued income source");
          }
          const copy = interest ?? dividend!;
          if (
            normalize(interest ? interest.payer_name : dividend!.payerName) !==
              normalize(account.institution_name)
          ) {
            throw new Error(
              "Form 8938 issued source institution differs from its disclosed account",
            );
          }
          if (!copy.source_document_sha256) {
            throw new Error(
              "Form 8938 issued income binding needs the source copy digest",
            );
          }
          if (interest) {
            if (
              interest.box2 || interest.box8 || interest.box11 ||
              interest.box12 || interest.box13 ||
              interest.nominee_allocations?.length ||
              interest.accrued_interest_purchases?.length
            ) {
              throw new Error(
                "Form 8938 adjusted or exempt interest needs separate tax-item treatment binding",
              );
            }
            expected.push({
              reference,
              kind: "interest",
              amount_usd: investmentSum([
                interest.box1,
                interest.box3,
                interest.box10,
              ]),
              source_document: {
                document_reference: reference,
                document_sha256: copy.source_document_sha256,
              },
            });
          } else {
            if (dividend!.box2a || dividend!.box12 || dividend!.box13) {
              throw new Error(
                "Form 8938 distribution gains or exempt dividends need separate tax-item treatment binding",
              );
            }
            expected.push({
              reference,
              kind: "dividends",
              amount_usd: dividend!.box1a,
              source_document: {
                document_reference: reference,
                document_sha256: copy.source_document_sha256,
              },
            });
          }
        }
      }
    }
    if (asset.tax_items.length !== expected.length) {
      throw new Error(
        "Form 8938 tax items must cover the complete account income inventory",
      );
    }
    for (const item of asset.tax_items) {
      const actual = expected.filter((e) =>
        e.reference === item.return_source_reference && e.kind === item.kind
      );
      const key = `${item.kind}:${item.return_source_reference}`;
      if (
        actual.length !== 1 || usedSources.has(key) ||
        actual[0].amount_usd !== item.amount_usd ||
        actual[0].source_document.document_reference !==
          item.source_document.document_reference ||
        actual[0].source_document.document_sha256 !==
          item.source_document.document_sha256
      ) {
        throw new Error(
          "Form 8938 tax item differs from its actual return source, amount or document digest",
        );
      }
      usedSources.add(key);
      boundItems.push({
        asset_reference: asset.asset_id,
        return_source_reference: item.return_source_reference,
        kind: actual[0].kind,
        amount_usd: actual[0].amount_usd,
        source_document: actual[0].source_document,
        filed_form_and_line: actual[0].kind === "interest"
          ? "Schedule B line 1"
          : "Schedule B line 5",
      });
    }
  }
  const excludedAccounts = new Set<string>();
  for (const review of input.excluded_account_reviews ?? []) {
    const account = accounts.find((a) =>
      a.record_reference === review.foreign_account_reference
    );
    if (
      !account || usedAccounts.has(review.foreign_account_reference) ||
      excludedAccounts.has(review.foreign_account_reference) ||
      account.subject_tin !== review.subject_tin ||
      review.reviewed_on < "2026-12-31" ||
      review.reviewed_on > input.claim.reviewed_on
    ) {
      throw new Error(
        "Form 8938 exclusion review must identify an unreported actual account and owner once",
      );
    }
    if (
      review.reason === "signature_authority_without_asset_interest" &&
      (account.relationship !== "signature_authority" ||
        account.income_review.kind !== "no_reportable_income")
    ) {
      throw new Error(
        "Signature-only Form 8938 exclusion conflicts with account ownership or income",
      );
    }
    excludedAccounts.add(review.foreign_account_reference);
  }
  if (
    accounts.some((a) =>
      !usedAccounts.has(a.record_reference) &&
      !excludedAccounts.has(a.record_reference)
    )
  ) {
    throw new Error(
      "Form 8938 inventory must account for each reviewed foreign account or its evidenced exclusion",
    );
  }
  const assets = valuation.valuation_input.assets.map((asset) => ({
    ...asset,
    tax_items: boundItems.filter((i) => i.asset_reference === asset.asset_id)
      .map((i) => ({
        kind: i.kind,
        amount_usd: i.amount_usd,
        filed_form_and_line: i.filed_form_and_line,
      })),
  }));
  const taxRows = (partV: boolean) => {
    const selected = assets.filter((a) => isPartVAccount(a) === partV);
    return aggregateTaxItems(selected).map((row) => {
      const cents = investmentSum(
        selected.flatMap((a) =>
          a.tax_items.filter((i) => i.kind === row.kind).map((i) =>
            i.amount_usd
          )
        ),
      );
      return {
        ...row,
        amount: roundWholeDollars(cents),
        unrounded_amount_usd: cents,
        formLocations: row.kind === "interest"
          ? ["Form 1040 line 2b"]
          : row.kind === "dividends"
          ? ["Form 1040 line 3b"]
          : row.formLocations,
      };
    });
  };
  return {
    source_input: input,
    valuation,
    assets,
    bound_tax_items: boundItems,
    tax_items: { account: taxRows(true), other: taxRows(false) },
    filing_required: valuation.threshold.filingRequired,
    return_binding_complete: true as const,
    filing_ready: false as const,
    remaining_filing_requirements: valuation.threshold.filingRequired
      ? [
        "draft_pdf",
        "native_mef",
        "final_forms_and_instructions",
        "ats_and_public_filing",
      ]
      : [],
  };
}
