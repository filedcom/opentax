import { z } from "zod";
import { inputSchema } from "../nodes/inputs/f8888/index.ts";
import type { FilerIdentity } from "../mef/header.ts";

export type Form8888Source = z.infer<typeof inputSchema>;

function normalizedName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toUpperCase();
}

function assertAccountOwnership(
  accounts: readonly Form8888Source["account_1"][],
  filer: FilerIdentity,
): void {
  const allowedNames = [
    filer.fullName,
    filer.firstName && filer.lastName
      ? `${filer.firstName} ${filer.lastName}`
      : undefined,
    filer.spouse
      ? `${filer.spouse.firstName} ${filer.spouse.lastName}`
      : undefined,
  ].filter((name): name is string => typeof name === "string" && name !== "")
    .map(normalizedName);
  if (allowedNames.length === 0) {
    throw new Error(
      "Form 8888 needs the filer name to verify account ownership",
    );
  }
  for (const account of accounts) {
    if (!allowedNames.includes(normalizedName(account.owner_name))) {
      throw new Error(
        "Form 8888 account owner must match the taxpayer or spouse",
      );
    }
  }
}

export function reconcileForm8888(
  raw: unknown,
  filer: FilerIdentity | undefined,
  pending: Readonly<Record<string, unknown>> | undefined,
): Form8888Source & { readonly total_allocation: number } {
  const source = inputSchema.parse(raw);
  if (!filer || !pending) {
    throw new Error("Form 8888 needs the filed Form 1040 and filer identity");
  }
  if (filer.bankAccount) {
    throw new Error(
      "Form 8888 split deposit cannot also use Form 1040 direct deposit",
    );
  }
  const injuredSpouse = pending.f8379;
  if (
    injuredSpouse !== undefined && injuredSpouse !== null &&
    typeof injuredSpouse === "object" &&
    Object.keys(injuredSpouse).length > 0
  ) {
    throw new Error("Form 8888 cannot split an injured-spouse refund");
  }
  const filed = pending.f1040;
  if (!filed || typeof filed !== "object" || Array.isArray(filed)) {
    throw new Error("Form 8888 needs the finalized Form 1040 refund");
  }
  const f1040 = filed as Readonly<Record<string, unknown>>;
  for (
    const key of [
      "line35b_routing_number",
      "line35c_account_type",
      "line35d_account_number",
    ]
  ) {
    if (f1040[key] !== undefined && f1040[key] !== null) {
      throw new Error(
        "Form 8888 split deposit cannot also use Form 1040 direct deposit",
      );
    }
  }
  const accounts = [source.account_1, source.account_2, source.account_3]
    .filter((account): account is Form8888Source["account_1"] =>
      account !== undefined
    );
  assertAccountOwnership(accounts, filer);
  const total = accounts.reduce((sum, account) => sum + account.amount, 0);
  if (
    !Number.isSafeInteger(total) ||
    typeof f1040.line35a_refund !== "number" ||
    !Number.isSafeInteger(f1040.line35a_refund) ||
    total !== f1040.line35a_refund
  ) {
    throw new Error(
      "Form 8888 line 5 must equal finalized Form 1040 line 35a refund",
    );
  }
  if (
    typeof f1040.line34_overpayment !== "number" ||
    !Number.isSafeInteger(f1040.line34_overpayment) ||
    f1040.line34_overpayment < total
  ) {
    throw new Error(
      "Form 8888 refund must not exceed Form 1040 line 34 overpayment",
    );
  }
  if (
    typeof f1040.line37_amount_owed === "number" &&
    f1040.line37_amount_owed > 0
  ) {
    throw new Error("Form 8888 cannot allocate an amount-owed return");
  }
  return { ...source, total_allocation: total };
}
