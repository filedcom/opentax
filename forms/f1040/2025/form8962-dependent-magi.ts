import {
  inputSchema as generalSchema,
  ptcDependentsModifiedAgi,
} from "../nodes/inputs/general/index.ts";
import { FilingStatus } from "../nodes/types.ts";

// Direct dependent-tax-return route for TY2025 Worksheet 1-2. Annual and
// bounded monthly filing use the same source check; the calculator stays in general.
export function reconcileDependentMagi(
  householdSize: number | null | undefined,
  reportedMagi: number | null | undefined,
  generalSource: unknown,
): number {
  if (householdSize === 1) {
    if (reportedMagi !== 0) {
      throw new Error(
        "Form 8962 one-person household cannot report dependent MAGI",
      );
    }
    return 0;
  }
  if (householdSize !== 2 && householdSize !== 3) {
    throw new Error(
      "Form 8962 bounded dependent path needs one or two claimed dependents",
    );
  }
  const general = generalSchema.safeParse(generalSource);
  if (!general.success) {
    throw new Error(
      "Form 8962 dependent MAGI needs the verified general return source",
    );
  }
  const claimed = (general.data.dependents ?? []).filter((dependent) =>
    dependent.dependent_on_another_return !== true
  );
  if (householdSize === 2 && general.data.filing_status === FilingStatus.MFJ) {
    if (claimed.length !== 0 || reportedMagi !== 0) {
      throw new Error(
        "Form 8962 married two-person household cannot include dependent MAGI",
      );
    }
    return 0;
  }
  if (general.data.filing_status !== FilingStatus.Single) {
    throw new Error(
      "Form 8962 dependent MAGI needs the verified general return source",
    );
  }
  if (
    claimed.length !== householdSize - 1 ||
    claimed.some((dependent) => !dependent.ptc_tax_return)
  ) {
    throw new Error(
      "Form 8962 dependent MAGI needs every claimed dependent classified",
    );
  }
  if (
    claimed.some((dependent) => dependent.ptc_tax_return?.filing === "form8814")
  ) {
    throw new Error(
      "Form 8962 bounded dependent path does not include Form 8814",
    );
  }
  if (
    claimed.some((dependent) =>
      dependent.ptc_tax_return?.filing === "not_required"
    )
  ) {
    throw new Error(
      "Form 8962 bounded dependent path needs a source-backed not-required filing-threshold workpaper",
    );
  }
  if (
    claimed.some((dependent) => {
      const source = dependent.ptc_tax_return;
      const ssn = dependent.ssn?.replaceAll("-", "");
      return !ssn || source?.filing !== "required" ||
        source.filed_form1040.taxpayer_ssn?.replaceAll("-", "") !== ssn ||
        source.interest_forms1099.some((form) =>
          form.recipient_ssn?.replaceAll("-", "") !== ssn
        );
    })
  ) {
    throw new Error(
      householdSize === 3
        ? "Form 8962 two dependents need filed returns and interest forms naming each covered person"
        : "Form 8962 dependent needs a filed return and interest forms naming the covered person",
    );
  }
  if (householdSize === 3) {
    const documentIds = claimed.flatMap((dependent) => {
      const source = dependent.ptc_tax_return;
      return source?.filing === "required"
        ? [
          source.filed_form1040.source_document_id,
          ...source.interest_forms1099.map((form) => form.source_document_id),
        ]
        : [];
    });
    if (new Set(documentIds).size !== documentIds.length) {
      throw new Error(
        "Form 8962 two dependents need distinct filed-return and interest source documents",
      );
    }
  }
  // The required-filing source is limited to a filed, interest-only single
  // return. Other income/adjustments, Form 2555, and Social Security cannot
  // enter this bounded Worksheet 1-2 route by assertion.
  const magi = ptcDependentsModifiedAgi(claimed);
  if (reportedMagi !== magi) {
    throw new Error(
      "Form 8962 dependent MAGI differs from Worksheet 1-2 source facts",
    );
  }
  return magi;
}
