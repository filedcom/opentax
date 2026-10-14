import { partII_tax } from "../../../../../nodes/intermediate/forms/taxes/retirement/form5329/index.ts";
import { reconcileArcherPartVI } from "../../../../domains/adjustments/health/form8853/form8853_contributions_reconciliation.ts";
import {
  calculateOwnerForms,
  inputSchema,
  reconcileHsaOwnerForms,
} from "../../../../../nodes/intermediate/forms/taxes/retirement/form5329/index.ts";
import { TS } from "../../../../../nodes/types.ts";
import type {
  PdfFieldEntry,
  PdfFormDescriptor,
} from "../../../review-support/form-descriptor.ts";

// Verified against the canonical 2025 Form 5329 AcroForm. Page 1 fields
// f1_3–f1_8 are the stand-alone filing address, not Part I amounts.
// Parts I and II start at f1_9 and f1_14; HSA Part VII starts at f2_17.
// Sourced Archer Part VI retains its page even when line41 is zero. With
// line34 zero, IRS instructions skip lines35–38. Other unsourced parts are guarded.
const fields: ReadonlyArray<PdfFieldEntry> = [
  ...Array.from(
    { length: 8 },
    (_, index) => ({
      kind: "text" as const,
      domainKey: `print_archer_line${index + 34}`,
      pdfField: `topmostSubform[0].Page2[0].f2_${index + 9}[0]`,
      printZero: true,
    }),
  ),
  {
    kind: "text",
    domainKey: "owner_name",
    pdfField: "topmostSubform[0].Page1[0].f1_1[0]",
  },
  {
    kind: "text",
    domainKey: "owner_ssn",
    pdfField: "topmostSubform[0].Page1[0].f1_2[0]",
  },
  {
    kind: "text",
    domainKey: "print_early_line1",
    pdfField: "topmostSubform[0].Page1[0].f1_9[0]",
  },
  {
    kind: "text",
    domainKey: "early_distribution_exception_code",
    pdfField: "topmostSubform[0].Page1[0].f1_10[0]",
  },
  {
    kind: "text",
    domainKey: "early_distribution_exception",
    pdfField: "topmostSubform[0].Page1[0].f1_11[0]",
  },
  {
    kind: "text",
    domainKey: "print_early_line3",
    pdfField: "topmostSubform[0].Page1[0].f1_12[0]",
  },
  {
    kind: "text",
    domainKey: "print_early_line4",
    pdfField: "topmostSubform[0].Page1[0].f1_13[0]",
  },
  {
    kind: "text",
    domainKey: "esa_able_distribution",
    pdfField: "topmostSubform[0].Page1[0].f1_14[0]",
  },
  {
    kind: "text",
    domainKey: "esa_able_exception",
    pdfField: "topmostSubform[0].Page1[0].f1_15[0]",
  },
  {
    kind: "text",
    domainKey: "print_education_line7",
    pdfField: "topmostSubform[0].Page1[0].f1_16[0]",
  },
  {
    kind: "text",
    domainKey: "print_education_line8",
    pdfField: "topmostSubform[0].Page1[0].f1_17[0]",
  },
  {
    kind: "text",
    domainKey: "print_hsa_line42",
    pdfField: "topmostSubform[0].Page2[0].f2_17[0]",
  },
  {
    kind: "text",
    domainKey: "print_hsa_line43",
    pdfField: "topmostSubform[0].Page2[0].f2_18[0]",
  },
  {
    kind: "text",
    domainKey: "print_hsa_line44",
    pdfField: "topmostSubform[0].Page2[0].f2_19[0]",
  },
  {
    kind: "text",
    domainKey: "print_hsa_line45",
    pdfField: "topmostSubform[0].Page2[0].f2_20[0]",
  },
  {
    kind: "text",
    domainKey: "print_hsa_line46",
    pdfField: "topmostSubform[0].Page2[0].f2_21[0]",
  },
  {
    kind: "text",
    domainKey: "print_hsa_line47",
    pdfField: "topmostSubform[0].Page2[0].f2_22[0]",
  },
  {
    kind: "text",
    domainKey: "print_hsa_line48",
    pdfField: "topmostSubform[0].Page2[0].f2_23[0]",
  },
  {
    kind: "text",
    domainKey: "print_hsa_line49",
    pdfField: "topmostSubform[0].Page2[0].f2_24[0]",
  },
];

export const form5329Pdf: PdfFormDescriptor = {
  pendingKey: "form5329",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f5329--2025.pdf",
  pageIndices(fields) {
    // Retain page2 for sourced Archer current excess even when its tax is zero.
    const printsPartVII = Array.from(
      { length: 8 },
      (_, index) => fields[`print_hsa_line${index + 42}`],
    ).some((value) => typeof value === "number" && Math.round(value) !== 0);
    return printsPartVII || fields.archer_part_vi !== undefined ? [0, 1] : [0];
  },
  instances(pending, filer, allPending) {
    const unexpected = Object.keys(pending).filter((key) =>
      key !== "owner_entries" && key !== "owner_forms"
    );
    if (unexpected.length > 0) {
      throw new Error(
        `Form 5329 PDF requires owner entries: ${unexpected.join(", ")}`,
      );
    }
    const parsed = inputSchema.parse({ owner_entries: pending.owner_entries });
    const calculated = calculateOwnerForms(parsed);
    if (calculated.forms.length === 0) {
      if (pending.owner_forms !== undefined) {
        throw new Error("Form 5329 PDF has forms without owner sources");
      }
      return [];
    }
    if (
      JSON.stringify(pending.owner_forms) !== JSON.stringify(calculated.forms)
    ) {
      throw new Error(
        "Form 5329 PDF owner forms do not match source calculation",
      );
    }
    reconcileHsaOwnerForms(calculated.forms, allPending?.form8889, filer);
    reconcileArcherPartVI(calculated.forms, allPending?.form8853, {
      filer,
      pending: allPending ?? {},
    });
    if (
      calculated.total > 0 &&
      allPending?.schedule2?.line8_form5329_tax !== calculated.total
    ) {
      throw new Error(
        "Form 5329 PDF owner taxes do not reconcile to Schedule 2 line 8",
      );
    }
    return calculated.forms.map((form) => {
      if (
        [
          form.excess_traditional_ira,
          form.excess_roth_ira,
          form.excess_coverdell_esa,
          form.excess_archer_msa,
          form.excess_able,
        ].some((amount) => (amount ?? 0) > 0)
      ) {
        throw new Error(
          "Form 5329 PDF needs sourced excess-contribution worksheet lines",
        );
      }
      const name = form.owner === TS.S
        ? filer?.spouse && `${filer.spouse.firstName} ${filer.spouse.lastName}`
        : filer?.fullName;
      const ssn = form.owner === TS.S ? filer?.spouse?.ssn : filer?.primarySSN;
      if (!name || !ssn) {
        throw new Error("Form 5329 PDF needs each owner's name and SSN");
      }
      const regular = Array.isArray(form.early_distribution)
        ? form.early_distribution.reduce((sum, amount) => sum + amount, 0)
        : form.early_distribution ?? 0;
      const simple = Array.isArray(form.simple_ira_early_distribution)
        ? form.simple_ira_early_distribution.reduce(
          (sum, amount) => sum + amount,
          0,
        )
        : form.simple_ira_early_distribution ?? 0;
      const early = regular + simple;
      const earlyException = form.early_distribution_exception ?? 0;
      const education = form.esa_able_distribution ?? 0;
      const educationException = form.esa_able_exception ?? 0;
      return {
        ...form,
        owner_name: name,
        owner_ssn: ssn.replaceAll("-", ""),
        ...(early > 0
          ? {
            print_early_line1: early,
            print_early_line3: early - earlyException,
            print_early_line4: (regular - earlyException) * 0.1 +
              simple * 0.25,
          }
          : {}),
        ...(education > 0
          ? {
            print_education_line7: education - educationException,
            print_education_line8: partII_tax(form),
          }
          : {}),
      };
    });
  },
  fields,
};
