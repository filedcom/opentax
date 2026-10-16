import { z } from "zod";
import {
  distributionSourceSchema,
  form4852CalculationSources,
  FormType,
  itemSchema as sharedItemSchema,
  payrollAllocationSchema,
} from "../../nodes/inputs/income/wages/f4852/index.ts";
import { reviewedForm4852AccountType } from "../../nodes/inputs/income/wages/f4852/retirement-account.ts";
import { DistributionCode } from "../../nodes/inputs/income/retirement/f1099r/distribution-code.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { wages2026 } from "../../nodes/config/2026-wages.ts";
import { w2Item2026Schema } from "./w2-source.ts";
import { retirementCopy2026Schema } from "./retirement-statement.ts";
import {
  isSourceMoney,
  sourceCents,
  sumSourceMoney,
} from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";
const ref = z.string().trim().min(1);
const tin = z.string().regex(/^\d{9}$/);
const date = z.string().date();
const money = z.number().finite().nonnegative().max(1_000_000_000).refine(
  isSourceMoney,
);
const base = {
  source_document_reference: ref,
  owner_tin: tin,
  payer_name: ref,
  payer_tin: tin,
  payer_address: z.object({
    street: ref,
    city: ref,
    state: ref,
    postal_code: ref,
  }).strict(),
  status: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("missing") }).strict(),
    z.object({ kind: z.literal("incorrect"), replaces_document_reference: ref })
      .strict(),
  ]),
  estimation_method: ref.max(4000),
  payer_efforts_explanation: ref.max(4000),
  payer_contact: z.object({
    record_reference: ref,
    contacted_on: date,
    method: ref,
  }).strict(),
  irs_notification: z.object({ record_reference: ref, notified_on: date })
    .strict(),
  best_estimate_of_all_payer_payments_and_withholding_verified: z.literal(true),
  no_corrected_statement_received_as_of_review_verified: z.literal(true),
};
const wageAmounts = z.object({
  wages: money,
  federal_withheld: money,
  social_security_wages: money,
  social_security_withheld: money,
  social_security_tips: money,
  medicare_wages: money,
  medicare_withheld: money,
  state_tax_withheld: money,
  local_tax_withheld: money,
  state_name: ref.optional(),
  locality_name: ref.optional(),
}).strict();
const retirementAmounts = z.object({
  gross_distribution: money,
  taxable_amount: money.optional(),
  taxable_amount_not_determined: z.boolean(),
  total_distribution: z.boolean(),
  capital_gain: money,
  employee_contributions: money,
  federal_withheld: money,
  state_tax_withheld: money,
  local_tax_withheld: money,
  state_name: ref.optional(),
  locality_name: ref.optional(),
  distribution_code: ref,
  is_ira: z.boolean(),
}).strict();
const record = z.discriminatedUnion("kind", [
  z.object({
    ...base,
    kind: z.literal("w2"),
    amounts: wageAmounts,
    payroll_allocations: z.array(payrollAllocationSchema).min(1).max(1000),
    // The form has no boxes 8–14 or state/local wage bases. A later bridge must
    // bind those facts separately; this initial ledger never guesses them.
    supplemental_wage_facts_review_reference: ref,
    no_allocated_tips_dependent_care_deferrals_special_pay_or_other_unprinted_wage_facts_verified:
      z.literal(true),
  }).strict(),
  z.object({
    ...base,
    kind: z.literal("1099r"),
    account_number: ref,
    amounts: retirementAmounts,
    distribution_sources: z.array(distributionSourceSchema).min(1).max(1000),
    plan_classification_review_reference: ref,
  }).strict(),
]);
/** Internal pre-calculation source ledger. Public intake/attachments must bind it
 * before native wage/retirement calculators can consume these estimates. */
export const form4852Source2026Schema = z.object({
  filing_status: z.nativeEnum(FilingStatus),
  taxpayer_ssn: tin,
  spouse_ssn: tin.optional(),
  claim: z.object({
    tax_year: z.literal(2026),
    record_reference: ref,
    reviewed_on: date,
    original_return_not_yet_filed_verified: z.literal(true),
    complete_original_corrected_and_substitute_inventory_verified: z.literal(
      true,
    ),
    records: z.array(record).min(1).max(100),
  }).strict(),
  issued_wages: z.array(w2Item2026Schema).max(100).default([]),
  issued_retirement_copies: z.array(retirementCopy2026Schema).max(100).default(
    [],
  ),
}).strict();
export type Form4852Source2026 = z.input<typeof form4852Source2026Schema>;
const wageKeys = [
  "wages",
  "federal_withheld",
  "social_security_wages",
  "social_security_withheld",
  "social_security_tips",
  "medicare_wages",
  "medicare_withheld",
  "state_tax_withheld",
  "local_tax_withheld",
] as const;
const retirementKeys = [
  "gross_distribution",
  "employee_contributions",
  "capital_gain",
  "federal_withheld",
  "state_tax_withheld",
  "local_tax_withheld",
] as const;
const normal = (s: string) => s.replaceAll("-", "");
export function calculateForm4852Sources2026(raw: Form4852Source2026) {
  const input = form4852Source2026Schema.parse(raw), claim = input.claim;
  if (claim.reviewed_on < "2027-03-01") {
    throw Error("Form 4852 review must follow February of the filing year");
  }
  const joint = input.filing_status === FilingStatus.MFJ;
  if (joint && (!input.spouse_ssn || input.spouse_ssn === input.taxpayer_ssn)) {
    throw Error("Form 4852 needs distinct joint return owners");
  }
  const owner = (id: string) => {
    if (id !== input.taxpayer_ssn && !(joint && id === input.spouse_ssn)) {
      throw Error("Form 4852 source owner must belong to this return");
    }
  };
  const refs = new Set<string>();
  const unique = (r: string) => {
    if (refs.has(r)) {
      throw Error("Form 4852 source references must be distinct");
    }
    refs.add(r);
  };
  unique(claim.record_reference);
  input.issued_wages.forEach((w) => owner(normal(w.employee_ssn)));
  const retirementOwner = (c: z.output<typeof retirementCopy2026Schema>) => {
    const id = c.recipient === "spouse" ? input.spouse_ssn : input.taxpayer_ssn;
    if (!id) {
      throw Error("Form 4852 original retirement copy lacks its actual owner");
    }
    owner(id);
    const reported = normal(c.recipient_tin);
    if (reported !== id && reported !== `XXXXX${id.slice(-4)}`) {
      throw Error(
        "Form 4852 original recipient identity does not match this return",
      );
    }
    return id;
  };
  input.issued_retirement_copies.forEach(retirementOwner);
  const issued = [...input.issued_wages, ...input.issued_retirement_copies];
  issued.forEach((c) => unique(c.source_document_reference));
  const excluded = new Set<string>(),
    identities = new Set<string>(),
    payments = new Set<string>();
  const rows = claim.records.map((r) => {
    owner(r.owner_tin);
    unique(r.source_document_reference);
    unique(r.payer_contact.record_reference);
    unique(r.irs_notification.record_reference);
    if (
      r.payer_contact.contacted_on < "2027-01-01" ||
      r.payer_contact.contacted_on > r.irs_notification.notified_on ||
      r.irs_notification.notified_on < "2027-03-01" ||
      r.irs_notification.notified_on > claim.reviewed_on
    ) {
      throw Error(
        "Form 4852 needs dated payer attempts before IRS notification and completed review",
      );
    }
    const identity = [
      r.kind,
      r.owner_tin,
      r.payer_tin,
      r.kind === "1099r" ? r.account_number : "",
    ].join(":");
    if (identities.has(identity)) {
      throw Error(
        "Form 4852 needs one annual substitute per owner and payer account",
      );
    }
    identities.add(identity);
    const originals = r.kind === "w2"
      ? input.issued_wages.filter((w) =>
        normal(w.employee_ssn) === r.owner_tin &&
        normal(w.employer_ein) === r.payer_tin
      )
      : input.issued_retirement_copies.filter((c) =>
        retirementOwner(c) === r.owner_tin &&
        c.payer_tin === r.payer_tin && c.account_number === r.account_number
      );
    if (
      r.status.kind === "missing"
        ? originals.length !== 0
        : originals.length !== 1 ||
          originals[0].source_document_reference !==
            r.status.replaces_document_reference
    ) {
      throw Error(
        "Form 4852 replacement must reconcile the actual original inventory; another current copy cannot be counted",
      );
    }
    if (r.status.kind === "incorrect") {
      // Correction chains need their own selection ledger; never drop only one
      // link and accidentally leave another original active.
      const original = originals[0];
      if (
        "corrected" in original &&
        (original.corrected || original.supersedes_document_reference)
      ) {
        throw Error(
          "Form 4852 retirement correction chains need current-copy reconciliation",
        );
      }
      excluded.add(r.status.replaces_document_reference);
    }
    const sources = r.kind === "w2"
      ? r.payroll_allocations
      : r.distribution_sources;
    const amounts = r.amounts;
    for (const s of sources) {
      unique(s.source_document_reference);
      if (
        s.owner_ssn !== r.owner_tin || s.payer_tin !== r.payer_tin ||
        !s.paid_on.startsWith("2026-")
      ) throw Error("Form 4852 payments need the actual 2026 owner and payer");
      for (const v of Object.values(s)) {
        if (typeof v === "number" && !money.safeParse(v).success) {
          throw Error("Form 4852 payment amounts need bounded exact cents");
        }
      }
      const key = "period_identifier" in s
        ? [
          r.owner_tin,
          r.payer_tin,
          s.payroll_account_reference,
          s.period_identifier,
        ].join(":")
        : [r.owner_tin, r.payer_tin, s.account_number, s.distribution_reference]
          .join(":");
      if (payments.has(key)) {
        throw Error("Form 4852 payments or payroll periods overlap");
      }
      payments.add(key);
      if (
        (s.state_tax_withheld > 0 &&
          (s.state_name !== amounts.state_name || !amounts.state_name)) ||
        (s.local_tax_withheld > 0 &&
          (s.locality_name !== amounts.locality_name || !amounts.locality_name))
      ) {
        throw Error(
          "Form 4852 state and locality withholding must reconcile to one printed jurisdiction",
        );
      }
    }
    if (r.kind === "w2") {
      unique(r.supplemental_wage_facts_review_reference);
      if (
        r.amounts.social_security_wages + r.amounts.social_security_tips >
          wages2026.ssWageBase
      ) {
        throw Error(
          "Form 4852 Social Security wages and tips exceed the annual wage base",
        );
      }
      for (const k of wageKeys) {
        if (
          sourceCents(r.amounts[k]) !==
            sourceCents(sumSourceMoney(r.payroll_allocations.map((s) => s[k])))
        ) {
          throw Error(
            `Form 4852 wage line ${k} disagrees with payroll records`,
          );
        }
      }
      const shared = sharedItemSchema.parse({
        form_type: FormType.W2,
        payer_name: r.payer_name,
        payer_tin: r.payer_tin,
        recipient_ssn: r.owner_tin,
        payer_address_line1: r.payer_address.street,
        payer_address_city: r.payer_address.city,
        payer_address_state: r.payer_address.state,
        payer_address_zip: r.payer_address.postal_code,
        completed_form_review_reference: r.source_document_reference,
        ...r.amounts,
      });
      const native = form4852CalculationSources([shared]).w2s[0];
      const {
        box12_entries: _b12,
        box14_entries: _b14,
        box14b_tipped_code: _code,
        qualified_tips_box14_review: _tips,
        flsa_overtime_review: _overtime,
        excess_deferral_review: _excess,
        ...stable
      } = native;
      return {
        source: r,
        wage: w2Item2026Schema.parse({ ...stable, tax_year: 2026 }),
        retirement_estimate: undefined,
      };
    }
    unique(r.plan_classification_review_reference);
    const codes = r.amounts.distribution_code.split("");
    if (
      codes.length < 1 || codes.length > 2 ||
      new Set(codes).size !== codes.length || codes.some((c) =>
        !Object.values(DistributionCode).includes(c as DistributionCode)
      )
    ) {
      throw Error(
        "Form 4852 retirement distribution codes must be actual supported code characters",
      );
    }
    const types = r.distribution_sources.map((s) =>
      reviewedForm4852AccountType({
        form_type: FormType.R_1099,
        distribution_code: r.amounts.distribution_code,
        is_ira: r.amounts.is_ira,
        distribution_source: s,
      }, true)
    );
    if (new Set(types).size !== 1) {
      throw Error("Form 4852 payments disagree on custodian account type");
    }
    for (const s of r.distribution_sources) {
      if (
        s.account_number !== r.account_number ||
        s.distribution_code !== r.amounts.distribution_code ||
        s.is_ira !== r.amounts.is_ira
      ) {
        throw Error(
          "Form 4852 retirement payments need matching account and reviewed distribution classification",
        );
      }
    }
    for (const s of r.distribution_sources) {
      if (
        (s.taxable_amount ?? 0) + s.employee_contributions >
          s.gross_distribution || s.capital_gain > (s.taxable_amount ?? 0)
      ) {
        throw Error(
          "Form 4852 retirement payment taxable and recovered basis exceed gross or included income",
        );
      }
    }
    for (const k of retirementKeys) {
      if (
        sourceCents(r.amounts[k]) !==
          sourceCents(sumSourceMoney(r.distribution_sources.map((s) =>
            s[k]
          )))
      ) {
        throw Error(
          `Form 4852 retirement line ${k} disagrees with payment records`,
        );
      }
    }
    if (r.amounts.taxable_amount_not_determined) {
      if (
        r.amounts.taxable_amount !== undefined ||
        r.distribution_sources.some((s) =>
          s.taxable_amount !== undefined ||
          s.taxable_amount_not_determined !== true
        )
      ) {
        throw Error(
          "Form 4852 undetermined taxable amount cannot contain an asserted taxable total",
        );
      }
    } else if (
      r.amounts.taxable_amount === undefined ||
      r.distribution_sources.some((s) =>
        s.taxable_amount === undefined ||
        s.taxable_amount_not_determined === true
      ) ||
      sourceCents(r.amounts.taxable_amount) !==
        sourceCents(
          sumSourceMoney(r.distribution_sources.map((s) => s.taxable_amount!)),
        )
    ) {
      throw Error(
        "Form 4852 taxable estimate must reconcile each payment; basis is not subtracted twice",
      );
    }
    if (
      (r.amounts.taxable_amount ?? 0) + r.amounts.employee_contributions >
        r.amounts.gross_distribution ||
      r.amounts.employee_contributions > r.amounts.gross_distribution ||
      r.amounts.capital_gain > (r.amounts.taxable_amount ?? 0)
    ) {
      throw Error(
        "Form 4852 retirement taxable or basis amounts exceed gross or included income",
      );
    }
    // Keep the source's unknown taxable amount, codes and plan classification.
    // It is not an issuer copy; a later retirement bridge must bind its tax
    // treatment review and substitute attachment rather than invent an original.
    return {
      source: r,
      wage: undefined,
      retirement_estimate: {
        ...r.amounts,
        account_number: r.account_number,
        source_document_reference: r.source_document_reference,
        owner_tin: r.owner_tin,
        payer_tin: r.payer_tin,
      },
    };
  });
  return {
    source_input: input,
    rows,
    excluded_document_references: [...excluded],
    current_issued_wages: input.issued_wages.filter((w) =>
      !excluded.has(w.source_document_reference)
    ),
    current_issued_retirement_copies: input.issued_retirement_copies.filter(
      (c) => !excluded.has(c.source_document_reference),
    ),
    substitute_wages: rows.flatMap((r) => r.wage ? [r.wage] : []),
    retirement_estimates: rows.flatMap((r) =>
      r.retirement_estimate ? [r.retirement_estimate] : []
    ),
  };
}
