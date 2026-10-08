import { z } from "zod";
import { retirementAccountTypeSchema } from "./retirement-account.ts";
const ref = z.string().trim().min(1);
const ssn = z.string().regex(/^\d{9}$/);
const account = z.object({
  owner_ssn: ssn,
  custodian_ein: ssn,
  account_number: ref,
  account_type: retirementAccountTypeSchema,
}).strict();
const receipt = account.extend({
  source_document_reference: ref,
  designated_tax_year: z.number().int().min(1998).max(2025),
  received_on: z.string().date(),
  amount: z.number().positive(),
  regular_cash_contribution: z.literal(true),
}).strict();
export const qualifiedRothReviewSchema = z.object({
  registration: account.extend({
    source_document_reference: ref,
    original_owner_ssn: ssn,
    original_account_number: ref,
  }).strict(),
  first_contribution: receipt,
  first_form5498: account.extend({
    source_document_reference: ref,
    tax_year: z.number().int(),
    box10_regular_roth_contributions: z.number().positive(),
  }).strict(),
  account_inventory: z.object({
    source_document_reference: ref,
    owner_ssn: ssn,
    all_owned_roth_accounts_included: z.literal(true),
    accounts: z.array(
      account.extend({
        first_contribution_tax_year: z.number().int().min(1998).max(2025),
      }).strict(),
    ).min(1),
  }).strict(),
  eligibility: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("age_59_5"),
      source_document_reference: ref,
      owner_ssn: ssn,
      date_of_birth: z.string().date(),
    }).strict(),
    z.object({
      kind: z.literal("inherited_after_death"),
      source_document_reference: ref,
      original_owner_ssn: ssn,
      died_on: z.string().date(),
    }).strict(),
  ]),
}).strict();
export type QualifiedRothReview = z.infer<typeof qualifiedRothReviewSchema>;
export function qualifiedRothDocuments(r: QualifiedRothReview) {
  return [
    r.registration,
    r.first_contribution,
    r.first_form5498,
    r.account_inventory,
    r.eligibility,
  ];
}
export function assertQualifiedRothSource(
  item: {
    distribution_code?: string;
    recipient_ssn?: string;
    payer_tin?: string;
    account_number?: string;
    taxable_amount?: number;
    distribution_source?: { account_type?: string; paid_on: string };
    qualified_roth_review?: QualifiedRothReview;
  },
  general?: Record<string, unknown>,
  spouse = false,
) {
  const r = item.qualified_roth_review;
  if (item.distribution_code !== "Q") {
    if (r) {
      throw new Error("Qualified Roth evidence requires actual Code Q payment");
    }
    return;
  }
  if (!r || !item.distribution_source) {
    throw new Error(
      "Form4852 Code Q needs retained account, first contribution, issued5498 and eligibility records",
    );
  }
  const {
    registration: a,
    first_contribution: c,
    first_form5498: f,
    account_inventory: i,
    eligibility: e,
  } = r;
  const owner = item.recipient_ssn?.replace(/\D/g, "");
  const original = a.original_owner_ssn;
  const roth = (type: string) =>
    ["ordinary_roth_ira", "roth_simple_ira", "roth_sep_ira"].includes(type);
  const key = (
    v: { owner_ssn: string; custodian_ein: string; account_number: string },
  ) => `${v.owner_ssn}/${v.custodian_ein}/${v.account_number}`;
  const first = i.accounts.find((v) => key(v) === key(c));
  const current = i.accounts.find((v) =>
    v.owner_ssn === original && v.custodian_ein === a.custodian_ein &&
    v.account_number === a.original_account_number
  );
  const y = c.designated_tax_year;
  const actualDate = (v: string) => {
    const d = new Date(`${v}T00:00:00Z`);
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
  };
  if (
    ![
      c.received_on,
      item.distribution_source.paid_on,
      e.kind === "age_59_5" ? e.date_of_birth : e.died_on,
    ].every(actualDate)
  ) {
    throw new Error(
      "Form4852 qualified Roth records need actual calendar dates",
    );
  }
  if (
    a.owner_ssn !== owner ||
    a.custodian_ein !== item.payer_tin?.replace(/\D/g, "") ||
    a.account_number !== item.account_number ||
    a.account_type !== item.distribution_source.account_type ||
    !roth(a.account_type) || item.taxable_amount !== 0 ||
    c.owner_ssn !== original || i.owner_ssn !== original ||
    i.accounts.some((v) => v.owner_ssn !== original || !roth(v.account_type)) ||
    new Set(i.accounts.map(key)).size !== i.accounts.length || !first ||
    !current || current.account_type !== a.account_type ||
    first.first_contribution_tax_year !== y ||
    y !== Math.min(...i.accounts.map((v) => v.first_contribution_tax_year)) ||
    y > 2020 || key(c) !== key(f) || f.account_type !== c.account_type ||
    first.account_type !== c.account_type || f.tax_year !== y ||
    f.box10_regular_roth_contributions !== c.amount ||
    c.received_on < `${y}-01-01` || c.received_on > `${y + 1}-04-15` ||
    i.accounts.some((v) =>
      ["roth_simple_ira", "roth_sep_ira"].includes(v.account_type) &&
      v.first_contribution_tax_year < 2023
    ) || new Set(
        qualifiedRothDocuments(r).map((v) => v.source_document_reference),
      ).size !== 5
  ) {
    throw new Error(
      "Form4852 qualified Roth account/five-year source facts conflict",
    );
  }
  if (e.kind === "inherited_after_death") {
    if (
      e.original_owner_ssn !== original || original === owner ||
      e.died_on >= item.distribution_source.paid_on || c.received_on > e.died_on
    ) {
      throw new Error(
        "Form4852 qualified inherited Roth death/beneficiary source conflicts",
      );
    }
  } else {
    const b = new Date(`${e.date_of_birth}T00:00:00Z`);
    const month = new Date(
      Date.UTC(b.getUTCFullYear() + 59, b.getUTCMonth() + 6, 1),
    );
    const last = new Date(
      Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0),
    ).getUTCDate();
    const age = new Date(
      Date.UTC(
        month.getUTCFullYear(),
        month.getUTCMonth(),
        Math.min(b.getUTCDate(), last),
      ),
    ).toISOString().slice(0, 10);
    if (
      e.owner_ssn !== owner || original !== owner ||
      a.original_account_number !== a.account_number ||
      age > item.distribution_source.paid_on ||
      (general &&
        general[spouse ? "spouse_dob" : "taxpayer_dob"] !== e.date_of_birth)
    ) throw new Error("Form4852 qualified Roth age/owner source conflicts");
  }
}
