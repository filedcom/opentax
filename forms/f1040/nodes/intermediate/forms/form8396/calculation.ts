import { z } from "zod";

const wholeDollars = z.number().finite().int().nonnegative();
export enum QualifiedHomeState {
  AL = "AL",
  AK = "AK",
  AS = "AS",
  AZ = "AZ",
  AR = "AR",
  CA = "CA",
  CO = "CO",
  MP = "MP",
  CT = "CT",
  DE = "DE",
  DC = "DC",
  FM = "FM",
  FL = "FL",
  GA = "GA",
  GU = "GU",
  HI = "HI",
  ID = "ID",
  IL = "IL",
  IN = "IN",
  IA = "IA",
  KS = "KS",
  KY = "KY",
  LA = "LA",
  ME = "ME",
  MH = "MH",
  MD = "MD",
  MA = "MA",
  MI = "MI",
  MN = "MN",
  MS = "MS",
  MO = "MO",
  MT = "MT",
  NE = "NE",
  NV = "NV",
  NH = "NH",
  NJ = "NJ",
  NM = "NM",
  NY = "NY",
  NC = "NC",
  ND = "ND",
  OH = "OH",
  OK = "OK",
  OR = "OR",
  PW = "PW",
  PA = "PA",
  PR = "PR",
  RI = "RI",
  SC = "SC",
  SD = "SD",
  TN = "TN",
  TX = "TX",
  VI = "VI",
  UT = "UT",
  VT = "VT",
  VA = "VA",
  WA = "WA",
  WV = "WV",
  WI = "WI",
  WY = "WY",
}

export const qualifiedHomeAddressSchema = z.object({
  line1: z.string().trim().max(35).regex(/^[A-Za-z0-9]( ?[A-Za-z0-9\-/])*$/),
  line2: z.string().trim().max(35).regex(/^[A-Za-z0-9]( ?[A-Za-z0-9\-/])*$/)
    .optional(),
  city: z.string().trim().max(22).regex(/^([A-Za-z] ?)*[A-Za-z]$/),
  state: z.nativeEnum(QualifiedHomeState),
  zip: z.string().regex(/^\d{5}(?:\d{4}|\d{7})?$/),
}).strict();

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
});

export enum CertifiedInterestDocumentKind {
  Form1098 = "form1098",
  LenderStatement = "lender_statement",
}

const interestEvidenceSchema = z.object({
  kind: z.nativeEnum(CertifiedInterestDocumentKind),
  document_reference: z.string().trim().min(1),
  reported_interest_paid: z.number().finite().nonnegative(),
  taxpayer_interest_paid: z.number().finite().positive(),
  original_mortgage_amount: z.number().finite().positive(),
  certified_indebtedness_amount: z.number().finite().positive(),
}).strict().refine(
  (evidence) =>
    evidence.taxpayer_interest_paid <= evidence.reported_interest_paid,
  {
    path: ["taxpayer_interest_paid"],
    message: "Taxpayer interest cannot exceed the identified source document",
  },
);

/** Source facts for the 2025 Form 8396, not a precomputed Schedule 3 credit. */
export const form8396SourceSchema = z.object({
  qualified_home_address_if_different: qualifiedHomeAddressSchema.optional(),
  certificate_issuer_name: z.string().trim().min(1),
  certificate_number: z.string().trim().min(1).max(22),
  certificate_issue_date: date,
  current_year_claim: z.boolean(),
  interest_evidence: interestEvidenceSchema.optional(),
  interest_reporting_line: z.enum(["8a", "8b"]).optional(),
  mcc_rate: z.number().finite().min(0.1).max(0.5).refine((rate) =>
    Math.abs(rate * 100_000 - Math.round(rate * 100_000)) < 0.000001
  ).optional(),
  home_is_main_residence: z.boolean().optional(),
  home_in_issuer_jurisdiction: z.boolean().optional(),
  interest_paid_to_related_person: z.boolean().optional(),
  certificate_is_reissued: z.boolean().optional(),
  nonspouse_coowner: z.boolean().optional(),
  nonspouse_coowner_share: z.number().finite().positive().lt(1).optional(),
  prior_2024_form8396: z.object({
    document_reference: z.string().trim().min(1),
    line14_2023_carryforward: wholeDollars,
    line16_2022_carryforward: wholeDollars,
    line17_2024_carryforward: wholeDollars,
  }).strict().refine(
    (prior) =>
      prior.line14_2023_carryforward + prior.line16_2022_carryforward +
          prior.line17_2024_carryforward > 0,
    {
      message: "A prior Form 8396 reference must contain a carryforward",
    },
  ).optional(),
}).strict().superRefine((source, ctx) => {
  if (source.certificate_issue_date > "2025-12-31") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["certificate_issue_date"],
      message: "The MCC must be issued by the 2025 tax year",
    });
  }
  if (source.current_year_claim) {
    if (
      source.interest_evidence === undefined ||
      source.mcc_rate === undefined ||
      source.interest_reporting_line === undefined ||
      source.home_is_main_residence !== true ||
      source.home_in_issuer_jurisdiction !== true ||
      source.interest_paid_to_related_person !== false ||
      source.certificate_is_reissued !== false ||
      typeof source.nonspouse_coowner !== "boolean"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["current_year_claim"],
        message:
          "Current-year MCC credit needs identified interest, its rate, qualified-home, unrelated-lender, and refinance facts",
      });
    }
  } else if (source.interest_evidence !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["interest_evidence"],
      message:
        "Carryforward-only Form 8396 cannot include current-year interest",
    });
  }
  if (
    source.nonspouse_coowner === true &&
      source.nonspouse_coowner_share === undefined ||
    source.nonspouse_coowner === false &&
      source.nonspouse_coowner_share !== undefined
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["nonspouse_coowner_share"],
      message: "A nonspouse co-owner needs an explicit share of the $2,000 cap",
    });
  }
});

export type Form8396Source = z.infer<typeof form8396SourceSchema>;

/** Publication 530: use the original loan's fixed certified fraction. */
export function calculateForm8396Line1(raw: Form8396Source): number {
  const source = form8396SourceSchema.parse(raw);
  const evidence = source.interest_evidence;
  if (!evidence) return 0;
  return Math.round(
    evidence.taxpayer_interest_paid *
      Math.min(
        1,
        evidence.certified_indebtedness_amount /
          evidence.original_mortgage_amount,
      ),
  );
}

export function calculateForm8396Line3(raw: Form8396Source): number {
  const source = form8396SourceSchema.parse(raw);
  const line1 = calculateForm8396Line1(source);
  if (line1 === 0) return 0;
  const rate = source.mcc_rate;
  if (rate === undefined) throw new Error("Form 8396 MCC rate is missing");
  const tentative = Math.round(line1 * rate);
  const cap = rate > 0.2
    ? Math.round(2_000 * (source.nonspouse_coowner_share ?? 1))
    : Number.MAX_SAFE_INTEGER;
  return Math.min(tentative, cap);
}

/** Printed 2025 Form 8396 lines 1-17 after its Credit Limit Worksheet. */
export function calculateForm8396(
  raw: Form8396Source,
  taxLiabilityLimit: number,
) {
  const source = form8396SourceSchema.parse(raw);
  if (!Number.isSafeInteger(taxLiabilityLimit) || taxLiabilityLimit < 0) {
    throw new Error("Form 8396 line 8 needs a nonnegative whole-dollar limit");
  }
  const prior = source.prior_2024_form8396;
  const line1 = calculateForm8396Line1(source);
  const line3 = calculateForm8396Line3(source);
  const line4 = prior?.line16_2022_carryforward ?? 0;
  const line5 = prior?.line14_2023_carryforward ?? 0;
  const line6 = prior?.line17_2024_carryforward ?? 0;
  const line7 = line3 + line4 + line5 + line6;
  const line8 = taxLiabilityLimit;
  const line9 = Math.min(line7, line8);
  if (!Number.isSafeInteger(line7)) {
    throw new Error("Form 8396 credit exceeds safe whole dollars");
  }
  if (line9 >= line7) {
    return {
      line1,
      line2: source.mcc_rate,
      line3,
      line4,
      line5,
      line6,
      line7,
      line8,
      line9,
      carryforwardTo2026: { year2023: 0, year2024: 0, year2025: 0 },
    };
  }
  const line10 = line3 + line4;
  const line11 = line7;
  const line12 = Math.max(line9, line10);
  const line13 = line11 - line12;
  const line14 = Math.min(line6, line13);
  const line15 = line13 - line14;
  const line16 = Math.min(line5, line15);
  const line17 = Math.max(0, line3 - line9);
  return {
    line1,
    line2: source.mcc_rate,
    line3,
    line4,
    line5,
    line6,
    line7,
    line8,
    line9,
    line10,
    line11,
    line12,
    line13,
    line14,
    line15,
    line16,
    line17,
    carryforwardTo2026: {
      year2023: line16,
      year2024: line14,
      year2025: line17,
    },
  };
}
