import { calculateArcherContributions } from "../../../../../nodes/intermediate/forms/adjustments/health/form8853/archer_contributions.ts";
import {
  appendLtcStatement,
  ltcPdfFields,
  ltcPdfInstances,
} from "./f8853_ltc.ts";
import { StandardFonts } from "pdf-lib";
import type {
  PdfFieldEntry,
  PdfFormDescriptor,
} from "../../../review-support/form-descriptor.ts";
import {
  calculateArcherMsaDistribution,
  inputSchema,
  normalizeArcherContributionSource,
  normalizeArcherSource,
  normalizeMedicareSource,
} from "../../../../../nodes/intermediate/forms/adjustments/health/form8853/index.ts";
import { calculateMedicareLedger } from "../../../../../nodes/intermediate/forms/adjustments/health/form8853/medicare_distributions.ts";
import {
  buildMedicareJointDocumentParts,
  form8853 as nativeForm8853,
} from "../../../../mef/forms/adjustments/health/f8853.ts";

// IRS Form 8853 (2025) AcroForm field names.
// Archer MSAs and Long-Term Care Insurance Contracts.
// Sourced Archer and sole-holder Medicare distribution routes reuse the
// native reconciliation guard before printing the computed filing lines.
// Section A: Archer MSA contributions and distributions.
// Section B: Medicare Advantage MSA distributions.
// Section C: Long-term care insurance contracts.
// employer_archer_msa                  → line 1  (employer Archer MSA contributions)
// taxpayer_archer_msa_contributions    → line 2  (taxpayer Archer MSA contributions)
// line3_limitation_amount              → line 3  (limitation amount)
// compensation                         → line 4  (compensation)
// archer_msa_distributions             → line 6a (total Archer MSA distributions)
// archer_msa_rollover                  → line 6b (rollover amounts)
// archer_msa_qualified_expenses        → line 7  (qualified medical expenses)
// medicare_advantage_distributions     → line 10 (Medicare Advantage MSA distributions)
// medicare_advantage_qualified_expenses → line 11 (Medicare Advantage qualified expenses)
// ltc_gross_payments                   → line 17 (gross LTC payments)
// ltc_qualified_contract_amount        → line 18 (qualified LTC amount)
// ltc_accelerated_death_benefits       → line 19 (accelerated death benefits)
// ltc_actual_costs                     → line 22 (actual LTC costs)
// ltc_reimbursements                   → line 24 (reimbursements)
// Raw ltc_period_days cannot go on line 21: that line is $420 times days.
const fields: ReadonlyArray<PdfFieldEntry> = [
  ...ltcPdfFields,
  {
    kind: "text",
    domainKey: "msa_reporting_name",
    pdfField: "topmostSubform[0].Page1[0].f1_1[0]",
  },
  {
    kind: "text",
    domainKey: "msa_reporting_ssn",
    pdfField: "topmostSubform[0].Page1[0].f1_2[0]",
  },
  {
    kind: "text",
    domainKey: "employer_archer_msa",
    printZero: true,
    pdfField: "topmostSubform[0].Page1[0].f1_3[0]",
  },
  {
    kind: "text",
    domainKey: "taxpayer_archer_msa_contributions",
    printZero: true,
    pdfField: "topmostSubform[0].Page1[0].f1_4[0]",
  },
  {
    kind: "text",
    domainKey: "line3_limitation_amount",
    printZero: true,
    pdfField: "topmostSubform[0].Page1[0].f1_5[0]",
  },
  {
    kind: "text",
    domainKey: "compensation",
    printZero: true,
    pdfField: "topmostSubform[0].Page1[0].f1_6[0]",
  },
  {
    kind: "text",
    domainKey: "line5_archer_deduction",
    pdfField: "topmostSubform[0].Page1[0].f1_7[0]",
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "archer_msa_distributions",
    pdfField: "topmostSubform[0].Page1[0].f1_8[0]",
  },
  {
    kind: "text",
    domainKey: "archer_msa_rollover",
    pdfField: "topmostSubform[0].Page1[0].f1_9[0]",
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "line6c_archer_msa_net_distribution",
    pdfField: "topmostSubform[0].Page1[0].f1_10[0]",
  },
  {
    kind: "text",
    domainKey: "archer_msa_qualified_expenses",
    pdfField: "topmostSubform[0].Page1[0].f1_11[0]",
  },
  {
    kind: "text",
    domainKey: "line8_taxable_archer_msa_distribution",
    pdfField: "topmostSubform[0].Page1[0].f1_12[0]",
    printZero: true,
  },
  {
    kind: "checkbox",
    domainKey: "line9a_archer_msa_exception",
    pdfField: "topmostSubform[0].Page1[0].Line9a_ReadOrder[0].c1_1[0]",
  },
  {
    kind: "text",
    domainKey: "line9b_archer_msa_additional_tax",
    pdfField: "topmostSubform[0].Page1[0].f1_13[0]",
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "medicare_advantage_distributions",
    pdfField: "topmostSubform[0].Page1[0].f1_14[0]",
  },
  {
    kind: "text",
    domainKey: "medicare_advantage_qualified_expenses",
    pdfField: "topmostSubform[0].Page1[0].f1_15[0]",
  },
  {
    kind: "text",
    domainKey: "line12_taxable_medicare_msa_distribution",
    pdfField: "topmostSubform[0].Page1[0].f1_16[0]",
    printZero: true,
  },
  {
    kind: "checkbox",
    domainKey: "line13a_medicare_msa_exception",
    pdfField: "topmostSubform[0].Page1[0].Line13a_ReadOrder[0].c1_2[0]",
  },
  {
    kind: "text",
    domainKey: "line13b_medicare_msa_additional_tax",
    pdfField: "topmostSubform[0].Page1[0].f1_17[0]",
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "ltc_gross_payments",
    pdfField: "topmostSubform[0].Page2[0].f2_5[0]",
  },
  {
    kind: "text",
    domainKey: "ltc_qualified_contract_amount",
    pdfField: "topmostSubform[0].Page2[0].f2_6[0]",
  },
  {
    kind: "text",
    domainKey: "ltc_accelerated_death_benefits",
    pdfField: "topmostSubform[0].Page2[0].f2_7[0]",
  },
  {
    kind: "text",
    domainKey: "ltc_actual_costs",
    pdfField: "topmostSubform[0].Page2[0].f2_10[0]",
  },
  {
    kind: "text",
    domainKey: "ltc_reimbursements",
    pdfField: "topmostSubform[0].Page2[0].f2_12[0]",
  },
];

export const form8853Pdf: PdfFormDescriptor = {
  pendingKey: "form8853",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8853--2025.pdf",
  pageIndices: (fields) => fields.ltc_print === true ? [1] : [0],
  filerFields: [
    {
      kind: "text",
      domainKey: "nameLine1",
      pdfField: "topmostSubform[0].Page1[0].f1_1[0]",
      includeWhen: (fields) =>
        fields.ltc_print !== true && fields.msa_reporting_name === undefined,
    },
    {
      kind: "text",
      domainKey: "primarySSN",
      pdfField: "topmostSubform[0].Page1[0].f1_2[0]",
      includeWhen: (fields) =>
        fields.ltc_print !== true && fields.msa_reporting_ssn === undefined,
    },
  ],
  instances(raw, filer, allPending) {
    if (Object.keys(raw).length === 0) return [];
    if (
      raw.ltc_ledger && !raw.archer_contribution_ledger &&
      !raw.archer_distribution_ledger && !raw.medicare_distribution_ledger &&
      !raw.medicare_joint_distribution_ledgers
    ) {
      return ltcPdfInstances(raw, filer, allPending);
    }
    const source = normalizeArcherContributionSource(normalizeMedicareSource(
      normalizeArcherSource(inputSchema.parse(raw)),
    ));
    nativeForm8853.build(source, { filer, pending: allPending ?? {} });
    const ltcInstances = source.ltc_ledger
      ? ltcPdfInstances(source, filer, allPending)
      : [];
    if (source.archer_contribution_ledger) {
      const ledger = source.archer_contribution_ledger;
      const lines = calculateArcherContributions(
        ledger,
        source.w2_code_r_entries,
      );
      return [
        {
          ...source,
          msa_reporting_ssn: ledger.holder_ssn,
          msa_reporting_name: ledger.filing_status === "mfj"
            ? `${filer?.fullName} & ${
              [
                filer?.spouse?.firstName,
                filer?.spouse?.middleInitial,
                filer?.spouse?.lastName,
                filer?.spouse?.suffix,
              ].filter(Boolean).join(" ")
            }`
            : filer?.fullName,
          employer_archer_msa: lines.line1,
          taxpayer_archer_msa_contributions: lines.line2,
          line3_limitation_amount: lines.rawEmployer > 0
            ? undefined
            : lines.line3,
          compensation: lines.rawEmployer > 0 ? undefined : lines.line4,
          line5_archer_deduction: lines.line5,
          ...(source.archer_distribution_ledger
            ? (() => {
              const dist = calculateArcherMsaDistribution(source);
              return {
                archer_msa_distributions: dist.line6a,
                archer_msa_qualified_expenses: dist.line7,
                line6c_archer_msa_net_distribution: dist.line6c,
                line8_taxable_archer_msa_distribution: dist.line8,
                line9b_archer_msa_additional_tax: dist.line9b,
                line9a_archer_msa_exception: dist.line9a,
              };
            })()
            : {}),
        },
        ...ltcInstances,
      ];
    }
    if (source.medicare_joint_distribution_ledgers) {
      const parts = buildMedicareJointDocumentParts(source, {
        filer,
        pending: allPending ?? {},
      });
      const project = (
        lines: typeof parts.computed | typeof parts.owners[number]["lines"],
        ssn: string,
        name: string,
        statement: boolean,
        death = false,
      ) => ({
        ...source,
        msa_reporting_ssn: ssn,
        msa_reporting_name: name,
        medicare_statement: statement,
        medicare_advantage_distributions: lines.line10,
        medicare_advantage_qualified_expenses: lines.line11,
        line12_taxable_medicare_msa_distribution: lines.line12,
        line13a_medicare_msa_exception: lines.line13a,
        line13b_medicare_msa_additional_tax: lines.line13b,
        medicare_death_transfer: death,
      });
      return [
        project(
          parts.computed,
          filer!.primarySSN,
          (filer!.fullName ?? filer!.nameLine1) + " & " +
            [
              filer!.spouse!.firstName,
              filer!.spouse!.middleInitial,
              filer!.spouse!.lastName,
              filer!.spouse!.suffix,
            ].filter(Boolean).join(" "),
          false,
        ),
        ...ltcInstances,
        ...parts.owners.map((holder) => {
          const name = holder.ledger.owner === "taxpayer"
            ? filer!.fullName ?? filer!.nameLine1
            : [
              filer!.spouse!.firstName,
              filer!.spouse!.middleInitial,
              filer!.spouse!.lastName,
              filer!.spouse!.suffix,
            ].filter(Boolean).join(" ");
          return project(
            holder.lines,
            holder.ssn,
            name,
            true,
            holder.lines.deathTransfer,
          );
        }),
      ];
    }
    if (source.medicare_distribution_ledger) {
      const ledger = source.medicare_distribution_ledger;
      const lines = calculateMedicareLedger(ledger);
      return [{
        ...source,
        msa_reporting_ssn: ledger.source.kind === "normal"
          ? ledger.source.holder_ssn
          : ledger.source.recipient_ssn,
        medicare_advantage_distributions: lines.line10,
        medicare_advantage_qualified_expenses: lines.line11,
        line12_taxable_medicare_msa_distribution: lines.line12,
        line13a_medicare_msa_exception: lines.line13a,
        line13b_medicare_msa_additional_tax: lines.line13b,
        medicare_death_transfer: lines.deathTransfer,
      }, ...ltcInstances];
    }
    const lines = calculateArcherMsaDistribution(source);
    return [{
      ...source,
      archer_msa_distributions: lines.line6a,
      archer_msa_qualified_expenses: lines.line7,
      line6c_archer_msa_net_distribution: lines.line6c,
      line8_taxable_archer_msa_distribution: lines.line8,
      line9b_archer_msa_additional_tax: lines.line9b,
      line9a_archer_msa_exception: lines.line9a,
      death_transfer: lines.deathTransfer,
    }, ...ltcInstances];
  },
  fields,
  appendSupplementalPages: appendLtcStatement,
  async decoratePages(document, pages, fields) {
    if (fields.medicare_statement === true) {
      const font = await document.embedFont(StandardFonts.Helvetica);
      pages[0].drawText("statement", { x: 260, y: 760, size: 10, font });
    }
    if (
      fields.death_transfer === true || fields.medicare_death_transfer === true
    ) {
      const font = await document.embedFont(StandardFonts.Helvetica);
      pages[0].drawText(
        fields.medicare_death_transfer === true
          ? "Death of Medicare Advantage MSA account holder"
          : "Death of Archer MSA account holder",
        {
          x: 180,
          y: 775,
          size: 9,
          font,
        },
      );
    }
  },
};
