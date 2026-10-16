import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateForm4852Sources2026 as calc,
  form4852Source2026Schema,
} from "./form4852-source.ts";
import { form4852Source2026 as fixture } from "./form4852.fixture.ts";
import { retirementCopy2026 } from "./retirement.fixture.ts";
import { w2_2026 } from "./w2.ts";
import { FilingStatus } from "../../nodes/types.ts";
Deno.test("2026 Form 4852 wage ledger reuses canonical W-2 mapping without confusing federal and FICA withholding", () => {
  const r = calc(fixture()), w = r.substitute_wages[0];
  assertEquals([
    w.tax_year,
    w.box1_wages,
    w.box2_fed_withheld,
    w.box3_ss_wages,
    w.box4_ss_withheld,
    w.box5_medicare_wages,
    w.box6_medicare_withheld,
    w.box17_state_withheld,
  ], [2026, 60000.25, 5000.75, 60000.25, 3720.02, 60000.25, 870, 2000.25]);
  assertEquals(w.source_document_reference, "substitute-2026");
  assertEquals(w.nonstandard_document_review?.kind, "typed");
  const out = w2_2026.compute({ taxYear: 2026, formType: "f1040" }, {
    w2s: [w],
    filing_status: FilingStatus.Single,
    taxpayer_ssn: "400001037",
  });
  assertEquals(
    out.outputs.find((o) => o.nodeType === "f1040")?.fields.line25a_w2_withheld,
    5000.75,
  );
});
Deno.test("2026 Form 4852 incorrect W-2 replaces exactly one actual original", () => {
  const raw = fixture(),
    w = {
      ...calc(raw).substitute_wages[0],
      source_document_reference: "incorrect-original",
      box1_wages: 1,
    };
  raw.issued_wages = [w];
  assertThrows(() => calc(raw), Error, "actual original inventory");
  raw.claim.records[0].status = {
    kind: "incorrect",
    replaces_document_reference: w.source_document_reference,
  };
  const r = calc(raw);
  assertEquals(r.current_issued_wages, []);
  assertEquals(r.excluded_document_references, ["incorrect-original"]);
  assertEquals(r.substitute_wages[0].box1_wages, 60000.25);
  raw.issued_wages.push({ ...w, source_document_reference: "later-corrected" });
  assertThrows(() => calc(raw), Error, "another current copy");
});
Deno.test("2026 Form 4852 retirement preserves reported taxable income without a second basis deduction", () => {
  const r = calc(fixture(true)), p = r.retirement_estimates[0];
  assertEquals([
    p.gross_distribution,
    p.taxable_amount,
    p.employee_contributions,
    p.federal_withheld,
    p.distribution_code,
    p.is_ira,
  ], [12000.25, 10000.25, 2000, 1000.25, "7", false]);
  assertEquals(r.substitute_wages, []);
});
Deno.test("2026 Form 4852 retains unknown retirement taxability for its source owner", () => {
  const raw = fixture(true), r = raw.claim.records[0];
  if (r.kind !== "1099r") throw Error();
  r.amounts.taxable_amount_not_determined = true;
  delete r.amounts.taxable_amount;
  r.distribution_sources[0].taxable_amount_not_determined = true;
  delete r.distribution_sources[0].taxable_amount;
  assertEquals(calc(raw).retirement_estimates[0].taxable_amount, undefined);
  r.amounts.taxable_amount = 0;
  assertThrows(() => calc(raw), Error, "undetermined taxable amount");
});
Deno.test("2026 Form 4852 retirement replacement matches account and resolves masked original owner", () => {
  const raw = fixture(true), c = retirementCopy2026("incorrect-pension");
  c.payer_tin = "120000001";
  c.account_number = "pension-account";
  c.recipient_tin = "XXX-XX-1037";
  raw.issued_retirement_copies = [c];
  raw.claim.records[0].status = {
    kind: "incorrect",
    replaces_document_reference: c.source_document_reference,
  };
  assertEquals(calc(raw).current_issued_retirement_copies, []);
  c.account_number = "other-account";
  assertThrows(() => calc(raw), Error, "actual original inventory");
});
Deno.test("2026 Form 4852 rejects unaudited payer attempts, early notices and post-review evidence", () => {
  for (
    const change of [
      (r: ReturnType<typeof fixture>) => r.claim.reviewed_on = "2027-02-28",
      (r: ReturnType<typeof fixture>) =>
        r.claim.records[0].irs_notification.notified_on = "2027-02-28",
      (r: ReturnType<typeof fixture>) =>
        r.claim.records[0].payer_contact.contacted_on = "2027-03-03",
      (r: ReturnType<typeof fixture>) =>
        r.claim.records[0].irs_notification.notified_on = "2027-03-16",
    ]
  ) {
    const r = fixture();
    change(r);
    assertThrows(() => calc(r));
  }
});
Deno.test("2026 Form 4852 rejects wrong source year owner payer and repeated payroll periods", () => {
  for (
    const key of [
      "paid_on",
      "owner_ssn",
      "payer_tin",
      "period_identifier",
    ] as const
  ) {
    const raw = fixture(), r = raw.claim.records[0];
    if (r.kind !== "w2") throw Error();
    if (key === "period_identifier") {
      r.payroll_allocations.push({
        ...r.payroll_allocations[0],
        source_document_reference: "duplicate-ledger",
      });
    } else {r.payroll_allocations[0][key] = key === "paid_on"
        ? "2025-12-31"
        : "400001099";}
    assertThrows(() => calc(raw));
  }
});
Deno.test("2026 Form 4852 reconciles every printed wage amount to exact cents", () => {
  const sample = fixture().claim.records[0];
  if (sample.kind !== "w2") throw Error();
  for (const [k, v] of Object.entries(sample.amounts)) {
    if (typeof v !== "number") continue;
    const raw = fixture(), r = raw.claim.records[0];
    if (r.kind !== "w2") throw Error();
    (r.amounts as Record<string, unknown>)[k] = v + .01;
    assertThrows(() => calc(raw), Error, "disagrees with payroll records");
  }
  const raw = fixture(), r = raw.claim.records[0];
  if (r.kind !== "w2") throw Error();
  r.payroll_allocations[0].wages += .001;
  assertThrows(() => calc(raw), Error, "exact cents");
});
Deno.test("2026 Form 4852 rejects duplicate substitute identities and reused evidence references", () => {
  const raw = fixture();
  raw.claim.records.push({
    ...raw.claim.records[0],
    source_document_reference: "second-substitute",
    payer_contact: {
      ...raw.claim.records[0].payer_contact,
      record_reference: "second-attempt",
    },
    irs_notification: {
      ...raw.claim.records[0].irs_notification,
      record_reference: "second-notice",
    },
  });
  assertThrows(() => calc(raw), Error, "one annual substitute");
  const dup = fixture();
  dup.claim.records[0].irs_notification.record_reference =
    dup.claim.records[0].payer_contact.record_reference;
  assertThrows(() => calc(dup), Error, "references must be distinct");
});
Deno.test("2026 Form 4852 refuses unknown payer identities and unprinted jurisdiction guesses", () => {
  const raw = fixture();
  (raw.claim.records[0] as unknown as Record<string, unknown>).payer_tin =
    undefined;
  assertEquals(form4852Source2026Schema.safeParse(raw).success, false);
  const state = fixture(), r = state.claim.records[0];
  if (r.kind !== "w2") throw Error();
  r.amounts.state_name = "NY";
  assertThrows(() => calc(state), Error, "printed jurisdiction");
});
Deno.test("2026 Form 4852 requires actual retirement account classification and reconciled payment taxability", () => {
  for (
    const change of [(r: ReturnType<typeof fixture>) => {
      const s = r.claim.records[0];
      if (s.kind === "1099r") delete s.distribution_sources[0].account_type;
    }, (r: ReturnType<typeof fixture>) => {
      const s = r.claim.records[0];
      if (s.kind === "1099r") s.distribution_sources[0].taxable_amount = 9999;
    }, (r: ReturnType<typeof fixture>) => {
      const s = r.claim.records[0];
      if (s.kind === "1099r") s.amounts.distribution_code = "99";
    }]
  ) {
    const raw = fixture(true);
    change(raw);
    assertThrows(() => calc(raw));
  }
});
Deno.test("2026 Form 4852 sums distinct payroll records and preserves unrelated issued wages", () => {
  const raw = fixture(), s = raw.claim.records[0];
  if (s.kind !== "w2") throw Error();
  const first = { ...s.payroll_allocations[0] },
    second = {
      ...first,
      source_document_reference: "second-ledger",
      period_identifier: "second-period",
      paid_on: "2026-12-30",
    };
  for (const [key, value] of Object.entries(first)) {
    if (typeof value === "number") {
      const amount = Math.floor(value * 100 / 2) / 100;
      (first as Record<string, unknown>)[key] = amount;
      (second as Record<string, unknown>)[key] =
        Math.round((value - amount) * 100) / 100;
    }
  }
  s.payroll_allocations = [first, second];
  const unrelated = {
    ...calc(fixture()).substitute_wages[0],
    source_document_reference: "other-employer-copy",
    employer_ein: "120000002",
  };
  raw.issued_wages = [unrelated];
  const r = calc(raw);
  assertEquals(r.substitute_wages[0].box1_wages, 60000.25);
  assertEquals(
    r.current_issued_wages[0].source_document_reference,
    "other-employer-copy",
  );
});
Deno.test("2026 Form 4852 keeps spouses and their employer limits independent", () => {
  const raw = fixture(), source = raw.claim.records[0];
  const spouse = JSON.parse(
    JSON.stringify(source),
    (k, v) =>
      v === "400001037"
        ? "400001038"
        : typeof v === "string" && /reference/.test(k)
        ? `spouse-${v}`
        : v,
  );
  raw.filing_status = FilingStatus.MFJ;
  raw.spouse_ssn = "400001038";
  raw.claim.records.push(spouse);
  assertEquals(calc(raw).substitute_wages.map((w) => w.employee_ssn), [
    "400001037",
    "400001038",
  ]);
  raw.filing_status = FilingStatus.Single;
  assertThrows(() => calc(raw), Error, "owner must belong");
});
Deno.test("2026 Form 4852 source draft rejects Social Security wages over the current-year cap", () => {
  const raw = fixture(), r = raw.claim.records[0];
  if (r.kind !== "w2") throw Error();
  r.amounts.social_security_wages =
    r.payroll_allocations[0]
      .social_security_wages =
      184501;
  assertThrows(() => calc(raw), Error, "annual wage base");
});
Deno.test("2026 Form 4852 distribution sums preserve cents and reject taxable plus recovered basis over gross", () => {
  const raw = fixture(true), r = raw.claim.records[0];
  if (r.kind !== "1099r") throw Error();
  r.amounts.employee_contributions =
    r.distribution_sources[0]
      .employee_contributions =
      2001;
  assertThrows(() => calc(raw), Error, "exceed gross");
});
