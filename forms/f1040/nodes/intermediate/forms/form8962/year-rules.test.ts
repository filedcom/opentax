import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../types.ts";
import {
  applicableFigure,
  qsehraAffordabilityRate,
  repaymentCap,
} from "./year-rules.ts";

Deno.test("2025 Form 8962 percentages and repayment caps remain pinned", () => {
  assertEquals(applicableFigure(150, 2025), 0);
  assertEquals(applicableFigure(151, 2025), 0.0004);
  assertEquals(applicableFigure(400, 2025), 0.085);
  assertEquals(repaymentCap(199, FilingStatus.Single, 2025), 375);
  assertEquals(repaymentCap(250, FilingStatus.MFJ, 2025), 1_950);
  assertEquals(repaymentCap(401, FilingStatus.Single, 2025), null);
  assertEquals(qsehraAffordabilityRate(2025), 0.0902);
});

Deno.test("2026 Form 8962 applies new percentage intervals and 400% cliff", () => {
  assertEquals(applicableFigure(132, 2026), 0.021);
  assertEquals(applicableFigure(133, 2026), 0.0314);
  assertEquals(applicableFigure(150, 2026), 0.0419);
  assertEquals(applicableFigure(200, 2026), 0.066);
  assertEquals(applicableFigure(250, 2026), 0.0844);
  assertEquals(applicableFigure(300, 2026), 0.0996);
  assertEquals(applicableFigure(400, 2026), 0.0996);
  assertEquals(applicableFigure(401, 2026), null);
  assertEquals(repaymentCap(150, FilingStatus.Single, 2026), null);
  assertEquals(qsehraAffordabilityRate(2026), 0.0996);
});

Deno.test("Form 8962 rejects unknown year and invalid line 5", () => {
  assertThrows(() => applicableFigure(150, 2027), Error, "no rules");
  assertThrows(
    () => applicableFigure(150.5, 2026),
    RangeError,
    "whole percent",
  );
});
