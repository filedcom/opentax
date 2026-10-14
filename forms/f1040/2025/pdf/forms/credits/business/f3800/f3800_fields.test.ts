import { assertEquals, assertThrows } from "@std/assert";
import {
  form3800HeaderFields,
  form3800PartIAndIIFields,
  form3800PartIIIFields,
  form3800PartIVFields,
  form3800PartVFields,
  form3800PartVIFields,
} from "./f3800_fields.ts";

Deno.test("Form 3800 field map preserves header and all 38 numbered first-section lines", () => {
  assertEquals(
    form3800HeaderFields.transferStatementCount,
    "topmostSubform[0].Page1[0].f1_3[0]",
  );
  assertEquals(
    form3800PartIAndIIFields.line2,
    "topmostSubform[0].Page1[0].Line2_ReadOrder[0].f1_5[0]",
  );
  assertEquals(
    form3800PartIAndIIFields.line17,
    "topmostSubform[0].Page1[0].f1_22[0]",
  );
  assertEquals(
    form3800PartIAndIIFields.line38,
    "topmostSubform[0].Page2[0].f2_21[0]",
  );
  assertEquals(Object.keys(form3800PartIAndIIFields).length, 39);
});

Deno.test("Form 3800 field map reaches credit rows on each Part III and IV page", () => {
  assertEquals(
    form3800PartIIIFields("1e").e,
    "topmostSubform[0].Page3[0].Pg3Table[0].Line1e[0].f3_45[0]",
  );
  assertEquals(
    form3800PartIIIFields("4e").i,
    "topmostSubform[0].Page4[0].Pg4Table[0].Line4e[0].f4_59[0]",
  );
  assertEquals(
    form3800PartIVFields("1e").i,
    "topmostSubform[0].Page5[0].Pg5Table[0].Line1e[0].f5_45[0]",
  );
  assertEquals(
    form3800PartIVFields("2j").g,
    "topmostSubform[0].Page6[0].Pg6Table[0].Line2j[0].f6_88[0]",
  );
  assertEquals(
    form3800PartIVFields("4e").i,
    "topmostSubform[0].Page7[0].Pg7Table[0].Line4e[0].f7_45[0]",
  );
  assertThrows(() => form3800PartIIIFields("2j"), Error, "not on this part");
});

Deno.test("Form 3800 field map reaches both halves of Part V and the last Part VI row", () => {
  assertEquals(
    form3800PartVFields(1).a,
    "topmostSubform[0].Page8[0].Pg8Table_1[0].Line1[0].f8_1[0]",
  );
  assertEquals(
    form3800PartVFields(1).k,
    "topmostSubform[0].Page8[0].Pg8Table_2[0].Line1[0].f8_158[0]",
  );
  assertEquals(
    form3800PartVFields(15).k,
    "topmostSubform[0].Page8[0].Pg8Table_2[0].Line15[0].f8_270[0]",
  );
  assertEquals(Object.keys(form3800PartVFields(15)).length, 18);
  assertEquals(
    form3800PartVIFields(35).i,
    "topmostSubform[0].Page9[0].Pg9Table[0].Line35[0].f9_315[0]",
  );
  assertThrows(() => form3800PartVFields(16), Error, "1-15");
  assertThrows(() => form3800PartVIFields(36), Error, "1-35");
});
