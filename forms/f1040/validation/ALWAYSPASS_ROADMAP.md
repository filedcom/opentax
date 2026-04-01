# alwaysPass Rules Roadmap

> Generated: 2026-03-31 | Updated: 2026-04-01
> Total: 540 rules across 79 files (99 converted on 2026-03-31, 16 more on 2026-04-01 = 115 total converted)

These rules are currently `alwaysPass` because they require capabilities beyond
the current predicate DSL. This roadmap categorizes them by the capability needed
and suggests implementation approach for each category.

### Predicates added 2026-03-31

**Round 1:** `matchesHeaderSSN`, `notMatchesHeaderSSN`, `isITIN`, `contains`,
`charCountAtMost`, `charAfterIsAlpha`, `validRTN`

**Round 2:** `eqDiff`, `eqDiffFloorZero`, `eqProduct`, `eqMin`, `eqMax`, `notLtSum`

**Round 3 (2026-04-01):** `ltField`, `sumGtNum`, `eqMinNum`, `strLenEq`,
`dateYearGte`, `dateYearEq`, `dateYearEqOrNext`, `dateGteField`, `dateLteField`, `dateMonthDayEq`

See `core/validation/predicates.ts`.

---

## Summary

| # | Category | Count | Effort | Priority |
|---|----------|-------|--------|----------|
| 1 | External ID Validation (VIN, Registration) | 6 | Low | External API |
| 2 | IRS e-File Database Lookups | 80 | High | Server-side |
| 3 | Per-Item / Repeating Group Iteration | 112 | Medium | DSL extension |
| 4 | Form Reference Counting | 27 | Low | DSL extension |
| 5 | Date/Age Arithmetic | 33 | Medium | DSL extension |
| 6 | Cross-Form SSN Matching | 28 | Low | DSL extension |
| 7 | TIN/EIN Format & Cross-Ref Validation | 63 | Low | DSL extension |
| 8 | Uniqueness / Non-Duplicate Checks | 3 | Low | DSL extension |
| 9 | Binary Attachment Presence | 29 | Low | Manifest access |
| 10 | Complex Math (multiply, smaller-of, subtract, percent) | 57 | Medium | DSL extension |
| 11 | Conditional Math & Zero Checks | 86 | Medium | DSL extension |
| 12 | String Content Analysis | 10 | Low | DSL extension |
| 13 | Complex Checkbox / Indicator Logic | 11 | Low | DSL extension |
| 14 | XML/Transmission Structural Validation | 11 | N/A | XSD layer |
| 15 | Miscellaneous | 57 | Low | Review needed |
| 16 | State Program Participation | 3 | Low | Config data |

---

## External ID Validation (VIN, Registration)

**Count:** 6 | **Effort:** Low | **Priority:** External API

Rules validating external identifiers like VINs or IRS registration numbers against external sources.

| File | Rules |
|------|-------|
| f8283 | F8283-030 |
| sa | SA-F8936-001, SA-F8936-017-01, SA-F8936-023-01, SA-F8936-027-01, SA-F8936-028-01 |

---

## IRS e-File Database Lookups

**Count:** 80 | **Effort:** High | **Priority:** Server-side

Rules requiring validation against IRS databases (prior year AGI, IP PINs, SSN death records, duplicate return detection). These need a server-side integration with IRS e-Services or a local cache of validation data.

| File | Rules |
|------|-------|
| f1040 | F1040-087-02, F1040-164-01, F1040-448, F1040-468, F1040-516-01, F1040-518-01, F1040-525-03, F1040-526-03 |
| f1310 | F1310-518 |
| f2441 | F2441-524, F2441-526-01, F2441-995, F2441-996 |
| f8853 | F8853-514-01 |
| f8863 | F8863-512-02, F8863-528-04 |
| f8962 | F8962-070 |
| fw2g | FW2G-502, FW2G-599 |
| ind | IND-031-04, IND-032-04, IND-035-01, IND-036-01, IND-061, IND-100, IND-162, IND-164, IND-165-01, IND-168-01, IND-180-01, IND-181-01, IND-182-01, IND-183-01, IND-184, IND-450, IND-507-01, IND-517-02, IND-524, IND-531-01, IND-532-01, IND-544-01, IND-563-01, IND-664-02, IND-665-02, IND-666-02, IND-667-02, IND-995, IND-996, IND-997, IND-998 |
| r0000 | R0000-004-01, R0000-118-01, R0000-119-01, R0000-120, R0000-121, R0000-500-01, R0000-503-02, R0000-504-02, R0000-533-02, R0000-571-02, R0000-905-01, R0000-906-02 |
| sa | SA-F8936-030-01, SA-F8936-046, SA-F8936-047, SA-F8936-048 |
| seic | SEIC-F1040-501-02, SEIC-F1040-506-04, SEIC-F1040-509-04, SEIC-F1040-535-04, SEIC-F1040-995-01, SEIC-F1040-996-01 |
| sh | SH-F1040-520-01 |
| state | STATE-012, STATE-013, STATE-015, STATE-901, STATE-903 |
| x0000 | X0000-008, X0000-033 |

### Implementation
Requires server-side validation service. These rules can only be checked at submission time against IRS e-Services or a local validation database. Consider a `ServerRule` type that defers evaluation to the server layer.

---

## Per-Item / Repeating Group Iteration

**Count:** 112 | **Effort:** Medium | **Priority:** DSL extension

Rules that need to loop over repeating groups (e.g., each dependent, each W-2, each K-1 partner). Requires extending the predicate DSL with a `forEach` or `everyItem` combinator.

| File | Rules |
|------|-------|
| f1040 | F1040-034-08, F1040-071-07, F1040-156-01, F1040-360-02, F1040-455, F1040-464, F1040-471-01 |
| f1040x | F1040X-016-01 |
| f2441 | F2441-001-02, F2441-010, F2441-011-02, F2441-015-01, F2441-024-01 |
| f4797 | F4797-008-01 |
| f4835 | F4835-001 |
| f5695 | F5695-072, F5695-076, F5695-083 |
| f7205 | F7205-001, F7205-002 |
| f7211 | F7211-002, F7211-003 |
| f7218 | F7218-001, F7218-002, F7218-003 |
| f8283 | F8283-036 |
| f8332 | F8332-002, F8332-003 |
| f8854 | F8854-021, F8854-023 |
| f8862 | F8862-002-02 |
| f8863 | F8863-001-04, F8863-003-03, F8863-022, F8863-024, F8863-026-01 |
| f8888 | F8888-016 |
| f8910 | F8910-013-07 |
| f8959 | F8959-001, F8959-002, F8959-010-02 |
| f8960 | F8960-018-01, F8960-019-05, F8960-020-03, F8960-021-01, F8960-027-01 |
| f8962 | F8962-322 |
| ind | IND-067-10, IND-085-01, IND-086-01, IND-088, IND-116-01, IND-133, IND-154-02, IND-443-01, IND-472 |
| r0000 | R0000-007-02, R0000-193 |
| s1 | S1-F1040-060-01, S1-F1040-080-03, S1-F1040-120-01, S1-F1040-124, S1-F1040-195, S1-F1040-266, S1-F1040-360, S1-F1040-376 |
| s2 | S2-F1040-006, S2-F1040-014, S2-F1040-123-01, S2-F1040-146-02, S2-F1040-180-01 |
| s3 | S3-F1040-016, S3-F1040-017-01, S3-F1040-021, S3-F1040-101-01, S3-F1040-104-01, S3-F1040-105-01, S3-F1040-109-01, S3-F1040-152-02 |
| sa | SA-F1040-015-02, SA-F1040-025-01 |
| sc | SC-F1040-015-01, SC-F1040-023-01, SC-F1040-024 |
| seic | SEIC-F1040-003-04, SEIC-F1040-004-05, SEIC-F1040-005-10, SEIC-F1040-006-10, SEIC-F1040-007-01, SEIC-F1040-008-02, SEIC-F1040-521-03, SEIC-F1040-536-04, SEIC-F1040-537-02 |
| sk3 | SK3-F8865-023, SK3-F8865-024, SK3-F8865-025, SK3-F8865-026, SK3-F8865-027, SK3-F8865-028, SK3-F8865-029, SK3-F8865-030, SK3-F8865-031, SK3-F8865-032, SK3-F8865-033, SK3-F8865-034, SK3-F8865-035, SK3-F8865-036, SK3-F8865-037 |
| slep | SLEP-F1040-001 |
| x0000 | X0000-010, X0000-015, X0000-020 |

### Implementation
Add `forEach(formId, itemCheck)` and `everyItem(formId, itemCheck)` predicates that iterate over repeating groups in the pending dict.

---

## Form Reference Counting

**Count:** 27 | **Effort:** Low | **Priority:** DSL extension

Rules requiring that a form is referenced from exactly one parent. Needs a `referencedByExactly(formId, n)` predicate or structural validation.

| File | Rules |
|------|-------|
| schk2k3 | SCHK2K3-001, SCHK2K3-004, SCHK2K3-005, SCHK2K3-006, SCHK2K3-007, SCHK2K3-008, SCHK2K3-010, SCHK2K3-011, SCHK2K3-012, SCHK2K3-013, SCHK2K3-014 |
| schk3 | SCHK3-001, SCHK3-002, SCHK3-004 |
| sg | SG-F8865-001 |
| sh | SH-F5471-001, SH-F8865-001 |
| si1 | SI1-F5471-001 |
| sj | SJ-F5471-001 |
| sk1 | SK1-F8865-001 |
| sl | SL-F1118-001 |
| sm | SM-F5471-001 |
| so | SO-F5471-001, SO-F8865-001 |
| sp | SP-F5471-001, SP-F8865-001 |
| sr | SR-F5471-001 |

---

## Date/Age Arithmetic

**Count:** 33 | **Effort:** Medium | **Priority:** DSL extension

Rules comparing dates, computing ages, or checking tax year boundaries. Need a `dateCmp` or `age` predicate added to the DSL.

| File | Rules |
|------|-------|
| f1310 | F1310-007-01 |
| f2555 | F2555-016, F2555-017, F2555-022 |
| f8283 | F8283-006-02, F8283-007-02 |
| f8854 | F8854-017-09 |
| fpymt | FPYMT-071-01, FPYMT-072-01, FPYMT-074-01, FPYMT-086, FPYMT-087, FPYMT-099, FPYMT-100, FPYMT-101 |
| ind | IND-002, IND-033-02, IND-034-02, IND-451, IND-521-01, IND-570-01, IND-674-01, IND-675-01, IND-679-01, IND-680-01, IND-689-01 |
| r0000 | R0000-180, R0000-228, R0000-229 |
| s3 | S3-F1040-056-01 |
| schk2k3 | SCHK2K3-002 |
| seic | SEIC-F1040-534-03 |
| x0000 | X0000-032 |

### Implementation
Add `dateField(xml)`, `ageBefore(xml, date)`, `yearEquals(xml, year)` predicates. Tax period dates come from ReturnContext.

---

## Cross-Form SSN Matching

**Count:** 28 | **Effort:** Low | **Priority:** DSL extension

Rules requiring a form-level SSN to equal PrimarySSN or SpouseSSN from the Return Header. Need a `matchesHeaderSSN` predicate.

| File | Rules |
|------|-------|
| f1040 | F1040-037-04, F1040-038-03, F1040-039-05, F1040-040-04, F1040-469, F1040-470 |
| f1310 | F1310-008-01 |
| f2106 | F2106-001-01, F2106-002-01, F2106-003-01 |
| f2555 | F2555-001 |
| f4137 | F4137-001 |
| f4563 | F4563-001 |
| f5695 | F5695-001 |
| f7206 | F7206-001 |
| f8332 | F8332-001 |
| f8606 | F8606-001 |
| f8889 | F8889-001-01 |
| f8919 | F8919-001 |
| f9000 | F9000-001 |
| r0000 | R0000-123-01, R0000-129-01 |
| rrb | RRB-F1042S-001 |
| sh | SH-F1040-001, SH-F1040-003 |
| ssa | SSA-F1042S-002 |
| state | STATE-016, STATE-019 |

### Implementation
Add `matchesHeaderSSN(xml)` predicate that checks if a field equals PrimarySSN or SpouseSSN. Simple — ReturnContext already has `primarySSN()` and `spouseSSN()`.

---

## TIN/EIN Format & Cross-Ref Validation

**Count:** 69 | **Effort:** Low | **Priority:** DSL extension

Rules validating TIN/EIN format or cross-referencing against header SSNs. Many can be implemented with an extended `matchesHeaderSSN` + `validEIN` predicate.

| File | Rules |
|------|-------|
| f1040 | F1040-473, F1040-900, F1040-901 |
| f1310 | F1310-005, F1310-016 |
| f2210f | F2210F-001 |
| f2441 | F2441-991, F2441-992, F2441-994 |
| f2555 | F2555-002, F2555-005-02 |
| f3468 | F3468-030-01, F3468-031-01, F3468-032-01 |
| f4137 | F4137-002 |
| f4563 | F4563-002 |
| f5695 | F5695-002, F5695-003-05 |
| f8379 | F8379-002 |
| f8697 | F8697-009 |
| f8863 | F8863-901, F8863-902, F8863-904 |
| f8865 | F8865-194-02, F8865-202-03 |
| f8889 | F8889-002-01 |
| f8919 | F8919-002 |
| f8959 | F8959-013 |
| f8960 | F8960-010 |
| f8995a | F8995A-001, F8995A-002 |
| f9000 | F9000-002 |
| f9465 | F9465-044 |
| ind | IND-452, IND-508-01, IND-510-02, IND-511-01, IND-513-01, IND-515-01, IND-901, IND-902, IND-904, IND-905, IND-906, IND-907, IND-908, IND-931-01, IND-932-01, IND-934-01, IND-941-01, IND-942-01, IND-943-01, IND-944-01 |
| r0000 | R0000-019, R0000-075-02, R0000-130-01, R0000-142-01, R0000-904-03 |
| s1 | S1-F1040-115 |
| s3 | S3-F1040-144 |
| sa | SA-F8995A-001 |
| sc | SC-F1040-001, SC-F1040-010 |
| schk2k3 | SCHK2K3-009 |
| seic | SEIC-F1040-911-01, SEIC-F1040-912-01, SEIC-F1040-914-01 |
| sh | SH-F1040-002, SH-F1040-004 |

---

## Uniqueness / Non-Duplicate Checks

**Count:** 3 | **Effort:** Low | **Priority:** DSL extension

Rules requiring that values across form instances are unique.

| File | Rules |
|------|-------|
| f8888 | F8888-015 |
| f8962 | F8962-320 |
| r0000 | R0000-194 |

---

## Binary Attachment Presence

**Count:** 29 | **Effort:** Low | **Priority:** Manifest access

Rules checking that a PDF or binary attachment is included. Need access to the attachment manifest.

| File | Rules |
|------|-------|
| f1310 | F1310-023-02 |
| f5695 | F5695-069, F5695-071, F5695-075, F5695-079, F5695-082, F5695-086, F5695-091, F5695-096, F5695-097, F5695-098 |
| f8082 | F8082-006, F8082-007 |
| f8283 | F8283-029-02, F8283-031-01, F8283-032-02, F8283-033-01 |
| f8838p | F8838P-001 |
| ind | IND-298-01 |
| r0000 | R0000-056-01, R0000-057-01, R0000-058-01, R0000-067, R0000-236 |
| sa | SA-F1040-003-02 |
| x0000 | X0000-011, X0000-012, X0000-024, X0000-029 |

---

## Complex Math (multiply, smaller-of, subtract, percent)

**Count:** 57 | **Effort:** Medium | **Priority:** DSL extension

Rules needing arithmetic beyond simple sum equality — multiplication, division, min/max, percentage, subtraction with tolerance. Need `mul`, `sub`, `min`, `max`, `pct` predicates.

| File | Rules |
|------|-------|
| f4684 | F4684-003-02 |
| f5695 | F5695-038-01, F5695-039-02, F5695-040-02, F5695-041-02, F5695-046-02, F5695-047-02, F5695-048-02, F5695-049-02, F5695-051-01, F5695-054-02, F5695-067, F5695-095, F5695-099, F5695-102 |
| f8835 | F8835-018, F8835-020, F8835-021, F8835-022, F8835-025, F8835-027, F8835-029, F8835-031, F8835-032, F8835-048 |
| f8889 | F8889-013, F8889-016 |
| f8936 | F8936-030, F8936-039-01, F8936-043 |
| f8960 | F8960-025, F8960-026 |
| f8962 | F8962-002-03, F8962-006-01, F8962-008, F8962-025, F8962-026-01, F8962-027-01, F8962-028-01, F8962-029-01, F8962-030-01, F8962-031-01, F8962-032-01, F8962-033-01, F8962-034-01, F8962-035-01, F8962-036-01, F8962-037-01, F8962-038, F8962-040, F8962-344 |
| f9465 | F9465-041 |
| ind | IND-098-01, IND-241-04 |
| r0000 | R0000-205 |
| sa | SA-F8936-040 |
| schk2k3 | SCHK2K3-003 |

### Implementation
Add `sub(a, b)`, `mul(a, b, n)`, `minOf(a, b)`, `maxOf(a, b)`, `pct(a, n)` predicates for arithmetic beyond sums.

---

## Conditional Math & Zero Checks

**Count:** 86 | **Effort:** Medium | **Priority:** DSL extension

Rules with conditional zero-checks or field equality that involve complex conditions beyond the current DSL's expressiveness.

| File | Rules |
|------|-------|
| f1040 | F1040-068-03 |
| f1040x | F1040X-011-01, F1040X-036, F1040X-039 |
| f2441 | F2441-012-03 |
| f5695 | F5695-066 |
| f6765 | F6765-004-02 |
| f8379 | F8379-021 |
| f8697 | F8697-007-01 |
| f8835 | F8835-024, F8835-026, F8835-028, F8835-037 |
| f8865 | F8865-204-01, F8865-205-01, F8865-206-01, F8865-207-01, F8865-208-01, F8865-209-01, F8865-210-01, F8865-211-01, F8865-212-01, F8865-213-01, F8865-214-01, F8865-215-01, F8865-216-01, F8865-217-01, F8865-218-01, F8865-219-01, F8865-220-01, F8865-221-01, F8865-222-01, F8865-223-01, F8865-224-01, F8865-225-01 |
| f8866 | F8866-002-01 |
| f8889 | F8889-005, F8889-009, F8889-010, F8889-011, F8889-012 |
| f8936 | F8936-037, F8936-041 |
| f8959 | F8959-008, F8959-012, F8959-015, F8959-019-01 |
| f8960 | F8960-024-01 |
| f8962 | F8962-005-02, F8962-010, F8962-011, F8962-012, F8962-013, F8962-014, F8962-015, F8962-016, F8962-017, F8962-018, F8962-019, F8962-020, F8962-021, F8962-022, F8962-023, F8962-024, F8962-042, F8962-043-02, F8962-050-01, F8962-051-01, F8962-341 |
| f9465 | F9465-039-01, F9465-043 |
| fpymt | FPYMT-057-03, FPYMT-089 |
| ind | IND-080 |
| r0000 | R0000-046-01 |
| s1 | S1-F1040-396-04, S1-F1040-399-03 |
| s3 | S3-F1040-031 |
| s8812 | S8812-F1040-003-04 |
| sa | SA-F1040-023-01, SA-F8992-001, SA-F8995A-002 |
| sc | SC-F1040-005-02, SC-F1040-021 |
| sh | SH-F1040-011 |
| ssa | SSA-F1042S-001 |

---

## String Content Analysis

**Count:** 14 | **Effort:** Low | **Priority:** DSL extension

Rules checking substrings, character patterns, or literal codes within field values. Need a `contains` or `matchesPattern` predicate.

| File | Rules |
|------|-------|
| f8606 | F8606-004-01, F8606-005-01 |
| f8835 | F8835-019 |
| ind | IND-428, IND-429, IND-430, IND-435 |
| r0000 | R0000-125-01, R0000-127-01, R0000-225 |
| sa | SA-F8936-029 |
| seic | SEIC-F1040-539-03 |
| x0000 | X0000-018, X0000-019 |

---

## Complex Checkbox / Indicator Logic

**Count:** 11 | **Effort:** Low | **Priority:** DSL extension

Rules with complex checkbox interaction patterns.

| File | Rules |
|------|-------|
| f1310 | F1310-024-02 |
| f3468 | F3468-027, F3468-028-01, F3468-029-01, F3468-033-01, F3468-034, F3468-035-01 |
| f5695 | F5695-064, F5695-065 |
| f8865 | F8865-193-01 |
| r0000 | R0000-090 |

---

## XML/Transmission Structural Validation

**Count:** 11 | **Effort:** N/A | **Priority:** XSD layer

Rules about XML structure, manifest integrity, or zip archive format. These belong in the XSD validation layer, not the business rules engine.

| File | Rules |
|------|-------|
| r0000 | R0000-060, R0000-114, R0000-115 |
| state | STATE-006, STATE-010, STATE-011, STATE-017, STATE-902 |
| x0000 | X0000-005, X0000-025, X0000-030 |

---

## Miscellaneous

**Count:** 57 | **Effort:** Low | **Priority:** Review needed

Rules that don't fit neatly into other categories. Review individually.

| File | Rules |
|------|-------|
| f1040 | F1040-406-02, F1040-474, F1040-616, F1040-618 |
| f1040x | F1040X-017-01, F1040X-040 |
| f172 | F172-004, F172-005 |
| f2441 | F2441-026, F2441-033 |
| f2555 | F2555-003, F2555-004-01, F2555-006-01, F2555-010, F2555-019 |
| f3468 | F3468-040 |
| f5695 | F5695-057, F5695-058 |
| f8594 | F8594-001-01 |
| f8828 | F8828-001 |
| f8835 | F8835-023 |
| f8863 | F8863-027 |
| f8865 | F8865-233 |
| f8908 | F8908-005 |
| f8915f | F8915F-001, F8915F-002 |
| f8962 | F8962-060, F8962-317, F8962-318, F8962-319 |
| f9465 | F9465-027-01, F9465-029-02, F9465-030-02, F9465-038-02 |
| fpymt | FPYMT-045-02, FPYMT-088-11 |
| ft | FT-003-07, FT-004-07 |
| ind | IND-064, IND-145-01, IND-453, IND-466, IND-607, IND-617, IND-644, IND-663, IND-769 |
| r0000 | R0000-126-01, R0000-198 |
| sa | SA-F8936-031-01 |
| seic | SEIC-F1040-009, SEIC-F1040-010 |
| sh | SH-F1040-005 |
| slep | SLEP-F1040-002 |
| x0000 | X0000-027, X0000-028, X0000-031 |

---

## State Program Participation

**Count:** 3 | **Effort:** Low | **Priority:** Config data

Rules checking state e-file program participation. Requires state configuration data.

| File | Rules |
|------|-------|
| state | STATE-001, STATE-005, STATE-007 |

---

