import { z } from "zod";
import {
  form3800SpecifiedCreditLineSchema,
  form3800StandardCreditLineSchema,
} from "../../../nodes/intermediate/forms/form8582cr/credit-route.ts";
import type {
  Form3800PassiveCreditRow,
  Form3800PassiveCreditVintage,
} from "../../../nodes/inputs/f3800/calculation.ts";

export type Form3800CreditLine =
  | z.infer<typeof form3800StandardCreditLineSchema>
  | "3"
  | z.infer<typeof form3800SpecifiedCreditLineSchema>;

/** TY2025v5.4 IRS3800.xsd Part III and Part IV row tags. */
export const form3800PassiveXmlTags: Readonly<
  Record<
    Form3800CreditLine,
    { readonly current?: string; readonly carryover: string }
  >
> = {
  "1a": {
    current: "Form3468PartIICYCreditsGrp",
    carryover: "Frm3468PartIICYCyovCrGrp",
  },
  "1b": { current: "Form7207CYCreditsGrp", carryover: "Frm7207CYCyovCrGrp" },
  "1c": { current: "Form6765CYCreditsGrp", carryover: "Frm6765CYCyovCrGrp" },
  "1d": {
    current: "Form3468PartIIICYCreditsGrp",
    carryover: "Frm3468PartIIICYCyovCrGrp",
  },
  "1e": { current: "Form8826CYCreditsGrp", carryover: "Frm8826CYCyovCrGrp" },
  "1f": {
    current: "Form8835PartIICYCreditsGrp",
    carryover: "Frm8835PartIICYCyovCrGrp",
  },
  "1g": { current: "Form7210CYCreditsGrp", carryover: "Frm7210CYCyovCrGrp" },
  "1h": { current: "Form8820CYCreditsGrp", carryover: "Frm8820CYCyovCrGrp" },
  "1i": { current: "Form8874CYCreditsGrp", carryover: "Frm8874CYCyovCrGrp" },
  "1j": {
    current: "Form8881PartICYCreditsGrp",
    carryover: "Frm8881PartICYCyovCrGrp",
  },
  "1k": { current: "Form8882CYCreditsGrp", carryover: "Frm8882CYCyovCrGrp" },
  "1l": {
    current: "Form8864CYCreditsGrp",
    carryover: "Frm8864BiodieselCYCreditsGrp",
  },
  "1m": { current: "Form8896CYCreditsGrp", carryover: "Frm8896CYCyovCrGrp" },
  "1n": { current: "Form8906CYCreditsGrp", carryover: "Frm8906CYCyovCrGrp" },
  "1o": {
    current: "Form3468PartIVCYCreditsGrp",
    carryover: "Frm3468PartIVCYCyovCrGrp",
  },
  "1p": { current: "Form8908CYCreditsGrp", carryover: "Frm8908CYCyovCrGrp" },
  "1q": {
    current: "Form7218PartIICYCreditsGrp",
    carryover: "Frm7218PartIICYCyovCrGrp",
  },
  "1s": {
    current: "Form8911PartICYCreditsGrp",
    carryover: "Frm8911CYCyovCrGrp",
  },
  "1t": { current: "Form8830CYCreditsGrp", carryover: "Frm8830CYCyovCrGrp" },
  "1u": {
    current: "Form7213PartIICYCreditsGrp",
    carryover: "Frm7213PartIICYCyovCrGrp",
  },
  "1v": {
    current: "Form3468PartVCYCreditsGrp",
    carryover: "Frm3468PartVCYCyovCrGrp",
  },
  "1w": { current: "Form8932CYCreditsGrp", carryover: "Frm8932CYCyovCrGrp" },
  "1x": { current: "Form8933CYCreditsGrp", carryover: "Frm8933CYCyovCrGrp" },
  "1y": {
    current: "Form8936PartIICYCreditsGrp",
    carryover: "Frm8936PartIICYCyovCrGrp",
  },
  "1aa": {
    current: "Form8936PartVCYCreditsGrp",
    carryover: "Frm8936PartVCYCyovCrGrp",
  },
  "1bb": { current: "Form8904CYCreditsGrp", carryover: "Frm8904CYCyovCrGrp" },
  "1cc": {
    current: "Form7213PartICYCreditsGrp",
    carryover: "Frm7213PartICYCyovCrGrp",
  },
  "1dd": {
    current: "Form8881PartIICYCreditsGrp",
    carryover: "Frm8881PartIICYCyovCrGrp",
  },
  "1ee": {
    current: "Form8881PartIIICYCreditsGrp",
    carryover: "Frm8881PartIIICYCyovCrGrp",
  },
  "1ff": {
    current: "Frm8864SAFCYCreditsGrp",
    carryover: "Frm8864SAFCYCyovCrGrp",
  },
  "1gg": {
    current: "Form7211PartIICYCreditsGrp",
    carryover: "Frm7211PartIICYCyovCrGrp",
  },
  "1zz": {
    current: "GenBusCYOtherCreditsGrp",
    carryover: "CYCyovOtherBusCreditsGrp",
  },
  "2a": { carryover: "Frm5884ACYCfwdAllwCrGrp" },
  "2b": { carryover: "Frm8586CYCfwdAllwCrGrp" },
  "2c": { carryover: "Frm8845CYCfwdAllwCrGrp" },
  "2d": { carryover: "Frm8907CYCfwdAllwCrGrp" },
  "2e": { carryover: "Frm8909CYCfwdAllwCrGrp" },
  "2f": { carryover: "Frm8923CYCfwdAllwCrGrp" },
  "2h": { carryover: "Frm8931CYCfwdAllwCrGrp" },
  "2i": { carryover: "Frm1065BCYCfwdAllwCrGrp" },
  "2j": { carryover: "Frm5884CYCfwdAllwCrGrp" },
  "2k": { carryover: "Frm6478CYCfwdAllwCrGrp" },
  "2l": { carryover: "Frm8846CYCfwdAllwCrGrp" },
  "2m": { carryover: "Frm8900CYCfwdAllwCrGrp" },
  "2n": { carryover: "CYCfwdAllwCrTransAKPipelineGrp" },
  "2o": { carryover: "CYCfwdAllwCrEmplrAffctHrrcnGrp" },
  "2p": { carryover: "CYCfwdAllwCrHrrcnKtrnHsngGrp" },
  "2q": { carryover: "CYCfwdAllwCrMwdDsstrEmplrGrp" },
  "2r": { carryover: "CYCfwdAllwCrEmplrHsngGrp" },
  "2s": { carryover: "Frm5884BCYCfwdAllwCrGrp" },
  "2t": { carryover: "Frm8847CYCfwdAllwCrGrp" },
  "2u": { carryover: "Frm8861CYCfwdAllwCrGrp" },
  "2v": { carryover: "Frm8884CYCfwdAllwCrGrp" },
  "2w": { carryover: "Frm8942CYCfwdAllwCrGrp" },
  "2x": { carryover: "Frm8910CYCfwdAllwCrGrp" },
  "2zz": { carryover: "CYCfwdAllwOtherBusCreditsGrp" },
  "3": { current: "Form8844CYCreditsGrp", carryover: "Frm8844CYCrovCrGrp" },
  "4a": {
    current: "Form3468PartVICYCreditsGrp",
    carryover: "Frm3468PartVICYSpcfdCrGrp",
  },
  "4b": { current: "Form5884CYCreditsGrp", carryover: "Frm5884CYSpcfdCrGrp" },
  "4c": { current: "Form6478CYCreditsGrp", carryover: "Frm6478CYSpcfdCrGrp" },
  "4d": { current: "Form8586CYCreditsGrp", carryover: "Frm8586CYSpcfdCrGrp" },
  "4e": {
    current: "Frm8835PartIICYSpcfdCreditsGrp",
    carryover: "Frm8835CYSpcfdCrGrp",
  },
  "4f": { current: "Form8846CYCreditsGrp", carryover: "Frm8846CYSpcfdCrGrp" },
  "4g": { current: "Form8900CYCreditsGrp", carryover: "Frm8900CYSpcfdCrGrp" },
  "4h": { current: "Form8941CYCreditsGrp", carryover: "Frm8941CYSpcfdCrGrp" },
  "4i": {
    current: "Form6765ESBCYCreditsGrp",
    carryover: "Frm6765ESBCYSpcfdCrGrp",
  },
  "4j": { current: "Form8994CYCreditsGrp", carryover: "Frm8994CYSpcfdCrGrp" },
  "4k": {
    current: "Form3468PartVIICYCreditsGrp",
    carryover: "Frm3468PartVIICYSpcfdCrGrp",
  },
  "4y": { carryover: "ESCBCYCreditsGrp" },
  "4z": {
    current: "GenBusOtherSpecifiedCYCrGrp",
    carryover: "CYOtherSpcfdCreditsGrp",
  },
};

export type PlannedForm3800PassiveXmlRow = {
  readonly form3800CreditLine: Form3800CreditLine;
  readonly part: "current" | "carryover";
  readonly tag: string;
  /** A summary year exists only when every source has the same origin year. */
  readonly summaryOriginatingTaxYear: number | undefined;
  readonly beforePassiveLimit: number;
  readonly afterPassiveLimit: number;
  readonly sources: readonly Form3800PassiveCreditVintage[];
  readonly requiresSourceBreakdown: boolean;
};

/** Part IV has one XML group per credit line, even with several origin years. */
export function planForm3800PassiveXmlRows(
  rows: readonly Form3800PassiveCreditRow[],
): PlannedForm3800PassiveXmlRow[] {
  const lineOrder = [
    ...form3800StandardCreditLineSchema.options,
    "3",
    ...form3800SpecifiedCreditLineSchema.options,
  ];
  const part = (year: number) => year === 2025 ? "current" : "carryover";
  const ordered = [...rows].sort((a, b) =>
    (part(a.originatingTaxYear) === "current" ? 0 : 1) -
      (part(b.originatingTaxYear) === "current" ? 0 : 1) ||
    lineOrder.indexOf(a.form3800CreditLine) -
      lineOrder.indexOf(b.form3800CreditLine) ||
    a.originatingTaxYear - b.originatingTaxYear
  );
  return ordered.reduce<PlannedForm3800PassiveXmlRow[]>((planned, row) => {
    const rowPart = part(row.originatingTaxYear);
    const tags = form3800PassiveXmlTags[row.form3800CreditLine];
    const tag = rowPart === "current" ? tags.current : tags.carryover;
    if (!tag) {
      throw new Error(
        `Form 3800 line ${row.form3800CreditLine} has no ${rowPart} XML row`,
      );
    }
    const prior = planned.at(-1);
    if (
      prior?.part === rowPart &&
      prior.form3800CreditLine === row.form3800CreditLine
    ) {
      const beforePassiveLimit = prior.beforePassiveLimit +
        row.beforePassiveLimit;
      const afterPassiveLimit = prior.afterPassiveLimit +
        row.afterPassiveLimit;
      if (
        !Number.isSafeInteger(beforePassiveLimit) ||
        !Number.isSafeInteger(afterPassiveLimit)
      ) {
        throw new Error("Form 3800 passive XML row exceeds whole-dollar range");
      }
      const sources = [...prior.sources, ...row.sources];
      return [...planned.slice(0, -1), {
        ...prior,
        summaryOriginatingTaxYear:
          prior.summaryOriginatingTaxYear === row.originatingTaxYear
            ? row.originatingTaxYear
            : undefined,
        beforePassiveLimit,
        afterPassiveLimit,
        sources,
        requiresSourceBreakdown: sources.length > 1,
      }];
    }
    return [...planned, {
      form3800CreditLine: row.form3800CreditLine,
      part: rowPart,
      tag,
      summaryOriginatingTaxYear: row.originatingTaxYear,
      beforePassiveLimit: row.beforePassiveLimit,
      afterPassiveLimit: row.afterPassiveLimit,
      sources: row.sources,
      requiresSourceBreakdown: row.sources.length > 1,
    }];
  }, []);
}
