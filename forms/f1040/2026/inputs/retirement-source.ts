import { calculatePlanTransfers2026 } from "./retirement-plan-transfers.ts";
import {
  directTransferLedger2026Schema,
} from "./retirement-direct-transfers.ts";
import {
  calculateForm4852Bridge2026,
  form4852Bridge2026Schema,
} from "./form4852-bridge.ts";
import { hsaQualifiedFunding2026Schema } from "./hsa-qualified-funding.ts";
import {
  bindIraBasis2026,
  iraBasisClaim2026Schema,
} from "./ira-basis-binding.ts";
import { businessReturnSource2026Schema } from "./business-qbi.ts";
import { w2Item2026Schema } from "./w2-source.ts";
import {
  addCalendarMonths,
  retirementCopy2026Schema,
} from "./retirement-statement.ts";
export {
  addCalendarMonths,
  retirementCopy2026Schema,
} from "./retirement-statement.ts";
import {
  disabilityIncomeReview2026Schema,
  retirementPayment2026Schema,
  splitDisabilityIncome2026,
} from "./retirement-disability.ts";
import { earlyDistributionAdditionalTax } from "../../nodes/intermediate/forms/taxes/retirement/form5329/early-tax.ts";
import { issuedPdfAttachment2026 } from "./issued-pdf.ts";
import { z } from "zod";
import { FilingStatus } from "../../nodes/types.ts";
import {
  calculateReportedRetirementIncome,
  itemSchema as sharedItem,
} from "../../nodes/inputs/income/retirement/f1099r/index.ts";
import {
  isSourceMoney,
  sourceCents,
  sumSourceMoney,
} from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";
import { roundWholeDollars } from "../../whole-dollars.ts";
import { investmentOwner2026 } from "./investment-source.ts";
const ref = z.string().trim().min(1);
const tin = z.string().regex(/^\d{9}$/);
const money = z.number().finite().nonnegative().max(1_000_000_000).refine(
  isSourceMoney,
  "Retirement money needs exact cents",
);
const date = z.string().date();
// Claims identify actual whole payments, never an entered exception code or tax amount.
const exceptionEvidence = { record_reference: ref, payment_reference: ref };
const earlyException = z.discriminatedUnion("kind", [
  z.object({
    ...exceptionEvidence,
    kind: z.literal("total_permanent_disability"),
    patient_tin: tin,
    physician_record_reference: ref,
    physician_determination_signed_on: date,
    disability_onset_date: date,
    unable_to_perform_any_substantial_gainful_activity_verified: z.literal(
      true,
    ),
    disability_caused_by_physical_or_mental_condition_verified: z.literal(true),
    physician_expected_duration: z.enum(["death", "long_continued_indefinite"]),
    medical_evidence_covers_payment_date_verified: z.literal(true),
    distribution_due_to_disability_verified: z.literal(true),
  }).strict(),
  z.object({
    ...exceptionEvidence,
    kind: z.literal("death_beneficiary"),
    decedent_tin: tin,
    beneficiary_entitlement_record_reference: ref,
    inherited_account_not_treated_as_own_verified: z.literal(true),
  }).strict(),
  z.object({
    ...exceptionEvidence,
    kind: z.literal("terminal_illness"),
    patient_tin: tin,
    physician_name: ref,
    physician_contact: ref,
    physician_qualification: z.enum(["MD", "DO"]),
    physician_license_jurisdiction: ref,
    physician_legally_authorized_to_practice_verified: z.literal(true),
    physician_is_not_patient_verified: z.literal(true),
    examination_or_evidence_review_date: date,
    certification_signed_on: date,
    certified_expected_death_within_months: z.number().finite().nonnegative()
      .max(84),
    physician_signed_narrative_and_attestation_verified: z.literal(true),
    underlying_evidence_record_reference: ref,
    certification_and_underlying_evidence_retained_verified: z.literal(true),
    distribution_otherwise_permissible_verified: z.literal(true),
    administration: z.discriminatedUnion("route", [
      z.object({
        route: z.literal("plan_permits"),
        certification_furnished_to_administrator_on: date,
        administrator_receipt_record_reference: ref,
      }).strict(),
      z.object({
        route: z.literal("return_election"),
        plan_does_not_permit_terminal_illness_distributions_verified: z.literal(
          true,
        ),
        election_record_reference: ref,
      }).strict(),
    ]),
  }).strict(),
  z.object({
    ...exceptionEvidence,
    kind: z.literal("separation_after_age55"),
    separation_date: date,
    employer_tin: tin,
    distribution_from_that_employers_plan_verified: z.literal(true),
  }).strict(),
  z.object({
    ...exceptionEvidence,
    kind: z.literal("qdro_alternate_payee"),
    order_date: date,
    alternate_payee_tin: tin,
    relationship_to_plan_participant: z.enum(["spouse", "former_spouse"]),
    plan_administrator_qualified_order_verified: z.literal(true),
    entire_payment_made_under_order_verified: z.literal(true),
  }).strict(),
  z.object({
    ...exceptionEvidence,
    kind: z.literal("irs_levy"),
    levy_date: date,
    amount_paid_under_levy: money,
    irs_levy_on_this_retirement_account_verified: z.literal(true),
  }).strict(),
  z.object({
    ...exceptionEvidence,
    kind: z.literal("age59_half"),
    actual_payment_date_and_birth_record_verified: z.literal(true),
  }).strict(),
]);
const review = z.object({
  source_document_reference: ref,
  record_reference: ref,
  reviewed_on: date,
  reviewer_name: ref,
  plan_type: z.enum([
    "traditional_ira",
    "sep_ira",
    "simple_ira",
    "qualified_employer_plan",
    "governmental_457b",
  ]),
  // Includes QCDs with no optional Y code and HSA funding without a special code.
  no_qcd_hsa_funding_pso_exclusion_disaster_or_corrective_treatment_verified: z
    .literal(true).optional(),
  no_qcd_pso_exclusion_disaster_or_corrective_treatment_verified: z.literal(
    true,
  ).optional(),
  no_roth_ira_or_designated_roth_distribution_or_ira_conversion_verified: z
    .literal(true).optional(),
  ira_basis_owner_review_reference: ref.optional(),
  no_form4972_nua_election_or_other_tax_method_verified: z.literal(true),
  no_unreported_excess_contributions_or_rmd_shortfall_verified: z.literal(true),
  no_ira_basis_or_current_nondeductible_contributions_verified: z.literal(true)
    .optional(),
  no_indirect_rollover_repayment_or_recharacterization_verified: z.literal(
    true,
  ),
  payer_determined_pension_taxability_verified: z.literal(true).optional(),
  form4852_taxability_review_reference: ref.optional(),
  payer_code2_exception_verified: z.literal(true).optional(),
  payer_code3_disability_verified: z.literal(true).optional(),
  disability_income: disabilityIncomeReview2026Schema.optional(),
  early_distribution: z.object({
    record_reference: ref,
    complete_payment_inventory_verified: z.literal(true),
    no_additional_tax_exception_applies_verified: z.literal(true).optional(),
    exception_review: z.object({
      record_reference: ref,
      owner_tin: tin,
      account_number: ref,
      complete_exception_inventory_verified: z.literal(true),
      no_other_payment_exception_applies_verified: z.literal(true),
      claims: z.array(earlyException).min(1).max(1000),
    }).strict().optional(),
    simple_first_contribution_date: date.optional(),
    payments: z.array(retirementPayment2026Schema.partial({ taxable: true }))
      .min(1).max(1000),
  }).strict().optional(),
  death_benefit: z.object({
    decedent_tin: tin,
    death_date: date,
    record_reference: ref,
    no_inherited_basis_or_special_tax_treatment_verified: z.literal(true),
  }).strict().optional(),
  direct_rollover_payments: directTransferLedger2026Schema.optional(),
  direct_rollover: z.object({
    record_reference: ref,
    transfer_date: date,
    destination_account_reference: ref,
    destination_type: z.enum([
      "traditional_ira",
      "eligible_non_roth_plan",
      "roth_ira",
      "designated_roth_plan",
    ]),
    amount_transferred: money.refine((v) => v > 0, "Transfer must be positive"),
    source_after_tax_basis: money,
    eligible_direct_transfer_no_rmd_or_other_ineligible_amount_verified: z
      .literal(true),
    no_cash_received_by_filer_verified: z.literal(true),
  }).strict().optional(),
}).strict();
export const retirementClaim2026Schema = z.object({
  claim: z.object({
    tax_year: z.literal(2026),
    record_reference: ref,
    reviewed_on: date,
    reviewer_name: ref,
    complete_retirement_statement_and_correction_inventory_verified: z.literal(
      true,
    ),
    copies: z.array(retirementCopy2026Schema).max(100),
    reviews: z.array(review).max(100),
    ira_basis: iraBasisClaim2026Schema.optional(),
  }).strict(),
}).strict();
export const retirementSource2026Schema = investmentOwner2026.extend({
  taxpayer_dob: date,
  spouse_dob: date.optional(),
  taxpayer_can_be_claimed_as_dependent: z.boolean().optional(),
  spouse_can_be_claimed_as_dependent: z.boolean().optional(),
  hsa_funding_sources_2026: hsaQualifiedFunding2026Schema.optional(),
  form4852_sources_2026: form4852Bridge2026Schema.optional(),
  ...retirementClaim2026Schema.shape,
  wage_sources: z.array(w2Item2026Schema).default([]),
  business_sources_2026: businessReturnSource2026Schema.optional(),
}).strict();
export type RetirementSource2026 = z.input<typeof retirementSource2026Schema>;
export type RetirementCopy2026 = z.input<typeof retirementCopy2026Schema>;

export function calculateRetirementSources2026(raw: RetirementSource2026) {
  const input = retirementSource2026Schema.parse(raw), claim = input.claim;
  const substitutes = input.form4852_sources_2026
    ? calculateForm4852Bridge2026(input.form4852_sources_2026)
    : undefined;
  const substituteRows = new Map(
    substitutes?.ledger.rows.filter((r) => r.source.kind === "1099r").map(
      (r) => [r.source.source_document_reference, r.source],
    ) ?? [],
  );
  if (
    substitutes &&
    (substitutes.source_input.filing_status !== input.filing_status ||
      substitutes.source_input.taxpayer_ssn !== input.taxpayer_ssn ||
      substitutes.source_input.spouse_ssn !== input.spouse_ssn ||
      JSON.stringify(claim.copies) !==
        JSON.stringify(substitutes.effective_retirement_copies) ||
      JSON.stringify(input.wage_sources) !==
        JSON.stringify(substitutes.effective_wages) ||
      claim.reviewed_on < substitutes.source_input.claim.reviewed_on)
  ) {
    throw Error(
      "Retirement Form 4852 sources must reconcile actual owners, current copies and review chronology",
    );
  }
  if (
    input.taxpayer_dob > "2026-12-31" ||
    (input.spouse_dob && input.spouse_dob > "2026-12-31")
  ) {
    throw new Error(
      "Retirement owner birth date must precede the tax year end",
    );
  }
  if (claim.reviewed_on < "2027-01-01") {
    throw new Error(
      "Retirement inventory must be reviewed after the 2026 year end",
    );
  }
  if (
    input.filing_status === FilingStatus.MFJ &&
    (!input.spouse_ssn || !input.spouse_dob ||
      input.spouse_ssn === input.taxpayer_ssn)
  ) {
    throw new Error(
      "Joint retirement sources need distinct owners and birth dates",
    );
  }
  const owner = (c: z.output<typeof retirementCopy2026Schema>) => {
    if (c.recipient === "spouse" && input.filing_status !== FilingStatus.MFJ) {
      throw new Error("Spouse retirement source needs a joint return");
    }
    const id = c.recipient === "spouse"
      ? input.spouse_ssn!
      : input.taxpayer_ssn;
    if (
      c.recipient_tin.startsWith("XXX")
        ? !id.endsWith(c.recipient_tin.slice(-4))
        : c.recipient_tin.replaceAll("-", "") !== id
    ) {
      throw new Error(
        "Retirement recipient identity does not match the actual filer",
      );
    }
    return id;
  };
  const refs = new Map(
    claim.copies.map((c) => [c.source_document_reference, c]),
  );
  if (refs.size !== claim.copies.length) {
    throw new Error("Retirement issued copy references must be distinct");
  }
  const identity = (c: z.output<typeof retirementCopy2026Schema>) =>
    JSON.stringify([
      c.payer_tin,
      owner(c),
      c.account_number,
      c.statement_identifier,
    ]);
  const retired = new Set<string>();
  for (const c of claim.copies) {
    owner(c);
    if (c.corrected !== !!c.supersedes_document_reference) {
      throw new Error("Retirement correction needs its replaced issued copy");
    }
    if (c.supersedes_document_reference) {
      const old = refs.get(c.supersedes_document_reference);
      if (
        !old || old === c || retired.has(old.source_document_reference) ||
        identity(old) !== identity(c)
      ) {
        throw new Error(
          "Retirement correction must replace one matching issued statement",
        );
      }
      retired.add(old.source_document_reference);
      const chain = new Set([c.source_document_reference]);
      let prior = old;
      while (prior) {
        if (chain.has(prior.source_document_reference)) {
          throw new Error("Retirement correction lineage contains a cycle");
        }
        chain.add(prior.source_document_reference);
        if (!prior.supersedes_document_reference) break;
        prior = refs.get(prior.supersedes_document_reference)!;
        if (!prior) {
          throw new Error("Retirement correction lineage is incomplete");
        }
      }
    }
  }
  const current = claim.copies.filter((c) =>
    !retired.has(c.source_document_reference)
  );
  if (new Set(current.map(identity)).size !== current.length) {
    throw new Error(
      "Retirement inventory has two current copies of one statement",
    );
  }
  const reviews = new Map(
    claim.reviews.map((r) => [r.source_document_reference, r]),
  );
  if (
    reviews.size !== current.length ||
    claim.reviews.length !== current.length ||
    current.some((c) => !reviews.has(c.source_document_reference))
  ) {
    throw new Error(
      "Retirement current copies each need exactly one treatment review",
    );
  }
  if (!current.length && !claim.ira_basis) {
    throw Error(
      "Retirement inventory needs current copies or an annual IRA workpaper",
    );
  }
  if (claim.ira_basis && claim.ira_basis.reviewed_on > claim.reviewed_on) {
    throw Error(
      "IRA basis review must precede the complete retirement inventory",
    );
  }
  if (input.hsa_funding_sources_2026) {
    if (!claim.ira_basis) {
      throw Error(
        "Qualified HSA funding needs the actual annual IRA basis inventory",
      );
    }
    if (
      claim.ira_basis.hsa_funding_sources &&
      JSON.stringify(claim.ira_basis.hsa_funding_sources) !==
        JSON.stringify(input.hsa_funding_sources_2026)
    ) {
      throw Error("Retirement and HSA funding sources disagree");
    }
    claim.ira_basis.hsa_funding_sources = input.hsa_funding_sources_2026;
  } else if (claim.ira_basis?.hsa_funding_sources) {
    throw Error(
      "Retirement HSA funding needs the executed HSA return inventory",
    );
  }
  const transferEntries = current.flatMap((copy) => {
    const review = reviews.get(copy.source_document_reference)!;
    return review.direct_rollover_payments
      ? [{
        copy,
        reviewed_on: review.reviewed_on,
        ledger: review.direct_rollover_payments,
      }]
      : [];
  });
  const planTransfers = transferEntries.length
    ? calculatePlanTransfers2026({
      filing_status: input.filing_status,
      taxpayer_ssn: input.taxpayer_ssn,
      spouse_ssn: input.spouse_ssn,
      taxpayer_dob: input.taxpayer_dob,
      spouse_dob: input.spouse_dob,
      reviewed_on: claim.reviewed_on,
      entries: transferEntries,
      form4852_sources_2026: input.form4852_sources_2026,
    })
    : undefined;
  if (
    planTransfers?.basis_records.some((d) =>
      d.destination_type === "traditional_ira" && d.basis_year === 2026 &&
      !claim.ira_basis?.owners.some((o) => o.owner_tin === d.owner_tin)
    )
  ) {
    throw Error(
      "After-tax plan rollovers into an IRA need destination basis integration through its annual account inventory",
    );
  }
  const basisOwners = new Set(claim.ira_basis?.owners.map((o) => o.owner_tin));
  const iraBasis = claim.ira_basis
    ? bindIraBasis2026({
      filing_status: input.filing_status,
      taxpayer_ssn: input.taxpayer_ssn,
      spouse_ssn: input.spouse_ssn,
      taxpayer_dob: input.taxpayer_dob,
      spouse_dob: input.spouse_dob,
      taxpayer_can_be_claimed_as_dependent:
        input.taxpayer_can_be_claimed_as_dependent,
      spouse_can_be_claimed_as_dependent:
        input.spouse_can_be_claimed_as_dependent,
      current_copies: current.filter((c) =>
        c.box7b_ira_sep_simple && basisOwners.has(owner(c))
      ),
      form4852_sources_2026: input.form4852_sources_2026,
      plan_transfers_2026: planTransfers?.source_input,
      claim: claim.ira_basis,
      wage_sources: input.wage_sources,
      business_sources_2026: input.business_sources_2026,
    })
    : undefined;
  const paymentRecords = new Set<string>();
  const accountDecedents = new Map<string, string>();
  const disabilityPlanDates = new Map<string, string>();
  const rows = current.map((c) => {
    const r = reviews.get(c.source_document_reference)!;
    if (r.reviewed_on < "2027-01-01" || r.reviewed_on > claim.reviewed_on) {
      throw new Error(
        "Retirement treatment review must precede completed inventory after year end",
      );
    }
    const id = owner(c),
      ira = ["traditional_ira", "sep_ira", "simple_ira"].includes(r.plan_type);
    if (c.box7c_trump_account || c.box7d_excess_contribution_earnings > 0) {
      throw new Error(
        "2026 Trump-account or excess-contribution earnings need their distinct source route",
      );
    }
    if (c.box7b_ira_sep_simple !== ira) {
      throw new Error("Retirement plan review conflicts with issued box 7b");
    }
    const basis = ira
      ? iraBasis?.calculation.forms.find((o) => o.owner_tin === id)
      : undefined;
    const basisAmounts = basis?.distributions.find((d) =>
      d.source_document_reference === c.source_document_reference
    );
    if (
      basisAmounts?.qualified_hsa_funding
        ? r
          .no_qcd_hsa_funding_pso_exclusion_disaster_or_corrective_treatment_verified ||
          !r.no_qcd_pso_exclusion_disaster_or_corrective_treatment_verified
        : !r
          .no_qcd_hsa_funding_pso_exclusion_disaster_or_corrective_treatment_verified ||
          r.no_qcd_pso_exclusion_disaster_or_corrective_treatment_verified
    ) {
      throw Error(
        "Retirement exclusion declarations must match the actual qualified HSA funding payments",
      );
    }
    if (basis) {
      const account = basis.source.accounts.find((a) =>
        a.custodian_tin === c.payer_tin && a.account_number === c.account_number
      )!;
      if (
        r.ira_basis_owner_review_reference !== basis.source.record_reference ||
        r.death_benefit !== undefined ||
        r.no_ira_basis_or_current_nondeductible_contributions_verified ||
        account.plan_type !== r.plan_type ||
        (r.early_distribution && account.simple_first_contribution_date !==
            r.early_distribution.simple_first_contribution_date) ||
        (basisAmounts!.converted > 0 &&
          r.no_roth_ira_or_designated_roth_distribution_or_ira_conversion_verified)
      ) {
        throw Error(
          "IRA treatment review must match annual basis owner, account and conversion evidence",
        );
      }
    } else if (
      r.ira_basis_owner_review_reference ||
      !r.no_roth_ira_or_designated_roth_distribution_or_ira_conversion_verified
    ) {
      throw Error(
        "Retirement review needs a matched IRA basis owner or no-conversion declaration",
      );
    }
    const substitute = substituteRows.get(c.source_document_reference);
    if (substitute) {
      if (
        c.box7a_distribution_codes.length !== 1 ||
        !(basis ? ["1", "2", "7", "S"] : ["1", "7", "G"]).includes(
          c.box7a_distribution_codes[0],
        ) ||
        !(basisAmounts?.qualified_hsa_funding
          ? r.no_qcd_pso_exclusion_disaster_or_corrective_treatment_verified
          : r
            .no_qcd_hsa_funding_pso_exclusion_disaster_or_corrective_treatment_verified)
      ) {
        throw Error(
          "Form 4852 retirement supports ordinary pensions and reconciled IRA basis/conversion/HSA payments; other treatment needs a reconciled substitute payment bridge",
        );
      }
      if (
        r.form4852_taxability_review_reference !==
          c.source_document_reference ||
        r.reviewed_on < substitutes!.source_input.claim.reviewed_on ||
        r.payer_determined_pension_taxability_verified ||
        substitute.kind !== "1099r"
      ) {
        throw Error(
          "Substitute retirement taxability must use its reviewed Form 4852 estimate, not a payer determination",
        );
      }
      const expectedType = substitute.distribution_sources[0].account_type;
      if (
        (expectedType === "non_ira"
          ? !["qualified_employer_plan", "governmental_457b"].includes(
            r.plan_type,
          )
          : expectedType !== r.plan_type)
      ) {
        throw Error(
          "Form 4852 custodian classification disagrees with retirement treatment",
        );
      }
      const payments = r.early_distribution?.payments;
      if (
        payments && !basisAmounts &&
        (payments.length !== substitute.distribution_sources.length ||
          payments.some((p) =>
            !substitute.distribution_sources.some((s) =>
              s.distribution_reference === p.record_reference &&
              s.paid_on === p.payment_date &&
              s.gross_distribution === p.gross &&
              (p.taxable === undefined || s.taxable_amount === p.taxable)
            )
          ))
      ) {
        throw Error(
          "Form 4852 early-tax payments must match its actual distribution ledger",
        );
      }
    } else if (r.form4852_taxability_review_reference) {
      throw Error(
        "Retirement substitute review requires its actual Form 4852 sources",
      );
    }
    const codes = c.box7a_distribution_codes;
    if (
      codes.length !== 1 ||
      !["1", "2", "3", "4", "7", "G", "S"].includes(codes[0])
    ) {
      throw new Error(
        "Retirement codes need their early-tax, Roth, QCD, corrective, or special source route",
      );
    }
    const code = codes[0];
    if (
      new Set(c.state_information.map((s) => s.state)).size !==
        c.state_information.length ||
      new Set(c.local_information.map((s) => s.locality)).size !==
        c.local_information.length
    ) {
      throw new Error(
        "Retirement statement has duplicate state or local withholding rows",
      );
    }
    const totalWithheld = sumSourceMoney([
      c.box4_federal_withheld,
      ...(substitute?.kind === "1099r"
        ? [
          substitute.amounts.state_tax_withheld,
          substitute.amounts.local_tax_withheld,
        ]
        : []),
      ...c.state_information.map((s) => s.box14_state_withheld),
      ...c.local_information.map((s) => s.box17_local_withheld),
    ]);
    if (
      c.box6_nua > 0 || c.box8a_other_amount > 0 ||
      c.box8b_annuity_percentage !== undefined ||
      c.box10_irr_within_five_years > 0 || c.box11_first_roth_year !== undefined
    ) {
      throw new Error(
        "Retirement NUA, annuity-contract, or Roth boxes need their special source calculation",
      );
    }
    if (
      c.box2a_taxable_amount !== undefined &&
        c.box2a_taxable_amount > c.box1_gross_distribution ||
      c.box3_capital_gain > (c.box2a_taxable_amount ?? 0) ||
      totalWithheld > c.box1_gross_distribution
    ) {
      throw new Error(
        "Retirement taxable, capital-gain, or withholding amount exceeds its source base",
      );
    }
    if (code === "7") {
      const dob = c.recipient === "spouse"
        ? input.spouse_dob!
        : input.taxpayer_dob;
      if (addCalendarMonths(dob, 59 * 12 + 6) > "2026-12-31") {
        throw new Error(
          "Normal code 7 conflicts with filer age; review the issued distribution code",
        );
      }
    }
    if (
      code === "2" && !basisAmounts?.converted &&
      !r.payer_code2_exception_verified
    ) {
      throw new Error("Code 2 needs the payer's known-exception review");
    }
    if ((code === "3") !== !!r.payer_code3_disability_verified) {
      throw new Error(
        "Code 3 needs a matching payer disability-exception review",
      );
    }
    const deathClaims = r.early_distribution?.exception_review?.claims.filter(
      (claim) => claim.kind === "death_beneficiary",
    ) ?? [];
    if ((code === "4" || deathClaims.length > 0) !== !!r.death_benefit) {
      throw new Error(
        "Death distribution needs matched decedent and inherited-basis evidence",
      );
    }
    if (
      r.death_benefit &&
      (r.death_benefit.death_date > "2026-12-31" ||
        r.death_benefit.decedent_tin === id)
    ) {
      throw new Error(
        "Retirement death-benefit record conflicts with recipient or tax year",
      );
    }
    const accountKey = JSON.stringify([id, c.payer_tin, c.account_number]);
    const decedent = r.death_benefit
      ? JSON.stringify([
        r.death_benefit.decedent_tin,
        r.death_benefit.death_date,
      ])
      : "own-account";
    if (
      accountDecedents.has(accountKey) &&
      accountDecedents.get(accountKey) !== decedent
    ) {
      throw new Error(
        "Retirement account has conflicting inherited/decedent treatment across current statements",
      );
    }
    accountDecedents.set(accountKey, decedent);
    let taxable: number;
    if (ira) {
      if (
        code === "G" ||
        (!basis &&
          !r.no_ira_basis_or_current_nondeductible_contributions_verified) ||
        c.box5_employee_contributions > 0 || c.box9b_employee_contributions > 0
      ) {
        throw new Error(
          "IRA rollover, contribution, or basis needs its Form 8606/source calculation",
        );
      }
      if (
        !basis && (!c.box2b_taxable_amount_not_determined ||
          c.box2a_taxable_amount !== undefined) &&
        c.box2a_taxable_amount !== c.box1_gross_distribution
      ) {
        throw new Error(
          "IRA taxable amount conflicts with no-basis/no-exclusion source review",
        );
      }
      taxable = c.box1_gross_distribution;
    } else {
      if (
        !(r.payer_determined_pension_taxability_verified ||
          substituteRows.has(c.source_document_reference) &&
            r.form4852_taxability_review_reference ===
              c.source_document_reference) ||
        c.box2b_taxable_amount_not_determined ||
        c.box2a_taxable_amount === undefined
      ) {
        throw new Error(
          "Pension taxable amount needs payer determination or an annuity/basis workpaper",
        );
      }
      taxable = c.box2a_taxable_amount;
    }
    if (r.direct_rollover && r.direct_rollover_payments) {
      throw Error(
        "Direct rollover needs one transfer inventory, not two competing reviews",
      );
    }
    if (substitute && code === "G" && !r.direct_rollover_payments) {
      throw Error(
        "Form 4852 direct rollover needs dated payment and destination receipts",
      );
    }
    if (
      (code === "G") !== !!(r.direct_rollover || r.direct_rollover_payments)
    ) {
      throw new Error(
        "Direct rollover code G needs matching transfer evidence",
      );
    }
    const ownerDob = c.recipient === "spouse"
      ? input.spouse_dob!
      : input.taxpayer_dob;
    const directTransfers = planTransfers?.rows.find((row) =>
      row.source_document_reference === c.source_document_reference
    )?.calculation;
    if (r.direct_rollover) {
      const t = r.direct_rollover,
        roth = ["roth_ira", "designated_roth_plan"].includes(
          t.destination_type,
        );
      if (!roth && t.source_after_tax_basis > 0) {
        throw Error(
          "After-tax non-Roth rollover basis needs dated payment and destination receipts",
        );
      }
      if (
        !t.transfer_date.startsWith("2026-") || t.transfer_date < ownerDob ||
        t.amount_transferred !== c.box1_gross_distribution ||
        t.source_after_tax_basis > t.amount_transferred ||
        totalWithheld !== 0 ||
        taxable !== (roth
            ? Math.round(
              (t.amount_transferred - t.source_after_tax_basis) * 100,
            ) / 100
            : 0)
      ) {
        throw new Error(
          "Direct rollover gross, taxable amount, basis and withholding must reconcile to transfer records",
        );
      }
    }
    const early = basisAmounts
      ? basisAmounts.nonconversion > 0 && (code === "1" || code === "S" ||
        code === "2" && basisAmounts.converted > 0 &&
          basisAmounts.payments.some((p) =>
            p.nonconversion > 0 &&
            p.payment_date < addCalendarMonths(ownerDob, 59 * 12 + 6)
          ))
      : code === "1" || code === "S";
    const earlyPayments = r.early_distribution?.payments.map((p) => {
      if (basisAmounts) {
        const actual = basisAmounts.payments.find((v) =>
          v.nonconversion > 0 &&
          (v.record_reference
            ? v.record_reference === p.record_reference
            : basisAmounts.payments.length === 1)
        );
        if (
          p.taxable !== undefined || !actual ||
          p.payment_date !== actual.payment_date ||
          p.gross !== actual.nonconversion ||
          r.early_distribution!.payments.length !==
            basisAmounts.payments.filter((v) => v.nonconversion > 0).length
        ) {
          throw Error(
            "IRA basis early review needs the actual dated nonconversion payment without entered taxable income",
          );
        }
        return { ...p, taxable: p.gross };
      }
      if (p.taxable === undefined) {
        throw Error("Ordinary early payment needs its source taxable amount");
      }
      return { ...p, taxable: p.taxable };
    });
    if (early !== !!r.early_distribution) {
      throw new Error(
        "Early distribution needs matching dated payment and exception review",
      );
    }
    const exemptions: {
      payment_reference: string;
      code: string;
      taxable: number;
    }[] = [];
    if (r.early_distribution) {
      const e = { ...r.early_distribution, payments: earlyPayments! };
      const exceptions = e.exception_review;
      if (!!e.no_additional_tax_exception_applies_verified === !!exceptions) {
        throw new Error(
          "Early distribution needs exactly one complete exception review or no-exception declaration",
        );
      }
      if (
        exceptions &&
        (exceptions.owner_tin !== id ||
          exceptions.account_number !== c.account_number)
      ) {
        throw new Error(
          "Early exception evidence must match the distribution owner and account",
        );
      }
      const claims = new Map(
        exceptions?.claims.map((claim) => [claim.payment_reference, claim]),
      );
      if (
        claims.size !== (exceptions?.claims.length ?? 0) ||
        [...claims.keys()].some((key) =>
          !e.payments.some((p) => p.record_reference === key)
        )
      ) {
        throw new Error(
          "Early exception claims must identify distinct existing payments",
        );
      }
      // One inherited account cannot also be treated as the beneficiary's own
      // retirement account. Reconcile all its payments to the same death review.
      if (r.death_benefit && deathClaims.length !== e.payments.length) {
        throw new Error(
          "Inherited early-coded account needs death-benefit evidence for every payment",
        );
      }
      const dob = c.recipient === "spouse"
        ? input.spouse_dob!
        : input.taxpayer_dob;
      const age595 = addCalendarMonths(dob, 59 * 12 + 6);
      if (r.plan_type === "governmental_457b") {
        throw new Error(
          "Early governmental 457(b) income needs its separate rolled-in asset history",
        );
      }
      if (
        (code === "S" && r.plan_type !== "simple_ira") ||
        (r.plan_type === "simple_ira") !== !!e.simple_first_contribution_date
      ) {
        throw new Error(
          "Early SIMPLE source needs the actual first contribution date and matching plan/code",
        );
      }
      if (
        new Set(e.payments.map((p) => p.record_reference)).size !==
          e.payments.length ||
        sumSourceMoney(e.payments.map((p) => p.gross)) !==
          (basisAmounts?.nonconversion ?? c.box1_gross_distribution) ||
        sumSourceMoney(e.payments.map((p) => p.taxable)) !==
          (basisAmounts?.nonconversion ?? taxable)
      ) {
        throw new Error(
          "Early payment records must be distinct and reconcile gross and taxable distributions",
        );
      }
      for (const p of e.payments) {
        const claim = claims.get(p.record_reference);
        const paymentKey = JSON.stringify([
          id,
          c.payer_tin,
          c.account_number,
          p.record_reference,
        ]);
        if (paymentRecords.has(paymentKey)) {
          throw new Error(
            "Early payment record is reused across current statements for the same owner/account",
          );
        }
        paymentRecords.add(paymentKey);
        if (
          !p.payment_date.startsWith("2026-") || p.payment_date < dob ||
          (p.payment_date >= age595 && claim?.kind !== "age59_half") ||
          p.taxable > p.gross
        ) {
          throw new Error(
            "Early payment date, age or taxable amount conflicts with the issued source",
          );
        }
        if (
          e.simple_first_contribution_date &&
          ((!r.death_benefit && e.simple_first_contribution_date < dob) ||
            e.simple_first_contribution_date > p.payment_date ||
            (p.payment_date <
                addCalendarMonths(e.simple_first_contribution_date, 24)) !==
              (code === "S"))
        ) {
          throw new Error(
            "SIMPLE distribution code conflicts with its actual two-year participation period",
          );
        }
        if (claim) {
          let exceptionCode: string;
          switch (claim.kind) {
            case "total_permanent_disability":
              if (
                claim.patient_tin !== id ||
                claim.disability_onset_date < dob ||
                claim.disability_onset_date > p.payment_date ||
                claim.physician_determination_signed_on < dob ||
                claim.physician_determination_signed_on > r.reviewed_on
              ) {
                throw new Error(
                  "Disability exception needs this owner's medical determination covering disability at payment by the treatment review date",
                );
              }
              // Exception 03 does not impose exception 20's pre-payment certification rule.
              exceptionCode = "03";
              break;
            case "death_beneficiary":
              if (
                !r.death_benefit ||
                claim.decedent_tin !== r.death_benefit.decedent_tin ||
                p.payment_date < r.death_benefit.death_date
              ) {
                throw new Error(
                  "Death exception needs the matched decedent and a payment on or after death",
                );
              }
              exceptionCode = "04";
              break;
            case "terminal_illness": {
              const signed = claim.certification_signed_on;
              if (
                claim.patient_tin !== id ||
                claim.examination_or_evidence_review_date < dob ||
                claim.examination_or_evidence_review_date > signed ||
                signed > p.payment_date
              ) {
                throw new Error(
                  "Terminal illness needs this owner's physician certification signed on or before payment after examination or evidence review",
                );
              }
              if (
                claim.administration.route === "plan_permits" &&
                (claim.administration
                      .certification_furnished_to_administrator_on < signed ||
                  claim.administration
                      .certification_furnished_to_administrator_on >
                    p.payment_date)
              ) {
                throw new Error(
                  "Terminal illness plan receipt must follow certification and precede payment",
                );
              }
              exceptionCode = "20";
              break;
            }
            case "separation_after_age55":
              if (
                r.plan_type !== "qualified_employer_plan" ||
                claim.separation_date.slice(0, 4) <
                  addCalendarMonths(dob, 55 * 12).slice(0, 4) ||
                claim.separation_date > p.payment_date
              ) {
                throw new Error(
                  "Age-55 separation exception needs the separating employer's plan and qualifying separation year before payment",
                );
              }
              exceptionCode = "01";
              break;
            case "qdro_alternate_payee":
              if (
                r.plan_type !== "qualified_employer_plan" ||
                claim.alternate_payee_tin !== id ||
                claim.order_date > p.payment_date ||
                claim.order_date < dob
              ) {
                throw new Error(
                  "QDRO exception needs an employer plan, this alternate payee and an order effective by payment",
                );
              }
              exceptionCode = "06";
              break;
            case "irs_levy":
              if (
                claim.levy_date > p.payment_date || claim.levy_date < dob ||
                claim.amount_paid_under_levy !== p.gross
              ) {
                throw new Error(
                  "IRS levy exception needs a dated levy on the account covering the actual entire payment",
                );
              }
              exceptionCode = "10";
              break;
            case "age59_half":
              if (p.payment_date < age595) {
                throw new Error(
                  "Age exception needs an actual payment on or after age 59 1/2",
                );
              }
              exceptionCode = "12";
              break;
          }
          exemptions.push({
            payment_reference: p.record_reference,
            code: exceptionCode,
            taxable: p.taxable,
          });
        }
      }
    }
    if (r.death_benefit && r.disability_income) {
      throw new Error(
        "Inherited death-benefit income cannot be classified as the beneficiary's disability pension",
      );
    }
    const disability = splitDisabilityIncome2026({
      review: r.disability_income,
      owner_tin: id,
      account_number: c.account_number,
      owner_dob: c.recipient === "spouse"
        ? input.spouse_dob!
        : input.taxpayer_dob,
      ira,
      code,
      has_disability_exception: exemptions.some((e) => e.code === "03"),
      gross: c.box1_gross_distribution,
      taxable,
      early_payments: earlyPayments,
    });
    if (r.disability_income?.kind === "employer_disability_pension") {
      const d = r.disability_income;
      const planDates = JSON.stringify([
        d.disability_retirement_date,
        d.minimum_retirement_age_date,
      ]);
      if (
        disabilityPlanDates.has(accountKey) &&
        disabilityPlanDates.get(accountKey) !== planDates
      ) {
        throw new Error(
          "Disability pension plan dates disagree across current statements for one owner/account",
        );
      }
      disabilityPlanDates.set(accountKey, planDates);
      // Early payment ledgers have already registered these same reconciled records.
      if (!r.early_distribution) {
        for (const p of d.payments) {
          const key = JSON.stringify([
            id,
            c.payer_tin,
            c.account_number,
            p.record_reference,
          ]);
          if (paymentRecords.has(key)) {
            throw new Error(
              "Disability payment record is reused across current statements for the same owner/account",
            );
          }
          paymentRecords.add(key);
        }
      }
    }
    const projected = sharedItem.parse({
      payer_name: c.payer_name,
      payer_ein: c.payer_tin,
      recipient_ssn: id,
      source_document_reference: c.source_document_reference,
      account_number: c.account_number,
      ts: c.recipient === "spouse" ? "S" : "T",
      box1_gross_distribution: c.box1_gross_distribution,
      box2a_taxable_amount: taxable,
      box4_federal_withheld: c.box4_federal_withheld,
      box7_distribution_code: code,
      box7_ira_simple_indicator: ira,
      direct_rollover_confirmed: code === "G",
    });
    // No QCD or PSO exclusions can enter this projection. Their source routes
    // will supply annual policy when implemented, rather than borrowing 2025 limits.
    const parts = disability.pension_payments === undefined ? [projected] : [
      { payments: disability.wage_payments, wages: true },
      { payments: disability.pension_payments, wages: false },
    ].filter((part) => part.payments.length > 0).map((part) => ({
      ...projected,
      box1_gross_distribution: sumSourceMoney(
        part.payments.map((p) => p.gross),
      ),
      box2a_taxable_amount: sumSourceMoney(part.payments.map((p) => p.taxable)),
      box4_federal_withheld: 0,
      disability_flag: part.wages,
      disability_as_wages: part.wages,
    }));
    const calculated = calculateReportedRetirementIncome(parts, {
      qcdAnnualLimit: 0,
      psoExclusionLimit: 0,
    });
    // Annual Form 8606 owns taxable IRA income. Do not retain a per-copy
    // gross-as-taxable projection that a later consumer could mistake for it.
    if (basis) delete calculated.iraFields.line4b_ira_taxable;
    // Withholding belongs to the issued copy, not each income-classification part.
    calculated.withholdingFields = c.box4_federal_withheld > 0
      ? { line25b_withheld_1099: c.box4_federal_withheld }
      : {};
    return {
      copy: c,
      review: r,
      owner_tin: id,
      taxable: basis ? undefined : taxable,
      direct_transfers: directTransfers,
      ira_basis_owner_tin: basis?.owner_tin,
      ira_nonconversion_before_basis: basisAmounts?.nonconversion,
      disability_wage_payments: disability.wage_payments,
      calculated,
      exemptions: exemptions.map((e) => ({
        ...e,
        taxable: basis ? undefined : e.taxable,
        ira_amount_before_basis: basis ? e.taxable : undefined,
      })),
      early_tax_rate: early ? (code === "S" ? 25 : 10) : undefined,
    };
  });
  const cents = {
    line1h_disability_wages: sumSourceMoney(
      rows.map((r) => r.calculated.disWagesFields.line1h_other_earned ?? 0),
    ),
    line4a_ira_gross: sumSourceMoney(
      rows.map((r) => r.calculated.iraFields.line4a_ira_gross ?? 0),
    ),
    line4b_ira_taxable: sumSourceMoney(
      [
        ...rows.filter((r) => !r.ira_basis_owner_tin).map((r) =>
          r.calculated.iraFields.line4b_ira_taxable ?? 0
        ),
        ...(iraBasis?.calculation.forms.map((o) => o.taxable_ira_income) ?? []),
      ],
    ),
    line5a_pension_gross: sumSourceMoney(
      rows.map((r) => r.calculated.pensionFields.line5a_pension_gross ?? 0),
    ),
    line5b_pension_taxable: sumSourceMoney(
      rows.map((r) => r.calculated.pensionFields.line5b_pension_taxable ?? 0),
    ),
    line25b_withheld_1099: sumSourceMoney(
      rows.map((r) =>
        r.calculated.withholdingFields.line25b_withheld_1099 ?? 0
      ),
    ),
  };
  const earlyRows = rows.filter((r) => r.early_tax_rate !== undefined);
  const directEarlyTax = earlyRows.length > 0 &&
    rows.every((r) =>
      r.copy.box7a_distribution_codes[0] === "1" &&
      r.exemptions.length === 0 &&
      r.taxable === r.copy.box1_gross_distribution
    );
  const earlyOwners = (["taxpayer", "spouse"] as const).flatMap((owner) => {
    const owned = earlyRows.filter((r) => r.copy.recipient === owner);
    if (!owned.length) return [];
    const taxable = (r: typeof rows[number]) => r.taxable ?? 0;
    const basis = iraBasis?.calculation.forms.find((f) =>
      f.owner_tin === owned[0].owner_tin
    );
    const basisRows = owned.filter((r) => r.ira_basis_owner_tin);
    const regularRows = owned.filter((r) => !r.ira_basis_owner_tin);
    const basisTaxable = (
      amount: number,
      cap = basis?.amounts.taxableDistribution ?? 0,
    ) =>
      Math.min(
        cap,
        Math.max(
          0,
          roundWholeDollars(amount) -
            roundWholeDollars(
              roundWholeDollars(amount) * (basis?.amounts.ratio ?? 0),
            ),
        ),
      );
    const basisEarly = basisTaxable(
      sumSourceMoney(basisRows.map((r) => r.ira_nonconversion_before_basis!)),
    );
    const basisExempt = basisTaxable(
      sumSourceMoney(
        basisRows.flatMap((r) =>
          r.exemptions.map((e) => e.ira_amount_before_basis!)
        ),
      ),
      basisEarly,
    );
    const basisSimple = basisTaxable(
      sumSourceMoney(
        basisRows.filter((r) => r.early_tax_rate === 25).map((r) =>
          r.ira_nonconversion_before_basis!
        ),
      ),
      basisEarly,
    );
    const basisSimpleExempt = basisTaxable(
      sumSourceMoney(
        basisRows.filter((r) => r.early_tax_rate === 25).flatMap((r) =>
          r.exemptions.map((e) => e.ira_amount_before_basis!)
        ),
      ),
      Math.min(basisSimple, basisExempt),
    );
    const total = sumSourceMoney([...regularRows.map(taxable), basisEarly]);
    const simple = sumSourceMoney(
      [
        ...regularRows.filter((r) => r.early_tax_rate === 25).map(taxable),
        basisSimple,
      ],
    );
    const exempt = sumSourceMoney(
      [
        ...regularRows.flatMap((r) => r.exemptions.map((e) => e.taxable!)),
        basisExempt,
      ],
    );
    const simpleExempt = sumSourceMoney(
      [
        ...regularRows.filter((r) => r.early_tax_rate === 25)
          .flatMap((r) => r.exemptions.map((e) => e.taxable!)),
        basisSimpleExempt,
      ],
    );
    const codes = [
      ...new Set(owned.flatMap((r) => r.exemptions.map((e) => e.code))),
    ];
    // Subtract the filed whole-dollar lines. Allocate the remaining SIMPLE
    // amount at 25%, bounded by line 3 to avoid a rounding-only negative regular base.
    const line1 = roundWholeDollars(total),
      line2 = roundWholeDollars(exempt),
      line3 = line1 - line2,
      simpleBase = Math.min(
        line3,
        roundWholeDollars(
          (sourceCents(simple) - sourceCents(simpleExempt)) / 100,
        ),
      );
    return [{
      owner,
      owner_tin: owned[0].owner_tin,
      source_document_references: owned.map((r) =>
        r.copy.source_document_reference
      ),
      taxable_cents: total,
      simple_taxable_cents: simple,
      exempt_taxable_cents: exempt,
      simple_exempt_taxable_cents: simpleExempt,
      exception_code: codes.length > 1 ? "99" : codes[0],
      line1,
      line2,
      line3,
      line4: roundWholeDollars(
        earlyDistributionAdditionalTax(line3 - simpleBase, simpleBase),
      ),
      file_form5329: !directEarlyTax,
    }];
  });
  const earlyTax = directEarlyTax
    ? roundWholeDollars(
      earlyDistributionAdditionalTax(
        roundWholeDollars(
          sumSourceMoney(earlyOwners.map((o) => o.taxable_cents)),
        ),
        0,
      ),
    )
    : earlyOwners.reduce((n, o) => n + o.line4, 0);
  const pensionRollover = rows.some((r) =>
    r.review.direct_rollover !== undefined || r.direct_transfers !== undefined
  );
  const hasIra = rows.some((r) => r.copy.box7b_ira_sep_simple);
  const hasPension = rows.some((r) =>
    r.calculated.pensionFields.line5b_pension_taxable !== undefined
  );
  const lines = Object.fromEntries(
    Object.entries(cents).map((
      [key, value],
    ) => [key, roundWholeDollars(value)]),
  ) as typeof cents;
  const filed_lines = {
    ...(iraBasis?.calculation.forms.some((o) => o.raw_qualified_hsa_funding > 0)
      ? { line4c_other: true, line4c_other_text: "HFD" as const }
      : {}),
    ...(hasIra ? { line4b_ira_taxable: lines.line4b_ira_taxable } : {}),
    ...(hasIra && (cents.line4a_ira_gross !== cents.line4b_ira_taxable ||
        rows.filter((r) => r.copy.box7b_ira_sep_simple).length > 1 ||
        iraBasis?.calculation.forms.some((o) =>
          o.requires_form8606 && o.raw_gross > 0
        ))
      ? { line4a_ira_gross: lines.line4a_ira_gross }
      : {}),
    ...(hasPension
      ? { line5b_pension_taxable: lines.line5b_pension_taxable }
      : {}),
    ...(hasPension &&
        (pensionRollover ||
          cents.line5a_pension_gross !== cents.line5b_pension_taxable)
      ? { line5a_pension_gross: lines.line5a_pension_gross }
      : {}),
    ...(pensionRollover ? { line5c_rollover: true } : {}),
  };
  return {
    source_input: input,
    form4852: substitutes,
    plan_transfers: planTransfers,
    ira_basis: iraBasis,
    early_owners: earlyOwners,
    line5_early_tax: earlyTax,
    form5329_not_required: directEarlyTax,
    rows,
    excluded_document_references: [...retired],
    cents,
    lines,
    filed_lines,
    has_ira: hasIra,
    has_pension: hasPension,
    pension_rollover: pensionRollover,
  };
}

export function retirementIssuedAttachments2026(
  result: ReturnType<typeof calculateRetirementSources2026>,
) {
  const substituteRefs = new Set(
    result.form4852?.substitute_retirement_copies.map((c) =>
      c.source_document_reference
    ) ?? [],
  );
  return result.rows.filter((r) =>
    r.copy.box4_federal_withheld > 0 &&
    !substituteRefs.has(r.copy.source_document_reference)
  )
    .map((r) => issuedPdfAttachment2026(r.copy, "Form 1099-R"));
}
