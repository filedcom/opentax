// Black-box tests for the General node (Drake Screen 1/2).
// Written from context.md only — implementation does NOT exist yet.
//
// Assumptions verified against context.md:
//   - nodeType: "general"
//   - inputSchema is a SINGLE OBJECT (not an array)
//   - filing_status uses FilingStatus enum from types.ts: "single","mfj","mfs","hoh","qss"
//   - DependentRelationship enum: "son","daughter","stepchild","foster","sibling",etc.
//   - Qualifying child for CTC: ssn present + no itin + under 17 at Dec 31 2025 + months_in_home > 6
//   - disabled=true waives the under-17 age test
//   - qualifying_child_for_ctc override flag takes precedence
//   - Routing: all outputs go to nodeType "f1040"
//   - f1040 output fields: filing_status, dependent_count,
//     qualifying_child_tax_credit_count, other_dependent_count
//   - Informational fields (names, address) do NOT affect computed counts
//
// If a test fails, fix the implementation — not the test.

import { assertEquals, assertThrows } from "@std/assert";
import { general } from "./index.ts";
import { FilingStatus } from "../../types.ts";
import { DependentRelationship } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return general.compute(general.inputSchema.parse(input));
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// A minimal dependent who qualifies for CTC:
// - has SSN, no ITIN, DOB puts them under 17 at Dec 31 2025, >6 months in home
function qualifyingChildDep(overrides: Record<string, unknown> = {}) {
  return {
    first_name: "Alice",
    last_name: "Doe",
    ssn: "123-45-6789",
    dob: "2010-06-15", // age 15 at Dec 31 2025 → under 17
    relationship: DependentRelationship.Daughter,
    months_in_home: 12,
    ...overrides,
  };
}

// A minimal dependent who does NOT qualify for CTC:
// - uses ITIN only (no SSN)
function nonCtcDep(overrides: Record<string, unknown> = {}) {
  return {
    first_name: "Bob",
    last_name: "Doe",
    itin: "900-70-0001",
    dob: "2010-01-01",
    relationship: DependentRelationship.Son,
    months_in_home: 12,
    ...overrides,
  };
}

// ============================================================
// 1. Input Schema Validation
// ============================================================

Deno.test("schema: invalid filing_status throws", () => {
  assertThrows(() =>
    compute({ filing_status: "invalid_status" })
  );
});

Deno.test("schema: missing filing_status throws", () => {
  assertThrows(() => compute({}));
});

Deno.test("schema: invalid dependent relationship throws", () => {
  assertThrows(() =>
    compute({
      filing_status: FilingStatus.Single,
      dependents: [
        {
          first_name: "X",
          last_name: "Y",
          dob: "2010-01-01",
          relationship: "alien_species", // invalid
          months_in_home: 6,
        },
      ],
    })
  );
});

Deno.test("schema: months_in_home out of range (>12) throws", () => {
  assertThrows(() =>
    compute({
      filing_status: FilingStatus.Single,
      dependents: [qualifyingChildDep({ months_in_home: 13 })],
    })
  );
});

Deno.test("schema: months_in_home negative throws", () => {
  assertThrows(() =>
    compute({
      filing_status: FilingStatus.Single,
      dependents: [qualifyingChildDep({ months_in_home: -1 })],
    })
  );
});

// ============================================================
// 2. Filing Status Routing — one test per status
// ============================================================

Deno.test("routing: Single filing_status routes to f1040", () => {
  const result = compute({ filing_status: FilingStatus.Single });
  const out = findOutput(result, "f1040");
  assertEquals((out?.input as Record<string, unknown>)?.filing_status, FilingStatus.Single);
});

Deno.test("routing: MFJ filing_status routes to f1040", () => {
  const result = compute({ filing_status: FilingStatus.MFJ });
  const out = findOutput(result, "f1040");
  assertEquals((out?.input as Record<string, unknown>)?.filing_status, FilingStatus.MFJ);
});

Deno.test("routing: MFS filing_status routes to f1040", () => {
  const result = compute({ filing_status: FilingStatus.MFS });
  const out = findOutput(result, "f1040");
  assertEquals((out?.input as Record<string, unknown>)?.filing_status, FilingStatus.MFS);
});

Deno.test("routing: HOH filing_status routes to f1040", () => {
  const result = compute({ filing_status: FilingStatus.HOH });
  const out = findOutput(result, "f1040");
  assertEquals((out?.input as Record<string, unknown>)?.filing_status, FilingStatus.HOH);
});

Deno.test("routing: QSS filing_status routes to f1040", () => {
  const result = compute({ filing_status: FilingStatus.QSS });
  const out = findOutput(result, "f1040");
  assertEquals((out?.input as Record<string, unknown>)?.filing_status, FilingStatus.QSS);
});

// ============================================================
// 3. No Dependents
// ============================================================

Deno.test("dependents: empty array → qualifying_child_tax_credit_count is 0", () => {
  const result = compute({ filing_status: FilingStatus.Single, dependents: [] });
  const out = findOutput(result, "f1040");
  const input = out?.input as Record<string, unknown>;
  assertEquals(input?.qualifying_child_tax_credit_count ?? 0, 0);
});

Deno.test("dependents: absent dependents field → other_dependent_count is 0", () => {
  const result = compute({ filing_status: FilingStatus.Single });
  const out = findOutput(result, "f1040");
  const input = out?.input as Record<string, unknown>;
  assertEquals(input?.other_dependent_count ?? 0, 0);
});

Deno.test("dependents: absent dependents field → dependent_count is 0", () => {
  const result = compute({ filing_status: FilingStatus.Single });
  const out = findOutput(result, "f1040");
  const input = out?.input as Record<string, unknown>;
  assertEquals(input?.dependent_count ?? 0, 0);
});

// ============================================================
// 4. Qualifying Child for CTC
// ============================================================

Deno.test("ctc: child with SSN, under 17, >6 months → qualifying_child_tax_credit_count = 1", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [qualifyingChildDep()],
  });
  const out = findOutput(result, "f1040");
  const input = out?.input as Record<string, unknown>;
  assertEquals(input?.qualifying_child_tax_credit_count, 1);
  assertEquals(input?.other_dependent_count ?? 0, 0);
});

Deno.test("ctc: child exactly age 16 at Dec 31 2025 qualifies (under 17)", () => {
  // DOB: Jan 1 2009 → turns 16 in 2025, still under 17
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [qualifyingChildDep({ dob: "2009-01-01" })],
  });
  const out = findOutput(result, "f1040");
  const input = out?.input as Record<string, unknown>;
  assertEquals(input?.qualifying_child_tax_credit_count, 1);
});

Deno.test("ctc: child who turns 17 on Dec 31 2025 does NOT qualify (not under 17)", () => {
  // DOB: Dec 31 2008 → turns exactly 17 on Dec 31 2025 → age is 17, not under 17
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [qualifyingChildDep({ dob: "2008-12-31" })],
  });
  const out = findOutput(result, "f1040");
  const input = out?.input as Record<string, unknown>;
  assertEquals(input?.qualifying_child_tax_credit_count ?? 0, 0);
  assertEquals(input?.other_dependent_count, 1);
});

Deno.test("ctc: child with ITIN (no SSN) does not qualify for CTC → other_dependent_count = 1", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [qualifyingChildDep({ ssn: undefined, itin: "900-70-1234" })],
  });
  const out = findOutput(result, "f1040");
  const input = out?.input as Record<string, unknown>;
  assertEquals(input?.qualifying_child_tax_credit_count ?? 0, 0);
  assertEquals(input?.other_dependent_count, 1);
});

Deno.test("ctc: child with months_in_home = 6 does NOT qualify (must be > 6)", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [qualifyingChildDep({ months_in_home: 6 })],
  });
  const out = findOutput(result, "f1040");
  const input = out?.input as Record<string, unknown>;
  assertEquals(input?.qualifying_child_tax_credit_count ?? 0, 0);
  assertEquals(input?.other_dependent_count, 1);
});

Deno.test("ctc: child with months_in_home = 7 qualifies (> 6)", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [qualifyingChildDep({ months_in_home: 7 })],
  });
  const out = findOutput(result, "f1040");
  const input = out?.input as Record<string, unknown>;
  assertEquals(input?.qualifying_child_tax_credit_count, 1);
});

// ============================================================
// 5. Non-Qualifying Dependent (over 17 or ITIN)
// ============================================================

Deno.test("odc: adult child (age 20) with SSN → other_dependent_count = 1, ctc = 0", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [
      qualifyingChildDep({
        dob: "2005-01-01", // age 20 at Dec 31 2025
      }),
    ],
  });
  const out = findOutput(result, "f1040");
  const input = out?.input as Record<string, unknown>;
  assertEquals(input?.qualifying_child_tax_credit_count ?? 0, 0);
  assertEquals(input?.other_dependent_count, 1);
});

Deno.test("odc: parent as dependent → other_dependent_count = 1, ctc = 0", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [
      {
        first_name: "Mom",
        last_name: "Doe",
        ssn: "999-88-7777",
        dob: "1955-03-01", // age 70
        relationship: DependentRelationship.Parent,
        months_in_home: 12,
      },
    ],
  });
  const out = findOutput(result, "f1040");
  const input = out?.input as Record<string, unknown>;
  assertEquals(input?.qualifying_child_tax_credit_count ?? 0, 0);
  assertEquals(input?.other_dependent_count, 1);
});

// ============================================================
// 6. Multiple Dependents — mixed
// ============================================================

Deno.test("multiple: 2 qualifying children + 1 other → ctc=2, odc=1, total=3", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    dependents: [
      qualifyingChildDep({ first_name: "Child1" }),
      qualifyingChildDep({ first_name: "Child2", dob: "2012-03-01" }),
      nonCtcDep({ first_name: "OtherDep" }), // ITIN only
    ],
  });
  const out = findOutput(result, "f1040");
  const input = out?.input as Record<string, unknown>;
  assertEquals(input?.qualifying_child_tax_credit_count, 2);
  assertEquals(input?.other_dependent_count, 1);
  assertEquals(input?.dependent_count, 3);
});

Deno.test("multiple: 3 qualifying children → ctc=3, odc=0, total=3", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    dependents: [
      qualifyingChildDep({ first_name: "C1" }),
      qualifyingChildDep({ first_name: "C2", dob: "2011-01-01" }),
      qualifyingChildDep({ first_name: "C3", dob: "2014-06-15" }),
    ],
  });
  const out = findOutput(result, "f1040");
  const input = out?.input as Record<string, unknown>;
  assertEquals(input?.qualifying_child_tax_credit_count, 3);
  assertEquals(input?.other_dependent_count ?? 0, 0);
  assertEquals(input?.dependent_count, 3);
});

// ============================================================
// 7. Informational Fields — do NOT affect computed counts
// ============================================================

Deno.test("informational: taxpayer name fields do not change ctc count", () => {
  const withName = compute({
    filing_status: FilingStatus.Single,
    taxpayer_first_name: "Jane",
    taxpayer_last_name: "Smith",
    dependents: [qualifyingChildDep()],
  });
  const withoutName = compute({
    filing_status: FilingStatus.Single,
    dependents: [qualifyingChildDep()],
  });
  const outWith = findOutput(withName, "f1040")?.input as Record<string, unknown>;
  const outWithout = findOutput(withoutName, "f1040")?.input as Record<string, unknown>;
  assertEquals(outWith?.qualifying_child_tax_credit_count, 1);
  assertEquals(outWithout?.qualifying_child_tax_credit_count, 1);
});

Deno.test("informational: address fields do not change ctc count", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    address_line1: "123 Main St",
    address_city: "Anytown",
    address_state: "CA",
    address_zip: "90210",
    dependents: [qualifyingChildDep()],
  });
  const input = findOutput(result, "f1040")?.input as Record<string, unknown>;
  assertEquals(input?.qualifying_child_tax_credit_count, 1);
});

// ============================================================
// 8. HOH requires qualifying person (but node accepts it without validation)
// ============================================================

Deno.test("hoh: HOH with no dependents is still valid (node does not block)", () => {
  const result = compute({ filing_status: FilingStatus.HOH });
  const out = findOutput(result, "f1040");
  assertEquals((out?.input as Record<string, unknown>)?.filing_status, FilingStatus.HOH);
});

// ============================================================
// 9. Disabled override waives age test
// ============================================================

Deno.test("disabled: disabled=true waives age test → adult disabled child qualifies for CTC", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [
      qualifyingChildDep({
        dob: "1990-01-01", // age 35 — would normally fail under-17 test
        disabled: true,
      }),
    ],
  });
  const out = findOutput(result, "f1040");
  const input = out?.input as Record<string, unknown>;
  assertEquals(input?.qualifying_child_tax_credit_count, 1);
});

// ============================================================
// 10. qualifying_child_for_ctc override flag
// ============================================================

Deno.test("override: qualifying_child_for_ctc=true forces CTC even if residency fails", () => {
  // months_in_home = 3 would normally disqualify, but override says yes
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [
      qualifyingChildDep({
        months_in_home: 3,
        qualifying_child_for_ctc: true,
      }),
    ],
  });
  const out = findOutput(result, "f1040");
  const input = out?.input as Record<string, unknown>;
  assertEquals(input?.qualifying_child_tax_credit_count, 1);
});

Deno.test("override: qualifying_child_for_ctc=false forces ODC even if child would normally qualify", () => {
  const result = compute({
    filing_status: FilingStatus.Single,
    dependents: [
      qualifyingChildDep({
        qualifying_child_for_ctc: false,
      }),
    ],
  });
  const out = findOutput(result, "f1040");
  const input = out?.input as Record<string, unknown>;
  assertEquals(input?.qualifying_child_tax_credit_count ?? 0, 0);
  assertEquals(input?.other_dependent_count, 1);
});

// ============================================================
// 11. Smoke Test — MFJ return, 2 qualifying children, 1 qualifying relative
// ============================================================

Deno.test("smoke: MFJ + 2 qualifying children + 1 qualifying relative → all outputs correct", () => {
  const result = compute({
    filing_status: FilingStatus.MFJ,
    taxpayer_first_name: "John",
    taxpayer_last_name: "Doe",
    taxpayer_ssn: "111-22-3333",
    taxpayer_age_65_or_older: false,
    taxpayer_blind: false,
    spouse_first_name: "Jane",
    spouse_last_name: "Doe",
    spouse_ssn: "222-33-4444",
    spouse_age_65_or_older: false,
    spouse_blind: false,
    address_line1: "100 Oak St",
    address_city: "Springfield",
    address_state: "IL",
    address_zip: "62701",
    dependents: [
      // Qualifying child 1 — age 10
      {
        first_name: "Emma",
        last_name: "Doe",
        ssn: "333-44-5555",
        dob: "2015-04-01",
        relationship: DependentRelationship.Daughter,
        months_in_home: 12,
      },
      // Qualifying child 2 — age 8
      {
        first_name: "Ethan",
        last_name: "Doe",
        ssn: "444-55-6666",
        dob: "2017-08-20",
        relationship: DependentRelationship.Son,
        months_in_home: 12,
      },
      // Qualifying relative — elderly parent (no SSN for simplicity: uses ITIN)
      {
        first_name: "Grandma",
        last_name: "Doe",
        itin: "900-80-1234",
        dob: "1950-01-01",
        relationship: DependentRelationship.Parent,
        months_in_home: 12,
      },
    ],
  });

  assertEquals(result.outputs.length, 1, "exactly one output (to f1040)");

  const out = findOutput(result, "f1040");
  const input = out?.input as Record<string, unknown>;

  // Filing status passes through
  assertEquals(input?.filing_status, FilingStatus.MFJ);

  // Dependent counts
  assertEquals(input?.dependent_count, 3);
  assertEquals(input?.qualifying_child_tax_credit_count, 2); // 2 children with SSN, under 17
  assertEquals(input?.other_dependent_count, 1); // grandma has ITIN only

  // Personal info pass-through
  assertEquals(input?.taxpayer_first_name, "John");
  assertEquals(input?.spouse_first_name, "Jane");
  assertEquals(input?.address_city, "Springfield");
});
