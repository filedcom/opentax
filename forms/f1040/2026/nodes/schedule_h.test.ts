import { assertEquals, assertThrows } from "@std/assert";
import { calculateScheduleH2026 } from "./schedule_h.ts";

const base = {
  employer_ein: "123456789",
  line_a_any_employee_3000: true,
  line1_ss_wages: 4_100,
  line3_medicare_wages: 4_100,
  line9_futa_quarter: false,
};

Deno.test("TY2026 Schedule H ATS line 9 No routes $627", () => {
  const lines = calculateScheduleH2026(base);
  assertEquals(lines.line2_ss_tax, 508);
  assertEquals(lines.line4_medicare_tax, 119);
  assertEquals(lines.line8_fica_and_withholding, 627);
  assertEquals(lines.line26_total_household_tax, undefined);
  assertEquals(lines.total_tax, 627);
});

Deno.test("TY2026 Schedule H Section A caps FUTA wages per employee", () => {
  const lines = calculateScheduleH2026({
    ...base,
    line9_futa_quarter: true,
    futa: {
      line10_one_state: true,
      line11_contributions_timely: true,
      line12_all_wages_state_taxable: true,
      line13_state: "MA",
      line14_contributions: 120,
      futa_wages_by_employee: [4_100, 7_000],
    },
  });
  assertEquals(lines.line15_futa_wages, 11_100);
  assertEquals(lines.line16_futa_tax, 67);
  assertEquals(lines.line25_fica_to_total, 627);
  assertEquals(lines.line26_total_household_tax, 694);
});

Deno.test("TY2026 Schedule H C-only case excludes FICA", () => {
  const lines = calculateScheduleH2026({
    employer_ein: "123456789",
    line_a_any_employee_3000: false,
    line_b_withheld_income_tax: false,
    line_c_futa_quarter: true,
    futa: {
      line10_one_state: true,
      line11_contributions_timely: true,
      line12_all_wages_state_taxable: true,
      line13_state: "MA",
      line14_contributions: 120,
      futa_wages_by_employee: [2_000],
    },
  });
  assertEquals(lines.line25_fica_to_total, 0);
  assertEquals(lines.line16_futa_tax, 12);
  assertEquals(lines.total_tax, 12);
});

Deno.test("TY2026 Schedule H B-only case routes withholding", () => {
  const lines = calculateScheduleH2026({
    employer_ein: "123456789",
    line_a_any_employee_3000: false,
    line_b_withheld_income_tax: true,
    line7_income_tax_withheld: 250,
    line9_futa_quarter: false,
  });
  assertEquals(lines.line8_fica_and_withholding, 250);
  assertEquals(lines.total_tax, 250);
});

Deno.test("TY2026 Schedule H rejects Section B until current-year rates are pinned", () => {
  assertThrows(
    () =>
      calculateScheduleH2026({
        ...base,
        line9_futa_quarter: true,
        futa: {
          line10_one_state: false,
          line11_contributions_timely: true,
          line12_all_wages_state_taxable: true,
        },
      }),
    Error,
    "Section B",
  );
});
