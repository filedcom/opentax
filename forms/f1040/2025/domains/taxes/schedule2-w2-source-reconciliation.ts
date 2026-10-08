import {
  Box12Code,
  inputSchema as w2InputSchema,
} from "../../../nodes/inputs/w2/index.ts";
import { inputSchema as f1099mInputSchema } from "../../../nodes/inputs/f1099m/index.ts";
import { inputSchema as f1099necInputSchema } from "../../../nodes/inputs/f1099nec/index.ts";
import { type FilerIdentity, FilingStatus } from "../../../mef/header.ts";

/** Replays the two distinct W-2 box 12 sources printed together on line 13. */
export function assertSchedule2W2Line13Sources(
  pending: Readonly<Record<string, unknown>>,
): void {
  const schedule2 = pending.schedule2 as
    | Readonly<Record<string, unknown>>
    | undefined;
  const w2s = pending.w2 === undefined
    ? []
    : w2InputSchema.parse(pending.w2).w2s;
  const entries = w2s.flatMap((item) => item.box12_entries ?? []);
  const total = (...codes: Box12Code[]) =>
    entries.filter((entry) => codes.includes(entry.code)).reduce(
      (sum, entry) => sum + entry.amount,
      0,
    );
  if (
    (schedule2?.uncollected_fica ?? 0) !==
      total(Box12Code.A, Box12Code.B) ||
    (schedule2?.uncollected_fica_gtl ?? 0) !==
      total(Box12Code.M, Box12Code.N)
  ) {
    throw new Error(
      "Schedule 2 line 13 differs from retained W-2 box 12 codes A/B/M/N",
    );
  }
}

/** W-2 code K is the employer-reported line 17k excise component. */
export function assertSchedule2W2Line17KSource(
  pending: Readonly<Record<string, unknown>>,
): void {
  const schedule2 = pending.schedule2 as
    | Readonly<Record<string, unknown>>
    | undefined;
  const w2s = pending.w2 === undefined
    ? []
    : w2InputSchema.parse(pending.w2).w2s;
  const codeK = w2s.filter((item) => item.box13_statutory_employee !== true)
    .flatMap((item) => item.box12_entries ?? [])
    .filter((entry) => entry.code === Box12Code.K)
    .reduce((sum, entry) => sum + entry.amount, 0);
  if ((schedule2?.golden_parachute_excise ?? 0) !== codeK) {
    throw new Error(
      "Schedule 2 line 17k differs from retained W-2 box 12 code K",
    );
  }
}

/** Line 17h combines independent W-2 code Z and Form 1099-MISC box 15 taxes. */
export function assertSchedule2Line17HSources(
  pending: Readonly<Record<string, unknown>>,
  filer: FilerIdentity | undefined,
): void {
  const schedule2 = pending.schedule2 as
    | Readonly<Record<string, unknown>>
    | undefined;
  const w2s = pending.w2 === undefined
    ? []
    : w2InputSchema.parse(pending.w2).w2s;
  const codeZRows = w2s.filter((item) =>
    item.box13_statutory_employee !== true &&
    (item.box12_entries ?? []).some((entry) =>
      entry.code === Box12Code.Z && entry.amount > 0
    )
  );
  const codeZ = codeZRows.flatMap((item) => item.box12_entries ?? [])
    .filter((entry) => entry.code === Box12Code.Z)
    .reduce((sum, entry) => sum + entry.amount, 0);
  if ((schedule2?.section409a_excise ?? 0) !== codeZ) {
    throw new Error(
      "Schedule 2 line 17h differs from retained W-2 box 12 code Z",
    );
  }
  const misc = pending.f1099m === undefined
    ? []
    : f1099mInputSchema.parse(pending.f1099m).f1099ms;
  const box15Rows = misc.filter((item) => (item.box15_nqdc ?? 0) > 0);
  const box15Tax = box15Rows.reduce(
    (sum, item) =>
      sum + (item.box15_nqdc ?? 0) * 0.2 +
      (item.box15_409a_review?.interest_amount ?? 0),
    0,
  );
  if ((schedule2?.line17h_nqdc_tax ?? 0) !== box15Tax) {
    throw new Error(
      "Schedule 2 line 17h differs from retained 1099-MISC box 15 tax",
    );
  }
  if (codeZRows.length === 0 && box15Rows.length === 0) return;
  if (!filer) throw new Error("Schedule 2 line 17h needs filer identity");
  const owners = new Set([filer.primarySSN.replace(/\D/g, "")]);
  if (
    filer.filingStatus === FilingStatus.MarriedFilingJointly &&
    filer.spouse?.ssn
  ) owners.add(filer.spouse.ssn.replace(/\D/g, ""));
  if (
    codeZRows.some((item) =>
      !item.employee_ssn ||
      !owners.has(item.employee_ssn.replace(/\D/g, ""))
    ) || box15Rows.some((item) => !owners.has(item.recipient_tin))
  ) {
    throw new Error(
      "Schedule 2 line 17h sources must belong to the taxpayer or joint spouse",
    );
  }
  const nec = pending.f1099nec === undefined
    ? []
    : f1099necInputSchema.parse(pending.f1099nec).f1099necs;
  const allocatedIncome = new Map<string, number>();
  for (const miscRow of box15Rows) {
    const review = miscRow.box15_409a_review!;
    if ("included_in_box3" in review) continue;
    const sourceOwner = review.income_source_recipient_tin;
    if (sourceOwner !== miscRow.recipient_tin || !owners.has(sourceOwner)) {
      throw new Error(
        "1099-MISC box 15 income source recipient differs from the return owner",
      );
    }
    const sourceKey = JSON.stringify([
      review.income_source_form,
      review.income_source_document_reference,
      review.income_source_payer_tin,
      sourceOwner,
    ]);
    let income: number;
    if (review.income_source_form === "w2") {
      const matches = w2s.filter((row) =>
        row.source_document_reference ===
          review.income_source_document_reference &&
        row.employer_ein?.replaceAll("-", "") ===
          review.income_source_payer_tin &&
        row.employee_ssn?.replaceAll("-", "") === sourceOwner
      );
      if (matches.length !== 1) {
        throw new Error(
          "1099-MISC box 15 needs one identified issued W-2 or 1099-NEC income source",
        );
      }
      if (
        (matches[0].box12_entries ?? []).some((entry) =>
          entry.code === Box12Code.Z && entry.amount > 0
        )
      ) {
        throw new Error(
          "1099-MISC box 15 cannot repeat a W-2 code Z section 409A tax base",
        );
      }
      income = matches[0].box1_wages;
    } else {
      const matches = nec.filter((row) =>
        row.source_document_reference ===
          review.income_source_document_reference &&
        row.payer_tin.replaceAll("-", "") ===
          review.income_source_payer_tin &&
        row.recipient_ssn?.replaceAll("-", "") === sourceOwner
      );
      if (matches.length !== 1) {
        throw new Error(
          "1099-MISC box 15 needs one identified issued W-2 or 1099-NEC income source",
        );
      }
      income = matches[0].box1_nec ?? 0;
    }
    const total = (allocatedIncome.get(sourceKey) ?? 0) +
      (miscRow.box15_nqdc ?? 0);
    if (!Number.isSafeInteger(income) || total > income) {
      throw new Error(
        "1099-MISC box 15 exceeds identified W-2 or 1099-NEC income already reported",
      );
    }
    allocatedIncome.set(sourceKey, total);
  }
}
