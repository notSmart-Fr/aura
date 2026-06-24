import { sdk } from './otel-bootstrap.ts';
import { loadMonorepoEnv } from "./load-env.ts";
loadMonorepoEnv();

import {
  AutoSubscribe,
  cli,
  defineAgent,
  inference,
  type JobContext,
  ServerOptions,
  voice,
} from "@livekit/agents";
import * as cartesia from "@livekit/agents-plugin-cartesia";
import * as deepgram from "@livekit/agents-plugin-deepgram";

import { OrchestratorService } from "@dtc/ai-core/orchestrator";

const orchestrator = new OrchestratorService();

export default defineAgent({
  entry: async (ctx: JobContext) => {
    console.log(`[Voice Portal] Connecting to stateful WebRTC Room: ${ctx.room.name}`);

    await ctx.connect(undefined, AutoSubscribe.AUDIO_ONLY);
    const participant = await ctx.waitForParticipant();
    const platformUserId = participant.identity;

    const session = new voice.AgentSession({
      vad: new inference.VAD(),
      stt: new deepgram.STT({ model: "nova-3" }),
      tts: new cartesia.TTS({ voice: "sonic-commercial-english" }),
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

        const aiReply = result.text;
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

if (require.main === module) {
  cli.runApp(new ServerOptions({ agent: __filename }));
}
