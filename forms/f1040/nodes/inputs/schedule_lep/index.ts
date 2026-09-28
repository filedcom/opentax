import { z } from "zod";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { TaxNode, type NodeResult } from "../../../../../core/types/tax-node.ts";

// Schedule LEP (Rev. December 2024) is the current preference form in the
// TY2025 Form 1040 schema. A cancellation is an affirmative 000 request.
export enum LanguagePreferenceCode {
  Cancel = "000",
  Spanish = "001",
  Korean = "002",
  Vietnamese = "003",
  Russian = "004",
  Arabic = "005",
  HaitianCreole = "006",
  Tagalog = "007",
  Portuguese = "008",
  Polish = "009",
  Farsi = "010",
  French = "011",
  Japanese = "012",
  Gujarati = "013",
  Punjabi = "014",
  Khmer = "015",
  Urdu = "016",
  Bengali = "017",
  Italian = "018",
  ChineseTraditional = "019",
  ChineseSimplified = "020",
}

export const itemSchema = z.object({
  person: z.enum(["taxpayer", "spouse"]),
  language_preference_code: z.nativeEnum(LanguagePreferenceCode),
}).strict();

export const inputSchema = z.object({
  requests: z.array(itemSchema).min(1).max(2),
}).strict().refine((source) =>
  new Set(source.requests.map((request) => request.person)).size ===
    source.requests.length, {
  message: "Schedule LEP needs at most one request per person",
});

class ScheduleLepNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_lep";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    inputSchema.parse(input);
    return { outputs: [] };
  }
}

export const schedule_lep = new ScheduleLepNode();
