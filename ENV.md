# Environment Variables

Full documentation: [`.knowledge/architecture/environment-config.md`](.knowledge/architecture/environment-config.md)

## Quick setup

```powershell
copy apps\backend\.env.template apps\backend\.env
copy apps\storefront\.env.template apps\storefront\.env
copy scripts\.env.template scripts\.env
```

| Template | Secret file | Process |
| --- | --- | --- |
| `apps/backend/.env.template` | `apps/backend/.env` | `pnpm backend:dev` |
| `apps/storefront/.env.template` | `apps/storefront/.env` | `pnpm storefront:dev` |
| `scripts/.env.template` | `scripts/.env` | `scripts/worker.ts`, `scripts/voice-agent.ts` |

Root scripts load all three app env files via [`scripts/load-env.ts`](scripts/load-env.ts). Do not commit `.env` files.

**Demo:** step-by-step run order (all processes + telemetry) → [`.knowledge/architecture/demo-runbook.md`](.knowledge/architecture/demo-runbook.md).
