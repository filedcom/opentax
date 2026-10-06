import { type FilerIdentity } from "../mef/header.ts";
import { effectiveTaxable, FormType } from "../nodes/inputs/f4852/index.ts";
import { w2ItemSchema as w2Schema } from "../nodes/inputs/w2/index.ts";
import { itemSchema as r1099Schema } from "../nodes/inputs/f1099r/index.ts";
import { reconcileForm4852Source } from "./form4852_source.ts";

/** Derive transmitted sources only; never feed these copies back into calculation. */
export function form4852NativeSources(
  pending: Readonly<Record<string, unknown>> | undefined,
  filer: FilerIdentity | undefined,
) {
  if (!pending?.f4852) return { w2s: [], f1099rs: [] };
  if (!filer) {
    throw new Error("Form 4852 native sources require filer identity");
  }
  const { f4852s } = reconcileForm4852Source(pending, filer);
  const w2s = [];
  const f1099rs = [];
  for (const item of f4852s) {
    const tin = item.payer_tin?.replace(/\D/g, "");
    if (!tin || !/^\d{9}$/.test(tin)) {
      throw new Error(
        "Form 4852 native source requires known nine-digit payer EIN; do not invent an unknown TIN",
      );
    }
    const reference = item.completed_form_review_reference!;
    const review = {
      kind: "typed" as const,
      source_document_reference: reference,
      reviewer_confirmed_nonstandard: true as const,
    };
    if (item.form_type === FormType.W2) {
      w2s.push(w2Schema.parse({
        employer_name: item.payer_name,
        employer_ein: tin,
        employer_address_line1: item.payer_address_line1,
        employer_address_city: item.payer_address_city,
        employer_address_state: item.payer_address_state,
        employer_address_zip: item.payer_address_zip,
        employee_ssn: item.recipient_ssn,
        source_document_reference: reference,
        nonstandard_document_review: review,
        box1_wages: item.wages ?? 0,
        box2_fed_withheld: item.federal_withheld ?? 0,
        box3_ss_wages: item.social_security_wages,
        box4_ss_withheld: item.social_security_withheld,
        box5_medicare_wages: item.medicare_wages,
        box6_medicare_withheld: item.medicare_withheld,
        box7_ss_tips: item.social_security_tips,
        box15_state: item.state_name,
        box20_locality_name: item.locality_name,
        box17_state_withheld: item.state_tax_withheld,
        box19_local_withheld: item.local_tax_withheld,
      }));
    } else {
      const code = item.distribution_code ?? "";
      f1099rs.push(r1099Schema.parse({
        payer_name: item.payer_name,
        payer_ein: tin,
        payer_address_line1: item.payer_address_line1,
        payer_address_city: item.payer_address_city,
        payer_address_state: item.payer_address_state,
        payer_address_zip: item.payer_address_zip,
        recipient_ssn: item.recipient_ssn,
        ts: item.subject_ts,
        recipient_address_line1: filer.address.line1,
        recipient_address_city: filer.address.city,
        recipient_address_state: filer.address.state,
        recipient_address_zip: filer.address.zip,
        source_document_reference: reference,
        nonstandard_document_review: review,
        box1_gross_distribution: item.gross_distribution,
        box2a_taxable_amount: effectiveTaxable(item),
        box2b_total_dist: item.total_distribution,
        box3_capital_gain: item.capital_gain,
        box4_federal_withheld: item.federal_withheld,
        box5_employee_contributions: item.employee_contributions,
        box7_distribution_code: code.slice(0, 1),
        box7_code2: code.length > 1 ? code.slice(1) : undefined,
        box7_ira_simple_indicator: item.is_ira,
        box14_state_tax: item.state_tax_withheld,
        box15_payer_state: item.state_name,
        box17_local_tax: item.local_tax_withheld,
        box18_locality_name: item.locality_name,
      }));
    }
  }
  return { w2s, f1099rs };
}
