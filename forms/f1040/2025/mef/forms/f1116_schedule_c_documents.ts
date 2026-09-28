import { PDFDocument } from "pdf-lib";
import { z } from "zod";
import {
  redeterminationDisclosureSchema,
} from "../../../nodes/intermediate/forms/form_1116/index.ts";
import {
  buildScheduleCProjection,
  recomputeScheduleCAffectedYear,
  scheduleCFiledYearEvidenceSchema,
} from "./f1116_schedule_c.ts";
import { projectScheduleCPdfCandidate } from "../../pdf/forms/f1116_schedule_c_candidate.ts";

export enum ScheduleCDocumentRole {
  FiledForm1116 = "filed_form1116",
  FiledSchedule3 = "filed_schedule3",
  FiledForm1040 = "filed_form1040",
  ForeignRedetermination = "foreign_redetermination",
  RevisedCalculation = "revised_calculation",
  AffectedYearRecalculation = "affected_year_recalculation",
  LaterYearReview = "later_year_review",
}

const documentSchema = z.object({
  role: z.nativeEnum(ScheduleCDocumentRole),
  source_reference: z.string().trim().min(1),
  bytes: z.instanceof(Uint8Array).refine((bytes) => bytes.length > 0),
  reviewed_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  reviewed_by: z.string().trim().min(1),
}).strict();

export const scheduleCDocumentIntakeSchema = z.object({
  ledger: redeterminationDisclosureSchema,
  filed_year_evidence: scheduleCFiledYearEvidenceSchema,
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
  readonly sha256: string;
  readonly reviewed_by: string;
  readonly page_count: number;
}

export interface ScheduleCReviewedCandidate {
  readonly documents: readonly ScheduleCDocumentManifest[];
  readonly relation_back_tax_year: number;
  readonly filed_us_tax_liability: number;
  readonly redetermined_us_tax_liability: number;
  readonly amended_return_required: boolean;
  readonly affected_year_amendment_status:
    | "required_unverified"
    | "not_required";
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

function verifyCrossReferences(input: ScheduleCDocumentIntake): void {
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
  }
}

async function documentManifest(
  document: ScheduleCDocumentIntake["documents"][number],
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
  return {
    role: document.role,
    source_reference: document.source_reference,
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
): Promise<ScheduleCReviewedCandidate> {
  const input = scheduleCDocumentIntakeSchema.parse(raw);
  verifyCrossReferences(input);
  const nativeXmlCandidate = buildScheduleCProjection(
    input.ledger,
    input.filed_year_evidence,
  );
  const recomputed = recomputeScheduleCAffectedYear(
    input.ledger,
    input.filed_year_evidence,
  );
  const documents = await Promise.all(input.documents.map(documentManifest));
  const affected = input.ledger.affected_years[0];
  const amendedReturnRequired = affected.redetermined_us_tax_liability_usd !==
    affected.us_tax_liability_on_filed_return_usd;
  return {
    documents,
    relation_back_tax_year: input.ledger.relation_back_tax_year,
    filed_us_tax_liability: affected.us_tax_liability_on_filed_return_usd,
    redetermined_us_tax_liability: affected.redetermined_us_tax_liability_usd,
    amended_return_required: amendedReturnRequired,
    affected_year_amendment_status: amendedReturnRequired
      ? "required_unverified"
      : "not_required",
    relation_back_year_unused_foreign_tax_before:
      recomputed.filedUnusedForeignTax,
    relation_back_year_unused_foreign_tax_after:
      recomputed.revisedUnusedForeignTax,
    native_xml_candidate: nativeXmlCandidate,
    pdf_fields_candidate: projectScheduleCPdfCandidate(
      input.ledger,
      input.filed_year_evidence,
    ),
    export_ready: false,
  };
}
