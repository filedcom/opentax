import { issuedPdfAttachment2026 } from "./issued-pdf.ts";
import { z } from "zod";
import { FilingStatus } from "../../nodes/types.ts";
import {
  calculateReportedRetirementIncome,
  DistributionCode,
  itemSchema as sharedItem,
} from "../../nodes/inputs/income/retirement/f1099r/index.ts";
import {
  isSourceMoney,
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
const address = z.object({
  street: ref,
  suite: z.string().optional(),
  city: ref,
  state_or_province: z.string(),
  country: ref,
  postal_code: ref,
}).strict();

/** Issued 2026 box facts. Advanced codes/boxes remain visible for explicit diagnostics. */
export const retirementCopy2026Schema = z.object({
  tax_year: z.literal(2026),
  source_document_reference: ref,
  issued_copy_pdf_base64: ref.optional(),
  issued_copy_pdf_sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  issued_copy_attachment_file_name: z.string().regex(
    /^[A-Za-z0-9][A-Za-z0-9_.-]*\.pdf$/,
  ).optional(),
  statement_identifier: ref,
  current_copy_review_reference: ref,
  corrected: z.boolean(),
  supersedes_document_reference: ref.optional(),
  payer_name: ref,
  payer_tin: tin,
  payer_address: address.optional(),
  recipient: z.enum(["taxpayer", "spouse"]),
  recipient_name: ref,
  recipient_tin: z.string().regex(/^(\d{9}|\d{3}-\d{2}-\d{4}|XXX-XX-\d{4})$/),
  recipient_identity_review_reference: ref,
  recipient_address: address.optional(),
  account_number: ref,
  box1_gross_distribution: money,
  box2a_taxable_amount: money.optional(),
  box2b_taxable_amount_not_determined: z.boolean(),
  box2b_total_distribution: z.boolean(),
  box3_capital_gain: money.default(0),
  box4_federal_withheld: money.default(0),
  box5_employee_contributions: money.default(0),
  box6_nua: money.default(0),
  box7a_distribution_codes: z.array(z.nativeEnum(DistributionCode)).min(1).max(
    2,
  ),
  box7b_ira_sep_simple: z.boolean(),
  box7c_trump_account: z.boolean(),
  box7d_excess_contribution_earnings: money.default(0),
  box8a_other_amount: money.default(0),
  box8b_annuity_percentage: z.number().min(0).max(100).optional(),
  box9a_percentage_of_total: z.number().min(0).max(100).optional(),
  box9b_employee_contributions: money.default(0),
  box10_irr_within_five_years: money.default(0),
  box11_first_roth_year: z.number().int().min(1998).max(2026).optional(),
  box12_fatca: z.boolean().default(false),
  box13_payment_date: date.optional(),
  state_information: z.array(
    z.object({
      state: ref,
      payer_state_id: ref,
      box14_state_withheld: money,
      box16_state_distribution: money,
    }).strict(),
  ).max(2).default([]),
  local_information: z.array(
    z.object({
      locality: ref,
      box17_local_withheld: money,
      box19_local_distribution: money,
    }).strict(),
  ).max(2).default([]),
}).strict();
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
    .literal(true),
  no_roth_ira_or_designated_roth_distribution_or_ira_conversion_verified: z
    .literal(true),
  no_form4972_nua_election_or_other_tax_method_verified: z.literal(true),
  no_unreported_excess_contributions_or_rmd_shortfall_verified: z.literal(true),
  no_ira_basis_or_current_nondeductible_contributions_verified: z.literal(true)
    .optional(),
  no_indirect_rollover_repayment_or_recharacterization_verified: z.literal(
    true,
  ),
  payer_determined_pension_taxability_verified: z.literal(true).optional(),
  payer_code2_exception_verified: z.literal(true).optional(),
  death_benefit: z.object({
    decedent_tin: tin,
    death_date: date,
    record_reference: ref,
    no_inherited_basis_or_special_tax_treatment_verified: z.literal(true),
  }).strict().optional(),
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
    copies: z.array(retirementCopy2026Schema).min(1).max(100),
    reviews: z.array(review).min(1).max(100),
  }).strict(),
}).strict();
export const retirementSource2026Schema = investmentOwner2026.extend({
  taxpayer_dob: date,
  spouse_dob: date.optional(),
  ...retirementClaim2026Schema.shape,
}).strict();
export type RetirementSource2026 = z.input<typeof retirementSource2026Schema>;
export type RetirementCopy2026 = z.input<typeof retirementCopy2026Schema>;

export function calculateRetirementSources2026(raw: RetirementSource2026) {
  const input = retirementSource2026Schema.parse(raw), claim = input.claim;
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
    const codes = c.box7a_distribution_codes;
    if (codes.length !== 1 || !["2", "4", "7", "G"].includes(codes[0])) {
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
      const age595 = new Date(`${dob}T00:00:00Z`);
      age595.setUTCFullYear(age595.getUTCFullYear() + 59);
      age595.setUTCMonth(age595.getUTCMonth() + 6);
      if (age595.toISOString().slice(0, 10) > "2026-12-31") {
        throw new Error(
          "Normal code 7 conflicts with filer age; review the issued distribution code",
        );
      }
    }
    if (code === "2" && !r.payer_code2_exception_verified) {
      throw new Error("Code 2 needs the payer's known-exception review");
    }
    if ((code === "4") !== !!r.death_benefit) {
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
    let taxable: number;
    if (ira) {
      if (
        code === "G" ||
        !r.no_ira_basis_or_current_nondeductible_contributions_verified ||
        c.box5_employee_contributions > 0 || c.box9b_employee_contributions > 0
      ) {
        throw new Error(
          "IRA rollover, contribution, or basis needs its Form 8606/source calculation",
        );
      }
      if (
        (!c.box2b_taxable_amount_not_determined ||
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
        !r.payer_determined_pension_taxability_verified ||
        c.box2b_taxable_amount_not_determined ||
        c.box2a_taxable_amount === undefined
      ) {
        throw new Error(
          "Pension taxable amount needs payer determination or an annuity/basis workpaper",
        );
      }
      taxable = c.box2a_taxable_amount;
    }
    if ((code === "G") !== !!r.direct_rollover) {
      throw new Error(
        "Direct rollover code G needs matching transfer evidence",
      );
    }
    if (r.direct_rollover) {
      const t = r.direct_rollover,
        roth = ["roth_ira", "designated_roth_plan"].includes(
          t.destination_type,
        );
      if (
        !t.transfer_date.startsWith("2026-") ||
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
    const calculated = calculateReportedRetirementIncome([projected], {
      qcdAnnualLimit: 0,
      psoExclusionLimit: 0,
    });
    return { copy: c, review: r, owner_tin: id, calculated };
  });
  const cents = {
    line4a_ira_gross: sumSourceMoney(
      rows.map((r) => r.calculated.iraFields.line4a_ira_gross ?? 0),
    ),
    line4b_ira_taxable: sumSourceMoney(
      rows.map((r) => r.calculated.iraFields.line4b_ira_taxable ?? 0),
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
  const pensionRollover = rows.some((r) =>
    r.review.direct_rollover !== undefined
  );
  const hasIra = rows.some((r) => r.copy.box7b_ira_sep_simple);
  const hasPension = rows.some((r) => !r.copy.box7b_ira_sep_simple);
  const lines = Object.fromEntries(
    Object.entries(cents).map((
      [key, value],
    ) => [key, roundWholeDollars(value)]),
  ) as typeof cents;
  const filed_lines = {
    ...(hasIra ? { line4b_ira_taxable: lines.line4b_ira_taxable } : {}),
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
  return result.rows.filter((r) => r.copy.box4_federal_withheld > 0)
    .map((r) => issuedPdfAttachment2026(r.copy, "Form 1099-R"));
}
