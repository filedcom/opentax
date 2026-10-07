import { formatForm8606BasisRatio } from "../../../nodes/intermediate/forms/form8606/roth-current-conversion.ts";
import { reconcileForm8606RothInventories } from "../../form8606_roth_inventory_reconciliation.ts";
import { element, elements } from "../../../mef/xml.ts";
import { FilingStatus } from "../../../mef/header.ts";
import {
  IraOwner,
  printSchema,
} from "../../../nodes/intermediate/forms/form8606/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";
import type { z } from "zod";
import { inputSchema as iraWorksheetSchema } from "../../../nodes/intermediate/worksheets/ira_deduction_worksheet/index.ts";
import { inputSchema as w2Schema } from "../../../nodes/inputs/w2/index.ts";
import { reconcileForm8606Distribution } from "../../form8606_distribution_reconciliation.ts";
import { reconcileForm8606Roth } from "../../form8606_roth_reconciliation.ts";

type Input = z.infer<typeof printSchema> | readonly [];

export const FIELD_MAP: ReadonlyArray<readonly [string, string]> = [];

function buildIRS8606(rawFields: Input, context?: MefBuildContext): string {
  if (Array.isArray(rawFields) && rawFields.length === 0) return "";
  if (Object.keys(rawFields).length === 0) {
    throw new Error("Form 8606 MeF cannot file an empty pending record");
  }
  const fields = printSchema.parse(rawFields);
  if (
    (fields.print_line17_nontaxable_conversion !== undefined ||
      (fields.print_line18_taxable_conversion ?? 0) < 0) &&
    !fields.roth_owner_inventory_review?.current_conversion
  ) {
    throw new Error(
      "Form8606 current conversion fields require actual retained current source inventory",
    );
  }
  const reviewedRoth = reconcileForm8606Roth(
    fields,
    context?.pending,
    context?.filer,
  );
  if (reviewedRoth) {
    if ((fields.print_line18_taxable_conversion ?? 0) < 0) {
      throw new Error(
        "Current fully converted IRA basis exceeds assets: signed Form8606 line18 needs verified IRS nonnegative native filing representation",
      );
    }
    return elements("IRS8606", [
      element("Form8606IRANamelineTxt", reviewedRoth.ownerName),
      element("NondedIRATxpyrWithIRASSN", reviewedRoth.ownerSsn),
      ...(fields.roth_owner_inventory_review?.current_conversion
        ? [
          ...((fields.roth_owner_inventory_review.current_conversion
                  .annual_traditional_activity !== undefined ||
              (fields.print_line7_distributions ?? 0) > 0 ||
              fields.print_line2_prior_basis > 0 &&
                fields.roth_owner_inventory_review.current_conversion
                  .year_end_statements.some((statement) =>
                    statement.fair_market_value > 0
                  ))
            ? [
              element(
                "NondedIRACurrTYNondedContriAmt",
                fields.print_line1_nondeductible,
              ),
              element("NondedIRABasisForPYAmt", fields.print_line2_prior_basis),
              element(
                "NondedIRATotalIRAValueAmt",
                fields.print_line3_total_basis,
              ),
              element(
                "NondedIRAPostTaxYrContriAmt",
                fields.print_line4_post_year_contributions,
              ),
              element(
                "NondedIRATaxYearNetBasisAmt",
                fields.print_line5_current_basis,
              ),
              element(
                "NondedIRACurrTYIRAPlusRllvrAmt",
                fields.print_line6_year_end_value,
              ),
              element(
                "NondedIRAWthdrwLessRllvrAmt",
                fields.print_line7_distributions,
              ),
              element(
                "NondedIRATYCombinedIRAValueAmt",
                fields.print_line8_conversions,
              ),
              element(
                "NondedIRATotRllvrWthdrwVlAmt",
                fields.print_line9_combined_value,
              ),
              element(
                "NondedIRATaxYearBasisRt",
                formatForm8606BasisRatio(fields.print_line10_basis_ratio!),
              ),
              element(
                "NondedIRANontxCnvrtAmt",
                fields.print_line11_nontaxable_conversion,
              ),
              element(
                "NondedIRANontxWthdrwUncnvrtAmt",
                fields.print_line12_nontaxable_distribution,
              ),
              element(
                "NondedIRANontxOfWthdrwAmt",
                fields.print_line13_nontaxable,
              ),
              element(
                "NondedIRATotalIRABasisAmt",
                fields.print_line14_remaining_basis,
              ),
              ...(fields.print_line15c_taxable !== undefined
                ? [
                  element(
                    "NondedIRANotCnvrtLessRllvrAmt",
                    fields.print_line15a_not_converted,
                  ),
                  element(
                    "NondedIRAQlfyDisasterDistriAmt",
                    fields.print_line15b_disaster,
                  ),
                  element("NondedIRATaxableAmt", fields.print_line15c_taxable),
                ]
                : []),
            ]
            : []),
          element("TotalIRAConvertedToRothAmt", fields.print_line16_converted),
          element(
            "TraditionalIRABasisAmt",
            fields.print_line17_nontaxable_conversion,
          ),
          element(
            "TaxableIRAConversionAmt",
            fields.print_line18_taxable_conversion,
          ),
        ]
        : []),
      ...(fields.print_roth_line19_distributions !== undefined
        ? [
          element(
            "TotNonQlfyDistriFromRothIRAAmt",
            fields.print_roth_line19_distributions,
          ),
          element("QlfyFirstTimeHmByrExpensesAmt", 0),
          element(
            "NetQlfyFirstTimeHmByrExpnssAmt",
            fields.print_roth_line21_after_homebuyer,
          ),
          element(
            "ROTHIRAContributionBasisAmt",
            fields.print_roth_line22_contribution_basis,
          ),
          element(
            "NetBasisInRothIRAContriAmt",
            fields.print_roth_line23_after_contribution_basis,
          ),
          element(
            "BasisInCnvrtQlfyRtrPlanAmt",
            fields.print_roth_line24_conversion_basis,
          ),
          element(
            "DistriRothIRALessBasisCnvrtAmt",
            fields.print_roth_line25a_earnings,
          ),
          element("RothIRAQlfyDisasterDistriAmt", 0),
          element(
            "TaxableIRADistributionAmt",
            fields.print_roth_line25c_taxable,
          ),
        ]
        : []),
    ]);
  }
  const details = fields.filing_details;
  if (!details) {
    throw new Error(
      "Form 8606 MeF needs sourced IRA owner and no-activity confirmations",
    );
  }
  const reviewedDistribution = reconcileForm8606Distribution(
    fields,
    context?.pending,
    context?.filer,
  );
  if (reviewedDistribution) {
    return elements("IRS8606", [
      element("Form8606IRANamelineTxt", reviewedDistribution.ownerName),
      element("NondedIRATxpyrWithIRASSN", reviewedDistribution.ownerSsn),
      element(
        "NondedIRACurrTYNondedContriAmt",
        fields.print_line1_nondeductible,
      ),
      element("NondedIRABasisForPYAmt", fields.print_line2_prior_basis),
      element("NondedIRATotalIRAValueAmt", fields.print_line3_total_basis),
      element(
        "NondedIRAPostTaxYrContriAmt",
        fields.print_line4_post_year_contributions,
      ),
      element("NondedIRATaxYearNetBasisAmt", fields.print_line5_current_basis),
      element(
        "NondedIRACurrTYIRAPlusRllvrAmt",
        fields.print_line6_year_end_value,
      ),
      element("NondedIRAWthdrwLessRllvrAmt", fields.print_line7_distributions),
      element("NondedIRATYCombinedIRAValueAmt", fields.print_line8_conversions),
      element(
        "NondedIRATotRllvrWthdrwVlAmt",
        fields.print_line9_combined_value,
      ),
      element(
        "NondedIRATaxYearBasisRt",
        fields.print_line10_basis_ratio!.toFixed(3),
      ),
      element(
        "NondedIRANontxCnvrtAmt",
        fields.print_line11_nontaxable_conversion,
      ),
      element(
        "NondedIRANontxWthdrwUncnvrtAmt",
        fields.print_line12_nontaxable_distribution,
      ),
      element("NondedIRANontxOfWthdrwAmt", fields.print_line13_nontaxable),
      element("NondedIRATotalIRABasisAmt", fields.print_line14_remaining_basis),
      element(
        "NondedIRANotCnvrtLessRllvrAmt",
        fields.print_line15a_not_converted,
      ),
      element("NondedIRAQlfyDisasterDistriAmt", fields.print_line15b_disaster),
      element("NondedIRATaxableAmt", fields.print_line15c_taxable),
    ]);
  }
  const spouseOwned = details.owner === IraOwner.Spouse;
  const filer = context?.filer;
  if (
    spouseOwned &&
    (filer?.filingStatus !== FilingStatus.MarriedFilingJointly ||
      !filer.spouse?.firstName || !filer.spouse?.lastName ||
      details.other_spouse_form8606_not_required_confirmed !== true)
  ) {
    throw new Error(
      "Form 8606 spouse-owned no-activity IRA needs a joint return, spouse identity, and separate-form review",
    );
  }
  if (
    details.no_ira_distributions_or_conversions_confirmed !== true ||
    fields.source_traditional_distributions !== 0 ||
    fields.source_roth_conversion !== 0 ||
    fields.source_roth_distribution !== 0 ||
    fields.source_roth_basis_contributions !== 0 ||
    fields.source_roth_basis_conversions !== 0 ||
    fields.print_line6_year_end_value !== undefined ||
    fields.print_line7_distributions !== undefined ||
    fields.print_line8_conversions !== undefined ||
    fields.print_line13_nontaxable !== undefined ||
    fields.print_line15c_taxable !== undefined ||
    fields.print_line16_converted !== undefined ||
    fields.print_line18_taxable_conversion !== undefined
  ) {
    throw new Error(
      "Form 8606 MeF only supports a no-distribution, no-conversion Part I claim",
    );
  }
  const line1 = fields.print_line1_nondeductible;
  const line2 = fields.print_line2_prior_basis;
  const line3 = fields.print_line3_total_basis;
  const line14 = fields.print_line14_remaining_basis;
  if (
    ![line1, line2, line3, line14].every(Number.isInteger) ||
    line1 <= 0 || line3 !== line1 + line2 ||
    line14 !== line3
  ) {
    throw new Error(
      "Form 8606 MeF needs whole-dollar line 1, nonnegative documented prior basis, and line 3 = line 14 = lines 1 + 2",
    );
  }
  const ownerName = spouseOwned
    ? [
      filer?.spouse?.firstName,
      filer?.spouse?.middleInitial,
      filer?.spouse?.lastName,
    ].filter(Boolean).join(" ")
    : filer?.fullName;
  const ownerSsn = spouseOwned ? filer?.spouse?.ssn : filer?.primarySSN;
  if (!ownerName?.trim() || !ownerSsn || !/^\d{9}$/.test(ownerSsn)) {
    throw new Error(
      "Form 8606 MeF needs IRA owner name and SSN from the return header",
    );
  }
  if (
    !spouseOwned &&
    (filer?.spouse || filer?.filingStatus === FilingStatus.MarriedFilingJointly)
  ) {
    throw new Error(
      "Form 8606 MeF does not yet support joint returns with spouse IRA filing ambiguity",
    );
  }
  if (spouseOwned && line2 !== 0) {
    throw new Error(
      "Form 8606 spouse-owned no-activity IRA currently needs zero opening basis",
    );
  }
  if (line2 === 0) {
    const evidence = fields.zero_basis_source;
    const worksheet = iraWorksheetSchema.safeParse(
      context?.pending?.ira_deduction_worksheet,
    );
    const w2s = w2Schema.safeParse(context?.pending?.w2);
    const f1040 = context?.pending?.f1040 as
      | Record<string, unknown>
      | undefined;
    const schedule1 = context?.pending?.schedule1 as
      | Record<string, unknown>
      | undefined;
    if (
      !evidence || !worksheet.success || !w2s.success ||
      w2s.data.w2s.length !== 1 || !f1040 ||
      evidence.form5498.owner_ssn !== ownerSsn ||
      evidence.prior_form8606.owner_ssn !== ownerSsn ||
      evidence.form5498.source_document_reference ===
        evidence.prior_form8606.source_document_reference ||
      evidence.form5498.box1_ira_contributions !== line1 ||
      worksheet.data.ira_contribution !== line1 ||
      worksheet.data.active_participant !== true ||
      worksheet.data.magi !== f1040.line11_agi ||
      f1040.line11_agi !== w2s.data.w2s[0].box1_wages ||
      w2s.data.w2s[0].box13_retirement_plan !== true ||
      w2s.data.w2s[0].employee_ssn?.replace(/\D/g, "") !== ownerSsn ||
      worksheet.data.form8606_filing_details?.owner !== details.owner ||
      (spouseOwned && worksheet.data.form8606_filing_details
            ?.other_spouse_form8606_not_required_confirmed !== true) ||
      JSON.stringify(worksheet.data.form8606_zero_basis_source) !==
        JSON.stringify(evidence) ||
      (schedule1?.line20_ira_deduction ?? 0) !== 0 ||
      (f1040.line4a_ira_gross ?? 0) !== 0 ||
      (f1040.line4b_ira_taxable ?? 0) !== 0
    ) {
      throw new Error(
        "Form 8606 zero-opening-basis claim needs matching 2024 Form 8606, 2025 Form 5498, IRA worksheet, and finalized Form 1040 sources",
      );
    }
  }
  return elements("IRS8606", [
    element("Form8606IRANamelineTxt", ownerName),
    element("NondedIRATxpyrWithIRASSN", ownerSsn),
    element("NondedIRACurrTYNondedContriAmt", line1),
    element("NondedIRABasisForPYAmt", line2),
    element("NondedIRATotalIRAValueAmt", line3),
    element("NondedIRATotalIRABasisAmt", line14),
  ]);
}

export const form8606: MefFormDescriptor<
  "form8606",
  Input,
  string | readonly string[]
> = {
  pendingKey: "form8606",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8606.pdf",
  build(fields, context) {
    if (!Array.isArray(fields) && "owner_forms" in fields) {
      if (!context?.pending) {
        throw new Error(
          "Separate Roth owner copies require actual source graph",
        );
      }
      const inventory = reconcileForm8606RothInventories(
        context.pending,
        context.filer,
      );
      if (
        !inventory ||
        JSON.stringify(printSchema.parse(fields)) !==
          JSON.stringify(printSchema.parse(context.pending.form8606))
      ) {
        throw new Error(
          "Form8606 collection differs from finalized complete source",
        );
      }
      return inventory.owners.filter((owner) => owner.requires8606).map((
        owner,
      ) => buildIRS8606(owner.fields!, context));
    }
    return buildIRS8606(fields, context);
  },
};
