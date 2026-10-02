import { type FilerIdentity, FilingStatus } from "../mef/header.ts";
import { inputSchema as w2InputSchema } from "../nodes/inputs/w2/index.ts";
import { Form8958Line } from "../nodes/inputs/f8958/source.ts";

/** Replay retained W-2 box 2 withholding into the filed Form 1040 line 25a. */
export function assertW2WithholdingSource(
  pending: Record<string, unknown>,
  filer: FilerIdentity | undefined,
): void {
  if (pending.w2 === undefined) return;
  const source = w2InputSchema.parse(pending.w2);
  const hasWithholding = source.w2s.some((row) => row.box2_fed_withheld > 0);
  if (pending.f1040 === undefined && !hasWithholding) return;
  if (pending.f1040 === undefined) {
    throw new Error(
      "Retained W-2 box 2 withholding requires a filed Form 1040 line 25a",
    );
  }
  if (!filer) throw new Error("W-2 withholding needs Form 1040 filer identity");
  const recipients = new Set([filer.primarySSN.replace(/\D/g, "")]);
  if (
    filer.filingStatus === FilingStatus.MarriedFilingJointly &&
    filer.spouse?.ssn
  ) recipients.add(filer.spouse.ssn.replace(/\D/g, ""));
  for (const [index, row] of source.w2s.entries()) {
    if (row.box1_wages <= 0 && row.box2_fed_withheld <= 0) continue;
    const ssn = row.employee_ssn?.replace(/\D/g, "");
    if (row.box2_fed_withheld > 0 && !/^\d{9}$/.test(ssn ?? "")) {
      throw new Error(
        `W-2 ${
          index + 1
        } positive box 2 withholding needs the issued employee SSN`,
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
  const allocation = source.f8958_allocation;
  const box2Total = source.w2s.reduce(
    (sum, row) => sum + row.box2_fed_withheld,
    0,
  );
  const withholdingRows = allocation?.rows.filter((row) =>
    row.form_line === Form8958Line.Withholding
  );
  if (
    allocation &&
    (filer.filingStatus !== FilingStatus.MarriedFilingSeparately ||
      allocation.taxpayer.ssn !== filer.primarySSN.replace(/\D/g, "") ||
      source.w2s.length !== 1 || withholdingRows?.length !== 1 ||
      withholdingRows[0].total_amount !== box2Total)
  ) {
    throw new Error(
      "Form 8958 W-2 withholding allocation must identify one matching taxpayer W-2 box 2 total",
    );
  }
  const expected = allocation ? withholdingRows![0].taxpayer_share : box2Total;
  const filed = pending.f1040 as Record<string, unknown>;
  const actual = filed.line25a_w2_withheld ?? 0;
  if (!Number.isFinite(expected) || actual !== expected) {
    throw new Error(
      "Form 1040 line 25a differs from retained W-2 box 2 withholding",
    );
  }
}
