---
type: ArchitectureBridge
title: Remix-Vendure Authentication Sync
description: Maps how storefront session cookies trade states with backend GraphQL tokens.
resource: apps/storefront/app/domains/auth/
tags: [auth, security, sessions]
timestamp: 2026-06-19T18:10:00Z
---

## Remix-Vendure Authentication Sync

When a user logs into the AURA storefront, authentication bridges across the decoupled execution layers:

1. Remix storefront utility captures credentials and posts to the Vendure GraphQL mutation endpoint.
2. The Neon DB validates credentials; Vendure generates an `unwrapped-token` header string.
3. For the corresponding spatial indexing model layout, see [Vector Embedding Layout](../data-models/vector-schema.md).
