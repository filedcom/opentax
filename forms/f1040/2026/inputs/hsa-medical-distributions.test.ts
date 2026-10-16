import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateHsaMedicalDistributions2026 as calculate,
  type HsaMedicalDistributions2026,
} from "./hsa-medical-distributions.ts";
import {
  type HsaDistributionSources2026,
  reconcileHsaDistributions2026,
} from "./hsa-distribution-source.ts";
import { hsaMedicalDistributions2026 as fixture } from "./hsa-medical-distributions.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { calculateItemizedExpenseSources2026 } from "./itemized-expense-source.ts";
function source(s = fixture()): HsaDistributionSources2026 {
  return {
    filing_status: s.filing_status,
    taxpayer_ssn: s.taxpayer_ssn,
    spouse_ssn: s.spouse_ssn,
    taxpayer_dob: s.taxpayer_dob,
    spouse_dob: s.spouse_dob,
    claim: s.claim,
  };
}
function rejects(
  edits: Array<(s: HsaMedicalDistributions2026) => void>,
  message?: string,
) {
  for (const edit of edits) {
    const s = fixture();
    edit(s);
    assertThrows(() => calculate(s), Error, message);
  }
}
Deno.test("2026 HSA distributions reconcile medical payments and apply age 65 only to the actual later payment", () => {
  const s = fixture(),
    before = structuredClone(s),
    r = calculate(s),
    o = r.owners[0];
  assertEquals(o.filed_part_ii, {
    line14a: 2000,
    line14b: 0,
    line14c: 2000,
    line15: 500,
    line16: 1500,
    line17a: true,
    line17b: 140,
  });
  assertEquals(
    o.payments.map((
      p,
    ) => [p.taxable_amount, p.excepted_taxable_amount, p.exception]),
    [[700, 0, undefined], [800, 800, "age_65"]],
  );
  assertEquals(r.medical_expenses[0].unallocated_qualified_expense, 300);
  assertEquals(s, before);
});
Deno.test("2026 HSA current corrected copies replace rather than add to retired statements", () => {
  const s = fixture(), old = structuredClone(s.claim.copies[0]);
  old.source_document_reference = "old-1099sa";
  old.box1_gross_distribution = 3000;
  old.issued_on = "2027-01-15";
  s.claim.copies.unshift(old);
  s.claim.copies[1].corrected = true;
  s.claim.copies[1].supersedes_document_reference =
    old.source_document_reference;
  const r = calculate(s);
  assertEquals(r.owners[0].gross_distributions, 2000);
  assertEquals(r.distribution_sources.retired_copy_references, ["old-1099sa"]);
  s.claim.accounts[0].payments[0].form1099sa_source_reference = "old-1099sa";
  assertThrows(() => calculate(s), Error, "actual current statement");
});
Deno.test("2026 HSA rejects orphaned branching cyclic and inconsistent correction histories", () => {
  rejects([
    (s) => {
      s.claim.copies[0].corrected = true;
    },
    (s) => {
      s.claim.copies[0].corrected = true;
      s.claim.copies[0].supersedes_document_reference = "missing";
    },
    (s) => {
      const f = structuredClone(s.claim.copies[0]);
      f.source_document_reference = "duplicate-current";
      s.claim.copies.push(f);
    },
    (s) => {
      const a = s.claim.copies[0], b = structuredClone(a);
      b.source_document_reference = "cycle";
      a.corrected = b.corrected = true;
      a.supersedes_document_reference = b.source_document_reference;
      b.supersedes_document_reference = a.source_document_reference;
      s.claim.copies.push(b);
    },
    (s) => {
      const a = s.claim.copies[0], b = structuredClone(a);
      b.source_document_reference = "correction";
      b.corrected = true;
      b.supersedes_document_reference = a.source_document_reference;
      const c = structuredClone(b);
      c.source_document_reference = "other-correction";
      s.claim.copies.push(b, c);
    },
    (s) => {
      const f = structuredClone(s.claim.copies[0]);
      f.source_document_reference = "correction";
      f.corrected = true;
      f.supersedes_document_reference = "1099sa";
      f.account_number = "wrong";
      s.claim.copies.push(f);
    },
  ]);
});
Deno.test("2026 HSA payments require actual identity account and source-cent statement totals", () => {
  rejects([
    (s) => {
      s.claim.copies[0].recipient_tin = "XXX-XX-9999";
    },
    (s) => {
      s.claim.copies[0].owner_tin = "400001038";
    },
    (s) => {
      s.claim.accounts[0].owner_tin = "400001038";
    },
    (s) => {
      s.claim.copies[0].box1_gross_distribution += .01;
    },
    (s) => {
      s.claim.accounts[0].payments[0].gross_amount += .001;
    },
    (s) => {
      s.claim.accounts[0].payments[0].earnings_on_excess = 1;
    },
    (s) => {
      s.claim.accounts[0].payments[0].distributed_on = "2025-12-31";
    },
    (s) => {
      s.claim.accounts[0].payments[0].distributed_on = "2026-02-30";
    },
    (s) => {
      s.claim.accounts[0].payments[1].custodian_transaction_identifier =
        "txn-1";
    },
    (s) => {
      s.claim.accounts[0].payments[1].record_reference = "june-payment";
    },
    (s) => {
      s.claim.accounts.push(structuredClone(s.claim.accounts[0]));
    },
    (s) => {
      s.claim.reviewed_on = "2026-11-01";
    },
  ]);
});
Deno.test("2026 HSA excess return copies retain gross and earnings but cannot receive an unreviewed exclusion", () => {
  const s = fixture();
  s.claim.copies[0].box3_distribution_code = "2";
  s.claim.copies[0].box2_earnings_on_excess = 50;
  s.claim.accounts[0].payments[0].earnings_on_excess = 50;
  assertEquals(
    reconcileHsaDistributions2026(source(s)).current_copies[0]
      .box2_earnings_on_excess,
    50,
  );
  assertThrows(() => calculate(s), Error, "separate source settlement");
});
Deno.test("2026 HSA stops death prohibited-transaction and MSA classifications before ordinary Part II", () => {
  rejects([
    (s) => {
      s.claim.copies[0].box3_distribution_code = "4";
    },
    (s) => {
      s.claim.copies[0].box3_distribution_code = "5";
    },
    (s) => {
      s.claim.copies[0].box3_distribution_code = "6";
    },
    (s) => {
      s.claim.copies[0].box4_fmv_on_death = 1;
    },
    (s) => {
      s.claim.copies[0].box5_account_type = "archer_msa";
    },
  ], "separate source settlement");
});
Deno.test("2026 HSA fully medical distributions need no taxable income or penalty", () => {
  const s = fixture(), e = s.medical_expenses[0];
  e.amount_paid = 2200;
  e.allocations[0].amount = e.allocations[1].amount = 1000;
  s.schedule_a_medical_sources = [];
  const o = calculate(s).owners[0];
  assertEquals([
    o.taxable_distributions,
    o.additional_tax,
    o.filed_part_ii.line17a,
  ], [0, 0, false]);
});
Deno.test("2026 HSA distributions without medical evidence remain taxable even when contributions are not eligible", () => {
  const s = fixture();
  s.medical_expenses = [];
  s.schedule_a_medical_sources = [];
  s.taxpayer_dob = "1980-01-01";
  const o = calculate(s).owners[0];
  assertEquals([o.taxable_distributions, o.additional_tax], [2000, 400]);
});
Deno.test("2026 HSA medical source cannot be overallocated reused or reimbursed twice", () => {
  rejects([
    (s) => {
      s.medical_expenses[0].allocations[0].amount = 801;
    },
    (s) => {
      s.medical_expenses[0].allocations[0].distribution_payment_reference =
        "missing";
    },
    (s) => {
      s.medical_expenses[0].allocations[1].distribution_payment_reference =
        "june-payment";
    },
    (s) => {
      s.medical_expenses[0].allocations[1].reimbursement_trace_reference =
        "trace-1";
    },
    (s) => {
      s.medical_expenses.push(structuredClone(s.medical_expenses[0]));
    },
    (s) => {
      const e = structuredClone(s.medical_expenses[0]);
      e.payment_reference = "renamed-payment";
      e.source_document_reference = "renamed-doc";
      s.medical_expenses.push(e);
    },
    (s) => {
      s.medical_expenses[0].insurance_or_other_non_hsa_reimbursement = 1001;
    },
    (s) => {
      s.medical_expenses[0].payer_tin = "400001039";
    },
  ]);
});
Deno.test("2026 HSA allocations cannot spend more than each actual distribution", () => {
  const s = fixture(), e = s.medical_expenses[0];
  s.schedule_a_medical_sources = [];
  e.amount_paid = 4000;
  e.allocations[0].amount = 1000.01;
  assertThrows(() => calculate(s), Error, "qualified expenses cannot exceed");
});
Deno.test("2026 HSA service dates must follow actual establishment and expenses may come from earlier years", () => {
  const s = fixture();
  s.schedule_a_medical_sources = [];
  s.medical_expenses[0].incurred_on = "2021-03-01";
  s.medical_expenses[0].paid_on = "2021-03-15";
  assertEquals(calculate(s).owners[0].qualified_medical_amount, 500);
  s.medical_expenses[0].incurred_on = "2019-12-31";
  assertThrows(() => calculate(s), Error, "predates");
  rejects([
    (s) => {
      s.medical_expenses[0].incurred_on = "2026-06-01";
    },
    (s) => {
      s.medical_expenses[0].paid_on = "2027-01-01";
    },
    (s) => {
      s.claim.accounts[0].hsa_established_on = "2020-01-02";
    },
  ]);
});
Deno.test("2026 HSA Schedule A source reconciliation prevents a second deduction", () => {
  const s = fixture();
  const r = calculateItemizedExpenseSources2026({
    filing_status: s.filing_status,
    taxpayer_ssn: s.taxpayer_ssn,
    medical_payments: s.schedule_a_medical_sources,
    tax_election: "income",
  });
  assertEquals(r.medical[0].eligible_amount, 300);
  rejects([
    (s) => {
      s.schedule_a_medical_sources[0].tax_free_funding_amount = 599.99;
    },
    (s) => {
      s.schedule_a_medical_sources[0].reimbursed_amount = 99.99;
    },
    (s) => {
      s.schedule_a_medical_sources[0].payment_reference = "renamed";
    },
    (s) => {
      s.schedule_a_medical_sources[0].source_document_reference =
        "renamed-bill";
      s.schedule_a_medical_sources[0].payment_reference = "renamed-payment";
    },
    (s) => {
      s.schedule_a_medical_sources[0].amount_paid++;
    },
    (s) => {
      s.schedule_a_medical_sources[0].patient_ssn = "400001038";
    },
    (s) => {
      s.schedule_a_medical_sources.push(
        structuredClone(s.schedule_a_medical_sources[0]),
      );
    },
  ]);
});
Deno.test("2026 HSA disability derives a payment-specific exception from actual physician evidence", () => {
  const s = fixture();
  s.taxpayer_dob = "1980-01-01";
  s.treatment_review.owners[0].disability = {
    kind: "permanent_total",
    review_reference: "disability-review",
    patient_tin: s.taxpayer_ssn,
    physician_record_reference: "doctor-record",
    physician_determination_signed_on: "2026-07-02",
    disability_onset_date: "2026-07-01",
    unable_to_perform_any_substantial_gainful_activity_verified: true,
    disability_caused_by_physical_or_mental_condition_verified: true,
    physician_expected_duration: "long_continued_indefinite",
    medical_evidence_covers_all_post_onset_payments_verified: true,
  };
  const o = calculate(s).owners[0];
  assertEquals(o.payments.map((p) => p.exception), [undefined, "disability"]);
  assertEquals(o.filed_part_ii.line17b, 140);
  s.claim.copies[0].box3_distribution_code = "3";
  assertThrows(() => calculate(s), Error, "disability-coded payment");
  s.claim.accounts[0].payments[0].distributed_on = "2026-07-01";
  assertEquals(calculate(s).owners[0].additional_tax, 0);
  s.treatment_review.owners[0].disability.patient_tin = "400001038";
  assertThrows(() => calculate(s), Error, "owner's dated physician");
});
Deno.test("2026 HSA disability code alone cannot supply an exception", () => {
  const s = fixture();
  s.claim.copies[0].box3_distribution_code = "3";
  assertThrows(() => calculate(s), Error, "disability-coded payment");
});
Deno.test("2026 HSA source cents aggregate before filed lines and additional tax rounding", () => {
  const s = fixture();
  s.taxpayer_dob = "1980-01-01";
  s.medical_expenses = [];
  s.schedule_a_medical_sources = [];
  s.claim.accounts[0].payments.forEach((p) => p.gross_amount = 1.49);
  s.claim.copies[0].box1_gross_distribution = 2.98;
  const o = calculate(s).owners[0];
  assertEquals([
    o.gross_distributions,
    o.filed_part_ii.line14a,
    o.filed_part_ii.line16,
    o.filed_part_ii.line17b,
  ], [2.98, 3, 3, 1]);
});
Deno.test("2026 HSA joint owners keep independent statement medical and exception amounts", () => {
  const s = fixture(), spouse = "400001038";
  s.filing_status = FilingStatus.MFJ;
  s.spouse_ssn = spouse;
  s.spouse_dob = "1980-01-01";
  const f = structuredClone(s.claim.copies[0]);
  f.owner_tin = f.recipient_tin = spouse;
  f.account_number = "HSA-2";
  f.source_document_reference = "spouse-1099sa";
  const a = structuredClone(s.claim.accounts[0]);
  a.owner_tin = spouse;
  a.account_number = "HSA-2";
  a.record_reference = "spouse-account";
  a.payments.forEach((p) => {
    p.record_reference = "spouse-" + p.record_reference;
    p.form1099sa_source_reference = "spouse-1099sa";
  });
  s.claim.copies.push(f);
  s.claim.accounts.push(a);
  const review = structuredClone(s.treatment_review.owners[0]);
  review.owner_tin = spouse;
  s.treatment_review.owners.push(review);
  assertEquals(
    calculate(s).owners.map((
      o,
    ) => [o.owner_tin, o.taxable_distributions, o.additional_tax]),
    [[s.taxpayer_ssn, 1500, 140], [spouse, 2000, 400]],
  );
  s.medical_expenses[0].allocations[0].distribution_payment_reference =
    "spouse-june-payment";
  assertThrows(() => calculate(s), Error, "same-owner payments");
});
Deno.test("2026 HSA spouse and medical-dependent patients require actual identity and separate qualification", () => {
  const s = fixture();
  s.schedule_a_medical_sources = [];
  s.filing_status = FilingStatus.MFS;
  s.spouse_ssn = "400001038";
  const e = s.medical_expenses[0];
  e.relationship = "spouse";
  e.patient_tin = s.spouse_ssn;
  assertEquals(calculate(s).owners[0].qualified_medical_amount, 500);
  e.patient_tin = "400001039";
  assertThrows(() => calculate(s), Error, "medical patient");
  e.relationship = "dependent_under_223d2";
  assertThrows(() => calculate(s), Error, "medical patient");
  e.dependent_qualification_review = {
    record_reference: "dependent-review",
    section152_qualification_except_joint_return_gross_income_or_filer_dependency_verified:
      true,
    divorced_or_separated_parent_rule_reviewed: true,
  };
  assertEquals(calculate(s).owners[0].qualified_medical_amount, 500);
});

Deno.test("2026 HSA filed additional tax replays filed line 16 while preserving source cents", () => {
  const s = fixture();
  s.taxpayer_dob = "1980-01-01";
  s.schedule_a_medical_sources = [];
  s.claim.accounts[0].payments.pop();
  s.claim.accounts[0].payments[0].gross_amount = 3.49;
  s.claim.copies[0].box1_gross_distribution = 3.49;
  s.medical_expenses[0].allocations = [{
    distribution_payment_reference: "june-payment",
    amount: .51,
    reimbursement_trace_reference: "trace-1",
  }];
  const o = calculate(s).owners[0];
  assertEquals([
    o.taxable_distributions,
    o.filed_part_ii.line14a,
    o.filed_part_ii.line15,
    o.filed_part_ii.line16,
    o.filed_part_ii.line17b,
  ], [2.98, 3, 1, 2, 0]);
});
Deno.test("2026 HSA corrected zero statement keeps evidence without inventing payments", () => {
  const s = fixture(), old = structuredClone(s.claim.copies[0]);
  old.source_document_reference = "retired";
  s.claim.copies.push(old);
  s.claim.copies[0].corrected = true;
  s.claim.copies[0].supersedes_document_reference = "retired";
  s.claim.copies[0].box1_gross_distribution = 0;
  s.claim.accounts[0].payments = [];
  s.medical_expenses = [];
  s.schedule_a_medical_sources = [];
  assertEquals(calculate(s).owners[0].filed_part_ii.line14a, 0);
});
Deno.test("2026 HSA current code 1 and code 3 statements for one account retain distinct payment histories", () => {
  const s = fixture(), second = structuredClone(s.claim.copies[0]);
  second.source_document_reference = "disability-statement";
  second.statement_identifier = "code-3-statement";
  second.box3_distribution_code = "3";
  second.box1_gross_distribution = 1000;
  s.claim.copies[0].box1_gross_distribution = 1000;
  s.claim.copies.push(second);
  s.claim.accounts[0].payments[1].form1099sa_source_reference =
    second.source_document_reference;
  s.treatment_review.owners[0].disability = {
    kind: "permanent_total",
    review_reference: "disability-review",
    patient_tin: s.taxpayer_ssn,
    physician_record_reference: "doctor-record",
    physician_determination_signed_on: "2026-07-01",
    disability_onset_date: "2026-07-01",
    unable_to_perform_any_substantial_gainful_activity_verified: true,
    disability_caused_by_physical_or_mental_condition_verified: true,
    physician_expected_duration: "death",
    medical_evidence_covers_all_post_onset_payments_verified: true,
  };
  assertEquals(calculate(s).owners[0].filed_part_ii.line17b, 140);
});
Deno.test("2026 HSA established-date continuity can precede a new trustee account", () => {
  const s = fixture();
  s.claim.accounts[0].opened_on = "2026-01-01";
  s.schedule_a_medical_sources = [];
  s.medical_expenses[0].incurred_on = "2024-05-01";
  s.medical_expenses[0].paid_on = "2024-06-01";
  assertEquals(calculate(s).owners[0].qualified_medical_amount, 500);
});
