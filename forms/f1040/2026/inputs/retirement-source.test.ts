import { assertEquals, assertThrows } from "@std/assert";
import { calculateRetirementSources2026 } from "./retirement-source.ts";
import {
  retirementCopy2026,
  retirementSource2026,
} from "./retirement.fixture.ts";
import { DistributionCode as Code } from "../../nodes/inputs/income/retirement/f1099r/distribution-code.ts";
import { FilingStatus } from "../../nodes/types.ts";

Deno.test("2026 retirement uses shared gross/taxable calculation, adds cents once and retains source boxes", () => {
  const a = retirementCopy2026("ira-a", true),
    b = retirementCopy2026("ira-b", true),
    p = retirementCopy2026("pension");
  a.box2b_taxable_amount_not_determined = true;
  delete a.box2a_taxable_amount;
  p.box2a_taxable_amount = 10000.25;
  p.box5_employee_contributions = 2000;
  const r = calculateRetirementSources2026(retirementSource2026([a, b, p]));
  assertEquals(r.cents.line4b_ira_taxable, 24000.5);
  assertEquals(r.lines.line4b_ira_taxable, 24001);
  assertEquals(r.lines.line5a_pension_gross, 12000);
  assertEquals(r.lines.line5b_pension_taxable, 10000);
  assertEquals(r.cents.line25b_withheld_1099, 3000.75);
  assertEquals(r.filed_lines, {
    line4b_ira_taxable: 24001,
    line4a_ira_gross: 24001,
    line5b_pension_taxable: 10000,
    line5a_pension_gross: 12000,
  });
  assertEquals(r.rows[0].copy.box2a_taxable_amount, undefined);
  assertEquals(r.rows[2].copy.box5_employee_contributions, 2000);
});
Deno.test("2026 retirement corrections replace one current statement without double counting income or withholding", () => {
  const old = retirementCopy2026(),
    corrected = {
      ...old,
      source_document_reference: "corrected",
      corrected: true,
      supersedes_document_reference: old.source_document_reference,
      box1_gross_distribution: 9000.75,
      box2a_taxable_amount: 9000.75,
      box4_federal_withheld: 900.75,
    };
  const source = retirementSource2026([old, corrected]);
  source.claim.reviews.shift();
  const r = calculateRetirementSources2026(source);
  assertEquals(r.rows.length, 1);
  assertEquals(r.lines.line5b_pension_taxable, 9001);
  assertEquals(r.cents.line25b_withheld_1099, 900.75);
  assertEquals(r.excluded_document_references, [old.source_document_reference]);
  for (
    const mutate of [
      () => {
        source.claim.copies[1].supersedes_document_reference = "missing";
      },
      () => {
        source.claim.copies[1].account_number = "other-account";
      },
      () => {
        source.claim.reviews.push(source.claim.reviews[0]);
      },
    ]
  ) {
    const saved = structuredClone(source);
    mutate();
    assertThrows(() => calculateRetirementSources2026(source));
    Object.assign(source, saved);
  }
  const cycle = structuredClone(source);
  cycle.claim.copies[0].corrected = true;
  cycle.claim.copies[0].supersedes_document_reference = "corrected";
  assertThrows(() => calculateRetirementSources2026(cycle), Error, "cycle");
  const duplicate = retirementSource2026([old, {
    ...old,
    source_document_reference: "duplicate",
  }]);
  assertThrows(
    () => calculateRetirementSources2026(duplicate),
    Error,
    "two current copies",
  );
});
Deno.test("2026 direct plan rollovers reconcile zero taxable and taxable Roth destinations to actual transfers", () => {
  for (const roth of [false, true]) {
    const c = retirementCopy2026();
    c.box7a_distribution_codes = [Code.CodeG];
    c.box4_federal_withheld = 0;
    c.box2a_taxable_amount = roth ? 10000.25 : 0;
    const source = retirementSource2026([c]);
    source.claim.reviews[0].direct_rollover = {
      record_reference: "trustee-transfer",
      transfer_date: "2026-09-01",
      destination_account_reference: "destination-trustee-account",
      destination_type: roth ? "roth_ira" : "traditional_ira",
      amount_transferred: 12000.25,
      source_after_tax_basis: roth ? 2000 : 0,
      eligible_direct_transfer_no_rmd_or_other_ineligible_amount_verified: true,
      no_cash_received_by_filer_verified: true,
    };
    const r = calculateRetirementSources2026(source);
    assertEquals(r.filed_lines, {
      line5a_pension_gross: 12000,
      line5b_pension_taxable: roth ? 10000 : 0,
      line5c_rollover: true,
    });
    source.claim.reviews[0].direct_rollover.amount_transferred -= 1;
    assertThrows(
      () => calculateRetirementSources2026(source),
      Error,
      "reconcile to transfer",
    );
  }
});
Deno.test("2026 retirement binds joint and masked recipients and validates normal age death and payer exceptions", () => {
  const c = retirementCopy2026();
  c.recipient = "spouse";
  c.recipient_tin = "XXX-XX-7777";
  const source = retirementSource2026([c]);
  source.filing_status = FilingStatus.MFJ;
  source.spouse_ssn = "555667777";
  source.spouse_dob = "1960-01-01";
  assertEquals(
    calculateRetirementSources2026(source).rows[0].owner_tin,
    "555667777",
  );
  source.filing_status = FilingStatus.Single;
  assertThrows(
    () => calculateRetirementSources2026(source),
    Error,
    "joint return",
  );
  const young = retirementSource2026();
  young.taxpayer_dob = "1990-01-01";
  assertThrows(() => calculateRetirementSources2026(young), Error, "age");
  young.claim.copies[0].box7a_distribution_codes = [Code.Code2];
  assertThrows(
    () => calculateRetirementSources2026(young),
    Error,
    "known-exception",
  );
  young.claim.reviews[0].payer_code2_exception_verified = true;
  assertEquals(
    calculateRetirementSources2026(young).lines.line5b_pension_taxable,
    12000,
  );
  young.claim.copies[0].box7a_distribution_codes = [Code.Code4];
  assertThrows(() => calculateRetirementSources2026(young), Error, "decedent");
  young.claim.reviews[0].death_benefit = {
    decedent_tin: "333221111",
    death_date: "2025-09-01",
    record_reference: "death-record",
    no_inherited_basis_or_special_tax_treatment_verified: true,
  };
  assertEquals(
    calculateRetirementSources2026(young).lines.line5b_pension_taxable,
    12000,
  );
});
Deno.test("2026 retirement blocks incomplete taxability and unimplemented election/box routes explicitly", () => {
  const mutations: [
    string,
    (s: ReturnType<typeof retirementSource2026>) => void,
  ][] = [
    ["Trump", (s) => {
      s.claim.copies[0].box7c_trump_account = true;
    }],
    ["earnings", (s) => {
      s.claim.copies[0].box7d_excess_contribution_earnings = 9;
    }],
    ["dated payment", (s) => {
      s.claim.copies[0].box7a_distribution_codes = [Code.Code1];
    }],
    ["source route", (s) => {
      s.claim.copies[0].box7a_distribution_codes = [Code.CodeY, Code.Code7];
    }],
    ["special", (s) => {
      s.claim.copies[0].box6_nua = 1000;
    }],
    ["special", (s) => {
      s.claim.copies[0].box8b_annuity_percentage = 100;
    }],
    ["payer determination", (s) => {
      s.claim.copies[0].box2b_taxable_amount_not_determined = true;
    }],
    ["payer determination", (s) => {
      delete s.claim.copies[0].box2a_taxable_amount;
    }],
    ["source base", (s) => {
      s.claim.copies[0].box2a_taxable_amount = 13000;
    }],
    ["transfer evidence", (s) => {
      s.claim.copies[0].box7a_distribution_codes = [Code.CodeG];
    }],
    ["7b", (s) => {
      s.claim.copies[0].box7b_ira_sep_simple = true;
    }],
    ["year end", (s) => {
      s.claim.reviewed_on = "2026-12-31";
    }],
    ["birth date", (s) => {
      s.taxpayer_dob = "2027-01-01";
    }],
    ["source base", (s) => {
      s.claim.copies[0].state_information = [{
        state: "NY",
        payer_state_id: "ny-id",
        box14_state_withheld: 12000,
        box16_state_distribution: 12000.25,
      }];
    }],
    ["duplicate state", (s) => {
      s.claim.copies[0].state_information = [0, 1].map(() => ({
        state: "NY",
        payer_state_id: "ny-id",
        box14_state_withheld: 100,
        box16_state_distribution: 12000.25,
      }));
    }],
  ];
  for (const [message, change] of mutations) {
    const s = retirementSource2026();
    change(s);
    assertThrows(() => calculateRetirementSources2026(s), Error, message);
  }
  const ira = retirementSource2026([retirementCopy2026("ira", true)]);
  ira.claim.copies[0].box2b_taxable_amount_not_determined = true;
  ira.claim.copies[0].box2a_taxable_amount = 5000;
  assertThrows(() => calculateRetirementSources2026(ira), Error, "no-basis");
  delete ira.claim.copies[0].box2a_taxable_amount;
  delete ira.claim.reviews[0]
    .no_ira_basis_or_current_nondeductible_contributions_verified;
  assertThrows(() => calculateRetirementSources2026(ira), Error, "Form 8606");
  const s = retirementSource2026();
  s.claim.copies[0].box4_federal_withheld = 1.001;
  assertThrows(() => calculateRetirementSources2026(s));
});
