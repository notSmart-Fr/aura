import { runQuery } from "../common/graphql-client";

const SET_CUSTOMER_FOR_ORDER = `
  mutation SetCustomerForOrder($input: CreateCustomerInput!) {
    setCustomerForOrder(input: $input) {
      ... on Order {
        id
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

const SET_ORDER_SHIPPING_ADDRESS = `
  mutation SetOrderShippingAddress($input: CreateAddressInput!) {
    setOrderShippingAddress(input: $input) {
      ... on Order {
        id
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

const GET_ELIGIBLE_SHIPPING_METHODS = `
  query GetEligibleShippingMethods {
    eligibleShippingMethods {
      id
      name
      description
      price
    }
  }
`;

const SET_ORDER_SHIPPING_METHOD = `
  mutation SetOrderShippingMethod($shippingMethodId: ID!) {
    setOrderShippingMethod(shippingMethodId: $shippingMethodId) {
      ... on Order {
        id
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

const TRANSITION_ORDER_TO_STATE = `
  mutation TransitionOrderToState($state: String!) {
    transitionOrderToState(state: $state) {
      ... on Order {
        id
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

const ADD_PAYMENT_TO_ORDER = `
  mutation AddPaymentToOrder($input: PaymentInput!) {
    addPaymentToOrder(input: $input) {
      ... on Order {
        id
        code
        state
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

export interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  price: number;
}

export async function setCustomerForOrder(input: Record<string, unknown>, token: string | null) {
  const result = await runQuery<{ setCustomerForOrder: Record<string, unknown> }>(SET_CUSTOMER_FOR_ORDER, { input }, token);
  return result.data.setCustomerForOrder;
}

export async function setOrderShippingAddress(input: Record<string, unknown>, token: string | null) {
  const result = await runQuery<{ setOrderShippingAddress: Record<string, unknown> }>(SET_ORDER_SHIPPING_ADDRESS, { input }, token);
  return result.data.setOrderShippingAddress;
}

export async function getEligibleShippingMethods(token: string | null): Promise<ShippingMethod[]> {
  try {
    const result = await runQuery<{ eligibleShippingMethods: ShippingMethod[] }>(
      GET_ELIGIBLE_SHIPPING_METHODS,
      {},
      token
    );
    return result.data.eligibleShippingMethods || [];
  } catch {
    return [];
  }
}

export async function setOrderShippingMethod(shippingMethodId: string, token: string | null) {
  const result = await runQuery<{ setOrderShippingMethod: Record<string, unknown> }>(SET_ORDER_SHIPPING_METHOD, { shippingMethodId }, token);
  return result.data.setOrderShippingMethod;
}

export async function transitionOrderToState(state: string, token: string | null) {
  const result = await runQuery<{ transitionOrderToState: Record<string, unknown> }>(TRANSITION_ORDER_TO_STATE, { state }, token);
  return result.data.transitionOrderToState;
}

export async function addPaymentToOrder(input: Record<string, unknown>, token: string | null) {
  const result = await runQuery<{ addPaymentToOrder: Record<string, unknown> }>(ADD_PAYMENT_TO_ORDER, { input }, token);
  return result.data.addPaymentToOrder;
}
