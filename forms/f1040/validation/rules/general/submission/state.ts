/**
 * MeF Business Rules: STATE
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 15 rules (15 implemented, 0 stubs)
 *
 * Checked on each StateSubmissionManifest sent with the return
 * (EnvelopeFact.StateManifests) against the federal submission it links to.
 * The engine builds no state submission yet, so these pass on what it emits.
 */

import type {
  ReturnContext,
  RuleCheck,
  RuleDef,
} from "../../../../../../core/validation/types.ts";
import { rule } from "../../../../../../core/validation/mod.ts";
import {
  EnvelopeFact,
  factText,
  factTexts,
  isEtin,
  isPersonNameControl,
  xmlTexts,
} from "../../../../../../core/validation/predicates.ts";
import {
  manifestText,
  submissionEnvelope,
  transmissionManifests,
} from "./envelope.ts";

/** StateSubmissionManifest SubmissionCategoryCd values. */
export enum StateSubmissionCategory {
  Corporation = "CORP",
  Partnership = "PART",
  Individual = "IND",
  ExemptOrganization = "EO",
  EstateTrust = "ESTRST",
  CorporationEstimatedPayment = "CORPEP",
  PartnershipEstimatedPayment = "PARTEP",
  IndividualEstimatedPayment = "INDEP",
  EstateTrustEstimatedPayment = "ESTRSTEP",
}

const CATEGORIES = new Set<string>(Object.values(StateSubmissionCategory));
const ESTIMATED_PAYMENT = new Set<string>([
  StateSubmissionCategory.CorporationEstimatedPayment,
  StateSubmissionCategory.PartnershipEstimatedPayment,
  StateSubmissionCategory.IndividualEstimatedPayment,
  StateSubmissionCategory.EstateTrustEstimatedPayment,
]);
const RETURNS = new Set<string>([
  StateSubmissionCategory.Corporation,
  StateSubmissionCategory.Partnership,
  StateSubmissionCategory.Individual,
  StateSubmissionCategory.ExemptOrganization,
  StateSubmissionCategory.EstateTrust,
]);
const INDIVIDUAL = new Set<string>([
  StateSubmissionCategory.Individual,
  StateSubmissionCategory.IndividualEstimatedPayment,
]);
/** The federal return types whose submissions a state return can link to. */
const FEDERAL_RETURN_TYPES = new Set(["1040", "1040SS", "1040NR"]);

type StateManifest = {
  readonly text: (tag: string) => string | undefined;
};

const stateManifests = (ctx: ReturnContext): readonly StateManifest[] =>
  factTexts(ctx, EnvelopeFact.StateManifests).map((xml) => ({
    text: (tag) => xmlTexts(xml, tag)[0] || undefined,
  }));

/** A federal submission sent with the state ones: its manifest's fields. */
type FederalSubmission = {
  readonly id?: string;
  readonly typeCd?: string;
  readonly taxYr?: string;
};

const federalSubmissions = (ctx: ReturnContext): readonly FederalSubmission[] => {
  const envelope = submissionEnvelope(ctx);
  const own: FederalSubmission[] = envelope
    ? [{
      id: manifestText(envelope, "SubmissionId"),
      typeCd: manifestText(envelope, "FederalSubmissionTypeCd"),
      taxYr: manifestText(envelope, "TaxYr"),
    }]
    : [];
  return [
    ...own,
    ...transmissionManifests(ctx).map((xml) => ({
      id: xmlTexts(xml, "SubmissionId")[0],
      typeCd: xmlTexts(xml, "FederalSubmissionTypeCd")[0],
      taxYr: xmlTexts(xml, "TaxYr")[0],
    })),
  ];
};

/** The federal submission a state manifest links to, when it was sent with it. */
const linked = (
  ctx: ReturnContext,
  m: StateManifest,
): FederalSubmission | undefined => {
  const id = m.text("IRSSubmissionId");
  return id === undefined
    ? undefined
    : federalSubmissions(ctx).find((f) => f.id === id);
};

const processingYear = (ctx: ReturnContext): number | undefined => {
  const date = factText(ctx, EnvelopeFact.ProcessingDate);
  return date ? Number(date.slice(0, 4)) : undefined;
};

const eachState = (
  check: (m: StateManifest, ctx: ReturnContext) => boolean,
): RuleCheck =>
(ctx) => stateManifests(ctx).every((m) => check(m, ctx));

const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");

export const STATE_RULES: readonly RuleDef[] = [
  rule(
    "STATE-001",
    "reject",
    "incorrect_data",
    // A state agency code; which agencies take part in Fed/State is MeF's list.
    eachState((m) => /^[A-Z]{2}ST$/.test(m.text("GovernmentCd") ?? "")),
    "The agency to which a State Submission is filed must participate in the Fed/State program.",
  ),
  rule(
    "STATE-005",
    "reject",
    "data_mismatch",
    // A Form 1040 family submission is in the individual category.
    eachState((m, ctx) => {
      const federal = linked(ctx, m);
      return federal === undefined ||
        !FEDERAL_RETURN_TYPES.has(federal.typeCd ?? "") ||
        INDIVIDUAL.has(m.text("SubmissionCategoryCd") ?? "");
    }),
    "The Submission Category of  a State Submission  must match Submission Category of the referenced IRS Submission.",
  ),
  rule(
    "STATE-006",
    "reject",
    "unsupported",
    // The State Stand Alone Program list is MeF's, so an unlinked state
    // return is sent only as an estimated payment, which needs no link.
    eachState((m) =>
      m.text("IRSSubmissionId") !== undefined ||
      ESTIMATED_PAYMENT.has(m.text("SubmissionCategoryCd") ?? "")
    ),
    "If IRS Submission ID is not provided in the State Submission Manifest, the State must participate in the State Stand Alone Program.",
  ),
  rule(
    "STATE-007",
    "reject",
    "incorrect_data",
    eachState((m, ctx) => {
      const id = m.text("IRSSubmissionId");
      if (id === undefined) return true;
      const federal = linked(ctx, m);
      // A link to a submission sent earlier is confirmed against MeF's records.
      return /^[0-9]{13}[a-z0-9]{7}$/.test(id) &&
        (federal === undefined || FEDERAL_RETURN_TYPES.has(federal.typeCd ?? ""));
    }),
    "The IRS Submission ID referenced in the State Submission must be that of an IRS Return.",
  ),
  rule(
    "STATE-010",
    "reject",
    "data_mismatch",
    eachState((m, ctx) => {
      if (m.text("IRSSubmissionId") === undefined) return true;
      const taxYr = linked(ctx, m)?.taxYr ?? String(ctx.field("TaxYr") ?? "");
      return m.text("TaxYr") === taxYr;
    }),
    "'TaxYr' referenced in the State Submission Manifest must match 'TaxYr' of the linked Federal return.",
  ),
  rule(
    "STATE-011",
    "reject",
    "data_mismatch",
    eachState((m, ctx) => {
      if (m.text("IRSSubmissionId") === undefined) return true;
      const federal = [ctx.primarySSN(), ctx.spouseSSN()].map(digits)
        .filter(Boolean);
      const state = [m.text("PrimarySSN"), m.text("SpouseSSN")].map(digits)
        .filter(Boolean);
      return state.some((ssn) => federal.includes(ssn));
    }),
    "An SSN (either the Primary or the Spouse) referenced in the State Submission Manifest must match an SSN (either the Primary or the Spouse) of a linked Federal return.",
  ),
  rule(
    "STATE-012",
    "reject_and_stop",
    "unsupported",
    // The categories MeF names; which it accepts today is its own schedule.
    eachState((m) => CATEGORIES.has(m.text("SubmissionCategoryCd") ?? "")),
    "The State Submission category that was filed is not being accepted by Modernized e-File (MeF) at this time.  Please check the MeF web page under irs.gov for more information.  The submission category filed was <category>.",
  ),
  rule(
    "STATE-013",
    "reject_and_stop",
    "unsupported",
    // Participation of the ETIN is MeF's record; the ETIN sent must be one.
    (ctx) => {
      const etin = factText(ctx, EnvelopeFact.TransmitterEtin);
      return stateManifests(ctx).length === 0 || etin === undefined ||
        isEtin(etin);
    },
    "The ETIN associated with the Individual submission is not a participating transmitter.  Please check the Modernized e-File (MeF) web page under irs.gov for more information on participation rules.",
  ),
  rule(
    "STATE-015",
    "reject_and_stop",
    "incorrect_data",
    // MeF accepts the current tax year and the two before it.
    eachState((m, ctx) => {
      if (!RETURNS.has(m.text("SubmissionCategoryCd") ?? "")) return true;
      const year = Number(m.text("TaxYr"));
      const processed = processingYear(ctx);
      return Number.isInteger(year) &&
        (processed === undefined ||
          (year >= processed - 3 && year <= processed - 1));
    }),
    "If the Submission Category in the State Submission Manifest has a value of (\"CORP\" or \"PART\" or \"IND\" or \"EO\" or \"ESTRST\"), then 'TaxYr' in the State Submission Manifest must be valid for the current or prior year returns that are being accepted by Modernized e-File (MeF).",
  ),
  rule(
    "STATE-016",
    "reject_and_stop",
    "incorrect_data",
    eachState((m, ctx) => {
      if (!ESTIMATED_PAYMENT.has(m.text("SubmissionCategoryCd") ?? "")) {
        return true;
      }
      const processed = processingYear(ctx);
      return processed === undefined || Number(m.text("TaxYr")) === processed;
    }),
    "If the Submission Category in the State Submission Manifest has a value of (\"CORPEP\" or \"PARTEP\" or \"INDEP\"or \"ESTRSTEP\"), then 'TaxYr'  in the State Submission Manifest must be the same as processing year.",
  ),
  rule(
    "STATE-017",
    "reject_and_stop",
    "incorrect_data",
    eachState((m) =>
      !ESTIMATED_PAYMENT.has(m.text("SubmissionCategoryCd") ?? "") ||
      m.text("IRSSubmissionId") === undefined
    ),
    "If the Submission Category in the State Submission Manifest has a value of (\"CORPEP\" or \"PARTEP\" or \"INDEP\"or \"ESTRSTEP\"), then 'IRSSubmissionId' in the State Submission Manifest must not have a value.",
  ),
  rule(
    "STATE-019",
    "reject_and_stop",
    "incorrect_data",
    eachState((m) =>
      !INDIVIDUAL.has(m.text("SubmissionCategoryCd") ?? "") ||
      (/^\d{9}$/.test(m.text("PrimarySSN") ?? "") &&
        isPersonNameControl(m.text("PrimaryNameControlTxt"))) ||
      m.text("TempId") !== undefined
    ),
    "In the State Submission Manifest, if the Submission Category has a value of (\"IND\" or \"INDEP\"), then ( 'PrimarySSN'  and 'PrimaryNameControlTxt' ) or 'TempId' must have a value.",
  ),
  rule(
    "STATE-901",
    "reject",
    "database",
    // Presence in the e-File database is MeF's; the link must name a federal
    // submission sent with it or a well-formed earlier one.
    eachState((m, ctx) => {
      const id = m.text("IRSSubmissionId");
      return id === undefined || linked(ctx, m) !== undefined ||
        /^[0-9]{13}[a-z0-9]{7}$/.test(id);
    }),
    "The IRS Submission ID referenced in the State Submission Manifest must be present in the e-File database.",
  ),
  rule(
    "STATE-902",
    "reject",
    "database",
    // Acceptance is MeF's record. A federal submission sent alongside is held
    // for acceptance only when it is a federal return.
    eachState((m, ctx) => {
      const federal = linked(ctx, m);
      return federal === undefined ||
        FEDERAL_RETURN_TYPES.has(federal.typeCd ?? "");
    }),
    "The IRS Submission ID referenced in the State Submission Manifest must be in accepted status.",
  ),
  rule(
    "STATE-903",
    "reject",
    "database",
    // EFIN approval is MeF's record; the EFIN must be six digits and, for a
    // linked return, the federal originator's.
    eachState((m, ctx) => {
      const efin = m.text("EFIN") ?? "";
      const federal = manifestText(submissionEnvelope(ctx), "EFIN");
      return /^\d{6}$/.test(efin) &&
        (federal === undefined || linked(ctx, m) === undefined ||
          efin === federal);
    }),
    "Electronic Filing Identification Number (EFIN) in the State Submission Manifest must be approved and present in the e-File database.",
  ),
];
