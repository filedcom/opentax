import { element, elements } from "../../../mef/xml.ts";
import {
  alternativeCompensationSourcingSchema,
  categorySummarySchema,
} from "../../../nodes/intermediate/forms/form_1116/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";
import {
  assertAlternativeCompensationSources,
} from "./f1116_alternative_compensation_source.ts";
import { conversionExplanationAttachmentId } from "./f1116_conversion_explanation.ts";

function sourceComparison(
  item: ReturnType<typeof alternativeCompensationSourcingSchema.parse>,
): string {
  const comparison =
    `Alt US=${item.alternative_us_source_usd} F=${item.alternative_foreign_source_usd}; ` +
    `time/geog US=${item.ordinary_us_source_usd} F=${item.ordinary_foreign_source_usd}`;
  if (comparison.length > 100) {
    throw new Error(
      "Form 1116 line 1b source comparison exceeds the native statement limit",
    );
  }
  return comparison;
}

export const form1116AlternativeCompensationStatement: MefFormDescriptor<
  "form1116_alternative_compensation_statement",
  unknown
> = {
  pendingKey: "form1116_alternative_compensation_statement",
  sourcePendingKeys: ["form_1116"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1116.pdf",
  build(_fields, context = {}) {
    const raw = context.pending?.form_1116;
    if (!raw || typeof raw !== "object" || !("category_summaries" in raw)) {
      return "";
    }
    const summaries = Array.isArray(raw.category_summaries)
      ? raw.category_summaries.map((value) =>
        categorySummarySchema.parse(value)
      )
      : [];
    const details = summaries.flatMap((summary) =>
      summary.items.flatMap((item) =>
        item.alternative_compensation_sourcing
          ? [item.alternative_compensation_sourcing]
          : []
      )
    );
    if (details.length === 0) return "";
    assertAlternativeCompensationSources(summaries, context);
    conversionExplanationAttachmentId(context);
    const filer = context.filer;
    if (!filer?.nameLine1 || !filer.primarySSN) {
      throw new Error(
        "Form 1116 alternative compensation statement needs taxpayer name and SSN",
      );
    }
    return elements(
      "AltBasisCompensationSourceStmt",
      details.map((item) =>
        elements("AltBasisCompSourceStmt", [
          element("PersonNm", filer.nameLine1),
          element("SSN", filer.primarySSN.replace(/\D/g, "")),
          element(
            "SpecificIncmOrFringeBnftDesc",
            item.specific_compensation_description,
          ),
          element("AltAllocationBasisDesc", item.alternative_allocation_basis),
          element(
            "AltAllocationComputationDesc",
            item.alternative_allocation_computation,
          ),
          element("AltAllocationGeogCmprsnDesc", sourceComparison(item)),
        ])
      ),
    );
  },
};
