import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { runVendureQuery } from "../vendure-client.js";

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

interface AddItemToOrderData {
  addItemToOrder: {
    id?: string;
    code?: string;
    state?: string;
    lines?: Array<{ id: string; quantity: number; productVariant: { name: string } }>;
    errorCode?: string;
    message?: string;
  };
}

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

    const data = await runVendureQuery<AddItemToOrderData>(
      graphqlMutation,
      {
        productVariantId: input.productVariantId,
        quantity: input.quantity,
      },
      {
        "Idempotency-Key": input.idempotencyKey,
      },
    );

    return { success: true, cart: data.addItemToOrder };
  },
});
