import type { PdfFieldEntry, PdfFormDescriptor } from "../../../review-support/form-descriptor.ts";
import {
  calculateForm2441,
  filingDetailsSchema,
} from "../../../../../nodes/intermediate/forms/credits/individual/form2441/calculation.ts";

const page = "topmostSubform[0].Page1[0].";
const text = (key: string, number: number, section = ""): PdfFieldEntry => ({
  kind: "text",
  domainKey: key,
  pdfField: `${page}${section}f1_${number}[0]`,
});
const check = (
  key: string,
  number: number,
  value: string,
  section = "",
): PdfFieldEntry => ({
  kind: "checkboxWhen",
  domainKey: key,
  pdfField: `${page}${section}c1_${number}[${value === "true" ? 0 : 1}]`,
  whenValue: value,
});

const fields: PdfFieldEntry[] = [
  check("mfs_eligible", 1, "true"),
  check("student_or_disabled", 2, "true"),
  ...[0, 1, 2].flatMap((index) => {
    const row = `PartITable[0].BodyRow${index + 1}[0].`;
    return [
      text(`provider_${index}_name`, 3 + index * 4, row),
      text(`provider_${index}_address`, 4 + index * 4, `${row}ColB[0].`),
      text(`provider_${index}_tin`, 5 + index * 4, row),
      check(`provider_${index}_household`, 4 + index, "true", `${row}ColD[0].`),
      check(
        `provider_${index}_household`,
        4 + index,
        "false",
        `${row}ColD[0].`,
      ),
      text(`provider_${index}_paid`, 6 + index * 4, row),
    ];
  }),
  ...[0, 1, 2].flatMap((index) => {
    const row = `Table_Line2[0].Row${index + 1}[0].`;
    return [
      text(`person_${index}_first`, 15 + index * 4, row),
      text(`person_${index}_last`, 16 + index * 4, row),
      text(`person_${index}_ssn`, 17 + index * 4, row),
      check(`person_${index}_disabled`, 8 + index, "true", row),
      text(`person_${index}_expenses`, 18 + index * 4, row),
    ];
  }),
  ...[
    "line3",
    "line4",
    "line5",
    "line6",
    "line7",
    "line8_rate",
    "line9a",
    "line9b",
    "line9c",
    "line10",
    "line11",
  ].map(
    (key, index) => ({ ...text(key, 27 + index), printZero: key === "line9b" }),
  ),
];

/** The supported no-benefit route prints the filing page and its source rows. */
export const form2441Pdf: PdfFormDescriptor = {
  pendingKey: "form2441",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f2441--2025.pdf",
  pageIndices: () => [0],
  fields,
  filerFields: [
    text("nameLine1", 1),
    text("primarySSN", 2),
  ],
  projectFields(raw, allPending) {
    if (Object.keys(raw).length === 0) return {};
    const details = filingDetailsSchema.parse(raw.filing_details);
    if (
      details.care_providers.length > 3 || details.qualifying_people.length > 3
    ) {
      throw new Error("Form 2441 PDF needs a provider or person statement");
    }
    if ((raw.dep_care_benefits ?? 0) !== 0) {
      throw new Error("Form 2441 PDF dependent-care benefits need Part III");
    }
    const agi = allPending.f1040?.line11_agi;
    if (typeof agi !== "number" || (raw.agi !== undefined && raw.agi !== agi)) {
      throw new Error("Form 2441 PDF needs final Form 1040 AGI");
    }
    const lines = calculateForm2441(details, agi, 0);
    if (allPending.schedule3?.line2_childcare_credit !== lines.line11) {
      throw new Error("Form 2441 PDF credit differs from Schedule 3 line 2");
    }
    const projected: Record<string, unknown> = {
      mfs_eligible: details.mfs_eligibility_met === true,
      student_or_disabled:
        details.student_or_disabled_deemed_income_used === true,
      line3: lines.line3,
      line4: lines.line4,
      line5: lines.line5,
      line6: lines.line6,
      line7: lines.line7,
      line8_rate: String(Math.round(lines.line8 * 100)),
      line9a: lines.line9a,
      line9b: 0,
      line9c: lines.line9a,
      line10: lines.line10,
      line11: lines.line11,
    };
    details.care_providers.forEach((provider, index) => {
      projected[`provider_${index}_name`] = provider.kind === "business"
        ? provider.name
        : `${provider.first_name} ${provider.last_name}`;
      const address = provider.us_address;
      projected[`provider_${index}_address`] = [
        address.line1,
        address.line2,
        `${address.city}, ${address.state} ${address.zip}`,
      ].filter(Boolean).join(", ");
      projected[`provider_${index}_tin`] = provider.kind === "business"
        ? provider.ein
        : provider.ssn;
      projected[`provider_${index}_household`] = provider.household_employee;
      projected[`provider_${index}_paid`] = provider.amount_paid;
    });
    details.qualifying_people.forEach((person, index) => {
      projected[`person_${index}_first`] = person.first_name;
      projected[`person_${index}_last`] = person.last_name;
      projected[`person_${index}_ssn`] = person.ssn;
      projected[`person_${index}_disabled`] =
        person.over_12_and_disabled === true;
      projected[`person_${index}_expenses`] = person.credit_expenses_paid;
    });
    return projected;
  },
  includeWhen: (fields) =>
    typeof fields.line11 === "number" && fields.line11 > 0,
};
