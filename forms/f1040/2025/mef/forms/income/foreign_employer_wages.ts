import { element, elements } from "../../../../mef/xml.ts";
import {
  type PhysicalPresenceFiling,
  physicalPresenceFilingSchema,
} from "../../../../nodes/intermediate/forms/form2555/calculation.ts";
import {
  nativeFecInputSchema,
  nativeFecItemSchema,
} from "../../../../nodes/inputs/fec/index.ts";
import { FilingStatus } from "../../../../mef/header.ts";
import {
  correctivePlanItems,
  inputSchema as f1099rInputSchema,
} from "../../../../nodes/inputs/f1099r/index.ts";
import { assert1099RRecipientOwner } from "../../../domains/income/f1099r/f1099r-recipient-owner.ts";
import {
  codeDExcessDeferral,
  inputSchema as w2InputSchema,
} from "../../../../nodes/inputs/w2/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../../form-descriptor.ts";
import type { z } from "zod";

function filingDetails(
  context?: MefBuildContext,
): PhysicalPresenceFiling | null {
  const pending = context?.pending?.form2555;
  if (
    !pending || typeof pending !== "object" || !("filing_details" in pending)
  ) {
    return null;
  }
  return physicalPresenceFilingSchema.parse(pending.filing_details);
}

function foreignAddress(
  tag: string,
  address: PhysicalPresenceFiling["foreign_address"],
): string {
  return elements(tag, [
    element("AddressLine1Txt", address.line1),
    element("AddressLine2Txt", address.line2),
    element("CityNm", address.city),
    element("ProvinceOrStateNm", address.province_or_state),
    element("CountryCd", address.country_code),
    element("ForeignPostalCd", address.postal_code),
  ]);
}

type NativeFecItem = z.infer<typeof nativeFecItemSchema>;

function w2Excess(context?: MefBuildContext): number {
  const raw = context?.pending?.w2;
  return raw === undefined
    ? 0
    : codeDExcessDeferral(w2InputSchema.parse(raw).w2s).amount;
}

function standaloneFec(context?: MefBuildContext): readonly NativeFecItem[] {
  const raw = context?.pending?.fec;
  if (raw === undefined) return [];
  if (filingDetails(context)) {
    throw new Error(
      "Standalone FEC and physical-presence Form 2555 wages need an overlap reconciliation before native filing",
    );
  }
  const filer = context?.filer;
  if (!filer) throw new Error("Standalone FEC needs filer identity");
  const items = nativeFecInputSchema.parse(raw).fecs;
  const taxpayer = filer.primarySSN.replace(/\D/g, "");
  const spouse = filer.filingStatus === FilingStatus.MarriedFilingJointly
    ? filer.spouse?.ssn.replace(/\D/g, "")
    : undefined;
  const identities = items.map((item) =>
    item.compensation_source_document_reference
  );
  if (
    new Set(identities).size !== identities.length ||
    items.some((item) => {
      const owner = item.compensation_owner_ssn.replace(/\D/g, "");
      return owner !== taxpayer && owner !== spouse;
    })
  ) {
    throw new Error(
      "Standalone FEC needs distinct employer sources owned by the filer or joint spouse",
    );
  }
  const amount = items.reduce((sum, item) => sum + item.compensation_usd, 0);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error(
      "Standalone FEC wages need a positive safe whole-dollar total",
    );
  }
  const line1h =
    (context?.pending?.f1040 as Record<string, unknown> | undefined)
      ?.line1h_other_earned;
  const agiWages = (context?.pending?.agi_aggregator as
    | Record<string, unknown>
    | undefined)?.line1h_other_earned;
  const agiTotal = typeof agiWages === "number"
    ? agiWages
    : Array.isArray(agiWages) &&
        agiWages.every((value) => typeof value === "number")
    ? (agiWages as number[]).reduce((sum, value) => sum + value, 0)
    : undefined;
  const expected = amount + w2Excess(context);
  if (line1h !== expected || agiTotal !== expected) {
    throw new Error(
      "Standalone FEC wages must equal Form 1040 and AGI line 1h after reviewed W-2 excess",
    );
  }
  return items;
}

function correctivePlanAmount(context?: MefBuildContext): number {
  const raw = context?.pending?.f1099r;
  if (raw === undefined) return 0;
  const items = correctivePlanItems(f1099rInputSchema.parse(raw).f1099rs);
  if (items.length === 0) return 0;
  if (context?.pending?.fec !== undefined || filingDetails(context)) {
    throw new Error(
      "Corrective plan distributions need a separate line 1h source reconciliation from FEC or Form 2555 wages",
    );
  }
  assert1099RRecipientOwner(raw, context?.filer);
  const references = items.map((item) => item.source_document_reference);
  if (
    new Set(references).size !== items.length ||
    items.some((item) =>
      !item.recipient_ssn || !item.ts || !item.source_document_reference ||
      !/^\d{2}-?\d{7}$/.test(item.payer_ein) ||
      item.box7_code2 !== undefined ||
      !Number.isSafeInteger(item.box2a_taxable_amount) ||
      (item.box2a_taxable_amount ?? 0) <= 0 ||
      (item.box2a_taxable_amount ?? 0) > item.box1_gross_distribution
    )
  ) {
    throw new Error(
      "Corrective plan wages need distinct identified 1099-R copies and positive taxable box 2a amounts",
    );
  }
  const amount = items.reduce(
    (sum, item) => sum + item.box2a_taxable_amount!,
    0,
  );
  const line1h =
    (context?.pending?.f1040 as Record<string, unknown> | undefined)
      ?.line1h_other_earned;
  const agiWages = (context?.pending?.agi_aggregator as
    | Record<string, unknown>
    | undefined)?.line1h_other_earned;
  const agiTotal = typeof agiWages === "number"
    ? agiWages
    : Array.isArray(agiWages) &&
        agiWages.every((value) => typeof value === "number")
    ? (agiWages as number[]).reduce((sum, value) => sum + value, 0)
    : undefined;
  if (
    !Number.isSafeInteger(amount) || line1h !== amount || agiTotal !== amount
  ) {
    throw new Error(
      "Corrective plan wages must equal Form 1040 and AGI line 1h without other wage sources",
    );
  }
  return amount;
}

function fecEmployee(item: NativeFecItem, context?: MefBuildContext) {
  const filer = context?.filer;
  if (!filer) throw new Error("Standalone FEC needs filer identity");
  const owner = item.compensation_owner_ssn.replace(/\D/g, "");
  if (owner === filer.primarySSN.replace(/\D/g, "")) {
    if (!filer.firstName || !filer.lastName || !filer.nameControl) {
      throw new Error("Standalone FEC needs taxpayer name and name control");
    }
    return {
      tin: owner,
      name: `${filer.firstName} ${filer.lastName}`,
      nameControl: filer.nameControl,
    };
  }
  const spouse = filer.spouse;
  if (!spouse?.firstName || !spouse.lastName || !spouse.nameControl) {
    throw new Error("Standalone FEC needs spouse name and name control");
  }
  return {
    tin: owner,
    name: `${spouse.firstName} ${spouse.lastName}`,
    nameControl: spouse.nameControl,
  };
}

function standaloneFecRecord(
  item: NativeFecItem,
  context?: MefBuildContext,
): string {
  const employee = fecEmployee(item, context);
  const residence = item.service_residence.kind === "us"
    ? elements("USAddress", [
      element("AddressLine1Txt", item.service_residence.line1),
      element("AddressLine2Txt", item.service_residence.line2),
      element("CityNm", item.service_residence.city),
      element("StateAbbreviationCd", item.service_residence.state),
      element("ZIPCd", item.service_residence.zip),
    ])
    : foreignAddress("ForeignAddress", item.service_residence.address);
  return elements("FECRecord", [
    element("EmployeeTIN", employee.tin),
    element("EmployeeNameControlTxt", employee.nameControl),
    element("EmployeeNm", employee.name),
    residence,
    ...(item.service_residence.kind === "us"
      ? [element("WorkPerformedResidingInUSInd", "X")]
      : []),
    elements("ForeignEmployerBusinessName", [
      element("BusinessNameLine1Txt", item.foreign_employer_name),
    ]),
    foreignAddress("ForeignEmployerAddress", item.employer_foreign_address),
    element("ForeignEmployerCompensationAmt", item.compensation_usd),
  ]);
}

export const fecRecord: MefFormDescriptor<
  "fec_record",
  unknown,
  readonly string[]
> = {
  pendingKey: "fec_record",
  sourcePendingKeys: ["form2555", "fec"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/p4164.pdf",
  build(_fields, context) {
    const filing = filingDetails(context);
    const fecItems = standaloneFec(context);
    if (fecItems.length > 0) {
      return fecItems.map((item) => standaloneFecRecord(item, context));
    }
    if (!filing) return [];
    const filer = context?.filer;
    if (!filer?.primarySSN || !filer.nameControl || !filer.nameLine1) {
      throw new Error("FEC record needs taxpayer TIN, name, and name control");
    }
    return [elements("FECRecord", [
      element("EmployeeTIN", filer.primarySSN.replaceAll("-", "")),
      element("EmployeeNameControlTxt", filer.nameControl),
      element("EmployeeNm", filer.nameLine1),
      foreignAddress("ForeignAddress", filing.foreign_address),
      elements("ForeignEmployerBusinessName", [
        element("BusinessNameLine1Txt", filing.employer_name),
      ]),
      foreignAddress("ForeignEmployerAddress", filing.employer_foreign_address),
      element("ForeignEmployerCompensationAmt", filing.foreign_wages),
    ])];
  },
};

export const wagesNotShownSchedule: MefFormDescriptor<
  "wages_not_shown_schedule",
  unknown
> = {
  pendingKey: "wages_not_shown_schedule",
  sourcePendingKeys: ["form2555", "fec", "f1099r"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/p4164.pdf",
  build(_fields, context) {
    const filing = filingDetails(context);
    const fecItems = standaloneFec(context);
    const correctiveAmount = correctivePlanAmount(context);
    if (correctiveAmount > 0) {
      return elements("WagesNotShownSchedule", [
        elements("WagesNotShownSch", [
          element("OtherWagesNotShownTxt", "CORRECTIVE DISTRIBUTION"),
          element("WagesNotShownAmt", correctiveAmount),
        ]),
      ]);
    }
    const amount = fecItems.length > 0
      ? fecItems.reduce((sum, item) => sum + item.compensation_usd, 0)
      : filing?.foreign_wages;
    if (amount === undefined) return "";
    const excess = w2Excess(context);
    return elements("WagesNotShownSchedule", [
      elements("WagesNotShownSch", [
        element("WagesLiteralCd", "FEC"),
        element("WagesNotShownAmt", amount),
      ]),
      ...(excess > 0
        ? [elements("WagesNotShownSch", [
          element("OtherWagesNotShownTxt", "EXCESS DEFERRALS"),
          element("WagesNotShownAmt", excess),
        ])]
        : []),
    ]);
  },
};
