import { z } from "zod";
import { investmentOwner2026 } from "./investment-source.ts";
import {
  ableSource2026Schema,
  calculateAbleSources2026,
} from "./able-source.ts";
import {
  calculateRetirementSources2026,
  retirementSource2026Schema,
} from "./retirement-source.ts";
import { FilingStatus } from "../../nodes/types.ts";
export const form5329Source2026Schema = investmentOwner2026.extend({
  taxpayer_dob: z.string().date(),
  spouse_dob: z.string().date().optional(),
  retirement_sources_2026: retirementSource2026Schema.optional(),
  able_sources_2026: ableSource2026Schema.optional(),
}).strict();
export type Form5329Source2026 = z.input<typeof form5329Source2026Schema>;
export function calculateForm5329Sources2026(raw: Form5329Source2026) {
  const input = form5329Source2026Schema.parse(raw);
  const retirement = input.retirement_sources_2026
    ? calculateRetirementSources2026(input.retirement_sources_2026)
    : undefined;
  const able = input.able_sources_2026
    ? calculateAbleSources2026(input.able_sources_2026)
    : undefined;
  const sources = [retirement?.source_input, able?.source_input].filter((s) =>
    s !== undefined
  );
  for (const s of sources) {
    if (
      s.filing_status !== input.filing_status ||
      s.taxpayer_ssn !== input.taxpayer_ssn ||
      s.spouse_ssn !== input.spouse_ssn ||
      s.taxpayer_dob !== input.taxpayer_dob || s.spouse_dob !== input.spouse_dob
    ) {
      throw Error(
        "Form 5329 sources must match actual return owners and birth dates",
      );
    }
  }
  if (retirement && able) {
    const ordered = (s: Pick<typeof retirement.source_input, "wage_sources">) =>
      [...s.wage_sources].sort((a, b) =>
        a.source_document_reference.localeCompare(b.source_document_reference)
      );
    if (
      JSON.stringify(ordered(retirement.source_input)) !==
        JSON.stringify(ordered(able.source_input)) ||
      JSON.stringify(retirement.source_input.business_sources_2026) !==
        JSON.stringify(able.source_input.business_sources_2026)
    ) {
      throw Error(
        "Form 5329 retirement and ABLE workpapers need the same actual wage and business inventory",
      );
    }
  }
  // When Part II needs a form, print each early-distribution owner's Part I too.
  // This replaces the return-level code-1 shortcut with the sum of owner forms,
  // preserving the whole-dollar lines actually printed on those forms.
  const part2Required =
    able?.owners.some((o) => o.form5329_part2 !== undefined) ?? false;
  const owners = ([
    "taxpayer",
    ...(input.filing_status === FilingStatus.MFJ ? ["spouse"] : []),
  ] as ("taxpayer" | "spouse")[]).flatMap((owner) => {
    const owner_tin = owner === "taxpayer"
      ? input.taxpayer_ssn
      : input.spouse_ssn;
    const part1 = retirement?.early_owners.find((o) => o.owner === owner);
    const part2 = able?.owners.find((o) => o.owner_tin === owner_tin)
      ?.form5329_part2;
    if (!part1 && !part2) return [];
    return [{
      owner,
      owner_tin: owner_tin!,
      part1,
      part2,
      file_form5329: !!part2 ||
        !!part1 && (part1.file_form5329 || part2Required),
    }];
  });
  const early_tax = part2Required
    ? owners.reduce((n, o) => n + (o.part1?.line4 ?? 0), 0)
    : retirement?.line5_early_tax ?? 0;
  const able_tax = able?.additional_tax ?? 0;
  return {
    source_input: input,
    owners,
    early_tax,
    able_tax,
    schedule2_line5: early_tax + able_tax,
    form5329_not_required: !!retirement?.form5329_not_required &&
      !part2Required,
  };
}
