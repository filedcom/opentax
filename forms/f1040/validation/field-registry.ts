/**
 * Reverse field registry: MeF XML element name → pending dict location.
 *
 * Built from all exported FIELD_MAP arrays in the MeF builders.
 * Used by ReturnContext to resolve XML names referenced in IRS business rules.
 */

import type {
  FieldLocation,
  FieldRegistry,
} from "../../../core/validation/types.ts";
import { ALL_MEF_FORMS } from "../2025/mef/forms/index.ts";

type RawMap = ReadonlyArray<readonly [string, string]>;

function addMappings(
  registry: Map<string, FieldLocation>,
  form: string,
  fieldMap: RawMap,
): void {
  for (const [pendingKey, xmlName] of fieldMap) {
    if (!registry.has(xmlName)) {
      registry.set(xmlName, { form, pendingKey });
    }
  }
}

function buildRegistry(): FieldRegistry {
  const reg = new Map<string, FieldLocation>();

  // Header fields (not in any FIELD_MAP)
  reg.set("PrimarySSN", { form: "_header", pendingKey: "primarySSN" });
  reg.set("SpouseSSN", { form: "_header", pendingKey: "spouseSSN" });
  reg.set("FilingStatusCd", { form: "_header", pendingKey: "filingStatus" });
  reg.set("PrimaryNameControlTxt", {
    form: "_header",
    pendingKey: "nameControl",
  });
  reg.set("SpouseNameControlTxt", {
    form: "_header",
    pendingKey: "spouseNameControl",
  });
  reg.set("PhoneNum", { form: "_header", pendingKey: "phone" });
  reg.set("EmailAddressTxt", { form: "_header", pendingKey: "email" });
  reg.set("TaxpayerPIN", { form: "_header", pendingKey: "signaturePin" });
  reg.set("SpousePIN", { form: "_header", pendingKey: "spouseSignaturePin" });
  reg.set("PrimaryIPPIN", { form: "_header", pendingKey: "ipPin" });
  reg.set("SpouseIPPIN", { form: "_header", pendingKey: "spouseIpPin" });

  // Form FIELD_MAPs — derived from central registry
  for (const form of ALL_MEF_FORMS) {
    if (form.FIELD_MAP.length > 0) {
      addMappings(reg, form.pendingKey, form.FIELD_MAP as RawMap);
    }
  }

  return reg;
}

/** Singleton field registry instance. */
export const FIELD_REGISTRY: FieldRegistry = buildRegistry();
