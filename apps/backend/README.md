# @dtc/backend

Vendure headless commerce server for the Aura storefront.

## Stack

- [Vendure](https://www.vendure.io/) — GraphQL commerce API, TypeORM, NestJS
- Postgres with `pgvector` for product embeddings
- Custom plugins under `src/plugins/`

## Commands

```bash
pnpm backend:dev      # from monorepo root
pnpm backend:seed     # populate catalog from products.csv
```

## Key paths

| Path | Purpose |
|------|---------|
| `src/vendure-config.ts` | Vendure server configuration |
| `src/seed.ts` | Database seed entry point |
| `src/products.csv` | Catalog seed data |
| `src/plugins/vector-search/` | Vector search GraphQL extension |
| `src/domains/orchestrator/orchestrator.service.ts` | Re-exports `@dtc/ai-core/orchestrator` |

AI orchestration lives in `packages/ai-core/`, not in this app. See [`.knowledge/README.md`](../../.knowledge/README.md).
