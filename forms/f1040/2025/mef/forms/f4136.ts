import { z } from "zod";
import { PDFDocument } from "pdf-lib";
import { element, elements } from "../../../mef/xml.ts";
import { fillFormPdf } from "../../pdf/builder.ts";
import { projectForm4136Fields } from "../../pdf/forms/f4136.ts";
import {
  form4136ScheduleAFileName,
  form4136ScheduleAPdf,
} from "../../pdf/forms/f4136_schedule_a.ts";
import {
  allForm4136Claims,
  calculateForm4136,
  form4136ClaimCreditCents,
  type Form4136Input,
  inputSchema,
  rateForForm4136Claim,
} from "../../../nodes/inputs/f4136/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

type Claim = Form4136Input["claims"][number];
type Line = Claim["line"];
type PendingForm4136 = Partial<Form4136Input>;

const alternativeFuelTags = [
  [
    "11a",
    "NontxLiquefiedPetroleumGasGrp",
    "NontxLiqfdPtrlmActlFlCstAmt",
    "NontxLiquefiedPtrlmGasCrAmt",
    "419",
    "BusNontxLiquifiedPetroleumGas",
  ],
  [
    "11b",
    "NontxPSeriesFuelsGrp",
    "NontxPSeriesFuelsActlFlCstAmt",
    "NontxPSeriesFuelsCreditAmt",
    "420",
    "BusNontxPSeriesFuels",
  ],
  [
    "11c",
    "NontxCompressedNaturalGasGrp",
    "NontxCmprsdNatGasActlFlCstAmt",
    "NontxCompressedNaturalGasCrAmt",
    "421",
    "BusNontxCompressedNaturalGas",
  ],
  [
    "11d",
    "NontxLiquefiedHydrogenGrp",
    "NontxLiqfdHydrogenActlFlCstAmt",
    "NontxLiquefiedHydrogenCrAmt",
    "422",
    "BusNontxLiquifiedHydrogen",
  ],
  [
    "11e",
    "NontxLiqfdFuelFromCoalGrp",
    "NontxLiqfdFuelCoalActlFlCstAmt",
    "NontxLiqfdFuelDerFromCoalCrAmt",
    "423",
    "BusNontxLiqfdFuelDerFromCoal",
  ],
  [
    "11f",
    "NontxLiqfdFuelDerBiomassGrp",
    "NontxLiqFuelBmssActlFlCstAmt",
    "NontxLiqFuelDerBiomassCrAmt",
    "424",
    "BusNontxLiqFuelDerFromBiomass",
  ],
  [
    "11g",
    "NontxLiquefiedNaturalGasGrp",
    "NontxLiqfdNatGasActlFlCstAmt",
    "NontxLiquefiedNaturalGasCrAmt",
    "425",
    "BusNontxLiquefiedNaturalGas",
  ],
  [
    "11h",
    "NontxLiqfdGasDerBiomassGrp",
    "NontxLiqfdGasBmssActlFlCstAmt",
    "NontxLiquefiedGasBiomassCrAmt",
    "435",
    "BusNontxLiquefiedGasDerBiomass",
  ],
] as const;

function onLine(input: Form4136Input, line: Line): Claim[] {
  return allForm4136Claims(input).filter((claim) => claim.line === line);
}

function lineAmount(claims: readonly Claim[]): number {
  return claims.reduce(
    (sum, claim) => sum + form4136ClaimCreditCents(claim),
    0,
  ) / 100;
}

function cost(claims: readonly Claim[]): number {
  return claims.reduce((sum, claim) => sum + claim.actual_fuel_cost, 0);
}

function qty(claims: readonly Claim[]): number | undefined {
  return claims.length
    ? claims.reduce((sum, claim) => sum + claim.qualified_quantity, 0)
    : undefined;
}

function credit(tag: string, amount: number, crn: string): string {
  return element(tag, amount, { creditReferenceNum: crn });
}

function detail(tag: string, claim: Claim): string {
  return elements(tag, [
    element("NontaxableUseOfFuelTypeCd", claim.type_of_use),
    element("GallonsQty", claim.qualified_quantity),
  ]);
}

function busDetail(tag: string, claim: Claim): string {
  return elements(tag, [
    element("FuelTaxLocalBusCd", "BUS"),
    element("NontaxableUseOfFuelTypeCd", "05"),
    element("CreditRt", rateForForm4136Claim(claim).toFixed(3)),
    element("GallonsQty", claim.qualified_quantity),
  ]);
}

export const form4136: MefFormDescriptor<"f4136", PendingForm4136> = {
  pendingKey: "f4136",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f4136.pdf",
  build(raw, context = {}) {
    if (!raw.claims?.length) return "";
    const input = inputSchema.parse(raw);
    const amount = calculateForm4136(input);
    const schedule3 = z.object({
      line12_fuel_tax_credit: z.number().finite().nonnegative(),
    }).parse(context.pending?.schedule3);
    if (
      Math.round(amount * 100) !==
        Math.round(schedule3.line12_fuel_tax_credit * 100)
    ) {
      throw new Error("Form 4136 total does not match Schedule 3 line 12");
    }

    const l1a = onLine(input, "1a");
    const l1b = onLine(input, "1b");
    const l2b = onLine(input, "2b");
    const l3a = onLine(input, "3a");
    const l3b = onLine(input, "3b");
    const l4a = onLine(input, "4a");
    const l4b = onLine(input, "4b");
    const l5c = onLine(input, "5c");
    const l5d = onLine(input, "5d");
    const scheduleAIds = input.additional_activities.length
      ? Array.from(
        { length: 1 + input.additional_activities.length },
        (_, index) =>
          context.documentIdsByAttachmentFileName?.[
            form4136ScheduleAFileName(index)
          ],
      )
      : [];
    if (
      context.documentIdsByAttachmentFileName && scheduleAIds.some((id) => !id)
    ) {
      throw new Error(
        "Form 4136 needs one attached Schedule A for each activity",
      );
    }
    if (
      input.additional_activities.length && context.documentIdsByPendingKey &&
      !scheduleAIds.every(Boolean)
    ) {
      throw new Error(
        "Form 4136 cannot export multiple activities without Schedule A attachments",
      );
    }

    return elements(
      "IRS4136",
      [
        element("QlfyUsageFuelsEligFTCInd", "true"),
        element(
          "QlfyBusinessActivitiesCnt",
          1 + input.additional_activities.length,
        ),
        elements("BusinessName", [
          element("BusinessNameLine1Txt", input.business.business_name),
        ]),
        element("EIN", input.business.business_ein),
        element(
          "PrincipalBusinessActivityCd",
          input.business.principal_activity_code,
        ),
        elements("EquipmentDescriptionGrp", [
          element("MakeNm", input.business.equipment_make),
          element("ModelNm", input.business.equipment_model),
          element("EquipmentTypeDesc", input.business.equipment_type),
        ]),
        elements("NontaxableUseOfGasolineGrp", [
          element("OffHwyBusUseGasolineGalsQty", qty(l1a)),
          element("FarmingPurposesGasolineGalsQty", qty(l1b)),
          l1a.length || l1b.length
            ? element("ActualFuelCostAmt", cost([...l1a, ...l1b]))
            : "",
          l1a.length || l1b.length
            ? credit(
              "NontaxableUseOfGasolineCrAmt",
              lineAmount([...l1a, ...l1b]),
              "362",
            )
            : "",
        ]),
        ...l2b.map((claim) => detail("OthNontaxableAviationGasGrp", claim)),
        l2b.length ? element("AviationNontxGasActlFlCstAmt", cost(l2b)) : "",
        l2b.length
          ? credit("AviationNontxGasCrAmt", lineAmount(l2b), "324")
          : "",
        elements("NontaxableUseUndyedDieselGrp", [
          ...l3a.map((claim) =>
            detail("NontaxableUseOfUndyedDieselDtl", claim)
          ),
          element("FarmPrpsUndyedDslFuelGalsQty", qty(l3b)),
          l3a.length || l3b.length
            ? element("ActualFuelCostAmt", cost([...l3a, ...l3b]))
            : "",
          l3a.length || l3b.length
            ? credit(
              "FarmPrpsUndyedDslFuelCrAmt",
              lineAmount([...l3a, ...l3b]),
              "360",
            )
            : "",
        ]),
        elements("NontxUseUndyedKeroseneGrp", [
          ...l4a.map((claim) =>
            detail("NontaxableUseUndyedKeroseneDtl", claim)
          ),
          element("FarmPrpsUndyedKeroseneGalsQty", qty(l4b)),
          l4a.length || l4b.length
            ? element("ActualFuelCostAmt", cost([...l4a, ...l4b]))
            : "",
          l4a.length || l4b.length
            ? credit(
              "FarmPrpsUndyedKeroseneCrAmt",
              lineAmount([...l4a, ...l4b]),
              "346",
            )
            : "",
        ]),
        ...l5c.map((claim) => detail("NontxKrsnUsedAvnTxd244Grp", claim)),
        l5c.length ? element("NontxKrsnAvnTxd244ActlFlCstAmt", cost(l5c)) : "",
        l5c.length
          ? credit("NonTxKrsnUsedInAvnTxd244CrAmt", lineAmount(l5c), "346")
          : "",
        ...l5d.map((claim) => detail("NontxKrsnUsedAvnTxd219Grp", claim)),
        l5d.length ? element("NontxKrsnAvnTxd219ActlFlCstAmt", cost(l5d)) : "",
        l5d.length
          ? credit("NonTxKrsnUsedInAvnTxd219CrAmt", lineAmount(l5d), "369")
          : "",
        ...alternativeFuelTags.flatMap(
          ([line, groupTag, costTag, creditTag, crn, busTag]) => {
            const claims = onLine(input, line);
            if (!claims.length) return [];
            const busClaim = claims.find((claim) => claim.type_of_use === "05");
            return [
              ...(busClaim ? [busDetail(busTag, busClaim)] : []),
              ...claims.filter((claim) => claim.type_of_use !== "05")
                .map((claim) => detail(groupTag, claim)),
              element(costTag, cost(claims)),
              credit(creditTag, lineAmount(claims), crn),
            ];
          },
        ),
        element("TotalFuelTaxCreditAmt", amount),
      ],
      scheduleAIds.length && scheduleAIds.every(Boolean)
        ? {
          referenceDocumentId: scheduleAIds.join(" "),
          referenceDocumentName: "BinaryAttachment GeneralDependencySmall",
        }
        : undefined,
    );
  },
  async buildBinaryAttachments(raw, context) {
    if (!raw.claims?.length) return [];
    const input = inputSchema.parse(raw);
    if (!input.additional_activities.length) return [];
    const activities = [
      { business: input.business, claims: input.claims },
      ...input.additional_activities,
    ];
    return await Promise.all(activities.map(async (activity, index) => {
      const projected = projectForm4136Fields({
        ...activity,
        additional_activities: [],
        primary_activity_has_most_qualified_fuel_usage: true,
      });
      const base = await fillFormPdf(
        form4136ScheduleAPdf,
        projected,
        context?.filer,
        ".pdf-cache",
      );
      if (!base) throw new Error("Schedule A (Form 4136) did not render");
      const doc = await PDFDocument.load(base);
      await form4136ScheduleAPdf.decoratePages?.(
        doc,
        doc.getPages(),
        projected,
        context?.filer,
      );
      await form4136ScheduleAPdf.appendSupplementalPages?.(
        doc,
        projected,
        context?.filer,
      );
      return {
        fileName: form4136ScheduleAFileName(index),
        description:
          `Schedule A (Form 4136) for ${activity.business.business_name}`,
        bytes: await doc.save(),
      };
    }));
  },
};
