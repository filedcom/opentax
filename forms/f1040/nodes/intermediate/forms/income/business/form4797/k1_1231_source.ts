import { z } from "zod";
import { type FilerIdentity, FilingStatus } from "../../../../../../mef/header.ts";
import { type K1Section1231Row, k1Section1231RowSchema } from "./index.ts";

const partnershipSource = z.object({
  partnership_name: z.string().min(1),
  partnership_ein: z.string().regex(/^\d{9}$/),
  source_document_reference: z.string().trim().min(1),
  recipient_tin: z.string().regex(/^\d{9}$/),
  box10_net_1231: z.number(),
}).passthrough();

const sCorpSource = z.object({
  corporation_name: z.string().min(1),
  corporation_ein: z.string().regex(/^\d{9}$/),
  source_document_reference: z.string().trim().min(1),
  recipient_tin: z.string().regex(/^\d{9}$/),
  box9_net_1231: z.number(),
}).passthrough();

function fromPending(
  pending: Readonly<Record<string, unknown>>,
): K1Section1231Row[] {
  const partnerships = z.array(z.unknown()).parse(
    (pending.k1_partnership as Record<string, unknown> | undefined)
      ?.k1_partnerships ?? [],
  );
  const sCorps = z.array(z.unknown()).parse(
    (pending.k1_s_corp as Record<string, unknown> | undefined)
      ?.k1_s_corps ?? [],
  );
  return [
    ...partnerships.filter((item) =>
      Number((item as Record<string, unknown>).box10_net_1231 ?? 0) !== 0
    ).map((item) => {
      const source = partnershipSource.parse(item);
      return {
        source: "partnership" as const,
        entity_name: source.partnership_name,
        source_ein: source.partnership_ein,
        source_document_reference: source.source_document_reference,
        recipient_tin: source.recipient_tin,
        gain_loss: source.box10_net_1231,
      };
    }),
    ...sCorps.filter((item) =>
      Number((item as Record<string, unknown>).box9_net_1231 ?? 0) !== 0
    ).map((item) => {
      const source = sCorpSource.parse(item);
      return {
        source: "s_corp" as const,
        entity_name: source.corporation_name,
        source_ein: source.corporation_ein,
        source_document_reference: source.source_document_reference,
        recipient_tin: source.recipient_tin,
        gain_loss: source.box9_net_1231,
      };
    }),
  ];
}

export function assertK1Section1231FilingLinks(
  rawRows: unknown,
  pending: Readonly<Record<string, unknown>>,
  filer?: FilerIdentity,
): K1Section1231Row[] {
  const rows = z.array(k1Section1231RowSchema).parse(rawRows);
  const expected = fromPending(pending);
  const key = (row: K1Section1231Row) =>
    `${row.source}|${row.source_ein}|${row.source_document_reference}`;
  const expectedByKey = new Map(expected.map((row) => [key(row), row]));
  if (
    rows.length !== expected.length ||
    new Set(rows.map(key)).size !== rows.length ||
    expectedByKey.size !== expected.length ||
    rows.some((row) =>
      Object.keys(row).some((field) =>
        row[field as keyof K1Section1231Row] !==
          expectedByKey.get(key(row))?.[field as keyof K1Section1231Row]
      )
    )
  ) {
    throw new Error("Form 4797 line 2 K-1 rows must match issued K-1 sources");
  }
  if (filer) {
    const recipients = [filer.primarySSN.replace(/\D/g, "")];
    if (
      filer.filingStatus === FilingStatus.MarriedFilingJointly &&
      filer.spouse?.ssn
    ) {
      recipients.push(filer.spouse.ssn.replace(/\D/g, ""));
    }
    if (rows.some((row) => !recipients.includes(row.recipient_tin))) {
      throw new Error(
        "Form 4797 line 2 K-1 recipient must match the filer or joint spouse",
      );
    }
  }
  return rows;
}
