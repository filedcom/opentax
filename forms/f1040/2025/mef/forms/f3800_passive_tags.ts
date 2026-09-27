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

/** TY2025v5.4 IRS3800.xsd Part VI source-detail groups for Part IV rows. */
export const form3800CarryoverDetailXmlTags = {
  "1a": "Frm3468PartIICYAggrgtAmtGrp",
  "1b": "Frm7207CYCyovCrAggrgtGrp",
  "1c": "Frm6765CYCyovCrAggrgtGrp",
  "1d": "Frm3468PartIIICyovCrAggrgtGrp",
  "1e": "Frm8826CYCyovCrAggrgtGrp",
  "1f": "Frm8835PartIICYCyovCrAggrgtGrp",
  "1g": "Frm7210CYCyovCrAggrgtGrp",
  "1h": "Frm8820CYCyovCrAggrgtGrp",
  "1i": "Frm8874CYCyovCrAggrgtGrp",
  "1j": "Frm8881PartICYCyovCrAggrgtGrp",
  "1k": "Frm8882CYCyovCrAggrgtGrp",
  "1l": "Frm8864BdslCYCyovCrAggrgtGrp",
  "1m": "Frm8896CYCyovCrAggrgtGrp",
  "1n": "Frm8906CYCyovCrAggrgtGrp",
  "1o": "Frm3468PartIVCYCyovCrAggrgtGrp",
  "1p": "Frm8908CYCyovCrAggrgtGrp",
  "1q": "Frm7218PartIICYCyovCrAggrgtGrp",
  "1s": "Frm8911CYCyovCrAggrgtGrp",
  "1t": "Frm8830CYCyovCrAggrgtGrp",
  "1u": "Frm7213PartIICYCyovCrAggrgtGrp",
  "1v": "Frm3468PartVCYCyovCrAggrgtGrp",
  "1w": "Frm8932CYCyovCrAggrgtGrp",
  "1x": "Frm8933CYCyovCrAggrgtGrp",
  "1y": "Frm8936PartIICYCyovCrAggrgtGrp",
  "1aa": "Frm8936PartVCYCyovCrAggrgtGrp",
  "1bb": "Frm8904CYCyovCrAggrgtGrp",
  "1cc": "Frm7213PartICYCyovCrAggrgtGrp",
  "1dd": "Frm8881PartIICYCyovCrAggrgtGrp",
  "1ee": "Frm8881PartIIICYCyovCrAggrgGrp",
  "1ff": "Frm8864SAFCYCyovCrAggrgtGrp",
  "1gg": "Frm7211PartIICYCyovCrAggrgtGrp",
  "1zz": "CYCyovOtherBusCreditsAggrgtGrp",
  "2a": "Frm5884ACYCfwdAllwCrAggrgtGrp",
  "2b": "Frm8586CYCfwdAllwCrAggrgtGrp",
  "2c": "Frm8845CYCfwdAllwCrAggrgtGrp",
  "2d": "Frm8907CYCfwdAllwCrAggrgtGrp",
  "2e": "Frm8909CYCfwdAllwCrAggrgtGrp",
  "2f": "Frm8923CYCfwdAllwCrAggrgtGrp",
  "2h": "Frm8931CYCfwdAllwCrAggrgtGrp",
  "2i": "Frm1065BCYCfwdAllwCrAggrgtGrp",
  "2j": "Frm5884CYCfwdAllwCrAggrgtGrp",
  "2k": "Frm6478CYCfwdAllwCrAggrgtGrp",
  "2l": "Frm8846CYCfwdAllwCrAggrgtGrp",
  "2m": "Frm8900CYCfwdAllwCrAggrgtGrp",
  "2n": "CYCfwdAllwTrAKPplnAggrgtGrp",
  "2o": "CYCfwdEmplrAffctHrrcnAggrgtGrp",
  "2p": "CYCfwdAllwKtrnHsngAggrgtGrp",
  "2q": "CYCfwdCrMwdDsstrEmplrAggrgtGrp",
  "2r": "CYCfwdAllwCrEmplrHsngAggrgtGrp",
  "2s": "Frm5884BCYCfwdAllwCrAggrgtGrp",
  "2t": "Frm8847CYCfwdAllwCrAggrgtGrp",
  "2u": "Frm8861CYCfwdAllwCrAggrgtGrp",
  "2v": "Frm8884CYCfwdAllwCrAggrgtGrp",
  "2w": "Frm8942CYCfwdAllwCrAggrgtGrp",
  "2x": "Frm8910CYCfwdAllwCrAggrgtGrp",
  "2zz": "CYCfwdAllwOtherBusCrAggrgtGrp",
  "3": "Frm8844CYCyovCrAggrgtGrp",
  "4a": "Frm3468PartVICYSpfdCrAggrgtGrp",
  "4b": "Frm5884CYSpcfdCrAggrgtGrp",
  "4c": "Frm6478CYSpcfdCrAggrgtGrp",
  "4d": "Frm8586CYSpcfdCrAggrgtGrp",
  "4e": "Frm8835CYSpcfdCrAggrgtGrp",
  "4f": "Frm8846CYSpcfdCrAggrgtGrp",
  "4g": "Frm8900CYSpcfdCrAggrgtGrp",
  "4h": "Frm8941CYSpcfdCrAggrgtGrp",
  "4i": "Frm6765ESBCYSpcfdCrAggrgtGrp",
  "4j": "Frm8994CYSpcfdCrAggrgtGrp",
  "4k": "Frm3468VIICYSpcfdCrAggrgtGrp",
  "4y": "ESBCCYSpcfdCrAggrgtGrp",
  "4z": "CYOtherSpcfdCreditsAggrgtGrp",
} as const satisfies Readonly<Record<Form3800CreditLine, string>>;

/** TY2025v5.4 IRS3800.xsd Part V source-detail groups for Part III rows. */
export const form3800CurrentDetailXmlTags: Readonly<
  Partial<Record<Form3800CreditLine, string>>
> = {
  "1a": "Frm3468PartIICYAggrgtAmtGrp",
  "1b": "Frm7207CYAggrgtAmtGrp",
  "1c": "Frm6765CYAggrgtAmtGrp",
  "1d": "Frm3468PartIIICYAggrgtAmtGrp",
  "1e": "Frm8826CYAggrgtAmtGrp",
  "1f": "Frm8835PartIICYAggrgtAmtGrp",
  "1g": "Frm7210CYAggrgtAmtGrp",
  "1h": "Frm8820CYAggrgtAmtGrp",
  "1i": "Frm8874CYAggrgtAmtGrp",
  "1j": "Frm8881PartICYAggrgtAmtGrp",
  "1k": "Frm8882CYAggrgtAmtGrp",
  "1l": "Frm8864CYAggrgtAmtGrp",
  "1m": "Frm8896CYAggrgtAmtGrp",
  "1n": "Frm8906CYAggrgtAmtGrp",
  "1o": "Frm3468PartIVCYAggrgtAmtGrp",
  "1p": "Frm8908CYAggrgtAmtGrp",
  "1q": "Frm7218PartIICYAggrgtAmtGrp",
  "1s": "Frm8911PartICYAggrgtAmtGrp",
  "1t": "Frm8830CYAggrgtAmtGrp",
  "1u": "Frm7213PartIICYAggrgtAmtGrp",
  "1v": "Frm3468PartVCYAggrgtAmtGrp",
  "1w": "Frm8932CYAggrgtAmtGrp",
  "1x": "Frm8933CYAggrgtAmtGrp",
  "1y": "Frm8936PartIICYAggrgtAmtGrp",
  "1aa": "Frm8936PartVCYAggrgtAmtGrp",
  "1bb": "Frm8904CYAggrgtAmtGrp",
  "1cc": "Frm7213PartICYAggrgtAmtGrp",
  "1dd": "Frm8881PartIICYAggrgtAmtGrp",
  "1ee": "Frm8881PartIIICYAggrgtAmtGrp",
  "1ff": "Frm8864SAFCYAggrgtAmtGrp",
  "1gg": "Frm7211PartIICYAggrgtAmtGrp",
  "1zz": "GenBusOtherCrCYAggrgtAmtGrp",
  "3": "Frm8844CYAggrgtAmtGrp",
  "4a": "Frm3468PartVICYAggrgtAmtGrp",
  "4b": "Frm5884CYAggrgtAmtGrp",
  "4c": "Frm6478CYSpcfdCrAggrgtGrp",
  "4d": "Frm8586CYAggrgtAmtGrp",
  "4e": "Frm8835PartIICYSpcfdAmtGrp",
  "4f": "Frm8846CYAggrgtAmtGrp",
  "4g": "Frm8900CYAggrgtAmtGrp",
  "4h": "Frm8941CYAggrgtAmtGrp",
  "4i": "Frm6765ESBCYAggrgtAmtGrp",
  "4j": "Frm8994CYAggrgtAmtGrp",
  "4k": "Frm3468PartVIICYAggrgtAmtGrp",
  "4z": "GenBusOthSpcfdCrCYAggrgtAmtGrp",
};

export type PlannedForm3800PassiveXmlRow<
  T extends Form3800PassiveCreditVintage = Form3800PassiveCreditVintage,
> = {
  readonly form3800CreditLine: Form3800CreditLine;
  readonly part: "current" | "carryover";
  readonly tag: string;
  readonly currentDetailTag: string | undefined;
  readonly carryoverDetailTag: string | undefined;
  /** Part IV column (b) uses the latest year when sources span multiple years. */
  readonly latestOriginatingTaxYear: number;
  readonly beforePassiveLimit: number;
  readonly afterPassiveLimit: number;
  readonly sources: readonly T[];
  readonly requiresSourceBreakdown: boolean;
};

/** Part IV has one XML group per credit line, even with several origin years. */
export function planForm3800PassiveXmlRows<
  T extends Form3800PassiveCreditVintage,
>(
  rows: readonly Form3800PassiveCreditRow<T>[],
): PlannedForm3800PassiveXmlRow<T>[] {
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
  return ordered.reduce<PlannedForm3800PassiveXmlRow<T>[]>((planned, row) => {
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
        latestOriginatingTaxYear: Math.max(
          prior.latestOriginatingTaxYear,
          row.originatingTaxYear,
        ),
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
      currentDetailTag: rowPart === "current"
        ? form3800CurrentDetailXmlTags[row.form3800CreditLine]
        : undefined,
      carryoverDetailTag: rowPart === "carryover"
        ? form3800CarryoverDetailXmlTags[row.form3800CreditLine]
        : undefined,
      latestOriginatingTaxYear: row.originatingTaxYear,
      beforePassiveLimit: row.beforePassiveLimit,
      afterPassiveLimit: row.afterPassiveLimit,
      sources: row.sources,
      requiresSourceBreakdown: row.sources.length > 1,
    }];
  }, []);
}
