import { PDFDocument } from "pdf-lib";
import { z } from "zod";
import {
  redeterminationDisclosureSchema,
} from "../../../../../../nodes/intermediate/forms/credits/foreign/form_1116/index.ts";
import {
  buildScheduleCProjection,
  recomputeScheduleCAffectedYear,
  scheduleCFiledYearEvidenceSchema,
} from "./f1116_schedule_c.ts";
import { projectScheduleCPdfCandidate } from "../../../../../pdf/forms/credits/foreign/f1116/f1116_schedule_c_candidate.ts";

export enum ScheduleCDocumentRole {
  FiledForm1116 = "filed_form1116",
  FiledSchedule3 = "filed_schedule3",
  FiledForm1040 = "filed_form1040",
  PreparedForm1040X = "prepared_form1040x",
  ForeignRedetermination = "foreign_redetermination",
  RevisedCalculation = "revised_calculation",
  AffectedYearRecalculation = "affected_year_recalculation",
  LaterYearReview = "later_year_review",
}

const documentSchema = z.object({
  role: z.nativeEnum(ScheduleCDocumentRole),
  source_reference: z.string().trim().min(1),
  reviewed_subject_ssn: z.string().regex(/^\d{9}$/).optional(),
  foreign_tax_owner_reference: z.string().trim().min(1).optional(),
  bytes: z.instanceof(Uint8Array).refine((bytes) => bytes.length > 0),
  reviewed_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  reviewed_by: z.string().trim().min(1),
}).strict();

const amendedLineSchema = z.object({
  column_a: z.number().int().nonnegative(),
  column_b: z.number().int(),
  column_c: z.number().int().nonnegative(),
}).strict();

const preparedAmendmentSchema = z.object({
  tax_year: z.union([z.literal(2023), z.literal(2024)]),
  prepared_form1040x_document_reference: z.string().trim().min(1),
  part_ii_explanation: z.string().trim().min(1),
  line6_tax: amendedLineSchema,
  line7_nonrefundable_credits: amendedLineSchema,
  line8_tax_after_credits: amendedLineSchema,
  line10_other_taxes: amendedLineSchema,
  line11_total_tax: amendedLineSchema,
}).strict();

type PreparedAmendment = z.infer<typeof preparedAmendmentSchema>;

const form1040xFieldPrefix = "topmostSubform[0].Page1[0].";
const form1040xPart2FieldPrefix = "topmostSubform[0].Page2[0].";
const preparedAmendmentPdfFields = {
  line6_tax: ["f1_37[0]", "f1_38[0]", "f1_39[0]"],
  line7_nonrefundable_credits: ["f1_40[0]", "f1_41[0]", "f1_42[0]"],
  line8_tax_after_credits: ["f1_43[0]", "f1_44[0]", "f1_45[0]"],
  line10_other_taxes: ["f1_49[0]", "f1_50[0]", "f1_51[0]"],
  line11_total_tax: ["f1_52[0]", "f1_53[0]", "f1_54[0]"],
} as const;

function verifyPreparedForm1040XPdf(
  pdf: PDFDocument,
  amendment: PreparedAmendment,
  filerSSN: string,
): void {
  if (pdf.getPageCount() !== 2) {
    throw new Error(
      "Form 1116 Schedule C prepared Form 1040-X needs both official form pages",
    );
  }
  const form = pdf.getForm();
  const read = (fieldName: string, page: 1 | 2 = 1): string => {
    try {
      const prefix = page === 1
        ? form1040xFieldPrefix
        : form1040xPart2FieldPrefix;
      return form.getTextField(`${prefix}${fieldName}`).getText()
        ?.trim() ?? "";
    } catch {
      throw new Error(
        `Form 1116 Schedule C prepared Form 1040-X PDF lacks ${fieldName}`,
      );
    }
  };
  if (
    read("f1_01[0]") !== String(amendment.tax_year) ||
    read("f1_05[0]").replaceAll("-", "") !== filerSSN
  ) {
    throw new Error(
      "Form 1116 Schedule C prepared Form 1040-X PDF year or taxpayer differs from the reviewed amendment",
    );
  }
  if (
    read("f2_35[0]", 2) !== amendment.part_ii_explanation
  ) {
    throw new Error(
      "Form 1116 Schedule C prepared Form 1040-X Part II explanation differs from the reviewed amendment",
    );
  }
  for (
    const lineName of Object.keys(preparedAmendmentPdfFields) as Array<
      keyof typeof preparedAmendmentPdfFields
    >
  ) {
    const expected = amendment[lineName];
    const fieldNames = preparedAmendmentPdfFields[lineName];
    for (
      const [index, column] of ([
        "column_a",
        "column_b",
        "column_c",
      ] as const).entries()
    ) {
      const fieldName = fieldNames[index];
      if (!fieldName) {
        throw new Error(
          `Form 1116 Schedule C prepared Form 1040-X PDF lacks ${lineName} ${column}`,
        );
      }
      const text = read(fieldName);
      if (!/^-?(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(text)) {
        throw new Error(
          `Form 1116 Schedule C prepared Form 1040-X PDF ${lineName} ${column} needs a whole-dollar amount`,
        );
      }
      if (Number(text.replaceAll(",", "")) !== expected[column]) {
        throw new Error(
          `Form 1116 Schedule C prepared Form 1040-X PDF ${lineName} ${column} differs from the reviewed amendment`,
        );
      }
    }
  }
}

export const scheduleCDocumentIntakeSchema = z.object({
  ledger: redeterminationDisclosureSchema,
  filed_year_evidence: scheduleCFiledYearEvidenceSchema,
  prepared_amendment: preparedAmendmentSchema.optional(),
  documents: z.array(documentSchema).min(7),
}).strict().superRefine((input, ctx) => {
  const identities = input.documents.map((document) =>
    `${document.role}:${document.source_reference}`
  );
  if (new Set(identities).size !== identities.length) {
    ctx.addIssue({
      code: "custom",
      path: ["documents"],
      message:
        "Form 1116 Schedule C reviewed PDFs need distinct roles and source references",
    });
  }
});

export type ScheduleCDocumentIntake = z.infer<
  typeof scheduleCDocumentIntakeSchema
>;

export interface ScheduleCDocumentManifest {
  readonly role: ScheduleCDocumentRole;
  readonly source_reference: string;
  readonly reviewed_subject_ssn?: string;
  readonly foreign_tax_owner_reference?: string;
  readonly sha256: string;
  readonly reviewed_by: string;
  readonly page_count: number;
}

export interface ScheduleCReviewedCandidate {
  readonly filer_ssn: string;
  readonly documents: readonly ScheduleCDocumentManifest[];
  readonly relation_back_tax_year: number;
  readonly filed_us_tax_liability: number;
  readonly redetermined_us_tax_liability: number;
  readonly amended_return_required: boolean;
  readonly affected_year_amendment_status:
    | "required_unverified"
    | "not_required";
  readonly prepared_amendment_reviewed: boolean;
  readonly relation_back_year_unused_foreign_tax_before: 0;
  readonly relation_back_year_unused_foreign_tax_after: 0;
  readonly native_xml_candidate: string;
  readonly pdf_fields_candidate: Readonly<Record<string, unknown>>;
  readonly export_ready: false;
}

function requiredReferences(input: ScheduleCDocumentIntake) {
  const { ledger, filed_year_evidence: evidence } = input;
  if (ledger.payor_events.length > 3 || ledger.affected_years.length !== 1) {
    throw new Error(
      "Form 1116 Schedule C document intake supports up to three payors and one affected year only",
    );
  }
  const references: ReadonlyArray<readonly [ScheduleCDocumentRole, string]> = [
    [
      ScheduleCDocumentRole.FiledForm1116,
      evidence.filed_form1116.filed_document_reference,
    ],
    [
      ScheduleCDocumentRole.FiledSchedule3,
      evidence.filed_schedule3.filed_document_reference,
    ],
    [
      ScheduleCDocumentRole.FiledForm1040,
      evidence.filed_form1040.filed_document_reference,
    ],
    ...(input.prepared_amendment
      ? [
        [
          ScheduleCDocumentRole.PreparedForm1040X,
          input.prepared_amendment.prepared_form1040x_document_reference,
        ] as const,
      ]
      : []),
    ...ledger.payor_events.flatMap((payor) =>
      payor.source_document_references.map((reference) =>
        [ScheduleCDocumentRole.ForeignRedetermination, reference] as const
      )
    ),
    [
      ScheduleCDocumentRole.RevisedCalculation,
      ledger.redetermined_form1116.calculation_document_reference,
    ],
    [
      ScheduleCDocumentRole.AffectedYearRecalculation,
      ledger.affected_years[0].recalculation_document_reference,
    ],
    [
      ScheduleCDocumentRole.LaterYearReview,
      evidence.later_year_review_document_reference,
    ],
  ];
  return references;
}

function verifyPreparedAmendment(input: ScheduleCDocumentIntake): void {
  const {
    ledger,
    filed_year_evidence: evidence,
    prepared_amendment: amendment,
  } = input;
  const affected = ledger.affected_years[0];
  const changed = affected.redetermined_us_tax_liability_usd !==
    affected.us_tax_liability_on_filed_return_usd;
  if (changed !== !!amendment) {
    throw new Error(
      "Form 1116 Schedule C changed affected-year liability needs a reviewed prepared Form 1040-X; unchanged liability must not include one",
    );
  }
  if (!amendment) return;
  if (amendment.tax_year !== ledger.relation_back_tax_year) {
    throw new Error(
      "Form 1116 Schedule C prepared Form 1040-X tax year differs from the affected year",
    );
  }
  if (
    !amendment.part_ii_explanation.includes(String(amendment.tax_year)) ||
    !/\bforeign tax redetermination\b/i.test(
      amendment.part_ii_explanation,
    ) ||
    !/\bForm 1116\b/i.test(amendment.part_ii_explanation)
  ) {
    throw new Error(
      "Form 1116 Schedule C prepared Form 1040-X Part II must explain the affected-year foreign tax redetermination",
    );
  }
  const u = evidence.filed_form1040;
  const revised = evidence.revised_form1040;
  const expected = [
    ["line6_tax", u.line18_tax_before_credits, u.line18_tax_before_credits],
    [
      "line7_nonrefundable_credits",
      u.line21_nonrefundable_credits,
      revised.line21_nonrefundable_credits,
    ],
    [
      "line8_tax_after_credits",
      u.line22_tax_after_credits,
      revised.line22_tax_after_credits,
    ],
    ["line10_other_taxes", u.line23_other_taxes, u.line23_other_taxes],
    ["line11_total_tax", u.line24_total_tax, revised.line24_total_tax],
  ] as const;
  for (const [name, filed, corrected] of expected) {
    const line = amendment[name];
    if (
      line.column_a !== filed || line.column_c !== corrected ||
      line.column_b !== corrected - filed
    ) {
      throw new Error(
        `Form 1116 Schedule C prepared Form 1040-X ${name} disagrees with the affected-year return reconciliation`,
      );
    }
  }
  for (const column of ["column_a", "column_c"] as const) {
    if (
      amendment.line8_tax_after_credits[column] !==
        Math.max(
          0,
          amendment.line6_tax[column] -
            amendment.line7_nonrefundable_credits[column],
        ) ||
      amendment.line11_total_tax[column] !==
        amendment.line8_tax_after_credits[column] +
          amendment.line10_other_taxes[column]
    ) {
      throw new Error(
        "Form 1116 Schedule C prepared Form 1040-X tax lines do not add up",
      );
    }
  }
}

function verifyCrossReferences(
  input: ScheduleCDocumentIntake,
  filerSSN: string,
): void {
  const { ledger, filed_year_evidence: evidence } = input;
  if (
    ledger.filed_form1116.source_document_reference !==
      evidence.filed_form1116.filed_document_reference ||
    ledger.affected_years[0].filed_return_document_reference !==
      evidence.filed_form1040.filed_document_reference
  ) {
    throw new Error(
      "Form 1116 Schedule C filed document references disagree with reviewed extracted lines",
    );
  }
  const expected = requiredReferences(input);
  if (input.documents.length !== expected.length) {
    throw new Error(
      "Form 1116 Schedule C needs one reviewed PDF for every filed, revised, and payor source reference",
    );
  }
  const expectedKeys = new Set(
    expected.map(([role, reference]) => `${role}:${reference}`),
  );
  if (expectedKeys.size !== expected.length) {
    throw new Error(
      "Form 1116 Schedule C source references must identify distinct reviewed PDFs",
    );
  }
  for (const document of input.documents) {
    if (!expectedKeys.has(`${document.role}:${document.source_reference}`)) {
      throw new Error(
        `Form 1116 Schedule C ${document.role} PDF does not match its reviewed source reference`,
      );
    }
    if (document.role === ScheduleCDocumentRole.ForeignRedetermination) {
      if (
        !document.foreign_tax_owner_reference ||
        (document.reviewed_subject_ssn !== undefined &&
          document.reviewed_subject_ssn !== filerSSN)
      ) {
        throw new Error(
          "Form 1116 Schedule C foreign record needs a reviewed taxpayer ownership link",
        );
      }
    } else if (
      document.reviewed_subject_ssn !== filerSSN ||
      document.foreign_tax_owner_reference !== undefined
    ) {
      throw new Error(
        "Form 1116 Schedule C filed return or workpaper owner differs from the current filer",
      );
    }
  }
}

async function documentManifest(
  document: ScheduleCDocumentIntake["documents"][number],
  amendment: PreparedAmendment | undefined,
  filerSSN: string,
): Promise<ScheduleCDocumentManifest> {
  const digest = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      document.bytes,
    ),
  );
  const sha256 = Array.from(
    digest,
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  if (sha256 !== document.reviewed_sha256) {
    throw new Error(
      `Form 1116 Schedule C ${document.role} PDF bytes differ from the reviewed SHA-256`,
    );
  }
  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(document.bytes);
  } catch {
    throw new Error(
      `Form 1116 Schedule C ${document.role} source must be a readable PDF`,
    );
  }
  if (pdf.getPageCount() === 0) {
    throw new Error(
      `Form 1116 Schedule C ${document.role} source needs a PDF page`,
    );
  }
  if (document.role === ScheduleCDocumentRole.PreparedForm1040X) {
    if (!amendment) {
      throw new Error(
        "Form 1116 Schedule C prepared Form 1040-X PDF has no reviewed amendment",
      );
    }
    verifyPreparedForm1040XPdf(pdf, amendment, filerSSN);
  }
  return {
    role: document.role,
    source_reference: document.source_reference,
    reviewed_subject_ssn: document.reviewed_subject_ssn,
    foreign_tax_owner_reference: document.foreign_tax_owner_reference,
    sha256,
    reviewed_by: document.reviewed_by,
    page_count: pdf.getPageCount(),
  };
}

/**
 * Bind reviewed line transcriptions to the exact PDFs reviewed. This does not
 * extract tax fields or authorize filing; the Form 1116 export guard remains.
 */
export async function reviewScheduleCDocuments(
  raw: ScheduleCDocumentIntake,
  currentFilerSSN: string,
): Promise<ScheduleCReviewedCandidate> {
  const input = scheduleCDocumentIntakeSchema.parse(raw);
  const filerSSN = currentFilerSSN.replaceAll("-", "");
  if (!/^\d{9}$/.test(filerSSN)) {
    throw new Error(
      "Form 1116 Schedule C review needs the current filer's SSN",
    );
  }
  verifyPreparedAmendment(input);
  verifyCrossReferences(input, filerSSN);
  const nativeXmlCandidate = buildScheduleCProjection(
    input.ledger,
    input.filed_year_evidence,
  );
  const recomputed = recomputeScheduleCAffectedYear(
    input.ledger,
    input.filed_year_evidence,
  );
  const documents = await Promise.all(
    input.documents.map((document) =>
      documentManifest(document, input.prepared_amendment, filerSSN)
    ),
  );
  const affected = input.ledger.affected_years[0];
  const amendedReturnRequired = affected.redetermined_us_tax_liability_usd !==
    affected.us_tax_liability_on_filed_return_usd;
  return {
    filer_ssn: filerSSN,
    documents,
    relation_back_tax_year: input.ledger.relation_back_tax_year,
    filed_us_tax_liability: affected.us_tax_liability_on_filed_return_usd,
    redetermined_us_tax_liability: affected.redetermined_us_tax_liability_usd,
    amended_return_required: amendedReturnRequired,
    affected_year_amendment_status: amendedReturnRequired
      ? "required_unverified"
      : "not_required",
    prepared_amendment_reviewed: !!input.prepared_amendment,
    relation_back_year_unused_foreign_tax_before:
      recomputed.filedUnusedForeignTax,
    relation_back_year_unused_foreign_tax_after:
      recomputed.revisedUnusedForeignTax,
    native_xml_candidate: nativeXmlCandidate,
    pdf_fields_candidate: {
      ...projectScheduleCPdfCandidate(
        input.ledger,
        input.filed_year_evidence,
      ),
      reviewed_filer_ssn: filerSSN,
    },
    export_ready: false,
  };
}
