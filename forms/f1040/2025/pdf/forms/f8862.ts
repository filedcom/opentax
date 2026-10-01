import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  type F8862Input,
  inputSchema,
} from "../../../nodes/inputs/f8862/index.ts";
import { form8862 as nativeForm8862 } from "../../mef/forms/f8862.ts";
import { StandardFonts } from "pdf-lib";

// Dec. 2025 three-page AcroForm. The IRS prints four CTC/ODC rows and three
// AOTC rows; larger claims get numbered continuation pages.
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

interface OverflowRow {
  readonly heading: string;
  readonly answers: string;
}

export function form8862OverflowRows(source: F8862Input): OverflowRow[] {
  const rows: OverflowRow[] = [];
  source.ctc_children?.slice(4).forEach((child, i) => {
    rows.push({
      heading: `12. Child ${i + 5}: ${child.first_name} ${child.last_name}`,
      answers:
        `14 lived with filer: ${yesNo(child.lived_with_over_half_year)}; ` +
        `15 qualifying child: ${yesNo(child.qualifying_child)}; ` +
        `16 dependent: ${yesNo(child.dependent)}; ` +
        `17 US citizen/national/resident: ${
          yesNo(child.us_citizen_national_or_resident)
        }`,
    });
  });
  source.other_dependents?.slice(4).forEach((person, i) => {
    rows.push({
      heading: `13. Other dependent ${
        i + 5
      }: ${person.first_name} ${person.last_name}`,
      answers: `16 dependent: ${yesNo(person.dependent)}; ` +
        `17 US citizen/national/resident: ${
          yesNo(person.us_citizen_national_or_resident)
        }`,
    });
  });
  source.aotc_students?.slice(3).forEach((student, i) => {
    rows.push({
      heading: `18. Student ${
        i + 4
      }: ${student.first_name} ${student.last_name}`,
      answers: `19a eligible student: ${yesNo(student.eligible)}; ` +
        `19b credit claimed four prior years: ${
          yesNo(student.credit_claimed_four_prior_years)
        }`,
    });
  });
  return rows;
}

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
    if (!nativeForm8862.build(source, { pending: allPending, filer })) {
      return [];
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
      print_overflow_rows: form8862OverflowRows(source),
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
  async appendSupplementalPages(document, fields, filer) {
    const rows = fields.print_overflow_rows as OverflowRow[] | undefined;
    if (!rows?.length) return;
    if (!filer) {
      throw new Error("Form 8862 continuation needs filer identity");
    }
    const regular = await document.embedFont(StandardFonts.Helvetica);
    const bold = await document.embedFont(StandardFonts.HelveticaBold);
    let page = document.addPage([612, 792]);
    let y = 744;
    const newPage = () => {
      page = document.addPage([612, 792]);
      y = 744;
    };
    const header = () => {
      page.drawText("Form 8862 (2025) - continuation of Parts III and IV", {
        x: 40,
        y,
        size: 13,
        font: bold,
      });
      y -= 24;
      page.drawText(`Filer: ${filer.nameLine1}    SSN: ${filer.primarySSN}`, {
        x: 40,
        y,
        size: 10,
        font: regular,
      });
      y -= 32;
    };
    header();
    for (const row of rows) {
      if (y < 85) {
        newPage();
        header();
      }
      page.drawText(row.heading, { x: 40, y, size: 10, font: bold });
      y -= 16;
      const answerParts = row.answers.split("; ");
      for (let i = 0; i < answerParts.length; i += 2) {
        page.drawText(answerParts.slice(i, i + 2).join("; "), {
          x: 52,
          y,
          size: 9,
          font: regular,
        });
        y -= 14;
      }
      y -= 12;
    }
  },
};

function yesNo(value: boolean | undefined): string | undefined {
  return value === undefined ? undefined : value ? "yes" : "no";
}
