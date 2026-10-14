import type { ExecuteResult } from "../../../../../../../core/runtime/executor.ts";
import type { FilerIdentity } from "../../../../../mef/header.ts";
import { inputSchema as generalSchema } from "../../../../../nodes/inputs/general/filing/general/index.ts";
import {
  bindForm8886PacketToNativeDocuments,
  prepareForm8886Packet,
} from "./handoff.ts";
import type { Form8886Owner } from "./pdf.ts";
import { ty2025IrsCountryName } from "../../../../pdf/support/irs_country_name.ts";
import {
  capitalReturnSourceSha256,
  form8886CapitalReturnRows,
  reconcileForm8886CurrentReturnSources,
} from "./return-sources.ts";
import { type Form8886Source, publicSourceSchema } from "./source.ts";

const preparedReturns = new WeakMap<object, {
  source: Form8886Source;
  reviewedCapitalRows: readonly string[];
  pendingSha256: string;
  filerSha256: string;
}>();

async function sha256(value: string): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function required(value: string | undefined, label: string): string {
  if (!value?.trim()) {
    throw new Error(`Form 8886 return packet needs the source ${label}`);
  }
  return value;
}

/** Derive the packet's identity from the already-reconciled return source.
 * The caller cannot substitute a separate PDF owner, name or address. */
function returnOwner(
  result: ExecuteResult,
  ssn: string,
  filer: FilerIdentity,
): Form8886Owner {
  const general = generalSchema.parse(result.pending.general);
  const primary = general.taxpayer_ssn?.replaceAll("-", "") === ssn;
  const name = primary
    ? {
      firstName: general.taxpayer_first_name,
      lastName: general.taxpayer_last_name,
      middleInitial: general.taxpayer_middle_initial,
      suffix: general.taxpayer_suffix,
    }
    : {
      firstName: general.spouse_first_name,
      lastName: general.spouse_last_name,
      middleInitial: general.spouse_middle_initial,
      suffix: general.spouse_suffix,
    };
  const address: Form8886Owner["address"] = general.address_foreign_country
    ? {
      kind: "foreign",
      line1: required(general.address_line1, "street address"),
      line2: general.address_line2,
      city: required(general.address_city, "city"),
      province: general.address_foreign_province_state,
      postal_code: general.address_foreign_postal_code,
      country: general.address_foreign_country,
    }
    : {
      kind: "us",
      line1: required(general.address_line1, "street address"),
      line2: general.address_line2,
      city: required(general.address_city, "city"),
      state: required(general.address_state, "state"),
      zip: required(general.address_zip, "ZIP code"),
    };
  if (address.kind === "foreign") {
    ty2025IrsCountryName(address.country);
    const normalize = (value: unknown) =>
      typeof value === "string"
        ? value.trim().replace(/\s+/g, " ").toUpperCase()
        : "";
    const fields = [
      ["address_line1", filer.address.line1],
      ["address_line2", filer.address.line2],
      ["address_city", filer.address.city],
      ["address_foreign_country", filer.address.foreignCountry],
      ["address_foreign_province_state", filer.address.foreignProvinceState],
      ["address_foreign_postal_code", filer.address.foreignPostalCode],
    ] as const;
    if (
      fields.some(([key, header]) =>
        normalize(general[key]) !== normalize(result.pending.f1040?.[key]) ||
        normalize(general[key]) !== normalize(header)
      )
    ) {
      throw new Error(
        "Form 8886 foreign mailing address differs from the source, calculated return or native header",
      );
    }
  }
  return {
    ssn,
    firstName: required(name.firstName, "first name"),
    lastName: [required(name.lastName, "last name"), name.suffix].filter(
      Boolean,
    )
      .join(" "),
    middleInitial: name.middleInitial,
    address,
  };
}

/** Preparation for current-return source adapters. This does not establish
 * legal reportability or replace full-return validation.
 * Packet/native/source hashes and the calculated-pending fingerprint bind
 * preparation to one immutable snapshot; they are not IRS acceptance evidence. */
export async function prepareForm8886ReturnPackets(
  sourceInput: Form8886Source,
  resultInput: ExecuteResult,
  filerInput: FilerIdentity,
  templateInput: Uint8Array,
) {
  const source = publicSourceSchema.parse(sourceInput);
  const result = structuredClone(resultInput);
  const filer = structuredClone(filerInput);
  const template = new Uint8Array(templateInput);
  const sourceLinks = await reconcileForm8886CurrentReturnSources(
    source,
    result,
    filer,
  );
  const capitalRows = await Promise.all(
    form8886CapitalReturnRows(result.pending).map(async (row) => ({
      row,
      hash: await capitalReturnSourceSha256(row),
    })),
  );
  const reviewedCapitalRows = capitalRows.filter(({ row, hash }) =>
    sourceLinks.some((link) =>
      link.source_kind === row.kind && link.source_row_sha256 === hash
    )
  ).map(({ row }) => JSON.stringify(row));
  const owners = source.disclosures.map((row) =>
    returnOwner(result, row.taxpayer_ssn, filer)
  );
  const returnPendingSha256 = await sha256(JSON.stringify(result.pending));
  const sourceSha256 = await sha256(JSON.stringify(source));
  const filerSha256 = await sha256(JSON.stringify(filer));
  const packets = await Promise.all(
    source.disclosures.map(async (row, index) => {
      const packet = await prepareForm8886Packet(
        row,
        owners[index],
        index + 1,
        source.disclosures.length,
        template,
      );
      return Object.freeze({
        packet,
        sourceLinks: Object.freeze(
          sourceLinks.filter((link) =>
            link.disclosure_id === row.disclosure_id
          ),
        ),
        return_pending_sha256: returnPendingSha256,
        disclosure_source_sha256: packet.metadata.source_sha256,
      });
    }),
  );
  const prepared = Object.freeze({
    return_pending_sha256: returnPendingSha256,
    source_sha256: sourceSha256,
    filer_sha256: filerSha256,
    packets: Object.freeze(packets),
  });
  preparedReturns.set(prepared, {
    source,
    reviewedCapitalRows,
    pendingSha256: returnPendingSha256,
    filerSha256,
  });
  return prepared;
}

export type PreparedForm8886ReturnPackets = Awaited<
  ReturnType<typeof prepareForm8886ReturnPackets>
>;

/** A prepared disclosure satisfies the existing capital-loss screen only
 * when every large issued/direct sale is one of its reconciled source rows.
 * Mere amounts, caller-supplied hashes, or a disclosure for another sale do not
 * authorize the return. Casualty and unrelated filing guards are unchanged. */
export function form8886CoversLargeCapitalSources(
  pending: Readonly<Record<string, unknown>>,
  prepared?: PreparedForm8886ReturnPackets,
): boolean {
  if (!prepared) return false;
  const retained = preparedReturns.get(prepared);
  if (!retained) {
    throw new Error(
      "Form 8886 loss screen requires authentic prepared packets",
    );
  }
  const large = form8886CapitalReturnRows(pending).filter(({ row }) =>
    row.cost_basis - row.proceeds >= 2_000_000
  );
  return large.length > 0 &&
    large.every((row) =>
      retained.reviewedCapitalRows.includes(JSON.stringify(row))
    );
}

/** An entered public disclosure cannot be silently omitted or replaced by a
 * different authentic packet when using either output builder. */
export function assertPreparedForm8886PublicSource(
  pending: Readonly<Record<string, unknown>>,
  prepared?: PreparedForm8886ReturnPackets,
): void {
  const start = pending.start;
  const original =
    start !== null && typeof start === "object" && !Array.isArray(start) &&
      "f8886" in start
      ? start.f8886
      : undefined;
  if (pending.f8886 === undefined && original === undefined) return;
  if (!prepared) {
    throw new Error(
      "Form 8886 requires authenticated prepared-return handling; use prepareReturn",
    );
  }
  const retained = preparedReturns.get(prepared);
  if (!retained) {
    throw new Error(
      "Form 8886 return assembly requires its authentic prepared bundle",
    );
  }
  const disclosure = publicSourceSchema.parse(pending.f8886);
  if (
    JSON.stringify(disclosure) !== JSON.stringify(retained.source) ||
    (original !== undefined &&
      JSON.stringify(publicSourceSchema.parse(original)) !==
        JSON.stringify(disclosure))
  ) {
    throw new Error(
      "Form 8886 public disclosure differs from the prepared source",
    );
  }
}

/** Synchronous projection is permitted only for bundles issued by this module. */
export function assertAuthenticForm8886ReturnPackets(
  prepared: PreparedForm8886ReturnPackets,
): void {
  if (!preparedReturns.has(prepared)) {
    throw new Error(
      "Form 8886 return assembly requires its authentic prepared bundle",
    );
  }
}

/** Check the authentic factory result against the return snapshot about to be
 * assembled. Callers must assemble from that same snapshot. Serialization alone
 * cannot establish that a packet belongs to the current calculation or filer. */
export async function verifyPreparedForm8886ReturnPackets(
  prepared: PreparedForm8886ReturnPackets,
  sourceInput: Form8886Source,
  resultInput: ExecuteResult,
  filerInput: FilerIdentity,
): Promise<void> {
  const retained = preparedReturns.get(prepared);
  if (!retained) {
    throw new Error(
      "Form 8886 return assembly requires its authentic prepared bundle",
    );
  }
  const source = publicSourceSchema.parse(sourceInput);
  const result = structuredClone(resultInput);
  const filer = structuredClone(filerInput);
  const [sourceSha256, pendingSha256, filerSha256] = await Promise.all([
    sha256(JSON.stringify(source)),
    sha256(JSON.stringify(result.pending)),
    sha256(JSON.stringify(filer)),
  ]);
  if (
    sourceSha256 !== prepared.source_sha256 ||
    pendingSha256 !== retained.pendingSha256 ||
    filerSha256 !== retained.filerSha256
  ) {
    throw new Error(
      "Form 8886 prepared bundle no longer matches the disclosure, return calculation or filer",
    );
  }
  await reconcileForm8886CurrentReturnSources(retained.source, result, filer);
}

/** Bind every disclosure to its final native documents as one authenticated
 * return bundle. The same reviewed PDF bytes and source links are retained. */
export async function bindPreparedForm8886ReturnPackets(
  prepared: PreparedForm8886ReturnPackets,
  source: Form8886Source,
  result: ExecuteResult,
  filer: FilerIdentity,
  finalDocumentsInput: readonly Parameters<
    typeof bindForm8886PacketToNativeDocuments
  >[1][],
): Promise<PreparedForm8886ReturnPackets> {
  const finalDocuments = structuredClone(finalDocumentsInput);
  await verifyPreparedForm8886ReturnPackets(prepared, source, result, filer);
  if (finalDocuments.length !== prepared.packets.length) {
    throw new Error(
      "Form 8886 final return bundle must retain every disclosure copy",
    );
  }
  const boundPackets = await Promise.all(
    prepared.packets.map(async (entry, index) =>
      Object.freeze({
        ...entry,
        packet: await bindForm8886PacketToNativeDocuments(
          entry.packet,
          finalDocuments[index],
        ),
      })
    ),
  );
  const bound = Object.freeze({
    ...prepared,
    packets: Object.freeze(boundPackets),
  });
  preparedReturns.set(bound, preparedReturns.get(prepared)!);
  return bound;
}
