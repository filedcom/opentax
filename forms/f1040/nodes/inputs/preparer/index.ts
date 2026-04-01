import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Preparer / ERO Input Node
//
// Captures paid preparer and Electronic Return Originator (ERO) information
// for professionally-prepared returns. Fields are routed to the f1040 pending
// dict as preparer_* pass-throughs, where extractFilerIdentity() picks them
// up to populate the MeF return header's <PaidPreparerInfo> and <OriginatorGrp>.

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum OriginatorType {
  ERO = "ERO",
  ISP = "ISP",
  OnlineFiler = "OnlineFiler",
}

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // IRS Preparer Tax Identification Number (P followed by 8 digits)
  ptin: z.string().regex(/^P\d{8}$/).optional(),
  // Firm info
  firm_name: z.string().max(35).optional(),
  firm_ein: z.string().regex(/^\d{9}$/).optional(),
  firm_address_line1: z.string().max(35).optional(),
  firm_city: z.string().max(22).optional(),
  firm_state: z.string().length(2).optional(),
  firm_zip: z.string().regex(/^\d{5}(-\d{4})?$/).optional(),
  // Self-prepared: no PTIN required by IRS
  self_prepared: z.boolean().optional(),
  // Electronic Filing Identification Number (6 digits)
  efin: z.string().regex(/^\d{6}$/).optional(),
  // Originator type for OriginatorGrp in the return header
  originator_type: z.nativeEnum(OriginatorType).optional(),
});

// ─── Type aliases ─────────────────────────────────────────────────────────────

type PreparerInput = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Route all preparer fields to the f1040 pending dict as preparer_* keys.
// extractFilerIdentity() in filer.ts reads these to build PreparedByInfo
// and OriginatorInfo for the MeF return header.
function buildF1040Fields(input: PreparerInput): Record<string, unknown> {
  const fields: Record<string, unknown> = {};

  if (input.self_prepared !== undefined) {
    fields["preparer_self_prepared"] = input.self_prepared;
  }
  if (input.ptin !== undefined) {
    fields["preparer_ptin"] = input.ptin;
  }
  if (input.firm_name !== undefined) {
    fields["preparer_firm_name"] = input.firm_name;
  }
  if (input.firm_ein !== undefined) {
    fields["preparer_firm_ein"] = input.firm_ein;
  }
  if (input.firm_address_line1 !== undefined) {
    fields["preparer_firm_address_line1"] = input.firm_address_line1;
  }
  if (input.firm_city !== undefined) {
    fields["preparer_firm_city"] = input.firm_city;
  }
  if (input.firm_state !== undefined) {
    fields["preparer_firm_state"] = input.firm_state;
  }
  if (input.firm_zip !== undefined) {
    fields["preparer_firm_zip"] = input.firm_zip;
  }
  if (input.efin !== undefined) {
    fields["preparer_efin"] = input.efin;
  }
  if (input.originator_type !== undefined) {
    fields["preparer_originator_type"] = input.originator_type;
  }

  return fields;
}

// ─── Node class ───────────────────────────────────────────────────────────────

class PreparerNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "preparer";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040]);

  compute(_ctx: NodeContext, rawInput: PreparerInput): NodeResult {
    const input = inputSchema.parse(rawInput);
    const fields = buildF1040Fields(input);

    if (Object.keys(fields).length === 0) {
      return { outputs: [] };
    }

    const outputs: NodeOutput[] = [
      { nodeType: f1040.nodeType, fields },
    ];

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const preparer = new PreparerNode();
