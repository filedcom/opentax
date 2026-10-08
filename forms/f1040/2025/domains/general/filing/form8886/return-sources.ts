import {
  findForm8886K1ActivitySource,
  k1ActivityReturnSourceSchema,
  reconcileForm8886K1ActivityFacts,
} from "./k1-activity-source.ts";
import { assertBox11CodeSSources } from "../../../../../nodes/inputs/income/rental-passthrough/k1_partnership/box11_code_s.ts";
import {
  findForm8886K1CapitalSource,
  k1CapitalReturnSourceSchema,
  reconcileForm8886K1CapitalFacts,
} from "./k1-source.ts";
import { assertScheduleDK1Source } from "../../../income/investments/schedule-d/schedule-d-k1-source.ts";
import { z } from "zod";
import type { ExecuteResult } from "../../../../../../../core/runtime/executor.ts";
import {
  inputSchema as brokerSchema,
  itemSchema as brokerRowSchema,
} from "../../../../../nodes/inputs/income/investments/f1099b/index.ts";
import {
  inputSchema as directSchema,
  itemSchema as directRowSchema,
} from "../../../../../nodes/inputs/income/investments/f8949/index.ts";
import { type FilerIdentity, FilingStatus } from "../../../../../mef/header.ts";
import { inputSchema as casualtySchema } from "../../../../../nodes/intermediate/forms/deductions/casualty/form4684/index.ts";
import { assertForm8886BusinessCasualtyReturn } from "./casualty-source.ts";
import {
  assertCapitalSaleSourceRows,
  assertNoRepeatedBrokerSaleSources,
} from "../../../income/investments/broker-sale-source-reconciliation.ts";
import { assertScheduleD1040Join } from "../../../income/investments/schedule-d/schedule-d-1040-join.ts";
import {
  assertF1040FinalHeader,
  assertF1040SourceIdentity,
  assertGeneral1040HeaderSource,
} from "../../return-assembly/filer-source-reconciliation.ts";
import {
  currentReturnLinkSchema,
  type Form8886Source,
  publicSourceSchema,
  ReturnSourceKind,
} from "./source.ts";

export const capitalReturnSourceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal(ReturnSourceKind.BrokerSale),
    row: brokerRowSchema,
  }).strict(),
  z.object({
    kind: z.literal(ReturnSourceKind.DirectSale),
    row: directRowSchema,
  }).strict(),
]);
type CapitalReturnSource = z.infer<typeof capitalReturnSourceSchema>;
export const returnSourceSchema = z.discriminatedUnion("kind", [
  ...capitalReturnSourceSchema.options,
  ...k1CapitalReturnSourceSchema.options,
  ...k1ActivityReturnSourceSchema.options,
  z.object({
    kind: z.literal(ReturnSourceKind.BusinessCasualty),
    // AGI is recalculated return context, not a business casualty source fact.
    row: casualtySchema.omit({ agi: true }),
  }).strict(),
]);
type ReturnSource = z.infer<typeof returnSourceSchema>;
type ReturnLink = z.infer<typeof currentReturnLinkSchema>;

/** Canonical issued/direct sale records, before any netting or loss limit. */
export function form8886CapitalReturnRows(
  pending: Readonly<Record<string, unknown>>,
): readonly CapitalReturnSource[] {
  return [
    ...(pending.f1099b === undefined
      ? []
      : brokerSchema.parse(pending.f1099b).f1099bs.map((row) =>
        capitalReturnSourceSchema.parse({
          kind: ReturnSourceKind.BrokerSale,
          row,
        })
      )),
    ...(pending.f8949 === undefined
      ? []
      : directSchema.parse(pending.f8949).f8949s.map((row) =>
        capitalReturnSourceSchema.parse({
          kind: ReturnSourceKind.DirectSale,
          row,
        })
      )),
  ];
}

/** Fingerprint the validated record, including owner, dates, proceeds, basis
 * and adjustments. This binds entered facts; it does not authenticate an issuer. */
export async function capitalReturnSourceSha256(
  input: CapitalReturnSource,
): Promise<string> {
  return returnSourceSha256(capitalReturnSourceSchema.parse(input));
}

export async function returnSourceSha256(input: ReturnSource): Promise<string> {
  const parsed = returnSourceSchema.parse(input);
  const bytes = new TextEncoder().encode(JSON.stringify(parsed));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function filerOwners(filer: FilerIdentity): readonly string[] {
  const tin = (value: string | undefined) => {
    const digits = value?.replaceAll("-", "");
    if (!digits || !/^\d{9}$/.test(digits)) {
      throw new Error("Form 8886 return owner requires a valid SSN");
    }
    return digits;
  };
  const primary = tin(filer.primarySSN);
  if (filer.filingStatus !== FilingStatus.MarriedFilingJointly) {
    return [primary];
  }
  const spouse = tin(filer.spouse?.ssn);
  if (primary === spouse) {
    throw new Error("Form 8886 joint-return owners must be distinct");
  }
  return [primary, spouse];
}

function findReturnSource(
  link: ReturnLink,
  pending: ExecuteResult["pending"],
): ReturnSource {
  const activity = findForm8886K1ActivitySource(link, pending);
  if (activity) return activity;
  const k1 = findForm8886K1CapitalSource(link, pending);
  if (k1) return k1;
  if (link.source_kind === ReturnSourceKind.BusinessCasualty) {
    const row = casualtySchema.parse(pending.form4684);
    if (
      row.business_source_document_reference !==
        link.source_document_reference ||
      row.business_source_transaction_id !== link.source_transaction_id
    ) {
      throw new Error(
        "Form 8886 casualty link must resolve its retained source record",
      );
    }
    return { kind: ReturnSourceKind.BusinessCasualty, row };
  }
  if (link.source_kind === ReturnSourceKind.BrokerSale) {
    if (!pending.f1099b) {
      throw new Error(
        "Form 8886 linked broker source is missing from the return",
      );
    }
    const matches = brokerSchema.parse(pending.f1099b).f1099bs.filter((row) =>
      row.transaction_id === link.source_transaction_id &&
      row.source_document_reference === link.source_document_reference
    );
    if (matches.length !== 1) {
      throw new Error(
        "Form 8886 broker link must resolve exactly one retained source row",
      );
    }
    return { kind: ReturnSourceKind.BrokerSale, row: matches[0] };
  }
  if (!pending.f8949) {
    throw new Error(
      "Form 8886 linked direct-sale source is missing from the return",
    );
  }
  const matches = directSchema.parse(pending.f8949).f8949s.filter((row) =>
    row.source_transaction_id === link.source_transaction_id &&
    (row.source_document_reference ?? row.broker_statement_reference) ===
      link.source_document_reference
  );
  if (matches.length !== 1) {
    throw new Error(
      "Form 8886 direct-sale link must resolve exactly one retained source row",
    );
  }
  return { kind: ReturnSourceKind.DirectSale, row: matches[0] };
}

/** Current-return source adapters. Other source families still require their
 * own reconciliation before they may enter the prepared filing route.
 * A reportable transaction may comprise several sales; explicit reviewed links
 * associate their independent IDs without assuming the IDs are the same. */
export async function reconcileForm8886CurrentReturnSources(
  sourceInput: Form8886Source,
  result: ExecuteResult,
  filer: FilerIdentity,
) {
  const source = publicSourceSchema.parse(sourceInput);
  const filerSnapshot = structuredClone(filer);
  const owners = filerOwners(filerSnapshot);
  if (result.diagnostics.length) {
    throw new Error(
      "Form 8886 source reconciliation needs a successful return calculation",
    );
  }
  const pending = structuredClone(result.pending);
  const rows = source.disclosures.flatMap((disclosure) => {
    if (!owners.includes(disclosure.taxpayer_ssn)) {
      throw new Error(
        "Form 8886 disclosure taxpayer is not an owner of this return",
      );
    }
    const references = new Set(
      disclosure.benefits.filter((benefit) =>
        benefit.affected_tax_years.includes(2025)
      ).flatMap((benefit) => benefit.current_return_source_references),
    );
    const links = disclosure.current_return_links ?? [];
    if (
      [...references].some((reference) =>
        !links.some((link) => link.reference === reference)
      )
    ) {
      throw new Error(
        "Form 8886 current-year benefit lacks its explicit retained-source link",
      );
    }
    return links.map((link) => ({
      disclosure,
      link,
      retained: findReturnSource(link, pending),
    }));
  });
  if (
    !pending.general || typeof pending.general.taxpayer_ssn !== "string" ||
    !pending.f1040 || typeof pending.f1040.taxpayer_ssn !== "string"
  ) {
    throw new Error(
      "Form 8886 source proof needs the identified source and calculated return",
    );
  }
  assertF1040SourceIdentity(pending.general, filerSnapshot);
  assertGeneral1040HeaderSource(pending);
  assertF1040FinalHeader(pending.f1040, filerSnapshot);
  if (!rows.length) return Object.freeze([]);
  const k1Keys = rows.filter(({ link }) => link.source_component !== undefined)
    .map(({ link }) =>
      JSON.stringify([
        link.source_kind,
        link.source_document_reference,
        link.source_transaction_id,
        link.source_component,
      ])
    );
  if (new Set(k1Keys).size !== k1Keys.length) {
    throw new Error(
      "Form 8886 repeated K-1 component requires a reviewed allocation rather than duplicate links",
    );
  }

  const hasCapitalSources = rows.some(({ retained }) =>
    retained.kind === ReturnSourceKind.BrokerSale ||
    retained.kind === ReturnSourceKind.DirectSale ||
    retained.kind === ReturnSourceKind.PartnershipK1Capital ||
    retained.kind === ReturnSourceKind.SCorporationK1Capital ||
    retained.kind === ReturnSourceKind.TrustK1Capital
  );
  if (
    hasCapitalSources && (
      typeof pending.schedule_d?.print_line16_combined !== "number" ||
      typeof pending.f1040?.line7_capital_gain !== "number"
    )
  ) {
    throw new Error(
      "Form 8886 capital sources require finalized Schedule D and Form 1040",
    );
  }
  if (hasCapitalSources) {
    assertNoRepeatedBrokerSaleSources(pending.f1099b, pending.f8949);
    assertCapitalSaleSourceRows(pending);
    assertScheduleDK1Source(pending.schedule_d, pending);
    assertBox11CodeSSources(pending, owners);
    assertScheduleD1040Join(pending);
  }
  const reconciled = await Promise.all(
    rows.map(async ({ disclosure, link, retained }) => {
      if (
        retained.kind === ReturnSourceKind.PartnershipK1Activity ||
        retained.kind === ReturnSourceKind.SCorporationK1Activity ||
        retained.kind === ReturnSourceKind.TrustK1Activity
      ) {
        const facts = reconcileForm8886K1ActivityFacts(
          retained,
          link,
          disclosure,
          pending,
          filerSnapshot,
        );
        if (await returnSourceSha256(retained) !== link.source_row_sha256) {
          throw new Error(
            "Form 8886 retained source row changed after disclosure review",
          );
        }
        return Object.freeze({
          disclosure_id: disclosure.disclosure_id,
          taxpayer_ssn: disclosure.taxpayer_ssn,
          ...link,
          ...facts,
          gross_loss_before_limits: undefined,
        });
      }
      if (retained.kind === ReturnSourceKind.BusinessCasualty) {
        if (retained.row.business_recipient_ssn !== disclosure.taxpayer_ssn) {
          throw new Error(
            "Form 8886 linked casualty owner differs from the disclosure taxpayer",
          );
        }
        const loss = assertForm8886BusinessCasualtyReturn(
          retained.row,
          pending,
          filerSnapshot,
        );
        if (await returnSourceSha256(retained) !== link.source_row_sha256) {
          throw new Error(
            "Form 8886 retained source row changed after disclosure review",
          );
        }
        return Object.freeze({
          disclosure_id: disclosure.disclosure_id,
          taxpayer_ssn: disclosure.taxpayer_ssn,
          ...link,
          // For casualty sources this is after basis/FMV and insurance,
          // but before any other return netting/limitations.
          gross_loss_before_limits: loss,
          loss_after_insurance_before_limits: loss,
        });
      }
      if (
        retained.kind === ReturnSourceKind.PartnershipK1Capital ||
        retained.kind === ReturnSourceKind.SCorporationK1Capital ||
        retained.kind === ReturnSourceKind.TrustK1Capital
      ) {
        const facts = reconcileForm8886K1CapitalFacts(
          retained,
          link,
          disclosure,
        );
        if (await returnSourceSha256(retained) !== link.source_row_sha256) {
          throw new Error(
            "Form 8886 retained source row changed after disclosure review",
          );
        }
        return Object.freeze({
          disclosure_id: disclosure.disclosure_id,
          taxpayer_ssn: disclosure.taxpayer_ssn,
          ...link,
          ...facts,
          gross_loss_before_limits: undefined,
        });
      }
      const soldDate = retained.row.date_sold;
      const parsedDate = new Date(`${soldDate}T00:00:00Z`);
      if (
        !/^2025-\d{2}-\d{2}$/.test(soldDate) ||
        !Number.isFinite(parsedDate.valueOf()) ||
        parsedDate.toISOString().slice(0, 10) !== soldDate
      ) {
        throw new Error(
          "Form 8886 current-year sale needs a valid 2025 disposition date",
        );
      }
      if (retained.row.recipient_ssn !== disclosure.taxpayer_ssn) {
        throw new Error(
          "Form 8886 linked sale recipient differs from the disclosure taxpayer",
        );
      }
      const hash = await capitalReturnSourceSha256(retained);
      if (hash !== link.source_row_sha256) {
        throw new Error(
          "Form 8886 retained source row changed after disclosure review",
        );
      }
      return Object.freeze({
        disclosure_id: disclosure.disclosure_id,
        taxpayer_ssn: disclosure.taxpayer_ssn,
        ...link,
        gross_loss_before_limits: Math.max(
          0,
          retained.row.cost_basis - retained.row.proceeds,
        ),
      });
    }),
  );
  return Object.freeze(reconciled);
}

/** Compatibility entry point for the staged capital-only adapter. */
export async function reconcileForm8886CapitalSources(
  input: Form8886Source,
  result: ExecuteResult,
  filer: FilerIdentity,
) {
  const source = publicSourceSchema.parse(input);
  if (
    source.disclosures.some((row) =>
      row.current_return_links?.some((link) =>
        link.source_kind !== ReturnSourceKind.BrokerSale &&
        link.source_kind !== ReturnSourceKind.DirectSale
      )
    )
  ) {
    throw new Error(
      "Form 8886 capital adapter cannot reconcile a casualty source or K-1 source",
    );
  }
  return await reconcileForm8886CurrentReturnSources(source, result, filer);
}
