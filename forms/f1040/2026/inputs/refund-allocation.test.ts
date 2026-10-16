import { AccountType } from "../../nodes/inputs/payments/refund/f8888/index.ts";
import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { executeDraftSources2026 } from "../execute.ts";
import {
  calculateRefundAllocation2026,
  refundAllocationClaim2026Schema,
} from "./refund-allocation.ts";
import { refundAllocationGraph2026 } from "./refund-allocation.fixture.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "../source-registry.ts";

Deno.test("2026 refund allocation follows finalized tax and resolves ATS-5 remainder without changing amounts", async () => {
  const input = refundAllocationGraph2026();
  const result = await executeDraftSources2026(input);
  assertEquals(result.diagnostics, []);
  const f = result.pending.f1040;
  assertEquals([
    f.line11b_agi,
    f.line12e_standard_or_itemized,
    f.line15_taxable_income,
    f.line16_income_tax,
  ], [50510, 16100, 34410, 3883]);
  assertEquals([
    f.line25d_total_withholding,
    f.line34_overpayment,
    f.line35a_refund,
  ], [10268, 6385, 6385]);
  const r = result.pending.refund_allocation.calculation_2026 as ReturnType<
    typeof calculateRefundAllocation2026
  >;
  assertEquals(r.accounts.map((a) => a.amount), [5385, 1000]);
  assertEquals(r.form1040_fields, { form8888_attached: true });
  const { refund_allocation: _, ...ordinary } = input;
  const baseline = await executeDraftSources2026(ordinary);
  assertEquals(baseline.diagnostics, []);
  assertEquals(result.pending.f1040, baseline.pending.f1040);
  assertEquals(
    result.pending.capital_loss_carryover,
    baseline.pending.capital_loss_carryover,
  );
  const plan = buildExecutionPlan(sourceRegistry2026).map((step) =>
    step.nodeType
  );
  assert(plan.indexOf("f1040") < plan.indexOf("refund_allocation"));
});

Deno.test("2026 refund allocation uses refund after the 2027 election and supports single and three account deposits", async () => {
  const input = refundAllocationGraph2026();
  const result = await executeDraftSources2026({
    ...input,
    general: {
      ...input.general,
      apply_overpayment_to_2027_estimated_tax_amount: 300,
    },
  });
  assertEquals(result.diagnostics, []);
  const f = result.pending.f1040;
  assertEquals(
    [f.line34_overpayment, f.line36_apply_to_2027, f.line35a_refund],
    [6385, 300, 6085],
  );
  const source = { claim: input.refund_allocation.claim, settled_return: f };
  source.claim.accounts.push({
    ...source.claim.accounts[1],
    record_reference: "third",
    account_number: "ABC-1234567890123",
    allocation: 500,
  });
  assertEquals(
    calculateRefundAllocation2026(source).accounts.map((a) => a.amount),
    [4585, 1000, 500],
  );
  source.claim.accounts.splice(1);
  const single = calculateRefundAllocation2026(source);
  assertEquals(single.accounts[0].amount, 6085);
  assertEquals(single.file_form8888, false);
  assertEquals(single.form1040_fields, {
    form8888_attached: false,
    line35b_routing_number: "012345672",
    line35c_account_type: AccountType.Checking,
    line35d_account_number: "12345678",
  });
  assertEquals(
    calculateRefundAllocation2026({
      ...source,
      settled_return: {
        ...f,
        bank_routing_number: "012345672",
        bank_account_number: "12345678",
        bank_account_type: "checking",
      },
    }).accounts,
    single.accounts,
  );
});

Deno.test("2026 refund source rejects mismatches, duplicate accounts, wrong owners and unsupported totals", async () => {
  const input = refundAllocationGraph2026();
  const f = (await executeDraftSources2026(input)).pending.f1040;
  const base = { claim: input.refund_allocation.claim, settled_return: f };
  const change = (mutate: (s: typeof base) => void) => {
    const source = structuredClone(base);
    mutate(source);
    assertThrows(() => calculateRefundAllocation2026(source));
  };
  change((s) => s.claim.accounts[1].allocation = 6385);
  change((s) => s.claim.accounts[0].allocation = 5384);
  change((s) => s.claim.accounts[0].allocation = 5386);
  change((s) => s.claim.accounts[1].allocation = "remainder");
  change((s) => s.claim.accounts[1].allocation = .5);
  change((s) =>
    s.claim.accounts[1].account_number = s.claim.accounts[0].account_number
  );
  change((s) => s.claim.accounts[0].routing_number = "012345673");
  change((s) => s.claim.accounts[0].routing_number = "000000000");
  change((s) => s.claim.accounts[0].account_number = "123 45");
  change((s) => s.claim.accounts[0].owner_name = "Tax Preparer");
  change((s) =>
    s.claim.accounts[1].record_reference = s.claim.accounts[0].record_reference
  );
  change((s) => s.settled_return.line35a_refund = 0);
  change((s) => s.settled_return.line34_overpayment = 1000);
  change((s) => s.settled_return.line37_amount_owed = 100);
  change((s) => s.settled_return.bank_routing_number = "012345672");
  assertThrows(
    () =>
      calculateRefundAllocation2026({
        settled_return: { ...f, bank_account_number: "1234567" },
      }),
    Error,
    "reviewed",
  );
  assertThrows(() =>
    refundAllocationClaim2026Schema.parse({
      ...input.refund_allocation,
      settled_return: f,
    })
  );
  assertThrows(() =>
    refundAllocationClaim2026Schema.parse({
      claim: { ...base.claim, total_allocation: 6385 },
    })
  );
  assertThrows(() =>
    refundAllocationClaim2026Schema.parse({
      claim: { ...base.claim, tax_year: 2025 },
    })
  );
  await assertRejects(() =>
    executeDraftSources2026({ ...input, f1040: { line35a_refund: 9999 } })
  );
});

Deno.test("2026 refund account ownership permits a joint spouse but not a separate-return spouse", async () => {
  const input = refundAllocationGraph2026();
  const f = (await executeDraftSources2026(input)).pending.f1040;
  const source = {
    claim: input.refund_allocation.claim,
    settled_return: {
      ...f,
      filing_status: "mfj",
      spouse_first_name: "Pat",
      spouse_last_name: "Wheat",
      spouse_ssn: "400001038",
    },
  };
  source.claim.accounts[1].owner_name = " pat   wheat ";
  assertEquals(calculateRefundAllocation2026(source).total_allocation, 6385);
  source.settled_return.filing_status = "mfs";
  assertThrows(
    () => calculateRefundAllocation2026(source),
    Error,
    "account owner",
  );
});
