import { OrchestratorService } from "@dtc/ai-core/orchestrator";

export interface ProcessWebIntentInput {
  text: string;
  platformUserId: string;
}

export interface ProcessWebIntentResult {
  text: string;
  toolResults: unknown[];
  fromCache?: boolean;
}

let orchestratorInstance: OrchestratorService | null = null;

function getOrchestrator(): OrchestratorService {
  if (!orchestratorInstance) {
    orchestratorInstance = new OrchestratorService();
  }
  return orchestratorInstance;
}

export async function processWebIntent(
  input: ProcessWebIntentInput,
): Promise<ProcessWebIntentResult> {
  const result = await getOrchestrator().processIntent({
    text: input.text,
    channel: "web",
    platformUserId: input.platformUserId,
  });

  return {
    text: result.text,
    toolResults: result.toolResults ?? [],
    fromCache: result.fromCache,
  };
}
