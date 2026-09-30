import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// TY2025 — Form 5471: Information Return of U.S. Persons With Respect To
// Certain Foreign Corporations.
//
// Filed by U.S. persons who are officers, directors, or shareholders in
// certain foreign corporations (IRC §6038). Five filing categories (1–5)
// determine which schedules must be attached.
//
// This input is retained for intake, but filing remains unsupported. Section
// 951(a) belongs on Schedule 1 line 8n; an individual's section 951A amount
// requires Form 8992 and belongs on line 8o. Neither can be inferred from the
// sparse fields below, and the required Form 5471 schedules are not emitted.
//
// The historical intake contains only a subset of the required schedules.

// ─── Enums ────────────────────────────────────────────────────────────────────

// Filing category determines which schedules are required (Form 5471 instructions p.1)
export enum FilingCategory {
  // Category 1 — U.S. person is an officer or director of a foreign corp in
  // which a U.S. person acquired ≥10% stock. No income inclusion required.
  Category1 = "1",
  // Category 2 — U.S. citizen/resident who is an officer or director of a
  // foreign corporation and a U.S. person acquired ≥10% stock during the year.
  Category2 = "2",
  // Category 3 — U.S. person who acquired ≥10% or an additional ≥10% of a
  // foreign corp, or a U.S. person who disposed of ≥10% stock.
  Category3 = "3",
  // Category 4 — U.S. person who had control (>50% of vote or value) of a
  // foreign corporation for ≥30 days during the annual accounting period.
  Category4 = "4",
  // Category 5 — U.S. shareholders of a controlled foreign corporation (CFC)
  // on the last day of the CFC's annual accounting period. Subpart F/GILTI apply.
  Category5 = "5",
}

// ─── Per-item schema ──────────────────────────────────────────────────────────

// One Form 5471 item = one foreign corporation
export const itemSchema = z.object({
  // ── Identifying information (5471 main screen, Part I) ────────────────────
  // Legal name of the foreign corporation (Form 5471 Part I line 1b)
  foreign_corp_name: z.string(),
  // EIN or reference ID assigned to the corporation (Form 5471 Part I line 1c)
  foreign_corp_ein_or_reference_id: z.string().optional(),
  // Country of incorporation or organization (Form 5471 Part I line 1g)
  country_of_incorporation: z.string(),
  // Functional currency of the foreign corporation (Form 5471 Part I)
  functional_currency: z.string().optional(),
  // Filing category 1–5 (Form 5471 Category of Filer)
  filing_category: z.nativeEnum(FilingCategory),

  // ── Schedule I — Summary of Shareholder's Income (SCHI screen) ───────────
  // Subpart F income includible under IRC §951(a)(1)(A) — Schedule I line 1
  subpart_f_income: z.number().nonnegative().optional(),
  // Previously excluded Subpart F income withdrawn from investment — Schedule I line 5
  previously_excluded_subpart_f_income: z.number().nonnegative().optional(),
  // Amount included under IRC §951(a)(1)(B) (factoring income) — Schedule I line 6
  factoring_income: z.number().nonnegative().optional(),

  // ── Schedule I-1 — GILTI (I1 screen) ─────────────────────────────────────
  // Historical asserted amount; Schedule I-1 reports CFC-level inputs, while
  // the individual's inclusion requires Form 8992.
  gilti_inclusion: z.number().nonnegative().optional(),

  // ── Schedule E — Foreign Taxes Paid (SCHE screen) ────────────────────────
  // Foreign income taxes paid/accrued on Subpart F income (IRC §960(a)) — informational
  foreign_taxes_paid_subpart_f: z.number().nonnegative().optional(),
  // Foreign income taxes paid/accrued allocable to GILTI (IRC §960(d)) — informational
  foreign_taxes_paid_gilti: z.number().nonnegative().optional(),

  // ── Schedule H — Current E&P (SCHH screen) ────────────────────────────────
  // Current year earnings and profits — informational reference data
  current_ep: z.number().optional(),

  // ── Schedule J — Accumulated E&P (SCHJ screen) ────────────────────────────
  // Accumulated E&P at beginning of year — informational reference data
  accumulated_ep_beginning: z.number().optional(),
  // Accumulated E&P at end of year — informational reference data
  accumulated_ep_ending: z.number().optional(),
});

export const inputSchema = z.object({
  f5471s: z.array(itemSchema).min(1),
});

// ─── Node class ───────────────────────────────────────────────────────────────

class F5471Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f5471";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    inputSchema.parse(input);
    throw new Error(
      "TY2025 Form 5471 requires reviewed shareholder inclusions, Form 8992 when applicable, and native Form 5471 schedules before calculation",
    );
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const f5471 = new F5471Node();
