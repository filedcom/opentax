import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { form5695TaxLimits } from "./form5695_tax_limits.ts";

function source(wages: number, f5695: Record<string, unknown>) {
  return {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Sam",
      taxpayer_last_name: "Example",
      taxpayer_dob: "1987-04-30",
    },
    w2: [{
      box1_wages: wages,
      box2_fed_withheld: wages / 10,
      box3_ss_wages: wages,
      box4_ss_withheld: wages * 0.062,
      box5_medicare_wages: wages,
      box6_medicare_withheld: wages * 0.0145,
    }],
    f5695,
  };
}

function filed(inputs: Record<string, unknown>) {
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  return buildPending(result.pending);
}

// $72,000 wages less the $15,750 standard deduction: line 18 tax is $7,295.
test("Part I limit is derived from the return when the preparer leaves it out", () => {
  const pending = filed(source(72_000, { solar_electric_cost: 20_000 }));
  assertEquals(pending.form5695?.part_i_tax_limit, 7_295);
  assertEquals(pending.schedule3?.line5a_residential_clean_energy, 6_000);
  assertEquals(pending.f1040?.line24_total_tax, 1_295);
});

test("Part II limit precedes Part I, which is reduced by Form 5695 line 32", () => {
  // $20,000 wages leave $428 of Tax Table tax for both parts.
  const pending = filed(
    source(20_000, { windows_cost: 2_000, solar_electric_cost: 10_000 }),
  );
  assertEquals(pending.f1040?.line18_total_tax_before_credits, 428);
  assertEquals(pending.form5695?.part_ii_tax_limit, 428);
  assertEquals(pending.schedule3?.line5b_energy_efficient_home, 428);
  assertEquals(pending.form5695?.part_i_tax_limit, 0);
  assertEquals(pending.schedule3?.line5a_residential_clean_energy, undefined);
});

test("preparer limits equal to the worksheets are accepted", () => {
  const pending = filed(
    source(20_000, {
      windows_cost: 2_000,
      solar_electric_cost: 10_000,
      part_i_tax_limit: 0,
      part_ii_tax_limit: 428,
    }),
  );
  assertEquals(pending.schedule3?.line5b_energy_efficient_home, 428);
});

test("preparer limits that differ from the worksheets are rejected", () => {
  assertThrows(
    () =>
      f1040_2025.executeReturn(
        source(72_000, { solar_electric_cost: 20_000, part_i_tax_limit: 7_000 }),
      ),
    Error,
    "Part I tax-liability limit must equal",
  );
  assertThrows(
    () =>
      f1040_2025.executeReturn(
        source(20_000, { windows_cost: 2_000, part_ii_tax_limit: 600 }),
      ),
    Error,
    "Part II tax-liability limit must equal",
  );
});

test("Part I is left to the preparer when credits it does not refigure precede it", () => {
  const executed = {
    pending: {
      f1040: { line18_total_tax_before_credits: 5_000, line19_child_tax_credit: 2_000 },
      schedule3: { line2_childcare_credit: 600 },
    },
    diagnostics: [],
    carryforwards: {},
  };
  assertEquals(form5695TaxLimits(executed, () => 0), {
    partI: undefined,
    partII: 4_400,
  });
});
