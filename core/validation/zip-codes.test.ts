import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { zipMatchesState } from "./zip-codes.ts";

test("ZIP codes follow the IRS state list, including its five-digit splits", () => {
  assertEquals(zipMatchesState("19702", "DE"), true);
  assertEquals(zipMatchesState("19702-1234", "DE"), true);
  assertEquals(zipMatchesState("29702", "DE"), false);
  assertEquals(zipMatchesState("06390", "NY"), true);
  assertEquals(zipMatchesState("06390", "CT"), false);
  assertEquals(zipMatchesState("06391", "CT"), true);
  assertEquals(zipMatchesState("86001", "AZ"), true);
  assertEquals(zipMatchesState("96799", "AS"), true);
});
