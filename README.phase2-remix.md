# Phase 2: Enterprise Graph Stack (Remix + Mastra Core + Vendure Backend)

This document details the architecture, design patterns, and components implemented in Phase 2 of the Aura storefront project.

## 🏗️ Architecture Overview

The storefront has been migrated from Next.js (App Router) to **Remix (Vite Engine)**, and the backend has been migrated from Medusa/Payload CMS to **Vendure (Headless GraphQL)**. The AI layer is managed by **Mastra Core**.

```text
  ┌──────────────────────────────────────────────────────────┐
  │              Remix Frontend (Vite Engine)                │
  └──────────────────────────────────────────────────────────┘
                               │
               (GraphQL Queries / Mutations)
                               │
                               ▼
  ┌──────────────────────────────────────────────────────────┐
  │          Vendure Headless Commerce GraphQL Core          │
  └──────────────────────────────────────────────────────────┘
         │                                            │
   (Vector Search)                               (Mastra AI)
         ▼                                            ▼
 [Neon pgvector Index]                       [Mastra Agent Tools]
```

## 🛠️ Key Components & Integrations

### 1. Storefront Migration (Remix)

- Scaffolded under `apps/storefront` using Vite.
- Global styles decoupled and moved to `apps/storefront/app/styles/globals.css`.
- Core page routes managed natively in Remix.

### 2. Mastra AI Core Integration

- **Search Catalog Tool:** Resolves search parameters and triggers a GraphQL query to the Vendure API.
- **Cart Modification Tool:** Interacts with the active session cart.
- **Show Recommendations Tool:** Performs content-based filtering recommendations.
- **Explicit Schema Exports:** To allow static analysis firewalls to parse schemas, all Mastra tool schemas are declared as named exports immediately above the tool definition.

### 3. Vendure Backend Customizations

- **Custom Field:** Added an `embedding` vector field (`customFieldsEmbedding` in the database) to the `Product` entity.
- **Vector Search Plugin:** Implements pgvector similarity lookup (`<=>` Cosine Distance) using a TypeORM raw driver query referencing the camelCase column.
