import { type FilerIdentity, FilingStatus } from "../../../../../mef/header.ts";
import { inputSchema as bSchema } from "../../../../../nodes/inputs/income/investments/f1099b/index.ts";
import {
  assertDistinct1099DIVCopies,
  inputSchema as divSchema,
} from "../../../../../nodes/inputs/income/investments/f1099div/index.ts";
import {
  assertDistinct1099GCopies,
  inputSchema as gSchema,
} from "../../../../../nodes/inputs/income/other/f1099g/index.ts";
import {
  assertDistinct1099INTCopies,
  inputSchema as intSchema,
} from "../../../../../nodes/inputs/income/investments/f1099int/index.ts";
import { inputSchema as kSchema } from "../../../../../nodes/inputs/income/business/f1099k/index.ts";
import {
  assertDistinct1099MCopies,
  inputSchema as mSchema,
} from "../../../../../nodes/inputs/income/business/f1099m/index.ts";
import { inputSchema as necSchema } from "../../../../../nodes/inputs/income/business/f1099nec/index.ts";
import {
  assertDistinct1099OIDCopies,
  inputSchema as oidSchema,
} from "../../../../../nodes/inputs/income/investments/f1099oid/index.ts";
import { inputSchema as patrSchema } from "../../../../../nodes/inputs/income/business/f1099patr/index.ts";
import { inputSchema as rSchema } from "../../../../../nodes/inputs/income/retirement/f1099r/index.ts";
import {
  FormType,
  inputSchema as substituteSchema,
} from "../../../../../nodes/inputs/income/wages/f4852/index.ts";
import { inputSchema as transactionSchema } from "../../../../../nodes/inputs/income/investments/f8949/index.ts";
import { inputSchema as railroadSchema } from "../../../../../nodes/inputs/income/retirement/rrb1099r/index.ts";
import { inputSchema as socialSecuritySchema } from "../../../../../nodes/inputs/income/retirement/ssa1099/index.ts";

type Source = {
  readonly key: string;
  readonly rows: string;
  readonly fields: readonly string[];
  readonly schema: { parse(input: unknown): unknown };
  readonly recipient?: string;
  readonly recipientOnJointOnly?: boolean;
  readonly include?: (row: Record<string, unknown>) => boolean;
};

// Each listed field is emitted to f1040.line25b_withheld_1099 by its source
// node. The 1099-K subtype field is deliberately not added a second time.
const sources: readonly Source[] = [
  {
    key: "f1099b",
    rows: "f1099bs",
    fields: ["federal_withheld"],
    schema: bSchema,
  },
  { key: "f1099div", rows: "f1099divs", fields: ["box4"], schema: divSchema },
  {
    key: "f1099g",
    rows: "f1099gs",
    fields: ["box_4_federal_withheld"],
    schema: gSchema,
    recipient: "recipient_tin",
  },
  { key: "f1099int", rows: "f1099ints", fields: ["box4"], schema: intSchema },
  {
    key: "f1099k",
    rows: "f1099ks",
    fields: ["box4_federal_withheld"],
    schema: kSchema,
  },
  {
    key: "f1099m",
    rows: "f1099ms",
    fields: ["box4_federal_withheld"],
    schema: mSchema,
    recipient: "recipient_tin",
  },
  {
    key: "f1099nec",
    rows: "f1099necs",
    fields: ["box4_federal_withheld"],
    schema: necSchema,
  },
  {
    key: "f1099oid",
    rows: "f1099oids",
    fields: ["box4_federal_withheld"],
    schema: oidSchema,
  },
  {
    key: "f1099patr",
    rows: "f1099patrs",
    fields: ["box4_federal_withheld"],
    schema: patrSchema,
  },
  {
    key: "f1099r",
    rows: "f1099rs",
    fields: ["box4_federal_withheld"],
    schema: rSchema,
    recipient: "recipient_ssn",
    recipientOnJointOnly: true,
  },
  {
    key: "f4852",
    rows: "f4852s",
    fields: ["federal_withheld"],
    schema: substituteSchema,
    include: (row) => row.form_type === FormType.R_1099,
  },
  {
    key: "rrb1099r",
    rows: "rrb1099rs",
    fields: ["box9_federal_withheld"],
    schema: railroadSchema,
    recipient: "recipient_tin",
  },
  {
    key: "ssa1099",
    rows: "ssas",
    fields: ["box6_federal_withheld", "rrb_box10_federal_withheld"],
    schema: socialSecuritySchema,
  },
];

/** Replay all retained 1099-family withholding into Form 1040 line 25b. */
export function assert1099WithholdingSource(
  pending: Record<string, unknown>,
  filer: FilerIdentity | undefined,
): void {
  let expected = 0;
  const brokerTransactionIds = new Set<string>();
  const allowedRecipients = new Set<string>();
  if (filer) {
    allowedRecipients.add(filer.primarySSN.replace(/\D/g, ""));
    if (
      filer.filingStatus === FilingStatus.MarriedFilingJointly && filer.spouse
    ) {
      allowedRecipients.add(filer.spouse.ssn.replace(/\D/g, ""));
    }
  }
  for (const source of sources) {
    if (
      source.key === "f4852" &&
      (pending.f1099r as Record<string, unknown> | undefined)
          ?.substitute_f1099rs !== undefined
    ) continue;
    const raw = pending[source.key];
    if (raw === undefined) continue;
    const parsed = source.schema.parse(raw) as Record<string, unknown>;
    const rows = parsed[source.rows] as Record<string, unknown>[];
    if (source.key === "f1099div") {
      assertDistinct1099DIVCopies(divSchema.parse(raw).f1099divs);
    } else if (source.key === "f1099int") {
      assertDistinct1099INTCopies(intSchema.parse(raw).f1099ints);
    } else if (source.key === "f1099oid") {
      assertDistinct1099OIDCopies(oidSchema.parse(raw).f1099oids);
    } else if (source.key === "f1099g") {
      assertDistinct1099GCopies(gSchema.parse(raw).f1099gs);
    } else if (source.key === "f1099m") {
      assertDistinct1099MCopies(mSchema.parse(raw).f1099ms);
    }
    for (const [index, row] of rows.entries()) {
      if (source.include && !source.include(row)) continue;
      const amount = source.fields.reduce(
        (sum, field) => sum + ((row[field] as number | undefined) ?? 0),
        0,
      );
      if (amount <= 0) continue;
      if (source.key === "f1099b" && typeof row.transaction_id === "string") {
        brokerTransactionIds.add(row.transaction_id);
      }
      if (
        source.recipient && (!source.recipientOnJointOnly ||
          filer?.filingStatus === FilingStatus.MarriedFilingJointly)
      ) {
        const recipient = row[source.recipient];
        if (
          typeof recipient !== "string" ||
          !allowedRecipients.has(recipient.replace(/\D/g, ""))
        ) {
          throw new Error(
            `${source.key} row ${
              index + 1
            } withholding recipient must match the taxpayer or joint spouse`,
          );
        }
      }
      expected += amount;
    }
  }
  const rawTransactions = pending.f8949;
  if (rawTransactions !== undefined) {
    const transactions = transactionSchema.parse(rawTransactions).f8949s;
    if (
      transactions.some((row) =>
        (row.federal_withheld ?? 0) > 0 &&
        row.source_transaction_id !== undefined &&
        brokerTransactionIds.has(row.source_transaction_id)
      )
    ) {
      throw new Error(
        "1099-B and Form 8949 source rows repeat withholding for one broker transaction",
      );
    }
    if (transactions.some((row) => (row.federal_withheld ?? 0) > 0)) {
      throw new Error(
        "Form 8949 withholding needs an issued Form 1099-B source; enter it on the broker copy",
      );
    }
  }
  if (expected > 0 && !filer) {
    throw new Error(
      "1099-family withholding needs Form 1040 filer identity",
    );
  }
  const actual = (pending.f1040 as Record<string, unknown> | undefined)
    ?.line25b_withheld_1099 ?? 0;
  if (!Number.isFinite(expected) || actual !== expected) {
    throw new Error(
      "Form 1040 line 25b differs from retained 1099-family withholding",
    );
  }
}
