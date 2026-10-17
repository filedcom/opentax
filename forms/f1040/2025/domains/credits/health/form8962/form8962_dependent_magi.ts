import {
  inputSchema as generalSchema,
  ptcDependentDividendSources,
  ptcDependentsModifiedAgi,
} from "../../../../../nodes/inputs/general/filing/general/index.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";

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
  if (
    typeof householdSize !== "number" || !Number.isInteger(householdSize) ||
    householdSize < 2
  ) {
    throw new Error(
      "Form 8962 dependent path needs a positive integer tax-family size",
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
  if (
    general.data.filing_status !== FilingStatus.Single &&
    general.data.filing_status !== FilingStatus.MFJ
  ) {
    throw new Error(
      "Form 8962 dependent MAGI needs the verified general return source",
    );
  }
  if (
    claimed.length !==
      householdSize -
        (general.data.filing_status === FilingStatus.MFJ ? 2 : 1) ||
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
    claimed.some((dependent) => {
      const source = dependent.ptc_tax_return;
      const ssn = dependent.ssn?.replaceAll("-", "");
      if (!ssn || !source) return true;
      if (source.filing === "not_required") {
        const sourceSsn = "wage_form_w2" in source
          ? source.wage_form_w2.employee_ssn
          : source.interest_form1099.recipient_ssn;
        return sourceSsn.replaceAll("-", "") !== ssn ||
          source.filing_requirement_review.dependent_ssn.replaceAll("-", "") !==
            ssn;
      }
      return source.filing !== "required" ||
        source.filed_form1040.taxpayer_ssn?.replaceAll("-", "") !== ssn ||
        source.interest_forms1099.some((form) =>
          form.recipient_ssn?.replaceAll("-", "") !== ssn
        ) || source.wage_forms_w2?.some((form) =>
          form.employee_ssn.replaceAll("-", "") !== ssn
        ) || ptcDependentDividendSources(source).some((form) =>
          form.recipient_ssn.replaceAll("-", "") !== ssn
        );
    })
  ) {
    const hasWages = claimed.some((dependent) =>
      dependent.ptc_tax_return?.filing === "required" &&
      dependent.ptc_tax_return.wage_forms_w2 !== undefined
    );
    throw new Error(
      hasWages
        ? "Form 8962 dependent needs a filed return and W-2 naming the covered person"
        : householdSize === 3
        ? "Form 8962 two dependents need filed returns and interest forms naming each covered person"
        : "Form 8962 dependent needs a filed return and interest forms naming the covered person",
    );
  }
  const documentIds = claimed.flatMap((dependent) => {
    const source = dependent.ptc_tax_return;
    return source?.filing === "not_required"
      ? [
        "wage_form_w2" in source
          ? source.wage_form_w2.source_document_id
          : source.interest_form1099.source_document_id,
        source.filing_requirement_review.source_document_id,
      ]
      : source?.filing === "required"
      ? [
        source.filed_form1040.source_document_id,
        ...source.interest_forms1099.map((form) => form.source_document_id),
        ...(source.wage_forms_w2?.map((form) => form.source_document_id) ?? []),
        ...ptcDependentDividendSources(source).map((form) =>
          form.source_document_id
        ),
      ]
      : [];
  });
  if (new Set(documentIds).size !== documentIds.length) {
    const hasWages = claimed.some((dependent) =>
      dependent.ptc_tax_return?.filing === "required" &&
      dependent.ptc_tax_return.wage_forms_w2 !== undefined
    );
    throw new Error(
      hasWages
        ? "Form 8962 dependent needs distinct filed-return and W-2 source documents"
        : "Form 8962 two dependents need distinct filed-return and interest source documents",
    );
  }
  // Referenced W-2/1099 income is summed before the single-dependent filing tests.
  const magi = ptcDependentsModifiedAgi(claimed);
  if (reportedMagi !== magi) {
    throw new Error(
      "Form 8962 dependent MAGI differs from Worksheet 1-2 source facts",
    );
  }
  return magi;
}
