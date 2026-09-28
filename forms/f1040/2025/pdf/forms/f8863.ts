import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  calculateAocStudentLines,
  calculateForm8863Lines,
  type F8863Item,
  inputSchema,
} from "../../../nodes/inputs/f8863/index.ts";
import { form8863 as nativeForm8863 } from "../../mef/forms/f8863.ts";

// Rev. Sept. 2025 AcroForm: page 1 carries return totals, page 2 carries
// exactly one student's Part III. Extra students require copies of page 2.
const p1 = "topmostSubform[0].Page1[0]";
const p2 = "topmostSubform[0].Page2[0]";
const text = (domainKey: string, pdfField: string, printZero = false) => ({
  kind: "text" as const,
  domainKey,
  pdfField,
  ...(printZero ? { printZero } : {}),
});
const yesNo = (domainKey: string, yesField: string, noField: string) => [
  {
    kind: "checkboxWhen" as const,
    domainKey,
    pdfField: yesField,
    whenValue: "yes",
  },
  {
    kind: "checkboxWhen" as const,
    domainKey,
    pdfField: noField,
    whenValue: "no",
  },
];

const fields: readonly PdfFieldEntry[] = [
  ...["a", "b", "c"].map((part, index) =>
    text(`pdf_return_ssn_${part}`, `${p1}.SocialSecurity[0].f1_${index + 2}[0]`)
  ),
  ...[
    ["line1", "f1_5"],
    ["line2", "f1_6"],
    ["line3", "f1_7"],
    ["line4", "f1_8"],
    ["line5", "f1_9"],
    ["line7", "f1_12"],
    ["line8", "f1_13"],
    ["line9", "f1_14"],
    ["line10", "f1_15"],
    ["line11", "f1_16"],
    ["line12", "f1_17"],
    ["line13", "f1_18"],
    ["line14", "f1_19"],
    ["line15", "f1_20"],
    ["line16", "f1_21"],
    ["line18", "f1_24"],
    ["line19", "f1_25"],
  ].map(([key, widget]) =>
    text(key, `${p1}.${widget}[0]`, key === "line10" || key === "line18")
  ),
  text("pdf_line6_whole", `${p1}.f1_10[0]`),
  text("pdf_line6_fraction", `${p1}.f1_11[0]`),
  text("pdf_line17_whole", `${p1}.f1_22[0]`),
  text("pdf_line17_fraction", `${p1}.f1_23[0]`),
  { kind: "checkbox", domainKey: "pdf_under24", pdfField: `${p1}.c1_1[0]` },
  ...["a", "b", "c"].map((part, index) =>
    text(`pdf_return_ssn_${part}`, `${p2}.SSN[0].f2_${index + 2}[0]`)
  ),
  text("pdf_student_name", `${p2}.f2-5[0]`),
  ...["a", "b", "c"].map((part, index) =>
    text(`pdf_student_ssn_${part}`, `${p2}.StudentSSN[0].f2_${index + 6}[0]`)
  ),
  ...[0, 1].flatMap((index): PdfFieldEntry[] => {
    const group = `${p2}.Line22${index === 0 ? "a" : "b"}[0]`;
    const nameField = index === 0 ? 9 : 20;
    const addressField = index === 0 ? 10 : 21;
    const firstEinField = index === 0 ? 11 : 22;
    const firstCheck = index === 0 ? 1 : 3;
    return [
      text(`pdf_institution_${index}_name`, `${group}.f2_${nameField}[0]`),
      text(
        `pdf_institution_${index}_address`,
        `${group}.f2_${addressField}[0]`,
      ),
      ...yesNo(
        `pdf_institution_${index}_current_1098t`,
        `${group}.c2_${firstCheck}[0]`,
        `${group}.c2_${firstCheck}[1]`,
      ),
      ...yesNo(
        `pdf_institution_${index}_prior_box7`,
        `${group}.c2_${firstCheck + 1}[0]`,
        `${group}.c2_${firstCheck + 1}[1]`,
      ),
      ...Array.from({ length: 9 }, (_, digit) =>
        text(
          `pdf_institution_${index}_ein_${digit}`,
          `${group}.f2_${firstEinField + digit}[0]`,
        )),
    ];
  }),
  ...[5, 6, 7, 8].flatMap((check, index) =>
    yesNo(
      `pdf_gate_${23 + index}`,
      `${p2}.c2_${check}[0]`,
      `${p2}.c2_${check}[1]`,
    )
  ),
  ...[27, 28, 29, 30, 31].map((line, index) =>
    text(`pdf_line${line}`, `${p2}.f2_${31 + index}[0]`)
  ),
];

const answer = (value: boolean | undefined): string | undefined =>
  value === undefined ? undefined : value ? "yes" : "no";

function ssnParts(value: string): readonly [string, string, string] {
  const digits = value.replaceAll("-", "");
  if (!/^\d{9}$/.test(digits)) {
    throw new Error("Form 8863 PDF needs a nine-digit SSN");
  }
  return [digits.slice(0, 3), digits.slice(3, 5), digits.slice(5)];
}

function institutionFields(item: F8863Item): Record<string, unknown> {
  const institutions = item.filing_details?.institutions;
  if (!institutions || institutions.length < 1 || institutions.length > 2) {
    throw new Error(
      "Form 8863 PDF supports one or two sourced institutions per student",
    );
  }
  const projected: Record<string, unknown> = {};
  for (const [index, institution] of institutions.entries()) {
    const us = institution.us_address;
    if (
      !us || us.line2 !== undefined ||
      institution.prior_year_1098t_received ||
      institution.name.length > 42 || us.line1.length > 42
    ) {
      throw new Error(
        "Form 8863 PDF needs a two-line U.S. institution address and unambiguous prior-year box 7 answer",
      );
    }
    const secondLine = `${us.city}, ${us.state} ${us.zip}`;
    if (secondLine.length > 42) {
      throw new Error(
        "Form 8863 PDF institution city, state, and ZIP exceed the printed address field",
      );
    }
    if (item.credit_type === "aoc" && !institution.ein) {
      throw new Error("Form 8863 PDF AOC institution needs an EIN");
    }
    const prefix = `pdf_institution_${index}`;
    projected[`${prefix}_name`] = institution.name;
    projected[`${prefix}_address`] = `${us.line1}\n${secondLine}`;
    projected[`${prefix}_current_1098t`] = answer(
      institution.current_year_1098t_received,
    );
    projected[`${prefix}_prior_box7`] = "no";
    if (institution.ein) {
      const digits = institution.ein.replaceAll("-", "");
      for (let digit = 0; digit < 9; digit++) {
        projected[`${prefix}_ein_${digit}`] = digits[digit];
      }
    }
  }
  return projected;
}

export const form8863Pdf: PdfFormDescriptor = {
  pendingKey: "f8863",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8863--2025.pdf",
  fields,
  filerFields: [
    text("nameLine1", `${p1}.f1_1[0]`),
    text("nameLine1", `${p2}.f2_1[0]`),
  ],
  pageIndices: (instance) => instance.pdf_first_student === true ? [0, 1] : [1],
  instances(raw, filer, allPending) {
    if (Object.keys(raw).length === 0) return [];
    const source = inputSchema.parse(raw);
    if (!nativeForm8863.build(source, { filer, pending: allPending })) return [];
    const lines = calculateForm8863Lines(source);
    if (!lines) return [];
    if (!filer) throw new Error("Form 8863 PDF needs filer identity");
    const [taxpayerA, taxpayerB, taxpayerC] = ssnParts(filer.primarySSN);
    const students = [
      ...lines.aocStudents.map((item) => ({ item, credit: "aoc" as const })),
      ...lines.llcStudents.map((item) => ({ item, credit: "llc" as const })),
    ];
    return students.map(({ item, credit }, index) => {
      if (!item.filing_details || !item.student_ssn) {
        throw new Error(
          "Form 8863 PDF needs structured student details and SSN",
        );
      }
      if (
        item.student_name.trim().toUpperCase() !==
          `${item.filing_details.first_name} ${item.filing_details.last_name}`
            .toUpperCase()
      ) {
        throw new Error(
          "Form 8863 PDF student name differs from structured filing identity",
        );
      }
      const [studentA, studentB, studentC] = ssnParts(item.student_ssn);
      const aoc = credit === "aoc"
        ? calculateAocStudentLines(item.aoc_adjusted_expenses ?? 0)
        : undefined;
      const ratio6 = lines.line6.toFixed(3).split(".");
      const ratio17 = lines.line17.toFixed(3).split(".");
      return {
        pdf_first_student: index === 0,
        pdf_return_ssn_a: taxpayerA,
        pdf_return_ssn_b: taxpayerB,
        pdf_return_ssn_c: taxpayerC,
        pdf_student_name:
          `${item.filing_details.first_name} ${item.filing_details.last_name}`,
        pdf_student_ssn_a: studentA,
        pdf_student_ssn_b: studentB,
        pdf_student_ssn_c: studentC,
        ...institutionFields(item),
        pdf_gate_23: answer(item.aoc_claimed_4_prior_years),
        pdf_gate_24: answer(item.enrolled_half_time),
        pdf_gate_25: answer(item.completed_4_years_postsec),
        pdf_gate_26: answer(item.felony_drug_conviction),
        ...(aoc
          ? {
            pdf_line27: aoc.line27,
            pdf_line28: aoc.line28,
            pdf_line29: aoc.line29,
            pdf_line30: aoc.line30,
          }
          : { pdf_line31: item.llc_adjusted_expenses }),
        ...(index === 0
          ? {
            ...(lines.aocStudents.length > 0
              ? {
                line1: lines.line1,
                line2: lines.line2,
                line3: lines.line3,
                line4: lines.line4,
                line5: lines.line5,
                pdf_line6_whole: ratio6[0],
                pdf_line6_fraction: ratio6[1],
                line7: lines.line7,
                line8: lines.line8,
                pdf_under24: lines.kiddieApplies,
              }
              : {}),
            line9: lines.line9,
            line10: lines.line10,
            ...(lines.llcStudents.length > 0
              ? {
                line11: lines.line11,
                line12: lines.line12,
                line13: lines.line13,
                line14: lines.line14,
                line15: lines.line15,
                line16: lines.line16,
                pdf_line17_whole: ratio17[0],
                pdf_line17_fraction: ratio17[1],
                line18: lines.line18,
              }
              : { line18: 0 }),
            line19: lines.line19,
          }
          : {}),
      };
    });
  },
};
