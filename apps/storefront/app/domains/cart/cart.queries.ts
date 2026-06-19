import { runQuery } from "../common/graphql-client";

const ADJUST_ORDER_LINE = `
  mutation AdjustOrderLine($orderLineId: ID!, $quantity: Int!) {
    adjustOrderLine(orderLineId: $orderLineId, quantity: $quantity) {
      ... on Order {
        id
        code
        totalQuantity
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

const REMOVE_ORDER_LINE = `
  mutation RemoveOrderLine($orderLineId: ID!) {
    removeOrderLine(orderLineId: $orderLineId) {
      ... on Order {
        id
        code
        totalQuantity
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

export async function adjustOrderLine(
  orderLineId: string,
  quantity: number,
  token: string | null
): Promise<{ order?: any; error?: string }> {
  const result = await runQuery<any>(ADJUST_ORDER_LINE, { orderLineId, quantity }, token);
  const res = result.data.adjustOrderLine;
  if (res.errorCode) {
    return { error: res.message };
  }
  return { order: res };
}

export async function removeOrderLine(
  orderLineId: string,
  token: string | null
): Promise<{ order?: any; error?: string }> {
  const result = await runQuery<any>(REMOVE_ORDER_LINE, { orderLineId }, token);
  const res = result.data.removeOrderLine;
  if (res.errorCode) {
    return { error: res.message };
  }
  return { order: res };
}
