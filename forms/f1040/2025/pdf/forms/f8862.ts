import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { inputSchema } from "../../../nodes/inputs/f8862/index.ts";
import { form8862 as nativeForm8862 } from "../../mef/forms/f8862.ts";

// Dec. 2025 three-page AcroForm. The IRS prints four CTC/ODC rows and three
// AOTC rows; larger claims require a separate statement, not silent truncation.
const p1 = "topmostSubform[0].Page1[0]";
const p2 = "topmostSubform[0].Page2[0]";
const p3 = "topmostSubform[0].Page3[0]";
const text = (domainKey: string, pdfField: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField,
});
const check = (domainKey: string, pdfField: string): PdfFieldEntry => ({
  kind: "checkbox",
  domainKey,
  pdfField,
});
const answer = (
  domainKey: string,
  page: string,
  number: number,
): PdfFieldEntry[] => [
  {
    kind: "checkboxWhen",
    domainKey,
    pdfField: `${page}.c${page === p1 ? 1 : page === p2 ? 2 : 3}_${number}[0]`,
    whenValue: "yes",
  },
  {
    kind: "checkboxWhen",
    domainKey,
    pdfField: `${page}.c${page === p1 ? 1 : page === p2 ? 2 : 3}_${number}[1]`,
    whenValue: "no",
  },
];

export const form8862Pdf: PdfFormDescriptor = {
  pendingKey: "f8862",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8862--2025.pdf",
  pageIndices: () => [0, 1, 2],
  filerFields: [
    text("nameLine1", `${p1}.f1_01[0]`),
    text("primarySSN", `${p1}.f1_02[0]`),
  ],
  fields: [
    text("tax_year", `${p1}.Line1_CombField[0].f1_03[0]`),
    check("claim_eitc", `${p1}.Checkbox1_ReadOrder[0].c1_1[0]`),
    check("claim_ctc", `${p1}.Checkbox2_ReadOrder[0].c1_2[0]`),
    check("claim_aotc", `${p1}.Checkbox3_ReadOrder[0].c1_3[0]`),
    ...answer("eitc_income_reporting_only", p1, 4),
    ...answer("eitc_qualifying_child_of_other", p1, 5),
    ...[0, 1, 2].map((i) =>
      text(`eitc_child_${i}_name`, `${p1}.f1_0${i + 4}[0]`)
    ),
    ...answer("eitc_has_child", p1, 6),
    ...[0, 1, 2].map((i) =>
      text(
        `eitc_child_${i}_days`,
        `${p1}.Child${i + 1}_CombField[0].f1_0${i + 7}[0]`,
      )
    ),
    ...[0, 1, 2].flatMap((i) => [
      text(
        `eitc_child_${i}_birth_month`,
        `${p1}.Child${i + 1}_Birth_Ln8[0].f1_${10 + 4 * i}[0]`,
      ),
      text(
        `eitc_child_${i}_birth_day`,
        `${p1}.Child${i + 1}_Birth_Ln8[0].f1_${11 + 4 * i}[0]`,
      ),
      text(
        `eitc_child_${i}_death_month`,
        `${p1}.Child${i + 1}_Death_Ln8[0].f1_${12 + 4 * i}[0]`,
      ),
      text(
        `eitc_child_${i}_death_day`,
        `${p1}.Child${i + 1}_Death_Ln8[0].f1_${13 + 4 * i}[0]`,
      ),
    ]),
    text("primary_home_days", `${p2}.Ln9a_CombField[0].f2_01[0]`),
    text("spouse_home_days", `${p2}.Ln9b_CombField[0].f2_02[0]`),
    text("primary_age", `${p2}.f2_03[0]`),
    text("spouse_age", `${p2}.f2_04[0]`),
    ...answer("primary_dependent", p2, 1),
    ...answer("spouse_dependent", p2, 2),
    ...[0, 1, 2, 3].map((i) =>
      text(
        `ctc_child_${i}_name`,
        `${p2}.f2_${String(i + 5).padStart(2, "0")}[0]`,
      )
    ),
    ...[0, 1, 2, 3].map((i) =>
      text(`odc_${i}_name`, `${p2}.f2_${String(i + 9).padStart(2, "0")}[0]`)
    ),
    ...[0, 1, 2, 3].flatMap((i) => [
      ...answer(`ctc_child_${i}_home`, p2, 3 + i),
      ...answer(`ctc_child_${i}_eligible`, p2, 7 + i),
      ...answer(`ctc_child_${i}_dependent`, p2, 11 + i),
      ...answer(`ctc_child_${i}_citizen`, p2, 19 + i),
      ...answer(`odc_${i}_dependent`, p2, 15 + i),
      ...answer(`odc_${i}_citizen`, p2, 23 + i),
    ]),
    ...[0, 1, 2].map((i) =>
      text(`aotc_student_${i}_name`, `${p3}.f3_0${i + 1}[0]`)
    ),
    ...[0, 1, 2].flatMap((i) => [
      ...answer(`aotc_student_${i}_eligible`, p3, 1 + i),
      ...answer(`aotc_student_${i}_four_years`, p3, 4 + i),
    ]),
  ],
  instances(raw, filer, allPending) {
    if (Object.keys(raw).length === 0) return [];
    const source = inputSchema.parse(raw);
    if (!filer || !allPending?.f1040) {
      throw new Error(
        "Form 8862 PDF needs filer identity and finalized Form 1040 credit lines",
      );
    }
    if (!nativeForm8862.build(source, { pending: allPending })) return [];
    if (
      (source.ctc_children?.length ?? 0) > 4 ||
      (source.other_dependents?.length ?? 0) > 4 ||
      (source.aotc_students?.length ?? 0) > 3
    ) {
      throw new Error(
        "Form 8862 PDF needs an additional statement for overflow CTC, ODC, or AOTC rows",
      );
    }
    const projected: Record<string, unknown> = {
      tax_year: 2025,
      claim_eitc: source.claim_eitc,
      claim_ctc: source.claim_ctc,
      claim_aotc: source.claim_aotc,
      eitc_income_reporting_only: yesNo(source.eitc_income_reporting_only),
      eitc_qualifying_child_of_other: yesNo(
        source.eitc_qualifying_child_of_other,
      ),
      eitc_has_child:
        source.claim_eitc && source.eitc_income_reporting_only === false
          ? yesNo((source.eitc_children?.length ?? 0) > 0)
          : undefined,
      primary_home_days: source.eitc_without_child?.primary.main_home_us_days,
      spouse_home_days: source.eitc_without_child?.spouse?.main_home_us_days,
      primary_age: source.eitc_without_child?.primary.age,
      spouse_age: source.eitc_without_child?.spouse?.age,
      primary_dependent: yesNo(
        source.eitc_without_child?.primary.claimed_as_dependent,
      ),
      spouse_dependent: yesNo(
        source.eitc_without_child?.spouse?.claimed_as_dependent,
      ),
    };
    source.eitc_children?.forEach((child, i) => {
      projected[`eitc_child_${i}_name`] =
        `${child.first_name} ${child.last_name}`;
      projected[`eitc_child_${i}_days`] = child.days_in_us;
      for (
        const [kind, value] of [["birth", child.birth_month_day], [
          "death",
          child.death_month_day,
        ]] as const
      ) {
        if (!value) continue;
        projected[`eitc_child_${i}_${kind}_month`] = value.slice(2, 4);
        projected[`eitc_child_${i}_${kind}_day`] = value.slice(5, 7);
      }
    });
    source.ctc_children?.forEach((child, i) => {
      projected[`ctc_child_${i}_name`] =
        `${child.first_name} ${child.last_name}`;
      projected[`ctc_child_${i}_home`] = yesNo(child.lived_with_over_half_year);
      projected[`ctc_child_${i}_eligible`] = yesNo(child.qualifying_child);
      projected[`ctc_child_${i}_dependent`] = yesNo(child.dependent);
      projected[`ctc_child_${i}_citizen`] = yesNo(
        child.us_citizen_national_or_resident,
      );
    });
    source.other_dependents?.forEach((person, i) => {
      projected[`odc_${i}_name`] = `${person.first_name} ${person.last_name}`;
      projected[`odc_${i}_dependent`] = yesNo(person.dependent);
      projected[`odc_${i}_citizen`] = yesNo(
        person.us_citizen_national_or_resident,
      );
    });
    source.aotc_students?.forEach((student, i) => {
      projected[`aotc_student_${i}_name`] =
        `${student.first_name} ${student.last_name}`;
      projected[`aotc_student_${i}_eligible`] = yesNo(student.eligible);
      projected[`aotc_student_${i}_four_years`] = yesNo(
        student.credit_claimed_four_prior_years,
      );
    });
    return [projected];
  },
};

function yesNo(value: boolean | undefined): string | undefined {
  return value === undefined ? undefined : value ? "yes" : "no";
}
