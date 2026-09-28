import {
  form8959,
  type Form8959PrintFields,
  inputSchema,
} from "../nodes/intermediate/forms/form8959/index.ts";
import { inputSchema as f4852Schema } from "../nodes/inputs/f4852/index.ts";
import { inputSchema as householdSchema } from "../nodes/inputs/household_wages/index.ts";
import { inputSchema as ct2Schema } from "../nodes/inputs/ct2/index.ts";
import {
  Box12Code,
  inputSchema as w2Schema,
  type W2Item,
} from "../nodes/inputs/w2/index.ts";

type Source = ReturnType<typeof inputSchema.parse>;

function box14Amount(item: W2Item, description: string): number | undefined {
  const matches = (item.box14_entries ?? []).filter((entry) =>
    entry.description === description
  );
  if (matches.length > 1) {
    throw new Error(
      `Form 8959 W-2 box 14 has duplicate ${description} entries`,
    );
  }
  return matches[0]?.amount;
}

function assertOriginalDeposits(
  source: Partial<Source>,
  pending?: Readonly<Record<string, unknown>>,
): void {
  const checkDeposit = (key: keyof Source, expected: number): void => {
    if ((source[key] ?? 0) !== expected) {
      throw new Error(`Form 8959 ${key} differs from original source records`);
    }
  };
  const w2 = pending?.["w2"];
  if (w2 !== undefined) {
    const items = w2Schema.parse(w2).w2s;
    const ficaItems = items.filter((item) =>
      item.box5_medicare_wages !== undefined ||
      item.box6_medicare_withheld !== undefined ||
      (item.box12_entries ?? []).some((entry) =>
        entry.code === Box12Code.B || entry.code === Box12Code.N
      )
    );
    checkDeposit(
      "w2_medicare_wages",
      ficaItems.reduce((sum, item) => sum + (item.box5_medicare_wages ?? 0), 0),
    );
    checkDeposit(
      "w2_medicare_withheld",
      ficaItems.reduce((sum, item) => {
        const uncollected = (box14Amount(item, "RRTA compensation") ?? 0) > 0
          ? 0
          : (item.box12_entries ?? []).filter((entry) =>
            entry.code === Box12Code.B || entry.code === Box12Code.N
          ).reduce((total, entry) => total + entry.amount, 0);
        return sum + (item.box6_medicare_withheld ?? 0) + uncollected;
      }, 0),
    );
    checkDeposit(
      "w2_rrta_wages",
      items.reduce(
        (sum, item) => sum + (box14Amount(item, "RRTA compensation") ?? 0),
        0,
      ),
    );
    checkDeposit(
      "w2_rrta_medicare_withheld",
      items.reduce(
        (sum, item) =>
          sum + (box14Amount(item, "Additional Medicare Tax") ?? 0),
        0,
      ),
    );
    if (
      (source.w2_single_over_withholding_threshold === true) !==
        items.some((item) =>
          (item.box5_medicare_wages ?? 0) > 200_000 ||
          (box14Amount(item, "RRTA compensation") ?? 0) > 200_000
        )
    ) {
      throw new Error("Form 8959 W-2 filing trigger differs from source");
    }
  }
  const f4852 = pending?.["f4852"];
  if (f4852 !== undefined) {
    const items = f4852Schema.parse(f4852).f4852s.filter((item) =>
      item.form_type === "W2"
    );
    checkDeposit(
      "f4852_medicare_wages",
      items.reduce((sum, item) => sum + (item.medicare_wages ?? 0), 0),
    );
    checkDeposit(
      "f4852_medicare_withheld",
      items.reduce((sum, item) => sum + (item.medicare_withheld ?? 0), 0),
    );
    if (
      (source.f4852_single_over_withholding_threshold === true) !==
        items.some((item) => (item.medicare_wages ?? 0) > 200_000)
    ) {
      throw new Error("Form 8959 Form 4852 filing trigger differs from source");
    }
  }
  const household = pending?.["household_wages"];
  if (household !== undefined) {
    const items = householdSchema.parse(household).household_wages;
    checkDeposit(
      "household_medicare_wages",
      items.reduce((sum, item) => sum + (item.medicare_wages ?? 0), 0),
    );
    checkDeposit(
      "household_medicare_withheld",
      items.reduce((sum, item) => sum + (item.medicare_tax_withheld ?? 0), 0),
    );
  }
  const ct2 = pending?.["ct2"];
  if (ct2 !== undefined) {
    const items = ct2Schema.parse(ct2).ct2s;
    checkDeposit(
      "ct2_rrta_wages",
      items.reduce(
        (sum, item) => sum + item.line2_tier1_medicare_compensation,
        0,
      ),
    );
    checkDeposit(
      "ct2_rrta_medicare_tax_paid",
      Math.round(
        items.reduce(
          (sum, item) => sum + item.line3_additional_medicare_tax_paid,
          0,
        ) * 100,
      ) / 100,
    );
  }
}

export function hasForm8959Print(raw: unknown): boolean {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return true;
  }
  return Object.keys(raw).some((key) =>
    /^line(?:[1-9]|1\d|2[0-4])_/.test(key) ||
    key === "medicare_wages" || key === "medicare_withheld" ||
    key === "rrta_wages" || key === "rrta_medicare_withheld" ||
    key === "single_w2_over_withholding_threshold"
  );
}

export function assertForm8959Absent(
  raw: unknown,
  pending?: Readonly<Record<string, unknown>>,
): void {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Form 8959 source-only record must be an object");
  }
  if (Object.keys(raw).length === 0) {
    assertOriginalDeposits({}, pending);
    return;
  }
  const source = inputSchema.parse(raw);
  assertOriginalDeposits(source, pending);
  const result = form8959.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  );
  if (result.outputs.some((entry) => entry.nodeType === "form8959")) {
    throw new Error("Form 8959 filing trigger exists without print lines");
  }
}

// The executor keeps each upstream deposit in the finalized Form 8959 pending
// slot. Check those deposits against the node's whole-dollar print lines before
// either output format can expose the form.
export function assertForm8959Sources(
  raw: unknown,
  fields: Form8959PrintFields,
  pending?: Readonly<Record<string, unknown>>,
): void {
  const source = inputSchema.passthrough().parse(raw);
  assertOriginalDeposits(source, pending);
  const lines: ReadonlyArray<readonly [keyof Form8959PrintFields, number]> = [
    [
      "line1_medicare_wages",
      (source.w2_medicare_wages ?? 0) +
      (source.f4852_medicare_wages ?? 0) +
      (source.household_medicare_wages ?? 0),
    ],
    ["line2_unreported_tips", source.unreported_tips ?? 0],
    ["line3_wages_8919", source.wages_8919 ?? 0],
    ["line8_se_income", Math.max(0, source.se_income ?? 0)],
    [
      "line14_rrta_wages",
      (source.w2_rrta_wages ?? 0) + (source.ct2_rrta_wages ?? 0),
    ],
    [
      "line19_medicare_withheld",
      (source.w2_medicare_withheld ?? 0) +
      (source.f4852_medicare_withheld ?? 0) +
      (source.household_medicare_withheld ?? 0),
    ],
    [
      "line23_rrta_withheld",
      (source.w2_rrta_medicare_withheld ?? 0) +
      (source.ct2_rrta_medicare_tax_paid ?? 0),
    ],
  ];
  for (const [key, amount] of lines) {
    if (fields[key] !== Math.round(amount)) {
      throw new Error(`Form 8959 ${key} differs from upstream source deposits`);
    }
  }
  const singleW2 = source.w2_single_over_withholding_threshold === true ||
    source.f4852_single_over_withholding_threshold === true;
  if ((fields.single_w2_over_withholding_threshold === true) !== singleW2) {
    throw new Error(
      "Form 8959 single-W-2 trigger differs from source deposits",
    );
  }
}
