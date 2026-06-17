import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const ModifyCartSchema = z.object({
  productVariantId: z.string().describe('The database ID of the specific product variant to add'),
  quantity: z.number().default(1).describe('The quantity of the item to add to the active cart order')
});

export const modifyCart = createTool({
  id: 'modifyCart',
  description: 'Add a specific product variant to the customer active shopping cart order',
  inputSchema: ModifyCartSchema,
  execute: async ({ input }) => {
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

    const response = await fetch(process.env.VENDURE_API_URL || 'http://localhost:3000/shop-api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: graphqlMutation,
        variables: { productVariantId: input.productVariantId, quantity: input.quantity }
      })
    });

    const json = await response.json();
    if (json.errors) throw new Error(json.errors[0].message);

    return { success: true, cart: json.data.addItemToOrder };
  }
});
