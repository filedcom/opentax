import { z } from "zod";
import type { NodeResult } from "../../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";
import {
  calculateForm8908Source,
  form8908HomeSourceSchema,
} from "../../../../../2025/domains/credits/business/form8908/form8908_source.ts";

// Each entry is one acquired home. The old credit override and approximate
// Schedule 3 deposit could not represent TY2025 Form 8908 or Form 3800.
export const itemSchema = form8908HomeSourceSchema.extend({
  contractor_ssn: z.string().regex(/^\d{9}$/),
  eligible_contractor_and_program_participation_verified: z.literal(true),
  basis_during_construction_verified: z.literal(true),
  no_duplicate_rehabilitation_or_energy_credit_verified: z.literal(true),
});

export const inputSchema = z.object({ f8908s: z.array(itemSchema).min(1) });

class F8908Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8908";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(
    _ctx: NodeContext,
    rawInput: z.infer<typeof inputSchema>,
  ): NodeResult {
    const { f8908s } = inputSchema.parse(rawInput);
    const owner = f8908s[0].contractor_ssn;
    if (f8908s.some((home) => home.contractor_ssn !== owner)) {
      throw new Error("Form 8908 homes need one identified contractor");
    }
    calculateForm8908Source({
      contractor_ssn: owner,
      eligible_contractor_and_program_participation_verified: true,
      basis_during_construction_verified: true,
      no_duplicate_rehabilitation_or_energy_credit_verified: true,
      homes: f8908s.map((home) => ({
        street: home.street,
        unit: home.unit,
        city: home.city,
        state: home.state,
        zip: home.zip,
        acquired_on: home.acquired_on,
        acquired_by_other_person_for_residence_verified:
          home.acquired_by_other_person_for_residence_verified,
        acquisition_record_reference: home.acquisition_record_reference,
        contractor_basis_record_reference:
          home.contractor_basis_record_reference,
        program: home.program,
        zero_energy_ready: home.zero_energy_ready,
        prevailing_wage_met: home.prevailing_wage_met,
        form7220: home.form7220,
        certifier: home.certifier,
        certification_reference: home.certification_reference,
        certified_on: home.certified_on,
        certification_modified: home.certification_modified,
      })),
    });
    throw new Error(
      "Form 8908 direct credit needs native Form 8908, Form 3800, and PDF attachment",
    );
  }
}

export const f8908 = new F8908Node();
