import { assertEquals } from "@std/assert";
import { FilingStatus } from "../types.ts";
import { taxFromBrackets } from "../intermediate/worksheets/tax_brackets.ts";
import {
  BRACKETS_HOH_2026,
  BRACKETS_MFJ_2026,
  BRACKETS_MFS_2026,
  BRACKETS_SINGLE_2026,
  STANDARD_DEDUCTION_ADDITIONAL_2026,
  STANDARD_DEDUCTION_BASE_2026,
} from "./2026-rates.ts";

Deno.test("2026 rate-table boundaries match Rev. Proc. 2025-32 §4.01", () => {
  assertEquals(taxFromBrackets(100_800, BRACKETS_MFJ_2026), 11_600);
  assertEquals(taxFromBrackets(67_450, BRACKETS_HOH_2026), 7_740);
  assertEquals(taxFromBrackets(50_400, BRACKETS_SINGLE_2026), 5_800);
  assertEquals(taxFromBrackets(384_350, BRACKETS_MFS_2026), 103_291.75);
  assertEquals(taxFromBrackets(384_351, BRACKETS_MFS_2026), 103_292.12);
});

Deno.test("2026 standard deduction and age/blind amounts match §4.14", () => {
  assertEquals(STANDARD_DEDUCTION_BASE_2026[FilingStatus.Single], 16_100);
  assertEquals(STANDARD_DEDUCTION_BASE_2026[FilingStatus.MFJ], 32_200);
  assertEquals(STANDARD_DEDUCTION_BASE_2026[FilingStatus.HOH], 24_150);
  assertEquals(STANDARD_DEDUCTION_ADDITIONAL_2026[FilingStatus.Single], 2_050);
  assertEquals(STANDARD_DEDUCTION_ADDITIONAL_2026[FilingStatus.MFS], 1_650);
});
