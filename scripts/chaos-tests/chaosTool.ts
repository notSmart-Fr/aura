// @ts-ignore
import { z } from "zod";

// Rule 2: Exported schema ending in Schema with unconstrained string/number
// Rule 13: In cart tool schema: missing idempotencyKey, invalid quantity bounds, price/amount property used
export const cartAddSchema = z.object({
  unconstrainedStr: z.string(),
  unconstrainedNum: z.number(),
  quantity: z.number(), // no int, positive, or max 99
  itemPrice: z.number(), // forbidden price/amount property
}).describe("chaos schema");
