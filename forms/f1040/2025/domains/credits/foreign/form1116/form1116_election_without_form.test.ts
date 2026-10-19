import { test } from "bun:test";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";

// Synthetic MFJ return with two 1099-DIVs whose box 7 foreign tax totals $220.
function run(elect: boolean) {
  const dividend = (ref: string, box1a: number, box7: number) => ({
    payerName: `Example Fund ${ref}`,
    source_document_reference: ref,
    isNominee: false,
    box11: false,
    box1a,
    box1b: 0,
    box7,
    holdingPeriodDays: 120,
    ...(elect && { foreign_tax_without_form1116: true as const }),
  });
  const r = f1040_2025.executeReturn({
    general: {
      filing_status: "mfj",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Example",
      taxpayer_dob: "1980-01-01",
      spouse_first_name: "Blair",
      spouse_last_name: "Example",
      spouse_dob: "1981-01-01",
    },
    w2: [{
      box1_wages: 90_000,
      box2_fed_withheld: 8_000,
      box3_ss_wages: 90_000,
      box4_ss_withheld: 5_580,
      box5_medicare_wages: 90_000,
      box6_medicare_withheld: 1_305,
    }],
    f1099div: [dividend("div-1", 4_000, 212), dividend("div-2", 600, 8)],
    schedule_b_part_iii: {
      foreign_accounts_question: false,
      foreign_trust_question: false,
    },
  });
  return { r, p: normalizeAllPending(r.pending) };
}

// 2025 Form 1040 instructions, Schedule 3 line 1, and Form 1116 instructions,
// Election To Claim the Foreign Tax Credit Without Filing Form 1116: all
// foreign-source income is passive and on qualified payee statements, and the
// total foreign tax is not more than $600 on a joint return.
test("small 1099-DIV foreign tax is claimed on Schedule 3 line 1 without Form 1116", () => {
  const { r, p } = run(true);
  assertEquals(r.diagnostics, []);
  assertEquals(p.schedule3.line1_total, 220);
  assertEquals(p.f1040.line20_nonrefundable_credits, 220);
});

test("without the election 1099-DIV foreign tax still needs the Form 1116 reviews", () => {
  const { r } = run(false);
  assertStringIncludes(
    r.diagnostics.map((d) => d.message).join("\n"),
    "1099-DIV foreign tax needs reviewed qualifying days",
  );
});

test("foreign-service wages disqualify the no-Form-1116 election even without foreign tax", () => {
  const dividend = {
    payerName: "Example Fund",
    source_document_reference: "div-foreign-wage",
    isNominee: false,
    box11: false,
    box1a: 4_000,
    box1b: 0,
    box7: 220,
    holdingPeriodDays: 120,
    foreign_tax_without_form1116: true as const,
  };
  const result = f1040_2025.executeReturn({
    general: {
      filing_status: "mfj",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Example",
      taxpayer_dob: "1980-01-01",
      spouse_first_name: "Blair",
      spouse_last_name: "Example",
      spouse_dob: "1981-01-01",
    },
    fec: [{
      foreign_employer_name: "Foreign Employer",
      country_code: "DE",
      compensation_amount: 50_000,
      compensation_usd: 50_000,
      foreign_service_compensation_usd: 50_000,
    }],
    f1099div: [dividend],
    schedule_b_part_iii: {
      foreign_accounts_question: false,
      foreign_trust_question: false,
    },
  });
  assertStringIncludes(
    result.diagnostics.map((d) => d.message).join("\n"),
    "every foreign tax on a qualified payee statement",
  );
});
