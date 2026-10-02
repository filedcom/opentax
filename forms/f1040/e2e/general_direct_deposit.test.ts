import { assertEquals, assertThrows } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { assertGeneral1040DepositSource } from "../2025/filer-source-reconciliation.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { AccountType } from "../mef/header.ts";
import { inputSchema as generalInputSchema } from "../nodes/inputs/general/index.ts";
import { FilingStatus } from "../nodes/types.ts";

const general = {
  filing_status: FilingStatus.Single,
  taxpayer_first_name: "Test",
  taxpayer_last_name: "Taxpayer",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1985-06-15",
  address_line1: "1 Test Way",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
  digital_assets: false,
  bank_routing_number: "021000021",
  bank_account_number: "111222333",
  bank_account_type: "checking" as const,
};

const wageSource = [{
  box1_wages: 1_000,
  box2_fed_withheld: 100,
  box3_ss_wages: 1_000,
  box4_ss_withheld: 62,
  box5_medicare_wages: 1_000,
  box6_medicare_withheld: 14.5,
  employer_ein: "12-3456789",
  employer_name: "ACME Corp",
  employee_ssn: "111-22-3333",
  box12_entries: [],
}];

Deno.test("general direct deposit survives the full graph and CLI filer extraction", () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      general,
      w2: wageSource,
    },
    { taxYear: 2025, formType: "f1040" },
  );
  const f1040 = result.pending.f1040 as Record<string, unknown>;
  const filer = extractFilerIdentity(f1040);
  assertEquals(f1040.line35a_refund, 100);
  assertEquals(filer?.bankAccount, {
    routingNumber: "021000021",
    accountNumber: "111222333",
    accountType: AccountType.Checking,
  });
  const pending = { ...result.pending, general, f1040 };
  assertGeneral1040DepositSource(pending, filer);
  assertThrows(
    () =>
      assertGeneral1040DepositSource({
        ...pending,
        f1040: { ...f1040, bank_account_number: "999888777" },
      }, filer),
    Error,
    "account differs from the retained general source",
  );
  assertThrows(
    () => assertGeneral1040DepositSource({ ...pending, f8888: {} }, filer),
    Error,
    "without Form 8888",
  );
  assertThrows(
    () =>
      assertGeneral1040DepositSource({
        ...pending,
        f1040: { ...f1040, line35a_refund: 0 },
      }, filer),
    Error,
    "needs a positive refund",
  );
  assertThrows(
    () =>
      assertGeneral1040DepositSource({
        ...pending,
        general: { filing_status: FilingStatus.Single },
      }, filer),
    Error,
    "needs the retained general bank source",
  );
  for (
    const routingNumber of [
      "001000021",
      "331000021",
      "02A000021",
      "211000021", // valid prefix and length, invalid banking checksum
    ]
  ) {
    assertThrows(
      () =>
        assertGeneral1040DepositSource({
          ...pending,
          general: { ...general, bank_routing_number: routingNumber },
        }, filer),
      Error,
      "needs a valid U.S. routing and account number",
    );
  }
  for (const accountNumber of ["111 222333", "111/222333"]) {
    assertThrows(
      () =>
        assertGeneral1040DepositSource({
          ...pending,
          general: { ...general, bank_account_number: accountNumber },
        }, filer),
      Error,
      "needs a valid U.S. routing and account number",
    );
  }
});

Deno.test("direct-deposit source syntax follows Form 1040 lines 35b and 35d", () => {
  assertEquals(
    generalInputSchema.safeParse({
      ...general,
      bank_routing_number: "211000021",
      bank_account_number: "A",
    }).success,
    true,
  );
  const shortAccountSource = { ...general, bank_account_number: "A" };
  const shortAccountReturn = execute(
    buildExecutionPlan(registry),
    registry,
    { general: shortAccountSource, w2: wageSource },
    { taxYear: 2025, formType: "f1040" },
  );
  const shortAccountFiler = extractFilerIdentity(
    shortAccountReturn.pending.f1040 as Record<string, unknown>,
  );
  assertEquals(shortAccountFiler?.bankAccount?.accountNumber, "A");
  assertGeneral1040DepositSource({
    ...shortAccountReturn.pending,
    general: shortAccountSource,
  }, shortAccountFiler);
  for (const bank_routing_number of ["001000021", "331000021", "02A000021"]) {
    assertEquals(
      generalInputSchema.safeParse({
        ...general,
        bank_routing_number,
      }).success,
      false,
    );
  }
  for (const bank_account_number of ["111 222333", "111/222333"]) {
    assertEquals(
      generalInputSchema.safeParse({
        ...general,
        bank_account_number,
      }).success,
      false,
    );
  }
});
