import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Per-entry schema — one W-2G from one payer
export const itemSchema = z.object({
  calendar_year: z.literal(2025).optional(),
  box1_winnings: z.number().nonnegative().optional(),
  box2_date_won: z.string().optional(),
  box3_type_of_wager: z.string().optional(),
  box4_federal_withheld: z.number().nonnegative().optional(),
  box5_transaction: z.string().optional(),
  box6_race: z.string().optional(),
  box7_identical_wagers: z.number().nonnegative().optional(),
  box8_cashier: z.string().optional(),
  box9_winner_tin: z.string().optional(),
  box10_window: z.string().optional(),
  box11_first_id: z.string().optional(),
  box12_second_id: z.string().optional(),
  box13_state: z.string().length(2).optional(),
  box13_payer_state_id: z.string().optional(),
  box14_state_winnings: z.number().nonnegative().optional(),
  box15_state_withheld: z.number().nonnegative().optional(),
  payer_name: z.string().optional(),
  payer_name_control: z.string().regex(/^[A-Z0-9]{1,4}$/).optional(),
  payer_us_address: z.object({
    line1: z.string().trim().min(1),
    line2: z.string().trim().min(1).optional(),
    city: z.string().trim().min(1),
    state: z.string().length(2),
    zip: z.string().regex(/^\d{5}(?:-\d{4})?$/),
  }).optional(),
  payer_ein: z.string().optional(),
  winner_name: z.string().trim().min(1).max(35).optional(),
  winner_us_address: z.object({
    line1: z.string().trim().min(1),
    line2: z.string().trim().min(1).optional(),
    city: z.string().trim().min(1),
    state: z.string().length(2),
    zip: z.string().regex(/^\d{5}(?:-\d{4})?$/),
  }).optional(),
  standard_or_nonstandard_code: z.enum(["S", "N"]).optional(),
  source_document_reference: z.string().trim().min(1).optional(),
  issued_copy_attachment_file_name: z.string().trim().min(1).optional(),
  issued_copy_pdf_sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
}).strict().superRefine((item, ctx) => {
  if (
    (item.box1_winnings ?? 0) <= 0 && (item.box4_federal_withheld ?? 0) <= 0
  ) {
    return;
  }
  if (
    !item.source_document_reference || !item.payer_name?.trim() ||
    !item.payer_ein || !/^\d{2}-?\d{7}$/.test(item.payer_ein)
  ) {
    ctx.addIssue({
      code: "custom",
      message:
        "Positive W-2G winnings or withholding need an issued-copy reference and identified payer name and EIN",
    });
  }
});

export const inputSchema = z.object({
  w2gs: z.array(itemSchema).min(1),
}).superRefine(({ w2gs }, ctx) => {
  const references = new Set<string>();
  const copyFiles = new Set<string>();
  const copyHashes = new Set<string>();
  const transactions = new Set<string>();
  w2gs.forEach((item, index) => {
    const reference = item.source_document_reference?.trim();
    if (reference && references.has(reference)) {
      ctx.addIssue({
        code: "custom",
        path: ["w2gs", index, "source_document_reference"],
        message: "The same payer-issued W-2G source cannot be entered twice",
      });
    }
    if (reference) references.add(reference);
    const file = item.issued_copy_attachment_file_name;
    if (file && copyFiles.has(file)) {
      ctx.addIssue({
        code: "custom",
        path: ["w2gs", index, "issued_copy_attachment_file_name"],
        message:
          "Each payer-issued W-2G copy must have its own attachment file",
      });
    }
    if (file) copyFiles.add(file);
    const hash = item.issued_copy_pdf_sha256;
    if (hash && copyHashes.has(hash)) {
      ctx.addIssue({
        code: "custom",
        path: ["w2gs", index, "issued_copy_pdf_sha256"],
        message:
          "The same payer-issued W-2G PDF cannot be attached twice under different file names",
      });
    }
    if (hash) copyHashes.add(hash);
    if (
      (item.box1_winnings ?? 0) > 0 || (item.box4_federal_withheld ?? 0) > 0
    ) {
      const payer = item.payer_ein?.replace(/\D/g, "");
      const winner = item.box9_winner_tin?.replace(/\D/g, "");
      const transaction = item.box5_transaction?.trim().toUpperCase();
      if (payer && winner && transaction) {
        const key = JSON.stringify([payer, winner, transaction]);
        if (transactions.has(key)) {
          ctx.addIssue({
            code: "custom",
            path: ["w2gs", index, "box5_transaction"],
            message:
              "The same identified W-2G payer transaction cannot be entered twice",
          });
        }
        transactions.add(key);
      }
    }
  });
});

export type W2GItem = z.infer<typeof itemSchema>;
type W2GItems = W2GItem[];

function totalWinnings(items: W2GItems): number {
  return items.reduce(
    (sum, item) => sum + (item.box1_winnings ?? 0),
    0,
  );
}

function totalFederalWithheld(items: W2GItems): number {
  return items.reduce(
    (sum, item) => sum + (item.box4_federal_withheld ?? 0),
    0,
  );
}

function schedule1Output(items: W2GItems): NodeOutput[] {
  const winnings = totalWinnings(items);
  if (winnings === 0) return [];
  return [output(schedule1, { line8b_gambling_winnings: winnings })];
}

function agiAggregatorOutput(items: W2GItems): NodeOutput[] {
  const winnings = totalWinnings(items);
  if (winnings === 0) return [];
  return [output(agi_aggregator, { line8b_gambling_winnings: winnings })];
}

function f1040Output(items: W2GItems): NodeOutput[] {
  const withheld = totalFederalWithheld(items);
  if (withheld === 0) return [];
  return [output(f1040, { line25c_other_withheld: withheld })];
}

class W2GNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "w2g";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1, f1040, agi_aggregator]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const { w2gs } = parsed;

    const outputs: NodeOutput[] = [
      ...schedule1Output(w2gs),
      ...f1040Output(w2gs),
      ...agiAggregatorOutput(w2gs),
    ];

    return { outputs };
  }
}

export const w2g = new W2GNode();
