import { assertEquals, assertThrows } from "@std/assert";
import type { NodeOutput } from "../../../../../core/types/tax-node.ts";
import { f8997 } from "./index.ts";
import { schedule_d } from "../../intermediate/schedule_d/index.ts";

function compute(input: Record<string, unknown>) {
  return f8997.compute(input as Parameters<typeof f8997.compute>[0]);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f8997.inputSchema: empty object passes", () => {
  const result = f8997.inputSchema.safeParse({});
  assertEquals(result.success, true);
});

Deno.test("f8997.inputSchema: valid Part I investment passes", () => {
  const result = f8997.inputSchema.safeParse({
    part_i: [
      {
        description: "QOF Fund LLC - 5% interest",
        qof_ein: "12-3456789",
        date_acquired: "2021-10-15",
        short_term_deferred_gain: 0,
        long_term_deferred_gain: 50000,
      },
    ],
  });
  assertEquals(result.success, true);
});

Deno.test("f8997.inputSchema: valid Part II new investment passes", () => {
  const result = f8997.inputSchema.safeParse({
    part_ii: [
      {
        description: "QOF Corp - 100 shares",
        qof_ein: "98-7654321",
        date_acquired: "2025-03-20",
        short_term_deferred_gain: 10000,
        long_term_deferred_gain: 0,
      },
    ],
  });
  assertEquals(result.success, true);
});

Deno.test("f8997.inputSchema: valid Part III inclusion event passes", () => {
  const result = f8997.inputSchema.safeParse({
    part_iii: [
      {
        description: "QOF Fund LLC - 5% interest",
        qof_ein: "12-3456789",
        date_acquired: "2021-10-15",
        date_of_inclusion: "2025-07-01",
        short_term_gain_included: 0,
        long_term_gain_included: 45000,
      },
    ],
  });
  assertEquals(result.success, true);
});

Deno.test("f8997.inputSchema: valid Part IV year-end holding passes", () => {
  const result = f8997.inputSchema.safeParse({
    part_iv: [
      {
        description: "QOF Fund LLC - 5% interest",
        qof_ein: "12-3456789",
        date_acquired: "2021-10-15",
        short_term_deferred_gain: 0,
        long_term_deferred_gain: 50000,
      },
    ],
  });
  assertEquals(result.success, true);
});

Deno.test("f8997.inputSchema: negative short_term_gain_included fails", () => {
  const result = f8997.inputSchema.safeParse({
    part_iii: [
      {
        description: "QOF Fund",
        qof_ein: "12-3456789",
        date_acquired: "2021-01-01",
        date_of_inclusion: "2025-06-01",
        short_term_gain_included: -100,
        long_term_gain_included: 0,
      },
    ],
  });
  assertEquals(result.success, false);
});

Deno.test("f8997.inputSchema: negative long_term_gain_included fails", () => {
  const result = f8997.inputSchema.safeParse({
    part_iii: [
      {
        description: "QOF Fund",
        qof_ein: "12-3456789",
        date_acquired: "2021-01-01",
        date_of_inclusion: "2025-06-01",
        short_term_gain_included: 0,
        long_term_gain_included: -500,
      },
    ],
  });
  assertEquals(result.success, false);
});

Deno.test("f8997.inputSchema: negative long_term_deferred_gain in Part I fails", () => {
  const result = f8997.inputSchema.safeParse({
    part_i: [
      {
        description: "QOF Fund",
        qof_ein: "12-3456789",
        date_acquired: "2021-01-01",
        short_term_deferred_gain: 0,
        long_term_deferred_gain: -1000,
      },
    ],
  });
  assertEquals(result.success, false);
});

// =============================================================================
// 2. No-Output Cases (Pure Tracking — No Inclusion Events)
// =============================================================================

Deno.test("f8997.compute: empty input — no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8997.compute: only Part I holdings (no inclusion event) — no outputs", () => {
  const result = compute({
    part_i: [
      {
        description: "QOF Fund LLC - 5% interest",
        qof_ein: "12-3456789",
        date_acquired: "2021-10-15",
        short_term_deferred_gain: 0,
        long_term_deferred_gain: 75000,
      },
    ],
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8997.compute: only Part II new investment (no inclusion event) — no outputs", () => {
  const result = compute({
    part_ii: [
      {
        description: "QOF Corp - 100 shares",
        qof_ein: "98-7654321",
        date_acquired: "2025-06-01",
        short_term_deferred_gain: 25000,
        long_term_deferred_gain: 0,
      },
    ],
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8997.compute: only Part IV year-end holdings — no outputs", () => {
  const result = compute({
    part_iv: [
      {
        description: "QOF Fund LLC",
        qof_ein: "12-3456789",
        date_acquired: "2021-10-15",
        short_term_deferred_gain: 0,
        long_term_deferred_gain: 50000,
      },
    ],
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8997.compute: Part III entry with zero included gains — no outputs", () => {
  // Disposition but no recognized gain (e.g., return of capital only)
  const result = compute({
    part_iii: [
      {
        description: "QOF Fund",
        qof_ein: "12-3456789",
        date_acquired: "2022-01-01",
        date_of_inclusion: "2025-05-01",
        short_term_gain_included: 0,
        long_term_gain_included: 0,
      },
    ],
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8997.compute: all four parts populated, Part III gains are zero — no outputs", () => {
  const result = compute({
    part_i: [
      {
        description: "QOF A",
        qof_ein: "11-1111111",
        date_acquired: "2020-09-01",
        short_term_deferred_gain: 0,
        long_term_deferred_gain: 100000,
      },
    ],
    part_ii: [
      {
        description: "QOF B",
        qof_ein: "22-2222222",
        date_acquired: "2025-04-01",
        short_term_deferred_gain: 5000,
        long_term_deferred_gain: 0,
      },
    ],
    part_iii: [
      {
        description: "QOF C",
        qof_ein: "33-3333333",
        date_acquired: "2021-01-01",
        date_of_inclusion: "2025-08-01",
        short_term_gain_included: 0,
        long_term_gain_included: 0,
      },
    ],
    part_iv: [
      {
        description: "QOF A",
        qof_ein: "11-1111111",
        date_acquired: "2020-09-01",
        short_term_deferred_gain: 0,
        long_term_deferred_gain: 100000,
      },
    ],
  });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Inclusion Event — Long-Term Gain Routes to schedule_d
// =============================================================================

Deno.test("f8997.compute: Part III long-term included gain routes to schedule_d", () => {
  const result = compute({
    part_iii: [
      {
        description: "QOF Fund LLC - 5% interest",
        qof_ein: "12-3456789",
        date_acquired: "2021-10-15",
        date_of_inclusion: "2025-07-01",
        short_term_gain_included: 0,
        long_term_gain_included: 45000,
      },
    ],
  });
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, schedule_d.nodeType);
});

Deno.test("f8997.compute: Part III long-term gain — transaction is_long_term true", () => {
  const result = compute({
    part_iii: [
      {
        description: "QOF Fund LLC",
        qof_ein: "12-3456789",
        date_acquired: "2021-10-15",
        date_of_inclusion: "2025-07-01",
        short_term_gain_included: 0,
        long_term_gain_included: 60000,
      },
    ],
  });
  const tx = (result.outputs[0].fields as Record<string, unknown>)["transaction"] as Record<string, unknown>;
  assertEquals(tx.is_long_term, true);
  assertEquals(tx.gain_loss, 60000);
});

Deno.test("f8997.compute: Part III long-term gain — adjustment code Q is set", () => {
  const result = compute({
    part_iii: [
      {
        description: "QOF Fund LLC",
        qof_ein: "12-3456789",
        date_acquired: "2021-10-15",
        date_of_inclusion: "2025-09-15",
        short_term_gain_included: 0,
        long_term_gain_included: 30000,
      },
    ],
  });
  const tx = (result.outputs[0].fields as Record<string, unknown>)["transaction"] as Record<string, unknown>;
  assertEquals(tx.adjustment_codes, "Q");
});

// =============================================================================
// 4. Inclusion Event — Short-Term Gain Routes to schedule_d
// =============================================================================

Deno.test("f8997.compute: Part III short-term included gain routes to schedule_d", () => {
  const result = compute({
    part_iii: [
      {
        description: "QOF Corp - 100 shares",
        qof_ein: "98-7654321",
        date_acquired: "2024-11-01",
        date_of_inclusion: "2025-03-15",
        short_term_gain_included: 8000,
        long_term_gain_included: 0,
      },
    ],
  });
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, schedule_d.nodeType);
});

Deno.test("f8997.compute: Part III short-term gain — transaction is_long_term false", () => {
  const result = compute({
    part_iii: [
      {
        description: "QOF Corp",
        qof_ein: "98-7654321",
        date_acquired: "2024-11-01",
        date_of_inclusion: "2025-03-15",
        short_term_gain_included: 12000,
        long_term_gain_included: 0,
      },
    ],
  });
  const tx = (result.outputs[0].fields as Record<string, unknown>)["transaction"] as Record<string, unknown>;
  assertEquals(tx.is_long_term, false);
  assertEquals(tx.gain_loss, 12000);
});

// =============================================================================
// 5. Inclusion Event — Both ST and LT Gains in Same Disposition
// =============================================================================

Deno.test("f8997.compute: Part III with both ST and LT gains — two outputs", () => {
  const result = compute({
    part_iii: [
      {
        description: "Mixed QOF",
        qof_ein: "55-5555555",
        date_acquired: "2022-06-01",
        date_of_inclusion: "2025-06-01",
        short_term_gain_included: 5000,
        long_term_gain_included: 20000,
      },
    ],
  });
  // One output for ST, one for LT
  assertEquals(result.outputs.length, 2);
  const nodeTypes = result.outputs.map((o: NodeOutput) => o.nodeType);
  assertEquals(nodeTypes.every((t: string) => t === schedule_d.nodeType), true);
});

Deno.test("f8997.compute: ST and LT gains from same entry — correct is_long_term on each", () => {
  const result = compute({
    part_iii: [
      {
        description: "Mixed QOF",
        qof_ein: "55-5555555",
        date_acquired: "2022-06-01",
        date_of_inclusion: "2025-06-01",
        short_term_gain_included: 5000,
        long_term_gain_included: 20000,
      },
    ],
  });
  const txs = result.outputs.map(
    (o: NodeOutput) => (o.fields as Record<string, unknown>)["transaction"] as Record<string, unknown>
  );
  const ltTx = txs.find((t) => t.is_long_term === true);
  const stTx = txs.find((t) => t.is_long_term === false);
  assertEquals(ltTx?.gain_loss, 20000);
  assertEquals(stTx?.gain_loss, 5000);
});

// =============================================================================
// 6. Multiple Part III Entries — Multiple Outputs
// =============================================================================

Deno.test("f8997.compute: two Part III dispositions each with LT gain — two outputs", () => {
  const result = compute({
    part_iii: [
      {
        description: "QOF Alpha",
        qof_ein: "11-1111111",
        date_acquired: "2020-01-01",
        date_of_inclusion: "2025-01-15",
        short_term_gain_included: 0,
        long_term_gain_included: 30000,
      },
      {
        description: "QOF Beta",
        qof_ein: "22-2222222",
        date_acquired: "2021-06-01",
        date_of_inclusion: "2025-09-30",
        short_term_gain_included: 0,
        long_term_gain_included: 15000,
      },
    ],
  });
  assertEquals(result.outputs.length, 2);
});

Deno.test("f8997.compute: multiple dispositions — correct gain amounts per output", () => {
  const result = compute({
    part_iii: [
      {
        description: "QOF Alpha",
        qof_ein: "11-1111111",
        date_acquired: "2020-01-01",
        date_of_inclusion: "2025-01-15",
        short_term_gain_included: 0,
        long_term_gain_included: 30000,
      },
      {
        description: "QOF Beta",
        qof_ein: "22-2222222",
        date_acquired: "2021-06-01",
        date_of_inclusion: "2025-09-30",
        short_term_gain_included: 0,
        long_term_gain_included: 15000,
      },
    ],
  });
  const gains = result.outputs.map(
    (o: NodeOutput) => ((o.fields as Record<string, unknown>)["transaction"] as Record<string, unknown>).gain_loss
  );
  // Both are positive LT gains; exact amounts matter
  assertEquals(gains.includes(30000), true);
  assertEquals(gains.includes(15000), true);
});

// =============================================================================
// 7. 10-Year Exclusion — Elected Exclusion Reduces Gain
// =============================================================================

Deno.test("f8997.compute: 10-year exclusion elected — net gain after exclusion routes to schedule_d", () => {
  // QOF held 10+ years. Deferred gain = 50000. FMV appreciation = 80000.
  // Included (deferred) gain = 50000. Excluded appreciation = 80000.
  // long_term_gain_included should already be the NET included gain (post-exclusion) per the form.
  // The exclusion is elected on Form 8949/8997 — taxpayer reports the net included amount.
  const result = compute({
    part_iii: [
      {
        description: "QOF Fund (10-year hold)",
        qof_ein: "77-7777777",
        date_acquired: "2015-06-01",
        date_of_inclusion: "2025-06-01",
        short_term_gain_included: 0,
        long_term_gain_included: 50000,  // only the originally deferred gain; appreciation excluded
        elected_fmv_exclusion: true,
        excluded_gain: 80000,            // excluded appreciation portion
      },
    ],
  });
  // The included gain still routes to schedule_d
  assertEquals(result.outputs.length, 1);
  const tx = (result.outputs[0].fields as Record<string, unknown>)["transaction"] as Record<string, unknown>;
  assertEquals(tx.gain_loss, 50000);
  assertEquals(tx.is_long_term, true);
});

// =============================================================================
// 8. Throw / Validation
// =============================================================================

Deno.test("f8997.compute: throws on negative long_term_gain_included", () => {
  assertThrows(() =>
    compute({
      part_iii: [
        {
          description: "Bad QOF",
          qof_ein: "00-0000000",
          date_acquired: "2021-01-01",
          date_of_inclusion: "2025-01-01",
          short_term_gain_included: 0,
          long_term_gain_included: -500,
        },
      ],
    }),
    Error
  );
});

Deno.test("f8997.compute: throws on negative short_term_gain_included", () => {
  assertThrows(() =>
    compute({
      part_iii: [
        {
          description: "Bad QOF",
          qof_ein: "00-0000000",
          date_acquired: "2021-01-01",
          date_of_inclusion: "2025-01-01",
          short_term_gain_included: -200,
          long_term_gain_included: 0,
        },
      ],
    }),
    Error
  );
});

// =============================================================================
// 9. Smoke Test — Realistic Full Scenario
// =============================================================================

Deno.test("f8997.compute: smoke — QOF investor with existing and new holdings, one disposition", () => {
  // Taxpayer: held a QOF since 2020 (Part I), made new QOF investment in 2025 (Part II),
  // disposed of a different QOF in 2025 recognizing $40k LT deferred gain (Part III),
  // still holds the 2020 QOF at year-end (Part IV).
  const result = compute({
    part_i: [
      {
        description: "QOF Legacy Fund - 10% interest",
        qof_ein: "10-1010101",
        date_acquired: "2020-07-01",
        short_term_deferred_gain: 0,
        long_term_deferred_gain: 200000,
      },
    ],
    part_ii: [
      {
        description: "QOF New Fund - 50 shares",
        qof_ein: "20-2020202",
        date_acquired: "2025-04-15",
        short_term_deferred_gain: 15000,
        long_term_deferred_gain: 0,
      },
    ],
    part_iii: [
      {
        description: "QOF Disposed Fund",
        qof_ein: "30-3030303",
        date_acquired: "2019-12-01",
        date_of_inclusion: "2025-08-15",
        short_term_gain_included: 0,
        long_term_gain_included: 40000,
      },
    ],
    part_iv: [
      {
        description: "QOF Legacy Fund - 10% interest",
        qof_ein: "10-1010101",
        date_acquired: "2020-07-01",
        short_term_deferred_gain: 0,
        long_term_deferred_gain: 200000,
      },
    ],
  });

  // Only the Part III LT gain generates output
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, schedule_d.nodeType);
  const tx = (result.outputs[0].fields as Record<string, unknown>)["transaction"] as Record<string, unknown>;
  assertEquals(tx.gain_loss, 40000);
  assertEquals(tx.is_long_term, true);
  assertEquals(tx.adjustment_codes, "Q");
});

Deno.test("f8997.compute: smoke — annual statement with no dispositions", () => {
  // Typical annual filing: just tracking existing QOF investments, no events
  const result = compute({
    part_i: [
      {
        description: "QOF Fund A",
        qof_ein: "10-1010101",
        date_acquired: "2022-09-01",
        short_term_deferred_gain: 0,
        long_term_deferred_gain: 125000,
      },
      {
        description: "QOF Fund B",
        qof_ein: "20-2020202",
        date_acquired: "2023-03-15",
        short_term_deferred_gain: 50000,
        long_term_deferred_gain: 0,
      },
    ],
    part_iv: [
      {
        description: "QOF Fund A",
        qof_ein: "10-1010101",
        date_acquired: "2022-09-01",
        short_term_deferred_gain: 0,
        long_term_deferred_gain: 125000,
      },
      {
        description: "QOF Fund B",
        qof_ein: "20-2020202",
        date_acquired: "2023-03-15",
        short_term_deferred_gain: 50000,
        long_term_deferred_gain: 0,
      },
    ],
  });
  // Pure tracking year — no outputs
  assertEquals(result.outputs.length, 0);
});
