// @ts-nocheck
// @ts-ignore
import { something } from "../db/medusa"; // Rule 1
// @ts-ignore
import { z } from "zod";

declare const nativeGeminiClient: any;
declare const streamText: any;
declare const track: any;
declare const item: any;
declare const Agent: any;
declare const createTool: any;

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elem: string]: any;
    }
  }
}

// Rule 3: Remix action without authentication check
export async function action() {
  const data = { msg: "no auth check" };
  return data;
}

// Rule 8: gemini/google with process.env
// google gemini comment
const key = process.env.API_KEY;

export function ChaosComponent() {
  const props = {};
  const Button = (p: any) => null;
  // Rule 6: Input with onChange but no debounce/value
  // Rule 10: Spread on capitalized component tag
  return (
    <div>
      <input onChange={() => {}}></input>
      <Button {...props}></Button>
    </div>
  );
}

export async function processWorkflow() {
  // Rule 5: Promise.all map calling nativeGeminiClient
  await Promise.all([1, 2].map(async x => nativeGeminiClient(x)));

  // Rule 7: streamText call without validation helper in the file
  streamText();

  // Rule 9: Telemetry with direct database ID
  track(item.id);

  // Rule 11: Agent initialized with invalid model choice
  new Agent({ model: "google/gemini-1.5-flash" });

  // Rule 12: Tool contract violation
  createTool({
    id: "invalid_id_!!",
    description: "too short"
  });

  // Rule 14: fetch call not nested inside a Zod parse node
  fetch("https://api.external.com");
}
