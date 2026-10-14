import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import { rothCases, rothReturnSource } from "./form4852_roth.fixture.ts";
import {
  rothHistoryCases,
  rothHistoryReturnSource,
} from "./form4852_roth_history.fixture.ts";
import { reviewedRothOwnerInventory } from "../../../../../nodes/intermediate/forms/income/retirement/form8606/roth-inventory.ts";

Deno.test("ordinary retained Roth J/T unmarked owner sources reject marked current copies at public native and direct PDF boundaries", async () => {
  for (const row of [rothCases[1], rothCases.find((r) => r.code === "T")!]) {
    const source = await rothReturnSource(row, 1101);
    const result = f1040_2025.executeReturn(source.inputs);
    assertEquals(result.diagnostics, []);
    const prepared = await f1040_2025.prepareReturn(
      result.pending,
      source.filer,
      [],
      source.retained.documents,
    );
    assertEquals(prepared.bundle.xml.includes("<IRASEPSIMPLEInd>"), false);
    assertEquals(
      normalizeAllPending(result.pending).f1040.line5a_pension_gross ?? 0,
      0,
    );
    const input = structuredClone(source.inputs);
    const item = input.f4852[0];
    item.is_ira = true;
    item.retirement_source!.box7_ira_simple_indicator = true;
    item.distribution_source!.is_ira = true;
    input.f4852_reviewed_source.reviewed_source.records[0].reviewed_substitute =
      structuredClone(item);
    assertEquals(f1040_2025.executeReturn(input).diagnostics.length > 0, true);
    for (
      const mutate of [
        (p: any) =>
          p.f1099r.substitute_f1099rs[0].box7_ira_simple_indicator = true,
        (p: any) =>
          p.f1099r.substitute_f1099rs[0].ts =
            p.f1099r.substitute_f1099rs[0].ts === "T" ? "S" : "T",
        (p: any) =>
          delete p.f1099r.substitute_f1099rs[0].roth_activity_review.inventory
            .all_owned_accounts_are_ordinary_roth_not_sep_or_simple,
      ]
    ) {
      const pending = structuredClone(prepared.bundle.pending);
      mutate(pending);
      await assertRejects(() =>
        f1040_2025.prepareReturn(
          pending,
          source.filer,
          [],
          source.retained.documents,
        )
      );
      await assertRejects(() =>
        buildPdfBytes(pending, source.filer, ".pdf-cache", {
          ...prepared.bundle,
          pending,
        })
      );
    }
  }
});

Deno.test("complete Roth history rejects marked prior ordinary account records and omitted account classification", async () => {
  const source = await rothHistoryReturnSource(
    rothHistoryCases.find((r) => r.id === "prior-taxable-conversion-consumed")!,
    1102,
  );
  const result = f1040_2025.executeReturn(source.inputs);
  assertEquals(result.diagnostics, []);
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    source.filer,
    [],
    source.retained.documents,
  );
  const changed = structuredClone(prepared.bundle.pending);
  const rows =
    ((changed.f1099r as any).f1099rs ?? (changed.f1099r as any).substitute_f1099rs) as any[];
  rows[0].roth_owner_inventory_review.prior_distributions[0].payments[0]
    .issued_form1099r.box7_ira_indicator = true;
  await assertRejects(() =>
    f1040_2025.prepareReturn(
      changed,
      source.filer,
      [],
      source.retained.documents,
    )
  );
  await assertRejects(() =>
    buildPdfBytes(changed, source.filer, ".pdf-cache", {
      ...prepared.bundle,
      pending: changed,
    })
  );
  const review = structuredClone(source.reviews[0]);
  review.prior_distributions![0].payments[0].issued_form1099r
    .box7_ira_indicator = true as never;
  assertThrows(() => reviewedRothOwnerInventory(review));
  const missing: any = structuredClone(source.reviews[0]);
  delete missing.inventory
    .all_owned_accounts_are_ordinary_roth_not_sep_or_simple;
  assertThrows(() => reviewedRothOwnerInventory(missing));
  const input = structuredClone(source.inputs);
  input.f4852[0].retirement_source!.roth_owner_inventory_review!
    .prior_distributions![0].payments[0].issued_form1099r.box7_ira_indicator =
      true as never;
  input.f4852_reviewed_source.reviewed_source.records[0].reviewed_substitute =
    structuredClone(input.f4852[0]);
  assertEquals(f1040_2025.executeReturn(input).diagnostics.length > 0, true);
});
