import {
  calculateForm4852Bridge2026,
  form4852Claim2026Schema,
} from "./inputs/form4852-bridge.ts";
import { inputSchema as generalSchema } from "./inputs/general.ts";
import { retirementClaim2026Schema } from "./inputs/retirement-source.ts";
import { w2Item2026Schema } from "./inputs/w2-source.ts";
import { FilingStatus } from "../nodes/types.ts";
import { TaxNode } from "../../../core/types/tax-node.ts";
import type { NodeContext } from "../../../core/types/node-context.ts";
import { buildStartNode } from "../start.ts";
import { inputNodes } from "./inputs.ts";
import { claimInputSchema as scheduleAClaim } from "./nodes/schedule-a.ts";
const base = buildStartNode(inputNodes, { routeLegacyJointSeOwners: false });
/** Route the original medical inventory before AGI; Schedule A consumes AGI
 * later, so a Schedule A-to-HSA edge would create a calculation cycle. */
class SourceStart2026 extends TaxNode<typeof base.inputSchema> {
  readonly nodeType = "start";
  readonly inputSchema = base.inputSchema;
  readonly outputNodes = base.outputNodes;
  compute(ctx: NodeContext, input: Record<string, unknown>) {
    let routed = input;
    let substitute: ReturnType<typeof calculateForm4852Bridge2026> | undefined;
    if (input.f4852) {
      const g = generalSchema.parse(input.general);
      const retirement = input.f1099r
        ? retirementClaim2026Schema.parse(input.f1099r)
        : undefined;
      substitute = calculateForm4852Bridge2026({
        ...form4852Claim2026Schema.parse(input.f4852),
        filing_status: g.filing_status,
        taxpayer_ssn: g.taxpayer_ssn.replaceAll("-", ""),
        spouse_ssn: g.filing_status === FilingStatus.MFJ
          ? g.spouse_ssn?.replaceAll("-", "")
          : undefined,
        taxpayer_name: [
          g.taxpayer_first_name,
          g.taxpayer_middle_initial,
          g.taxpayer_last_name,
        ].filter(Boolean).join(" "),
        spouse_name: g.filing_status === FilingStatus.MFJ
          ? [g.spouse_first_name, g.spouse_last_name]
            .filter(Boolean).join(" ")
          : undefined,
        issued_wages: w2Item2026Schema.array().parse(input.w2s ?? []),
        issued_retirement_copies: retirement?.claim.copies ?? [],
      });
      if (substitute.substitute_retirement_copies.length && !retirement) {
        throw Error(
          "Form 4852 retirement sources need the annual retirement treatment and basis claim",
        );
      }
      routed = {
        ...input,
        w2s: substitute.effective_wages,
        ...(retirement
          ? {
            f1099r: {
              claim: {
                ...retirement.claim,
                copies: substitute.effective_retirement_copies,
              },
            },
          }
          : {}),
      };
    }
    const initial = base.compute(ctx, routed);
    const result = {
      ...initial,
      outputs: initial.outputs.map((o) =>
        substitute && o.nodeType === "f4852"
          ? { ...o, fields: substitute.source_input }
          : substitute && substitute.substitute_retirement_copies.length &&
              o.nodeType === "f1099r"
          ? {
            ...o,
            fields: {
              ...o.fields,
              form4852_sources_2026: substitute.source_input,
            },
          }
          : o
      ),
    };
    if (input.hsa_accounts) {
      return {
        ...result,
        outputs: [...result.outputs, {
          nodeType: "hsa_accounts",
          fields: {
            schedule_a_medical_sources: input.schedule_a
              ? scheduleAClaim.parse(input.schedule_a).medical_payments ?? []
              : [],
          },
        }],
      };
    }
    return result;
  }
}
export const sourceStart2026 = new SourceStart2026();
