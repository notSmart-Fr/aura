---
type: ArchitectureBridge
title: LiveKit Voice Agent — Real-Time Audio Pipeline
description: Diagrams the end-to-end voice entrypoint flow from WebRTC room ingestion through STT, OrchestratorService intent resolution, and TTS reply streaming back over the LiveKit room.
resource: scripts/voice-agent.ts
related:
  - apps/backend/src/domains/orchestrator/orchestrator.service.ts
  - scripts/worker.ts
  - .knowledge/architecture/session-memory.md
tags: [livekit, voice, stt, tts, deepgram, cartesia, orchestrator, webrtc, real-time]
timestamp: 2026-06-22T16:14:00Z
---

## LiveKit Voice Agent — Real-Time Audio Pipeline

`scripts/voice-agent.ts` is a long-lived Node.js process that connects to a LiveKit room, runs a local VAD loop, and delegates all AI resolution to the same [`OrchestratorService`](../../apps/backend/src/domains/orchestrator/orchestrator.service.ts) that the BullMQ worker uses. It is structurally parallel to [`scripts/worker.ts`](../../scripts/worker.ts) — a thin transport runner, not a business logic host.

---

### 1. Channel Topology

```mermaid
flowchart TD
    subgraph channels [Inbound Channels]
        WA[WhatsApp\nWebhook]
        LK[LiveKit\nWebRTC Room]
    end

    subgraph transports [Transport Runners]
        Worker["scripts/worker.ts\n(BullMQ Worker)"]
        Voice["scripts/voice-agent.ts\n(LiveKit WorkerOptions)"]
    end

    subgraph core [Core Engine]
        Orch["OrchestratorService\n.processIntent()"]
        Redis["Redis\nSession Store"]
        VecDB["Neon Postgres\nVector Index"]
        Agent["Mastra shopAgent\n.generate()"]
    end

    WA -->|"HTTP POST → ingestionQueue"| Worker
    LK -->|"WebRTC audio frames"| Voice

    Worker -->|"ProcessIntentInput\nchannel: whatsapp"| Orch
    Voice  -->|"ProcessIntentInput\nchannel: livekit_voice"| Orch

    Orch --> Redis
    Orch --> VecDB
    Orch --> Agent
    Agent -->|"string[]"| Orch

    Orch -->|"responseText"| Worker
    Orch -->|"responseText"| Voice

    Worker -->|"Meta Graph API\nsendResponse()"| WA
    Voice  -->|"TTS stream\nsession.say()"| LK
```

---

### 2. Real-Time Audio Frame Pipeline

```mermaid
sequenceDiagram
    participant Room as LiveKit Room
    participant VAD as VAD\n(local inference)
    participant STT as Deepgram STT\nnova-3 (stream)
    participant Orch as OrchestratorService
    participant TTS as Cartesia TTS\nsonic-commercial
    participant Room2 as LiveKit Room

    Room->>VAD: raw PCM audio frames
    VAD-->>STT: speech segment detected
    STT-->>Orch: finalTranscript (string)
    Note over Orch: Redis history load →\nvector search → shopAgent.generate()
    Orch-->>TTS: responseText (string)
    TTS-->>Room2: audio chunks over WebRTC
```

---

### 3. Session Identity Isolation

The voice agent passes the remote participant's `identity` (via `ctx.waitForParticipant()`) as `platformUserId`. This is the same key scheme the Redis session store uses to namespace multi-turn history, so voice sessions are stored separately from WhatsApp sessions — no cross-channel bleed.

| Channel | `platformUserId` source | Redis key prefix |
|---|---|---|
| `whatsapp` | `payload.metadata.sender` | `session:whatsapp:<id>` |
| `livekit_voice` | `participant.identity` (remote user) | `session:livekit_voice:<id>` |

---

### 4. Graceful Shutdown Sequence

```mermaid
flowchart LR
    SIGTERM --> VoiceClose["voice-agent:\norchestrator.close()"]
    VoiceClose --> RedisQuit["redis.quit()"]
    VoiceClose --> DBDestroy["dataSource.destroy()"]
    RedisQuit --> Exit["process.exit(0)"]
    DBDestroy --> Exit
```

---

### 5. AST Firewall Gate Mapping

The file is added to the AST firewall default sweep. Relevant rules enforced at compile time:

| Rule | Constraint | How voice-agent.ts satisfies it |
|---|---|---|
| 14 | No naked `fetch`/`axios` outside Zod parse | All network inside `@livekit/agents` SDK boundaries |
| 19 | No explicit `any` on params or variables | `error: unknown` + `instanceof Error` guard |
| 20 | No `z.any().parse()` bypass | No Zod usage in this file at all |

---

### 6. Required Environment Variables

LiveKit, Deepgram, and Cartesia keys live in `scripts/.env`. `OrchestratorService` inherits `DB_*`, `DEEPSEEK_API_KEY`, and `PAYLOAD_DATABASE_URL` from app env files via [`scripts/load-env.ts`](../../scripts/load-env.ts). Full key map: [environment-config.md](./environment-config.md).
