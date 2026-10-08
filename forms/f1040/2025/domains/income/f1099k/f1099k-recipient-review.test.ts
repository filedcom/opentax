import { assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../../../../mef/header.ts";
import { assertSchedule1KSourceIdentity } from "../../identity/filer-source-reconciliation.ts";

const filer: FilerIdentity = {
  primarySSN: "111223333",
  nameLine1: "ALEX AND SAM EXAMPLE",
  nameControl: "EXAM",
  firstName: "Alex",
  lastName: "Example",
  fullName: "Alex Example",
  address: {
    line1: "1 Example Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  filingStatus: FilingStatus.MarriedFilingJointly,
  spouse: {
    ssn: "444556666",
    firstName: "Sam",
    lastName: "Example",
    nameControl: "EXAM",
  },
};

const source = {
  pse_name: "Example Processor",
  pse_tin: "234567890",
  box1a_gross_payments: 500,
  for_routing: "schedule_1_line_8j",
  nonbusiness_activity_review: {
    activity_description: "Occasional craft activity",
    included_in_line8j: 500,
    allocation_reference: "2025 activity review",
    no_overlap_with_other_1099s: true,
    overlap_review_reference: "2025 source overlap review",
  },
  recipient_identity_review: {
    recipient_name: "Sam Example",
    address_line1: "1 Example Way",
    address_city: "Austin",
    address_state: "TX",
    address_zip: "78701",
    source_reference: "2025 payer copy review",
  },
};

function check(recipient_tin: string | undefined, recipient_name: string) {
  assertSchedule1KSourceIdentity({
    f1099k: {
      f1099ks: [{
        ...source,
        recipient_tin,
        recipient_identity_review: {
          ...source.recipient_identity_review,
          recipient_name,
        },
      }],
    },
    schedule1: { line8j_f1099k_hobby_income: 500 },
  }, filer);
}

Deno.test("1099-K reviewed name must belong to the owner identified by its TIN", () => {
  check("444556666", "Sam Example");
  check("111223333", "Alex Example");
  check(undefined, "Sam Example");
  assertThrows(
    () => check("111223333", "Sam Example"),
    Error,
    "matching filer",
  );
  assertThrows(
    () => check("444556666", "Alex Example"),
    Error,
    "matching filer",
  );
});
