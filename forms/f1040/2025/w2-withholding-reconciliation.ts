import { reconcileForm4852Source } from "./form4852_source.ts";
import { type FilerIdentity, FilingStatus } from "../mef/header.ts";
import {
  assertDistinctW2IssuedCopies,
  Box12Code,
  inputSchema as w2InputSchema,
} from "../nodes/inputs/w2/index.ts";
import {
  FormType,
  inputSchema as substituteInputSchema,
} from "../nodes/inputs/f4852/index.ts";
import { Form8958Line } from "../nodes/inputs/f8958/source.ts";

const reportedAmountKeys = [
  "box1_wages",
  "box2_fed_withheld",
  "box3_ss_wages",
  "box4_ss_withheld",
  "box5_medicare_wages",
  "box6_medicare_withheld",
  "box7_ss_tips",
  "box8_allocated_tips",
  "box10_dep_care",
  "box11_nonqual_plans",
  "box16_state_wages",
  "box17_state_withheld",
  "box18_local_wages",
  "box19_local_withheld",
] as const;

function hasReportedAmount(
  row: ReturnType<typeof w2InputSchema.parse>["w2s"][number],
): boolean {
  return reportedAmountKeys.some((key) => (row[key] ?? 0) > 0) ||
    (row.box12_entries ?? []).some((entry) => entry.amount > 0) ||
    (row.box14_entries ?? []).some((entry) => entry.amount > 0);
}

/** Form 4852 amounts cannot be filed until its completed substitute-form route exists. */
export function assertForm4852FilingRoute(
  pending: Record<string, unknown>,
  filer?: FilerIdentity,
  retainedEvidenceVerified = false,
): void {
  if (pending.f4852 === undefined) return;
  const substitutes = substituteInputSchema.parse(pending.f4852).f4852s;
  if (substitutes.length > 0 && (!filer || !retainedEvidenceVerified)) {
    throw new Error(
      "Form 4852 requires a completed substitute-form filing and packet route before export",
    );
  }
  if (filer) reconcileForm4852Source(pending, filer);
}

/** Replay ordinary W-2 and substitute W-2 wages into Form 1040 line 1a. */
export function assertLine1aWageSource(
  pending: Record<string, unknown>,
): void {
  const w2 = pending.w2 === undefined
    ? undefined
    : w2InputSchema.parse(pending.w2);
  const substituteWages =
    (pending.w2 as Record<string, unknown> | undefined)?.substitute_w2s !==
        undefined || pending.f4852 === undefined
      ? []
      : substituteInputSchema.parse(pending.f4852).f4852s.filter((row) =>
        row.form_type === FormType.W2
      );
  let issuedWages =
    w2?.w2s.filter((row) => row.box13_statutory_employee !== true).reduce(
      (total, row) => total + row.box1_wages,
      0,
    ) ?? 0;
  if (w2?.f8958_allocation) {
    const wages = w2.f8958_allocation.rows.filter((row) =>
      row.form_line === Form8958Line.Wages
    );
    if (
      w2.w2s.length !== 1 || wages.length !== 1 ||
      w2.w2s[0].box13_statutory_employee === true ||
      wages[0].total_amount !== w2.w2s[0].box1_wages
    ) {
      throw new Error(
        "Form 8958 W-2 wage allocation must match one ordinary issued W-2 box 1",
      );
    }
    issuedWages = wages[0].taxpayer_share;
  }
  const expected = issuedWages + substituteWages.reduce(
    (total, row) => total + (row.wages ?? 0),
    0,
  );
  const filed = (pending.f1040 as Record<string, unknown> | undefined)
    ?.line1a_wages ?? 0;
  const agiRaw = (pending.agi_aggregator as
    | Record<string, unknown>
    | undefined)?.line1a_wages;
  const agi = typeof agiRaw === "number" ? agiRaw : Array.isArray(agiRaw) &&
      agiRaw.every((value) => typeof value === "number")
    ? agiRaw.reduce((total, value) => total + value, 0)
    : undefined;
  if (
    !Number.isFinite(expected) || filed !== expected ||
    (agiRaw !== undefined && agi !== expected)
  ) {
    throw new Error(
      "Form 1040 line 1a and AGI wages differ from retained W-2 and Form 4852 wage sources",
    );
  }
}

/** An elected line 1i must match the retained W-2 code-Q combat pay. */
export function assertLine1iCombatPayElectionSource(
  pending: Record<string, unknown>,
): void {
  const filed = (pending.f1040 as Record<string, unknown> | undefined)
    ?.line1i_combat_pay;
  if (filed === undefined || filed === null || filed === 0) return;
  const source = pending.w2 === undefined
    ? undefined
    : w2InputSchema.parse(pending.w2);
  const expected = source?.w2s.reduce(
    (total, row) =>
      total + (row.box12_entries ?? [])
        .filter((entry) => entry.code === Box12Code.Q)
        .reduce((subtotal, entry) => subtotal + entry.amount, 0),
    0,
  ) ?? 0;
  if (
    typeof filed !== "number" || !Number.isFinite(filed) ||
    !Number.isFinite(expected) || filed !== expected
  ) {
    throw new Error(
      "Form 1040 line 1i combat-pay election differs from retained W-2 box 12 code Q",
    );
  }
}

/** Replay issued and substitute W-2 withholding into Form 1040 line 25a. */
export function assertW2WithholdingSource(
  pending: Record<string, unknown>,
  filer: FilerIdentity | undefined,
): void {
  const source = pending.w2 === undefined
    ? undefined
    : w2InputSchema.parse(pending.w2);
  const substitutes =
    (pending.w2 as Record<string, unknown> | undefined)?.substitute_w2s !==
        undefined || pending.f4852 === undefined
      ? []
      : substituteInputSchema.parse(pending.f4852).f4852s.filter((row) =>
        row.form_type === FormType.W2
      );
  if (source) assertDistinctW2IssuedCopies(source.w2s);
  const substituteWithholding = substitutes.reduce(
    (sum, row) => sum + (row.federal_withheld ?? 0),
    0,
  );
  const hasWithholding = source?.w2s.some((row) => row.box2_fed_withheld > 0) ||
    substituteWithholding > 0;
  const hasPositiveW2 = source?.w2s.some(hasReportedAmount) ?? false;
  const filed = pending.f1040 as Record<string, unknown> | undefined;
  if (
    !source && substitutes.length === 0 &&
    (filed?.line25a_w2_withheld ?? 0) === 0
  ) return;
  if (pending.f1040 === undefined && !hasPositiveW2 && !hasWithholding) return;
  if (!filer) throw new Error("W-2 withholding needs Form 1040 filer identity");
  const recipients = new Set([filer.primarySSN.replace(/\D/g, "")]);
  if (
    filer.filingStatus === FilingStatus.MarriedFilingJointly &&
    filer.spouse?.ssn
  ) recipients.add(filer.spouse.ssn.replace(/\D/g, ""));
  for (const [index, row] of (source?.w2s ?? []).entries()) {
    if (!hasReportedAmount(row)) continue;
    const ssn = row.employee_ssn?.replace(/\D/g, "");
    if (!/^\d{9}$/.test(ssn ?? "")) {
      throw new Error(
        `W-2 ${
          index + 1
        } positive wages or withholding need the issued employee SSN`,
      );
    }
    if (
      (filer.filingStatus === FilingStatus.MarriedFilingJointly && !ssn) ||
      (ssn !== undefined && !recipients.has(ssn))
    ) {
      throw new Error(
        `W-2 ${
          index + 1
        } box 1 wages or box 2 recipient must match the taxpayer or identified joint spouse`,
      );
    }
  }
  if (pending.f1040 === undefined && !hasWithholding) return;
  if (pending.f1040 === undefined) {
    throw new Error(
      "Retained W-2 or Form 4852 withholding requires a filed Form 1040 line 25a",
    );
  }
  const allocation = source?.f8958_allocation;
  const box2Total = source?.w2s.reduce(
    (sum, row) => sum + row.box2_fed_withheld,
    0,
  ) ?? 0;
  const withholdingRows = allocation?.rows.filter((row) =>
    row.form_line === Form8958Line.Withholding
  );
  if (
    allocation &&
    (filer.filingStatus !== FilingStatus.MarriedFilingSeparately ||
      allocation.taxpayer.ssn !== filer.primarySSN.replace(/\D/g, "") ||
      source?.w2s.length !== 1 || withholdingRows?.length !== 1 ||
      withholdingRows[0].total_amount !== box2Total)
  ) {
    throw new Error(
      "Form 8958 W-2 withholding allocation must identify one matching taxpayer W-2 box 2 total",
    );
  }
  const expected =
    (allocation ? withholdingRows![0].taxpayer_share : box2Total) +
    substituteWithholding;
  const actual = filed!.line25a_w2_withheld ?? 0;
  if (!Number.isFinite(expected) || actual !== expected) {
    throw new Error(
      "Form 1040 line 25a differs from retained W-2 and Form 4852 withholding",
    );
  }
}
