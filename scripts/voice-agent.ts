import { fileURLToPath } from "node:url";
import { sdk } from './otel-bootstrap.ts';
import { loadMonorepoEnv } from "./load-env.ts";
loadMonorepoEnv();

import {
  AutoSubscribe,
  cli,
  defineAgent,
  type JobContext,
  ServerOptions,
  voice,
} from "@livekit/agents";
import * as cartesia from "@livekit/agents-plugin-cartesia";

import { OrchestratorService } from "@dtc/ai-core/orchestrator";

const orchestrator = new OrchestratorService();

function sanitizeForTTS(text: string): string {
  return text
    .replace(/([.!?])([A-Z])/g, "$1 $2")  // add space between sentences if missing
    .replace(/["""]/g, "")                  // strip quotation marks
    .replace(/[*_~`#]/g, "")               // strip markdown formatting
    .replace(/\s{2,}/g, " ")               // collapse multiple spaces
    .trim();
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    console.log(`[Voice Portal] Connecting to stateful WebRTC Room: ${ctx.room.name}`);

    await ctx.connect(undefined, AutoSubscribe.AUDIO_ONLY);
    const participant = await ctx.waitForParticipant();
    const platformUserId = participant.identity;

    const session = new voice.AgentSession({
      stt: new cartesia.STT({ model: "ink-2" }),
      tts: new cartesia.TTS({ voice: "f786b574-daa5-4673-aa0c-cbe3e8534c02" }),
      turnHandling: { turnDetection: "stt" },
    });

    const agent = new voice.Agent({
      instructions:
        "You are a voice concierge for a minimalist apparel storefront. Keep responses brief and helpful.",
    });

    await session.start({ agent, room: ctx.room });

    console.log("[Voice Portal] Real-time audio pipeline online. Listening...");

    session.on(voice.AgentSessionEventTypes.UserInputTranscribed, async (event) => {
      if (!event.isFinal) return;

      const transcribedText = event.transcript;
      if (!transcribedText.trim()) return;

      console.log(`[Voice Boundary] Transcribed Input: ${transcribedText}`);

      try {
        const result = await orchestrator.processIntent({
          channel: "livekit_voice",
          platformUserId,
          text: transcribedText,
        });

        const aiReply = sanitizeForTTS(result.text);
        console.log(`[Voice Boundary] Orchestrator Yielded text: ${aiReply}`);

        await session.say(aiReply);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`[Voice Pipeline Error]: ${msg}`);
        await session.say("I encountered an error accessing our catalog.");
      }
    });
  },
});

async function shutdown(signal: string) {
  console.log(`Received ${signal}. Shutting down voice agent...`);
  try {
    await orchestrator.close();
    await sdk.shutdown();
    console.log("Voice agent closed successfully.");
    process.exit(0);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error during voice agent shutdown:", msg);
    process.exit(1);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

cli.runApp(new ServerOptions({ agent: fileURLToPath(import.meta.url) }));
