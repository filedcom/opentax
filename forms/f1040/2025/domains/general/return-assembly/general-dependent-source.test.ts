import { assertThrows } from "@std/assert";
import {
  filedDependentsFromGeneral,
  inputSchema as generalInputSchema,
} from "../../../../nodes/inputs/general/filing/general/index.ts";
import { assertGeneral1040DependentSource } from "./filer-source-reconciliation.ts";

const general = generalInputSchema.parse({
  filing_status: "single",
  dependents: [{
    first_name: "Avery",
    last_name: "Child",
    ssn: "222-33-4444",
    dob: "2015-03-12",
    relationship: "daughter",
    months_in_home: 12,
    lived_in_us_over_half_year: true,
    us_citizen_national_or_resident: true,
    provided_over_half_own_support: false,
    filed_joint_return_except_refund_only: false,
  }, {
    first_name: "Blake",
    last_name: "Child",
    ssn: "333-44-5555",
    dob: "2014-02-10",
    relationship: "son",
    months_in_home: 12,
    dependent_on_another_return: true,
  }],
});

Deno.test("retained general dependents project only claimed Form 1040 rows", () => {
  const rows = filedDependentsFromGeneral(general);
  assertGeneral1040DependentSource({
    general,
    f1040: {
      dependent_details: rows,
      dependent_count: 1,
      qualifying_child_tax_credit_count: 0,
      other_dependent_count: 0,
    },
  });
  assertThrows(
    () =>
      assertGeneral1040DependentSource({
        general,
        f1040: {
          dependent_details: [{ ...rows[0], last_name: "Changed" }],
          dependent_count: 1,
        },
      }),
    Error,
    "dependent rows differ from the retained general source",
  );
  assertThrows(
    () =>
      assertGeneral1040DependentSource({
        general,
        f1040: {
          dependent_details: rows,
          dependent_count: 2,
        },
      }),
    Error,
    "dependent counts differ from the retained general source",
  );
});
