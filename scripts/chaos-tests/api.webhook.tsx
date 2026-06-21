// Rule 4: api.webhook.tsx file without x-vendure-signature
export async function action() {
  return { message: "missing signature header check" };
}
