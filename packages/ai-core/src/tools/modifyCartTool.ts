import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const ModifyCartInputSchema = z.object({
  idempotencyKey: z.string().uuid().describe("Unique token to prevent duplicate cart mutations"),
  productVariantId: z
    .string()
    .max(255)
    .describe("The database ID of the specific product variant to add"),
  quantity: z
    .number()
    .int()
    .positive()
    .max(99)
    .default(1)
    .describe("The quantity of the item to add to the active cart order"),
});

export const modifyCart = createTool({
  id: "modifyCart",
  description: "Add a specific product variant to the customer active shopping cart order",
  inputSchema: ModifyCartInputSchema,
  execute: async (input) => {
    const graphqlMutation = `
      mutation AddItemToOrder($productVariantId: ID!, $quantity: Int!) {
        addItemToOrder(productVariantId: $productVariantId, quantity: $quantity) {
          ... on Order {
            id
            code
            state
            lines { id, quantity, productVariant { name } }
          }
          ... on ErrorResult { errorCode, message }
        }
      }
    `;

    const response = (await z.unknown().parseAsync(
      fetch(process.env.VENDURE_API_URL || "http://localhost:3000/shop-api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": input.idempotencyKey,
        },
        body: JSON.stringify({
          query: graphqlMutation,
          variables: {
            productVariantId: input.productVariantId,
            quantity: input.quantity,
          },
        }),
      }),
    )) as Response;

    const json = await response.json();
    if (json.errors) throw new Error(json.errors[0].message);

    return { success: true, cart: json.data.addItemToOrder };
  },
});
