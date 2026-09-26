import { element, elements } from "../../../mef/xml.ts";
import { CONFIG_BY_YEAR } from "../../../nodes/config/index.ts";
import {
  ExclusionType,
  inputSchema,
} from "../../../nodes/intermediate/forms/form982/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

type Input = Partial<typeof inputSchema._output> & Record<string, unknown>;

export const FIELD_MAP: ReadonlyArray<readonly [string, string]> = [];

function buildIRS982(raw: Input): string {
  if (Array.isArray(raw) && raw.length === 0) return "";
  if (Object.keys(raw).length === 0) return "";
  const input = inputSchema.parse(raw);
  if (input.line2_excluded_cod === 0) return "";
  if (input.exclusion_type !== ExclusionType.Qpri) {
    throw new Error(
      "Form 982 MeF needs tax-attribute reduction details for this exclusion type",
    );
  }
  if (!input.discharge_date || input.discharge_date.slice(0, 4) !== "2025") {
    throw new Error("Form 982 QPRI needs its 2025 discharge date");
  }
  if (input.principal_residence_retained === undefined) {
    throw new Error(
      "Form 982 QPRI needs confirmation whether the residence was retained",
    );
  }
  if (
    input.principal_residence_retained &&
    input.principal_residence_basis === undefined
  ) {
    throw new Error("Form 982 retained residence needs its basis for line 10b");
  }
  const cap = input.qpri_mfs
    ? CONFIG_BY_YEAR[2025].qpriCapMfs
    : CONFIG_BY_YEAR[2025].qpriCapStandard;
  const excluded = Math.min(input.line2_excluded_cod, cap);
  return elements("IRS982", [
    element("DischargeOfQualifiedPrinResInd", "X"),
    element("TotalDischargedIndebtednessAmt", excluded),
    input.principal_residence_retained
      ? element(
        "ExcludedToReducePrinResAmt",
        Math.min(excluded, input.principal_residence_basis!),
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
