import { element, elements } from "../../../mef/xml.ts";
import {
  assertForm982AbsentSource,
  projectQpriForm982,
} from "../../form982-qpri.ts";
import { inputSchema } from "../../../nodes/intermediate/forms/form982/index.ts";
import { FilingStatus } from "../types.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

type Input = Partial<typeof inputSchema._output> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [string, string]> = [];

function buildIRS982(raw: Input, context?: MefBuildContext): string {
  if (Array.isArray(raw) && raw.length === 0) {
    assertForm982AbsentSource(context?.pending);
    return "";
  }
  if (Object.keys(raw).length === 0) {
    assertForm982AbsentSource(context?.pending);
    return "";
  }
  const input = inputSchema.parse(raw);
  if (
    context?.filer &&
    input.qpri_mfs !==
      (context.filer.filingStatus === FilingStatus.MarriedFilingSeparately)
  ) {
    throw new Error(
      "Form 982 QPRI filing-status cap conflicts with the return",
    );
  }
  if (!context?.pending) {
    throw new Error("Form 982 QPRI needs its original 1099-C source");
  }
  const projected = projectQpriForm982(raw, context.pending);
  return elements("IRS982", [
    element("DischargeOfQualifiedPrinResInd", "X"),
    element("TotalDischargedIndebtednessAmt", projected.line2_excluded_cod),
    projected.line10b_principal_residence_basis_reduction !== undefined
      ? element(
        "ExcludedToReducePrinResAmt",
        projected.line10b_principal_residence_basis_reduction,
      )
      : "",
  ]);
}

export const form982: MefFormDescriptor<"form982", Input> = {
  pendingKey: "form982",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f982--2018.pdf",
  build: buildIRS982,
};
