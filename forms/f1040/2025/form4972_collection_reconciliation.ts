import { z } from "zod";
import { inputSchema as f1099rSchema } from "../nodes/inputs/f1099r/index.ts";
import { type FilerIdentity, FilingStatus } from "../mef/header.ts";

const formSchema = z.record(z.string(), z.unknown()).refine((form) =>
  Array.isArray(form.source_document_references) &&
  form.source_document_references.length >= 1 &&
  form.source_document_references.length <= 4 &&
  form.source_document_references.every((ref: unknown) =>
    typeof ref === "string" && ref.trim().length > 0
  )
);
const collectionSchema = z.object({
  forms: z.array(formSchema).min(1).max(2),
  elections: z.array(z.record(z.string(), z.unknown())).min(1).max(2),
  source_forms: z.array(z.record(z.string(), z.unknown())).min(1).max(2),
}).strict();

function sameReferences(left: unknown, right: unknown): boolean {
  return Array.isArray(left) && Array.isArray(right) &&
    left.length === right.length &&
    new Set(left).size === left.length &&
    new Set(right).size === right.length &&
    left.every((ref) => typeof ref === "string" && right.includes(ref));
}

function sameValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => sameValue(value, right[index]));
  }
  if (
    left === null || right === null || typeof left !== "object" ||
    typeof right !== "object"
  ) return false;
  const first = left as Record<string, unknown>;
  const second = right as Record<string, unknown>;
  const keys = Object.keys(first);
  return keys.length === Object.keys(second).length &&
    keys.every((key) =>
      Object.hasOwn(second, key) &&
      sameValue(first[key], second[key])
    );
}

export function reconcileForm4972Collection(
  raw: Record<string, unknown>,
  allPending: Readonly<Record<string, unknown>>,
  filer: FilerIdentity | undefined,
) {
  const { forms, elections, source_forms } = collectionSchema.parse(raw);
  if (
    forms.length !== elections.length || forms.length !== source_forms.length
  ) {
    throw new Error(
      "Form 4972 pending forms, elections, and source groups must correspond",
    );
  }
  const source = f1099rSchema.parse(allPending.f1099r);
  const elected = source.f1099rs.filter((item) =>
    item.exclude_4972 === true && item.no_distribution_received !== true
  );
  const used = new Set<string>();
  const scoped = forms.map((form) => {
    const refs = form.source_document_references as string[];
    const election = elections.find((item) =>
      sameReferences(item.source_document_references, refs)
    );
    const sourceForm = source_forms.find((item) =>
      sameReferences(item.source_document_references, refs)
    );
    if (
      !election || !sourceForm ||
      !Object.entries(election).every(([key, value]) =>
        key === "source_document_references" ||
        key === "participant_name" || key === "participant_ssn" ||
        key === "plan_reference" || sameValue(form[key], value)
      ) ||
      !Object.entries(sourceForm).every(([key, value]) =>
        key === "source_document_references" || key === "form4972_plan" ||
        sameValue(form[key], value)
      )
    ) {
      throw new Error(
        "Form 4972 computed form differs from its submitted election or source group",
      );
    }
    const items = elected.filter((item) =>
      item.source_document_reference !== undefined &&
      refs.includes(item.source_document_reference)
    );
    if (
      items.length !== refs.length ||
      items.some((item) =>
        !item.source_document_reference ||
        used.has(item.source_document_reference)
      ) ||
      refs.some((ref) =>
        !items.some((item) => item.source_document_reference === ref)
      )
    ) {
      throw new Error(
        "Form 4972 collection needs distinct matched source copies for every form",
      );
    }
    if (
      election.participant_name !== undefined ||
      election.participant_ssn !== undefined ||
      election.plan_reference !== undefined
    ) {
      const plan = items[0]?.form4972_plan;
      if (
        !plan ||
        items.some((item) =>
          item.form4972_plan?.participant_name !== election.participant_name ||
          item.form4972_plan?.participant_ssn !== election.participant_ssn ||
          item.form4972_plan?.plan_reference !== election.plan_reference
        )
      ) {
        throw new Error(
          "Form 4972 elected participant and plan differ from the source copies",
        );
      }
    }
    refs.forEach((ref) => used.add(ref));
    const tax = form.elect_10yr_averaging === true ? form.line30 : form.line7;
    if (typeof tax !== "number" || !Number.isFinite(tax) || tax <= 0) {
      throw new Error(
        "Form 4972 collection needs each participant's positive computed tax",
      );
    }
    const returnFields = allPending.f1040 as
      | Record<string, unknown>
      | undefined;
    return {
      fields: form,
      sources: items,
      pending: {
        ...allPending,
        f1099r: { f1099rs: items },
        f1040: { ...returnFields, form4972_tax: tax },
      },
      tax,
    };
  });
  if (used.size !== elected.length) {
    throw new Error("Form 4972 collection omits an elected Form 1099-R source");
  }
  const returnFields = allPending.f1040 as Record<string, unknown> | undefined;
  if (
    !returnFields ||
    returnFields.form4972_tax !==
      scoped.reduce((sum, entry) => sum + entry.tax, 0)
  ) {
    throw new Error(
      "Form 4972 participant taxes must sum to the finalized Form 1040 tax",
    );
  }
  if (forms.length === 2) {
    if (
      !filer || filer.filingStatus !== FilingStatus.MarriedFilingJointly ||
      !filer.spouse?.ssn ||
      scoped.some(({ fields, sources }) =>
        (sources.length !== 1 && sources.length !== 2) ||
        (fields.elect_10yr_averaging !== true &&
          (sources.length !== 1 || fields.elect_capital_gain !== true ||
            typeof fields.capital_gain_amount !== "number" ||
            fields.capital_gain_amount <= 0)) ||
        fields.beneficiary_distribution !== false ||
        fields.recipient_share_pct !== undefined ||
        (fields.box6_nua ?? 0) !== 0 ||
        (fields.annuity_actuarial_value ?? 0) !== 0 ||
        (fields.federal_estate_tax ?? 0) !== 0 ||
        (fields.death_benefit_exclusion ?? 0) !== 0
      )
    ) {
      throw new Error(
        "Form 4972 spouse pair needs a joint full-share, source-matched Part II or Part III return",
      );
    }
    const ordinary = scoped.reduce(
      (sum, { fields }) =>
        sum +
        (fields.elect_10yr_averaging === true
          ? 0
          : Number(fields.lump_sum_amount) -
            Number(fields.capital_gain_amount)),
      0,
    );
    if (
      (returnFields.line5b_form4972_ordinary ?? 0) !== ordinary ||
      (ordinary > 0 &&
        (typeof returnFields.line5b_pension_taxable !== "number" ||
          returnFields.line5b_pension_taxable < ordinary))
    ) {
      throw new Error(
        "Form 4972 spouse Part II ordinary income must match Form 1040 pension income",
      );
    }
    const taxpayer = scoped.find(({ fields }) => fields.recipient === "T");
    const spouse = scoped.find(({ fields }) => fields.recipient === "S");
    if (
      !taxpayer || !spouse ||
      taxpayer.sources.some((source) =>
        source.form4972_plan?.participant_ssn !== filer.primarySSN
      ) ||
      spouse.sources.some((source) =>
        source.form4972_plan?.participant_ssn !== filer.spouse!.ssn
      ) ||
      taxpayer.sources[0].form4972_plan?.plan_reference ===
        spouse.sources[0].form4972_plan?.plan_reference
    ) {
      throw new Error(
        "Form 4972 spouse forms need owner-matched distinct plans",
      );
    }
  }
  return scoped;
}
