import { z } from "zod";
import { UnimplementedTaxNode } from "../../../../../core/types/tax-node.ts";

const inputSchema = z.object({
  line18_early_withdrawal: z.number().optional(),
  line24f_501c18d: z.number().optional(),
});

class Schedule1Node extends UnimplementedTaxNode {
  override readonly inputSchema = inputSchema;
}

export const schedule1 = new Schedule1Node("schedule1", []);
