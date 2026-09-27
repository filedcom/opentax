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
    const l1c = onLine(input, "1c");
    const l1d = onLine(input, "1d");
    const l2a = onLine(input, "2a");
    const l2b = onLine(input, "2b");
    const l2c = onLine(input, "2c");
    const l2d = onLine(input, "2d");
    const l3a = onLine(input, "3a");
    const l3b = onLine(input, "3b");
    const l3c = onLine(input, "3c");
    const l3d = onLine(input, "3d");
    const l3e = onLine(input, "3e");
    const l4a = onLine(input, "4a");
    const l4b = onLine(input, "4b");
    const l4c = onLine(input, "4c");
    const l4d = onLine(input, "4d");
    const l4e = onLine(input, "4e");
    const l4f = onLine(input, "4f");
    const l5a = onLine(input, "5a");
    const l5b = onLine(input, "5b");
    const l5c = onLine(input, "5c");
    const l5d = onLine(input, "5d");
    const l5e = onLine(input, "5e");
    const l6a = onLine(input, "6a");
    const l6b = onLine(input, "6b");
    const l7a = onLine(input, "7a");
    const l7b = onLine(input, "7b");
    const l7c = onLine(input, "7c");
    const l8a = onLine(input, "8a");
    const l8b = onLine(input, "8b");
    const l8c = onLine(input, "8c");
    const l8d = onLine(input, "8d");
    const l8e = onLine(input, "8e");
    const l8f = onLine(input, "8f");
    const l13a = onLine(input, "13a");
    const l13b = onLine(input, "13b");
    const l13c = onLine(input, "13c");
    const l14a = onLine(input, "14a");
    const l14b = onLine(input, "14b");
    const l15a = onLine(input, "15a");
    const l16a = onLine(input, "16a");
    const l16b = onLine(input, "16b");
    const business = input.claimant_context === "business"
      ? input.business
      : undefined;
    const additionalActivityCount = input.claimant_context === "business"
      ? input.additional_activities.length
      : 0;
    const scheduleAIds = additionalActivityCount
      ? Array.from(
        { length: 1 + additionalActivityCount },
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
      additionalActivityCount && context.documentIdsByPendingKey &&
      !scheduleAIds.every(Boolean)
    ) {
      throw new Error(
        "Form 4136 cannot export multiple activities without Schedule A attachments",
      );
    }
    const blendingStatementIds =
      context.documentIdsByPendingKey?.f4136_emulsion_blending_statement ?? [];
    if (
      context.documentIdsByPendingKey &&
      blendingStatementIds.length !== l15a.length
    ) {
      throw new Error(
        "Form 4136 line 15 needs a blending statement for each claim",
      );
    }
    const keroseneBuyerStatementIds = context.documentIdsByPendingKey
      ?.f4136_kerosene_government_sales_statement ?? [];
    if (
      context.documentIdsByPendingKey &&
      keroseneBuyerStatementIds.length !== (l7a.length ? 1 : 0)
    ) {
      throw new Error("Form 4136 line 7a needs one kerosene buyer statement");
    }
    const highRate13c = l13c.some((claim) =>
      claim.excise_tax_rate_per_gallon === 0.244
    );
    const cardUsersStatementIds = context.documentIdsByPendingKey
      ?.f4136_credit_card_users_statement ?? [];
    if (
      context.documentIdsByPendingKey &&
      cardUsersStatementIds.length !== (highRate13c ? 1 : 0)
    ) {
      throw new Error(
        "Form 4136 line 13c taxed at $.244 needs one linked credit-card-users statement",
      );
    }

    return elements(
      "IRS4136",
      [
        element("QlfyUsageFuelsEligFTCInd", "true"),
        element(
          "QlfyBusinessActivitiesCnt",
          business ? 1 + additionalActivityCount : undefined,
        ),
        business
          ? elements("BusinessName", [
            element("BusinessNameLine1Txt", business.business_name),
          ])
          : "",
        element("EIN", business?.business_ein),
        element(
          "PrincipalBusinessActivityCd",
          business?.principal_activity_code,
        ),
        business
          ? elements("EquipmentDescriptionGrp", [
            element("MakeNm", business.equipment_make),
            element("ModelNm", business.equipment_model),
            element("EquipmentTypeDesc", business.equipment_type),
          ])
          : "",
        elements("NontaxableUseOfGasolineGrp", [
          element("OffHwyBusUseGasolineGalsQty", qty(l1a)),
          element("FarmingPurposesGasolineGalsQty", qty(l1b)),
          ...l1c.map((claim) => detail("OtherNontaxableUseGasolineDtl", claim)),
          l1a.length || l1b.length || l1c.length
            ? element("ActualFuelCostAmt", cost([...l1a, ...l1b, ...l1c]))
            : "",
          l1a.length || l1b.length || l1c.length
            ? credit(
              "NontaxableUseOfGasolineCrAmt",
              lineAmount([...l1a, ...l1b, ...l1c]),
              "362",
            )
            : "",
        ]),
        elements("ExportedNontaxableUseGasGrp", [
          element("ExportedNontxUseGasGalsQty", qty(l1d)),
          l1d.length ? element("ActualFuelCostAmt", cost(l1d)) : "",
          l1d.length
            ? credit("ExportedNontxUseOfGasCrAmt", lineAmount(l1d), "411")
            : "",
        ]),
        elements("CommercialAviationUseGasGrp", [
          element("AviationGasolineGallonsQty", qty(l2a)),
          l2a.length ? element("ActualFuelCostAmt", cost(l2a)) : "",
          l2a.length
            ? credit("AviationGasolineCreditAmt", lineAmount(l2a), "354")
            : "",
        ]),
        ...l2b.map((claim) => detail("OthNontaxableAviationGasGrp", claim)),
        l2b.length ? element("AviationNontxGasActlFlCstAmt", cost(l2b)) : "",
        l2b.length
          ? credit("AviationNontxGasCrAmt", lineAmount(l2b), "324")
          : "",
        elements("ExportedNontaxAviationGasGrp", [
          element("ExpNontxAviationGasGalsQty", qty(l2c)),
          l2c.length ? element("ActualFuelCostAmt", cost(l2c)) : "",
          l2c.length
            ? credit("ExpNontxAviationGasCrAmt", lineAmount(l2c), "412")
            : "",
        ]),
        elements("LUSTTxAvnFuelFrgnTradeGrp", [
          element("LUSTTxAvnFuelFrgnTradeGalsQty", qty(l2d)),
          l2d.length ? element("ActualFuelCostAmt", cost(l2d)) : "",
          l2d.length
            ? credit("LUSTTxAvnFuelFrgnTradeCrAmt", lineAmount(l2d), "433")
            : "",
        ]),
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
        elements("TrainsUseUndyedDieselFuelGrp", [
          element("TrainUseOfUndyedDieselGalsQty", qty(l3c)),
          l3c.length ? element("ActualFuelCostAmt", cost(l3c)) : "",
          l3c.length
            ? credit("TrainUseOfUndyedDieselCrAmt", lineAmount(l3c), "353")
            : "",
        ]),
        elements("BusesUseUndyedDieselFuelGrp", [
          element("BusUseOfUndyedDieselGalsQty", qty(l3d)),
          l3d.length ? element("ActualFuelCostAmt", cost(l3d)) : "",
          l3d.length
            ? credit("BusUseOfUndyedDieselCreditAmt", lineAmount(l3d), "350")
            : "",
        ]),
        elements("ExportedUndyedDieselFuelGrp", [
          element("ExpUndyedDieselFuelGalsQty", qty(l3e)),
          l3e.length ? element("ActualFuelCostAmt", cost(l3e)) : "",
          l3e.length
            ? credit("ExpUndyedDieselFuelCreditAmt", lineAmount(l3e), "413")
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
        elements("BusesUseUndyedKeroseneGrp", [
          element("BusUseOfUndyedKeroseneGalsQty", qty(l4c)),
          l4c.length ? element("ActualFuelCostAmt", cost(l4c)) : "",
          l4c.length
            ? credit("BusUseOfUndyedKeroseneCrAmt", lineAmount(l4c), "347")
            : "",
        ]),
        elements("ExportedUndyedKeroseneGrp", [
          element("ExportedUndyedKeroseneGalsQty", qty(l4d)),
          l4d.length ? element("ActualFuelCostAmt", cost(l4d)) : "",
          l4d.length
            ? credit("ExportedUndyedKeroseneCrAmt", lineAmount(l4d), "414")
            : "",
        ]),
        ...l4e.map((claim) => detail("NontxUseUndyedKrsnTxdAt044Grp", claim)),
        l4e.length ? element("NontxUndyedKrsn044ActlFlCstAmt", cost(l4e)) : "",
        l4e.length
          ? credit("NontxUseUndyedKrsnTxd044CrAmt", lineAmount(l4e), "377")
          : "",
        ...l4f.map((claim) => detail("NontxUseUndyedKrsnTxdAt219Grp", claim)),
        l4f.length ? element("NontxUndyedKrsn219ActlFlCstAmt", cost(l4f)) : "",
        l4f.length
          ? credit("NontxUseUndyedKrsnTxd219CrAmt", lineAmount(l4f), "369")
          : "",
        elements("KrsnUsedInCmrclAvnTxdAt244Grp", [
          element("KeroseneUsedInAvnTxd244GalsQty", qty(l5a)),
          l5a.length ? element("ActualFuelCostAmt", cost(l5a)) : "",
          l5a.length
            ? credit("KeroseneUsedInAvnTxd244CrAmt", lineAmount(l5a), "417")
            : "",
        ]),
        elements("KrsnUsedInCmrclAvnTxdAt219Grp", [
          element("KeroseneUsedInAvnTxd219GalsQty", qty(l5b)),
          l5b.length ? element("ActualFuelCostAmt", cost(l5b)) : "",
          l5b.length
            ? credit("KeroseneUsedInAvnTxd219CrAmt", lineAmount(l5b), "355")
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
        elements("LUSTTxKrsnAvnFrgnTrdGrp", [
          element("LUSTTxKrsnAvnFrgnTrdGalsQty", qty(l5e)),
          l5e.length ? element("ActualFuelCostAmt", cost(l5e)) : "",
          l5e.length
            ? credit("LUSTTxKrsnAvnFrgnTrdCrAmt", lineAmount(l5e), "433")
            : "",
        ]),
        element(
          "UndyedDieselRegistrationNum",
          [...l6a, ...l6b][0]?.vendor_registration_number,
        ),
        elements("SlsUndyedDslStLclGovtGrp", [
          element("SlsUndyedDslStLclGovtGalsQty", qty(l6a)),
          l6a.length ? element("ActualFuelCostAmt", cost(l6a)) : "",
          l6a.length
            ? credit("SlsUndyedDslUseStLclGovtCrAmt", lineAmount(l6a), "360")
            : "",
        ]),
        elements("SlsUndyedDieselUseBusesGrp", [
          element("SlsUndyedDieselUseBusGalsQty", qty(l6b)),
          l6b.length ? element("ActualFuelCostAmt", cost(l6b)) : "",
          l6b.length
            ? credit("SlsUndyedDieselUseBusCrAmt", lineAmount(l6b), "350")
            : "",
        ]),
        element(
          "UndyedKeroseneRegistrationNum",
          [...l7a, ...l7b, ...l7c][0]?.vendor_registration_number,
        ),
        elements("SlsUndyedKrsnGrp", [
          element(
            "SlsUndyedKrsnStLclGovtGalsQty",
            qty(l7a),
            keroseneBuyerStatementIds.length
              ? {
                referenceDocumentId: keroseneBuyerStatementIds[0],
                referenceDocumentName: "ToWhomKeroseneFuelSoldStatement",
              }
              : undefined,
          ),
          element("SlsUndyedKrsnBlockPumpGalsQty", qty(l7b)),
          l7a.length || l7b.length
            ? element("ActualFuelCostAmt", cost([...l7a, ...l7b]))
            : "",
          l7a.length || l7b.length
            ? credit(
              "SlsUndyedKrsnBlockPumpCrAmt",
              lineAmount([...l7a, ...l7b]),
              "346",
            )
            : "",
        ]),
        elements("SlsUndyedKrsnUseBusesGrp", [
          element("SlsUndyedKrsnUseBusGalsQty", qty(l7c)),
          l7c.length ? element("ActualFuelCostAmt", cost(l7c)) : "",
          l7c.length
            ? credit("SlsUndyedKrsnUseBusCrAmt", lineAmount(l7c), "347")
            : "",
        ]),
        element(
          "KeroseneForAvnRegistrationNum",
          [...l8a, ...l8b, ...l8c, ...l8d, ...l8e, ...l8f][0]
            ?.vendor_registration_number,
        ),
        elements("KrsnUseCmrclAvnTxdAt219Grp", [
          element("SlsKrsnUsedInAvnTxd219GalsQty", qty(l8a)),
          l8a.length ? element("ActualFuelCostAmt", cost(l8a)) : "",
          l8a.length
            ? credit("SlsKrsnUsedInAvnTxd219CrAmt", lineAmount(l8a), "355")
            : "",
        ]),
        elements("KrsnUseCmrclAvnTxdAt244Grp", [
          element("SlsKrsnUsedInAvnTxd244GalsQty", qty(l8b)),
          l8b.length ? element("ActualFuelCostAmt", cost(l8b)) : "",
          l8b.length
            ? credit("SlsKrsnUsedInAvnTxd244CrAmt", lineAmount(l8b), "417")
            : "",
        ]),
        elements("KrsnNnxmptUseNonCmrclAvnGrp", [
          element("SlsKrsnNnxmptUseInAvnGalsQty", qty(l8c)),
          l8c.length ? element("ActualFuelCostAmt", cost(l8c)) : "",
          l8c.length
            ? credit("SlsKrsnNnxmptUseInAvnCrAmt", lineAmount(l8c), "418")
            : "",
        ]),
        ...l8d.map((claim) => detail("KrsnOthNontxTxdAt244Grp", claim)),
        l8d.length ? element("KrsnOthNontxTxd244ActlFlCstAmt", cost(l8d)) : "",
        l8d.length
          ? credit("SlsKrsnOthNontxTxd244CrAmt", lineAmount(l8d), "346")
          : "",
        ...l8e.map((claim) => detail("KrsnOthNontxTxdAt219Grp", claim)),
        l8e.length ? element("KrsnOthNontxTxd219ActlFlCstAmt", cost(l8e)) : "",
        l8e.length
          ? credit("SlsKrsnOthNontxTxd219CrAmt", lineAmount(l8e), "369")
          : "",
        elements("LUSTTxSlsKrsnAvnFrgnTrdGrp", [
          element("LUSTTxSlsKrsnAvnFrgnTrdGalsQty", qty(l8f)),
          l8f.length ? element("ActualFuelCostAmt", cost(l8f)) : "",
          l8f.length
            ? credit("LUSTTxSlsKrsnAvnFrgnTrdCrAmt", lineAmount(l8f), "433")
            : "",
        ]),
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
        element(
          "CreditCardIssrRegistrationNum",
          [...l13a, ...l13b, ...l13c][0]
            ?.credit_card_issuer_registration_number,
        ),
        elements("DslFuelSoldStLocalGovtUseGrp", [
          element("DslFuelSoldStLocalGovtGalsQty", qty(l13a)),
          l13a.length ? element("ActualFuelCostAmt", cost(l13a)) : "",
          l13a.length
            ? credit("DslFuelSoldStLocalGovtCrAmt", lineAmount(l13a), "360")
            : "",
        ]),
        elements("KrsnFuelSoldStLocalGovtUseGrp", [
          element("KrsnFuelSoldStLocalGovtGalsQty", qty(l13b)),
          l13b.length ? element("ActualFuelCostAmt", cost(l13b)) : "",
          l13b.length
            ? credit("KrsnFuelSoldStLocalGovtCrAmt", lineAmount(l13b), "346")
            : "",
        ]),
        elements("KrsnSoldStLocalGovtAvnUseGrp", [
          element(
            "KrsnAvnSoldStLocalGovtGalsQty",
            qty(l13c),
            highRate13c ? { keroseneTaxRateCd: "TAXEDAT244" } : undefined,
          ),
          l13c.length ? element("ActualFuelCostAmt", cost(l13c)) : "",
          l13c.length
            ? element("KrsnAvnSoldStLocalGovtCrAmt", lineAmount(l13c), {
              creditReferenceNum: "369",
              ...(highRate13c && cardUsersStatementIds[0]
                ? {
                  referenceDocumentId: cardUsersStatementIds[0],
                  referenceDocumentName:
                    "NontaxableUseFuelsCreditCardUsersStatement",
                }
                : {}),
            })
            : "",
        ]),
        ...l14a.filter((claim) => claim.type_of_use === "05").map((claim) =>
          busDetail("BusNontxUseDieselWtrEmlsnGrp", claim)
        ),
        ...l14a.filter((claim) => claim.type_of_use !== "05").map((claim) =>
          detail("NontxUseDieselWaterEmulsionGrp", claim)
        ),
        l14a.length ? element("NontxDslWtrEmlsnActlFlCstAmt", cost(l14a)) : "",
        l14a.length
          ? credit("NontxUseDieselWtrEmulsionCrAmt", lineAmount(l14a), "309")
          : "",
        elements("ExpNontxUseDslWtrEmulsionGrp", [
          element("ExpNontxUseDslWtrEmulsionQty", qty(l14b)),
          l14b.length ? element("ActualFuelCostAmt", cost(l14b)) : "",
          l14b.length
            ? credit("ExpNontxUseDslWtrEmulsionCrAmt", lineAmount(l14b), "306")
            : "",
        ]),
        element(
          "DieselWtrBlndgRegistrationNum",
          l15a[0]?.blender_registration_number,
        ),
        elements("EmulsionBlndCreditGrp", [
          element("BlndrCrUseDslWtrEmulsionQty", qty(l15a)),
          l15a.length ? element("ActualFuelCostAmt", cost(l15a)) : "",
          l15a.length
            ? element(
              "BlndrCrUseDslWtrEmulsionCrAmt",
              lineAmount(l15a),
              {
                creditReferenceNum: "310",
                ...(blendingStatementIds.length
                  ? {
                    referenceDocumentId: blendingStatementIds.join(" "),
                    referenceDocumentName:
                      "DieselWaterFuelEmulsionBlendingStatement",
                  }
                  : {}),
              },
            )
            : "",
        ]),
        elements("ExpDyedDieselGasTxdAt001Grp", [
          element("ExportedDyedDieselFuelGalsQty", qty(l16a)),
          l16a.length ? element("ActualFuelCostAmt", cost(l16a)) : "",
          l16a.length
            ? credit("ExportedDyedDieselFuelCrAmt", lineAmount(l16a), "415")
            : "",
        ]),
        elements("ExportedDyedKeroseneGrp", [
          element("ExportedDyedKeroseneGallonsQty", qty(l16b)),
          l16b.length ? element("ActualFuelCostAmt", cost(l16b)) : "",
          l16b.length
            ? credit("ExportedDyedKeroseneCreditAmt", lineAmount(l16b), "416")
            : "",
        ]),
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
    if (input.claimant_context === "home_kerosene") return [];
    if (!input.additional_activities.length) return [];
    const activities = [
      { business: input.business, claims: input.claims },
      ...input.additional_activities,
    ];
    return await Promise.all(activities.map(async (activity, index) => {
      const projected = projectForm4136Fields({
        ...activity,
        claimant_context: "business",
        additional_activities: [],
        primary_activity_has_most_credit: true,
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
