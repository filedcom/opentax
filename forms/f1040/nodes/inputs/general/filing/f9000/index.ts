import { z } from "zod";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import {
  type NodeResult,
  TaxNode,
} from "../../../../../../../core/types/tax-node.ts";

// Form 9000 is an affirmative communication preference, not a tax amount.
export const alternativeMediaCodeSchema = z.enum([
  "00", // Cancel a previous election; use standard print.
  "01", // Large print.
  "02", // Braille.
  "03", // Audio (MP3).
  "04", // Plain text (TXT).
  "05", // Braille ready file (BRF).
]);

export const inputSchema = z.object({
  requests: z.array(
    z.object({
      person: z.enum(["taxpayer", "spouse"]),
      alternative_media_code: alternativeMediaCodeSchema,
      request_confirmed_by_person: z.literal(true),
      request_record_reference: z.string().trim().min(1),
    }).strict(),
  ).min(1).max(2),
}).strict().refine(
  (source) =>
    new Set(source.requests.map((request) => request.person)).size ===
      source.requests.length,
  { message: "Form 9000 needs at most one request per person" },
);

class Form9000Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f9000";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    inputSchema.parse(input);
    return { outputs: [] };
  }
}

export const f9000 = new Form9000Node();
