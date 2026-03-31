# Phase 1 — Research

**Goal:** Produce `{node_path}/research/context.md` — a complete reference so a coding agent can implement the node with zero external knowledge.

---

## Step 1 — Create files first

Before any web fetching, write both files to disk:

**`{node_path}/research/scratchpad.md`:**

```
# {Node Name} — Scratchpad

## Purpose
{Fill after research}

## Fields identified
{Fill after research}

## Open Questions
- [ ] Q: What fields does this node capture or receive?
- [ ] Q: Where does each field flow on the 1040?
- [ ] Q: What are the TY2025 constants?
- [ ] Q: What edge cases exist?
- [ ] Q: What upstream nodes feed into this node? (intermediate only)

## Sources to check
- [ ] Drake KB article (if applicable)
- [ ] IRS form instructions PDF
- [ ] Relevant IRS Publication
- [ ] Rev Proc 2024-40 (TY2025 constants)
```

**`{node_path}/research/context.md`** — write with all section headers and empty tables (see structure at end of this doc).

---

## Step 2 — Parallel research agents

Spawn these two agents simultaneously:

### Drake Agent

> Search `site:kb.drakesoftware.com {node_name}` and the related IRS form name. Read the primary article in full and follow key links. Extract every data-entry field: name, type, description, where it routes on the 1040.
> If no article is found for this node or form, write "NO_DRAKE_MATCH" and stop.
> Output: structured field list with descriptions and routing hints.

### IRS Agent

> Research IRS form {form_name} for tax year 2025:
> 1. IRS form instructions PDF from irs.gov/pub/irs-pdf/
> 2. Relevant IRS Publication (e.g. Pub 525, Pub 946, Pub 970 — choose based on the form subject)
> 3. Rev Proc 2024-40 for TY2025 constants
>
> Extract: all fields with IRS definitions and line references, calculation steps with exact citations (document + section + page), constants with values, edge cases from instructions.
> Output: structured field list, calculation logic, constants table, edge cases.

---

## Step 3 — Merge into context.md

Merge both agent outputs into context.md. If Drake returned NO_DRAKE_MATCH, set Drake Screen to "None".

Update scratchpad.md: mark resolved questions `[x]` with citations.

---

## Step 4 — Critique loop (max 5 iterations)

Spawn a **Critique agent**:

> Read `{node_path}/research/context.md` in full.
> Flag any of the following:
> - [MISSING_FIELD] field_name — field mentioned in sources but absent from Input Fields table
> - [UNCITED] item — constant or calculation step with no IRS citation
> - [UNCLEAR_ROUTING] field — output routing row missing condition or destination
> - [GAP] question — open question in scratchpad still unresolved
> - [NO_EDGE_CASES] — Edge Cases section is empty
>
> If none apply, write "APPROVED" and stop.
> Output ONLY the findings list or "APPROVED".

**If "APPROVED"** → proceed to Step 5.

**If findings exist** → spawn a **Research agent** to fill gaps:

> Read the critique findings below and `{node_path}/research/context.md`.
> Research each finding using IRS sources and Drake KB (if applicable).
> Update context.md to resolve every finding with a verifiable citation.
> --- FINDINGS ---
> {CRITIQUE_FINDINGS}

Repeat critique → research until "APPROVED" or 5 iterations reached. If 5 iterations pass without "APPROVED", list unresolved findings and continue to Phase 2.

---

## Step 5 — Download PDFs

Use `.research/docs/` at the repo root as the shared cache. Check before downloading.

```bash
mkdir -p .research/docs
ls .research/docs/{filename}.pdf 2>/dev/null && echo "already cached" || curl -sL "{url}" -o ".research/docs/{filename}.pdf" --max-time 60
```

Reference from context.md using `.research/docs/{filename}.pdf`.

---

## Gate

- No empty tables in Input Fields, Output Routing, Constants
- No `_Research in progress._` sections
- Every constant has a Rev Proc or IRS citation
- Data flow diagram complete

**Gate passed → proceed to Phase 2.**

---

## context.md structure

```
# {Node Name} — {IRS Form Full Name}

## Overview
{What this node captures or calculates, what it feeds downstream, why it matters.}

**IRS Form:** {form}
**Drake Screen:** {identifier or "None"}
**Node Type:** {input | intermediate}
**Tax Year:** 2025
**Drake Reference:** {verified URL or "N/A"}

---

## Input Fields
{Input nodes: fields from user data entry. Intermediate nodes: fields received from upstream NodeOutputs.}

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |

---

## Calculation Logic

### Step 1 — {name}
{Description}
Source: {Document}, {Section/Line}, p.{N} — {verified URL}

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |

---

## Data Flow Diagram

flowchart LR
  subgraph inputs["Upstream Inputs / Data Entry"]
  end
  subgraph node["{Node Name}"]
  end
  subgraph outputs["Downstream Nodes"]
  end

---

## Edge Cases & Special Rules

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
```
