import { form8962FamilySourceInputs } from "./form8962_family_source.fixture.ts";
const blank = () => ({
  wages: 0,
  taxable_interest: 0,
  tax_exempt_interest: 0,
  ordinary_dividends: 0,
  taxable_ira_distributions: 0,
  taxable_pensions: 0,
  social_security_total: 0,
  social_security_taxable: 0,
  capital_gain: 0,
  additional_income: 0,
  adjustments: 0,
  foreign_earned_income_exclusion: 0,
});
/** Synthetic ordinary reviewed facts, not authenticated payroll or agency records. */
export function form8962JointIncomeSources(
  kind: "low" | "high" | "mixed" | "retirement-capital" = "low",
): any {
  const input = form8962FamilySourceInputs(
    kind === "high" ? 9 : 4,
    kind === "high" ? "AK" : "TX",
    true,
  );
  delete input.general.ptc_spouse_income_review;
  const base = structuredClone(input.w2[0]);
  const wages = kind === "high" ? [140000, 60000, 51000] : [30000, 20000];
  input.w2 = wages.map((amount, i) => ({
    ...base,
    employee_ssn: i === 0 ? "123456789" : "234567890",
    tax_year: 2025,
    source_document_reference: `2025-${i === 0 ? "Alex" : "Jordan"}-W2-${i}`,
    employer_name: `Employer ${i + 1}`,
    employer_ein: String(223344550 + i),
    box1_wages: amount,
    box2_fed_withheld: kind === "high" ? (i === 0 ? 15000 : 5000) : 1500,
    box3_ss_wages: amount,
    box4_ss_withheld: amount * .062,
    box5_medicare_wages: amount,
    box6_medicare_withheld: amount * .0145,
  }));
  const ownerAmounts = [blank(), blank()];
  ownerAmounts[0].wages = wages[0];
  ownerAmounts[1].wages = wages.slice(1).reduce((a, b) => a + b, 0);
  if (kind === "mixed") {
    input.f1099int = [{
      payer_name: "Bank",
      payer_tin: "334455660",
      recipient_tin: "234567890",
      source_document_reference: "2025-Jordan-INT",
      tax_year: 2025,
      box1: 500,
      box4: 25,
      account_number: "S-INT-1",
      box8: 200,
    }];
    input.f1099div = [{
      payerName: "Investment fund",
      payerTin: "334455661",
      recipient_tin: "234567890",
      source_document_reference: "2025-Jordan-DIV",
      tax_year: 2025,
      isNominee: false,
      box11: false,
      box1a: 400,
      box4: 20,
      account_number: "S-DIV-1",
    }];
    input.f1099oid = [{
      payer_name: "Bond issuer",
      payer_tin: "334455662",
      recipient_tin: "123456789",
      source_document_reference: "2025-Alex-OID",
      tax_year: 2025,
      box1_oid: 50,
      box4_federal_withheld: 5,
      account_number: "T-OID-1",
    }];
    input.f1099g = [{
      payer_name: "State unemployment agency",
      payer_tin: "334455663",
      recipient_tin: "234567890",
      source_document_reference: "2025-Jordan-G",
      tax_year: 2025,
      box_1_unemployment: 1000,
      box_4_federal_withheld: 100,
      account_number: "S-G-1",
    }];
    ownerAmounts[0].taxable_interest = 50;
    ownerAmounts[1].taxable_interest = 500;
    ownerAmounts[1].tax_exempt_interest = 200;
    ownerAmounts[1].ordinary_dividends = 400;
    ownerAmounts[1].additional_income = 1000;
  }
  if (kind === "retirement-capital") {
    input.f1099r = [{
      payer_name: "IRA custodian",
      payer_ein: "334455664",
      recipient_ssn: "234567890",
      source_document_reference: "2025-Jordan-R",
      tax_year: 2025,
      ts: "S",
      box1_gross_distribution: 1500,
      box2a_taxable_amount: 1500,
      box4_federal_withheld: 150,
      account_number: "S-IRA-1",
      payer_address_line1: "2 Custodian Avenue",
      payer_address_city: "Austin",
      payer_address_state: "TX",
      payer_address_zip: "78701",
      box7_distribution_code: "2",
      box7_ira_simple_indicator: true,
    }];
    input.f1099b = [{
      payer_tin: "334455665",
      recipient_ssn: "123456789",
      source_document_reference: "2025-Alex-B",
      tax_year: 2025,
      account_number: "ACCOUNT-1",
      transaction_id: "SALE-1",
      part: "A",
      description: "100 ordinary shares",
      date_acquired: "2025-01-02",
      date_sold: "2025-10-02",
      proceeds: 3000,
      cost_basis: 2000,
      federal_withheld: 50,
    }];
    ownerAmounts[1].taxable_ira_distributions = 1500;
    ownerAmounts[0].capital_gain = 1000;
  }
  const sources = [
    "w2",
    "f1099int",
    "f1099div",
    "f1099oid",
    "f1099g",
    "f1099r",
    "f1099b",
  ].flatMap(
    (key) =>
      (input[key] ?? []).map((r: any, i: number) => ({
        input_key: key,
        source_index: i,
        source_document_reference: r.source_document_reference,
        owner_ssn: r.employee_ssn ?? r.recipient_tin ?? r.recipient_ssn,
        tax_year: 2025,
        source_record: structuredClone(r),
      })),
  );
  input.general.ptc_joint_income_review = {
    tax_year: 2025,
    review_reference: `2025-${kind}-complete-joint-source-inventory`,
    reviewed_on: "2026-02-01",
    reviewer_name: "Source Reviewer",
    owners: ["123456789", "234567890"].map((id, i) => ({
      owner_ssn: id,
      income_amounts: ownerAmounts[i],
      income_source_references: sources.filter((s) => s.owner_ssn === id).map(
        (s) => s.source_document_reference,
      ),
    })),
    sources,
  };
  return input;
}
