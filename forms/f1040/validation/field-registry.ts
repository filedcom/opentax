/**
 * Reverse field registry: MeF XML element name → pending dict location.
 *
 * Built from all exported FIELD_MAP arrays in the MeF builders.
 * Used by ReturnContext to resolve XML names referenced in IRS business rules.
 */

import type { FieldRegistry, FieldLocation } from "../../../core/validation/types.ts";

// Import FIELD_MAPs from all MeF builders
import { FIELD_MAP as F1040_MAP } from "../2025/mef/forms/f1040.ts";
import { FIELD_MAP as S1_MAP } from "../2025/mef/forms/schedule1.ts";
import { FIELD_MAP as S2_MAP } from "../2025/mef/forms/schedule2.ts";
import { FIELD_MAP as S3_MAP } from "../2025/mef/forms/schedule3.ts";
import { FIELD_MAP as SA_MAP } from "../2025/mef/forms/schedule_a.ts";
import { FIELD_MAP as SB_MAP } from "../2025/mef/forms/schedule_b.ts";
import { FIELD_MAP as SD_MAP } from "../2025/mef/forms/schedule_d.ts";
import { FIELD_MAP as SF_MAP } from "../2025/mef/forms/schedule_f.ts";
import { FIELD_MAP as SH_MAP } from "../2025/mef/forms/schedule_h.ts";
import { FIELD_MAP as SSE_MAP } from "../2025/mef/forms/schedule_se.ts";
import { FIELD_MAP as F1116_MAP } from "../2025/mef/forms/f1116.ts";
import { FIELD_MAP as F2441_MAP } from "../2025/mef/forms/f2441.ts";
import { FIELD_MAP as F2555_MAP } from "../2025/mef/forms/f2555.ts";
import { FIELD_MAP as F4137_MAP } from "../2025/mef/forms/f4137.ts";
import { FIELD_MAP as F4562_MAP } from "../2025/mef/forms/f4562.ts";
import { FIELD_MAP as F4684_MAP } from "../2025/mef/forms/f4684.ts";
import { FIELD_MAP as F4797_MAP } from "../2025/mef/forms/f4797.ts";
import { FIELD_MAP as F4952_MAP } from "../2025/mef/forms/f4952.ts";
import { FIELD_MAP as F4972_MAP } from "../2025/mef/forms/f4972.ts";
import { FIELD_MAP as F461_MAP } from "../2025/mef/forms/f461.ts";
import { FIELD_MAP as F5329_MAP } from "../2025/mef/forms/f5329.ts";
import { FIELD_MAP as F5695_MAP } from "../2025/mef/forms/f5695.ts";
import { FIELD_MAP as F6198_MAP } from "../2025/mef/forms/f6198.ts";
import { FIELD_MAP as F6251_MAP } from "../2025/mef/forms/f6251.ts";
import { FIELD_MAP as F6252_MAP } from "../2025/mef/forms/f6252.ts";
import { FIELD_MAP as F6781_MAP } from "../2025/mef/forms/f6781.ts";
import { FIELD_MAP as F7206_MAP } from "../2025/mef/forms/f7206.ts";
import { FIELD_MAP as F8396_MAP } from "../2025/mef/forms/f8396.ts";
import { FIELD_MAP as F8582_MAP } from "../2025/mef/forms/f8582.ts";
import { FIELD_MAP as F8606_MAP } from "../2025/mef/forms/f8606.ts";
import { FIELD_MAP as F8615_MAP } from "../2025/mef/forms/f8615.ts";
import { FIELD_MAP as F8815_MAP } from "../2025/mef/forms/f8815.ts";
import { FIELD_MAP as F8824_MAP } from "../2025/mef/forms/f8824.ts";
import { FIELD_MAP as F8829_MAP } from "../2025/mef/forms/f8829.ts";
import { FIELD_MAP as F8839_MAP } from "../2025/mef/forms/f8839.ts";
import { FIELD_MAP as F8853_MAP } from "../2025/mef/forms/f8853.ts";
// f8862 not yet built as MeF builder
import { FIELD_MAP as F8880_MAP } from "../2025/mef/forms/f8880.ts";
import { FIELD_MAP as F8889_MAP } from "../2025/mef/forms/f8889.ts";
import { FIELD_MAP as F8919_MAP } from "../2025/mef/forms/f8919.ts";
// f8949 uses a transaction-based builder, no FIELD_MAP
import { FIELD_MAP as F8959_MAP } from "../2025/mef/forms/f8959.ts";
import { FIELD_MAP as F8960_MAP } from "../2025/mef/forms/f8960.ts";
import { FIELD_MAP as F8962_MAP } from "../2025/mef/forms/f8962.ts";
import { FIELD_MAP as F8990_MAP } from "../2025/mef/forms/f8990.ts";
import { FIELD_MAP as F8995_MAP } from "../2025/mef/forms/f8995.ts";
import { FIELD_MAP as F8995A_MAP } from "../2025/mef/forms/f8995a.ts";
import { FIELD_MAP as F982_MAP } from "../2025/mef/forms/f982.ts";
import { FIELD_MAP as EITC_MAP } from "../2025/mef/forms/eitc.ts";

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
  reg.set("PrimaryNameControlTxt", { form: "_header", pendingKey: "nameControl" });
  reg.set("SpouseNameControlTxt", { form: "_header", pendingKey: "spouseNameControl" });
  reg.set("PhoneNum", { form: "_header", pendingKey: "phone" });
  reg.set("EmailAddressTxt", { form: "_header", pendingKey: "email" });
  reg.set("TaxpayerPIN", { form: "_header", pendingKey: "signaturePin" });
  reg.set("SpousePIN", { form: "_header", pendingKey: "spouseSignaturePin" });
  reg.set("PrimaryIPPIN", { form: "_header", pendingKey: "ipPin" });
  reg.set("SpouseIPPIN", { form: "_header", pendingKey: "spouseIpPin" });

  // Form FIELD_MAPs
  addMappings(reg, "f1040", F1040_MAP as unknown as RawMap);
  addMappings(reg, "schedule1", S1_MAP as unknown as RawMap);
  addMappings(reg, "schedule2", S2_MAP as unknown as RawMap);
  addMappings(reg, "schedule3", S3_MAP as unknown as RawMap);
  addMappings(reg, "schedule_a", SA_MAP as unknown as RawMap);
  addMappings(reg, "schedule_b", SB_MAP as unknown as RawMap);
  addMappings(reg, "schedule_d", SD_MAP as unknown as RawMap);
  addMappings(reg, "schedule_f", SF_MAP as unknown as RawMap);
  addMappings(reg, "schedule_h", SH_MAP as unknown as RawMap);
  addMappings(reg, "schedule_se", SSE_MAP as unknown as RawMap);
  addMappings(reg, "form1116", F1116_MAP as unknown as RawMap);
  addMappings(reg, "form2441", F2441_MAP as unknown as RawMap);
  addMappings(reg, "form2555", F2555_MAP as unknown as RawMap);
  addMappings(reg, "form4137", F4137_MAP as unknown as RawMap);
  addMappings(reg, "form4562", F4562_MAP as unknown as RawMap);
  addMappings(reg, "form4684", F4684_MAP as unknown as RawMap);
  addMappings(reg, "form4797", F4797_MAP as unknown as RawMap);
  addMappings(reg, "form4952", F4952_MAP as unknown as RawMap);
  addMappings(reg, "form4972", F4972_MAP as unknown as RawMap);
  addMappings(reg, "form461", F461_MAP as unknown as RawMap);
  addMappings(reg, "form5329", F5329_MAP as unknown as RawMap);
  addMappings(reg, "form5695", F5695_MAP as unknown as RawMap);
  addMappings(reg, "form6198", F6198_MAP as unknown as RawMap);
  addMappings(reg, "form6251", F6251_MAP as unknown as RawMap);
  addMappings(reg, "form6252", F6252_MAP as unknown as RawMap);
  addMappings(reg, "form6781", F6781_MAP as unknown as RawMap);
  addMappings(reg, "form7206", F7206_MAP as unknown as RawMap);
  addMappings(reg, "form8396", F8396_MAP as unknown as RawMap);
  addMappings(reg, "form8582", F8582_MAP as unknown as RawMap);
  addMappings(reg, "form8606", F8606_MAP as unknown as RawMap);
  addMappings(reg, "form8615", F8615_MAP as unknown as RawMap);
  addMappings(reg, "form8815", F8815_MAP as unknown as RawMap);
  addMappings(reg, "form8824", F8824_MAP as unknown as RawMap);
  addMappings(reg, "form8829", F8829_MAP as unknown as RawMap);
  addMappings(reg, "form8839", F8839_MAP as unknown as RawMap);
  addMappings(reg, "form8853", F8853_MAP as unknown as RawMap);
  // form8862 not yet built
  addMappings(reg, "form8880", F8880_MAP as unknown as RawMap);
  addMappings(reg, "form8889", F8889_MAP as unknown as RawMap);
  addMappings(reg, "form8919", F8919_MAP as unknown as RawMap);
  // form8949 uses transaction-based builder, no FIELD_MAP
  addMappings(reg, "form8959", F8959_MAP as unknown as RawMap);
  addMappings(reg, "form8960", F8960_MAP as unknown as RawMap);
  addMappings(reg, "form8962", F8962_MAP as unknown as RawMap);
  addMappings(reg, "form8990", F8990_MAP as unknown as RawMap);
  addMappings(reg, "form8995", F8995_MAP as unknown as RawMap);
  addMappings(reg, "form8995a", F8995A_MAP as unknown as RawMap);
  addMappings(reg, "form982", F982_MAP as unknown as RawMap);
  addMappings(reg, "eitc", EITC_MAP as unknown as RawMap);

  return reg;
}

/** Singleton field registry instance. */
export const FIELD_REGISTRY: FieldRegistry = buildRegistry();
