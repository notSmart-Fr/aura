---
type: ArchitectureBridge
title: Agent-Workspace Workflow and Documentation Boundaries
description: Standardizes responsibilities and file locations for agents.md, custom skills, and conceptual knowledge.
resource: .knowledge/architecture/workflow.md
tags: [workflow, architecture, guidelines, skills]
timestamp: 2026-06-21T16:45:00Z
---

## Agent-Workspace Workflow and Documentation Boundaries

To keep the agent’s execution deterministic, resource-efficient, and aligned with the repository's architecture, documentation, designs, and instructions are split into four key files and directories:

---

## 1. Global Guardrails: `agents.md`

`agents.md` acts as the **Systemic Contract** at the root of the workspace. It contains the core guidelines that apply to **every action** the agent performs.

- **What goes here:**
  - Strict architectural constraints (e.g., Domain Locality rules, code discovery protocols).
  - Styling tokens and visual restraints (e.g., colors, margins, aspect ratios, minimalist theme rules).
  - Verification protocols (e.g., checking `.gate-results.json` after saving files).
  - Execution strategies (e.g., Data-First Grounding, single-purpose tool delegation).
- **Lifecycle:** Persistent, read on startup, and rarely modified except when adding global project-wide boundaries.

---

## 2. Dynamic Execution Rules: `.agent/skills/`

Skills are task-specific, isolated procedural instructions stored under `.agent/skills/<skill-name>/SKILL.md`.

- **What goes here:**
  - Detailed procedural recipes (e.g., seeding steps, variant mapping mutations, vector chunking workflows).
  - Blueprints and command checklists that apply to specific feature areas or operations.
- **Workflow / Lifecycle:**
  - Each `SKILL.md` contains a YAML frontmatter with a `description` field.
  - **Dynamic Context Loading:** Before executing a task, the agent scans descriptions. If the description matches the task, it loads the file; otherwise, it drops it to save context window tokens.
  - Create new skills only when introducing a new procedural workflow (e.g., a checkout processor workflow).

---

## 3. Conceptual & Graph-Linked Knowledge: `.knowledge/`

The `.knowledge/` directory holds conceptual models, schema structures, and structural diagrams.

- **What goes here:**
  - Architecture summaries (e.g., Remix-Vendure state syncing).
  - Database schema diagrams and vector space dimensions.
  - Domain-specific API definitions or third-party integration outlines.

### Arrangement & Organization

To keep the knowledge base clean and indexed correctly:

- **Directory Structure:** Organize files by category subfolders:
  - `.knowledge/architecture/` — System flows, authentication sequences, and integration bridges.
  - `.knowledge/data-models/` — Relational database models, vector tables, and option matrix structures.
- **Conformant OKF Format:** Every `.md` file must begin with a YAML header containing metadata:

  ```yaml
  ---
  type: <ConceptType> (e.g., ArchitectureBridge, DataModel)
  title: <Human-Readable Title>
  description: <Short Summary of the Concept>
  resource: <Relative workspace path or domain reference>
  tags: [list, of, tags]
  timestamp: <ISO-8601 Timestamp>
  ---
  ```

- **Graph Cross-Linking:** Always connect concepts using relative markdown links (e.g., `[Vector Embedding Layout](../data-models/vector-schema.md)`). This allows `codebase-memory-mcp` to parse links and compile a queryable SQLite relationship graph of the codebase architecture.

---

## 4. Design System Reference: `design.md`

`design.md` resides at the root of the workspace and serves as the visual and styling source of truth.

- **What goes here:**
  - Standard color palette mappings, HSL values, and CSS variables.
  - Typography settings (fonts, weights, sizes).
  - Exact layout constraints (aspect ratios, border styles, responsive breakpoints).
  - Component blueprints and UI design specifications.
- **Lifecycle:** Static visual contract, consult whenever generating or editing styling/components to maintain premium luxury aesthetics.
