import { runQuery } from "../common/graphql-client";

const LOGIN = `
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password, rememberMe: true) {
      ... on CurrentUser {
        id
        identifier
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

const LOGOUT = `
  mutation Logout {
    logout {
      success
    }
  }
`;

const GET_ACTIVE_CUSTOMER = `
  query GetActiveCustomer {
    activeCustomer {
      id
      emailAddress
      firstName
      lastName
      addresses {
        id
        fullName
        streetLine1
        city
        postalCode
        countryCode
      }
      orders(options: { take: 10 }) {
        items {
          id
          code
          state
          orderPlacedAt
          total
          lines {
            id
            quantity
            productVariant {
              id
              name
            }
          }
        }
      }
    }
  }
`;

export interface CustomerData {
  id: string;
  emailAddress: string;
  firstName: string;
  lastName: string;
  addresses: Array<{
    id: string;
    fullName: string;
    streetLine1: string;
    city: string;
    postalCode: string;
    countryCode: string;
  }>;
  orders: {
    items: Array<{
      id: string;
      code: string;
      state: string;
      orderPlacedAt?: string;
      total: number;
      lines: Array<{
        id: string;
        quantity: number;
        productVariant: {
          id: string;
          name: string;
        };
      }>;
    }>;
  };
}

export async function login(username: string, password: string, token: string | null) {
  const result = await runQuery<any>(LOGIN, { username, password }, token);
  return {
    login: result.data.login,
    token: result.token,
  };
}

export async function logout(token: string | null) {
  const result = await runQuery<any>(LOGOUT, {}, token);
  return {
    logout: result.data.logout,
    token: result.token,
  };
}

export async function fetchActiveCustomer(token: string | null): Promise<CustomerData | null> {
  try {
    const result = await runQuery<{ activeCustomer: CustomerData | null }>(
      GET_ACTIVE_CUSTOMER,
      {},
      token
    );
    return result.data.activeCustomer;
  } catch (e) {
    return null;
  }
}
