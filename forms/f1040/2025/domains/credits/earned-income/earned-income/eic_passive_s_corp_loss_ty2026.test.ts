import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { f1040_2026 } from "../../../../../2026/index.ts";
import { passiveSCorpLossReturnInputs } from "./eic_passive_s_corp_loss.fixture.ts";
import { projectPassiveSCorpLossCopies } from "../../../income/business/passive-s-corp-loss-copies.ts";

test("TY2026 passive S-corp copies replay Form 8582 and AGI under TY2026", () => {
  const r = f1040_2026.executeReturn(passiveSCorpLossReturnInputs(1000, 500));
  assertEquals(r.diagnostics, []);
  const projection = projectPassiveSCorpLossCopies(r.pending, {
    taxYear: 2026,
    formType: "f1040",
  })!;
  assertEquals(projection.allowed, 500);
});
